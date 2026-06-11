export enum EmotionLabel {
  Positive = 'positive',
  Negative = 'negative',
  Neutral = 'neutral',
}

export type ModelChoice = 'auto' | 'phobert' | 'gemini';

export interface CommentResult {
  text: string;
  text_clean?: string;
  emotion: string;
  confidence: number;
  scores: Record<string, number>;
  method?: string;
  author?: string;
  likes?: number;
  created_at?: string;
  video_id?: string;
  video_url?: string;
}

export interface AnalysisSummary {
  total: number;
  distribution: Record<string, number>;
}

export interface VideoAnalysisPayload {
  url: string;
  apify_token?: string;
  max_comments: number;
  model: ModelChoice;
}

export interface VideoAnalysisResponse {
  video_title?: string;
  input_url?: string;
  comments: CommentResult[];
  summary: AnalysisSummary;
}

export interface ChannelAnalysisPayload {
  username: string;
  apify_token?: string;
  max_videos: number;
  comments_per_video: number;
  model: ModelChoice;
}

export interface ChannelVideoResult {
  video_id: string;
  url: string;
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
  comments: CommentResult[];
  summary: AnalysisSummary;
}

export interface ChannelAnalysisResponse {
  videos: ChannelVideoResult[];
  channel_info?: {
    username?: string;
    display_name?: string;
    profile_url?: string;
    avatar_url?: string;
    bio?: string;
    followers?: number;
    following?: number;
    likes?: number;
    posts_analyzed?: number;
    total_views?: number;
    total_likes?: number;
    total_shares?: number;
    total_saves?: number;
    total_declared_comments?: number;
  };
  channel_summary: {
    total_videos: number;
    total_comments: number;
    distribution: Record<string, number>;
  };
}
