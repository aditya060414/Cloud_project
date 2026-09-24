import React from 'react';
import {
  Database,
  Cpu,
  Boxes,
  Zap,
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp
} from 'lucide-react';
import DemoStepper from '../components/DemoStepper';

export default function DashboardPage({
  stats,
  activeModel,
  datasets,
  trainingJobs,
  setActivePage,
  onSimulateDrift
}) {
  const driftScore = stats?.current_drift_score ?? 0.04;
  const isDrift = stats?.drift_status === 'DRIFT_DETECTED';
  const isWarning = stats?.drift_status === 'WARNING';

  const cards = [
    {
      title: 'Datasets',
      value: datasets?.length ?? 1,
      sub: 'Available in Storage',
      icon: Database,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      page: 'datasets'
    },
    {
      title: 'Training Jobs',
      value: trainingJobs?.length ?? 0,
      sub: 'AutoML Runs',
      icon: Cpu,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      page: 'automl'
    },
    {
      title: 'Registered Models',
      value: activeModel ? 1 : 0,
      sub: 'Versioned Artifacts',
      icon: Boxes,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      page: 'registry'
    },
    {
      title: 'Active Model',
      value: activeModel ? activeModel.version : 'None',
      sub: activeModel ? activeModel.algorithm : 'No Deployment',
      icon: Zap,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      page: 'prediction'
    },
    {
      title: 'Prediction Requests',
      value: stats?.total_predictions ?? 0,
      sub: `Avg Latency: ${stats?.avg_latency_ms ?? 0} ms`,
      icon: Activity,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      page: 'monitoring'
    },
    {
      title: 'Drift Score (PSI)',
      value: driftScore.toFixed(3),
      sub: isDrift ? '⚠ Retraining Recommended' : (isWarning ? 'Moderate Shift' : 'Distribution In Sync'),
      icon: AlertTriangle,
      color: isDrift ? 'text-rose-400' : (isWarning ? 'text-amber-400' : 'text-emerald-400'),
      bg: isDrift
        ? 'bg-rose-500/20 border-rose-500/40 animate-drift-alert'
        : (isWarning ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'),
      page: 'drift'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 14-Step Interactive Guide Banner */}
      <DemoStepper setActivePage={setActivePage} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              onClick={() => setActivePage(c.page)}
              className="glass-card glass-card-hover p-4 cursor-pointer relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {c.title}
                </span>
                <div className={`p-2 rounded-lg border ${c.bg}`}>
                  <Icon className={`w-4 h-4 ${c.color}`} />
                </div>
              </div>
              <div className="text-xl font-bold text-white tracking-tight truncate">
                {c.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">
                {c.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Split: Active Model & Drift Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Deployment Details */}
        <div className="lg:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Production Model Deployment</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Current active REST inference endpoint serving predictions
              </p>
            </div>
            {activeModel && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Active</span>
              </span>
            )}
          </div>

          {activeModel ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Model Name</span>
                  <p className="text-xs font-semibold text-white mt-0.5">{activeModel.name}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Algorithm</span>
                  <p className="text-xs font-semibold text-brand-300 mt-0.5">{activeModel.algorithm}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">F1 Score</span>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                    {activeModel.metrics?.f1 ? (activeModel.metrics.f1 * 100).toFixed(1) + '%' : 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Version</span>
                  <p className="text-xs font-mono font-bold text-white mt-0.5">{activeModel.version}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Deployed at {new Date(activeModel.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActivePage('prediction')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition shadow-sm"
                  >
                    <span>Test Prediction</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActivePage('registry')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                  >
                    Manage Versions
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                No model is currently in production. Start AutoML training to train and register a model.
              </p>
              <button
                onClick={() => setActivePage('automl')}
                className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white transition"
              >
                Start AutoML Training
              </button>
            </div>
          )}
        </div>

        {/* Live Drift Monitor Widget */}
        <div className="glass-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <AlertTriangle className={`w-4 h-4 ${isDrift ? 'text-rose-400' : 'text-emerald-400'}`} />
                <span>Data Drift Status</span>
              </h3>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isDrift ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {isDrift ? 'ALERT' : 'NORMAL'}
              </span>
            </div>

            <div className="space-y-3 my-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Population Stability Index (PSI):</span>
                <span className="text-lg font-mono font-bold text-white">{driftScore.toFixed(4)}</span>
              </div>

              {/* Progress meter */}
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    isDrift ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, (driftScore / 0.3) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.00 (Normal)</span>
                <span>0.10 (Warning)</span>
                <span>0.25+ (Drift)</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isDrift
                ? '⚠ Feature distribution has shifted significantly from baseline training data. Model performance may degrade.'
                : '✓ Prediction features match the baseline training distribution within safe statistical thresholds.'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center space-x-2">
            <button
              onClick={() => setActivePage('drift')}
              className={`w-full py-2 rounded-lg text-xs font-semibold transition ${
                isDrift
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isDrift ? 'Resolve Drift & Retrain' : 'Open Drift Inspector'}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Predictions & Recent Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Predictions */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Recent Prediction Requests</span>
            </h3>
            <button
              onClick={() => setActivePage('monitoring')}
              className="text-xs text-brand-400 hover:underline"
            >
              View all
            </button>
          </div>

          {stats?.recent_predictions && stats.recent_predictions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80">
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Output</th>
                    <th className="pb-2 font-medium">Confidence</th>
                    <th className="pb-2 font-medium">Latency</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {stats.recent_predictions.slice(0, 5).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 font-medium text-slate-200">{p.model_name}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-500/10 text-brand-300">
                          {p.prediction}
                        </span>
                      </td>
                      <td className="py-2 text-slate-300">{(p.confidence * 100).toFixed(1)}%</td>
                      <td className="py-2 font-mono text-slate-400">{p.latency_ms} ms</td>
                      <td className="py-2 text-slate-500">{p.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              No recent predictions logged yet. Try the Prediction Playground!
            </div>
          )}
        </div>

        {/* Recent Training Jobs */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Recent AutoML Jobs</span>
            </h3>
            <button
              onClick={() => setActivePage('leaderboard')}
              className="text-xs text-brand-400 hover:underline"
            >
              Leaderboard
            </button>
          </div>

          {trainingJobs && trainingJobs.length > 0 ? (
            <div className="space-y-2.5">
              {trainingJobs.slice(0, 4).map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">Job #{j.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                        Target: {j.target_column}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Best: <span className="text-emerald-400 font-semibold">{j.best_model_name}</span> ({j.metric_used.toUpperCase()}: {(j.best_score * 100).toFixed(1)}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                      {j.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{j.duration_seconds}s</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              No training jobs executed yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
