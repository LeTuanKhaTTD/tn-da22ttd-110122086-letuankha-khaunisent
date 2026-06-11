import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, History as HistoryIcon, RefreshCw } from 'lucide-react';
import Card from '@/components/shared/Card';
import EmptyState from '@/components/shared/EmptyState';
import { getAnalysisHistory } from '@/services/api';
import { loadAnalysisHistory } from '@/utils/historyStorage';

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('vi-VN');
}

function toCount(value) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    return Number(value.count ?? value.total ?? 0);
  }
  return 0;
}

function extractVideoId(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.includes('/video/')) {
    return value.split('/video/')[1]?.split(/[/?#]/)[0] || '';
  }
  return value.split(/[/?#]/).filter(Boolean).pop() || '';
}

function normalizeEntry(entry) {
  const summary = entry?.summary || {};
  const input = entry?.input || {};
  const videoId = entry?.type === 'video' ? extractVideoId(input.url) : '';
  const fallbackTitle = entry?.type === 'channel' ? 'Phân tích kênh' : 'Phân tích video';

  return {
    id: entry?.id || `${entry?.type || 'item'}-${entry?.created_at || Math.random()}`,
    type: entry?.type || 'analysis',
    title: entry?.title || fallbackTitle,
    target_label: entry?.target_label || (entry?.type === 'video' ? `Video ID: ${videoId || '--'}` : input.username ? `@${input.username.replace(/^@/, '')}` : '--'),
    model_used: entry?.model_used || 'phobert',
    created_at: entry?.created_at || '',
    input,
    hasDetail: Boolean(entry?.result),
    summary: {
      total: summary.total ?? summary.comments_analyzed ?? summary.total_comments ?? 0,
      positive: toCount(summary.positive),
      neutral: toCount(summary.neutral),
      negative: toCount(summary.negative),
      total_videos: summary.total_videos ?? 0,
    },
  };
}

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    const localRecords = loadAnalysisHistory().map(normalizeEntry);
    try {
      setError('');
      const payload = await getAnalysisHistory(30);
      const remoteRecords = Array.isArray(payload?.items) ? payload.items.map(normalizeEntry) : [];
      setItems(localRecords.length ? localRecords : remoteRecords);
    } catch {
      setItems(localRecords);
      setError(localRecords.length ? 'Đang hiển thị lịch sử lưu cục bộ.' : 'Không tải được lịch sử phân tích.');
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const videos = items.filter((item) => item.type === 'video').length;
    const channels = items.filter((item) => item.type === 'channel').length;
    return { total, videos, channels };
  }, [items]);

  if (!items.length) {
    return (
      <EmptyState
        title="Chưa có lịch sử"
        description="Sau khi phân tích video hoặc kênh, bấm lưu kết quả để xem lại đầy đủ tại đây."
        actionLabel="Tải lại"
        onAction={loadHistory}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-500">
              <HistoryIcon className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-[0.12em]">Lịch sử phân tích</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Các phiên phân tích gần nhất</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Mỗi bản ghi hiển thị rõ video hoặc kênh đã phân tích, giúp đối chiếu kết quả và mở lại chi tiết nhanh hơn.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[320px]">
            <Metric label="Tổng" value={stats.total} tone="slate" />
            <Metric label="Video" value={stats.videos} tone="blue" />
            <Metric label="Kênh" value={stats.channels} tone="green" />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>{error || 'Lịch sử chi tiết được lưu cục bộ trên trình duyệt để mở lại nhanh.'}</span>
          <button type="button" onClick={loadHistory} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700">
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </Card>

      <div className="space-y-4">
        {items.map((entry) => (
          <Card key={entry.id} className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.type === 'channel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {entry.type === 'channel' ? 'Phân tích kênh' : 'Phân tích video'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Model: {entry.model_used}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{formatDate(entry.created_at)}</span>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{entry.title}</h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">{entry.target_label}</p>
                </div>

                {entry.type === 'video' && entry.input?.url ? (
                  <div className="space-y-1">
                    <p className="max-w-3xl break-all text-xs text-slate-500">{entry.input.url}</p>
                    <a href={entry.input.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                      Mở video gốc
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ) : null}

                {entry.type === 'channel' && entry.input?.username ? <p className="text-sm text-slate-600">Kênh: @{entry.input.username.replace(/^@/, '')}</p> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-5">
                <Metric label="Tổng" value={entry.summary.total} tone="slate" />
                <Metric label="Tích cực" value={entry.summary.positive} tone="green" />
                <Metric label="Trung tính" value={entry.summary.neutral} tone="slate" />
                <Metric label="Tiêu cực" value={entry.summary.negative} tone="red" />
                <Link
                  to={entry.hasDetail ? `/history/${entry.id}` : '/history'}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${entry.hasDetail ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-100 text-slate-400'}`}
                >
                  <Eye className="h-4 w-4" />
                  Xem chi tiết
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  const color = {
    slate: 'bg-slate-50 text-slate-900',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
  }[tone];

  return (
    <div className={`rounded-lg px-4 py-3 ${color}`}>
      <p className="text-xs uppercase opacity-75">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
