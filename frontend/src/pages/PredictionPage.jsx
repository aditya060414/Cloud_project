import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Clock,
  Layers,
  Code
} from 'lucide-react';
import MLOpsAPI from '../services/api';

export default function PredictionPage({
  activeModel,
  onPredictionMade,
  showToast
}) {
  const [featureInputs, setFeatureInputs] = useState({});
  const [predictionResult, setPredictionResult] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [modelSchema, setModelSchema] = useState(null);

  // Initialize input form dynamically from active model features
  useEffect(() => {
    async function loadSchema() {
      try {
        const schema = await MLOpsAPI.getModelSchema();
        setModelSchema(schema);
        if (schema?.features) {
          const initial = {};
          schema.features.forEach((feat) => {
            // sensible default values
            if (feat.includes('age')) initial[feat] = 38;
            else if (feat.includes('income')) initial[feat] = 58000;
            else if (feat.includes('score')) initial[feat] = 690;
            else if (feat.includes('tenure')) initial[feat] = 24;
            else if (feat.includes('charge')) initial[feat] = 64.5;
            else if (feat.includes('transaction')) initial[feat] = 48;
            else if (feat.includes('ticket')) initial[feat] = 1;
            else if (feat.includes('contract')) initial[feat] = 'Month-to-Month';
            else if (feat.includes('sepal') || feat.includes('petal')) initial[feat] = 5.1;
            else initial[feat] = 10;
          });
          setFeatureInputs(initial);
        }
      } catch (err) {
        console.error('Failed to load schema', err);
      }
    }
    loadSchema();
  }, [activeModel]);

  const handleInputChange = (field, value) => {
    setFeatureInputs((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePredict = async (e) => {
    e?.preventDefault();
    if (!activeModel) {
      showToast('No active model deployed. Please train a model first.', 'error');
      return;
    }

    setIsPredicting(true);
    try {
      const res = await MLOpsAPI.predict(featureInputs);
      setPredictionResult(res);
      showToast(`Prediction: ${res.prediction} (Confidence: ${(res.confidence * 100).toFixed(1)}%)`, 'success');
      if (onPredictionMade) onPredictionMade();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Prediction failed', 'error');
    } finally {
      setIsPredicting(false);
    }
  };

  // Preset scenarios for instant demo
  const loadScenario = (type) => {
    if (type === 'normal') {
      setFeatureInputs({
        age: 45,
        annual_income: 75000,
        credit_score: 740,
        tenure_months: 36,
        monthly_charges: 45.0,
        total_transactions: 80,
        contract_type: 'Two-Year',
        support_tickets: 0
      });
      showToast('Loaded: Low-Risk Loyal Customer Profile', 'info');
    } else if (type === 'high_risk') {
      setFeatureInputs({
        age: 26,
        annual_income: 32000,
        credit_score: 590,
        tenure_months: 2,
        monthly_charges: 110.0,
        total_transactions: 6,
        contract_type: 'Month-to-Month',
        support_tickets: 5
      });
      showToast('Loaded: High-Risk Likely-to-Churn Profile', 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <span>Real-Time Prediction Inference Playground</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Simulate live REST API <code>POST /predict</code> requests served by the active production model in memory.
          </p>
        </div>

        {/* Demo Presets */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadScenario('normal')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold transition"
          >
            <span>Preset: Normal Customer</span>
          </button>
          <button
            onClick={() => loadScenario('high_risk')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold transition"
          >
            <span>Preset: High-Risk Churn</span>
          </button>
        </div>
      </div>

      {activeModel ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dynamic Input Form */}
          <div className="glass-card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <span>Input Feature Vectors</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Model: <strong className="text-white">{activeModel.name} {activeModel.version}</strong>
              </span>
            </div>

            <form onSubmit={handlePredict} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto pr-1">
                {Object.keys(featureInputs).map((feat) => {
                  const isContract = feat.includes('contract');
                  const val = featureInputs[feat];

                  return (
                    <div key={feat} className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-300 capitalize flex items-center justify-between">
                        <span>{feat.replace(/_/g, ' ')}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {typeof val === 'number' ? 'float/int' : 'category'}
                        </span>
                      </label>

                      {isContract ? (
                        <select
                          value={val}
                          onChange={(e) => handleInputChange(feat, e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                        >
                          <option value="Month-to-Month">Month-to-Month</option>
                          <option value="One-Year">One-Year</option>
                          <option value="Two-Year">Two-Year</option>
                        </select>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={(e) => handleInputChange(feat, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  Schema: {Object.keys(featureInputs).length} input features
                </span>
                <button
                  type="submit"
                  disabled={isPredicting}
                  className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white shadow-lg shadow-brand-500/20 transition flex items-center space-x-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{isPredicting ? 'Inferring...' : 'Try Prediction'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Inference Result & Latency Card */}
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider pb-3 border-b border-slate-800 flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Prediction Output</span>
              </h3>

              {predictionResult ? (
                <div className="space-y-4">
                  {/* Big Result Badge */}
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Predicted Class
                    </span>
                    <div className="text-3xl font-extrabold text-white tracking-tight">
                      {predictionResult.prediction === 1 || predictionResult.prediction === '1'
                        ? 'CHURN / POSITIVE (1)'
                        : predictionResult.prediction === 0 || predictionResult.prediction === '0'
                        ? 'RETAINED / NEGATIVE (0)'
                        : predictionResult.prediction}
                    </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Confidence Score</span>
                      <span className="font-mono font-bold text-emerald-400">
                        {(predictionResult.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${predictionResult.confidence * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Model</span>
                      <p className="font-semibold text-white truncate">{predictionResult.model}</p>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase">Version</span>
                      <p className="font-mono font-bold text-brand-300">{predictionResult.version}</p>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 col-span-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase">Inference Latency</span>
                      <span className="font-mono font-bold text-cyan-400">{predictionResult.latency_ms} ms</span>
                    </div>
                  </div>

                  {/* Class Probabilities */}
                  {predictionResult.probabilities && Object.keys(predictionResult.probabilities).length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Class Probabilities
                      </span>
                      {Object.entries(predictionResult.probabilities).map(([cls, prob]) => (
                        <div key={cls} className="flex justify-between text-xs text-slate-300 font-mono">
                          <span>Class {cls}:</span>
                          <span className="text-slate-200">{(prob * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-2">
                  <Terminal className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    Click <strong>"Try Prediction"</strong> or select a preset scenario to test the inference model.
                  </p>
                </div>
              )}
            </div>

            {/* REST API Request Inspector */}
            <div className="glass-card p-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1.5">
                <Code className="w-3.5 h-3.5 text-brand-400" />
                <span>REST API Equivalent Curl</span>
              </span>
              <pre className="bg-black/60 p-2.5 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto">
{`curl -X POST http://localhost:8000/predict \\
  -H "Content-Type: application/json" \\
  -d '{"features": ${JSON.stringify(featureInputs, null, 2)}}'`}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-3">
          <Zap className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Model in Production</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You must train and register a model before predictions can be executed.
          </p>
        </div>
      )}
    </div>
  );
}
