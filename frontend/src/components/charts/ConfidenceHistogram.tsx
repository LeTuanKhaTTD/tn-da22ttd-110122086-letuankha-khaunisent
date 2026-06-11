import { Empty, Space, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { CommentResult } from '@/types/analysis';

interface ConfidenceHistogramProps {
  comments: CommentResult[];
}

const BUCKETS = [
  { label: '0-20%', min: 0, max: 0.2 },
  { label: '20-40%', min: 0.2, max: 0.4 },
  { label: '40-60%', min: 0.4, max: 0.6 },
  { label: '60-80%', min: 0.6, max: 0.8 },
  { label: '80-100%', min: 0.8, max: 1.01 },
];

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <Space direction="vertical" size={0} style={{ background: 'rgba(15, 23, 42, 0.94)', padding: 12, borderRadius: 8 }}>
      <Typography.Text style={{ color: '#fff', fontWeight: 800 }}>Độ tin cậy {String(label)}</Typography.Text>
      <Typography.Text style={{ color: '#e2e8f0' }}>{Number(payload[0]?.value || 0)} bình luận</Typography.Text>
    </Space>
  );
}

export default function ConfidenceHistogram({ comments }: ConfidenceHistogramProps) {
  if (!comments.length) {
    return <Empty description="Chưa có dữ liệu độ tin cậy" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const data = BUCKETS.map((bucket) => ({
    range: bucket.label,
    count: comments.filter((item) => {
      const confidence = Number(item.confidence || 0);
      return confidence >= bucket.min && confidence < bucket.max;
    }).length,
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 20, top: 12, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe3ef" />
          <XAxis dataKey="range" tick={{ fill: '#475569', fontWeight: 700 }} axisLine={{ stroke: '#cbd5e1' }} />
          <YAxis allowDecimals={false} tick={{ fill: '#475569', fontWeight: 700 }} axisLine={{ stroke: '#cbd5e1' }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(14, 116, 144, 0.08)' }} />
          <Bar dataKey="count" name="Số bình luận" fill="#0f766e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
