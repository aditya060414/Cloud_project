import json
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import ModelRecord, TrainingJob
from app.utils.metrics import ACTIVE_MODEL_ACCURACY

logger = logging.getLogger("mlops.model_registry")

class ModelRegistryService:
    """Manages model versions, deployment stages (Production, Staging, Archived), and rollbacks."""

    @staticmethod
    def register_model(
        db: Session,
        name: str,
        algorithm: str,
        metrics: Dict[str, float],
        hyperparameters: Dict[str, Any],
        artifact_path: str,
        feature_names: List[str],
        target_classes: List[Any],
        baseline_distribution: Dict[str, Any],
        training_job_id: Optional[int] = None,
        dataset_id: Optional[int] = None,
        mlflow_run_id: Optional[str] = None,
        auto_promote_if_first: bool = True
    ) -> ModelRecord:
        """Registers a new model version. If no production model exists, can auto-promote."""
        # Find next version number
        existing_versions = db.query(ModelRecord).filter(ModelRecord.name == name).all()
        version_num = len(existing_versions) + 1
        version_tag = f"v{version_num}"

        # Determine status
        status = "STAGING"
        if auto_promote_if_first:
            active_prod = db.query(ModelRecord).filter(ModelRecord.status == "PRODUCTION").first()
            if not active_prod:
                status = "PRODUCTION"

        model_record = ModelRecord(
            name=name,
            version=version_tag,
            training_job_id=training_job_id,
            dataset_id=dataset_id,
            algorithm=algorithm,
            metrics_json=json.dumps(metrics),
            hyperparameters_json=json.dumps(hyperparameters),
            artifact_path=artifact_path,
            status=status,
            feature_names_json=json.dumps(feature_names),
            target_classes_json=json.dumps(target_classes),
            baseline_distribution_json=json.dumps(baseline_distribution),
            mlflow_run_id=mlflow_run_id,
            created_at=datetime.utcnow()
        )
        db.add(model_record)
        db.commit()
        db.refresh(model_record)

        if status == "PRODUCTION":
            acc = metrics.get("accuracy", 0.0)
            ACTIVE_MODEL_ACCURACY.labels(model_name=name, version=version_tag).set(acc)

        logger.info(f"Registered model {name} {version_tag} with status={status}")
        return model_record

    @staticmethod
    def promote_to_production(db: Session, model_id: int) -> ModelRecord:
        """Promotes the given model to PRODUCTION, demoting the current production model to STAGING."""
        target_model = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
        if not target_model:
            raise ValueError(f"Model ID {model_id} not found.")

        # Demote existing PRODUCTION models
        current_prods = db.query(ModelRecord).filter(ModelRecord.status == "PRODUCTION").all()
        for prod in current_prods:
            if prod.id != target_model.id:
                prod.status = "STAGING"

        target_model.status = "PRODUCTION"
        db.commit()
        db.refresh(target_model)

        metrics = json.loads(target_model.metrics_json or "{}")
        ACTIVE_MODEL_ACCURACY.labels(
            model_name=target_model.name, version=target_model.version
        ).set(metrics.get("accuracy", 0.0))

        logger.info(f"Promoted model {target_model.name} {target_model.version} to PRODUCTION")
        return target_model

    @staticmethod
    def rollback_production(db: Session, target_model_id: Optional[int] = None) -> ModelRecord:
        """Rollback production to specified model, or to the immediately preceding version."""
        current_prod = db.query(ModelRecord).filter(ModelRecord.status == "PRODUCTION").first()

        if target_model_id:
            rollback_target = db.query(ModelRecord).filter(ModelRecord.id == target_model_id).first()
        else:
            # Find the most recently created non-production model
            rollback_target = db.query(ModelRecord).filter(
                ModelRecord.status != "PRODUCTION"
            ).order_by(ModelRecord.id.desc()).first()

        if not rollback_target:
            raise ValueError("No alternative model version available for rollback.")

        if current_prod:
            current_prod.status = "ARCHIVED"

        rollback_target.status = "PRODUCTION"
        db.commit()
        db.refresh(rollback_target)

        metrics = json.loads(rollback_target.metrics_json or "{}")
        ACTIVE_MODEL_ACCURACY.labels(
            model_name=rollback_target.name, version=rollback_target.version
        ).set(metrics.get("accuracy", 0.0))

        logger.info(f"Rolled back production to model {rollback_target.name} {rollback_target.version}")
        return rollback_target

    @staticmethod
    def get_production_model(db: Session) -> Optional[ModelRecord]:
        """Returns currently active PRODUCTION model, or most recent model if none is explicitly marked PRODUCTION."""
        prod = db.query(ModelRecord).filter(ModelRecord.status == "PRODUCTION").first()
        if not prod:
            prod = db.query(ModelRecord).order_by(ModelRecord.id.desc()).first()
            if prod:
                prod.status = "PRODUCTION"
                db.commit()
        return prod
