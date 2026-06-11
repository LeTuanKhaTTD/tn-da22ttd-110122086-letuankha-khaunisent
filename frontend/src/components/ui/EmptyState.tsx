import { Button, Empty, Result, Space, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  extra?: ReactNode;
}

export default function EmptyState({ title, subtitle, actionLabel, onAction, extra }: EmptyStateProps) {
  return (
    <Result
      icon={<InboxOutlined style={{ fontSize: 44, color: '#94a3b8' }} />}
      title={<Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>}
      subTitle={subtitle}
      extra={
        <Space direction="vertical" size={12}>
          {actionLabel && onAction ? (
            <Button type="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {extra}
        </Space>
      }
    >
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </Result>
  );
}
