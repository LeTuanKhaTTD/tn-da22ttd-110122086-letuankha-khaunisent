import { useEffect, useMemo, useState } from 'react';
import { Download, FileJson, Search, Share2 } from 'lucide-react';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Card from '@/components/shared/Card';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { useHealth, useVideoAnalysis } from '@/hooks/useAnalysis';

const LABEL_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'positive', label: 'Positive' },
  { key: 'negative', label: 'Negative' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'question', label: 'Question' },
];

function formatPercent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function exportFile(content, filename, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function VideoAnalysis() {
  const [form, setForm] = useState({
    url: '',
    apify_token: '',
    max_comments: 100,
    model: 'auto',
  });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const { data, loading, error, step, run, useMock } = useVideoAnalysis();
  const { health } = useHealth();

  const geminiAvailable = health?.gemini_status === 'enabled';
  const modelOptions = useMemo(() => {
    const options = [
      { value: 'auto', label: 'Tự động', desc: 'Khuyến nghị' },
      { value: 'phobert', label: 'PhoBERT', desc: 'Nhanh, offline' },
    ];
    if (geminiAvailable) {
      options.push({ value: 'gemini', label: 'Gemini', desc: 'Chính xác hơn' });
    }
    return options;
  }, [geminiAvailable]);

  useEffect(() => {
    if (!geminiAvailable && form.model === 'gemini') {
      setForm((prev) => ({ ...prev, model: 'auto' }));
    }
  }, [geminiAvailable, form.model]);

  const filteredComments = useMemo(() => {
    if (!data?.comments) return [];
    return data.comments.filter((item) => {
      if (activeTab !== 'all' && item.label !== activeTab) return false;
      if (search && !item.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, activeTab, search]);

  const pagedComments = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredComments.slice(start, start + pageSize);
  }, [filteredComments, page]);

  const resolvedModel = geminiAvailable || form.model !== 'auto' ? form.model : 'phobert';

  const handleSubmit = (event) => {
    event.preventDefault();
    run({ ...form, model: resolvedModel });
  };

  const summary = data?.summary;
  const conclusion = summary
    ? summary.positive >= summary.negative + 20
      ? { label: 'Tích cực', tone: 'success' }
      : summary.negative >= summary.positive
      ? { label: 'Tiêu cực', tone: 'danger' }
      : { label: 'Cần xem xét', tone: 'warning' }
    : null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">TikTok URL</label>
            <input
              type="url"
              required
              value={form.url}
              onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="https://www.tiktok.com/@.../video/..."
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Apify Token</label>
            <input
              type="password"
              required
              value={form.apify_token}
              onChange={(event) => setForm((prev) => ({ ...prev, apify_token: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Max Comments: {form.max_comments}</label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={form.max_comments}
              onChange={(event) => setForm((prev) => ({ ...prev, max_comments: Number(event.target.value) }))}
              className="mt-4 w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Model</label>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {modelOptions.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="radio"
                    name="model"
                    value={option.value}
                    checked={form.model === option.value}
                    onChange={() => setForm((prev) => ({ ...prev, model: option.value }))}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{option.label}</p>
                    <p className="text-xs text-slate-400">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-blue-700"
            >
              Phân tích Video
            </button>
          </div>
        </form>
      </Card>

      {loading ? <LoadingState title={step || 'Đang xử lý...'} subtitle="Vui lòng chờ trong giây lát" /> : null}

      {error && !data ? (
        <EmptyState title="Không có dữ liệu" description={error} actionLabel="Xem dữ liệu mẫu" onAction={useMock} />
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Tổng bình luận</p>
              <p className="mt-2 text-2xl font-semibold text-slate-800">{summary.total}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Positive%</p>
              <p className="mt-2 text-2xl font-semibold text-success">{formatPercent(summary.positive, summary.total)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Negative%</p>
              <p className="mt-2 text-2xl font-semibold text-danger">{formatPercent(summary.negative, summary.total)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Question%</p>
              <p className="mt-2 text-2xl font-semibold text-question">{formatPercent(summary.question, summary.total)}</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[55%_45%]">
            <Card className="p-5">
              <h3 className="text-base font-semibold text-slate-800">Phân bố cảm xúc</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.distribution} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={3}>
                      {data.distribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                {data.distribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-slate-500">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-slate-100" />
                <div>
                  <p className="text-sm text-slate-500">Thông tin video</p>
                  <p className="text-base font-semibold text-slate-800">{data.video.title}</p>
                  <a href={data.video.url} className="text-xs text-primary" target="_blank" rel="noreferrer">
                    Mở TikTok
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
                <div>Views: {data.video.views}</div>
                <div>Likes: {data.video.likes}</div>
                <div>Comments: {data.video.comments}</div>
                <div>Shares: {data.video.shares}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Điểm đánh giá</p>
                <p className="text-lg font-semibold text-slate-800">{Math.round(summary.avgConfidence * 100)}%</p>
              </div>
              {conclusion ? <Badge label={conclusion.label} tone={conclusion.tone} /> : null}
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-800">Bình luận</h3>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm kiếm nội dung..."
                    className="rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  {LABEL_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        activeTab === tab.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Nội dung</th>
                    <th className="px-4 py-3">Nhãn</th>
                    <th className="px-4 py-3">Độ tin cậy</th>
                    <th className="px-4 py-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedComments.map((item, index) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500">{(page - 1) * pageSize + index + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{item.text}</td>
                      <td className="px-4 py-3">
                        <Badge
                          label={item.label}
                          tone={
                            item.label === 'positive'
                              ? 'success'
                              : item.label === 'negative'
                              ? 'danger'
                              : item.label === 'question'
                              ? 'question'
                              : 'neutral'
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${Math.round(item.confidence * 100)}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">Hiển thị {pagedComments.length} / {filteredComments.length} bình luận</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-sm"
                >
                  Sau
                </button>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => exportFile(JSON.stringify(data, null, 2), 'video-analysis.json')}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <FileJson className="h-4 w-4" />
              Xuất JSON
            </button>
            <button
              type="button"
              onClick={() => exportFile(JSON.stringify(data.comments), 'video-comments.csv', 'text/csv')}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(data.summary))}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <Share2 className="h-4 w-4" />
              Sao chép báo cáo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
