import { DashboardOutlined, PlayCircleOutlined, PieChartOutlined, SettingOutlined, TagsOutlined } from '@ant-design/icons';
import { Badge, Layout, Menu, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '@/store/useUiStore';

const MENU_ITEMS: MenuProps['items'] = [
  {
    key: '/overview',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/video',
    icon: <PlayCircleOutlined />,
    label: 'Phân tích Video',
  },
  {
    key: '/channel',
    icon: <PieChartOutlined />,
    label: 'Phân tích Kênh',
  },
  {
    key: '/labeling',
    icon: <TagsOutlined />,
    label: 'Gán nhãn',
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: 'Cài đặt',
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);

  return (
    <Layout.Sider
      collapsible
      collapsed={collapsed}
      trigger={null}
      width={252}
      collapsedWidth={84}
      className="app-sidebar"
    >
      <div className="brand">
        <div className="brand-mark">KU</div>
        <div className="brand-copy">
          <Typography.Title level={4} className="brand-title">
            KhaUniSent
          </Typography.Title>
          <Typography.Paragraph className="brand-subtitle">
            Phân tích cảm xúc TikTok tiếng Việt
          </Typography.Paragraph>
        </div>
      </div>
      {!collapsed ? (
        <div className="sidebar-highlight">
          <Badge status="processing" text="Live model + labeling workflow" />
          <Typography.Text className="sidebar-highlight__text">
            Giao diện tối ưu cho kiểm tra model, gán nhãn và theo dõi pipeline.
          </Typography.Text>
        </div>
      ) : null}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={MENU_ITEMS}
        onClick={({ key }) => navigate(String(key))}
        className="app-sidebar__menu"
        style={{ background: 'transparent', borderInlineEnd: 'none' }}
      />
    </Layout.Sider>
  );
}

