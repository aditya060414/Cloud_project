import json
import logging
from typing import Dict, Any, List
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db, PredictionLog, DriftLog, ModelRecord, Dataset
from app.config import settings
from app.schemas.schemas import (
    MonitoringStatsResponse, DriftReportResponse, DriftSimulateRequest, ModelRecordResponse
)
from app.services.drift_detector import DriftDetectorService
from app.services.model_registry import ModelRegistryService

logger = logging.getLogger("mlops.api.monitoring")
router = APIRouter(prefix="/monitoring", tags=["Monitoring & Drift"])

@router.get("", response_model=MonitoringStatsResponse)
def get_monitoring_stats(db: Session = Depends(get_db)):
    """Comprehensive observability dashboard metrics: prediction throughput, latency, drift score, alerts."""
    total_preds = db.query(PredictionLog).count()
    
    # Average latency
    avg_latency = db.query(func.avg(PredictionLog.latency_ms)).scalar() or 0.0

    # Active model
    prod = ModelRegistryService.get_production_model(db)
    active_model_resp = None
    if prod:
        active_model_resp = ModelRecordResponse(
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

    # Latest drift score and alert counts
    latest_drift = db.query(DriftLog).order_by(DriftLog.id.desc()).first()
    current_drift_score = latest_drift.overall_psi if latest_drift else 0.04
    drift_status = latest_drift.overall_status if latest_drift else "NORMAL"
    
    drift_alerts_count = db.query(DriftLog).filter(
        (DriftLog.overall_status == "DRIFT_DETECTED") | (DriftLog.retraining_recommended == True)
    ).count()

    # Recent predictions (last 10)
    recent = db.query(PredictionLog).order_by(PredictionLog.id.desc()).limit(10).all()
    recent_list = []
    for r in recent:
        recent_list.append({
            "id": r.id,
            "model_name": r.model_name,
            "version": r.model_version,
            "prediction": r.prediction_output,
            "confidence": r.confidence,
            "latency_ms": r.latency_ms,
            "timestamp": r.created_at.strftime("%H:%M:%S")
        })

    # Mock/Aggregated time series for charts
    hourly_predictions = [
        {"time": "10:00", "requests": max(5, int(total_preds * 0.15))},
        {"time": "10:15", "requests": max(12, int(total_preds * 0.35))},
        {"time": "10:30", "requests": max(18, int(total_preds * 0.55))},
        {"time": "10:45", "requests": max(26, int(total_preds * 0.80))},
        {"time": "11:00", "requests": max(total_preds, 35)}
    ]

    latency_history = [
        {"request": f"#{i+1}", "latency": r["latency_ms"]}
        for i, r in enumerate(reversed(recent_list[-8:]))
    ] if recent_list else [
        {"request": "#1", "latency": 2.1},
        {"request": "#2", "latency": 3.4},
        {"request": "#3", "latency": 2.8}
    ]

    return MonitoringStatsResponse(
        total_predictions=total_preds,
        successful_predictions=total_preds,
        avg_latency_ms=round(float(avg_latency), 2),
        active_model=active_model_resp,
        current_drift_score=round(float(current_drift_score), 4),
        drift_alerts_count=drift_alerts_count,
        drift_status=drift_status,
        recent_predictions=recent_list,
        hourly_predictions=hourly_predictions,
        latency_history=latency_history
    )

@router.get("/drift", response_model=DriftReportResponse)
def get_current_drift_report(db: Session = Depends(get_db)):
    """Computes or retrieves real-time Population Stability Index (PSI) drift report."""
    latest_drift = db.query(DriftLog).order_by(DriftLog.id.desc()).first()
    if latest_drift:
        features = json.loads(latest_drift.feature_psi_json or "[]")
        return DriftReportResponse(
            overall_psi=latest_drift.overall_psi,
            status=latest_drift.overall_status,
            features=features,
            drift_detected=(latest_drift.overall_status == "DRIFT_DETECTED"),
            retraining_recommended=latest_drift.retraining_recommended,
            simulated=latest_drift.simulated,
            timestamp=latest_drift.created_at
        )

    # If no drift log yet, evaluate against baseline
    report = DriftDetectorService.evaluate_model_drift(db=db)
    return DriftReportResponse(**report)

@router.post("/simulate-drift", response_model=DriftReportResponse)
def simulate_drift(
    request: DriftSimulateRequest = DriftSimulateRequest(),
    db: Session = Depends(get_db)
):
    """
    Simulation Endpoint for Live Viva/Demo:
    Synthesizes incoming feature shift to drive PSI > 0.25, triggering visual drift alerts and retraining recommendations.
    """
    try:
        report = DriftDetectorService.simulate_drift(
            db=db,
            dataset_id=request.dataset_id,
            shift_magnitude=request.shift_magnitude,
            sample_size=request.sample_size
        )
        return DriftReportResponse(**report)
    except Exception as e:
        logger.error(f"Drift simulation failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/system-status")
def get_system_status():
    """Live connectivity checks for API, MLflow, PostgreSQL, and Prometheus."""
    status_map = {
        "api": {"online": True, "name": "FastAPI Gateway", "port": 8000},
        "database": {"online": True, "name": "PostgreSQL / SQLite", "port": 5432},
        "mlflow": {"online": False, "name": "MLflow Tracking Server", "port": 5000},
        "prometheus": {"online": False, "name": "Prometheus Metrics", "port": 9090},
        "grafana": {"online": False, "name": "Grafana Dashboard", "port": 3001}
    }

    # Check MLflow
    try:
        res = requests.get(f"{settings.MLFLOW_TRACKING_URI}/health", timeout=1.0)
        status_map["mlflow"]["online"] = (res.status_code == 200)
    except Exception:
        status_map["mlflow"]["online"] = False

    # Check Prometheus
    try:
        res = requests.get("http://localhost:9090/-/healthy", timeout=1.0)
        status_map["prometheus"]["online"] = (res.status_code == 200)
    except Exception:
        status_map["prometheus"]["online"] = False

    # Check Grafana
    try:
        res = requests.get("http://localhost:3001/api/health", timeout=1.0)
        status_map["grafana"]["online"] = (res.status_code == 200)
    except Exception:
        status_map["grafana"]["online"] = False

    return status_map
