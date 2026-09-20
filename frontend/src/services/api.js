/**
 * MPLADS Samiksha API Client (Frozen Contract + RBAC Extensions).
 * Provides centralized HTTP communication, RBAC header injection, and structured error mapping.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to automatically inject authenticated role and identity context
apiClient.interceptors.request.use((config) => {
  try {
    const savedRole = localStorage.getItem('mplads_view_role') || 'citizen';
    const savedConstituency = localStorage.getItem('mplads_mp_constituency') || 'Varanasi';

    config.headers['X-User-Role'] = savedRole;
    if (savedRole === 'mp') {
      config.headers['X-User-Id'] = 'mp_varanasi';
      config.headers['X-User-Constituency'] = savedConstituency;
    } else if (savedRole === 'authority') {
      config.headers['X-User-Id'] = 'authority_nodal';
    } else if (savedRole === 'system_admin') {
      config.headers['X-User-Id'] = 'sysadmin_platform';
    } else {
      config.headers['X-User-Id'] = 'citizen_public';
    }
  } catch (e) {
    // Fallback silently if localStorage unavailable
  }
  return config;
});

// Response interceptor for structured error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = {
      message: error.response?.data?.detail || error.message || 'An unexpected error occurred',
      code: error.response?.data?.code || (error.response?.status === 403 ? 'FORBIDDEN' : 'NETWORK_ERROR'),
      status: error.response?.status || 500,
      data: error.response?.data,
    };
    return Promise.reject(errorResponse);
  }
);

export const AnalyticsAPI = {
  getOverviewStats: () => apiClient.get('/stats/overview'),
  getByCategory: () => apiClient.get('/analytics/by-category'),
  getByDistrict: () => apiClient.get('/analytics/by-district'),
  getDistrictAnalytics: (id) => apiClient.get(`/analytics/district/${id}`),
  getLocations: () => apiClient.get('/locations'),
  getTrends: () => apiClient.get('/analytics/trends'),
  getCohorts: () => apiClient.get('/analytics/cohorts'),
  getTrendIntelligence: () => apiClient.get('/analytics/trend-intelligence'),
  getReviewEffort: () => apiClient.get('/analytics/review-effort'),
  getDuplicateCandidates: () => apiClient.get('/analytics/duplicate-candidates'),
  getIsolationForest: () => apiClient.get('/analytics/isolation-forest'),
  getIsolationForestResults: () => apiClient.get('/analytics/isolation-forest'),
  getConstituencyAnalytics: (name) => apiClient.get(`/analytics/constituency/${encodeURIComponent(name)}`),
  getInvestmentDurability: (sourceRecordId) => apiClient.get(`/analytics/investment-durability/${encodeURIComponent(sourceRecordId)}`),
  getNaturalEventContext: (sourceRecordId) => apiClient.get(`/analytics/natural-event/${encodeURIComponent(sourceRecordId)}`),
};

export const ProjectsAPI = {
  getProjects: (params) => apiClient.get('/projects', { params }),
  getProjectById: (id) => apiClient.get(`/projects/${id}`),
  correctProject: (id, payload) => apiClient.post(`/projects/${encodeURIComponent(id)}/correct`, payload),
  getProjectVersions: (id) => apiClient.get(`/projects/${encodeURIComponent(id)}/versions`),
  getInvestmentDurability: (sourceRecordId) => apiClient.get(`/analytics/investment-durability/${encodeURIComponent(sourceRecordId)}`),
  getNaturalEventContext: (sourceRecordId) => apiClient.get(`/analytics/natural-event/${encodeURIComponent(sourceRecordId)}`),
  getAnomalies: (params) => apiClient.get('/anomalies', { params }),
  getLocations: () => apiClient.get('/locations'),
  getConstituencies: () => apiClient.get('/projects/constituencies'),
};

export const MethodologyAPI = {
  getMethodology: () => apiClient.get('/methodology'),
};

export const SystemAPI = {
  getHealth: () => apiClient.get('/health'),
  getRoot: () => apiClient.get('/'),
  getMethodology: () => apiClient.get('/methodology'),
};

export const ComplaintsAPI = {
  getCategories: () => apiClient.get('/complaints/categories'),
  getStatuses: () => apiClient.get('/complaints/statuses'),
  submitComplaint: (payload) => {
    if (payload instanceof FormData) {
      return apiClient.post('/complaints', payload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return apiClient.post('/complaints', payload);
  },
  getComplaintById: (id) => apiClient.get(`/complaints/${encodeURIComponent(id)}`),
  getComplaints: (params) => apiClient.get('/complaints', { params }),
  acknowledgeComplaint: (id, payload) => apiClient.post(`/complaints/${encodeURIComponent(id)}/acknowledge`, payload),
  addMPRemark: (id, payload) => apiClient.post(`/complaints/${encodeURIComponent(id)}/remark`, payload),
  requestVerification: (id) => apiClient.post(`/complaints/${encodeURIComponent(id)}/request-verification`),
  updateStatus: (id, payload) => apiClient.post(`/complaints/${encodeURIComponent(id)}/status`, payload),
  addOfficerNote: (id, payload) => apiClient.post(`/complaints/${encodeURIComponent(id)}/note`, payload),
  getEvidenceFileUrl: (id) => `${API_BASE_URL}/complaints/${encodeURIComponent(id)}/evidence/file`,
  getImageAnalysis: (complaintId, evidenceId) => evidenceId ? apiClient.get(`/complaints/${encodeURIComponent(complaintId)}/evidence/${evidenceId}/image-analysis`) : apiClient.get(`/complaints/${encodeURIComponent(complaintId)}/evidence/image-analysis`),
  getAllocationSummary: (sourceRecordId) => apiClient.get(`/complaints/allocation/${encodeURIComponent(sourceRecordId)}/summary`),
};

export const AdminAPI = {
  getDashboardStats: () => apiClient.get('/admin/dashboard-stats'),
  validateDataset: (formData) => apiClient.post('/admin/datasets/validate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  importDataset: (formData) => apiClient.post('/admin/datasets/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getDatasetHistory: (params) => apiClient.get('/admin/datasets/history', { params }),
  getDataSources: () => apiClient.get('/admin/datasets/sources'),
  createDataSource: (payload) => apiClient.post('/admin/datasets/sources', payload),
  getSystemLogs: (params) => apiClient.get('/admin/system-logs', { params }),
  getAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params }),
  getSystemHealth: () => apiClient.get('/admin/system-health'),
  getConfig: () => apiClient.get('/admin/config'),
  updateConfig: (payload) => apiClient.put('/admin/config', payload),
};

export const SelfTestAPI = {
  getFixtures: () => apiClient.get('/self-test/fixtures'),
};

export default apiClient;
