from typing import Any, Optional, Dict, List
from pydantic import BaseModel, Field
from datetime import datetime

# --- Dataset Schemas ---
class ColumnInfo(BaseModel):
    name: str
    dtype: str
    null_count: int
    unique_count: int
    sample_values: List[Any] = []

class DatasetResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    row_count: int
    column_count: int
    columns: List[ColumnInfo] = []
    target_column: Optional[str] = None
    is_cleaned: bool = False
    cleaning_report: Optional[Dict[str, Any]] = None
    preview: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ProcessDatasetRequest(BaseModel):
    target_column: Optional[str] = None
    scale_numerical: bool = True
    handle_outliers: bool = True

class ProcessingReport(BaseModel):
    before_rows: int
    after_rows: int
    missing_values_handled: int
    duplicates_removed: int
    transformations: List[str]
    features_processed: List[str]
    target_column: Optional[str] = None

# --- Training Schemas ---
class TrainingStartRequest(BaseModel):
    dataset_id: int
    target_column: Optional[str] = None
    metric: str = Field(default="f1", description="f1, accuracy, precision, or recall")
    candidate_models: Optional[List[str]] = Field(
        default=["Random Forest", "Gradient Boosting", "Logistic Regression", "Support Vector Machine", "K-Nearest Neighbors"]
    )
    optuna_trials: int = Field(default=8, ge=1, le=50)

class ModelLeaderboardItem(BaseModel):
    model_name: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    training_time: float
    hyperparameters: Dict[str, Any]
    is_best: bool = False

class TrainingJobResponse(BaseModel):
    id: int
    dataset_id: int
    status: str
    target_column: str
    metric_used: str
    models_evaluated: List[ModelLeaderboardItem] = []
    best_model_name: Optional[str] = None
    best_score: Optional[float] = None
    duration_seconds: float = 0.0
    logs: Optional[str] = ""
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Model Registry Schemas ---
class ModelRecordResponse(BaseModel):
    id: int
    name: str
    version: str
    algorithm: str
    metrics: Dict[str, float]
    hyperparameters: Dict[str, Any]
    status: str
    feature_names: List[str]
    target_classes: List[Any]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Prediction Schemas ---
class PredictionRequest(BaseModel):
    features: Dict[str, Any] = Field(
        ..., 
        example={"age": 35, "annual_income": 50000, "tenure_months": 4}
    )

class PredictionResponse(BaseModel):
    prediction: Any
    model: str
    version: str
    confidence: float
    probabilities: Optional[Dict[str, float]] = None
    latency_ms: float

# --- Drift Schemas ---
class DriftFeatureDetail(BaseModel):
    feature: str
    psi: float
    status: str  # Normal, Warning, Drift Detected
    baseline_mean: Optional[float] = None
    current_mean: Optional[float] = None
    baseline_dist: Optional[List[Dict[str, Any]]] = None
    current_dist: Optional[List[Dict[str, Any]]] = None

class DriftReportResponse(BaseModel):
    overall_psi: float
    status: str
    features: List[DriftFeatureDetail]
    drift_detected: bool
    retraining_recommended: bool
    simulated: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class DriftSimulateRequest(BaseModel):
    dataset_id: Optional[int] = None
    shift_magnitude: float = Field(default=1.8, description="Multiplier for shifting distribution mean")
    sample_size: int = Field(default=150)

# --- Monitoring Schemas ---
class MonitoringStatsResponse(BaseModel):
    total_predictions: int
    successful_predictions: int
    avg_latency_ms: float
    active_model: Optional[ModelRecordResponse] = None
    current_drift_score: float
    drift_alerts_count: int
    drift_status: str
    recent_predictions: List[Dict[str, Any]] = []
    hourly_predictions: List[Dict[str, Any]] = []
    latency_history: List[Dict[str, Any]] = []
