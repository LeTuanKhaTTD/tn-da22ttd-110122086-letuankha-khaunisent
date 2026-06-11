import { MenuFoldOutlined, MenuUnfoldOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Space, Tag, Typography } from 'antd';
import type { HealthResponse } from '@/types/health';
import { useUiStore } from '@/store/useUiStore';

interface TopbarProps {
  health?: HealthResponse;
  loading?: boolean;
}

function ModelStatusBadge({ health, loading }: TopbarProps) {
  if (loading) {
    return <Tag color="blue">Đang kiểm tra backend</Tag>;
  }

  if (!health) {
    return <Tag color="default">Chưa có dữ liệu</Tag>;
  }

  if (!health.model_loaded) {
    return <Tag color="red">Model chưa sẵn sàng</Tag>;
  }

  return (
    <Space size={8} wrap>
      <Tag color="green">Sẵn sàng</Tag>
      <Tag color="blue">{health.model_mode}</Tag>
      <Tag color="default">{health.device}</Tag>
      {health.gemini_enabled ? <Tag color="gold">Gemini</Tag> : null}
    </Space>
  );
}

export default function Topbar({ health, loading = false }: TopbarProps) {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  return (
    <div className="app-topbar">
      <div className="app-topbar__inner">
        <div className="topbar-title-block">
          <Space size={12} align="center">
            <Button
              type="text"
              className="topbar-toggle"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            />
            <div>
              <Typography.Text className="topbar-eyebrow">Sentiment analytics suite</Typography.Text>
              <Typography.Title level={4} className="topbar-title">
                TikUniSent
              </Typography.Title>
              <Typography.Text type="secondary" className="topbar-subtitle">
                Dashboard phân tích cảm xúc bình luận TikTok tiếng Việt
              </Typography.Text>
            </div>
          </Space>
        </div>
        <div className="topbar-status">
          <ModelStatusBadge health={health} loading={loading} />
          <Button type="primary" ghost icon={<ReloadOutlined />}>
            Làm mới
          </Button>
        </div>
      </div>
    </div>
  );
}
