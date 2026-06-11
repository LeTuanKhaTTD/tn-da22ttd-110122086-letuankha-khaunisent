import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import type { ReactNode } from 'react';

const { defaultAlgorithm } = theme;

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb',
          colorInfo: '#2563eb',
          colorSuccess: '#059669',
          colorWarning: '#d97706',
          colorError: '#dc2626',
          colorBgBase: '#f8fafc',
          colorBgLayout: '#f3f6fb',
          colorBgContainer: '#ffffff',
          colorBorder: 'rgba(15, 23, 42, 0.10)',
          borderRadius: 16,
          fontFamily: 'Be Vietnam Pro, sans-serif',
          boxShadowSecondary: '0 18px 45px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
