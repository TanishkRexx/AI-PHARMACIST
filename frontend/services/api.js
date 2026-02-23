import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// REQUEST INTERCEPTOR
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(` API Request: ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  },
);

// RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("Response Error:", error.response?.data || error.message);

if (error.response?.status === 401) {

  const isLoginRequest =
    error.config?.url?.includes("/auth/login");

  if (!isLoginRequest) {
    console.log("Token expired or invalid, logging out...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  }
}
    // Handle 403 Forbidden - Access denied
    if (error.response?.status === 403) {
      console.log("Access denied");
    }

    // Handle 500 Server Error
    if (error.response?.status >= 500) {
      console.error("Server error");
    }

    return Promise.reject(error);
  },
);

export default api;

export const getErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'Something went wrong';
};
