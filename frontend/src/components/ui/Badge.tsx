import { Tag } from 'antd';
import type { TagProps } from 'antd';
import { EmotionLabel } from '@/types/analysis';
import { normalizeEmotion } from '@/utils/normalizeComment';

interface BadgeProps extends Omit<TagProps, 'color'> {
  emotion: string;
}

const SENTIMENT_META: Record<EmotionLabel, { label: string; color: string; ring: string }> = {
  [EmotionLabel.Positive]: { label: 'Tích cực', color: '#16a34a', ring: 'rgba(22, 163, 74, 0.26)' },
  [EmotionLabel.Negative]: { label: 'Tiêu cực', color: '#dc2626', ring: 'rgba(220, 38, 38, 0.26)' },
  [EmotionLabel.Neutral]: { label: 'Trung tính', color: '#64748b', ring: 'rgba(100, 116, 139, 0.26)' },
};

export default function Badge({ emotion, children, style, ...rest }: BadgeProps) {
  const normalized = normalizeEmotion(emotion);
  const meta = SENTIMENT_META[normalized] ?? SENTIMENT_META[EmotionLabel.Neutral];

  return (
    <Tag
      {...rest}
      style={{
        marginInlineEnd: 0,
        color: '#ffffff',
        backgroundColor: meta.color,
        border: `1px solid ${meta.ring}`,
        borderRadius: 999,
        boxShadow: `0 8px 18px ${meta.ring}`,
        fontWeight: 800,
        lineHeight: 1.35,
        padding: '3px 10px',
        ...style,
      }}
    >
      {children ?? meta.label}
    </Tag>
  );
}
