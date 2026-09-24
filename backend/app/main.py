import os
import sys
import shutil
import logging
from pathlib import Path

# Ensure backend root is always in Python module search path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, SessionLocal, Dataset, ModelRecord
from app.utils.metrics import get_metrics_payload
from app.services.predictor import PredictorService
from app.services.data_processor import DataProcessor

# Routers
from app.api.datasets import router as datasets_router
from app.api.training import router as training_router
from app.api.models import router as models_router
from app.api.prediction import router as prediction_router
from app.api.monitoring import router as monitoring_router

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
)
logger = logging.getLogger("mlops.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("Initializing Cloud-Based MLOps Platform...")
    init_db()

    # Pre-seed sample dataset if none exists for instant demonstration capability
    db = SessionLocal()
    try:
        count = db.query(Dataset).count()
        if count == 0:
            sample_source = os.path.join(str(settings.BASE_DIR.parent), "sample-data", "sample_classification.csv")
            if os.path.exists(sample_source):
                dest_file = str(settings.DATASETS_DIR / "sample_classification.csv")
                shutil.copyfile(sample_source, dest_file)
                inspection = DataProcessor.inspect_csv(dest_file)
                import json
                seed_ds = Dataset(
                    filename="sample_classification.csv",
                    original_name="customer_churn_sample.csv",
                    row_count=inspection["row_count"],
                    column_count=inspection["column_count"],
                    columns_json=json.dumps(inspection["columns"]),
                    summary_stats_json=json.dumps({
                        "duplicates_count": inspection["duplicates_count"],
                        "total_missing": inspection["total_missing"]
                    }),
                    target_column="churn",
                    file_path=dest_file,
                    is_cleaned=False
                )
                db.add(seed_ds)
                db.commit()
                logger.info("Auto-seeded initial Customer Churn sample dataset into database.")

        # Load production model in memory if one exists
        PredictorService.load_active_model(db)
    except Exception as e:
        logger.warning(f"Startup initialisation warning: {e}")
    finally:
        db.close()

    yield
    logger.info("Shutting down Cloud-Based MLOps Platform...")

app = FastAPI(
    title="Cloud-Based MLOps Platform",
    description="Production-grade local demonstration of an end-to-end Cloud MLOps pipeline: Data Processing, AutoML, Model Registry, REST API Deployment, Real-Time Prediction, Observability, and Data Drift Detection.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(datasets_router, prefix="/api")
app.include_router(training_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(prediction_router, prefix="/api")
app.include_router(monitoring_router, prefix="/api")

# Also include prediction at root /predict as requested in section 9 & 21
app.include_router(prediction_router)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for Docker, Kubernetes, and uptime probes."""
    return {
        "status": "healthy",
        "service": "Cloud-Based MLOps Platform",
        "version": settings.VERSION,
        "mode": "local-demonstration"
    }

@app.get("/metrics", tags=["Prometheus Metrics"])
def prometheus_metrics():
    """Exposes real-time Prometheus metrics for scrapers."""
    payload, content_type = get_metrics_payload()
    return Response(content=payload, media_type=content_type)

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to Cloud-Based MLOps Platform API",
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
