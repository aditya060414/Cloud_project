import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import DashboardPage from './pages/DashboardPage';
import DatasetsPage from './pages/DatasetsPage';
import DataProcessingPage from './pages/DataProcessingPage';
import AutoMLPage from './pages/AutoMLPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ModelRegistryPage from './pages/ModelRegistryPage';
import PredictionPage from './pages/PredictionPage';
import MonitoringPage from './pages/MonitoringPage';
import DriftDetectionPage from './pages/DriftDetectionPage';
import ArchitecturePage from './pages/ArchitecturePage';
import MLOpsAPI from './services/api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [systemStatus, setSystemStatus] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeModel, setActiveModel] = useState(null);
  const [models, setModels] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [trainingJobs, setTrainingJobs] = useState([]);
  const [driftReport, setDriftReport] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch initial platform state
  const loadPlatformData = async () => {
    try {
      const [
        datasetsData,
        modelsData,
        activeModelData,
        jobsData,
        statsData,
        driftData,
        statusData
      ] = await Promise.allSettled([
        MLOpsAPI.getDatasets(),
        MLOpsAPI.getModels(),
        MLOpsAPI.getActiveModel(),
        MLOpsAPI.getTrainingJobs(),
        MLOpsAPI.getMonitoringStats(),
        MLOpsAPI.getDriftReport(),
        MLOpsAPI.getSystemStatus()
      ]);

      if (datasetsData.status === 'fulfilled') {
        setDatasets(datasetsData.value);
        if (datasetsData.value.length > 0 && !selectedDataset) {
          setSelectedDataset(datasetsData.value[0]);
        }
      }

      if (modelsData.status === 'fulfilled') setModels(modelsData.value);
      if (activeModelData.status === 'fulfilled') setActiveModel(activeModelData.value);
      if (jobsData.status === 'fulfilled') setTrainingJobs(jobsData.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (driftData.status === 'fulfilled') setDriftReport(driftData.value);
      if (statusData.status === 'fulfilled') setSystemStatus(statusData.value);
    } catch (err) {
      console.error('Failed to load initial platform data', err);
    }
  };

  useEffect(() => {
    loadPlatformData();
    const interval = setInterval(loadPlatformData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0B0F19] text-slate-100">
      {/* Fixed Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        activeModel={activeModel}
        driftStatus={driftReport?.status || stats?.drift_status}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav
          systemStatus={systemStatus}
          onRefreshStatus={loadPlatformData}
        />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activePage === 'dashboard' && (
            <DashboardPage
              stats={stats}
              activeModel={activeModel}
              datasets={datasets}
              trainingJobs={trainingJobs}
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'datasets' && (
            <DatasetsPage
              datasets={datasets}
              selectedDataset={selectedDataset}
              setSelectedDataset={setSelectedDataset}
              setActivePage={setActivePage}
              onRefreshDatasets={loadPlatformData}
              showToast={showToast}
            />
          )}

          {activePage === 'processing' && (
            <DataProcessingPage
              datasets={datasets}
              selectedDataset={selectedDataset}
              setSelectedDataset={setSelectedDataset}
              setActivePage={setActivePage}
              onRefreshDatasets={loadPlatformData}
              showToast={showToast}
            />
          )}

          {activePage === 'automl' && (
            <AutoMLPage
              datasets={datasets}
              selectedDataset={selectedDataset}
              setSelectedDataset={setSelectedDataset}
              setActivePage={setActivePage}
              onTrainingComplete={loadPlatformData}
              showToast={showToast}
            />
          )}

          {activePage === 'leaderboard' && (
            <LeaderboardPage
              trainingJobs={trainingJobs}
              setActivePage={setActivePage}
              showToast={showToast}
            />
          )}

          {activePage === 'registry' && (
            <ModelRegistryPage
              models={models}
              onRefreshModels={loadPlatformData}
              setActivePage={setActivePage}
              showToast={showToast}
            />
          )}

          {activePage === 'prediction' && (
            <PredictionPage
              activeModel={activeModel}
              onPredictionMade={loadPlatformData}
              showToast={showToast}
            />
          )}

          {activePage === 'monitoring' && (
            <MonitoringPage
              stats={stats}
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'drift' && (
            <DriftDetectionPage
              driftReport={driftReport}
              onRefreshDrift={loadPlatformData}
              setActivePage={setActivePage}
              showToast={showToast}
            />
          )}

          {activePage === 'architecture' && (
            <ArchitecturePage
              systemStatus={systemStatus}
            />
          )}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md bg-slate-900/90 text-xs font-medium animate-in fade-in slide-in-from-bottom-5">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
          {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-brand-400" />}
          <span className="text-slate-200">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-slate-300 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
