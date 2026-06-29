import { EmotionLabel, type CommentResult } from '@/types/analysis';
import { normalizeEmotion } from './normalizeComment';

export interface DerivedSummary {
  total: number;
  distribution: Record<string, number>;
  dominantEmotion: EmotionLabel;
  avgConfidence: number;
}

export function summarizeComments(comments: CommentResult[]): DerivedSummary {
  const distribution: Record<string, number> = {
    [EmotionLabel.Positive]: 0,
    [EmotionLabel.Negative]: 0,
    [EmotionLabel.Neutral]: 0,
  };

  let confidenceTotal = 0;

  for (const item of comments) {
    const emotion = normalizeEmotion(item.emotion);
    distribution[emotion] = (distribution[emotion] ?? 0) + 1;
    confidenceTotal += Number.isFinite(item.confidence) ? Math.min(1, Math.max(0, item.confidence)) : 0;
  }

  const dominantEmotion = (Object.entries(distribution).sort((left, right) => right[1] - left[1])[0]?.[0] ?? EmotionLabel.Neutral) as EmotionLabel;
  const total = comments.length;

  return {
    total,
    distribution,
    dominantEmotion,
    avgConfidence: total > 0 ? confidenceTotal / total : 0,
  };
}
