import json
import logging
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from app.config import settings

logger = logging.getLogger("mlops.database")

Base = declarative_base()

def get_engine():
    """Attempt connecting to PostgreSQL, fallback to SQLite if unavailable."""
    pg_url = settings.DATABASE_URL
    try:
        engine = create_engine(pg_url, pool_pre_ping=True, pool_size=5, max_overflow=10)
        # Test connection
        with engine.connect() as conn:
            logger.info(f"Successfully connected to PostgreSQL at {pg_url.split('@')[-1]}")
            return engine
    except Exception as e:
        logger.warning(
            f"Could not connect to PostgreSQL ({e}). Falling back to local SQLite at {settings.SQLITE_FALLBACK_URL}"
        )
        sqlite_engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )
        return sqlite_engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Database Models
class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    columns_json = Column(Text, default="[]")
    summary_stats_json = Column(Text, default="{}")
    target_column = Column(String(100), nullable=True)
    file_path = Column(String(500), nullable=False)
    cleaned_path = Column(String(500), nullable=True)
    is_cleaned = Column(Boolean, default=False)
    cleaning_report_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    training_jobs = relationship("TrainingJob", back_populates="dataset")

class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    status = Column(String(50), default="QUEUED")  # QUEUED, RUNNING, COMPLETED, FAILED
    target_column = Column(String(100), nullable=False)
    metric_used = Column(String(50), default="f1")
    models_evaluated_json = Column(Text, default="[]")
    best_model_name = Column(String(100), nullable=True)
    best_score = Column(Float, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    logs = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    dataset = relationship("Dataset", back_populates="training_jobs")
    models = relationship("ModelRecord", back_populates="training_job")

class ModelRecord(Base):
    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    version = Column(String(20), nullable=False)  # v1, v2, ...
    training_job_id = Column(Integer, ForeignKey("training_jobs.id"), nullable=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    algorithm = Column(String(100), nullable=False)
    metrics_json = Column(Text, default="{}")  # accuracy, precision, recall, f1, etc.
    hyperparameters_json = Column(Text, default="{}")
    artifact_path = Column(String(500), nullable=False)
    status = Column(String(50), default="STAGING")  # PRODUCTION, STAGING, ARCHIVED
    feature_names_json = Column(Text, default="[]")
    target_classes_json = Column(Text, default="[]")
    baseline_distribution_json = Column(Text, default="{}")
    mlflow_run_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    training_job = relationship("TrainingJob", back_populates="models")
    predictions = relationship("PredictionLog", back_populates="model")
    drifts = relationship("DriftLog", back_populates="model")

class PredictionLog(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(20), nullable=False)
    input_data_json = Column(Text, nullable=False)
    prediction_output = Column(String(100), nullable=False)
    probability_json = Column(Text, default="{}")
    confidence = Column(Float, default=0.0)
    latency_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("ModelRecord", back_populates="predictions")

class DriftLog(Base):
    __tablename__ = "drift_results"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"), nullable=True)
    baseline_dataset_id = Column(Integer, nullable=True)
    overall_psi = Column(Float, default=0.0)
    overall_status = Column(String(50), default="NORMAL")  # NORMAL, WARNING, DRIFT_DETECTED
    feature_psi_json = Column(Text, default="{}")
    retraining_recommended = Column(Boolean, default=False)
    simulated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship("ModelRecord", back_populates="drifts")

def init_db():
    """Create all tables in the database."""
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
