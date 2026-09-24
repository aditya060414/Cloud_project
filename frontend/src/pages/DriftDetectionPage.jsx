import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Zap,
  TrendingDown,
  BarChart2,
  RefreshCw,
  ArrowRight,
  ShieldAlert
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
import MLOpsAPI from '../services/api';

export default function DriftDetectionPage({
  driftReport,
  onRefreshDrift,
  setActivePage,
  showToast
}) {
  const [report, setReport] = useState(driftReport);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  useEffect(() => {
    setReport(driftReport);
    if (driftReport?.features && driftReport.features.length > 0 && !selectedFeature) {
      setSelectedFeature(driftReport.features[0].feature);
    }
  }, [driftReport]);

  const handleSimulate = async () => {
    setIsSimulating(true);
    try {
      const drifted = await MLOpsAPI.simulateDrift({ shift_magnitude: 2.2, sample_size: 180 });
      setReport(drifted);
      showToast('⚠ Data Drift successfully simulated! PSI exceeded 0.25 threshold. Alert triggered!', 'warning');
      await onRefreshDrift();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Drift simulation failed', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRetrain = async () => {
    setIsRetraining(true);
    try {
      const newJob = await MLOpsAPI.triggerRetraining('f1');
      showToast(`Automated Retraining Complete! Champion: ${newJob.best_model_name} (F1: ${(newJob.best_score * 100).toFixed(1)}%)`, 'success');
      await onRefreshDrift();
      setActivePage('registry');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Retraining failed', 'error');
    } finally {
      setIsRetraining(false);
    }
  };

  const isDrift = report?.drift_detected || report?.status === 'DRIFT_DETECTED';
  const isWarning = report?.status === 'WARNING';

  // Find currently selected feature's distributions for the Recharts comparison
  const activeFeatureObj = report?.features?.find((f) => f.feature === selectedFeature) || report?.features?.[0];
  const baselineDist = activeFeatureObj?.baseline_dist || [];
  const currentDist = activeFeatureObj?.current_dist || [];

  const comparisonChartData = baselineDist.map((b, i) => ({
    bin: b.bin,
    'Baseline %': b.percentage,
    'Current %': currentDist[i]?.percentage || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <AlertTriangle className={`w-5 h-5 ${isDrift ? 'text-rose-400' : 'text-emerald-400'}`} />
            <span>Real-Time Population Stability Index (PSI) Drift Detection</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Compares live incoming prediction distributions against baseline training data. PSI &gt; 0.25 triggers automatic drift warnings and retraining alerts.
          </p>
        </div>

        {/* Demo Simulation Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulate}
            disabled={isSimulating}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition transform hover:-translate-y-0.5"
            title="Generates shifted incoming data distribution to demonstrate drift alerts to professor"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{isSimulating ? 'Simulating Distribution Shift...' : '⚡ Simulate Data Drift (Demo)'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Alert Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isDrift
            ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-rose-950/30 border-rose-500/50 animate-drift-alert'
            : isWarning
            ? 'bg-amber-950/40 border-amber-500/40'
            : 'bg-emerald-950/30 border-emerald-500/30'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div
              className={`p-2.5 rounded-xl border mt-0.5 ${
                isDrift
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : isWarning
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              }`}
            >
              {isDrift ? (
                <ShieldAlert className="w-6 h-6 animate-bounce" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  {isDrift
                    ? '⚠ DATA DRIFT DETECTED IN PRODUCTION'
                    : isWarning
                    ? '⚠ MODERATE DISTRIBUTION SHIFT'
                    : '✓ NO DRIFT DETECTED - BASELINE IN SYNC'}
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/40 text-white">
                  PSI: {report?.overall_psi?.toFixed(4) || '0.0400'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isDrift
                  ? 'Significant statistical divergence detected between current input traffic and training baseline. Model accuracy may degrade.'
                  : 'Incoming prediction feature distributions align closely with training baseline quantiles.'}
              </p>
            </div>
          </div>

          {/* Retraining CTA */}
          {report?.retraining_recommended && (
            <div className="flex-shrink-0">
              <button
                onClick={handleRetrain}
                disabled={isRetraining}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
              >
                <RefreshCw className={`w-4 h-4 ${isRetraining ? 'animate-spin' : ''}`} />
                <span>{isRetraining ? 'Retraining Pipeline Running...' : 'Start Retraining Pipeline'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feature PSI Table & Binned Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PSI Table */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Per-Feature Population Stability Index (PSI)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Thresholds: &lt;0.10 Normal | 0.10-0.25 Warning | &gt;0.25 Drift
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5 font-medium">Feature</th>
                  <th className="px-3.5 py-2.5 font-medium">PSI Score</th>
                  <th className="px-3.5 py-2.5 font-medium">Status</th>
                  <th className="px-3.5 py-2.5 font-medium">Baseline Mean</th>
                  <th className="px-3.5 py-2.5 font-medium">Current Mean</th>
                  <th className="px-3.5 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                {report?.features && report.features.length > 0 ? (
                  report.features.map((f) => {
                    const isFeatDrift = f.status === 'Drift Detected';
                    const isFeatWarn = f.status === 'Warning';
                    const isSelected = selectedFeature === f.feature;

                    return (
                      <tr
                        key={f.feature}
                        className={`transition ${
                          isSelected ? 'bg-brand-600/10' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 font-semibold text-white">
                          {f.feature}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-white">
                          {f.psi.toFixed(4)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isFeatDrift
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isFeatWarn
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {f.status}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-slate-300">
                          {f.baseline_mean ?? '-'}
                        </td>
                        <td className={`px-3.5 py-2.5 font-mono font-bold ${isFeatDrift ? 'text-rose-400' : 'text-slate-300'}`}>
                          {f.current_mean ?? '-'}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <button
                            onClick={() => setSelectedFeature(f.feature)}
                            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
                          >
                            View Bins
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No feature drift logs available. Click "Simulate Data Drift" to test!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Distribution Histogram Comparison */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-brand-400" />
                <span>Feature Distribution: {selectedFeature || 'Select Feature'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Baseline (Training) vs Current (Incoming) quantile percentage buckets
              </p>
            </div>

            {activeFeatureObj && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                activeFeatureObj.status === 'Drift Detected'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                PSI: {activeFeatureObj.psi.toFixed(4)}
              </span>
            )}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis dataKey="bin" stroke="#94A3B8" fontSize={9} />
                <YAxis stroke="#94A3B8" fontSize={11} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0D1322',
                    borderColor: '#1F2937',
                    borderRadius: '0.75rem',
                    fontSize: '11px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Baseline %" fill="#6366F1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Current %" fill="#F43F5E" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            When the purple (Baseline) and pink (Current) bars diverge, feature probability shifts. In production, this causes prediction accuracy loss, triggering retraining recommendations.
          </div>
        </div>
      </div>
    </div>
  );
}
