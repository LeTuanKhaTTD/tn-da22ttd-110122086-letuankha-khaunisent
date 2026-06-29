import { Empty, Space, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import { EmotionLabel } from '@/types/analysis';
import { normalizeEmotion } from '@/utils/normalizeComment';
import { formatCount, formatPercent } from '@/utils/formatters';

interface SentimentBarsProps {
  videos: Array<{
    video_id: string;
    url?: string;
    summary: {
      distribution: Record<string, number>;
    };
  }>;
}

const SENTIMENT_META: Record<EmotionLabel, { label: string; color: string }> = {
  [EmotionLabel.Positive]: { label: 'Tích cực', color: '#16a34a' },
  [EmotionLabel.Negative]: { label: 'Tiêu cực', color: '#dc2626' },
  [EmotionLabel.Neutral]: { label: 'Trung tính', color: '#64748b' },
};

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const total = payload.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <Space direction="vertical" size={0} style={{ background: 'rgba(15, 23, 42, 0.94)', padding: 12, borderRadius: 8 }}>
      <Typography.Text style={{ color: '#fff', fontWeight: 800 }}>{String(label)}</Typography.Text>
      {payload.map((item) => {
        const value = Number(item.value || 0);
        const percent = total > 0 ? value / total : 0;
        return (
          <Typography.Text key={String(item.dataKey)} style={{ color: '#e2e8f0', fontWeight: 600 }}>
            {String(item.name)}: {formatCount(value)} ({formatPercent(percent)})
          </Typography.Text>
        );
      })}
    </Space>
  );
}

export default function SentimentBars({ videos }: SentimentBarsProps) {
  const data = videos.map((video, index) => {
    const distribution = video.summary.distribution || {};
    const normalized = Object.entries(distribution).reduce<Record<string, number>>(
      (acc, [emotion, count]) => {
        const sentiment = normalizeEmotion(emotion);
        acc[sentiment] = (acc[sentiment] ?? 0) + Number(count || 0);
        return acc;
      },
      {
        [EmotionLabel.Positive]: 0,
        [EmotionLabel.Negative]: 0,
        [EmotionLabel.Neutral]: 0,
      },
    );

    return {
      label: `Video ${index + 1}`,
      videoId: video.video_id,
      ...normalized,
    };
  });

  if (!data.length) {
    return <Empty description="Chưa có dữ liệu so sánh giữa các video" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ width: '100%', minHeight: Math.max(320, videos.length * 56) }}>
      <ResponsiveContainer width="100%" height={Math.max(320, videos.length * 56)}>
        <BarChart data={data} layout="vertical" margin={{ left: 12, right: 24, top: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
          <XAxis type="number" tick={{ fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis dataKey="label" type="category" width={220} interval={0} tick={{ fill: '#334155', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
          <Legend wrapperStyle={{ fontWeight: 700, color: '#334155' }} />
          <Bar dataKey={EmotionLabel.Positive} name={SENTIMENT_META[EmotionLabel.Positive].label} stackId="distribution" fill={SENTIMENT_META[EmotionLabel.Positive].color} radius={[8, 0, 0, 8]} />
          <Bar dataKey={EmotionLabel.Negative} name={SENTIMENT_META[EmotionLabel.Negative].label} stackId="distribution" fill={SENTIMENT_META[EmotionLabel.Negative].color} />
          <Bar dataKey={EmotionLabel.Neutral} name={SENTIMENT_META[EmotionLabel.Neutral].label} stackId="distribution" fill={SENTIMENT_META[EmotionLabel.Neutral].color} radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
