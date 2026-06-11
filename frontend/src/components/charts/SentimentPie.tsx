import { Empty, Space, Typography } from 'antd';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TooltipProps } from 'recharts';
import { EmotionLabel } from '@/types/analysis';
import { normalizeEmotion } from '@/utils/normalizeComment';
import { formatCount, formatPercent } from '@/utils/formatters';

interface SentimentPieProps {
  distribution: Record<string, number>;
}

const SENTIMENT_META: Record<EmotionLabel, { label: string; color: string }> = {
  [EmotionLabel.Positive]: { label: 'Tích cực', color: '#16a34a' },
  [EmotionLabel.Negative]: { label: 'Tiêu cực', color: '#dc2626' },
  [EmotionLabel.Neutral]: { label: 'Trung tính', color: '#64748b' },
};

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const count = Number(item.value || 0);
  const total = Number(item.payload?.total || 0);
  const percent = total > 0 ? count / total : 0;

  return (
    <Space direction="vertical" size={0} style={{ background: 'rgba(15, 23, 42, 0.94)', padding: 12, borderRadius: 8 }}>
      <Typography.Text style={{ color: '#fff', fontWeight: 800 }}>{String(item.name)}</Typography.Text>
      <Typography.Text style={{ color: '#e2e8f0' }}>
        {formatCount(count)} ({formatPercent(percent)})
      </Typography.Text>
    </Space>
  );
}

export default function SentimentPie({ distribution }: SentimentPieProps) {
  const entries = Object.entries(distribution)
    .map(([emotion, value]) => ({
      emotion: normalizeEmotion(emotion),
      value: Number(value || 0),
    }))
    .filter((item) => item.value > 0);

  const total = entries.reduce((sum, item) => sum + item.value, 0);

  if (!entries.length) {
    return <Empty description="Chưa có phân bổ cảm xúc" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div style={{ width: '100%', minHeight: 320 }}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={entries.map((entry) => ({
              name: SENTIMENT_META[entry.emotion].label,
              value: entry.value,
              total,
            }))}
            dataKey="value"
            nameKey="name"
            innerRadius={72}
            outerRadius={122}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={4}
          >
            {entries.map((entry) => (
              <Cell key={entry.emotion} fill={SENTIMENT_META[entry.emotion].color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="bottom" formatter={(value) => <span style={{ color: '#0f172a', fontWeight: 700 }}>{String(value)}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
