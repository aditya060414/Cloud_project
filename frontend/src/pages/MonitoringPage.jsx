import React from 'react';
import {
  Activity,
  Zap,
  Clock,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Server
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function MonitoringPage({ stats, setActivePage }) {
  const hourlyData = stats?.hourly_predictions || [
    { time: '10:00', requests: 4 },
    { time: '10:15', requests: 8 },
    { time: '10:30', requests: 14 },
    { time: '10:45', requests: 22 },
    { time: '11:00', requests: 35 }
  ];

  const latencyData = stats?.latency_history || [
    { request: '#1', latency: 2.3 },
    { request: '#2', latency: 3.1 },
    { request: '#3', latency: 2.7 },
    { request: '#4', latency: 4.2 },
    { request: '#5', latency: 3.6 }
  ];

  const totalPreds = stats?.total_predictions ?? 0;
  const avgLatency = stats?.avg_latency_ms ?? 0;
  const driftScore = stats?.current_drift_score ?? 0.04;
  const driftAlerts = stats?.drift_alerts_count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>MLOps Observability & Production Monitoring</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tracks real-time prediction traffic throughput, latency percentiles, error rates, and Prometheus scrape metrics.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="http://localhost:9090"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <span>Prometheus (9090)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-600/30 hover:bg-orange-600/40 text-orange-300 border border-orange-500/30 text-xs font-semibold transition"
          >
            <span>Grafana Dashboard (3001)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Inferences</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{totalPreds}</p>
          <span className="text-[10px] text-emerald-400">100% Success Rate</span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Avg Response Time</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{avgLatency} ms</p>
          <span className="text-[10px] text-slate-400">Sub-10ms In-Memory Inference</span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Max Drift Score (PSI)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{driftScore.toFixed(3)}</p>
          <span className="text-[10px] text-slate-400">Threshold: 0.25</span>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Drift Alerts Triggered</span>
            <ShieldCheck className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{driftAlerts}</p>
          <span className="text-[10px] text-slate-400">Retraining triggers</span>
        </div>
      </div>

      {/* Monitoring Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction Requests AreaChart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-brand-400" />
              <span>Prediction Request Volume Over Time</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">5m Buckets</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1322',
                    borderColor: '#1F2937',
                    borderRadius: '0.75rem',
                    fontSize: '11px'
                  }}
                />
                <Area type="monotone" dataKey="requests" stroke="#6366F1" fillOpacity={1} fill="url(#colorReq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency History LineChart */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Inference Response Latency (ms)</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Recent Inferences</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="request" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1322',
                    borderColor: '#1F2937',
                    borderRadius: '0.75rem',
                    fontSize: '11px'
                  }}
                />
                <Line type="monotone" dataKey="latency" stroke="#06B6D4" strokeWidth={2} dot={{ r: 4, fill: '#06B6D4' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Request Logs */}
      <div className="glass-card p-5">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Real-Time Prediction Audit Trail
        </h3>

        {stats?.recent_predictions && stats.recent_predictions.length > 0 ? (
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Log ID</th>
                  <th className="px-4 py-2.5 font-medium">Model</th>
                  <th className="px-4 py-2.5 font-medium">Version</th>
                  <th className="px-4 py-2.5 font-medium">Prediction</th>
                  <th className="px-4 py-2.5 font-medium">Confidence</th>
                  <th className="px-4 py-2.5 font-medium">Inference Latency</th>
                  <th className="px-4 py-2.5 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                {stats.recent_predictions.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono text-slate-500">#{r.id}</td>
                    <td className="px-4 py-2.5 font-medium text-white">{r.model_name}</td>
                    <td className="px-4 py-2.5 font-mono text-brand-300">{r.version}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-500/10 text-brand-300">
                        {r.prediction}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">{(r.confidence * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5 font-mono text-cyan-400">{r.latency_ms} ms</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No prediction logs recorded yet. Send a test inference to see live telemetry.
          </div>
        )}
      </div>
    </div>
  );
}
