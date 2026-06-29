import { Card as AntCard } from 'antd';
import type { CardProps as AntCardProps } from 'antd';
import type { ReactNode } from 'react';

interface CardProps extends AntCardProps {
  loading?: boolean;
  children?: ReactNode;
}

export default function Card({ loading = false, children, ...props }: CardProps) {
  return (
    <AntCard className="section-card" loading={loading} {...props}>
      {children}
    </AntCard>
  );
}
