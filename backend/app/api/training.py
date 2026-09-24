import json
import logging
import joblib
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db, TrainingJob, Dataset, ModelRecord
from app.schemas.schemas import TrainingStartRequest, TrainingJobResponse, ModelLeaderboardItem
from app.services.automl import AutoMLEngine
from app.services.data_processor import DataProcessor
from app.services.model_registry import ModelRegistryService
from app.services.predictor import PredictorService
from app.utils.metrics import record_training_job

logger = logging.getLogger("mlops.api.training")
router = APIRouter(prefix="/training", tags=["AutoML Training"])

@router.post("/start", response_model=TrainingJobResponse)
def start_automl_training(
    request: TrainingStartRequest,
    db: Session = Depends(get_db)
):
    """
    Executes AutoML training on selected dataset:
    1. Validates and ensures dataset is cleaned
    2. Runs hyperparameter optimization via Optuna across candidate models
    3. Calculates real evaluation metrics (Accuracy, Precision, Recall, F1)
    4. Automatically selects best model by metric
    5. Saves model artifact and registers into Model Registry
    6. Deploys to active prediction runtime
    """
    dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail=f"Dataset {request.dataset_id} not found.")

    target = request.target_column or dataset.target_column
    if not target:
        raise HTTPException(status_code=400, detail="Target column must be specified.")

    # Auto-clean dataset if not already cleaned
    preprocessor_dict = None
    baseline_dist = {}
    if not dataset.is_cleaned or not dataset.cleaned_path:
        logger.info(f"Dataset {dataset.id} not yet cleaned. Auto-cleaning before AutoML...")
        cleaned_path, report, preprocessor_dict, baseline_dist = DataProcessor.clean_and_prepare(
            raw_file_path=dataset.file_path,
            target_column=target
        )
        dataset.cleaned_path = cleaned_path
        dataset.is_cleaned = True
        dataset.target_column = target
        dataset.cleaning_report_json = json.dumps(report)
        db.commit()
    else:
        # Load existing preprocessor if available
        base_report = json.loads(dataset.cleaning_report_json or "{}")
        prep_path = base_report.get("preprocessor_path")
        if prep_path and joblib.os.path.exists(prep_path):
            preprocessor_dict = joblib.load(prep_path)

    # Create TrainingJob record
    job = TrainingJob(
        dataset_id=dataset.id,
        status="RUNNING",
        target_column=target,
        metric_used=request.metric,
        created_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        # Run AutoML Engine
        result = AutoMLEngine.train_and_evaluate(
            cleaned_csv_path=dataset.cleaned_path,
            target_column=target,
            metric=request.metric,
            candidate_models=request.candidate_models,
            optuna_trials=request.optuna_trials,
            preprocessor_dict=preprocessor_dict
        )

        # Update Job Record
        job.status = "COMPLETED"
        job.models_evaluated_json = json.dumps(result["leaderboard"])
        job.best_model_name = result["best_model_name"]
        job.best_score = result["best_score"]
        job.duration_seconds = result["total_duration"]
        job.logs = result["logs"]
        job.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(job)

        record_training_job("success")

        # Automatically register the best model into the Model Registry
        best_item = result["leaderboard"][0]
        registered_model = ModelRegistryService.register_model(
            db=db,
            name=f"{result['best_model_name']} Classifier",
            algorithm=result["best_model_name"],
            metrics={
                "accuracy": best_item["accuracy"],
                "precision": best_item["precision"],
                "recall": best_item["recall"],
                "f1": best_item["f1"],
                "score": result["best_score"]
            },
            hyperparameters=result["best_hyperparams"],
            artifact_path=result["artifact_path"],
            feature_names=result["feature_names"],
            target_classes=result["target_classes"],
            baseline_distribution=baseline_dist,
            training_job_id=job.id,
            dataset_id=dataset.id,
            mlflow_run_id=result.get("mlflow_run_id"),
            auto_promote_if_first=True
        )

        # Hot-reload in predictor memory
        PredictorService.load_active_model(db, force_reload=True)

        return TrainingJobResponse(
            id=job.id,
            dataset_id=job.dataset_id,
            status=job.status,
            target_column=job.target_column,
            metric_used=job.metric_used,
            models_evaluated=[ModelLeaderboardItem(**item) for item in result["leaderboard"]],
            best_model_name=job.best_model_name,
            best_score=job.best_score,
            duration_seconds=job.duration_seconds,
            logs=job.logs,
            created_at=job.created_at,
            completed_at=job.completed_at
        )

    except Exception as e:
        logger.error(f"AutoML Training failed: {e}", exc_info=True)
        job.status = "FAILED"
        job.logs = f"Error: {str(e)}"
        job.completed_at = datetime.utcnow()
        db.commit()
        record_training_job("failure")
        raise HTTPException(status_code=500, detail=f"AutoML Training failed: {str(e)}")

@router.get("", response_model=List[TrainingJobResponse])
def list_training_jobs(db: Session = Depends(get_db)):
    """List recent training jobs."""
    jobs = db.query(TrainingJob).order_by(TrainingJob.id.desc()).all()
    results = []
    for j in jobs:
        leaderboard = json.loads(j.models_evaluated_json or "[]")
        results.append(TrainingJobResponse(
            id=j.id,
            dataset_id=j.dataset_id,
            status=j.status,
            target_column=j.target_column,
            metric_used=j.metric_used,
            models_evaluated=[ModelLeaderboardItem(**item) for item in leaderboard],
            best_model_name=j.best_model_name,
            best_score=j.best_score,
            duration_seconds=j.duration_seconds,
            logs=j.logs,
            created_at=j.created_at,
            completed_at=j.completed_at
        ))
    return results

@router.get("/{job_id}", response_model=TrainingJobResponse)
def get_training_job(job_id: int, db: Session = Depends(get_db)):
    """Get single training job details, leaderboard, and training logs."""
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")

    leaderboard = json.loads(job.models_evaluated_json or "[]")
    return TrainingJobResponse(
        id=job.id,
        dataset_id=job.dataset_id,
        status=job.status,
        target_column=job.target_column,
        metric_used=job.metric_used,
        models_evaluated=[ModelLeaderboardItem(**item) for item in leaderboard],
        best_model_name=job.best_model_name,
        best_score=job.best_score,
        duration_seconds=job.duration_seconds,
        logs=job.logs,
        created_at=job.created_at,
        completed_at=job.completed_at
    )

@router.post("/retrain", response_model=TrainingJobResponse)
def trigger_retraining(
    metric: str = "f1",
    db: Session = Depends(get_db)
):
    """
    Retraining Trigger:
    Triggered when Data Drift is detected. Retrains AutoML on the most recent dataset,
    registers a new model version (e.g. v2), and updates the production model.
    """
    # Pick the latest active dataset
    latest_dataset = db.query(Dataset).filter(Dataset.is_cleaned == True).order_by(Dataset.id.desc()).first()
    if not latest_dataset:
        latest_dataset = db.query(Dataset).order_by(Dataset.id.desc()).first()

    if not latest_dataset:
        raise HTTPException(status_code=400, detail="No dataset available for retraining.")

    req = TrainingStartRequest(
        dataset_id=latest_dataset.id,
        target_column=latest_dataset.target_column,
        metric=metric,
        optuna_trials=8
    )
    logger.info("Executing automated retraining pipeline triggered by drift alert.")
    return start_automl_training(request=req, db=db)
