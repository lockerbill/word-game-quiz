import axios from 'axios';
import { getAdminToken } from '../auth/tokenStorage';
import { notifyAuthFailure } from '../auth/sessionEvents';

const defaultApiBaseUrl = 'http://localhost:3000/api';

export const apiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  defaultApiBaseUrl;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status as number | undefined;
    const requestUrl = String(error.config?.url ?? '');

    const isLoginEndpoint = requestUrl.includes('/auth/login');
    if (!isLoginEndpoint && status === 401) {
      notifyAuthFailure('expired');
    }

    if (!isLoginEndpoint && status === 403) {
      notifyAuthFailure('forbidden');
    }

    return Promise.reject(error);
  },
);
