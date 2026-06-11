import { Avatar, Col, Row, Space, Table, Typography } from 'antd';
import { Eye, Heart, MessageCircle, Share2, Bookmark, Video } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCount } from '@/utils/formatters';
import type { ChannelAnalysisResponse, ChannelVideoResult } from '@/types/analysis';

interface ChannelOverviewCardProps {
  result: ChannelAnalysisResponse;
}

function sumVideos(videos: ChannelVideoResult[], key: keyof ChannelVideoResult) {
  return videos.reduce((total, video) => total + Number(video[key] || 0), 0);
}

export default function ChannelOverviewCard({ result }: ChannelOverviewCardProps) {
  const videos = result.videos ?? [];
  const info = result.channel_info ?? {};
  const totalViews = Number(info.total_views ?? sumVideos(videos, 'views'));
  const totalLikes = Number(info.total_likes ?? sumVideos(videos, 'likes'));
  const totalShares = Number(info.total_shares ?? sumVideos(videos, 'shares'));
  const totalSaves = Number(info.total_saves ?? sumVideos(videos, 'saves'));
  const declaredComments = Number(info.total_declared_comments ?? sumVideos(videos, 'comments_count'));
  const displayName = info.display_name || info.username || 'Kênh TikTok';
  const username = info.username ? `@${info.username.replace(/^@/, '')}` : '';

  const metrics = [
    { label: 'Video phân tích', value: result.channel_summary.total_videos, icon: Video, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Bình luận đã crawl', value: result.channel_summary.total_comments, icon: MessageCircle, tone: 'text-slate-700 bg-slate-50' },
    { label: 'Lượt xem', value: totalViews, icon: Eye, tone: 'text-cyan-700 bg-cyan-50' },
    { label: 'Lượt thích', value: totalLikes, icon: Heart, tone: 'text-rose-700 bg-rose-50' },
    { label: 'Lượt chia sẻ', value: totalShares, icon: Share2, tone: 'text-violet-700 bg-violet-50' },
    { label: 'Lượt lưu', value: totalSaves, icon: Bookmark, tone: 'text-amber-700 bg-amber-50' },
  ];

  const tableData = [...videos]
    .sort((left, right) => Number(right.likes || 0) - Number(left.likes || 0))
    .slice(0, 5)
    .map((video, index) => ({
      key: video.video_id || index,
      index: index + 1,
      title: video.description || video.video_id || `Video ${index + 1}`,
      views: video.views || 0,
      likes: video.likes || 0,
      shares: video.shares || 0,
      comments: video.comments_count || video.comments.length,
    }));

  return (
    <Card title="Tổng quan kênh" className="section-card">
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar size={54} src={info.avatar_url}>{displayName.slice(0, 1).toUpperCase()}</Avatar>
          <div style={{ minWidth: 0 }}>
            <Typography.Title level={4} style={{ margin: 0 }}>{displayName}</Typography.Title>
            <Typography.Text type="secondary">{username || info.profile_url || 'Thông tin kênh từ Apify'}</Typography.Text>
            {info.bio ? <Typography.Paragraph style={{ margin: '6px 0 0' }} ellipsis={{ rows: 2 }}>{info.bio}</Typography.Paragraph> : null}
          </div>
        </div>

        <Row gutter={[12, 12]}>
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Col xs={12} md={8} xl={4} key={metric.label}>
                <div className={`rounded-lg px-4 py-3 ${metric.tone}`}>
                  <Space size={8}>
                    <Icon size={16} />
                    <Typography.Text style={{ fontSize: 12, fontWeight: 800 }}>{metric.label}</Typography.Text>
                  </Space>
                  <Typography.Title level={4} style={{ margin: '8px 0 0' }}>
                    {formatCount(metric.value)}
                  </Typography.Title>
                </div>
              </Col>
            );
          })}
        </Row>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Tổng bình luận công khai trên các video đã lấy: <strong>{formatCount(declaredComments)}</strong>. Số bình luận đã crawl để phân tích:
          <strong> {formatCount(result.channel_summary.total_comments)}</strong>.
        </div>

        <Table
          size="small"
          pagination={false}
          dataSource={tableData}
          columns={[
            { title: '#', dataIndex: 'index', width: 52 },
            { title: 'Video nổi bật', dataIndex: 'title', ellipsis: true },
            { title: 'Views', dataIndex: 'views', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Likes', dataIndex: 'likes', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Shares', dataIndex: 'shares', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Comments', dataIndex: 'comments', align: 'right', render: (value) => formatCount(Number(value)) },
          ]}
        />
      </Space>
    </Card>
  );
}
