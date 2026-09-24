import json
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db, ModelRecord
from app.schemas.schemas import PredictionRequest, PredictionResponse
from app.services.predictor import PredictorService
from app.services.model_registry import ModelRegistryService

logger = logging.getLogger("mlops.api.prediction")
router = APIRouter(tags=["Prediction Inference"])

@router.post("/predict", response_model=PredictionResponse)
def run_prediction(
    request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Real-Time Prediction API:
    Infers class label and probability confidence using the currently active production model.
    """
    try:
        result = PredictorService.predict(features=request.features, db=db)
        return PredictionResponse(**result)
    except RuntimeError as re:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(re))
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Inference error: {str(e)}")

@router.get("/model")
def get_prediction_model_metadata(db: Session = Depends(get_db)):
    """Returns the deployed active production model schema, feature names, and target labels."""
    prod = ModelRegistryService.get_production_model(db)
    if not prod:
        return {"status": "NO_ACTIVE_MODEL", "message": "No production model is currently active."}

    feature_names = json.loads(prod.feature_names_json or "[]")
    target_classes = json.loads(prod.target_classes_json or "[]")
    metrics = json.loads(prod.metrics_json or "{}")

    return {
        "status": "ACTIVE",
        "model_id": prod.id,
        "name": prod.name,
        "version": prod.version,
        "algorithm": prod.algorithm,
        "metrics": metrics,
        "features": feature_names,
        "target_classes": target_classes,
        "created_at": prod.created_at
    }

@router.post("/predict/batch")
def run_batch_prediction(
    items: List[Dict[str, Any]],
    db: Session = Depends(get_db)
):
    """Batch prediction endpoint for high-throughput inference."""
    results = []
    for item in items:
        try:
            res = PredictorService.predict(features=item, db=db)
            results.append(res)
        except Exception as e:
            results.append({"error": str(e)})
    return {"count": len(results), "predictions": results}
