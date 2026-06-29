import { Button, Card, Space, Tag, Typography } from 'antd';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AnalysisResultView from '@/components/results/AnalysisResultView';
import EmptyState from '@/components/ui/EmptyState';
import { findAnalysisHistory } from '@/utils/historyStorage';

function formatDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export default function HistoryDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const entry = findAnalysisHistory(id);

  if (!entry?.result) {
    return (
      <EmptyState
        title="Không tìm thấy chi tiết lịch sử"
        subtitle="Bản ghi cũ có thể chỉ chứa tóm tắt. Hãy phân tích lại và bấm lưu kết quả để xem đầy đủ."
      />
    );
  }

  const handleReanalyze = () => {
    navigate(entry.type === 'video' ? '/video' : '/channel', {
      state: { reanalyzePayload: entry.input },
    });
  };

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="section-card">
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
            <Button onClick={() => navigate('/history')} icon={<ArrowLeft size={16} />}>
              Quay lại lịch sử
            </Button>
            <Button type="primary" icon={<RotateCcw size={16} />} onClick={handleReanalyze}>
              Phân tích lại
            </Button>
          </Space>
          <Space size={8} wrap>
            <Tag color={entry.type === 'channel' ? 'green' : 'blue'}>{entry.type === 'channel' ? 'Kênh' : 'Video'}</Tag>
            <Tag>Model: {entry.model_used}</Tag>
            <Tag>{formatDate(entry.created_at)}</Tag>
          </Space>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {entry.title}
            </Typography.Title>
            <Typography.Text strong style={{ display: 'block', marginTop: 8 }}>
              {entry.target_label}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4, wordBreak: 'break-all' }}>
              {entry.type === 'video' ? entry.input.url : `@${entry.input.username.replace(/^@/, '')}`}
            </Typography.Text>
          </div>
        </Space>
      </Card>

      <AnalysisResultView mode={entry.type} result={entry.result} />
    </Space>
  );
}
