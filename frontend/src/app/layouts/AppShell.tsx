import { Alert, Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import LoadingState from '@/components/ui/LoadingState';
import { useHealth } from '@/hooks/useHealth';

export default function AppShell() {
  const healthQuery = useHealth();

  if (healthQuery.isLoading && !healthQuery.data) {
    return <LoadingState message="Đang kiểm tra trạng thái backend..." fullPage />;
  }

  return (
    <Layout className="app-shell app-shell--polished">
      <Sidebar />
      <Layout className="app-shell__main">
        {healthQuery.data && !healthQuery.data.model_loaded ? (
          <div className="health-banner">
            <Alert
              banner
              showIcon
              type="error"
              message="Model chưa sẵn sàng — vui lòng kiểm tra backend"
            />
          </div>
        ) : null}
        <Topbar health={healthQuery.data} loading={healthQuery.isLoading} />
        <Layout.Content className="app-content">
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
