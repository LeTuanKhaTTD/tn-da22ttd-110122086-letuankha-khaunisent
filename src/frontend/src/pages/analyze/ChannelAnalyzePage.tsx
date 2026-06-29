import { Button, Col, Modal, Row, Space, Tag, Typography, message } from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import ChannelForm from '@/components/forms/ChannelForm';
import AnalysisResultView from '@/components/results/AnalysisResultView';
import HeroModelPanel from '@/components/results/HeroModelPanel';
import { useAnalyzeChannel } from '@/hooks/useAnalyzeChannel';
import { useHealth } from '@/hooks/useHealth';
import { useAnalysisStore } from '@/store/useAnalysisStore';
import { getApiErrorMessage } from '@/services/http/client';
import { buildChannelHistoryEntry, saveAnalysisHistory } from '@/utils/historyStorage';
import type { ChannelAnalysisPayload } from '@/types/analysis';

export default function ChannelAnalyzePage() {
  const mutation = useAnalyzeChannel();
  const location = useLocation();
  const [lastPayload, setLastPayload] = useState<ChannelAnalysisPayload | null>(null);
  const lastChannelResult = useAnalysisStore((state) => state.lastChannelResult);
  const result = mutation.isError ? null : mutation.data ?? lastChannelResult;
  const { data: health } = useHealth();
  const errorMessage = mutation.error ? getApiErrorMessage(mutation.error) : '';
  const reanalyzePayload = (location.state as { reanalyzePayload?: ChannelAnalysisPayload } | null)?.reanalyzePayload;

  useEffect(() => {
    if (reanalyzePayload) {
      setLastPayload(reanalyzePayload);
    }
  }, [reanalyzePayload]);

  const handleSubmit = async (values: ChannelAnalysisPayload) => {
    try {
      setLastPayload(values);
      await mutation.mutateAsync(values);
      message.success('Phân tích kênh hoàn tất');
    } catch (error) {
      message.error(getApiErrorMessage(error));
    }
  };

  const handleSaveResult = () => {
    if (!result || !lastPayload) {
      message.warning('Chưa có kết quả hoặc thông tin đầu vào để lưu.');
      return;
    }
    saveAnalysisHistory(buildChannelHistoryEntry(lastPayload, result));
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
                  <Tag color="blue">Crawl kênh trực tiếp</Tag>
                  <Tag color={health?.apify_configured ? 'green' : 'orange'}>
                    {health?.apify_configured ? 'Apify bảo mật ở backend' : 'Thiếu APIFY_API_TOKEN trong .env'}
                  </Tag>
                  <Tag color={health?.gemini_enabled ? 'gold' : 'default'}>Gemini chỉ dùng để so sánh</Tag>
                </Space>
                <Typography.Title level={2} className="analysis-hero__title">
                  Phân tích cảm xúc toàn kênh TikTok bằng PhoBERT
                </Typography.Title>
                <Typography.Paragraph className="analysis-hero__desc">
                  Nhập username kênh, backend sẽ lấy video và bình luận trực tiếp qua Apify, sau đó tổng hợp cảm xúc
                  theo từng video và toàn bộ kênh.
                </Typography.Paragraph>
              </Space>
            </Col>
            <Col xs={24} lg={9}>
              <HeroModelPanel health={health} feature="channel" />
            </Col>
          </Row>
        </div>
        <div className="analysis-form-wrap">
          <Typography.Text className="analysis-section-label">Thông tin đầu vào</Typography.Text>
          <ChannelForm loading={mutation.isPending} initialValues={reanalyzePayload} onSubmit={handleSubmit} />
        </div>
      </Card>

      <Modal open={mutation.isPending} closable={false} maskClosable={false} footer={null} centered width={520}>
        <LoadingState message="Đang crawl và phân tích kênh. Với Apify free, quá trình có thể mất 5-10 phút tùy số video và bình luận." />
      </Modal>

      {!result ? (
        <EmptyState
          title={mutation.isError ? 'Phân tích thất bại' : 'Chưa có kết quả'}
          subtitle={mutation.isError ? errorMessage || 'Không thể lấy dữ liệu phân tích từ backend.' : 'Nhập username kênh để bắt đầu phân tích.'}
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
          <AnalysisResultView mode="channel" result={result} />
        </Space>
      )}
    </Space>
  );
}
