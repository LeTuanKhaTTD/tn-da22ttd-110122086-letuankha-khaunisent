import { Avatar, Col, Row, Space, Table, Tag, Typography } from 'antd';
import { Bookmark, Eye, Heart, MessageCircle, Share2, Video } from 'lucide-react';
import Card from '@/components/ui/Card';
import { formatCount } from '@/utils/formatters';
import type { ChannelAnalysisResponse, ChannelVideoResult } from '@/types/analysis';

interface ChannelOverviewCardProps {
  result: ChannelAnalysisResponse;
}

function sumVideos(videos: ChannelVideoResult[], key: keyof ChannelVideoResult) {
  return videos.reduce((total, video) => total + Number(video[key] || 0), 0);
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: number;
  icon: typeof Video;
  tone: string;
  hint?: string;
}) {
  return (
    <div className={`rounded-xl px-4 py-3 ${tone}`}>
      <Space size={8}>
        <Icon size={16} />
        <Typography.Text style={{ fontSize: 12, fontWeight: 800 }}>{label}</Typography.Text>
      </Space>
      <Typography.Title level={4} style={{ margin: '8px 0 0' }}>
        {formatCount(value)}
      </Typography.Title>
      {hint ? <Typography.Text style={{ fontSize: 12 }}>{hint}</Typography.Text> : null}
    </div>
  );
}

export default function ChannelOverviewCard({ result }: ChannelOverviewCardProps) {
  const videos = result.videos ?? [];
  const info = result.channel_info ?? {};
  const scope = result.analysis_scope ?? {};
  const videosAnalyzed = Number(scope.videos_analyzed ?? result.channel_summary.total_videos);
  const metadataVideos = Number(scope.metadata_videos_collected ?? info.posts_collected ?? videosAnalyzed);
  const commentsAnalyzed = Number(scope.comments_analyzed ?? result.channel_summary.total_comments);
  const declaredComments = Number(scope.declared_comments_in_selected_videos ?? info.total_declared_comments ?? sumVideos(videos, 'comments_count'));
  const totalViews = Number(scope.total_views_in_channel_videos ?? info.total_views ?? sumVideos(videos, 'views'));
  const totalLikes = Number(scope.total_likes_in_channel_videos ?? info.total_likes ?? sumVideos(videos, 'likes'));
  const totalShares = Number(scope.total_shares_in_channel_videos ?? info.total_shares ?? sumVideos(videos, 'shares'));
  const totalSaves = Number(scope.total_saves_in_channel_videos ?? info.total_saves ?? sumVideos(videos, 'saves'));
  const displayName = info.display_name || info.username || 'Kênh TikTok';
  const username = info.username ? `@${info.username.replace(/^@/, '')}` : '';

  const channelMetrics = [
    { label: 'Tổng lượt xem', value: totalViews, icon: Eye, tone: 'text-cyan-700 bg-cyan-50' },
    { label: 'Tổng lượt tym', value: totalLikes, icon: Heart, tone: 'text-rose-700 bg-rose-50' },
    { label: 'Tổng chia sẻ', value: totalShares, icon: Share2, tone: 'text-violet-700 bg-violet-50' },
    { label: 'Tổng lượt lưu', value: totalSaves, icon: Bookmark, tone: 'text-amber-700 bg-amber-50' },
  ];

  const analysisMetrics = [
    {
      label: 'Video lấy metadata',
      value: metadataVideos,
      icon: Video,
      tone: 'text-blue-700 bg-blue-50',
      hint: 'Dùng để cộng tổng kênh',
    },
    {
      label: 'Video chạy PhoBERT',
      value: videosAnalyzed,
      icon: Video,
      tone: 'text-slate-700 bg-slate-50',
      hint: `Theo giới hạn ${formatCount(Number(scope.requested_max_videos || videosAnalyzed))}`,
    },
    {
      label: 'Comment đã phân tích',
      value: commentsAnalyzed,
      icon: MessageCircle,
      tone: 'text-green-700 bg-green-50',
      hint: `${formatCount(Number(scope.requested_comments_per_video || 0))}/video tối đa`,
    },
    {
      label: 'Comment công khai',
      value: declaredComments,
      icon: MessageCircle,
      tone: 'text-slate-700 bg-slate-50',
      hint: 'Theo metadata video đã thu thập',
    },
  ];

  const tableData = [...videos]
    .sort((left, right) => Number(right.views || 0) - Number(left.views || 0))
    .slice(0, 6)
    .map((video, index) => ({
      key: video.video_id || index,
      index: index + 1,
      title: video.description || video.video_id || `Video ${index + 1}`,
      views: video.views || 0,
      likes: video.likes || 0,
      shares: video.shares || 0,
      publicComments: video.comments_count || 0,
      analyzedComments: video.comments.length,
    }));

  return (
    <Card title="Tổng quan kênh và phạm vi phân tích" className="section-card">
      <Space direction="vertical" size={18} style={{ width: '100%' }}>
        <div className="flex items-center gap-4">
          <Avatar size={56} src={info.avatar_url}>{displayName.slice(0, 1).toUpperCase()}</Avatar>
          <div className="min-w-0">
            <Typography.Title level={4} style={{ margin: 0 }}>{displayName}</Typography.Title>
            <Typography.Text type="secondary">{username || info.profile_url || 'Thông tin kênh từ Apify'}</Typography.Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {info.followers ? <Tag color="blue">{formatCount(info.followers)} followers</Tag> : null}
              {info.likes ? <Tag color="magenta">{formatCount(info.likes)} lượt thích hồ sơ</Tag> : null}
              {metadataVideos ? <Tag color="default">{formatCount(metadataVideos)} video metadata</Tag> : null}
            </div>
          </div>
        </div>

        <div>
          <Typography.Text strong>Thống kê tương tác toàn kênh</Typography.Text>
          <Row gutter={[12, 12]} className="mt-2">
            {channelMetrics.map((metric) => (
              <Col xs={12} md={6} key={metric.label}>
                <MetricTile {...metric} />
              </Col>
            ))}
          </Row>
        </div>

        <div>
          <Typography.Text strong>Phạm vi phân tích sentiment</Typography.Text>
          <Row gutter={[12, 12]} className="mt-2">
            {analysisMetrics.map((metric) => (
              <Col xs={24} md={6} key={metric.label}>
                <MetricTile {...metric} />
              </Col>
            ))}
          </Row>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Tổng view, tym và chia sẻ được tính từ metadata video Apify thu thập được cho kênh.
          Phân tích cảm xúc chỉ chạy trên <strong> {formatCount(videosAnalyzed)}</strong> video và
          <strong> {formatCount(commentsAnalyzed)}</strong> comment theo giới hạn bạn chọn để tiết kiệm thời gian.
        </div>

        <Table
          size="small"
          pagination={false}
          dataSource={tableData}
          columns={[
            { title: '#', dataIndex: 'index', width: 52 },
            { title: 'Video nổi bật theo lượt xem', dataIndex: 'title', ellipsis: true },
            { title: 'Views', dataIndex: 'views', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Tym', dataIndex: 'likes', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Shares', dataIndex: 'shares', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Comment công khai', dataIndex: 'publicComments', align: 'right', render: (value) => formatCount(Number(value)) },
            { title: 'Đã phân tích', dataIndex: 'analyzedComments', align: 'right', render: (value) => formatCount(Number(value)) },
          ]}
        />
      </Space>
    </Card>
  );
}
