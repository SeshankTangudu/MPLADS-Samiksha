/**
 * MPLADS Samiksha API Client (T14 Foundation).
 * Provides centralized HTTP communication with fallback resilience.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Response interceptor for structured error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorResponse = {
      message: error.response?.data?.detail || error.message || 'An unexpected error occurred',
      code: error.response?.data?.code || 'NETWORK_ERROR',
      status: error.response?.status || 500,
    };
    return Promise.reject(errorResponse);
  }
);

export const SystemAPI = {
  getHealth: () => apiClient.get('/health'),
  getRoot: () => apiClient.get('/'),
};

export default apiClient;
