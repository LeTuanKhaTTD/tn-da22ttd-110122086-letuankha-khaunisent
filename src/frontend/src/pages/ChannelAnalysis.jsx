import { useEffect, useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Card from '@/components/shared/Card';
import Badge from '@/components/shared/Badge';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import { useChannelAnalysis, useHealth } from '@/hooks/useAnalysis';

export default function ChannelAnalysis() {
  const [form, setForm] = useState({
    username: 'travinhuniversity',
    apify_token: '',
    max_videos: 10,
    comments_per_video: 50,
    model: 'auto',
  });

  const { data, loading, error, progress, run, useMock } = useChannelAnalysis();
  const { health } = useHealth();

  const geminiAvailable = health?.gemini_status === 'enabled';
  const modelOptions = useMemo(() => {
    const options = [
      { value: 'auto', label: 'Tự động' },
      { value: 'phobert', label: 'PhoBERT' },
    ];
    if (geminiAvailable) {
      options.push({ value: 'gemini', label: 'Gemini' });
    }
    return options;
  }, [geminiAvailable]);

  useEffect(() => {
    if (!geminiAvailable && form.model === 'gemini') {
      setForm((prev) => ({ ...prev, model: 'auto' }));
    }
  }, [geminiAvailable, form.model]);

  const resolvedModel = geminiAvailable || form.model !== 'auto' ? form.model : 'phobert';

  const handleSubmit = (event) => {
    event.preventDefault();
    run({ ...form, model: resolvedModel });
  };

  const progressPercent = progress.total ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">Username kênh</label>
            <input
              required
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Apify Token</label>
            <input
              type="password"
              required
              value={form.apify_token}
              onChange={(event) => setForm((prev) => ({ ...prev, apify_token: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Max Videos: {form.max_videos}</label>
            <input
              type="range"
              min="5"
              max="50"
              value={form.max_videos}
              onChange={(event) => setForm((prev) => ({ ...prev, max_videos: Number(event.target.value) }))}
              className="mt-4 w-full"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Comments / Video: {form.comments_per_video}</label>
            <input
              type="range"
              min="20"
              max="200"
              step="10"
              value={form.comments_per_video}
              onChange={(event) => setForm((prev) => ({ ...prev, comments_per_video: Number(event.target.value) }))}
              className="mt-4 w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Model</label>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              {modelOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="channel-model"
                    value={option.value}
                    checked={form.model === option.value}
                    onChange={() => setForm((prev) => ({ ...prev, model: option.value }))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white"
            >
              Phân tích Kênh
            </button>
          </div>
        </form>
      </Card>

      {loading ? (
        <LoadingState title={`Đang xử lý video ${progress.current}/${progress.total}`} subtitle={`${progressPercent}% hoàn tất`} />
      ) : null}

      {error && !data ? (
        <EmptyState title="Không có dữ liệu" description={error} actionLabel="Xem dữ liệu mẫu" onAction={useMock} />
      ) : null}

      {data ? (
        <div className="space-y-6">
          <Card className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img src={data.channel.avatar} alt="avatar" className="h-16 w-16 rounded-full object-cover" />
              <div>
                <p className="text-sm text-slate-500">{data.channel.username}</p>
                <p className="text-lg font-semibold text-slate-800">{data.channel.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Tổng video</p>
                <p className="text-lg font-semibold text-slate-800">{data.kpis.totalVideos}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tổng BL</p>
                <p className="text-lg font-semibold text-slate-800">{data.kpis.totalComments}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Positive</p>
                <p className="text-lg font-semibold text-success">{data.kpis.avgPositive}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg Negative</p>
                <p className="text-lg font-semibold text-danger">{data.kpis.avgNegative}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-slate-800">Xu hướng cảm xúc theo video</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="positive" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="neutral" stroke="#94a3b8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">Bảng xếp hạng video</h3>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Xuất báo cáo</button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Video</th>
                    <th className="px-4 py-3">BL</th>
                    <th className="px-4 py-3">Pos%</th>
                    <th className="px-4 py-3">Neg%</th>
                    <th className="px-4 py-3">Neu%</th>
                    <th className="px-4 py-3">Que%</th>
                    <th className="px-4 py-3">Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ranking.map((row, index) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{row.title}</td>
                      <td className="px-4 py-3 text-slate-700">{row.comments}</td>
                      <td className="px-4 py-3 text-success">{row.pos}%</td>
                      <td className="px-4 py-3 text-danger">{row.neg}%</td>
                      <td className="px-4 py-3 text-slate-500">{row.neu}%</td>
                      <td className="px-4 py-3 text-question">{row.que}%</td>
                      <td className="px-4 py-3">
                        <Badge label={row.rating} tone={row.rating === 'Tốt' ? 'success' : row.rating === 'Cần xem' ? 'danger' : 'warning'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-slate-800">Top bình luận tiêu cực</h3>
            <div className="mt-4 space-y-3">
              {data.negatives.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-100 px-4 py-3">
                  <p className="text-sm text-slate-700">{item.text}</p>
                  <p className="text-xs text-slate-400">Likes: {item.likes}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
