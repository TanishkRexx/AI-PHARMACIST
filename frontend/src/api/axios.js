import axios from 'axios';
import toast from 'react-hot-toast';

// const API_BASE_URL = import.meta.env.VITE_API_URL||'http://localhost:8000' ;
const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 🔥 Retry once if request fails (important for Render cold start)
    if (!originalRequest._retry) {
      originalRequest._retry = true;

      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 sec
      return api(originalRequest);
    }

    // 🔹 Handle errors after retry
    if (error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } else if (error.response?.status === 403) {
      toast.error('Access denied');
    } else if (error.response?.status === 404) {
      toast.error('Not found');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject(error);
  }
);

export default api;