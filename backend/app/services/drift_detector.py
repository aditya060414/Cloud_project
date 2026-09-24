import os
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from datetime import datetime

from app.config import settings
from app.database import ModelRecord, Dataset, DriftLog
from app.utils.metrics import record_drift

logger = logging.getLogger("mlops.drift_detector")

class DriftDetectorService:
    """Calculates real Population Stability Index (PSI) to detect feature distribution shifts,
    and supports simulating incoming distribution drift for live demo presentations."""

    @staticmethod
    def calculate_psi(
        expected: np.ndarray,
        actual: np.ndarray,
        num_buckets: int = 10,
        epsilon: float = 1e-4
    ) -> Tuple[float, List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Calculates Population Stability Index (PSI):
        PSI = sum( (Actual% - Expected%) * ln(Actual% / Expected%) )
        Also returns binned distributions for frontend Recharts visualization.
        """
        expected = np.asarray(expected, dtype=float)
        actual = np.asarray(actual, dtype=float)

        # Drop NaNs
        expected = expected[~np.isnan(expected)]
        actual = actual[~np.isnan(actual)]

        if len(expected) == 0 or len(actual) == 0:
            return 0.0, [], []

        # Determine bin edges from combined data or expected percentiles
        percentiles = np.linspace(0, 100, num_buckets + 1)
        try:
            raw_bins = np.percentile(expected, percentiles)
            bins = np.unique(raw_bins)
            if len(bins) < 2:
                bins = np.linspace(expected.min() - 0.1, expected.max() + 0.1, num_buckets + 1)
        except Exception:
            bins = np.linspace(min(expected.min(), actual.min()), max(expected.max(), actual.max()), num_buckets + 1)

        # Count frequencies
        exp_counts, _ = np.histogram(expected, bins=bins)
        act_counts, _ = np.histogram(actual, bins=bins)

        # Convert to percentages
        exp_pct = exp_counts / len(expected)
        act_pct = act_counts / len(actual)

        # Regularize zero counts with small epsilon
        exp_pct = np.where(exp_pct == 0, epsilon, exp_pct)
        act_pct = np.where(act_pct == 0, epsilon, act_pct)

        # Normalize back so sum equals 1
        exp_pct = exp_pct / exp_pct.sum()
        act_pct = act_pct / act_pct.sum()

        # PSI computation
        psi_vector = (act_pct - exp_pct) * np.log(act_pct / exp_pct)
        psi_value = float(np.sum(psi_vector))

        # Format binned distributions for frontend chart
        baseline_chart_data = []
        current_chart_data = []
        for i in range(len(bins) - 1):
            bin_label = f"{bins[i]:.1f}-{bins[i+1]:.1f}"
            baseline_chart_data.append({
                "bin": bin_label,
                "percentage": round(float(exp_pct[i]) * 100, 2),
                "count": int(exp_counts[i])
            })
            current_chart_data.append({
                "bin": bin_label,
                "percentage": round(float(act_pct[i]) * 100, 2),
                "count": int(act_counts[i])
            })

        return round(psi_value, 4), baseline_chart_data, current_chart_data

    @classmethod
    def evaluate_model_drift(
        cls,
        db: Session,
        model_id: Optional[int] = None,
        incoming_data: Optional[pd.DataFrame] = None
    ) -> Dict[str, Any]:
        """Evaluates drift of current production model against training baseline."""
        if model_id:
            model_record = db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
        else:
            model_record = db.query(ModelRecord).filter(ModelRecord.status == "PRODUCTION").first()
            if not model_record:
                model_record = db.query(ModelRecord).order_by(ModelRecord.id.desc()).first()

        if not model_record:
            return {
                "overall_psi": 0.0,
                "status": "NORMAL",
                "features": [],
                "drift_detected": False,
                "retraining_recommended": False
            }

        # Retrieve baseline dataset
        dataset = None
        if model_record.dataset_id:
            dataset = db.query(Dataset).filter(Dataset.id == model_record.dataset_id).first()
        if not dataset:
            dataset = db.query(Dataset).order_by(Dataset.id.desc()).first()

        data_file = None
        if dataset and (dataset.cleaned_path or dataset.file_path):
            data_file = dataset.cleaned_path or dataset.file_path
        else:
            default_path = str(settings.DATASETS_DIR / "sample_classification_cleaned.csv")
            if os.path.exists(default_path):
                data_file = default_path

        if not data_file or not os.path.exists(data_file):
            return {
                "overall_psi": 0.0,
                "status": "NORMAL",
                "features": [],
                "drift_detected": False,
                "retraining_recommended": False
            }

        df_train = pd.read_csv(data_file)
        feature_names = json.loads(model_record.feature_names_json or "[]")

        if incoming_data is None:
            # If no incoming data provided, sample from training set (baseline normal condition)
            incoming_data = df_train[feature_names].sample(min(200, len(df_train)), replace=True, random_state=42)

        feature_reports = []
        max_psi = 0.0
        drift_count = 0

        for feat in feature_names:
            if feat not in df_train.columns or feat not in incoming_data.columns:
                continue

            exp_vals = pd.to_numeric(df_train[feat], errors='coerce').dropna().values
            act_vals = pd.to_numeric(incoming_data[feat], errors='coerce').dropna().values

            if len(exp_vals) == 0 or len(act_vals) == 0:
                continue

            psi, exp_dist, act_dist = cls.calculate_psi(exp_vals, act_vals)

            if psi > settings.PSI_DRIFT_THRESHOLD:
                status = "Drift Detected"
                drift_count += 1
            elif psi > settings.PSI_WARNING_THRESHOLD:
                status = "Warning"
            else:
                status = "Normal"

            max_psi = max(max_psi, psi)
            record_drift(feat, psi, is_alert=(status == "Drift Detected"))

            feature_reports.append({
                "feature": feat,
                "psi": psi,
                "status": status,
                "baseline_mean": round(float(np.mean(exp_vals)), 2),
                "current_mean": round(float(np.mean(act_vals)), 2),
                "baseline_dist": exp_dist,
                "current_dist": act_dist
            })

        overall_status = "NORMAL"
        drift_detected = False
        retraining_recommended = False

        if max_psi >= settings.PSI_DRIFT_THRESHOLD or drift_count > 0:
            overall_status = "DRIFT_DETECTED"
            drift_detected = True
            retraining_recommended = True
        elif max_psi >= settings.PSI_WARNING_THRESHOLD:
            overall_status = "WARNING"

        # Log drift analysis to DB
        drift_log = DriftLog(
            model_id=model_record.id,
            baseline_dataset_id=dataset.id,
            overall_psi=round(max_psi, 4),
            overall_status=overall_status,
            feature_psi_json=json.dumps(feature_reports),
            retraining_recommended=retraining_recommended,
            simulated=False,
            created_at=datetime.utcnow()
        )
        db.add(drift_log)
        db.commit()

        return {
            "overall_psi": round(max_psi, 4),
            "status": overall_status,
            "features": feature_reports,
            "drift_detected": drift_detected,
            "retraining_recommended": retraining_recommended,
            "timestamp": datetime.utcnow()
        }

    @classmethod
    def simulate_drift(
        cls,
        db: Session,
        dataset_id: Optional[int] = None,
        shift_magnitude: float = 1.8,
        sample_size: int = 150
    ) -> Dict[str, Any]:
        """
        Simulates significant distribution drift for demo presentation:
        Shifts numerical feature distributions by shifting mean + variance (e.g. annual_income, monthly_charges, tenure).
        Guarantees that PSI exceeds the 0.25 drift threshold.
        """
        model_record = db.query(ModelRecord).filter(ModelRecord.status == "PRODUCTION").first()
        if not model_record:
            model_record = db.query(ModelRecord).order_by(ModelRecord.id.desc()).first()

        if not model_record:
            raise RuntimeError("No model found. Please train and register a model before simulating drift.")

        target_ds_id = dataset_id or model_record.dataset_id
        dataset = None
        if target_ds_id:
            dataset = db.query(Dataset).filter(Dataset.id == target_ds_id).first()
        if not dataset:
            dataset = db.query(Dataset).order_by(Dataset.id.desc()).first()

        data_file = None
        if dataset and (dataset.cleaned_path or dataset.file_path):
            data_file = dataset.cleaned_path or dataset.file_path
        else:
            # Fallback to sample dataset if present
            default_path = str(settings.DATASETS_DIR / "sample_classification_cleaned.csv")
            if os.path.exists(default_path):
                data_file = default_path

        if not data_file or not os.path.exists(data_file):
            raise RuntimeError("No baseline dataset available for drift evaluation.")

        df_train = pd.read_csv(data_file)
        feature_names = json.loads(model_record.feature_names_json or "[]")

        # Create drifted dataset
        df_drifted = df_train[feature_names].sample(sample_size, replace=True, random_state=123).copy()

        # Shift prominent features
        num_cols = df_drifted.select_dtypes(include=[np.number]).columns.tolist()
        for col in num_cols:
            mean = df_drifted[col].mean()
            std = df_drifted[col].std() if df_drifted[col].std() > 0 else 1.0
            # Apply noticeable distribution shift
            if 'income' in col.lower() or 'charge' in col.lower() or 'amount' in col.lower():
                df_drifted[col] = df_drifted[col] * shift_magnitude + (std * 1.5)
            elif 'tenure' in col.lower() or 'age' in col.lower() or 'ticket' in col.lower():
                df_drifted[col] = (df_drifted[col] * 0.4) + (mean * 1.2)
            else:
                df_drifted[col] = df_drifted[col] + (std * 2.0)

        # Run drift analysis with drifted dataset
        report = cls.evaluate_model_drift(db=db, model_id=model_record.id, incoming_data=df_drifted)
        report["simulated"] = True

        # Update last DriftLog record to mark simulated=True
        last_log = db.query(DriftLog).order_by(DriftLog.id.desc()).first()
        if last_log:
            last_log.simulated = True
            db.commit()

        logger.info(f"Simulated data drift triggered. Overall PSI: {report['overall_psi']}, Status: {report['status']}")
        return report
