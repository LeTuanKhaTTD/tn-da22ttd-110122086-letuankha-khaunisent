import { EmotionLabel, type ChannelVideoResult } from '@/types/analysis';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface VideoRiskProfile {
  video: ChannelVideoResult;
  title: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  negativePercent: number;
  positivePercent: number;
  riskLevel: RiskLevel;
  riskLabel: string;
  riskColor: string;
}

function readCount(video: ChannelVideoResult, label: EmotionLabel) {
  return Number(video.summary?.distribution?.[label] ?? 0);
}

export function getRiskLevel(negativePercent: number): RiskLevel {
  if (negativePercent >= 30) return 'high';
  if (negativePercent >= 15) return 'medium';
  return 'low';
}

export function getRiskMeta(level: RiskLevel) {
  if (level === 'high') {
    return { label: 'Cao', color: 'red' };
  }
  if (level === 'medium') {
    return { label: 'Trung bình', color: 'orange' };
  }
  return { label: 'Thấp', color: 'green' };
}

export function buildVideoRiskProfiles(videos: ChannelVideoResult[]): VideoRiskProfile[] {
  return videos.map((video, index) => {
    const positive = readCount(video, EmotionLabel.Positive);
    const negative = readCount(video, EmotionLabel.Negative);
    const neutral = readCount(video, EmotionLabel.Neutral);
    const total = Number(video.summary?.total || positive + negative + neutral || video.comments.length || 0);
    const negativePercent = total ? (negative / total) * 100 : 0;
    const positivePercent = total ? (positive / total) * 100 : 0;
    const riskLevel = getRiskLevel(negativePercent);
    const riskMeta = getRiskMeta(riskLevel);

    return {
      video,
      title: video.description || video.video_id || `Video ${index + 1}`,
      total,
      positive,
      neutral,
      negative,
      negativePercent,
      positivePercent,
      riskLevel,
      riskLabel: riskMeta.label,
      riskColor: riskMeta.color,
    };
  });
}
