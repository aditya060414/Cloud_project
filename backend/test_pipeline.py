import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.database import init_db, SessionLocal, Dataset
from app.services.data_processor import DataProcessor
from app.services.automl import AutoMLEngine
from app.services.model_registry import ModelRegistryService
from app.services.predictor import PredictorService
from app.services.drift_detector import DriftDetectorService

print("=== 1. INITIALIZING DATABASE ===")
init_db()
db = SessionLocal()

print("\n=== 2. TESTING DATA CLEANING & PREPROCESSING ===")
sample_csv = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample-data", "sample_classification.csv"))
cleaned_path, report, preprocessor, baseline = DataProcessor.clean_and_prepare(
    raw_file_path=sample_csv,
    target_column="churn"
)
print(f"Cleaned Path: {cleaned_path}")
print(f"Before Rows: {report['before_rows']} -> After Rows: {report['after_rows']}")
print(f"Missing Handled: {report['missing_values_handled']}, Duplicates Removed: {report['duplicates_removed']}")

print("\n=== 3. TESTING AUTOML TRAINING (Fast 3-trial run) ===")
automl_res = AutoMLEngine.train_and_evaluate(
    cleaned_csv_path=cleaned_path,
    target_column="churn",
    metric="f1",
    candidate_models=["Logistic Regression", "Random Forest", "Gradient Boosting"],
    optuna_trials=3,
    preprocessor_dict=preprocessor
)
print(f"Best Model: {automl_res['best_model_name']} with Score: {automl_res['best_score']}")
for m in automl_res['leaderboard']:
    print(f" - {m['model_name']}: Accuracy={m['accuracy']*100:.1f}%, F1={m['f1']*100:.1f}%, Time={m['training_time']}s")

# Create Dataset record in DB
dataset_row = Dataset(
    filename="sample_classification.csv",
    original_name="customer_churn_sample.csv",
    row_count=report['after_rows'],
    column_count=len(preprocessor['feature_names']) + 1,
    target_column="churn",
    file_path=sample_csv,
    cleaned_path=cleaned_path,
    is_cleaned=True
)
db.add(dataset_row)
db.commit()
db.refresh(dataset_row)

print("\n=== 4. TESTING MODEL REGISTRY & DEPLOYMENT ===")
best_item = automl_res['leaderboard'][0]
reg_model = ModelRegistryService.register_model(
    db=db,
    name=f"{automl_res['best_model_name']} Classifier",
    algorithm=automl_res['best_model_name'],
    metrics={"accuracy": best_item["accuracy"], "f1": best_item["f1"]},
    hyperparameters=automl_res['best_hyperparams'],
    artifact_path=automl_res['artifact_path'],
    feature_names=automl_res['feature_names'],
    target_classes=automl_res['target_classes'],
    baseline_distribution=baseline,
    dataset_id=dataset_row.id,
    auto_promote_if_first=True
)
print(f"Registered Model: {reg_model.name} {reg_model.version} (Status: {reg_model.status})")

print("\n=== 5. TESTING PREDICTION INFERENCE ===")
PredictorService.load_active_model(db, force_reload=True)
test_input = {
    "age": 42,
    "annual_income": 65000,
    "credit_score": 710,
    "tenure_months": 18,
    "monthly_charges": 75.5,
    "total_transactions": 45,
    "contract_type": "Month-to-Month",
    "support_tickets": 2
}
pred_res = PredictorService.predict(features=test_input, db=db)
print(f"Prediction Result: {pred_res['prediction']}, Confidence: {pred_res['confidence']*100:.1f}%, Latency: {pred_res['latency_ms']}ms")

print("\n=== 6. TESTING DRIFT DETECTION & SIMULATION ===")
drift_sim = DriftDetectorService.simulate_drift(db=db, shift_magnitude=2.0)
print(f"Drift Simulation Status: {drift_sim['status']}, Overall PSI: {drift_sim['overall_psi']}")
print(f"Drift Detected: {drift_sim['drift_detected']}, Retraining Recommended: {drift_sim['retraining_recommended']}")

db.close()
print("\n>>> ALL BACKEND PIPELINE STEPS VERIFIED SUCCESSFULLY! <<<")
