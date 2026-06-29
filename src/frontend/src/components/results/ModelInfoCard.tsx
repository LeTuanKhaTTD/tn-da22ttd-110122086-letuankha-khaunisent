import { Col, Row, Statistic, Typography } from 'antd';
import Card from '@/components/ui/Card';
import { formatCount, formatPercent } from '@/utils/formatters';
import type { HealthResponse } from '@/types/health';

interface ModelInfoCardProps {
  health?: HealthResponse;
}

export default function ModelInfoCard({ health }: ModelInfoCardProps) {
  const model = health?.model;

  return (
    <Card title="Model PhoBERT đang sử dụng">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Statistic title="Base model" value={model?.model_name || 'vinai/phobert-base'} />
        </Col>
        <Col xs={12} md={4}>
          <Statistic title="Accuracy test" value={formatPercent(model?.test_accuracy ?? 0)} />
        </Col>
        <Col xs={12} md={4}>
          <Statistic title="Macro F1" value={formatPercent(model?.test_f1_macro ?? 0)} />
        </Col>
        <Col xs={12} md={4}>
          <Statistic title="Train" value={formatCount(model?.train_size ?? 0)} />
        </Col>
        <Col xs={12} md={4}>
          <Statistic title="Device" value={health?.device || 'cpu'} />
        </Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ margin: '14px 0 0' }}>
        Đường dẫn: {model?.model_path || 'Đang tải thông tin model'}
      </Typography.Paragraph>
    </Card>
  );
}
