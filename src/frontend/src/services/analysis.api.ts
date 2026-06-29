import { ENDPOINTS } from './http/endpoints';
import { httpClient } from './http/client';
import { EmotionLabel, type CommentResult } from '@/types/analysis';
import type {
  ChannelAnalysisPayload,
  ChannelAnalysisResponse,
  VideoAnalysisPayload,
  VideoAnalysisResponse,
} from '@/types/analysis';

interface RawSummaryEntry {
  count?: number;
  percent?: number;
}

interface RawSummaryResponse {
  total?: number;
  positive?: RawSummaryEntry;
  neutral?: RawSummaryEntry;
  negative?: RawSummaryEntry;
  avg_confidence?: number;
  top_positive?: RawRawComment[];
  top_negative?: RawRawComment[];
}

interface RawRawComment {
  text?: string;
  sentiment?: string;
  confidence?: number;
  scores?: Record<string, number>;
  probabilities?: Record<string, number>;
  text_clean?: string;
  method?: string;
}

interface RawVideoResponse {
  status?: string;
  input_url?: string;
  video_title?: string;
  comments_analyzed?: number;
  summary?: RawSummaryResponse;
  details?: RawRawComment[];
  model_used?: string;
}

interface RawChannelVideoResponse {
  video_id?: string;
  video_url?: string;
  description?: string;
  author?: string;
  author_username?: string;
  created_at?: string;
  duration?: number;
  views?: number;
  likes?: number;
  shares?: number;
  saves?: number;
  comments_count?: number;
  music_title?: string;
  cover_url?: string;
  summary?: RawSummaryResponse;
  details?: RawRawComment[];
}

interface RawChannelResponse {
  status?: string;
  username?: string;
  channel_info?: ChannelAnalysisResponse['channel_info'];
  analysis_scope?: ChannelAnalysisResponse['analysis_scope'];
  total_videos?: number;
  total_comments?: number;
  overall_summary?: RawSummaryResponse;
  videos?: RawChannelVideoResponse[];
  model_used?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
}

function unwrapApiResponse<T>(payload: T | ApiResponse<T>): T {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

function normalizeRawComment(comment: RawRawComment): CommentResult {
  return {
    text: comment.text ?? comment.text_clean ?? '',
    text_clean: comment.text_clean,
    emotion: comment.sentiment ?? 'neutral',
    confidence: Number(comment.confidence ?? 0),
    scores: comment.scores ?? comment.probabilities ?? {},
    method: comment.method,
  };
}

function summaryToDistribution(summary?: RawSummaryResponse): Record<string, number> {
  return {
    [EmotionLabel.Positive]: Number(summary?.positive?.count ?? 0),
    [EmotionLabel.Negative]: Number(summary?.negative?.count ?? 0),
    [EmotionLabel.Neutral]: Number(summary?.neutral?.count ?? 0),
  };
}

function normalizeVideoResponse(data: RawVideoResponse): VideoAnalysisResponse {
  const comments = (data.details ?? []).map(normalizeRawComment);
  const summary = data.summary ?? {};

  return {
    video_title: data.video_title,
    input_url: data.input_url,
    comments,
    summary: {
      total: Number(summary.total ?? data.comments_analyzed ?? comments.length),
      distribution: summaryToDistribution(summary),
    },
  };
}

function normalizeChannelResponse(data: RawChannelResponse): ChannelAnalysisResponse {
  return {
    videos: (data.videos ?? []).map((video) => ({
      video_id: String(video.video_id ?? ''),
      url: String(video.video_url ?? ''),
      description: video.description,
      author: video.author,
      author_username: video.author_username,
      created_at: video.created_at,
      duration: Number(video.duration ?? 0),
      views: Number(video.views ?? 0),
      likes: Number(video.likes ?? 0),
      shares: Number(video.shares ?? 0),
      saves: Number(video.saves ?? 0),
      comments_count: Number(video.comments_count ?? 0),
      music_title: video.music_title,
      cover_url: video.cover_url,
      comments: (video.details ?? []).map(normalizeRawComment),
      summary: {
        total: Number(video.summary?.total ?? video.comments_count ?? (video.details ?? []).length),
        distribution: summaryToDistribution(video.summary),
      },
    })),
    channel_summary: {
      total_videos: Number(data.total_videos ?? (data.videos ?? []).length),
      total_comments: Number(data.total_comments ?? 0),
      distribution: summaryToDistribution(data.overall_summary),
    },
    channel_info: data.channel_info,
    analysis_scope: data.analysis_scope,
  };
}

export async function analyzeVideo(payload: VideoAnalysisPayload): Promise<VideoAnalysisResponse> {
  const response = await httpClient.post<RawVideoResponse | ApiResponse<RawVideoResponse>>(ENDPOINTS.ANALYZE_VIDEO, payload, {
    timeout: 240000,
  });
  return normalizeVideoResponse(unwrapApiResponse(response.data));
}

export async function analyzeChannel(payload: ChannelAnalysisPayload): Promise<ChannelAnalysisResponse> {
  const timeoutMs = Math.min(1_200_000, Math.max(600_000, Number(payload.max_videos || 1) * 180_000));
  const response = await httpClient.post<RawChannelResponse | ApiResponse<RawChannelResponse>>(ENDPOINTS.ANALYZE_CHANNEL, payload, {
    timeout: timeoutMs,
  });
  return normalizeChannelResponse(unwrapApiResponse(response.data));
}
