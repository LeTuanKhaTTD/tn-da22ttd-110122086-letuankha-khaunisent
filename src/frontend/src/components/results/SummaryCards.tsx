import { Col, Row, Statistic, Typography } from 'antd';
import Card from '@/components/ui/Card';
import SentimentBadge from '@/components/ui/Badge';
import { formatPercent } from '@/utils/formatters';

interface SummaryCardsProps {
  total: number;
  dominantEmotion: string;
  avgConfidence: number;
}

export default function SummaryCards({ total, dominantEmotion, avgConfidence }: SummaryCardsProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Tổng bình luận" value={total} valueStyle={{ fontWeight: 800, color: '#0f172a' }} />
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Typography.Text type="secondary">Cảm xúc chủ đạo</Typography.Text>
          <div style={{ marginTop: 10 }}>
            <SentimentBadge emotion={dominantEmotion} />
          </div>
        </Card>
      </Col>
      <Col xs={24} md={8}>
        <Card>
          <Statistic title="Độ tin cậy TB" value={formatPercent(avgConfidence)} valueStyle={{ fontWeight: 800, color: '#0f172a' }} />
        </Card>
      </Col>
    </Row>
  );
}
