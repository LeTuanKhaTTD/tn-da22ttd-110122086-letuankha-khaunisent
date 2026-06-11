import { Alert, Button, Col, Descriptions, List, Row, Space, Tag, Typography } from 'antd';
import { ArrowRightOutlined, CheckCircleOutlined, DatabaseOutlined, ReloadOutlined, RocketOutlined, WarningOutlined } from '@ant-design/icons';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useDashboardStats, useHealth } from '@/hooks/useAnalysis';
import { useNavigate } from 'react-router-dom';

function ModelHealthCard() {
  const { health } = useHealth() as { health: { model_loaded: boolean; device: string; model_mode: string; gemini_enabled: boolean } | null };

  if (!health) {
    return null;
  }

  return (
    <Card title="Model Health" className="section-card">
      <Descriptions column={{ xs: 1, sm: 2, md: 4 }} bordered size="small">
        <Descriptions.Item label="Model loaded">
          {health.model_loaded ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Device">
          <Tag color="blue">{health.device}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Model mode">
          <Tag color="default">{health.model_mode}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Gemini enabled">
          {health.gemini_enabled ? <Tag color="gold">Enabled</Tag> : <Tag color="default">Disabled</Tag>}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

export default function OverviewPage() {
  const healthQuery = useHealth();
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats() as {
    stats: {
      total_videos: number;
      total_comments: number;
      positive_percent: number;
      avg_comments_per_video: number;
    } | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
  };
  const navigate = useNavigate();

  const statCards = [
    {
      label: 'Tổng video đã phân tích',
      value: stats ? stats.total_videos.toLocaleString('vi-VN') : '--',
      icon: DatabaseOutlined,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Tổng bình luận đã xử lý',
      value: stats ? stats.total_comments.toLocaleString('vi-VN') : '--',
      icon: ArrowRightOutlined,
      color: 'text-question',
      bg: 'bg-question/10',
    },
    {
      label: 'Tỷ lệ tích cực trung bình',
      value: stats ? `${stats.positive_percent.toFixed(1)}%` : '--',
      icon: CheckCircleOutlined,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Bình luận TB/video',
      value: stats ? stats.avg_comments_per_video.toLocaleString('vi-VN') : '--',
      icon: RocketOutlined,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  if (healthQuery.loading && !healthQuery.health) {
    return <LoadingState message="Đang tải dữ liệu trạng thái..." fullPage />;
  }

  if (healthQuery.error || !healthQuery.health) {
    return (
      <EmptyState
        title="Không lấy được trạng thái backend"
        subtitle="Kiểm tra FastAPI ở cổng 8000 và thử lại."
        actionLabel="Thử lại"
        onAction={() => healthQuery.refresh()}
      />
    );
  }

  const health = healthQuery.health as {
    model_loaded: boolean;
    device: string;
    model_mode: string;
    gemini_enabled: boolean;
  };

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className="overview-hero section-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={15}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Space size={8} wrap>
                <Tag color={health.model_loaded ? 'green' : 'orange'}>
                  {health.model_loaded ? 'Backend sẵn sàng' : 'Đang chờ model'}
                </Tag>
                <Tag color="blue">PhoBERT</Tag>
                <Tag color={health.gemini_enabled ? 'gold' : 'default'}>
                  Gemini {health.gemini_enabled ? 'enabled' : 'disabled'}
                </Tag>
              </Space>
              <Typography.Title level={2} className="overview-hero__title">
                Trung tâm điều phối phân tích cảm xúc cho TikTok tiếng Việt
              </Typography.Title>
              <Typography.Paragraph className="overview-hero__desc">
                Một giao diện tập trung cho kiểm tra model, phân tích video, phân tích kênh và gán nhãn dữ liệu.
                Bố cục được tối ưu để điều hướng nhanh, đọc trạng thái rõ ràng và thao tác ít bước hơn.
              </Typography.Paragraph>
              <Space wrap>
                <Button type="primary" size="large" icon={<RocketOutlined />} onClick={() => navigate('/video')}>
                  Phân tích video
                </Button>
                <Button size="large" icon={<DatabaseOutlined />} onClick={() => navigate('/labeling')}>
                  Gán nhãn dữ liệu
                </Button>
                <Button size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/channel')}>
                  Phân tích kênh
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} lg={9}>
            <div className="overview-hero__panel">
              <Typography.Text className="overview-hero__panel-label">Trạng thái hệ thống</Typography.Text>
              <div className="overview-hero__panel-value">{health.model_loaded ? 'Ready' : 'Not ready'}</div>
              <div className="overview-hero__panel-grid">
                <div>
                  <span>Model</span>
                  <strong>{health.model_mode || 'phobert'}</strong>
                </div>
                <div>
                  <span>Device</span>
                  <strong>{health.device || 'cpu'}</strong>
                </div>
                <div>
                  <span>Gemini</span>
                  <strong>{health.gemini_enabled ? 'On' : 'Off'}</strong>
                </div>
                <div>
                  <span>Backend</span>
                  <strong>{health.model_loaded ? 'Live' : 'Down'}</strong>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="section-card overview-stat">
              <div className="overview-stat__body">
                <div>
                  <p className="overview-stat__label">{stat.label}</p>
                  <p className="overview-stat__value">{stat.value}</p>
                  {statsLoading ? <p className="overview-stat__hint">Đang tải dữ liệu...</p> : null}
                </div>
                <div className={`overview-stat__icon ${stat.bg}`}>
                  <Icon className={stat.color} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {statsError ? (
        <Alert className="section-card" type="warning" showIcon message={statsError} />
      ) : null}

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card title="Cách dùng nhanh" className="section-card">
            <List
              dataSource={[
                'Mở Phân tích Video hoặc Phân tích Kênh ở sidebar.',
                'Nhập URL / username và Apify token.',
                'Chọn số lượng comment / video phù hợp.',
                'Theo dõi kết quả ngay bên dưới form và quay lại Dashboard để kiểm tra trạng thái hệ thống.',
              ]}
              renderItem={(item, index) => (
                <List.Item className="quick-step">
                  <span className="quick-step__index">0{index + 1}</span>
                  <Typography.Text>{item}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Thông tin model" className="section-card">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Model">{health.model_mode || 'phobert'}</Descriptions.Item>
              <Descriptions.Item label="Thiết bị">{health.device || 'cpu'}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái model">
                {health.model_loaded ? <Tag color="green">Sẵn sàng</Tag> : <Tag color="red">Chưa sẵn sàng</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="Gemini">
                <Tag color={health.gemini_enabled ? 'gold' : 'default'}>
                  {health.gemini_enabled ? 'Bật' : 'Tắt'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            {health.model_loaded ? (
              <Alert
                className="mt-4"
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="Backend đang sẵn sàng để phân tích."
                description="Bạn có thể chuyển sang các trang phân tích để chạy API ngay lập tức."
              />
            ) : (
              <Alert
                className="mt-4"
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="Model chưa sẵn sàng."
                description="Kiểm tra backend và tải lại model trước khi phân tích."
              />
            )}
            <div className="mt-4 flex justify-end">
              <Button icon={<ReloadOutlined />} onClick={() => healthQuery.refresh()}>
                Làm mới trạng thái
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
