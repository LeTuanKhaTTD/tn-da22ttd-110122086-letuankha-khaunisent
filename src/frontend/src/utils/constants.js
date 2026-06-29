export const SENTIMENT_LABELS = ['positive', 'negative', 'neutral'];

export const SENTIMENT_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

export const CHART_COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#94a3b8',
};

export const API_ENDPOINTS = {
  HEALTH: '/health',
  STATS: '/stats',
  HISTORY: '/history',
  ANALYZE_COMMENT: '/analyze/comment',
  ANALYZE_VIDEO: '/analyze/video',
  ANALYZE_CHANNEL: '/analyze/channel',
  COMPARE_GEMINI: '/compare/gemini',
  LABEL_QUEUE: '/labeling/queue',
  LABEL_QUEUE_RESET: '/labeling/queue/reset',
  LABEL_QUEUE_PRELABEL: '/labeling/queue/prelabel',
  LABEL_QUEUE_EXPORT_TRAIN: '/labeling/queue/export-train',
  LABEL_QUEUE_MERGE_MASTER: '/labeling/queue/merge-master',
};

export const DEFAULT_CONFIG = {
  apiBaseUrl: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  requestTimeoutMs: 120000,
  defaultModel: 'phobert',
  maxCommentsPerVideo: 500,
  maxVideosPerChannel: 50,
  channelMetadataVideoLimit: 1000,
  minCommentLength: 3,
  maxSequenceLength: 256,
  inferenceBatchSize: 32,
  cacheExpiryDays: 7,
};
