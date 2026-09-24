import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const MLOpsAPI = {
  // Datasets
  getDatasets: async () => {
    const res = await api.get('/datasets');
    return res.data;
  },

  getDataset: async (id) => {
    const res = await api.get(`/datasets/${id}`);
    return res.data;
  },

  uploadDataset: async (formData) => {
    const res = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  processDataset: async (id, options = {}) => {
    const res = await api.post(`/datasets/${id}/process`, options);
    return res.data;
  },

  loadSampleDataset: async (sampleName = 'churn') => {
    const res = await api.post(`/datasets/load-sample/${sampleName}`);
    return res.data;
  },

  // AutoML Training
  startTraining: async (config) => {
    const res = await api.post('/training/start', config, { timeout: 300000 });
    return res.data;
  },

  getTrainingJobs: async () => {
    const res = await api.get('/training');
    return res.data;
  },

  getTrainingJob: async (id) => {
    const res = await api.get(`/training/${id}`);
    return res.data;
  },

  triggerRetraining: async (metric = 'f1') => {
    const res = await api.post('/training/retrain', null, { params: { metric }, timeout: 300000 });
    return res.data;
  },

  // Model Registry
  getModels: async () => {
    const res = await api.get('/models');
    return res.data;
  },

  getActiveModel: async () => {
    const res = await api.get('/models/active');
    return res.data;
  },

  promoteModel: async (id) => {
    const res = await api.post(`/models/${id}/promote`);
    return res.data;
  },

  rollbackModel: async (id) => {
    const res = await api.post(`/models/${id}/rollback`);
    return res.data;
  },

  // Prediction Inference
  predict: async (features) => {
    // Can call both /api/predict or /predict
    const res = await api.post('/predict', { features });
    return res.data;
  },

  getModelSchema: async () => {
    const res = await api.get('/model');
    return res.data;
  },

  // Monitoring & Drift
  getMonitoringStats: async () => {
    const res = await api.get('/monitoring');
    return res.data;
  },

  getDriftReport: async () => {
    const res = await api.get('/monitoring/drift');
    return res.data;
  },

  simulateDrift: async (params = {}) => {
    const res = await api.post('/monitoring/simulate-drift', params);
    return res.data;
  },

  getSystemStatus: async () => {
    const res = await api.get('/monitoring/system-status');
    return res.data;
  },
};

export default MLOpsAPI;
