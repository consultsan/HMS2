import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  withCredentials: true,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to include the auth token
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

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle unauthorized access
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error);
    }

    // Handle network errors
    if (error.message === 'Network Error') {
      console.error('Network error - please check your connection');
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }

    return Promise.reject(error);
  }
);

export { api }; 