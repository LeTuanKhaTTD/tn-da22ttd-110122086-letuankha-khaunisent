import { Pagination, Progress, Select, Space, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import SentimentBadge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { EmotionLabel, type CommentResult } from '@/types/analysis';
import { normalizeEmotion } from '@/utils/normalizeComment';
import { formatPercent } from '@/utils/formatters';

interface CommentTableProps {
  comments: CommentResult[];
}

const SENTIMENT_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: EmotionLabel.Positive, label: 'Tích cực' },
  { value: EmotionLabel.Negative, label: 'Tiêu cực' },
  { value: EmotionLabel.Neutral, label: 'Trung tính' },
];

export default function CommentTable({ comments }: CommentTableProps) {
  const [sentimentFilter, setSentimentFilter] = useState<'all' | EmotionLabel>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredComments = useMemo(() => {
    return comments.filter((comment) => {
      return sentimentFilter === 'all' || normalizeEmotion(comment.emotion) === sentimentFilter;
    });
  }, [comments, sentimentFilter]);

  const pagedComments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredComments.slice(start, start + pageSize);
  }, [filteredComments, page]);

  const columns: ColumnsType<CommentResult> = [
    {
      title: 'STT',
      dataIndex: 'index',
      width: 72,
      render: (_value, _record, index) => index + 1 + (page - 1) * pageSize,
    },
    {
      title: 'Nội dung',
      dataIndex: 'text',
      render: (value: string) => (
        <Space direction="vertical" size={2}>
          <Typography.Paragraph ellipsis={{ rows: 2, tooltip: value }} style={{ margin: 0 }}>
            {value}
          </Typography.Paragraph>
        </Space>
      ),
    },
    {
      title: 'Cảm xúc',
      dataIndex: 'emotion',
      width: 150,
      render: (value: string) => <SentimentBadge emotion={value} />,
    },
    {
      title: 'Độ tin cậy',
      dataIndex: 'confidence',
      width: 180,
      render: (value: number) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Progress percent={Math.round((Number(value) || 0) * 100)} size="small" showInfo={false} />
          <Typography.Text type="secondary">{formatPercent(Number(value) || 0)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Scores',
      dataIndex: 'scores',
      width: 160,
      render: (_value, record) => (
        <Tooltip
          title={`positive: ${formatPercent(record.scores?.positive ?? 0)} | negative: ${formatPercent(record.scores?.negative ?? 0)} | neutral: ${formatPercent(record.scores?.neutral ?? 0)}`}
        >
          <Typography.Text type="secondary">Xem xác suất</Typography.Text>
        </Tooltip>
      ),
    },
  ];

  if (!comments.length) {
    return <EmptyState title="Chưa có bình luận" subtitle="Kết quả phân tích sẽ hiển thị ở đây sau khi backend trả dữ liệu." />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Bình luận
        </Typography.Title>
        <Select
          style={{ minWidth: 180 }}
          value={sentimentFilter}
          onChange={(value) => {
            setPage(1);
            setSentimentFilter(value);
          }}
          options={SENTIMENT_OPTIONS}
        />
      </div>

      <Table<CommentResult>
        rowKey={(record, index) => `${index}-${record.text}`}
        dataSource={pagedComments}
        columns={columns}
        pagination={false}
        size="middle"
      />

      <Pagination
        align="center"
        current={page}
        pageSize={pageSize}
        total={filteredComments.length}
        showSizeChanger={false}
        onChange={(nextPage) => setPage(nextPage)}
      />
    </Space>
  );
}
