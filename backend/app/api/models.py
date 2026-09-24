import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db, ModelRecord
from app.schemas.schemas import ModelRecordResponse
from app.services.model_registry import ModelRegistryService
from app.services.predictor import PredictorService

logger = logging.getLogger("mlops.api.models")
router = APIRouter(prefix="/models", tags=["Model Registry"])

@router.get("", response_model=List[ModelRecordResponse])
def list_models(db: Session = Depends(get_db)):
    """List all registered models and their deployment versions."""
    models = db.query(ModelRecord).order_by(ModelRecord.id.desc()).all()
    results = []
    for m in models:
        results.append(ModelRecordResponse(
            id=m.id,
            name=m.name,
            version=m.version,
            algorithm=m.algorithm,
            metrics=json.loads(m.metrics_json or "{}"),
            hyperparameters=json.loads(m.hyperparameters_json or "{}"),
            status=m.status,
            feature_names=json.loads(m.feature_names_json or "[]"),
            target_classes=json.loads(m.target_classes_json or "[]"),
            created_at=m.created_at
        ))
    return results

@router.get("/active", response_model=Optional[ModelRecordResponse])
def get_active_production_model(db: Session = Depends(get_db)):
    """Retrieve the currently deployed PRODUCTION model."""
    prod = ModelRegistryService.get_production_model(db)
    if not prod:
        return None

    return ModelRecordResponse(
        id=prod.id,
        name=prod.name,
        version=prod.version,
        algorithm=prod.algorithm,
        metrics=json.loads(prod.metrics_json or "{}"),
        hyperparameters=json.loads(prod.hyperparameters_json or "{}"),
        status=prod.status,
        feature_names=json.loads(prod.feature_names_json or "[]"),
        target_classes=json.loads(prod.target_classes_json or "[]"),
        created_at=prod.created_at
    )

@router.get("/{model_id}", response_model=ModelRecordResponse)
def get_model_details(model_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific model record."""
    model = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model record not found")

    return ModelRecordResponse(
        id=model.id,
        name=model.name,
        version=model.version,
        algorithm=model.algorithm,
        metrics=json.loads(model.metrics_json or "{}"),
        hyperparameters=json.loads(model.hyperparameters_json or "{}"),
        status=model.status,
        feature_names=json.loads(model.feature_names_json or "[]"),
        target_classes=json.loads(model.target_classes_json or "[]"),
        created_at=model.created_at
    )

@router.post("/{model_id}/promote", response_model=ModelRecordResponse)
def promote_model(model_id: int, db: Session = Depends(get_db)):
    """Promotes a registered model version to PRODUCTION status."""
    try:
        model = ModelRegistryService.promote_to_production(db, model_id)
        # Hot-reload in memory
        PredictorService.load_active_model(db, force_reload=True)
        return ModelRecordResponse(
            id=model.id,
            name=model.name,
            version=model.version,
            algorithm=model.algorithm,
            metrics=json.loads(model.metrics_json or "{}"),
            hyperparameters=json.loads(model.hyperparameters_json or "{}"),
            status=model.status,
            feature_names=json.loads(model.feature_names_json or "[]"),
            target_classes=json.loads(model.target_classes_json or "[]"),
            created_at=model.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{model_id}/rollback", response_model=ModelRecordResponse)
def rollback_model(model_id: int, db: Session = Depends(get_db)):
    """Rollbacks production deployment to specified version."""
    try:
        model = ModelRegistryService.rollback_production(db, target_model_id=model_id)
        PredictorService.load_active_model(db, force_reload=True)
        return ModelRecordResponse(
            id=model.id,
            name=model.name,
            version=model.version,
            algorithm=model.algorithm,
            metrics=json.loads(model.metrics_json or "{}"),
            hyperparameters=json.loads(model.hyperparameters_json or "{}"),
            status=model.status,
            feature_names=json.loads(model.feature_names_json or "[]"),
            target_classes=json.loads(model.target_classes_json or "[]"),
            created_at=model.created_at
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{model_id}/download")
def download_artifact(model_id: int, db: Session = Depends(get_db)):
    """Downloads model artifact .joblib binary."""
    model = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
    if not model or not joblib.os.path.exists(model.artifact_path):
        raise HTTPException(status_code=404, detail="Model artifact binary not found.")
    return FileResponse(
        model.artifact_path,
        media_type="application/octet-stream",
        filename=joblib.os.path.basename(model.artifact_path)
    )
