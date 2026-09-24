import React, { useState } from 'react';
import {
  Trophy,
  BarChart2,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function LeaderboardPage({
  trainingJobs,
  setActivePage,
  showToast
}) {
  const latestJob = trainingJobs && trainingJobs.length > 0 ? trainingJobs[0] : null;
  const models = latestJob?.models_evaluated || [];
  const [selectedHyperparams, setSelectedHyperparams] = useState(null);

  // Format data for Recharts
  const chartData = models.map((m) => ({
    name: m.model_name.replace('Classifier', '').trim(),
    Accuracy: Number((m.accuracy * 100).toFixed(1)),
    'F1 Score': Number((m.f1 * 100).toFixed(1)),
    Precision: Number((m.precision * 100).toFixed(1)),
    Recall: Number((m.recall * 100).toFixed(1)),
    time: m.training_time
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>AutoML Model Comparison Leaderboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real evaluation metrics calculated across all evaluated algorithms on test validation folds.
          </p>
        </div>

        {latestJob && (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">
              Evaluated on Target: <strong className="text-white">{latestJob.target_column}</strong>
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-brand-500/20 text-brand-300">
              Ranked by {latestJob.metric_used.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {models.length > 0 ? (
        <div className="space-y-6">
          {/* Comparison Bar Chart */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-brand-400" />
                <span>Multi-Model Performance Metrics (%)</span>
              </h3>
              <span className="text-[11px] text-slate-500">Validation Split (20%)</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis domain={[50, 100]} stroke="#94A3B8" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0D1322',
                      borderColor: '#1F2937',
                      borderRadius: '0.75rem',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="F1 Score" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Accuracy" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Precision" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Ranking Leaderboard Table */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Algorithm Leaderboard Rankings
            </h3>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rank & Model</th>
                    <th className="px-4 py-3 font-medium">Accuracy</th>
                    <th className="px-4 py-3 font-medium">F1 Score</th>
                    <th className="px-4 py-3 font-medium">Precision</th>
                    <th className="px-4 py-3 font-medium">Recall</th>
                    <th className="px-4 py-3 font-medium">Train Time</th>
                    <th className="px-4 py-3 font-medium">Hyperparameters</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                  {models.map((m, idx) => (
                    <tr
                      key={m.model_name}
                      className={m.is_best ? 'bg-emerald-950/20 font-semibold' : 'hover:bg-slate-800/30'}
                    >
                      <td className="px-4 py-3 flex items-center space-x-2 text-white">
                        <span className="font-mono text-slate-500 font-normal">#{idx + 1}</span>
                        {m.is_best ? (
                          <div className="flex items-center space-x-1.5">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-white font-bold">{m.model_name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              BEST
                            </span>
                          </div>
                        ) : (
                          <span>{m.model_name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-200">{(m.accuracy * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-mono text-emerald-400 font-bold">{(m.f1 * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-mono text-slate-200">{(m.precision * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-mono text-slate-200">{(m.recall * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-mono text-slate-400">{m.training_time}s</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedHyperparams({ model: m.model_name, params: m.hyperparameters })}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-brand-300 font-mono transition"
                        >
                          View Params
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {m.is_best ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Deployed
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Candidate</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                AutoML automatically selects the top-scoring candidate by F1 score and deploys it.
              </span>
              <button
                onClick={() => setActivePage('prediction')}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition shadow-sm"
              >
                <span>Test Live Predictions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card p-12 text-center space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No Leaderboard Data Available</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Run an AutoML training job first to compare model accuracy, precision, recall, and F1 scores.
          </p>
          <button
            onClick={() => setActivePage('automl')}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition"
          >
            Start AutoML Job
          </button>
        </div>
      )}

      {/* Hyperparameters Inspector Modal */}
      {selectedHyperparams && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card bg-[#0D1322] border border-slate-700 p-5 rounded-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-brand-400" />
                <span>{selectedHyperparams.model} Hyperparameters</span>
              </h3>
              <button
                onClick={() => setSelectedHyperparams(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto">
              <pre>{JSON.stringify(selectedHyperparams.params, null, 2)}</pre>
            </div>

            <div className="text-right">
              <button
                onClick={() => setSelectedHyperparams(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
