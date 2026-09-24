import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Table,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  Sparkles,
  Layers
} from 'lucide-react';
import MLOpsAPI from '../services/api';

export default function DatasetsPage({
  datasets,
  selectedDataset,
  setSelectedDataset,
  setActivePage,
  onRefreshDatasets,
  showToast
}) {
  const [file, setFile] = useState(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please select a CSV file first.', 'error');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (targetColumn) {
      formData.append('target_column', targetColumn);
    }

    try {
      const newDataset = await MLOpsAPI.uploadDataset(formData);
      showToast(`Dataset '${newDataset.original_name}' uploaded and profiled successfully!`, 'success');
      await onRefreshDatasets();
      setSelectedDataset(newDataset);
      setFile(null);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to upload dataset', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSample = async (sampleName) => {
    setIsLoadingSample(true);
    try {
      const sample = await MLOpsAPI.loadSampleDataset(sampleName);
      showToast(`Sample dataset '${sampleName}' loaded successfully!`, 'success');
      await onRefreshDatasets();
      setSelectedDataset(sample);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to load sample dataset', 'error');
    } finally {
      setIsLoadingSample(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-brand-400" />
            <span>Dataset Upload & Feature Profiling</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload CSV datasets, inspect column data types, missing records, duplicates, and configure the target label.
          </p>
        </div>

        {/* 1-Click Sample Dataset Buttons for Quick Demo */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleLoadSample('churn')}
            disabled={isLoadingSample}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoadingSample ? 'Loading...' : 'Load Customer Churn (1000 rows)'}</span>
          </button>
          <button
            onClick={() => handleLoadSample('iris')}
            disabled={isLoadingSample}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <span>Load Iris</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-5 lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Upload CSV Dataset
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-brand-500 rounded-xl p-6 text-center transition cursor-pointer bg-slate-900/30">
              <input
                type="file"
                accept=".csv"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <FileText className="w-8 h-8 text-brand-400 mx-auto mb-2" />
                <span className="text-xs font-medium text-slate-300 block">
                  {file ? file.name : 'Choose CSV file or drag here'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Supports classification datasets (max 50MB)
                </span>
              </label>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                Target Column (Optional override)
              </label>
              <input
                type="text"
                placeholder="e.g. churn or species"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !file}
              className={`w-full py-2.5 rounded-lg text-xs font-semibold text-white transition flex items-center justify-center space-x-2 ${
                isUploading || !file
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'Analyzing Dataset...' : 'Upload & Analyze Dataset'}</span>
            </button>
          </form>

          {/* Dataset Selector list */}
          {datasets && datasets.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Available Datasets ({datasets.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {datasets.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDataset(d)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between ${
                      selectedDataset?.id === d.id
                        ? 'bg-brand-600/20 border border-brand-500/40 text-brand-300 font-medium'
                        : 'bg-slate-900/40 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className="truncate">{d.original_name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{d.row_count} rows</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dataset Profiling and Details */}
        <div className="glass-card p-5 lg:col-span-2">
          {selectedDataset ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Database className="w-4 h-4 text-brand-400" />
                    <span>{selectedDataset.original_name}</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target Column: <span className="text-brand-300 font-semibold">{selectedDataset.target_column || 'None specified'}</span>
                  </p>
                </div>

                <button
                  onClick={() => setActivePage('processing')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition"
                >
                  <span>Proceed to Cleaning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Rows</span>
                  <p className="text-lg font-bold text-white mt-0.5">{selectedDataset.row_count}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Columns</span>
                  <p className="text-lg font-bold text-white mt-0.5">{selectedDataset.column_count}</p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Status</span>
                  <p className={`text-xs font-bold mt-1.5 ${selectedDataset.is_cleaned ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {selectedDataset.is_cleaned ? '✓ Cleaned & Transformed' : '⚠ Raw (Needs Cleaning)'}
                  </p>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Created</span>
                  <p className="text-xs font-medium text-slate-300 mt-1.5">
                    {new Date(selectedDataset.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Data Preview Table */}
              {selectedDataset.preview && selectedDataset.preview.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                    <Table className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dataset Preview (First 5 Rows)</span>
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                        <tr>
                          {Object.keys(selectedDataset.preview[0]).map((key) => (
                            <th key={key} className="px-3 py-2 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                        {selectedDataset.preview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            {Object.values(row).map((val, cellIdx) => (
                              <td key={cellIdx} className="px-3 py-2 text-slate-200">
                                {val === null ? <span className="text-rose-400 italic">null</span> : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Columns profiling list */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Column Schema & Profiles</span>
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-3 py-2 font-medium">Column Name</th>
                        <th className="px-3 py-2 font-medium">Data Type</th>
                        <th className="px-3 py-2 font-medium">Null Values</th>
                        <th className="px-3 py-2 font-medium">Unique Values</th>
                        <th className="px-3 py-2 font-medium">Sample Values</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/20">
                      {selectedDataset.columns?.map((col) => (
                        <tr key={col.name} className="hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-semibold text-white">
                            {col.name}
                            {col.name === selectedDataset.target_column && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-brand-500/20 text-brand-300">
                                TARGET
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-400">{col.dtype}</td>
                          <td className="px-3 py-2">
                            {col.null_count > 0 ? (
                              <span className="text-amber-400 font-semibold">{col.null_count} missing</span>
                            ) : (
                              <span className="text-emerald-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{col.unique_count}</td>
                          <td className="px-3 py-2 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                            {col.sample_values ? col.sample_values.join(', ') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 space-y-3">
              <Database className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Select a dataset or upload a new CSV file to view feature profiles.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
