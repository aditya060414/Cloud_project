import os
from pathlib import Path
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = BASE_DIR / "datasets"
MODELS_DIR = BASE_DIR / "models"
ARTIFACTS_DIR = BASE_DIR / "artifacts"

# Ensure runtime directories exist
DATASETS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Cloud-Based MLOps Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/mlops_db"
    )
    SQLITE_FALLBACK_URL: str = f"sqlite:///{BASE_DIR / 'mlops.db'}"
    
    # MLflow
    MLFLOW_TRACKING_URI: str = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    MLFLOW_EXPERIMENT_NAME: str = "cloud-mlops-platform"
    
    # Storage paths
    BASE_DIR: Path = BASE_DIR
    DATASETS_DIR: Path = DATASETS_DIR
    MODELS_DIR: Path = MODELS_DIR
    ARTIFACTS_DIR: Path = ARTIFACTS_DIR
    
    # Drift thresholds (Population Stability Index)
    PSI_WARNING_THRESHOLD: float = 0.10
    PSI_DRIFT_THRESHOLD: float = 0.25
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        case_sensitive = True

settings = Settings()
