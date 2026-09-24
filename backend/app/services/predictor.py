import os
import time
import json
import logging
from typing import Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
import joblib

from app.database import ModelRecord, PredictionLog
from app.services.model_registry import ModelRegistryService
from app.utils.metrics import record_prediction

logger = logging.getLogger("mlops.predictor")

class PredictorService:
    """Manages active production model loading, feature preprocessing, inference, and latency logging."""

    _cached_model_id: Optional[int] = None
    _cached_package: Optional[Dict[str, Any]] = None
    _cached_record: Optional[ModelRecord] = None

    @classmethod
    def load_active_model(cls, db: Session, force_reload: bool = False) -> Optional[Dict[str, Any]]:
        """Loads or retrieves the cached active production model."""
        prod_record = ModelRegistryService.get_production_model(db)
        if not prod_record:
            return None

        if not force_reload and cls._cached_model_id == prod_record.id and cls._cached_package:
            return cls._cached_package

        if not os.path.exists(prod_record.artifact_path):
            logger.error(f"Model artifact not found at {prod_record.artifact_path}")
            return None

        try:
            package = joblib.load(prod_record.artifact_path)
            cls._cached_model_id = prod_record.id
            cls._cached_package = package
            cls._cached_record = prod_record
            logger.info(f"Loaded active production model {prod_record.name} {prod_record.version} into memory.")
            return package
        except Exception as e:
            logger.error(f"Failed loading model artifact {prod_record.artifact_path}: {e}")
            return None

    @classmethod
    def predict(
        cls,
        features: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """
        Executes real prediction:
        1. Prepares input row matching feature_names
        2. Applies preprocessors (imputation, categorical mapping, scaling)
        3. Runs inference via scikit-learn model
        4. Calculates confidence score and class probabilities
        5. Logs prediction to DB and Prometheus metrics
        """
        t_start = time.time()
        package = cls.load_active_model(db)
        if not package or not cls._cached_record:
            raise RuntimeError("No active production model deployed. Please train and register a model first.")

        model = package["model"]
        scaler = package.get("scaler")
        feature_names = package["feature_names"]
        target_classes = package.get("target_classes", [0, 1])
        preprocessor = package.get("preprocessor") or {}

        # 1. Transform raw input dictionary into vector
        processed_values = []
        for feat in feature_names:
            val = features.get(feat)
            
            # Categorical encoding if applicable
            cat_encoders = preprocessor.get("cat_encoders", {})
            cat_imputers = preprocessor.get("cat_imputers", {})
            num_imputers = preprocessor.get("num_imputers", {})
            iqr_bounds = preprocessor.get("iqr_bounds", {})

            if feat in cat_encoders:
                # Handle categorical
                if val is None or str(val).strip() == "":
                    val = cat_imputers.get(feat, "Unknown")
                mapping = cat_encoders[feat].get("mapping", {})
                encoded_val = mapping.get(str(val), 0)
                processed_values.append(encoded_val)
            else:
                # Handle numerical
                if val is None or val == "":
                    val = num_imputers.get(feat, 0.0)
                try:
                    num_val = float(val)
                except (ValueError, TypeError):
                    num_val = 0.0
                
                # Clip outliers if bounds exist
                if feat in iqr_bounds:
                    b = iqr_bounds[feat]
                    num_val = np.clip(num_val, b["lower"], b["upper"])
                processed_values.append(num_val)

        # Reshape for scikit-learn
        X_input = np.array([processed_values], dtype=float)
        if scaler:
            X_input = scaler.transform(X_input)

        # 2. Predict
        raw_pred = model.predict(X_input)[0]

        # 3. Probabilities and Confidence
        probabilities = {}
        confidence = 1.0
        if hasattr(model, "predict_proba"):
            try:
                probs = model.predict_proba(X_input)[0]
                confidence = float(np.max(probs))
                for idx, p in enumerate(probs):
                    cls_label = str(target_classes[idx]) if idx < len(target_classes) else str(idx)
                    probabilities[cls_label] = round(float(p), 4)
            except Exception as e:
                logger.warning(f"Could not calculate probabilities: {e}")

        # Format output
        pred_label = int(raw_pred) if isinstance(raw_pred, (np.integer, int)) else str(raw_pred)
        latency_sec = time.time() - t_start
        latency_ms = round(latency_sec * 1000, 2)

        # 4. Record to Prometheus
        record_prediction(model_name=cls._cached_record.name, latency_sec=latency_sec, success=True)

        # 5. Persist Prediction Log to Database
        try:
            log_entry = PredictionLog(
                model_id=cls._cached_record.id,
                model_name=cls._cached_record.name,
                model_version=cls._cached_record.version,
                input_data_json=json.dumps(features),
                prediction_output=str(pred_label),
                probability_json=json.dumps(probabilities),
                confidence=round(confidence, 4),
                latency_ms=latency_ms
            )
            db.add(log_entry)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to record prediction log to database: {e}")

        return {
            "prediction": pred_label,
            "model": cls._cached_record.name,
            "version": cls._cached_record.version,
            "confidence": round(confidence, 4),
            "probabilities": probabilities,
            "latency_ms": latency_ms
        }
