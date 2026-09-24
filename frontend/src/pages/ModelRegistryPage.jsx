import React, { useState } from 'react';
import {
  Boxes,
  Zap,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Download,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import MLOpsAPI from '../services/api';

export default function ModelRegistryPage({
  models,
  onRefreshModels,
  setActivePage,
  showToast
}) {
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);

  const handlePromote = async (id) => {
    setIsPromoting(true);
    try {
      await MLOpsAPI.promoteModel(id);
      showToast('Model promoted to PRODUCTION runtime successfully!', 'success');
      await onRefreshModels();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Promotion failed', 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRollback = async (id) => {
    setIsPromoting(true);
    try {
      await MLOpsAPI.rollbackModel(id);
      showToast('Production runtime rolled back successfully!', 'success');
      await onRefreshModels();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Rollback failed', 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-indigo-400" />
            <span>Model Registry & Version Governance</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Centrally tracks model lineage, versions (v1, v2...), evaluation metrics, stage transitions (Staging → Production), and instant rollbacks.
          </p>
        </div>

        <a
          href="http://localhost:5000"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
        >
          <span>Open MLflow Tracking UI</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {models && models.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Models List */}
          <div className="lg:col-span-2 space-y-4">
            {models.map((m) => {
              const isProd = m.status === 'PRODUCTION';
              const isStaging = m.status === 'STAGING';

              return (
                <div
                  key={m.id}
                  className={`glass-card p-5 space-y-4 transition ${
                    isProd ? 'border-emerald-500/40 bg-emerald-950/10' : 'hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
                        <Zap className={`w-5 h-5 ${isProd ? 'text-emerald-400' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">{m.name}</h3>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {m.version}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">Algorithm: {m.algorithm}</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isProd
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : isStaging
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Metrics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">F1 Score</span>
                      <p className="font-mono font-bold text-emerald-400 mt-0.5">
                        {m.metrics?.f1 ? (m.metrics.f1 * 100).toFixed(1) + '%' : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Accuracy</span>
                      <p className="font-mono font-bold text-white mt-0.5">
                        {m.metrics?.accuracy ? (m.metrics.accuracy * 100).toFixed(1) + '%' : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Precision</span>
                      <p className="font-mono font-bold text-cyan-400 mt-0.5">
                        {m.metrics?.precision ? (m.metrics.precision * 100).toFixed(1) + '%' : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Features</span>
                      <p className="font-mono font-bold text-purple-300 mt-0.5">
                        {m.feature_names?.length || 0} features
                      </p>
                    </div>
                  </div>

                  {/* Actions & Timestamps */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Trained {new Date(m.created_at).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <a
                        href={`http://localhost:8000/api/models/${m.id}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                        title="Download model artifact .joblib binary"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Artifact</span>
                      </a>

                      {!isProd ? (
                        <button
                          onClick={() => handlePromote(m.id)}
                          disabled={isPromoting}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Promote to Production</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setActivePage('prediction')}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition"
                        >
                          <span>Active in REST API</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Registry Information Card */}
          <div className="glass-card p-5 space-y-4 self-start">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Governance & Lifecycle Rules
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400">Production Stage</span>
                <p className="text-[11px] text-slate-400">
                  The model active in FastAPI in-memory runtime serving <code>/predict</code> requests. Exactly 1 active model per platform.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-300">Staging Stage</span>
                <p className="text-[11px] text-slate-400">
                  Trained candidates ready for validation or canary evaluation before being promoted.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                <span className="font-bold text-slate-400">Instant Rollback</span>
                <p className="text-[11px] text-slate-400">
                  If data drift or degraded performance occurs, click rollback to hot-swap back to a previous champion version without downtime.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setActivePage('prediction')}
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
              >
                Go to Prediction Playground
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-3">
          <Boxes className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Registered Models</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run AutoML to train models. The best model will automatically be registered as v1.
          </p>
          <button
            onClick={() => setActivePage('automl')}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition"
          >
            Start AutoML Job
          </button>
        </div>
      )}
    </div>
  );
}
