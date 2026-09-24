import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sliders,
  FileCheck,
  Zap,
  RotateCcw
} from 'lucide-react';
import MLOpsAPI from '../services/api';

export default function DataProcessingPage({
  datasets,
  selectedDataset,
  setSelectedDataset,
  setActivePage,
  onRefreshDatasets,
  showToast
}) {
  const [scaleNumerical, setScaleNumerical] = useState(true);
  const [handleOutliers, setHandleOutliers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cleaningReport, setCleaningReport] = useState(
    selectedDataset?.cleaning_report || null
  );

  const handleProcess = async () => {
    if (!selectedDataset) {
      showToast('Please select a dataset first.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await MLOpsAPI.processDataset(selectedDataset.id, {
        scale_numerical: scaleNumerical,
        handle_outliers: handleOutliers
      });
      setSelectedDataset(updated);
      setCleaningReport(updated.cleaning_report);
      await onRefreshDatasets();
      showToast('Dataset cleaned and transformed successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Data cleaning failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Automated Data Cleaning & Transformation Pipeline</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Imputes missing numerical values with median, categorical with mode, removes duplicate rows, clips extreme IQR outliers, and builds feature encoders.
          </p>
        </div>

        {cleaningReport && (
          <button
            onClick={() => setActivePage('automl')}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-md shadow-brand-500/20 transition"
          >
            <span>Proceed to AutoML</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls & Options */}
        <div className="glass-card p-5 space-y-5 lg:col-span-1">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Dataset for Processing
            </h3>
            {datasets && datasets.length > 0 ? (
              <select
                value={selectedDataset?.id || ''}
                onChange={(e) => {
                  const found = datasets.find((d) => d.id === parseInt(e.target.value));
                  if (found) {
                    setSelectedDataset(found);
                    setCleaningReport(found.cleaning_report || null);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.original_name} ({d.row_count} rows) {d.is_cleaned ? '[Cleaned]' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-slate-400">No datasets uploaded yet.</p>
            )}
          </div>

          {/* Cleaning Pipeline Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300">Automated Transformations</h4>
            
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span><strong>Numerical Imputation:</strong> Missing values replaced with feature median</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span><strong>Categorical Imputation:</strong> Missing categories replaced with mode</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span><strong>Duplicate Removal:</strong> Identifies and removes exact duplicate rows</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span><strong>Categorical Encoding:</strong> Converts strings to label indexes</span>
              </div>
            </div>

            {/* Config Toggles */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={handleOutliers}
                  onChange={(e) => setHandleOutliers(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-300">IQR Outlier Clipping (Clip extreme tails)</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scaleNumerical}
                  onChange={(e) => setScaleNumerical(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-300">Standardize Numerical Scaling (Zero mean, unit variance)</span>
              </label>
            </div>

            <button
              onClick={handleProcess}
              disabled={isProcessing || !selectedDataset}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold text-white transition flex items-center justify-center space-x-2 mt-4 ${
                isProcessing || !selectedDataset
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{isProcessing ? 'Cleaning in Progress...' : 'Run Data Processing'}</span>
            </button>
          </div>
        </div>

        {/* Cleaning Report Comparison */}
        <div className="glass-card p-5 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Data Cleaning Report & Transformations</span>
            </h3>

            {cleaningReport && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                ✓ Processing Complete
              </span>
            )}
          </div>

          {cleaningReport ? (
            <div className="space-y-5">
              {/* Before vs After Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before Cleaning */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      Before Cleaning
                    </span>
                    <span className="text-[10px] text-slate-500">Raw Input</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Total Rows:</span>
                      <span className="font-mono font-bold text-white">{cleaningReport.before_rows}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Missing Values:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {cleaningReport.missing_values_handled} detected
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Duplicate Rows:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {cleaningReport.duplicates_removed} found
                      </span>
                    </div>
                  </div>
                </div>

                {/* After Cleaning */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      After Cleaning
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Cleaned Baseline</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Cleaned Rows:</span>
                      <span className="font-mono font-bold text-white">{cleaningReport.after_rows}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Missing Values:</span>
                      <span className="font-mono font-bold text-emerald-400">0 (Imputed)</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Duplicate Rows:</span>
                      <span className="font-mono font-bold text-emerald-400">0 (Removed)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transformations Applied List */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2">
                  Transformations Applied ({cleaningReport.transformations?.length || 0})
                </h4>
                <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 max-h-56 overflow-y-auto space-y-1.5 font-mono text-[11px]">
                  {cleaningReport.transformations && cleaningReport.transformations.length > 0 ? (
                    cleaningReport.transformations.map((t, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-slate-300">
                        <span className="text-brand-400">▸</span>
                        <span>{t}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No transformations logged.</p>
                  )}
                </div>
              </div>

              {/* Features and Target metadata */}
              <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400">Target Feature: </span>
                  <span className="text-brand-300 font-semibold">{cleaningReport.target_column}</span>
                </div>
                <div>
                  <span className="text-slate-400">Classes: </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {cleaningReport.target_classes ? cleaningReport.target_classes.join(', ') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Feature Count: </span>
                  <span className="text-white font-bold">{cleaningReport.features_processed?.length || 0}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Click <strong>"Run Data Processing"</strong> to clean the selected dataset.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
