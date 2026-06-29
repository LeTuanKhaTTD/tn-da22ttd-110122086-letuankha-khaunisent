import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './layouts/AppShell';
import OverviewPage from '@/pages/overview/OverviewPage';
import VideoAnalyzePage from '@/pages/analyze/VideoAnalyzePage';
import ChannelAnalyzePage from '@/pages/analyze/ChannelAnalyzePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/overview" replace />,
      },
      {
        path: 'overview',
        element: <OverviewPage />,
      },
      {
        path: 'video',
        element: <VideoAnalyzePage />,
      },
      {
        path: 'channel',
        element: <ChannelAnalyzePage />,
      },
      {
        path: '*',
        element: <Navigate to="/overview" replace />,
      },
    ],
  },
]);
