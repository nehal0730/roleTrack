import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }
    original._retry = true;

    try {
      // Deduplicate concurrent refresh calls
      if (!refreshing) {
        refreshing = axios
          .post('http://localhost:5000/api/auth/refresh', {
            refreshToken: localStorage.getItem('refreshToken'),
          })
          .then(({ data }) => {
            localStorage.setItem('accessToken',  data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            // Sync zustand store without causing a full re-render cascade
            const store = (window as any).__authStore;
            if (store) store.setTokens(data.accessToken, data.refreshToken);
            return data.accessToken;
          })
          .finally(() => { refreshing = null; });
      }

      const newAccess = await refreshing;
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }
  }
);

export default api;