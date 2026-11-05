
import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://shop-order-manager-upw3.vercel.app/api';

const api = axios.create({
  baseURL: API_URL.replace(/\/+$/, ''),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token && token !== 'undefined' && token !== 'null') {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthEndpoint =
        error.config?.url?.includes('/auth/login') ||
        error.config?.url?.includes('/auth/register');

      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
