import axios from "axios";

const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent multiple refresh calls
let isRefreshing = false;
let failedQueue: { resolve: Function; reject: Function }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};

// Add a request interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
axiosClient.interceptors.response.use(
  (response) => {
    // Return the actual data
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If we're already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Mark that we're attempting to refresh the token
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        // If no refresh token exists, logout
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        // Try to get a new token
        const response = await axios.post(
          `${
            process.env.REACT_APP_API_URL || "http://localhost:5000/api"
          }/auth/refresh`,
          { refreshToken }
        );

        const { token } = response.data;

        // Store the new token
        localStorage.setItem("token", token);

        // Update the Authorization header
        originalRequest.headers.Authorization = `Bearer ${token}`;

        // Process the queue with the new token
        processQueue(null, token);
        isRefreshing = false;

        // Retry the original request
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, process the queue with the error
        processQueue(refreshError, null);
        isRefreshing = false;

        // Clear the tokens and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
