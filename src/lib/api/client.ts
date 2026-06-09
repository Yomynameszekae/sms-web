import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true, // sends the HTTP-only refresh cookie cross-origin
  headers: { 'Content-Type': 'application/json' },
});

// Module-level token store — avoids circular imports with the Zustand store.
// The auth store calls setClientToken on login/refresh and clearClientToken on logout.
let _accessToken: string | null = null;

export function setClientToken(token: string) {
  _accessToken = token;
}

export function clearClientToken() {
  _accessToken = null;
}

// Attach access token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// On 401: attempt one silent refresh then retry the original request.
// If the refresh itself fails, clear the token and redirect to /login.
let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

function drainQueue(token: string) {
  _refreshQueue.forEach((resolve) => resolve(token));
  _refreshQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't retry auth endpoints — refresh avoids infinite loops,
    // login 401 means bad credentials (not an expired token).
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (_isRefreshing) {
      // Queue this request until the in-flight refresh resolves
      return new Promise<string>((resolve) => {
        _refreshQueue.push(resolve);
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    _isRefreshing = true;

    try {
      const { data } = await apiClient.post<{ data: { accessToken: string } }>(
        '/auth/refresh',
      );
      const newToken = data.data.accessToken;
      setClientToken(newToken);
      drainQueue(newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      clearClientToken();
      _refreshQueue = [];
      if (typeof window !== 'undefined') window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      _isRefreshing = false;
    }
  },
);
