import { Button, Progress, Table, Tag, Typography } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import Card from '@/components/ui/Card';
import { buildVideoRiskProfiles } from '@/utils/channelRisk';
import { formatCount } from '@/utils/formatters';
import type { ChannelAnalysisResponse } from '@/types/analysis';

interface RiskVideoTableProps {
  result: ChannelAnalysisResponse;
}

export default function RiskVideoTable({ result }: RiskVideoTableProps) {
  const data = buildVideoRiskProfiles(result.videos || [])
    .sort((left, right) => {
      if (right.negativePercent !== left.negativePercent) {
        return right.negativePercent - left.negativePercent;
      }
      return right.negative - left.negative;
    })
    .slice(0, 8)
    .map((item, index) => ({
      key: item.video.video_id || index,
      index: index + 1,
      title: item.title,
      url: item.video.url,
      negative: item.negative,
      total: item.total,
      negativePercent: item.negativePercent,
      riskLabel: item.riskLabel,
      riskColor: item.riskColor,
      commentsCount: item.video.comments_count || item.video.comments.length,
      likes: item.video.likes || 0,
    }));

  return (
    <Card title="Top video rủi ro theo tỷ lệ tiêu cực" className="section-card">
      <Table
        size="small"
        pagination={false}
        dataSource={data}
        columns={[
          { title: '#', dataIndex: 'index', width: 48 },
          {
            title: 'Video',
            dataIndex: 'title',
            ellipsis: true,
            render: (value) => <Typography.Text strong>{value}</Typography.Text>,
          },
          {
            title: 'Risk',
            dataIndex: 'riskLabel',
            width: 110,
            render: (value, row) => <Tag color={row.riskColor}>{value}</Tag>,
          },
          {
            title: 'Negative',
            dataIndex: 'negativePercent',
            width: 180,
            render: (value, row) => (
              <div>
                <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                  <span>{Number(value).toFixed(1)}%</span>
                  <span>{formatCount(row.negative)}/{formatCount(row.total)}</span>
                </div>
                <Progress percent={Number(value.toFixed(1))} showInfo={false} strokeColor="#ef4444" />
              </div>
            ),
          },
          {
            title: 'Comments',
            dataIndex: 'commentsCount',
            align: 'right',
            width: 110,
            render: (value) => formatCount(Number(value)),
          },
          {
            title: 'Likes',
            dataIndex: 'likes',
            align: 'right',
            width: 100,
            render: (value) => formatCount(Number(value)),
          },
          {
            title: '',
            dataIndex: 'url',
            width: 96,
            render: (url) =>
              url ? (
                <Button href={url} target="_blank" rel="noreferrer" icon={<LinkOutlined />} size="small">
                  Mở
                </Button>
              ) : null,
          },
        ]}
      />
    </Card>
  );
}
