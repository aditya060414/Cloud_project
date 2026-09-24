import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Sparkles,
  Cpu,
  Trophy,
  Boxes,
  Terminal,
  Activity,
  AlertTriangle,
  Server,
  Cloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'datasets', label: 'Dataset Upload', icon: UploadCloud },
  { id: 'processing', label: 'Data Processing', icon: Sparkles },
  { id: 'automl', label: 'AutoML Training', icon: Cpu },
  { id: 'leaderboard', label: 'Model Leaderboard', icon: Trophy },
  { id: 'registry', label: 'Model Registry', icon: Boxes },
  { id: 'prediction', label: 'Prediction Playground', icon: Terminal },
  { id: 'monitoring', label: 'Monitoring & Metrics', icon: Activity },
  { id: 'drift', label: 'Drift Detection', icon: AlertTriangle },
  { id: 'architecture', label: 'System & Viva Guide', icon: Server },
];

export default function Sidebar({ activePage, setActivePage, activeModel, driftStatus }) {
  const isDrift = driftStatus === 'DRIFT_DETECTED';

  return (
    <aside className="w-64 bg-[#0D1322] border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 select-none z-20">
      <div>
        {/* Logo & Branding */}
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-tight text-sm">
              Cloud MLOps
            </h1>
            <p className="text-[11px] font-medium text-slate-400">
              Autonomous Platform
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const hasAlert = item.id === 'drift' && isDrift;

            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {hasAlert && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Card */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div className="bg-[#131B2E] border border-slate-800 p-3 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              Active Model
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {activeModel ? activeModel.version : 'None'}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-200 truncate">
            {activeModel ? activeModel.name : 'No model deployed'}
          </p>

          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Drift Status</span>
            <span
              className={`flex items-center space-x-1 font-semibold ${
                isDrift ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {isDrift ? (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse" />
                  <span>Drift Detected</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Normal</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
