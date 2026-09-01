from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Any

class PredictionRequest(BaseModel):
    applicant_name: Optional[str] = Field(None, description="Presentation only field")
    person_age: int = Field(..., ge=18, le=120)
    person_income: float = Field(..., ge=0)
    person_home_ownership: str
    person_emp_length: float = Field(..., ge=0)
    loan_intent: str
    loan_grade: str
    loan_amnt: float = Field(..., gt=0)
    loan_int_rate: float = Field(..., ge=0)
    loan_percent_income: float = Field(..., ge=0, le=1)
    cb_person_default_on_file: str
    cb_person_cred_hist_length: float = Field(..., ge=0)
    
    @field_validator("person_home_ownership", "loan_intent", "loan_grade", "cb_person_default_on_file", mode='before')
    @classmethod
    def to_upper(cls, v):
        if isinstance(v, str):
            return v.upper()
        return v

class ShapFeatureImpact(BaseModel):
    feature: str
    value: Any
    shap_value: float
    impact: str  # "increases_risk" or "decreases_risk"
    reason: Optional[str] = None  # business-friendly reason string

class ShapExplanation(BaseModel):
    base_value: float
    features: List[ShapFeatureImpact]

class PredictionResponse(BaseModel):
    customer_id: str
    ai_decision: str
    prediction: int
    default_probability: str
    risk_score: int
    risk_level: str
    message: str
    top_reasons: List[str]
    shap_explanation: Optional[ShapExplanation] = None

class DashboardStats(BaseModel):
    total_assessments: int
    high_risk_clients: int
    total_active_clients: int
