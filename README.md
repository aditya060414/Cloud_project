# Cloud-Based MLOps Platform (Local Demonstration)

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-1.7+-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Optuna](https://img.shields.io/badge/Optuna-Hyperparameter%20Tuning-blue.svg)](https://optuna.org)
[![MLflow](https://img.shields.io/badge/MLflow-Registry%20%26%20Tracking-0194E2.svg?logo=mlflow&logoColor=white)](https://mlflow.org)
[![Prometheus](https://img.shields.io/badge/Prometheus-Monitoring-E6522C.svg?logo=prometheus&logoColor=white)](https://prometheus.io)
[![Grafana](https://img.shields.io/badge/Grafana-Observability-F46800.svg?logo=grafana&logoColor=white)](https://grafana.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://docker.com)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Manifests%20%26%20HPA-326CE5.svg?logo=kubernetes&logoColor=white)](https://kubernetes.io)

---

## 1. Project Overview

The **Cloud-Based MLOps Platform** is a local demonstration of an enterprise-grade cloud Machine Learning Operations (MLOps) architecture designed for university mini projects, capstone reviews, and viva examinations. 

It demonstrates the complete machine learning lifecycle with zero paid cloud dependencies (no AWS, GCP, or Azure bills required). Everything runs on your local machine using Docker Compose or directly on native host environments.

```
Dataset Upload ──► Data Validation & Cleaning ──► AutoML Training ──► Model Leaderboard Comparison
                                                                               │
                                                                               ▼
Retraining Loop ◄── Data Drift Alert ◄── Live Monitoring ◄── REST Deployment ◄── Model Registry
```

---

## 2. Architecture & Design

```
                                 [ Web Browser ]
                                        │
                         HTTP / JSON    ▼    Port 3000
                    ┌────────────────────────────────────────┐
                    │      React 18 + Vite Dashboard        │
                    │   (Tailwind CSS + Recharts + Lucide)   │
                    └───────────────────┬────────────────────┘
                                        │ REST API Requests
                                        ▼ Port 8000
    ┌────────────────────────────────────────────────────────────────────────┐
    │                       FastAPI Application Gateway                      │
    │  ┌──────────────────┬──────────────────┬────────────────────────────┐  │
    │  │ /datasets        │ /training        │ /models & /predict         │  │
    │  │ Data Processing  │ AutoML Engine    │ In-Memory Inference Runtime│  │
    │  │ Median Imputer   │ Optuna Tuner     │ Model Registry Governance  │  │
    │  │ IQR Outlier Clip │ 5 ML Algorithms  │ Latency & Drift Tracker    │  │
    │  └────────┬─────────┴────────┬─────────┴─────────────┬──────────────┘  │
    └───────────┼──────────────────┼───────────────────────┼─────────────────┘
                │                  │                       │
                ▼                  ▼                       ▼
    ┌──────────────────────┐ ┌───────────┐ ┌─────────────────────────────────┐
    │ PostgreSQL / SQLite  │ │ MLflow    │ │ Prometheus Exporter (/metrics)  │
    │ • Dataset Metadata   │ │ Port 5000 │ │ • prediction_requests_total     │
    │ • Training Jobs      │ │ • Runs    │ │ • prediction_latency_seconds    │
    │ • Model Registry     │ │ • Metrics │ │ • drift_score (PSI)             │
    │ • Prediction Logs    │ │ • Artifact│ │ • drift_alerts_total            │
    │ • Drift Reports      │ └───────────┘ └────────────────┬────────────────┘
    └──────────────────────┘                                │ Scrapes Port 8000
                                                            ▼ Port 9090
                                                   ┌─────────────────┐
                                                   │   Prometheus    │
                                                   └────────┬────────┘
                                                            │ Datasource
                                                            ▼ Port 3001
                                                   ┌─────────────────┐
                                                   │     Grafana     │
                                                   │ Real-Time Dash  │
                                                   └─────────────────┘
```

---

## 3. Key Features

- **Automated Data Profiling**: CSV upload, data type detection, duplicate detection, and null profiling.
- **Smart Data Cleaning**: Imputes missing numerical features with median, categorical features with mode, clips IQR outliers, and builds serializable preprocessing pipelines.
- **Real AutoML Engine**: Evaluates 5 candidate algorithms:
  1. *Random Forest Classifier*
  2. *Gradient Boosting Classifier*
  3. *Logistic Regression*
  4. *Support Vector Machine (SVM)*
  5. *K-Nearest Neighbors (KNN)*
- **Optuna Hyperparameter Tuning**: Optimizes hyperparameters per algorithm to maximize your selected metric (F1-Score, Accuracy, Precision, or Recall).
- **Comparative Model Leaderboard**: Multi-model metrics bar chart, sorting by performance, and hyperparameter inspection.
- **Model Registry & Governance**: Versioning (`v1`, `v2`, ...), deployment stages (`STAGING`, `PRODUCTION`, `ARCHIVED`), instant rollbacks, and `.joblib` artifact downloads.
- **Low-Latency REST Inference**: Active model loaded in memory for sub-10ms predictions via `POST /predict`.
- **Real Population Stability Index (PSI) Drift Detection**:
  $$\text{PSI} = \sum \left( \text{Actual}\% - \text{Expected}\% \right) \times \ln\left( \frac{\text{Actual}\%}{\text{Expected}\%} \right)$$
  - $\text{PSI} < 0.10$: Normal
  - $0.10 \le \text{PSI} \le 0.25$: Warning
  - $\text{PSI} > 0.25$: **Critical Drift Detected**
- **1-Click Drift Simulation**: Generates statistically shifted inputs (e.g. shifts income mean from $55k to $95k) to demonstrate drift alerts to professors in real-time.
- **Automated Retraining Loop**: Retrains on updated data, generates a new version (e.g. `v2`), and allows zero-downtime promotion.
- **Full Observability**: Prometheus scraping with Grafana dashboards provisioned out-of-the-box.
- **Kubernetes Demonstrations**: Production manifests with Horizontal Pod Autoscaler (`HPA`).

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons, Axios |
| **Backend** | Python 3.11/3.13, FastAPI, Uvicorn, Pydantic v2 |
| **Machine Learning** | Scikit-Learn, Optuna, NumPy, Pandas, Joblib |
| **MLOps & Tracking** | MLflow, Prometheus Client |
| **Database** | PostgreSQL 15 (with transparent local SQLite fallback) |
| **Observability** | Prometheus, Grafana |
| **Containerization** | Docker, Docker Compose, Kubernetes |

---

## 5. Folder Structure

```
cloud-mlops-platform/
│
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint, CORS, lifespan, routes
│   │   ├── config.py             # App configurations, paths, thresholds
│   │   ├── database.py           # SQLAlchemy models with PG/SQLite fallback
│   │   │
│   │   ├── api/                  # REST API routers
│   │   │   ├── datasets.py       # Upload, profile, clean endpoints
│   │   │   ├── training.py       # AutoML launch, leaderboard, retrain
│   │   │   ├── models.py         # Registry, promote, rollback, download
│   │   │   ├── prediction.py     # Live REST inference (/predict)
│   │   │   └── monitoring.py     # Metrics, drift, simulation, health
│   │   │
│   │   ├── services/             # Core business logic
│   │   │   ├── data_processor.py # Missing imputation, encoding, outliers
│   │   │   ├── automl.py         # Optuna tuning across 5 ML models
│   │   │   ├── model_registry.py # Versioning & stage promotion
│   │   │   ├── predictor.py      # In-memory inference engine
│   │   │   └── drift_detector.py # PSI drift calculator & simulator
│   │   │
│   │   ├── schemas/              # Pydantic validation schemas
│   │   └── utils/                # Prometheus metrics & loggers
│   │
│   ├── datasets/                 # Uploaded & cleaned datasets
│   ├── models/                   # Persisted .joblib model binaries
│   ├── artifacts/                # Preprocessor pipelines
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Sidebar, TopNav, DemoStepper
│   │   ├── pages/                # 10 Dashboard views
│   │   ├── services/api.js       # Axios API client
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf
│   └── Dockerfile
│
├── monitoring/
│   ├── prometheus.yml            # Scrape configuration
│   └── grafana/
│       └── provisioning/         # Auto-provisioned datasources & dashboards
│
├── sample-data/
│   ├── sample_classification.csv # Customer Churn (1,000 records)
│   └── iris.csv                  # Classic Multiclass dataset
│
├── k8s/                          # Kubernetes Manifests & HPA
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── hpa.yaml
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 6. Prerequisites

- **Option A (Docker)**: Docker Desktop with Docker Compose.
- **Option B (Native Local Run)**:
  - Python 3.10+ (Python 3.11 or 3.13 recommended)
  - Node.js 18+ (Node 20 or 22 recommended) and npm

---

## 7. Quick Start: Running with Docker Compose (Recommended)

1. Clone or navigate to the project directory:
   ```bash
   cd c:\ML\cloud_project
   ```

2. Copy environment file:
   ```bash
   cp .env.example .env
   ```

3. Build and launch all 6 microservices:
   ```bash
   docker compose up --build
   ```

All containers will start up with health checks:
- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:8000`
- MLflow on `http://localhost:5000`
- Prometheus on `http://localhost:9090`
- Grafana on `http://localhost:3001`

---

## 8. Quick Start: Running Natively on Your Laptop (Without Docker)

You can also run the backend and frontend directly on your host machine without starting Docker Desktop. The backend automatically detects that PostgreSQL is offline and transparently uses local SQLite `mlops.db`.

### Start the Backend:
```bash
# In c:\ML\cloud_project:
py -3.13 -m pip install -r backend/requirements.txt
py -3.13 backend/app/main.py
```
*Backend runs on `http://localhost:8000` with Swagger on `http://localhost:8000/docs`.*

### Start the Frontend:
```bash
# In c:\ML\cloud_project\frontend:
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000` (or `http://localhost:5173`).*

---

## 9. Web Application URLs

| Service | URL | Purpose |
|---|---|---|
| **React Dashboard** | `http://localhost:3000` | Full MLOps SaaS user interface |
| **FastAPI Backend** | `http://localhost:8000` | REST API gateway |
| **Swagger / OpenAPI** | `http://localhost:8000/docs` | Interactive API documentation |
| **MLflow UI** | `http://localhost:5000` | Experiment runs & model artifacts |
| **Grafana Dashboard** | `http://localhost:3001` | Pre-built real-time monitoring charts |
| **Prometheus Metrics** | `http://localhost:9090` | Raw time-series scrape metrics |

---

## 10. Complete Step-by-Step Viva Demo Workflow

Follow these 14 steps during your viva or project presentation:

### Step 1: Upload Dataset
- Open the dashboard at `http://localhost:3000`.
- Navigate to **Dataset Upload**.
- Click **"Load Customer Churn (1000 rows)"** for instant 1-click loading, or upload your own CSV.

### Step 2: Select Target Column
- Verify the target column is set to `churn`.

### Step 3: Analyze Dataset
- Review the total rows (1,004), column count (9), missing records (13), and duplicates (4).
- Inspect the first 5 rows in the **Preview Table**.

### Step 4: Clean Dataset
- Navigate to **Data Processing**.
- Review the automated cleaning operations: Median Imputation, Mode Imputation, Duplicate Removal, IQR Outlier Clipping.
- Click **"Run Data Processing"**.
- Show the **Before vs. After Cleaning** comparison card:
  - Rows: `1,004` → `1,000`
  - Missing: `13` → `0`
  - Duplicates: `4` → `0`

### Step 5: Start AutoML Training
- Navigate to **AutoML Training**.
- Optimization metric: `F1 Score`.
- Candidate models: All 5 selected.
- Click **"Start AutoML Training"**.
- Watch the live execution console stream the Optuna hyperparameter optimization steps in real-time.

### Step 6 & 7: Model Leaderboard & Best Selection
- Navigate to **Model Leaderboard**.
- Show the **Metrics Comparison Bar Chart** (Accuracy, F1, Precision, Recall).
- Show the auto-selected **Champion Model** with the highest F1 score (e.g., Random Forest or Logistic Regression with ~88-95%).
- Click **"View Params"** to show optimal hyperparameters found by Optuna.

### Step 8 & 9: Model Registry & Deployment
- Navigate to **Model Registry**.
- Show version `v1` tagged with status `PRODUCTION`.
- Explain how stage promotion and instant rollbacks work.

### Step 10: Live Prediction Playground
- Navigate to **Prediction Playground**.
- Click **"Preset: Normal Customer"** → Click **"Try Prediction"** → Returns class `0` (Retained) with ~90% confidence.
- Click **"Preset: High-Risk Churn"** → Click **"Try Prediction"** → Returns class `1` (Churn) with ~85% confidence and sub-5ms latency.

### Step 11: View Monitoring
- Navigate to **Monitoring & Metrics**.
- Show prediction throughput volume chart, average latency, and Prometheus audit trail.

### Step 12 & 13: Simulate Data Drift & Trigger Alert
- Navigate to **Drift Detection**.
- The initial status is **✓ No Drift Detected (PSI < 0.10)**.
- Click the prominent **"⚡ Simulate Data Drift (Demo)"** button!
- The system generates statistically shifted incoming traffic (e.g. shifts income mean from $55k to $95k).
- Watch the UI instantly change from green to **🚨 DATA DRIFT DETECTED IN PRODUCTION (PSI > 0.25)**!
- Show the **Feature Distribution Histogram** illustrating how baseline (purple) and current (pink) distributions diverged.

### Step 14: Automated Retraining Loop
- An alert banner displays: **"Model retraining recommended."**
- Click **"Start Retraining Pipeline"**.
- AutoML automatically executes on the new distribution, registers model `v2`, updates the production runtime, and restores system health!

---

## 11. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check for Docker/Kubernetes |
| `GET` | `/metrics` | Prometheus metrics scrape format |
| `POST` | `/api/datasets/upload` | Upload and profile CSV dataset |
| `GET` | `/api/datasets` | List all registered datasets |
| `POST` | `/api/datasets/{id}/process` | Clean and prepare dataset |
| `POST` | `/api/datasets/load-sample/{name}` | Load sample dataset (churn, iris) |
| `POST` | `/api/training/start` | Launch AutoML hyperparameter study |
| `GET` | `/api/training` | List AutoML training jobs and leaderboards |
| `POST` | `/api/training/retrain` | Automated retraining trigger on drift |
| `GET` | `/api/models` | List all versioned models in registry |
| `GET` | `/api/models/active` | Get active PRODUCTION model schema |
| `POST` | `/api/models/{id}/promote` | Promote model version to Production |
| `POST` | `/api/models/{id}/rollback` | Rollback production to previous model |
| `POST` | `/predict` | In-memory real-time model inference |
| `GET` | `/api/monitoring` | Get observability statistics and history |
| `GET` | `/api/monitoring/drift` | Get current PSI drift report |
| `POST` | `/api/monitoring/simulate-drift` | Synthesize feature distribution shift |

---

## 12. Kubernetes Deployment Demonstration

To demonstrate Kubernetes scalability to your professor:

1. Apply deployments and services:
   ```bash
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/backend-service.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   kubectl apply -f k8s/frontend-service.yaml
   ```

2. Enable Horizontal Pod Autoscaling (HPA):
   ```bash
   kubectl apply -f k8s/hpa.yaml
   ```

3. Inspect pods and autoscaler:
   ```bash
   kubectl get pods -l tier=api
   kubectl get hpa mlops-backend-hpa
   ```
   *The HPA automatically scales backend replicas between 2 and 10 based on CPU (70%) and Memory (80%) utilization.*

---

## 13. Troubleshooting

1. **Port Already in Use**:
   If port 8000, 3000, or 5432 is already occupied, check and terminate stale processes:
   ```bash
   # Windows PowerShell:
   Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process
   ```
2. **PostgreSQL Container Offline**:
   No worries! The backend includes automatic SQLite fallback (`backend/mlops.db`). You can run natively without Postgres running.
3. **MLflow Connection Warning**:
   If MLflow container is not running, the backend persists experiments and artifacts locally to `backend/artifacts/` without crashing.

---

## 14. Viva Presentation Cheat Sheet

- **Why Population Stability Index (PSI) instead of just checking mean/variance?**
  *PSI evaluates the whole binned probability density function. A mean might stay identical if data becomes bimodal, but PSI will accurately capture the divergence across quantiles.*
- **Why in-memory inference instead of loading .joblib on every request?**
  *Loading a 50MB model artifact from disk on every HTTP request takes 150-300ms. Pre-warming the pipeline in memory reduces latency to under 5ms, enabling high-throughput real-time APIs.*
- **What is Concept Drift vs. Data Drift?**
  *Data Drift is a shift in $P(X)$ (feature distributions change). Concept Drift is a shift in $P(Y \mid X)$ (the relationship between features and target changes).*
