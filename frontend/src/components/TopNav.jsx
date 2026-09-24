import React from 'react';
import { ExternalLink, RefreshCw, Zap } from 'lucide-react';

export default function TopNav({ systemStatus, onRefreshStatus }) {
  const isApiOnline = systemStatus?.api?.online ?? true;
  const isDbOnline = systemStatus?.database?.online ?? true;
  const isMlflowOnline = systemStatus?.mlflow?.online ?? false;
  const isPrometheusOnline = systemStatus?.prometheus?.online ?? false;

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <h2 className="text-sm font-semibold text-slate-200 tracking-wide flex items-center space-x-2">
          <span>Cloud-Based MLOps Platform</span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            Local Demo
          </span>
        </h2>
      </div>

      {/* Live System Health Badges */}
      <div className="flex items-center space-x-6">
        <div className="hidden lg:flex items-center space-x-4 text-[11px] font-medium">
          {/* API Health */}
          <div className="flex items-center space-x-1.5" title="FastAPI REST Gateway">
            <span className={`w-2 h-2 rounded-full ${isApiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300">API Online</span>
          </div>

          {/* Database Health */}
          <div className="flex items-center space-x-1.5" title="PostgreSQL / SQLite Storage">
            <span className={`w-2 h-2 rounded-full ${isDbOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-300">DB Connected</span>
          </div>

          {/* MLflow Health */}
          <div className="flex items-center space-x-1.5" title="MLflow Tracking Server">
            <span className={`w-2 h-2 rounded-full ${isMlflowOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-slate-300">
              {isMlflowOnline ? 'MLflow Online' : 'MLflow Local'}
            </span>
          </div>

          {/* Monitoring Health */}
          <div className="flex items-center space-x-1.5" title="Prometheus Metrics Engine">
            <span className={`w-2 h-2 rounded-full ${isPrometheusOnline ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <span className="text-slate-300">
              {isPrometheusOnline ? 'Prometheus Online' : 'Metrics Exporter Active'}
            </span>
          </div>
        </div>

        {/* Quick External Links */}
        <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
            title="FastAPI Swagger Documentation"
          >
            <span>Swagger</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href="http://localhost:5000"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
            title="MLflow UI (when running in Docker)"
          >
            <span>MLflow</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition"
            title="Grafana Dashboard (when running in Docker)"
          >
            <span>Grafana</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={onRefreshStatus}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            title="Refresh System Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
