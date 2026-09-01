from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

from schemas import PredictionRequest, PredictionResponse, DashboardStats
from model_service import predict, check_health
from explainability import generate_shap_explanation

router = APIRouter()

# In-memory mock database
applications_db = []

@router.post("/api/predict", response_model=PredictionResponse)
async def api_predict(req: PredictionRequest):
    try:
        # Get raw prediction and data dataframe
        prediction_val, default_prob, df = predict(req.model_dump())
        
        # Risk level logic
        if default_prob < 0.30:
            risk_level = "Low"
        elif default_prob < 0.70:
            risk_level = "Moderate"
        else:
            risk_level = "High"
            
        risk_score = int(default_prob * 100)
        
        # Messages based on risk
        if risk_level == "Low":
            msg = "Low estimated default risk based on the submitted application."
        elif risk_level == "Moderate":
            msg = "Moderate default risk detected. Additional review recommended."
        else:
            msg = "High default risk! Proceed with extreme caution."
            
        # Generate SHAP explanation
        shap_exp, top_reasons = generate_shap_explanation(df, default_prob)
        if shap_exp is None:
            shap_exp = {"base_value": 0.0, "features": []}
            top_reasons = []
            
        app_id = str(uuid.uuid4())[:8]
        decision = "REJECT_LOAN" if prediction_val == 1 else "APPROVE_LOAN"
            
        response_data = PredictionResponse(
            customer_id=app_id,
            ai_decision=decision,
            prediction=prediction_val,
            default_probability=f"{int(default_prob * 100)}%",
            risk_score=risk_score,
            risk_level=risk_level,
            message=msg,
            top_reasons=top_reasons,
            shap_explanation=shap_exp
        )
        
        # Save to mock DB
        applications_db.append({
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "applicant_name": req.applicant_name or "Unknown",
            "risk_level": risk_level,
            "risk_score": risk_score,
            "default_probability": default_prob,
            "loan_amnt": req.loan_amnt
        })
        
        return response_data
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total = len(applications_db)
    high_risk = sum(1 for a in applications_db if a["risk_level"] == "High")
    return DashboardStats(
        total_assessments=total,
        high_risk_clients=high_risk,
        total_active_clients=total
    )

@router.get("/api/applications/history")
async def get_history():
    return sorted(applications_db, key=lambda x: x["timestamp"], reverse=True)[:10]

@router.get("/model/health")
async def get_model_health():
    if check_health():
        return {"status": "healthy", "message": "Model is loaded and ready."}
    else:
        raise HTTPException(status_code=503, detail="Model is not loaded.")
