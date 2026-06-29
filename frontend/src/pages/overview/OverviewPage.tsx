import { Button, Space } from 'antd';
import {
  ArrowRightOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  LineChartOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { useHealth } from '@/hooks/useAnalysis';
import type { HealthResponse } from '@/types/health';
import {
  count,
  MetricCard,
  ModelSummary,
  StatusPill,
  SystemStatus,
} from '@/components/overview/OverviewCards';

export default function OverviewPage() {
  const navigate = useNavigate();
  const healthQuery = useHealth();

  if (healthQuery.loading && !healthQuery.health) {
    return <LoadingState message="Đang tải trạng thái hệ thống..." fullPage />;
  }

  if (healthQuery.error || !healthQuery.health) {
    return (
      <EmptyState
        title="Không lấy được trạng thái backend"
        subtitle="Kiểm tra FastAPI ở cổng 8000 và thử lại."
        actionLabel="Thử lại"
        onAction={() => healthQuery.refresh()}
      />
    );
  }

  const health = healthQuery.health as HealthResponse;
  const ready = Boolean(health.model_loaded);
  const model = health.model || {};
  const metrics = [
    {
      label: 'Tổng dataset fine-tune',
      value: count(model.dataset_size),
      icon: DatabaseOutlined,
      tone: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Train split',
      value: count(model.train_size),
      icon: LineChartOutlined,
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Validation split',
      value: count(model.val_size),
      icon: DashboardOutlined,
      tone: 'bg-cyan-50 text-cyan-600',
    },
    {
      label: 'Test độc lập',
      value: count(model.test_size),
      icon: ExperimentOutlined,
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <Space direction="vertical" size={20} className="w-full">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="section-card bg-white p-0">
          <div className="p-7">
            <Space size={8} wrap>
              <StatusPill ok={ready} label={ready ? 'Backend sẵn sàng' : 'Backend chưa sẵn sàng'} />
              <StatusPill ok={health.model_mode === 'phobert'} label="PhoBERT fine-tuned" />
              <StatusPill
                ok={Boolean(health.apify_configured)}
                label={health.apify_configured ? 'Apify đã cấu hình' : 'Thiếu Apify token'}
              />
            </Space>

            <h1 className="m-0 mt-7 text-4xl font-extrabold tracking-tight text-slate-950">KhaUniSent</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Dashboard vận hành cho phân tích cảm xúc bình luận TikTok tiếng Việt bằng PhoBERT fine-tuned.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="primary" size="large" icon={<RocketOutlined />} onClick={() => navigate('/video')}>
                Phân tích video
              </Button>
              <Button size="large" icon={<DashboardOutlined />} onClick={() => navigate('/channel')}>
                Phân tích kênh
              </Button>
              <Button size="large" icon={<ArrowRightOutlined />} onClick={() => navigate('/model-test')}>
                Test model
              </Button>
            </div>
          </div>
        </Card>

        <SystemStatus health={health} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <MetricCard key={item.label} {...item} />
        ))}
      </div>

      <ModelSummary health={health} />

      <div className="flex justify-end">
        <Button icon={<ReloadOutlined />} onClick={() => healthQuery.refresh()}>
          Làm mới trạng thái
        </Button>
      </div>
    </Space>
  );
}

