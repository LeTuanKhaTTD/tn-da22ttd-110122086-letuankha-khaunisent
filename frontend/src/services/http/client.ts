import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const httpClient = axios.create({
  baseURL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.error || error?.response?.data?.detail;
    console.error('[API ERROR]', {
      status,
      detail,
      url: error?.config?.url,
      method: error?.config?.method,
    });
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Phân tích mất quá nhiều thời gian. Với phân tích kênh, hãy thử giảm số video hoặc số bình luận mỗi video, đặc biệt khi dùng Apify free.';
    }

    return error.response?.data?.error || error.response?.data?.detail || error.message || 'Backend request failed';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}
