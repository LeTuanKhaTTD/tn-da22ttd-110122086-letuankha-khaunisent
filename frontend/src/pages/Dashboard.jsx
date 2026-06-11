import { Activity, BarChart2, MessageCircle, Users } from 'lucide-react';
import Card from '@/components/shared/Card';
import Badge from '@/components/shared/Badge';
import { useDashboardStats, useHealth } from '@/hooks/useAnalysis';

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString('vi-VN');
}

export default function Dashboard() {
  const { health, loading, error, refresh } = useHealth();
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();

  const statCards = [
    {
      label: 'Tổng video đã phân tích',
      value: stats ? stats.total_videos.toLocaleString('vi-VN') : '--',
      icon: BarChart2,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Tổng bình luận đã xử lý',
      value: stats ? stats.total_comments.toLocaleString('vi-VN') : '--',
      icon: MessageCircle,
      color: 'text-question',
      bg: 'bg-question/10',
    },
    {
      label: 'Tỷ lệ tích cực trung bình',
      value: stats ? `${stats.positive_percent.toFixed(1)}%` : '--',
      icon: Activity,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Bình luận TB/video',
      value: stats ? stats.avg_comments_per_video.toLocaleString('vi-VN') : '--',
      icon: Users,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  const geminiLabel = health?.gemini_status === 'enabled'
    ? 'Enabled'
    : health?.gemini_status === 'invalid'
    ? 'Invalid'
    : 'Disabled';
  const geminiTone = health?.gemini_status === 'enabled'
    ? 'success'
    : health?.gemini_status === 'invalid'
    ? 'danger'
    : 'warning';

  const systemStatus = loading
    ? { label: 'Đang kiểm tra', tone: 'warning', dot: 'bg-warning' }
    : health?.model_loaded
    ? { label: 'Sẵn sàng', tone: 'success', dot: 'bg-success' }
    : { label: 'Chưa sẵn sàng', tone: 'danger', dot: 'bg-danger' };


  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-500">Chào mừng đến với</p>
            <h2 className="text-2xl font-semibold text-slate-800">TikUniSent Dashboard</h2>
            <p className="text-sm text-slate-500">
              Hệ thống phân tích cảm xúc bình luận TikTok tiếng Việt, ưu tiên dữ liệu thật và khả năng vận hành ổn định.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={systemStatus.label} tone={systemStatus.tone} />
            <Badge label={`Model: ${health?.model_mode || 'phobert'}`} tone="info" />
            <Badge label={`Device: ${health?.device || 'cpu'}`} tone="neutral" />
            <Badge label={`Gemini: ${geminiLabel}`} tone={geminiTone} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex h-3 w-3 animate-pulse rounded-full ${systemStatus.dot}`} />
          <p className="text-sm text-slate-600">
            {loading ? 'Đang kiểm tra trạng thái hệ thống...' : health?.model_loaded ? 'Backend sẵn sàng xử lý phân tích.' : 'Backend chưa sẵn sàng.'}
          </p>
        </div>
        {error ? (
          <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">{stat.value}</p>
                {statsLoading ? <p className="text-xs text-slate-400">Đang tải dữ liệu...</p> : null}
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Thông tin model</h3>
            <p className="text-sm text-slate-500">Trạng thái vận hành và khả năng sẵn sàng hiện tại.</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span className="text-sm text-slate-500">Model</span>
            <Badge label={health?.model_mode || 'phobert'} tone="info" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span className="text-sm text-slate-500">Thiết bị</span>
            <Badge label={health?.device || 'cpu'} tone="neutral" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span className="text-sm text-slate-500">Trạng thái model</span>
            <Badge label={health?.model_loaded ? 'Sẵn sàng' : 'Chưa sẵn sàng'} tone={health?.model_loaded ? 'success' : 'danger'} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
            <span className="text-sm text-slate-500">Gemini</span>
            <Badge label={geminiLabel} tone={geminiTone} />
          </div>
        </div>
      </Card>
    </div>
  );
}
