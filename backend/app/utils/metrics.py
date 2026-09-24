import time
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Prometheus Metrics Definitions
PREDICTION_REQUESTS_TOTAL = Counter(
    "prediction_requests_total",
    "Total number of prediction requests processed",
    ["model_name", "status"]
)

PREDICTION_LATENCY = Histogram(
    "prediction_latency_seconds",
    "Latency of prediction inference in seconds",
    ["model_name"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

TRAINING_JOBS_TOTAL = Counter(
    "training_jobs_total",
    "Total number of AutoML training jobs run",
    ["status"]
)

DRIFT_SCORE = Gauge(
    "drift_score",
    "Latest maximum Population Stability Index (PSI) drift score",
    ["feature_name"]
)

DRIFT_ALERTS_TOTAL = Counter(
    "drift_alerts_total",
    "Total number of drift alerts triggered"
)

ACTIVE_MODEL_ACCURACY = Gauge(
    "active_model_accuracy",
    "Accuracy metric of currently deployed production model",
    ["model_name", "version"]
)

def record_prediction(model_name: str, latency_sec: float, success: bool = True):
    status = "success" if success else "error"
    PREDICTION_REQUESTS_TOTAL.labels(model_name=model_name, status=status).inc()
    PREDICTION_LATENCY.labels(model_name=model_name).observe(latency_sec)

def record_training_job(status: str):
    TRAINING_JOBS_TOTAL.labels(status=status).inc()

def record_drift(feature_name: str, psi_value: float, is_alert: bool = False):
    DRIFT_SCORE.labels(feature_name=feature_name).set(psi_value)
    if is_alert:
        DRIFT_ALERTS_TOTAL.inc()

def get_metrics_payload():
    return generate_latest(), CONTENT_TYPE_LATEST
