import type {
  ChannelAnalysisPayload,
  ChannelAnalysisResponse,
  VideoAnalysisPayload,
  VideoAnalysisResponse,
} from '@/types/analysis';

export const HISTORY_STORAGE_KEY = 'analysis_history';

type BaseHistoryEntry = {
  id: string;
  title: string;
  target_label: string;
  created_at: string;
  model_used: string;
};

export type AnalysisHistoryEntry =
  | (BaseHistoryEntry & {
      type: 'video';
      input: VideoAnalysisPayload;
      result: VideoAnalysisResponse;
      summary: {
        total: number;
        positive: number;
        neutral: number;
        negative: number;
      };
    })
  | (BaseHistoryEntry & {
      type: 'channel';
      input: ChannelAnalysisPayload;
      result: ChannelAnalysisResponse;
      summary: {
        total: number;
        positive: number;
        neutral: number;
        negative: number;
        total_videos: number;
      };
    });

function readDistribution(distribution?: Record<string, number>) {
  return {
    positive: Number(distribution?.positive ?? 0),
    neutral: Number(distribution?.neutral ?? 0),
    negative: Number(distribution?.negative ?? 0),
  };
}

function createId(type: string) {
  return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractVideoId(url: string) {
  const value = String(url || '').trim();
  if (!value) {
    return '';
  }
  if (value.includes('/video/')) {
    return value.split('/video/')[1]?.split(/[/?#]/)[0] || '';
  }
  return value.split(/[/?#]/).filter(Boolean).pop() || '';
}

function scrubVideoInput(input: VideoAnalysisPayload): VideoAnalysisPayload {
  const { apify_token: _token, ...safeInput } = input;
  return safeInput;
}

function scrubChannelInput(input: ChannelAnalysisPayload): ChannelAnalysisPayload {
  const { apify_token: _token, ...safeInput } = input;
  return safeInput;
}

function normalizeLegacyEntry(entry: AnalysisHistoryEntry) {
  if (entry?.type === 'video' && entry.input) {
    const safeInput = scrubVideoInput(entry.input);
    const videoTitle = entry.result?.video_title?.trim();
    const videoId = extractVideoId(safeInput.url);
    return {
      ...entry,
      input: safeInput,
      title: entry.title || videoTitle || 'Phân tích video TikTok',
      target_label: entry.target_label || videoTitle || (videoId ? `Video ID: ${videoId}` : safeInput.url),
    };
  }

  if (entry?.type === 'channel' && entry.input) {
    const safeInput = scrubChannelInput(entry.input);
    const username = safeInput.username?.replace(/^@/, '') || '';
    return {
      ...entry,
      input: safeInput,
      title: entry.title || `Phân tích kênh @${username}`,
      target_label: entry.target_label || `@${username}`,
    };
  }

  return entry;
}

export function loadAnalysisHistory(): AnalysisHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => normalizeLegacyEntry(entry));
  } catch {
    return [];
  }
}

export function findAnalysisHistory(id: string) {
  return loadAnalysisHistory().find((entry) => entry.id === id) ?? null;
}

export function saveAnalysisHistory(entry: AnalysisHistoryEntry) {
  const current = loadAnalysisHistory();
  const deduped = current.filter((item) => item.id !== entry.id);
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([entry, ...deduped].slice(0, 50)));
}

export function buildVideoHistoryEntry(input: VideoAnalysisPayload, result: VideoAnalysisResponse): AnalysisHistoryEntry {
  const counts = readDistribution(result.summary.distribution);
  const safeInput = scrubVideoInput(input);
  const videoTitle = result.video_title?.trim();
  const videoId = extractVideoId(safeInput.url);

  return {
    id: createId('video'),
    type: 'video',
    title: videoTitle || 'Phân tích video TikTok',
    target_label: videoTitle || (videoId ? `Video ID: ${videoId}` : safeInput.url),
    created_at: new Date().toISOString(),
    model_used: input.model || 'phobert',
    input: safeInput,
    result,
    summary: {
      total: Number(result.summary.total ?? result.comments.length),
      ...counts,
    },
  };
}

export function buildChannelHistoryEntry(input: ChannelAnalysisPayload, result: ChannelAnalysisResponse): AnalysisHistoryEntry {
  const counts = readDistribution(result.channel_summary.distribution);
  const safeInput = scrubChannelInput(input);
  const username = safeInput.username.replace(/^@/, '');

  return {
    id: createId('channel'),
    type: 'channel',
    title: `Phân tích kênh @${username}`,
    target_label: `@${username}`,
    created_at: new Date().toISOString(),
    model_used: input.model || 'phobert',
    input: safeInput,
    result,
    summary: {
      total: Number(result.channel_summary.total_comments ?? 0),
      total_videos: Number(result.channel_summary.total_videos ?? result.videos.length),
      ...counts,
    },
  };
}
