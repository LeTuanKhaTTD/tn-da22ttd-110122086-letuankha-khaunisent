import { Empty, List, Progress, Typography } from 'antd';
import SentimentBadge from '@/components/ui/Badge';
import { EmotionLabel, type CommentResult } from '@/types/analysis';
import { normalizeEmotion } from '@/utils/normalizeComment';
import { formatPercent } from '@/utils/formatters';

interface TopNegativeCommentsProps {
  comments: CommentResult[];
  limit?: number;
}

export default function TopNegativeComments({ comments, limit = 5 }: TopNegativeCommentsProps) {
  const negatives = comments
    .filter((item) => normalizeEmotion(item.emotion) === EmotionLabel.Negative)
    .sort((left, right) => Number(right.confidence || 0) - Number(left.confidence || 0))
    .slice(0, limit);

  if (!negatives.length) {
    return <Empty description="Chưa có bình luận tiêu cực nổi bật" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <List
      dataSource={negatives}
      renderItem={(item) => (
        <List.Item
          style={{
            marginBottom: 10,
            padding: 14,
            border: '1px solid rgba(220, 38, 38, 0.22)',
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(254, 226, 226, 0.86), rgba(255, 255, 255, 0.98))',
          }}
        >
          <List.Item.Meta
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <SentimentBadge emotion={item.emotion} />
                <Typography.Text style={{ color: '#991b1b', fontWeight: 800 }}>{formatPercent(item.confidence)}</Typography.Text>
              </div>
            }
            description={
              <div>
                <Typography.Paragraph style={{ marginBottom: 8, color: '#1f2937', fontWeight: 500 }}>{item.text}</Typography.Paragraph>
                <Progress percent={Math.round(Number(item.confidence || 0) * 100)} strokeColor="#dc2626" trailColor="#fecaca" strokeWidth={10} showInfo={false} />
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
}
