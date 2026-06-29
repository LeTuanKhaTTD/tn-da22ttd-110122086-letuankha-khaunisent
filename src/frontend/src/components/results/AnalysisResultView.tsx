import { Button, Col, Row, Space, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import Card from '@/components/ui/Card';
import SummaryCards from '@/components/results/SummaryCards';
import SentimentPie from '@/components/charts/SentimentPie';
import SentimentBars from '@/components/charts/SentimentBars';
import CommentTable from '@/components/results/CommentTable';
import VideoResultList from '@/components/results/VideoResultList';
import ConfidenceHistogram from '@/components/charts/ConfidenceHistogram';
import InsightPanel from '@/components/results/InsightPanel';
import SentimentBreakdown from '@/components/results/SentimentBreakdown';
import TopNegativeComments from '@/components/results/TopNegativeComments';
import ChannelOverviewCard from '@/components/results/ChannelOverviewCard';
import ChannelInsightPanel from '@/components/results/ChannelInsightPanel';
import RiskVideoTable from '@/components/results/RiskVideoTable';
import { summarizeComments } from '@/utils/summarize';
import type { ChannelAnalysisResponse, VideoAnalysisResponse } from '@/types/analysis';

interface AnalysisResultViewProps {
  mode: 'video' | 'channel';
  result: VideoAnalysisResponse | ChannelAnalysisResponse;
}

export default function AnalysisResultView({ mode, result }: AnalysisResultViewProps) {
  const isVideo = mode === 'video';
  const videoResult = isVideo ? (result as VideoAnalysisResponse) : null;
  const channelResult = !isVideo ? (result as ChannelAnalysisResponse) : null;
  const comments = videoResult?.comments ?? channelResult?.videos.flatMap((video) => video.comments) ?? [];
  const distribution = videoResult?.summary.distribution ?? channelResult?.channel_summary.distribution ?? {};
  const derived = comments.length ? summarizeComments(comments) : null;
  const total = videoResult?.summary.total ?? channelResult?.channel_summary.total_comments ?? 0;
  const videoTitle = videoResult?.video_title?.trim() || 'Video TikTok';
  const videoUrl = videoResult?.input_url;

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {isVideo ? (
        <Card className="section-card">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text type="secondary">Thông tin video</Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {videoTitle}
            </Typography.Title>
            {videoUrl ? (
              <Button href={videoUrl} target="_blank" rel="noreferrer" icon={<LinkOutlined />}>
                Mở video gốc
              </Button>
            ) : null}
          </Space>
        </Card>
      ) : null}

      {!isVideo && channelResult ? <ChannelOverviewCard result={channelResult} /> : null}
      {!isVideo && channelResult ? <ChannelInsightPanel result={channelResult} /> : null}

      <SummaryCards total={derived?.total ?? total} dominantEmotion={derived?.dominantEmotion ?? 'neutral'} avgConfidence={derived?.avgConfidence ?? 0} />
      <SentimentBreakdown distribution={distribution} />
      <InsightPanel comments={comments} />

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <Card title={isVideo ? 'Phân bổ cảm xúc' : 'Phân bổ cảm xúc toàn kênh'} className="section-card">
            <SentimentPie distribution={distribution} />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="Phân bố độ tin cậy" className="section-card">
            <ConfidenceHistogram comments={comments} />
          </Card>
        </Col>
      </Row>

      {!isVideo && channelResult ? (
        <Card title="So sánh cảm xúc giữa các video" className="section-card">
          <SentimentBars videos={channelResult.videos} />
        </Card>
      ) : null}

      {!isVideo && channelResult ? <RiskVideoTable result={channelResult} /> : null}

      <Card title="Bình luận tiêu cực cần ưu tiên" className="section-card">
        <TopNegativeComments comments={comments} />
      </Card>

      {isVideo && videoResult ? (
        <Card title="Danh sách bình luận" className="section-card">
          <CommentTable comments={videoResult.comments} />
        </Card>
      ) : null}

      {!isVideo && channelResult ? (
        <Card title="Chi tiết từng video" className="section-card">
          <VideoResultList videos={channelResult.videos} />
        </Card>
      ) : null}
    </Space>
  );
}
