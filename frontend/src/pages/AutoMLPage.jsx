import React, { useState } from 'react';
import {
  Cpu,
  Trophy,
  Play,
  CheckCircle2,
  Terminal,
  Zap,
  Sliders,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import MLOpsAPI from '../services/api';

const ALL_MODELS = [
  'Random Forest',
  'Gradient Boosting',
  'Logistic Regression',
  'Support Vector Machine',
  'K-Nearest Neighbors'
];

export default function AutoMLPage({
  datasets,
  selectedDataset,
  setSelectedDataset,
  setActivePage,
  onTrainingComplete,
  showToast
}) {
  const [selectedModels, setSelectedModels] = useState(ALL_MODELS);
  const [metric, setMetric] = useState('f1');
  const [optunaTrials, setOptunaTrials] = useState(6);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState(null);
  const [liveLogs, setLiveLogs] = useState('');

  const toggleModel = (modelName) => {
    if (selectedModels.includes(modelName)) {
      if (selectedModels.length === 1) {
        showToast('At least one algorithm must be selected.', 'warning');
        return;
      }
      setSelectedModels(selectedModels.filter((m) => m !== modelName));
    } else {
      setSelectedModels([...selectedModels, modelName]);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDataset) {
      showToast('Please select a dataset to train on.', 'error');
      return;
    }

    setIsTraining(true);
    setLiveLogs('Initializing AutoML Engine...\nSplitting dataset (80% Train, 20% Validation)...\nStarting Optuna Hyperparameter Optimization study...');

    try {
      const result = await MLOpsAPI.startTraining({
        dataset_id: selectedDataset.id,
        target_column: selectedDataset.target_column,
        metric: metric,
        candidate_models: selectedModels,
        optuna_trials: optunaTrials
      });

      setTrainingResult(result);
      setLiveLogs(result.logs || 'Training completed successfully.');
      showToast(`AutoML completed! Champion Model: ${result.best_model_name} (${(result.best_score * 100).toFixed(1)}%)`, 'success');
      await onTrainingComplete();
    } catch (err) {
      const errDetail = err.response?.data?.detail || 'AutoML training failed';
      setLiveLogs((prev) => `${prev}\n\n[ERROR] ${errDetail}`);
      showToast(errDetail, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <span>Autonomous Machine Learning (AutoML) Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Trains multiple candidate algorithms in parallel, optimizes hyperparameters with Optuna, evaluates real cross-validation metrics, and registers the champion model.
          </p>
        </div>

        {trainingResult && (
          <button
            onClick={() => setActivePage('leaderboard')}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 transition"
          >
            <Trophy className="w-4 h-4" />
            <span>View Leaderboard</span>
          </button>
        )}
      </div>

      {/* Grid: Config Form & Live Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="glass-card p-5 space-y-5 lg:col-span-1">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. Training Dataset
            </h3>
            {datasets && datasets.length > 0 ? (
              <select
                value={selectedDataset?.id || ''}
                onChange={(e) => {
                  const found = datasets.find((d) => d.id === parseInt(e.target.value));
                  if (found) setSelectedDataset(found);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name} ({d.row_count} rows)
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400">No datasets available.</p>
            )}
          </div>

          {/* Metric Selector */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              2. Optimization Metric
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['f1', 'accuracy', 'precision', 'recall'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium uppercase text-center transition ${
                    metric === m
                      ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-500/20'
                      : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  {m === 'f1' ? 'F1 Score (Default)' : m}
                </button>
              ))}
            </div>
          </div>

          {/* Candidate Models */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                3. Candidate Algorithms
              </h3>
              <span className="text-[10px] text-slate-500">{selectedModels.length} selected</span>
            </div>

            <div className="space-y-2">
              {ALL_MODELS.map((modelName) => {
                const isSelected = selectedModels.includes(modelName);
                return (
                  <div
                    key={modelName}
                    onClick={() => toggleModel(modelName)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-purple-900/20 border-purple-500/40 text-purple-200'
                        : 'bg-slate-900/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="font-medium">{modelName}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-purple-500 pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optuna Trials Slider */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                4. Optuna Trials Per Model
              </h3>
              <span className="text-xs font-mono font-bold text-brand-400">{optunaTrials} trials</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              value={optunaTrials}
              onChange={(e) => setOptunaTrials(parseInt(e.target.value))}
              className="w-full accent-brand-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>3 (Ultra-Fast)</span>
              <span>8 (Balanced)</span>
              <span>20 (Deep Search)</span>
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleStartTraining}
            disabled={isTraining || !selectedDataset}
            className={`w-full py-3 rounded-xl text-xs font-bold text-white transition flex items-center justify-center space-x-2 shadow-lg ${
              isTraining || !selectedDataset
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/20'
            }`}
          >
            {isTraining ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Training in Progress...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start AutoML Training</span>
              </>
            )}
          </button>
        </div>

        {/* Live Execution Console & Output */}
        <div className="glass-card p-5 lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Training Progress & Execution Logs</span>
              </h3>
              {isTraining && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <span>Hyperparameter Search Running</span>
                </span>
              )}
            </div>

            {/* Console Log Window */}
            <div className="mt-3 bg-black/70 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto space-y-1">
              {liveLogs ? (
                liveLogs.split('\n').map((line, i) => (
                  <div key={i} className={line.includes('Best Model') ? 'text-emerald-400 font-bold' : (line.includes('-->') ? 'text-brand-300 font-semibold' : 'text-slate-300')}>
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-slate-600 italic">
                  Training logs will stream here once AutoML training is started...
                </div>
              )}
            </div>
          </div>

          {/* Champion Model Summary Result */}
          {trainingResult && (
            <div className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                    Best Model Automatically Selected
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded">
                  Score: {(trainingResult.best_score * 100).toFixed(1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Algorithm</span>
                  <p className="font-bold text-white truncate">{trainingResult.best_model_name}</p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Metric Used</span>
                  <p className="font-bold text-brand-300 uppercase">{trainingResult.metric_used}</p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Training Duration</span>
                  <p className="font-bold text-white">{trainingResult.duration_seconds}s</p>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">Deployment</span>
                  <p className="font-bold text-emerald-400">Deployed to Prod</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  onClick={() => setActivePage('prediction')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition"
                >
                  Test Predictions
                </button>
                <button
                  onClick={() => setActivePage('leaderboard')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition"
                >
                  <span>Compare Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
