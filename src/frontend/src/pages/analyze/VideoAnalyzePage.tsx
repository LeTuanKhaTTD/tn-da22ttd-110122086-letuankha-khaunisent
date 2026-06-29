import { Button, Col, Modal, Row, Space, Tag, Typography, message } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import VideoForm from '@/components/forms/VideoForm';
import AnalysisResultView from '@/components/results/AnalysisResultView';
import HeroModelPanel from '@/components/results/HeroModelPanel';
import { useAnalyzeVideo } from '@/hooks/useAnalyzeVideo';
import { useHealth } from '@/hooks/useHealth';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { getApiErrorMessage } from '@/services/http/client';
import { buildVideoHistoryEntry, saveAnalysisHistory } from '@/utils/historyStorage';
import type { VideoAnalysisPayload } from '@/types/analysis';

export default function VideoAnalyzePage() {
  const mutation = useAnalyzeVideo();
  const location = useLocation();
  const [lastPayload, setLastPayload] = useState<VideoAnalysisPayload | null>(null);
  const lastVideoResult = useAnalysisStore((state) => state.lastVideoResult);
  const result = mutation.isError ? null : mutation.data ?? lastVideoResult;
  const { data: health } = useHealth();
  const errorMessage = mutation.error ? getApiErrorMessage(mutation.error) : '';
  const reanalyzePayload = (location.state as { reanalyzePayload?: VideoAnalysisPayload } | null)?.reanalyzePayload;

  useEffect(() => {
    if (reanalyzePayload) {
      setLastPayload(reanalyzePayload);
    }
  }, [reanalyzePayload]);

  const handleSubmit = async (values: VideoAnalysisPayload) => {
    try {
      setLastPayload(values);
      await mutation.mutateAsync(values);
      message.success('Phân tích video hoàn tất');
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  const handleSaveResult = () => {
    if (!result || !lastPayload) {
      message.warning('Chưa có kết quả hoặc thông tin đầu vào để lưu.');
      return;
    }
    saveAnalysisHistory(buildVideoHistoryEntry(lastPayload, result));
    message.success('Đã lưu kết quả vào lịch sử.');
  };

  const handleReanalyze = () => {
    if (!lastPayload) {
      message.warning('Chưa có thông tin đầu vào để phân tích lại.');
      return;
    }
    void handleSubmit(lastPayload);
  };

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="section-card overflow-hidden">
        <div className="analysis-hero">
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={15}>
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Space size={8} wrap>
                  <Tag color={health?.model_loaded ? 'green' : 'orange'}>
                    {health?.model_loaded ? 'PhoBERT sẵn sàng' : 'Model đang khởi tạo'}
                  </Tag>
                  <Tag color="blue">Crawl trực tiếp từ TikTok</Tag>
                  <Tag color={health?.apify_configured ? 'green' : 'orange'}>
                    {health?.apify_configured ? 'Apify bảo mật ở backend' : 'Thiếu APIFY_API_TOKEN trong .env'}
                  </Tag>
                  <Tag color={health?.gemini_enabled ? 'gold' : 'default'}>Gemini chỉ dùng để so sánh</Tag>
                </Space>
                <Typography.Title level={2} className="analysis-hero__title">
                  Phân tích cảm xúc bình luận TikTok bằng PhoBERT fine-tuned
                </Typography.Title>
                <Typography.Paragraph className="analysis-hero__desc">
                  Nhập URL video TikTok, backend sẽ crawl bình luận qua Apify, chạy PhoBERT và trả về phân bổ cảm xúc,
                  độ tin cậy cùng danh sách bình luận đã phân tích.
                </Typography.Paragraph>
              </Space>
            </Col>
            <Col xs={24} lg={9}>
              <HeroModelPanel health={health} feature="video" />
            </Col>
          </Row>
        </div>
        <div className="analysis-form-wrap">
          <Typography.Text className="analysis-section-label">Thông tin đầu vào</Typography.Text>
          <VideoForm loading={mutation.isPending} initialValues={reanalyzePayload} onSubmit={handleSubmit} />
        </div>
      </Card>

      <Modal open={mutation.isPending} closable={false} maskClosable={false} footer={null} centered width={520}>
        <LoadingState message="Đang crawl và phân tích bình luận, quá trình có thể mất 1-3 phút." />
      </Modal>

      {!result ? (
        <EmptyState
          title={mutation.isError ? 'Phân tích thất bại' : 'Chưa có kết quả'}
          subtitle={mutation.isError ? errorMessage || 'Không thể lấy dữ liệu phân tích từ backend.' : 'Nhập URL video để bắt đầu phân tích.'}
        />
      ) : (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Card className="section-card">
            <Space wrap>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveResult}>
                Lưu kết quả vào lịch sử
              </Button>
              <Button icon={<ReloadOutlined />} loading={mutation.isPending} onClick={handleReanalyze}>
                Phân tích lại
              </Button>
            </Space>
          </Card>
          <AnalysisResultView mode="video" result={result} />
        </Space>
      )}
    </Space>
  );
}
