import React from 'react';
import {
  Server,
  Layers,
  Cpu,
  Database,
  Activity,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  HelpCircle,
  ShieldCheck,
  Zap
} from 'lucide-react';

const vivaQuestions = [
  {
    q: '1. What is the fundamental difference between standard DevOps and MLOps?',
    a: 'DevOps manages code and infrastructure lifecycle (CI/CD). MLOps manages Code + Data + Machine Learning Models. Because data continuously changes in the real world (concept drift & data drift), models degrade over time even if the code remains unchanged. MLOps continuously monitors data distributions, triggers retraining pipelines, and automates deployment.'
  },
  {
    q: '2. How does the AutoML Engine compare multiple algorithms?',
    a: 'The platform splits data into 80% train and 20% validation sets with stratification. It runs Optuna studies across Logistic Regression, Random Forest, Gradient Boosting, SVM, and KNN to find optimal hyperparameters, and calculates actual test-set Accuracy, Precision, Recall, and F1-Scores to rank a leaderboard.'
  },
  {
    q: '3. What is Population Stability Index (PSI) and how is it calculated?',
    a: 'PSI measures how much a variable distribution has shifted between two points in time. It partitions data into quantile buckets and computes: PSI = sum( (Actual% - Expected%) * ln(Actual% / Expected%) ). PSI < 0.1 indicates normal stability, 0.1 to 0.25 indicates moderate warning, and PSI > 0.25 flags critical drift requiring model retraining.'
  },
  {
    q: '4. How is the Model Registry implemented and why is it needed?',
    a: 'The Model Registry tracks model lineage: version tags (v1, v2), training jobs, hyperparameters, evaluation metrics, and artifact paths (.joblib). It governs lifecycle stages: Staging vs. Production, allowing zero-downtime hot-promotion and instant rollbacks to previous versions if issues arise.'
  },
  {
    q: '5. What role do Prometheus and Grafana play in this architecture?',
    a: 'FastAPI exposes custom metrics via /metrics (prediction_requests_total, prediction_latency, drift_score, drift_alerts). Prometheus scrapes this endpoint at 5-second intervals. Grafana queries Prometheus to visualize live throughput, p99 latency percentiles, and drift alert gauges on executive dashboards.'
  },
  {
    q: '6. How does the simulated data drift trigger retraining?',
    a: 'The "Simulate Data Drift" feature generates synthetic incoming records with shifted feature statistics (e.g. income mean increased by 120%). The Drift Detector calculates PSI across all features, notices PSI > 0.25, records a drift alert in PostgreSQL and Prometheus, and renders the "Start Retraining" CTA which kicks off automated AutoML retraining to generate model v2.'
  }
];

export default function ArchitecturePage({ systemStatus }) {
  const components = [
    { name: 'React Dashboard', role: 'Frontend UI & Presentation', tech: 'React 18 + Vite + Tailwind CSS', port: '3000' },
    { name: 'FastAPI Gateway', role: 'REST API, Inference & Lifecycle', tech: 'Python 3.11/3.13 + Uvicorn', port: '8000' },
    { name: 'AutoML Engine', role: 'Model Training & Tuning', tech: 'Scikit-Learn + Optuna + Joblib', port: 'In-Process' },
    { name: 'Metadata Database', role: 'State & Lineage Persistence', tech: 'PostgreSQL / SQLite Fallback', port: '5432' },
    { name: 'MLflow Server', role: 'Experiment Tracking & Registry', tech: 'MLflow 2.19', port: '5000' },
    { name: 'Prometheus', role: 'Time-Series Metrics Scraper', tech: 'Prometheus Core', port: '9090' },
    { name: 'Grafana', role: 'Observability & Dashboards', tech: 'Grafana 10', port: '3001' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <span>System Architecture & Viva Examination Guide</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Detailed technical breakdown of the local microservices topology, deployment architecture, and key presentation Q&A for your college project review.
        </p>
      </div>

      {/* Component Matrix */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Platform Component Topology & Services
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {components.map((c) => (
            <div key={c.name} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">{c.name}</span>
                <span className="font-mono text-[10px] text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                  :{c.port}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">{c.role}</p>
              <p className="text-[10px] text-slate-500 font-mono">{c.tech}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Flow Diagram */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          End-to-End MLOps Pipeline Workflow
        </h3>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-brand-300 overflow-x-auto leading-relaxed">
          <pre>{`User / Data Scientist
  │
  ▼
React Dashboard (Port 3000) ──► FastAPI Gateway (Port 8000)
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
        Data Processing Service                       AutoML Training Engine
        • Median / Mode Imputation                    • Optuna Hyperparameter Study
        • Duplicate Removal                           • 5 Candidate Algorithms
        • IQR Outlier Clipping                        • F1, Accuracy, Precision, Recall
        • Categorical Encoding                                 │
        • Baseline Distribution Saved                          ▼
                 │                                    Model Registry Service
                 │                                    • Version Tagging (v1, v2)
                 │                                    • Staging ──► Production Stage
                 │                                    • Artifact (.joblib) Persisted
                 ▼                                             │
        REST Prediction API                                    ▼
        • In-Memory Pipeline Inference                MLflow Server (Port 5000)
        • <10ms Low Latency Response
                 │
                 ▼
        Prometheus Exporter (/metrics) ──► Prometheus Scraper (Port 9090) ──► Grafana (Port 3001)
                 │
                 ▼
        Drift Detection Service (PSI)
        • Baseline Quantiles vs Incoming
        • PSI > 0.25 ──► Drift Alert ──► Retraining Recommendation ──► AutoML Pipeline Loop`}</pre>
        </div>
      </div>

      {/* Professor Viva Q&A Guide */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Viva Examination Questions & Model Answers
          </h3>
        </div>

        <div className="space-y-4">
          {vivaQuestions.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-start space-x-2">
                <HelpCircle className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
                <span>{item.q}</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed pl-6">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
