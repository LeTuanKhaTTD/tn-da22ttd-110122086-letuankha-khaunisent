import axios from 'axios';
import { API_ENDPOINTS, DEFAULT_CONFIG } from '@/utils/constants';

export const api = axios.create({
  baseURL: DEFAULT_CONFIG.apiBaseUrl,
  timeout: DEFAULT_CONFIG.requestTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.error || error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'Backend request failed';
    error.message = detail;
    return Promise.reject(error);
  },
);

function unwrapApiResponse(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

/**
 * @returns {Promise<any>}
 */
export async function getHealth() {
  const response = await api.get(API_ENDPOINTS.HEALTH);
  return unwrapApiResponse(response.data);
}

/**
 * @returns {Promise<any>}
 */
export async function getDashboardStats() {
  const response = await api.get(API_ENDPOINTS.STATS);
  return unwrapApiResponse(response.data);
}

/**
 * @param {number} [limit]
 * @returns {Promise<any>}
 */
export async function getAnalysisHistory(limit = 30) {
  const response = await api.get(API_ENDPOINTS.HISTORY, { params: { limit } });
  return unwrapApiResponse(response.data);
}

function normalizeVideoPayload(urlOrPayload, maxComments, model = DEFAULT_CONFIG.defaultModel, apifyToken = '') {
  if (urlOrPayload && typeof urlOrPayload === 'object') {
    return urlOrPayload;
  }

  return {
    url: urlOrPayload,
    max_comments: maxComments ?? DEFAULT_CONFIG.maxCommentsPerVideo,
    model,
    apify_token: apifyToken,
  };
}

function normalizeChannelPayload(usernameOrPayload, maxVideos, maxComments, model = DEFAULT_CONFIG.defaultModel, apifyToken = '') {
  if (usernameOrPayload && typeof usernameOrPayload === 'object') {
    return usernameOrPayload;
  }

  return {
    username: usernameOrPayload,
    max_videos: maxVideos ?? DEFAULT_CONFIG.maxVideosPerChannel,
    comments_per_video: maxComments ?? 100,
    model,
    apify_token: apifyToken,
  };
}

/**
 * @param {string|{url: string, apify_token?: string, max_comments?: number, model?: string}} urlOrPayload
 * @param {number} [maxComments]
 * @param {string} [model]
 * @param {string} [apifyToken]
 * @returns {Promise<any>}
 */
export async function analyzeVideo(urlOrPayload, maxComments, model, apifyToken) {
  const payload = normalizeVideoPayload(urlOrPayload, maxComments, model, apifyToken);
  const response = await api.post(API_ENDPOINTS.ANALYZE_VIDEO, payload);
  return unwrapApiResponse(response.data);
}

/**
 * @param {string|{username: string, apify_token?: string, max_videos?: number, comments_per_video?: number, model?: string}} usernameOrPayload
 * @param {number} [maxVideos]
 * @param {number} [maxComments]
 * @param {string} [model]
 * @param {string} [apifyToken]
 * @returns {Promise<any>}
 */
export async function analyzeChannel(usernameOrPayload, maxVideos, maxComments, model, apifyToken) {
  const payload = normalizeChannelPayload(usernameOrPayload, maxVideos, maxComments, model, apifyToken);
  const response = await api.post(API_ENDPOINTS.ANALYZE_CHANNEL, payload);
  return unwrapApiResponse(response.data);
}

/**
 * @param {string|{text: string, model?: string}} textOrPayload
 * @returns {Promise<any>}
 */
export async function analyzeComment(textOrPayload) {
  const payload = typeof textOrPayload === 'object'
    ? textOrPayload
    : { text: textOrPayload, model: DEFAULT_CONFIG.defaultModel };
  const response = await api.post(API_ENDPOINTS.ANALYZE_COMMENT, payload);
  return unwrapApiResponse(response.data);
}

/**
 * @param {{texts: string[], gemini_model?: string}} payload
 * @returns {Promise<any>}
 */
export async function compareGemini(payload) {
  const response = await api.post(API_ENDPOINTS.COMPARE_GEMINI, payload, { timeout: 180000 });
  return unwrapApiResponse(response.data);
}

/**
 * @returns {Promise<any>}
 */
export async function getLabelQueue() {
  const response = await api.get(API_ENDPOINTS.LABEL_QUEUE);
  return unwrapApiResponse(response.data);
}

/**
 * @param {{metadata?: Record<string, any>, comments: Array<Record<string, any>>}} payload
 * @returns {Promise<any>}
 */
export async function saveLabelQueue(payload) {
  const response = await api.post(API_ENDPOINTS.LABEL_QUEUE, payload);
  return unwrapApiResponse(response.data);
}

/**
 * @returns {Promise<any>}
 */
export async function resetLabelQueue() {
  const response = await api.post(API_ENDPOINTS.LABEL_QUEUE_RESET);
  return unwrapApiResponse(response.data);
}

/**
 * @param {{metadata?: Record<string, any>, comments: Array<Record<string, any>>, model_preference?: string}} payload
 * @returns {Promise<any>}
 */
export async function prelabelQueue(payload) {
  const response = await api.post(API_ENDPOINTS.LABEL_QUEUE_PRELABEL, payload);
  return unwrapApiResponse(response.data);
}

/**
 * @param {{metadata?: Record<string, any>, comments: Array<Record<string, any>>}} payload
 * @returns {Promise<any>}
 */
export async function exportTrainQueue(payload) {
  const response = await api.post(API_ENDPOINTS.LABEL_QUEUE_EXPORT_TRAIN, payload);
  return unwrapApiResponse(response.data);
}

/**
 * @param {{metadata?: Record<string, any>, comments: Array<Record<string, any>>}} payload
 * @returns {Promise<any>}
 */
export async function mergeQueueToMaster(payload) {
  const response = await api.post(API_ENDPOINTS.LABEL_QUEUE_MERGE_MASTER, payload);
  return unwrapApiResponse(response.data);
}
