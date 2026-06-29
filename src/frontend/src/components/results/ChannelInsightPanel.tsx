import { Alert, Col, Row, Statistic, Tag, Typography } from 'antd';
import { AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import { EmotionLabel, type ChannelAnalysisResponse } from '@/types/analysis';
import { buildVideoRiskProfiles } from '@/utils/channelRisk';
import { formatPercent } from '@/utils/formatters';

interface ChannelInsightPanelProps {
  result: ChannelAnalysisResponse;
}

function getChannelConclusion(negativePercent: number, positivePercent: number, highRiskCount: number) {
  if (highRiskCount > 0 || negativePercent >= 30) {
    return {
      type: 'error' as const,
      icon: <AlertTriangle size={18} />,
      title: 'Kênh có rủi ro cảm xúc cần theo dõi',
      message: `Tỷ lệ tiêu cực ${formatPercent(negativePercent / 100)}. Ưu tiên xem các video có negative cao trước khi đưa vào báo cáo.`,
    };
  }

  if (negativePercent >= 15) {
    return {
      type: 'warning' as const,
      icon: <TrendingUp size={18} />,
      title: 'Cảm xúc kênh tương đối ổn nhưng còn điểm nhạy cảm',
      message: `Tỷ lệ tiêu cực ${formatPercent(negativePercent / 100)}. Nên kiểm tra nhóm video rủi ro trung bình.`,
    };
  }

  return {
    type: 'success' as const,
    icon: <ShieldCheck size={18} />,
    title: positivePercent >= 50 ? 'Cảm xúc kênh đang tích cực' : 'Cảm xúc kênh đang ổn định',
    message: `Tỷ lệ tích cực ${formatPercent(positivePercent / 100)}, tiêu cực ${formatPercent(negativePercent / 100)}.`,
  };
}

export default function ChannelInsightPanel({ result }: ChannelInsightPanelProps) {
  const distribution = result.channel_summary.distribution || {};
  const positive = Number(distribution[EmotionLabel.Positive] || 0);
  const negative = Number(distribution[EmotionLabel.Negative] || 0);
  const neutral = Number(distribution[EmotionLabel.Neutral] || 0);
  const total = positive + negative + neutral || result.channel_summary.total_comments || 0;
  const positivePercent = total ? (positive / total) * 100 : 0;
  const negativePercent = total ? (negative / total) * 100 : 0;
  const riskProfiles = buildVideoRiskProfiles(result.videos || []);
  const highRisk = riskProfiles.filter((item) => item.riskLevel === 'high').length;
  const mediumRisk = riskProfiles.filter((item) => item.riskLevel === 'medium').length;
  const conclusion = getChannelConclusion(negativePercent, positivePercent, highRisk);

  return (
    <Card title="Nhận định sức khỏe kênh" className="section-card">
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={10}>
          <Alert
            type={conclusion.type}
            showIcon
            icon={conclusion.icon}
            message={conclusion.title}
            description={conclusion.message}
            className="h-full"
          />
        </Col>
        <Col xs={24} lg={14}>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <Statistic title="Video rủi ro cao" value={highRisk} valueStyle={{ color: '#dc2626', fontWeight: 800 }} />
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <Statistic title="Rủi ro trung bình" value={mediumRisk} valueStyle={{ color: '#d97706', fontWeight: 800 }} />
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <Statistic title="Tiêu cực" value={negativePercent} precision={1} suffix="%" valueStyle={{ color: '#ef4444', fontWeight: 800 }} />
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <Statistic title="Tích cực" value={positivePercent} precision={1} suffix="%" valueStyle={{ color: '#22c55e', fontWeight: 800 }} />
            </div>
          </div>
          <Typography.Paragraph className="mt-3 mb-0 text-slate-500">
            Ngưỡng rủi ro: <Tag color="green">Thấp &lt; 15%</Tag>
            <Tag color="orange">15-30%</Tag>
            <Tag color="red">&gt;= 30%</Tag>
          </Typography.Paragraph>
        </Col>
      </Row>
    </Card>
  );
}
