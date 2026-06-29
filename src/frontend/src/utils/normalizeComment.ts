import { EmotionLabel, type CommentResult } from '@/types/analysis';

const SENTIMENT_ALIASES: Record<string, EmotionLabel> = {
  positive: EmotionLabel.Positive,
  happy: EmotionLabel.Positive,
  vui: EmotionLabel.Positive,
  'tich cuc': EmotionLabel.Positive,
  'tích cực': EmotionLabel.Positive,

  negative: EmotionLabel.Negative,
  sad: EmotionLabel.Negative,
  buon: EmotionLabel.Negative,
  'buồn': EmotionLabel.Negative,
  'tieu cuc': EmotionLabel.Negative,
  'tiêu cực': EmotionLabel.Negative,

  neutral: EmotionLabel.Neutral,
  'trung tinh': EmotionLabel.Neutral,
  'trung tính': EmotionLabel.Neutral,
  'trung lap': EmotionLabel.Neutral,
  'trung lập': EmotionLabel.Neutral,
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function normalizeEmotion(value: string | undefined | null): EmotionLabel {
  const key = normalizeKey(String(value ?? 'neutral'));
  return SENTIMENT_ALIASES[key] ?? EmotionLabel.Neutral;
}

export function normalizeComment(comment: CommentResult): CommentResult {
  return {
    ...comment,
    emotion: normalizeEmotion(comment.emotion),
    confidence: Number.isFinite(comment.confidence) ? Math.min(1, Math.max(0, comment.confidence)) : 0,
    scores: comment.scores || {},
  };
}
