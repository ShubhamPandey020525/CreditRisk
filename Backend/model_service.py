import joblib
import os
import pandas as pd

# Path to the saved model
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "AI", "final_credit_risk_xgboost.pkl"))

pipeline = None
is_loaded = False

def load_model():
    global pipeline, is_loaded
    try:
        if not is_loaded:
            pipeline = joblib.load(MODEL_PATH)
            is_loaded = True
            print(f"✅ Model loaded successfully from: {MODEL_PATH}")
            print(f"   Pipeline steps: {[(name, type(step).__name__) for name, step in pipeline.steps]}")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        import traceback
        traceback.print_exc()
        pipeline = None
        is_loaded = False

def check_health():
    return is_loaded

def predict(data: dict):
    if not is_loaded or pipeline is None:
        raise RuntimeError("Model is not loaded.")
    
    # Only use the features the model expects
    features = [
        "person_age", "person_income", "person_home_ownership", "person_emp_length",
        "loan_intent", "loan_grade", "loan_amnt", "loan_int_rate", "loan_percent_income",
        "cb_person_default_on_file", "cb_person_cred_hist_length"
    ]
    
    input_data = {k: [data[k]] for k in features}
    df = pd.DataFrame(input_data)
    
    # Predict probabilities (default probability is class 1)
    probs = pipeline.predict_proba(df)[0]
    default_prob = float(probs[1])
    prediction = int(pipeline.predict(df)[0])
    
    return prediction, default_prob, df
