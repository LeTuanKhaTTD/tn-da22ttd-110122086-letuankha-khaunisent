import { useMemo, useState } from 'react';
import { ArrowRightLeft, Loader2, Play, RotateCcw, Sparkles } from 'lucide-react';
import Card from '@/components/shared/Card';
import Badge from '@/components/shared/Badge';
import { compareGemini } from '@/services/api';
import { SENTIMENT_COLORS } from '@/utils/constants';
import { toastError, toastSuccess } from '@/utils/toast';

const SAMPLE_TEXT = [
  'Trường tổ chức sự kiện rất chuyên nghiệp, em rất thích',
  'Học phí cao quá v',
  'Video đẹp nhưng phần âm thanh hơi khó nghe',
  'Thông tin tuyển sinh rõ ràng và dễ hiểu',
].join('\n');

const LABEL_TEXT = {
  positive: 'Tích cực',
  neutral: 'Trung tính',
  negative: 'Tiêu cực',
};

function parseLines(value) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function SentimentBadge({ label }) {
  const color = SENTIMENT_COLORS[label] || '#64748b';
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {LABEL_TEXT[label] || label || '--'}
    </span>
  );
}

export default function GeminiComparePage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const comments = useMemo(() => parseLines(text), [text]);

  const handleCompare = async () => {
    if (!comments.length) {
      toastError('Vui lòng nhập ít nhất một bình luận');
      return;
    }

    try {
      setLoading(true);
      const payload = await compareGemini({ texts: comments });
      setResult(payload);
      toastSuccess('Đã so sánh PhoBERT với Gemini');
    } catch (error) {
      toastError(error.message || 'Không thể so sánh với Gemini');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setText(SAMPLE_TEXT);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <Card className="section-card p-0">
        <div className="grid gap-0 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5 p-6 lg:p-8">
            <Badge label="Gemini chỉ dùng để so sánh" tone="info" />
            <div>
              <h2 className="m-0 text-3xl font-bold tracking-tight text-slate-950">
                So sánh PhoBERT fine-tuned với Gemini
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Nhập tối đa 10 bình luận. Backend sẽ chạy PhoBERT local và Gemini API trên cùng dữ liệu để đối chiếu nhãn cảm xúc.
              </p>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={9}
              maxLength={3000}
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="Mỗi dòng là một bình luận..."
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{comments.length}/10 bình luận sẽ được gửi để so sánh</span>
              <span>{text.length}/3000</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCompare}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                So sánh nhanh
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                Mẫu demo
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-6 text-white lg:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <ArrowRightLeft className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Đối chiếu mô hình</p>
                <h3 className="m-0 text-xl font-semibold">PhoBERT là kết quả chính</h3>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="m-0 text-xs text-slate-300">Tổng mẫu</p>
                <strong className="mt-1 block text-2xl">{result?.summary?.total ?? 0}</strong>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="m-0 text-xs text-slate-300">Đồng thuận</p>
                <strong className="mt-1 block text-2xl">{result?.summary?.agreement_percent ?? 0}%</strong>
              </div>
              <div className="rounded-xl bg-white/10 p-4">
                <p className="m-0 text-xs text-slate-300">Gemini</p>
                <strong className="mt-1 block truncate text-sm">{result?.model_used?.comparison || 'Chưa chạy'}</strong>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
              <Sparkles className="mr-2 inline h-4 w-4 text-amber-200" />
              Gemini phụ thuộc API bên ngoài, nên trang này chỉ dùng để so sánh và phân tích lỗi, không thay thế PhoBERT trong luồng video/kênh.
            </div>
          </div>
        </div>
      </Card>

      {result ? (
        <Card className="section-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="m-0 text-lg font-bold text-slate-950">Kết quả so sánh</h3>
            <p className="m-0 mt-1 text-sm text-slate-500">
              PhoBERT: {result.timings?.phobert_seconds}s · Gemini: {result.timings?.gemini_seconds}s
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Bình luận</th>
                  <th className="px-5 py-3">PhoBERT</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Gemini</th>
                  <th className="px-5 py-3">Kết luận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item, index) => (
                  <tr key={`${item.text}-${index}`} className="align-top">
                    <td className="max-w-md px-5 py-4 text-slate-700">{item.text}</td>
                    <td className="px-5 py-4"><SentimentBadge label={item.phobert.sentiment} /></td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{Number(item.phobert.confidence || 0).toFixed(4)}</td>
                    <td className="px-5 py-4"><SentimentBadge label={item.gemini.sentiment} /></td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${item.agreement ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {item.agreement ? 'Đồng thuận' : 'Cần xem lại'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
