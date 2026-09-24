import time
import os
import json
import logging
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
import optuna
import joblib

# Suppress Optuna logging spam
optuna.logging.set_verbosity(optuna.logging.WARNING)

from app.config import settings

logger = logging.getLogger("mlops.automl")

class AutoMLEngine:
    """Real AutoML Engine: Trains multiple candidate models, tunes hyperparameters with Optuna,
    calculates real evaluation metrics, and persists the top-performing model."""

    SUPPORTED_ALGORITHMS = [
        "Random Forest",
        "Gradient Boosting",
        "Logistic Regression",
        "Support Vector Machine",
        "K-Nearest Neighbors"
    ]

    @classmethod
    def train_and_evaluate(
        cls,
        cleaned_csv_path: str,
        target_column: str,
        metric: str = "f1",
        candidate_models: Optional[List[str]] = None,
        optuna_trials: int = 6,
        preprocessor_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes complete AutoML training:
        1. Loads data, splits into Train & Validation (80/20 stratified)
        2. Scaler applied to features
        3. Loops through selected algorithms
        4. Runs Optuna study to optimize hyperparameters for the chosen metric
        5. Computes Accuracy, Precision, Recall, F1 on test split
        6. Selects and persists the best model
        """
        start_time = time.time()
        logger.info(f"Starting AutoML on {cleaned_csv_path} with target='{target_column}', metric='{metric}'")

        df = pd.read_csv(cleaned_csv_path)
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' missing in dataset.")

        X = df.drop(columns=[target_column])
        y = df[target_column].values

        feature_names = list(X.columns)
        classes = sorted(list(np.unique(y)))

        # Train / Validation Split (Stratified 80/20)
        try:
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
        except Exception:
            # Fallback if a class has only 1 sample
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=0.2, random_state=42
            )

        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)

        models_to_run = candidate_models or cls.SUPPORTED_ALGORITHMS
        leaderboard: List[Dict[str, Any]] = []
        best_model_obj = None
        best_scaler = scaler
        best_score = -1.0
        best_algo_name = ""
        best_hyperparams: Dict[str, Any] = {}

        logs: List[str] = [
            f"AutoML initialized with {len(X)} rows, {len(feature_names)} features.",
            f"Target: '{target_column}' ({len(classes)} distinct classes: {classes})",
            f"Train set: {len(X_train)} samples, Validation set: {len(X_val)} samples.",
            f"Optimizing for metric: '{metric.upper()}' with {optuna_trials} Optuna trials per model."
        ]

        for algo in models_to_run:
            if algo not in cls.SUPPORTED_ALGORITHMS:
                continue

            t0 = time.time()
            logs.append(f"--> Tuning and training: {algo}...")

            # Run Optuna Hyperparameter Optimization
            def objective(trial):
                model = cls._build_model_with_trial(algo, trial)
                model.fit(X_train_scaled, y_train)
                preds = model.predict(X_val_scaled)
                return cls._compute_metric_score(y_val, preds, metric)

            study = optuna.create_study(direction="maximize")
            study.optimize(objective, n_trials=optuna_trials, timeout=30)

            best_params = study.best_params
            best_model_for_algo = cls._build_model_with_params(algo, best_params)
            best_model_for_algo.fit(X_train_scaled, y_train)

            # Evaluate on Validation set
            val_preds = best_model_for_algo.predict(X_val_scaled)
            duration = round(time.time() - t0, 3)

            acc = float(accuracy_score(y_val, val_preds))
            prec = float(precision_score(y_val, val_preds, average="weighted", zero_division=0))
            rec = float(recall_score(y_val, val_preds, average="weighted", zero_division=0))
            f1 = float(f1_score(y_val, val_preds, average="weighted", zero_division=0))

            score_for_ranking = {"f1": f1, "accuracy": acc, "precision": prec, "recall": rec}.get(metric.lower(), f1)

            logs.append(
                f"    {algo} completed in {duration}s -> Accuracy: {acc*100:.1f}%, F1: {f1*100:.1f}%, Prec: {prec*100:.1f}%, Rec: {rec*100:.1f}%"
            )

            result_entry = {
                "model_name": algo,
                "accuracy": round(acc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "training_time": duration,
                "hyperparameters": best_params,
                "score": round(score_for_ranking, 4),
                "is_best": False
            }
            leaderboard.append(result_entry)

            if score_for_ranking > best_score:
                best_score = score_for_ranking
                best_model_obj = best_model_for_algo
                best_algo_name = algo
                best_hyperparams = best_params

        # Sort leaderboard descending by selected metric score
        leaderboard.sort(key=lambda item: item["score"], reverse=True)
        if leaderboard:
            leaderboard[0]["is_best"] = True

        total_duration = round(time.time() - start_time, 2)
        logs.append(f"AutoML completed in {total_duration}s. Best Model: {best_algo_name} (Score: {best_score:.4f})")

        # Save Best Model Artifact Pipeline
        timestamp_str = int(time.time())
        model_filename = f"model_{best_algo_name.lower().replace(' ', '_')}_{timestamp_str}.joblib"
        artifact_path = str(settings.MODELS_DIR / model_filename)

        model_package = {
            "model": best_model_obj,
            "scaler": best_scaler,
            "algorithm": best_algo_name,
            "feature_names": feature_names,
            "target_column": target_column,
            "target_classes": [int(c) if isinstance(c, (np.integer, int)) else str(c) for c in classes],
            "hyperparameters": best_hyperparams,
            "preprocessor": preprocessor_dict,
            "metric": metric,
            "score": best_score,
            "timestamp": timestamp_str
        }

        joblib.dump(model_package, artifact_path)
        logger.info(f"Persisted best model to {artifact_path}")

        # Attempt MLflow logging if available
        mlflow_run_id = cls._log_to_mlflow(
            experiment_name=settings.MLFLOW_EXPERIMENT_NAME,
            best_algo=best_algo_name,
            metrics={"accuracy": leaderboard[0]["accuracy"], "f1": leaderboard[0]["f1"], "precision": leaderboard[0]["precision"], "recall": leaderboard[0]["recall"]},
            params=best_hyperparams,
            artifact_path=artifact_path
        )

        return {
            "leaderboard": leaderboard,
            "best_model_name": best_algo_name,
            "best_score": round(best_score, 4),
            "best_hyperparams": best_hyperparams,
            "artifact_path": artifact_path,
            "feature_names": feature_names,
            "target_classes": [int(c) if isinstance(c, (np.integer, int)) else str(c) for c in classes],
            "total_duration": total_duration,
            "logs": "\n".join(logs),
            "mlflow_run_id": mlflow_run_id
        }

    @staticmethod
    def _build_model_with_trial(algo: str, trial: optuna.Trial):
        if algo == "Random Forest":
            n_estimators = trial.suggest_int("n_estimators", 15, 60)
            max_depth = trial.suggest_int("max_depth", 3, 12)
            min_samples_split = trial.suggest_int("min_samples_split", 2, 6)
            return RandomForestClassifier(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=min_samples_split,
                random_state=42,
                n_jobs=1
            )
        elif algo == "Gradient Boosting":
            n_estimators = trial.suggest_int("n_estimators", 15, 50)
            learning_rate = trial.suggest_float("learning_rate", 0.03, 0.25, log=True)
            max_depth = trial.suggest_int("max_depth", 2, 5)
            return GradientBoostingClassifier(
                n_estimators=n_estimators,
                learning_rate=learning_rate,
                max_depth=max_depth,
                random_state=42
            )
        elif algo == "Logistic Regression":
            C = trial.suggest_float("C", 0.01, 10.0, log=True)
            solver = trial.suggest_categorical("solver", ["lbfgs", "liblinear"])
            return LogisticRegression(C=C, solver=solver, max_iter=200, random_state=42)
        elif algo == "Support Vector Machine":
            C = trial.suggest_float("C", 0.1, 10.0, log=True)
            kernel = trial.suggest_categorical("kernel", ["linear", "rbf"])
            return SVC(C=C, kernel=kernel, probability=True, random_state=42)
        elif algo == "K-Nearest Neighbors":
            n_neighbors = trial.suggest_int("n_neighbors", 3, 11)
            weights = trial.suggest_categorical("weights", ["uniform", "distance"])
            return KNeighborsClassifier(n_neighbors=n_neighbors, weights=weights)
        else:
            return RandomForestClassifier(n_estimators=30, random_state=42, n_jobs=1)

    @staticmethod
    def _build_model_with_params(algo: str, params: Dict[str, Any]):
        if algo == "Random Forest":
            return RandomForestClassifier(**params, random_state=42, n_jobs=1)
        elif algo == "Gradient Boosting":
            return GradientBoostingClassifier(**params, random_state=42)
        elif algo == "Logistic Regression":
            return LogisticRegression(**params, max_iter=200, random_state=42)
        elif algo == "Support Vector Machine":
            return SVC(**params, probability=True, random_state=42)
        elif algo == "K-Nearest Neighbors":
            return KNeighborsClassifier(**params)
        else:
            return RandomForestClassifier(n_estimators=30, random_state=42, n_jobs=1)

    @staticmethod
    def _compute_metric_score(y_true, y_pred, metric: str) -> float:
        metric = metric.lower()
        if metric == "accuracy":
            return float(accuracy_score(y_true, y_pred))
        elif metric == "precision":
            return float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
        elif metric == "recall":
            return float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
        else:
            return float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    @staticmethod
    def _log_to_mlflow(
        experiment_name: str,
        best_algo: str,
        metrics: Dict[str, float],
        params: Dict[str, Any],
        artifact_path: str
    ) -> Optional[str]:
        """Logs experiment run to MLflow remote server or local directory fallback."""
        try:
            import mlflow
            # Fast check if remote MLflow server is responding (0.5s timeout)
            use_remote = False
            if settings.MLFLOW_TRACKING_URI.startswith("http"):
                import urllib.request
                try:
                    urllib.request.urlopen(f"{settings.MLFLOW_TRACKING_URI}/health", timeout=0.5)
                    use_remote = True
                except Exception:
                    use_remote = False

            if use_remote:
                mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            else:
                local_mlflow_dir = settings.BASE_DIR / "mlflow_runs"
                local_mlflow_dir.mkdir(parents=True, exist_ok=True)
                mlflow.set_tracking_uri(f"file:///{local_mlflow_dir.as_posix()}")

            mlflow.set_experiment(experiment_name)
            with mlflow.start_run(run_name=f"{best_algo}_AutoML") as run:
                clean_params = {k: str(v) for k, v in params.items()}
                mlflow.log_params(clean_params)
                mlflow.log_metrics(metrics)
                mlflow.set_tag("model_algorithm", best_algo)
                if os.path.exists(artifact_path):
                    mlflow.log_artifact(artifact_path, artifact_path="model_package")
                logger.info(f"Logged run {run.info.run_id} to MLflow")
                return run.info.run_id
        except Exception as e:
            logger.info(f"MLflow tracking skipped ({e}). Local model artifact persisted successfully.")
            return None
