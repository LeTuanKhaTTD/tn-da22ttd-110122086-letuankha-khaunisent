import { Alert, Space, Typography } from 'antd';
import { EmotionLabel, type CommentResult } from '@/types/analysis';
import { normalizeEmotion } from '@/utils/normalizeComment';
import { formatPercent } from '@/utils/formatters';

interface InsightPanelProps {
  comments: CommentResult[];
}

function buildInsightMessage(positiveRate: number, negativeRate: number) {
  if (negativeRate >= 0.3) {
    return 'Mẫu bình luận có tỷ lệ tiêu cực đáng chú ý';
  }

  if (positiveRate >= 0.6) {
    return 'Mẫu bình luận nghiêng về sắc thái tích cực';
  }

  return 'Sắc thái cảm xúc phân bố tương đối đa chiều';
}

export default function InsightPanel({ comments }: InsightPanelProps) {
  const total = comments.length;
  const negative = comments.filter((item) => normalizeEmotion(item.emotion) === EmotionLabel.Negative).length;
  const positive = comments.filter((item) => normalizeEmotion(item.emotion) === EmotionLabel.Positive).length;
  const negativeRate = total > 0 ? negative / total : 0;
  const positiveRate = total > 0 ? positive / total : 0;
  const neutralRate = total > 0 ? 1 - positiveRate - negativeRate : 0;

  const type = negativeRate >= 0.3 ? 'warning' : positiveRate >= 0.6 ? 'success' : 'info';

  return (
    <Alert
      type={type}
      showIcon
      message={buildInsightMessage(positiveRate, negativeRate)}
      description={
        <Space direction="vertical" size={4}>
          <Typography.Text>
            Trên <strong>{total}</strong> bình luận đã phân tích: tích cực <strong>{formatPercent(positiveRate)}</strong>,
            trung tính <strong>{formatPercent(neutralRate)}</strong>, tiêu cực <strong>{formatPercent(negativeRate)}</strong>.
          </Typography.Text>
        </Space>
      }
    />
  );
}
