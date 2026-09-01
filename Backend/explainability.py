import shap
import numpy as np
import pandas as pd
import math
import model_service  # import module, not the variable, so we always get the live pipeline

# ---------------------------------------------------------------------------
# Feature name helpers
# ---------------------------------------------------------------------------

def _strip_prefix(feature_name: str) -> str:
    """Strip ColumnTransformer prefix (e.g. 'numerical__' or 'categorical__')."""
    if "__" in feature_name:
        return feature_name.split("__", 1)[1]
    return feature_name


def get_human_readable_name(feature_name: str) -> str:
    """Convert raw (possibly prefixed) feature name to a human-readable label."""
    clean = _strip_prefix(feature_name)

    # Exact numeric feature mappings
    exact_map = {
        "person_age": "Age",
        "person_income": "Annual Income",
        "person_emp_length": "Employment Length",
        "loan_amnt": "Loan Amount",
        "loan_int_rate": "Interest Rate",
        "loan_percent_income": "Loan-to-Income Ratio",
        "cb_person_cred_hist_length": "Credit History Length",
    }
    if clean in exact_map:
        return exact_map[clean]

    # One-hot encoded categorical features
    if clean.startswith("person_home_ownership_"):
        val = clean.replace("person_home_ownership_", "").title()
        return f"Home Ownership: {val}"
    if clean.startswith("loan_intent_"):
        val = clean.replace("loan_intent_", "").title()
        return f"Loan Intent: {val}"
    if clean.startswith("loan_grade_"):
        val = clean.replace("loan_grade_", "")
        return f"Loan Grade: {val}"
    if clean.startswith("cb_person_default_on_file_"):
        val = "Yes" if clean.endswith("Y") else "No"
        return f"Historical Default: {val}"

    return clean.replace("_", " ").title()


def get_business_reason(feature_name: str, raw_value: float) -> str:
    """Generate a business-friendly explanation based on the feature and its value."""
    clean = _strip_prefix(feature_name)

    if clean == "loan_percent_income":
        return f"EMI is taking {int(raw_value * 100)}% of salary"
    if clean == "person_emp_length":
        return f"Job length is {int(raw_value)} years"
    if clean == "loan_amnt":
        return f"Loan amount is ${int(raw_value):,}"
    if clean == "person_income":
        return f"Annual income is ${int(raw_value):,}"
    if clean == "person_age":
        return f"Applicant age is {int(raw_value)}"
    if clean == "loan_int_rate":
        return f"Interest rate is {raw_value:.1f}%"
    if clean == "cb_person_cred_hist_length":
        return f"Credit history is {int(raw_value)} years"

    # One-hot categorical features – value is 0 or 1
    if clean.startswith("cb_person_default_on_file_"):
        if clean.endswith("Y"):
            return "Customer has past defaults"
        return "Clean default history"
    if clean.startswith("person_home_ownership_"):
        val = clean.replace("person_home_ownership_", "").title()
        return f"Home ownership status: {val}"
    if clean.startswith("loan_intent_"):
        val = clean.replace("loan_intent_", "").title()
        return f"Loan is for {val}"
    if clean.startswith("loan_grade_"):
        grade = clean.replace("loan_grade_", "")
        return f"Loan grade is {grade}"

    return "Contributes to risk profile"


# ---------------------------------------------------------------------------
# Math helpers
# ---------------------------------------------------------------------------

def sigmoid(x: float) -> float:
    """Numerically safe sigmoid."""
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    ex = math.exp(x)
    return ex / (1.0 + ex)


# ---------------------------------------------------------------------------
# Main SHAP explanation function
# ---------------------------------------------------------------------------

def generate_shap_explanation(df: pd.DataFrame, final_probability: float):
    """
    Generate a SHAP-based explanation for a single prediction row.

    Returns
    -------
    (shap_dict, top_reasons_list)
        shap_dict  : dict with 'base_value' (%) and 'features' list
        top_reasons: list of human-readable strings (top ~8 drivers)
    On failure returns (None, []).
    """
    if model_service.pipeline is None:
        print("SHAP Error: Pipeline is None")
        return None, []

    try:
        preprocessor = model_service.pipeline.steps[0][1]
        model = model_service.pipeline.steps[-1][1]

        # --- Transform input ---
        X_transformed = preprocessor.transform(df)

        # --- Feature names ---
        if hasattr(preprocessor, "get_feature_names_out"):
            feature_names = list(preprocessor.get_feature_names_out())
        else:
            n = X_transformed.shape[1] if hasattr(X_transformed, "shape") else len(X_transformed[0])
            feature_names = [f"Feature_{i}" for i in range(n)]

        # --- Dense array ---
        if hasattr(X_transformed, "toarray"):
            X_dense = X_transformed.toarray()
        elif hasattr(X_transformed, "todense"):
            X_dense = np.asarray(X_transformed.todense())
        else:
            X_dense = np.array(X_transformed)

        # --- SHAP values ---
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_dense)

        # XGBoost TreeExplainer returns ndarray of shape (n_samples, n_features)
        # for binary classification (log-odds of class 1 = default).
        # Older versions return a list [class0_sv, class1_sv].
        if isinstance(shap_values, list):
            sv = shap_values[1][0]          # class 1, first row
            bv_raw = explainer.expected_value
            base_log_odds = float(bv_raw[1] if hasattr(bv_raw, "__len__") and len(bv_raw) > 1 else bv_raw)
        else:
            sv = shap_values[0]             # first (only) row
            bv_raw = explainer.expected_value
            base_log_odds = float(bv_raw)

        # --- Convert log-odds to probability ---
        base_prob = sigmoid(base_log_odds)              # e.g. 0.22  → 22%

        # --- Scale SHAP contributions proportionally so they sum to the
        #     observed probability shift from the base.
        #     This keeps the waterfall chart correct for BOTH approve & reject. ---
        total_prob_shift = final_probability - base_prob   # can be + or -
        total_shap_sum   = float(np.sum(sv))               # raw log-odds sum

        features_impact = []

        # We need original (un-scaled) feature values for business reasons.
        # The preprocessor may have standardised numerics, so we map back
        # using the original df columns where possible.
        X_row = X_dense[0]

        # Build a lookup: clean_name → original df value (for numeric features only)
        orig_values = {}
        for col in df.columns:
            val = df[col].iloc[0]
            try:
                orig_values[col] = float(val)
            except (TypeError, ValueError):
                # String/categorical columns — skip; we'll use transformed 0/1 for one-hots
                pass

        for i, name in enumerate(feature_names):
            s_val = float(sv[i])

            # Skip near-zero SHAP impacts
            if abs(s_val) < 1e-4:
                continue

            # Scale to probability percentage
            if abs(total_shap_sum) > 1e-6:
                prob_shift     = (s_val / total_shap_sum) * total_prob_shift
            else:
                prob_shift     = 0.0

            prob_shift_pct = prob_shift * 100.0

            # Recover original value for display
            clean = _strip_prefix(name)
            if clean in orig_values:
                display_val = orig_values[clean]
            else:
                # For one-hot columns use the transformed (0/1) value
                display_val = float(X_row[i])

            human_name     = get_human_readable_name(name)
            business_reason = get_business_reason(name, display_val)

            # "increases_risk" means this feature PUSHED the probability UP
            impact_type = "increases_risk" if prob_shift_pct > 0 else "decreases_risk"

            features_impact.append({
                "feature":          human_name,
                "raw_feature_name": name,
                "value":            round(display_val, 4),
                "shap_value":       round(prob_shift_pct, 2),
                "impact":           impact_type,
                "abs_shap":         abs(prob_shift_pct),
                "business_reason":  business_reason,
            })

        # Sort by absolute impact, most important first
        features_impact.sort(key=lambda x: x["abs_shap"], reverse=True)

        # --- Build top_reasons strings (top 8) ---
        top_reasons = []
        for item in features_impact[:8]:
            pct_val = item["shap_value"]
            if pct_val > 0:
                sign_str = f"🔴 Increases risk by +{abs(int(round(pct_val)))}%"
            else:
                sign_str = f"🟢 Decreases risk by -{abs(int(round(pct_val)))}%"

            reason_str = f"{sign_str}: {item['feature']} — {item['business_reason']}"
            top_reasons.append(reason_str)

        # --- Clean features for response (top 10) ---
        clean_features = [
            {
                "feature":    item["feature"],
                "value":      item["value"],
                "shap_value": item["shap_value"],
                "impact":     item["impact"],
                "reason":     item["business_reason"],
            }
            for item in features_impact[:10]
        ]

        return {
            "base_value": round(base_prob * 100, 2),
            "features":   clean_features,
        }, top_reasons

    except Exception as e:
        print(f"❌ SHAP Error: {e}")
        import traceback
        traceback.print_exc()
        return None, []
