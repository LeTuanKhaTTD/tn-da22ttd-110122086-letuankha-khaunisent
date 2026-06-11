import { useMemo, useState } from 'react';
import { BrainCircuit, Loader2, Play, RotateCcw } from 'lucide-react';
import Card from '@/components/shared/Card';
import Badge from '@/components/shared/Badge';
import { analyzeComment } from '@/services/api';
import { SENTIMENT_COLORS } from '@/utils/constants';
import { toastError, toastSuccess } from '@/utils/toast';

const SENTIMENT_LABELS = {
  positive: 'Tích cực',
  negative: 'Tiêu cực',
  neutral: 'Trung tính',
};

const SAMPLE_COMMENTS = [
  'Trường mình tổ chức sự kiện rất chuyên nghiệp, em rất thích không khí này',
  'Video đẹp nhưng phần âm thanh hơi khó nghe',
  'Học phí tăng làm sinh viên khá áp lực',
];

function formatPercent(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function sentimentTone(sentiment) {
  if (sentiment === 'positive') return 'success';
  if (sentiment === 'negative') return 'danger';
  return 'neutral';
}

export default function ModelTestPage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const scores = useMemo(() => {
    const rawScores = result?.scores || {};
    return ['positive', 'neutral', 'negative'].map((label) => ({
      label,
      name: SENTIMENT_LABELS[label],
      value: Number(rawScores[label] || 0),
      color: SENTIMENT_COLORS[label],
    }));
  }, [result]);

  const handleAnalyze = async () => {
    const value = text.trim();
    if (!value) {
      toastError('Vui lòng nhập comment cần test');
      return;
    }

    try {
      setLoading(true);
      const payload = await analyzeComment({ text: value, model: 'phobert' });
      setResult(payload.result || null);
      toastSuccess('Đã phân tích comment bằng PhoBERT');
    } catch (error) {
      toastError(error.message || 'Không phân tích được comment');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5 p-6 lg:p-8">
            <div className="space-y-3">
              <Badge label="Test nhanh PhoBERT" tone="info" />
              <h2 className="text-3xl font-semibold leading-tight text-slate-950">
                Kiểm thử sentiment cho một comment bất kỳ
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">
                Dùng trong lúc bảo vệ để nhập trực tiếp một bình luận, chạy PhoBERT fine-tuned và xem xác suất của cả 3 nhãn.
              </p>
            </div>

            <div className="space-y-3">
              <label htmlFor="comment-test" className="text-sm font-semibold text-slate-800">
                Comment cần phân tích
              </label>
              <textarea
                id="comment-test"
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={6}
                maxLength={1000}
                placeholder="Nhập một bình luận tiếng Việt bất kỳ..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Model sử dụng: PhoBERT fine-tuned</span>
                <span>{text.length}/1000</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SAMPLE_COMMENTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setText(sample)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Phân tích bằng PhoBERT
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                Làm mới
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-6 text-white lg:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <BrainCircuit className="h-6 w-6 text-cyan-200" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">PhoBERT inference</p>
                <h3 className="text-xl font-semibold">Kết quả model</h3>
              </div>
            </div>

            {result ? (
              <div className="mt-8 space-y-6">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Nhãn dự đoán</p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-4xl font-bold" style={{ color: SENTIMENT_COLORS[result.sentiment] }}>
                        {SENTIMENT_LABELS[result.sentiment] || result.sentiment}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">Confidence: {formatPercent(result.confidence)}</p>
                    </div>
                    <Badge label={result.method || 'phobert'} tone={sentimentTone(result.sentiment)} />
                  </div>
                </div>

                <div className="space-y-3">
                  {scores.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-100">{item.name}</span>
                        <span className="text-slate-300">{formatPercent(item.value)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.max(item.value * 100, 2)}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Text sau tiền xử lý</p>
                  <p className="mt-2 text-sm leading-6 text-slate-100">{result.text_clean || result.text}</p>
                </div>
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm leading-6 text-slate-300">
                Nhập comment ở bên trái rồi bấm phân tích. Kết quả sẽ hiển thị nhãn, confidence và xác suất của từng lớp sentiment.
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
