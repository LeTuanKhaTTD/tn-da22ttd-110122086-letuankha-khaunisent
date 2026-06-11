import { useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ToastHost from '@/components/shared/Toast';
import OverviewPage from '@/pages/overview/OverviewPage';
import ModelTestPage from '@/pages/ModelTestPage';
import VideoAnalyzePage from '@/pages/analyze/VideoAnalyzePage';
import ChannelAnalyzePage from '@/pages/analyze/ChannelAnalyzePage';
import LabelingPage from '@/pages/LabelingPage';
import HistoryPage from '@/pages/HistoryPage';
import HistoryDetailPage from '@/pages/HistoryDetailPage';
import SettingsPage from '@/pages/SettingsPage';
import { useHealth } from '@/hooks/useAnalysis';

function usePageMeta() {
  const location = useLocation();

  return useMemo(() => {
    if (location.pathname.startsWith('/model-test')) {
      return { title: 'Test model', breadcrumbs: ['Trang chủ', 'Test model'] };
    }
    if (location.pathname.startsWith('/video')) {
      return { title: 'Phân tích video', breadcrumbs: ['Trang chủ', 'Phân tích video'] };
    }
    if (location.pathname.startsWith('/channel')) {
      return { title: 'Phân tích kênh', breadcrumbs: ['Trang chủ', 'Phân tích kênh'] };
    }
    if (location.pathname.startsWith('/labeling')) {
      return { title: 'Gán nhãn bình luận', breadcrumbs: ['Trang chủ', 'Gán nhãn'] };
    }
    if (location.pathname.startsWith('/history')) {
      return { title: 'Lịch sử phân tích', breadcrumbs: ['Trang chủ', 'Lịch sử'] };
    }
    if (location.pathname.startsWith('/settings')) {
      return { title: 'Cài đặt', breadcrumbs: ['Trang chủ', 'Cài đặt'] };
    }
    return { title: 'Tổng quan', breadcrumbs: ['Trang chủ'] };
  }, [location.pathname]);
}

function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { health, refresh } = useHealth();
  const { title, breadcrumbs } = usePageMeta();

  return (
    <div className="flex min-h-screen bg-content">
      <Sidebar collapsed={collapsed} />
      <div className="flex flex-1 flex-col">
        <Header
          title={title}
          breadcrumbs={breadcrumbs}
          health={health}
          onRefresh={refresh}
          onToggleSidebar={() => setCollapsed((prev) => !prev)}
        />
        <main className="flex-1 space-y-6 bg-content px-6 py-6 lg:px-8">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/model-test" element={<ModelTestPage />} />
            <Route path="/video" element={<VideoAnalyzePage />} />
            <Route path="/channel" element={<ChannelAnalyzePage />} />
            <Route path="/labeling" element={<LabelingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<HistoryDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
