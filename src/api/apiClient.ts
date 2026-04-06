// API Client - Axios instance with JWT interceptor
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@alpha_bucks_token';
const API_BASE_URL_KEY = '@alpha_bucks_api_base_url';

// Base URL from Expo env var, fallback to localhost
const DEFAULT_API_ORIGIN = normalizeApiOrigin(
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
);

let apiOriginOverride: string | null | undefined;
let apiOriginLoadPromise: Promise<void> | null = null;

function toApiBaseUrl(origin: string): string {
  return `${origin}/api`;
}

function normalizeApiOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('API URL cannot be empty.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('API URL must be a valid absolute URL (http/https).');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('API URL must start with http:// or https://.');
  }

  let normalizedPath = parsed.pathname.replace(/\/+$/, '');
  if (normalizedPath.toLowerCase().endsWith('/api')) {
    normalizedPath = normalizedPath.slice(0, -4);
  }

  if (!normalizedPath || normalizedPath === '/') {
    return `${parsed.protocol}//${parsed.host}`;
  }

  return `${parsed.protocol}//${parsed.host}${normalizedPath}`;
}

async function ensureApiOriginLoaded(): Promise<void> {
  if (apiOriginOverride !== undefined) {
    return;
  }

  if (!apiOriginLoadPromise) {
    apiOriginLoadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(API_BASE_URL_KEY);
        if (raw) {
          apiOriginOverride = normalizeApiOrigin(raw);
        } else {
          apiOriginOverride = null;
        }
      } catch {
        apiOriginOverride = null;
      }
    })();
  }

  await apiOriginLoadPromise;
}

async function getActiveApiOrigin(): Promise<string> {
  await ensureApiOriginLoaded();
  return apiOriginOverride || DEFAULT_API_ORIGIN;
}

const api = axios.create({
  baseURL: toApiBaseUrl(DEFAULT_API_ORIGIN),
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT on every request
api.interceptors.request.use(async (config) => {
  try {
    const apiOrigin = await getActiveApiOrigin();
    config.baseURL = toApiBaseUrl(apiOrigin);

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage read failures
  }
  return config;
});

// Token persistence helpers
export async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export interface ApiBaseUrlConfig {
  currentApiOrigin: string;
  defaultApiOrigin: string;
  overrideApiOrigin: string | null;
}

export async function getApiBaseUrlConfig(): Promise<ApiBaseUrlConfig> {
  await ensureApiOriginLoaded();
  return {
    currentApiOrigin: apiOriginOverride || DEFAULT_API_ORIGIN,
    defaultApiOrigin: DEFAULT_API_ORIGIN,
    overrideApiOrigin: apiOriginOverride || null,
  };
}

export async function setApiBaseUrlOverride(value: string): Promise<void> {
  const normalized = normalizeApiOrigin(value);
  await AsyncStorage.setItem(API_BASE_URL_KEY, normalized);
  apiOriginOverride = normalized;
  api.defaults.baseURL = toApiBaseUrl(normalized);
}

export async function clearApiBaseUrlOverride(): Promise<void> {
  await AsyncStorage.removeItem(API_BASE_URL_KEY);
  apiOriginOverride = null;
  api.defaults.baseURL = toApiBaseUrl(DEFAULT_API_ORIGIN);
}

export default api;
