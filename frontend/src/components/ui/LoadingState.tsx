import { Flex, Spin, Typography } from 'antd';

interface LoadingStateProps {
  message: string;
  fullPage?: boolean;
}

export default function LoadingState({ message, fullPage = false }: LoadingStateProps) {
  return (
    <Flex
      vertical
      align="center"
      justify="center"
      gap={12}
      style={{ minHeight: fullPage ? '72vh' : 240, width: '100%' }}
    >
      <Spin size="large" />
      <Typography.Text type="secondary" style={{ fontWeight: 600 }}>
        {message}
      </Typography.Text>
    </Flex>
  );
}
