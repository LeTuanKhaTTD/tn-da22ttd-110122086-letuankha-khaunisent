import { Col, Progress, Row, Statistic, Typography } from 'antd';
import Card from '@/components/ui/Card';
import { EmotionLabel } from '@/types/analysis';
import { formatPercent } from '@/utils/formatters';

interface SentimentBreakdownProps {
  distribution: Record<string, number>;
}

const META = [
  { key: EmotionLabel.Positive, label: 'Tích cực', color: '#16a34a', bg: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(255,255,255,0.96))' },
  { key: EmotionLabel.Negative, label: 'Tiêu cực', color: '#dc2626', bg: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(255,255,255,0.96))' },
  { key: EmotionLabel.Neutral, label: 'Trung tính', color: '#64748b', bg: 'linear-gradient(135deg, rgba(148,163,184,0.24), rgba(255,255,255,0.96))' },
];

export default function SentimentBreakdown({ distribution }: SentimentBreakdownProps) {
  const total = Object.values(distribution).reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <Row gutter={[16, 16]}>
      {META.map((item) => {
        const count = Number(distribution[item.key] || 0);
        const ratio = total > 0 ? count / total : 0;

        return (
          <Col xs={24} md={8} key={item.key}>
            <Card bodyStyle={{ background: item.bg }}>
              <Typography.Text style={{ color: item.color, fontWeight: 850 }}>{item.label}</Typography.Text>
              <Statistic value={count} valueStyle={{ color: '#0f172a', fontSize: 34, fontWeight: 900 }} />
              <Progress
                percent={Math.round(ratio * 100)}
                strokeColor={item.color}
                trailColor="rgba(15,23,42,0.10)"
                strokeWidth={12}
              />
              <Typography.Text style={{ color: '#334155', fontWeight: 700 }}>{formatPercent(ratio)} tổng bình luận</Typography.Text>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
