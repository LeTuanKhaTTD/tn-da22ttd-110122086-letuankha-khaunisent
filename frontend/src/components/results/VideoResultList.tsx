import { Button, Collapse, Descriptions, Row, Col, Space, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import SummaryCards from './SummaryCards';
import CommentTable from './CommentTable';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import { summarizeComments } from '@/utils/summarize';
import { formatCount } from '@/utils/formatters';
import type { ChannelVideoResult } from '@/types/analysis';

interface VideoResultListProps {
  videos: ChannelVideoResult[];
}

function formatDate(value?: string) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <Typography.Text type="secondary" style={{ fontSize: 12, fontWeight: 800 }}>{label}</Typography.Text>
      <Typography.Title level={5} style={{ margin: '6px 0 0' }}>{formatCount(value)}</Typography.Title>
    </div>
  );
}

export default function VideoResultList({ videos }: VideoResultListProps) {
  if (!videos.length) {
    return <EmptyState title="Chưa có danh sách video" subtitle="Dữ liệu kênh sẽ hiển thị ở đây sau khi phân tích." />;
  }

  return (
    <Collapse
      accordion={false}
      items={videos.map((video, index) => {
        const derived = summarizeComments(video.comments);
        const title = video.description || video.video_id || `Video ${index + 1}`;
        return {
          key: `${video.video_id}-${index}`,
          label: (
            <Space direction="vertical" size={2} style={{ width: '100%' }}>
              <Typography.Text strong>Video {index + 1}</Typography.Text>
              <Typography.Text type="secondary" ellipsis style={{ maxWidth: 820 }}>
                {title}
              </Typography.Text>
            </Space>
          ),
          extra: (
            <Button href={video.url} target="_blank" rel="noreferrer" icon={<LinkOutlined />}>
              Mở TikTok
            </Button>
          ),
          children: (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>{title}</Typography.Title>
                  <Row gutter={[12, 12]}>
                    <Col xs={12} md={4}><Metric label="Views" value={Number(video.views || 0)} /></Col>
                    <Col xs={12} md={4}><Metric label="Likes" value={Number(video.likes || 0)} /></Col>
                    <Col xs={12} md={4}><Metric label="Shares" value={Number(video.shares || 0)} /></Col>
                    <Col xs={12} md={4}><Metric label="Saves" value={Number(video.saves || 0)} /></Col>
                    <Col xs={12} md={4}><Metric label="Comments" value={Number(video.comments_count || video.comments.length)} /></Col>
                    <Col xs={12} md={4}><Metric label="Đã crawl" value={video.comments.length} /></Col>
                  </Row>
                  <Descriptions column={{ xs: 1, md: 2 }} size="small" bordered>
                    <Descriptions.Item label="Video ID">{video.video_id || '--'}</Descriptions.Item>
                    <Descriptions.Item label="Ngày đăng">{formatDate(video.created_at)}</Descriptions.Item>
                    <Descriptions.Item label="Tác giả">{video.author_username || video.author || '--'}</Descriptions.Item>
                    <Descriptions.Item label="Nhạc nền">{video.music_title || '--'}</Descriptions.Item>
                  </Descriptions>
                </Space>
              </Card>

              <Card>
                <Typography.Text type="secondary">Tổng quan cảm xúc video</Typography.Text>
                <div style={{ marginTop: 12 }}>
                  <SummaryCards total={derived.total} dominantEmotion={derived.dominantEmotion} avgConfidence={derived.avgConfidence} />
                </div>
              </Card>
              <CommentTable comments={video.comments} />
            </Space>
          ),
        };
      })}
    />
  );
}
