import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, RotateCcw, Save, Sparkles } from 'lucide-react';
import Card from '@/components/shared/Card';
import EmptyState from '@/components/shared/EmptyState';
import LoadingState from '@/components/shared/LoadingState';
import Badge from '@/components/shared/Badge';
import { exportTrainQueue, getLabelQueue, mergeQueueToMaster, prelabelQueue, resetLabelQueue, saveLabelQueue } from '@/services/api';
import { toastError, toastInfo, toastSuccess } from '@/utils/toast';

const SENTIMENTS = [
  { value: 'positive', label: 'Tích cực', className: 'bg-emerald-600' },
  { value: 'neutral', label: 'Trung tính', className: 'bg-slate-600' },
  { value: 'negative', label: 'Tiêu cực', className: 'bg-rose-600' },
];

const REVIEW_STATES = [
  { value: 'keep', label: 'Giữ lại', tone: 'success', className: 'bg-primary' },
  { value: 'discard', label: 'Bỏ qua', tone: 'warning', className: 'bg-amber-500' },
  { value: 'pending', label: 'Chờ xử lý', tone: 'neutral', className: 'bg-slate-400' },
];

function normalizeComment(comment, index) {
  return {
    id: comment.cid || comment.comment_id || `${comment.video_id || 'video'}-${index}`,
    cid: comment.cid || '',
    text: comment.text || '',
    text_original: comment.text_original || comment.text || '',
    preprocessed: Boolean(comment.preprocessed),
    author: comment.author || '',
    likes: Number(comment.likes || 0),
    video_id: comment.video_id || '',
    video_url: comment.video_url || '',
    created_at: comment.created_at || '',
    sentiment: comment.sentiment || '',
    confidence: Number(comment.confidence || 0),
    review_state: comment.review_state || 'pending',
    use_for_training: Boolean(comment.use_for_training),
    method: comment.method || 'unlabeled',
    label_source: comment.label_source || '',
    suggested_sentiment: comment.suggested_sentiment || '',
    suggested_confidence: Number(comment.suggested_confidence || 0),
    suggested_method: comment.suggested_method || '',
  };
}

function unwrapPayload(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return payload.data || {};
  }
  return payload || {};
}

function toApiComment(comment) {
  const isApproved = comment.review_state === 'keep' && comment.sentiment;
  return {
    ...comment,
    // Khi người dùng đã duyệt trên UI, nhãn được xem là manual để dùng fine-tune.
    method: isApproved ? 'manual' : 'unlabeled',
    label_source: isApproved ? comment.label_source || 'manual' : comment.label_source,
    use_for_training: Boolean(isApproved),
  };
}

function statusLabel(value) {
  return REVIEW_STATES.find((item) => item.value === value) || REVIEW_STATES[2];
}

function sentimentLabel(value) {
  return SENTIMENTS.find((item) => item.value === value)?.label || 'Chưa chọn';
}

export default function LabelingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [modelPreference, setModelPreference] = useState(localStorage.getItem('label_model_preference') || 'phobert');
  const pageSize = 12;

  const loadQueue = async () => {
    try {
      setLoading(true);
      const payload = unwrapPayload(await getLabelQueue());
      setComments((payload.comments || []).map(normalizeComment));
    } catch {
      toastError('Không tải được hàng đợi gán nhãn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, []);

  const stats = useMemo(() => {
    const total = comments.length;
    const keep = comments.filter((item) => item.review_state === 'keep').length;
    const discard = comments.filter((item) => item.review_state === 'discard').length;
    const pending = total - keep - discard;
    const suggested = comments.filter((item) => item.suggested_sentiment).length;
    return { total, keep, discard, pending, suggested };
  }, [comments]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return comments.filter((item) => {
      const matchesSearch = !query || item.text.toLowerCase().includes(query) || item.author.toLowerCase().includes(query) || item.video_id.includes(query);
      const matchesFilter = filter === 'all' ? true : item.review_state === filter;
      return matchesSearch && matchesFilter;
    });
  }, [comments, search, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const currentItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  const updateComment = (id, patch) => {
    setComments((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const suggestionPatch = (item) => ({
    sentiment: item.suggested_sentiment,
    confidence: item.suggested_confidence,
    method: item.suggested_method || 'phobert',
    label_source: 'phobert',
    review_state: 'keep',
    use_for_training: true,
  });

  const handleUseSuggestionsOnPage = () => {
    const currentIds = new Set(currentItems.map((item) => item.id));
    let changed = 0;
    setComments((prev) => prev.map((item) => {
      if (!currentIds.has(item.id) || !item.suggested_sentiment) {
        return item;
      }
      changed += 1;
      return { ...item, ...suggestionPatch(item) };
    }));
    toastInfo(`Đã dùng gợi ý PhoBERT cho ${changed} comment trên trang hiện tại`);
  };

  const handleUseAllSuggestions = () => {
    let changed = 0;
    setComments((prev) => prev.map((item) => {
      if (!item.suggested_sentiment) {
        return item;
      }
      changed += 1;
      return { ...item, ...suggestionPatch(item) };
    }));
    toastInfo(`Đã dùng gợi ý PhoBERT cho ${changed} comment`);
  };

  const handleMarkPage = (reviewState) => {
    const currentIds = new Set(currentItems.map((item) => item.id));
    let skipped = 0;
    setComments((prev) => prev.map((item) => {
      if (!currentIds.has(item.id)) {
        return item;
      }
      if (reviewState === 'keep' && !item.sentiment) {
        skipped += 1;
        return item;
      }
      return { ...item, review_state: reviewState, use_for_training: reviewState === 'keep' };
    }));
    if (skipped) {
      toastInfo(`Co ${skipped} comment chua chon sentiment nen chua the giu lai`);
      return;
    }
    toastInfo(`Đã cập nhật ${currentIds.size} comment trên trang hiện tại`);
  };

  const buildPayload = () => ({
    metadata: {
      source_file: 'data/tong_hop_comment.json',
      updated_from_ui: true,
    },
    comments: comments.map(toApiComment),
  });

  const handleApplyModel = async () => {
    try {
      setSaving(true);
      const payload = unwrapPayload(await prelabelQueue({ ...buildPayload(), model_preference: modelPreference }));
      setComments((payload.comments || []).map(normalizeComment));
      localStorage.setItem('label_model_preference', modelPreference);
      toastSuccess('Đã gợi ý nhãn bằng PhoBERT');
    } catch {
      toastError('Không thể gợi ý nhãn bằng PhoBERT');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveLabelQueue(buildPayload());
      toastSuccess('Đã lưu tiến độ gán nhãn');
    } catch {
      toastError('Không lưu được nhãn');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndBack = async () => {
    await handleSave();
    navigate('/');
  };

  const handleReset = async () => {
    try {
      setSaving(true);
      const payload = unwrapPayload(await resetLabelQueue());
      setComments((payload.comments || []).map(normalizeComment));
      toastInfo('Đã đồng bộ lại comment chưa gán nhãn từ file master');
    } catch {
      toastError('Không thể khôi phục hàng đợi');
    } finally {
      setSaving(false);
    }
  };

  const handleExportTrain = async () => {
    try {
      setSaving(true);
      const result = await exportTrainQueue(buildPayload());
      toastSuccess(`Đã xuất bộ train manual: ${result.total_comments} comment`);
    } catch {
      toastError('Không xuất được dữ liệu train');
    } finally {
      setSaving(false);
    }
  };

  const handleMergeMaster = async () => {
    try {
      const eligible = comments.filter((item) => item.review_state === 'keep' && item.sentiment).length;
      if (!eligible) {
        toastError('Chua co comment nao duoc chon sentiment va danh dau Giu lai');
        return;
      }
      setSaving(true);
      const result = await mergeQueueToMaster(buildPayload());
      const trainTotal = result.train_export?.total_comments ?? 0;
      toastSuccess(`Đã gộp ${result.updated} comment vào master. Bộ train hiện có ${trainTotal} comment manual.`);
      await loadQueue();
    } catch {
      toastError('Không gộp được vào master');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState title="Đang tải hàng đợi gán nhãn..." subtitle="Đọc comment chưa có nhãn từ data/tong_hop_comment.json." />;
  }

  if (!comments.length) {
    return (
      <EmptyState
        title="Không có comment chưa gán nhãn"
        description="File comment hiện không còn dòng mới cần gán nhãn thủ công."
        actionLabel="Đồng bộ lại"
        onAction={loadQueue}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <Badge label="Hàng đợi gán nhãn" tone="info" />
            <h2 className="text-2xl font-semibold text-slate-900">Gán nhãn comment mới trước khi fine-tune</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Hệ thống tự lấy comment chưa có nhãn từ file master. Bạn có thể dùng PhoBERT để gợi ý, chỉnh lại thủ công, lưu tiến độ và quay lại sau.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Metric label="Tổng" value={stats.total} tone="slate" />
            <Metric label="Chờ xử lý" value={stats.pending} tone="slate" />
            <Metric label="Giữ lại" value={stats.keep} tone="green" />
            <Metric label="Bỏ qua" value={stats.discard} tone="amber" />
            <Metric label="Có gợi ý" value={stats.suggested} tone="blue" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Model gợi ý:</span>
          <select value={modelPreference} onChange={(event) => setModelPreference(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none">
            <option value="phobert">PhoBERT fine-tuned</option>
            <option value="auto">Tự động</option>
          </select>
          <ActionButton icon={Sparkles} label="Gợi ý bằng PhoBERT" onClick={handleApplyModel} disabled={saving} dark />
          <ActionButton icon={Save} label="Lưu tiến độ" onClick={handleSave} disabled={saving} />
          <ActionButton icon={ArrowLeft} label="Lưu và quay lại" onClick={handleSaveAndBack} disabled={saving} />
          <ActionButton icon={RotateCcw} label="Đồng bộ lại" onClick={handleReset} disabled={saving} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-800">Thao tác nhanh:</span>
          <button type="button" onClick={handleUseSuggestionsOnPage} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white">
            Dùng gợi ý trang này
          </button>
          <button type="button" onClick={handleUseAllSuggestions} className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 font-semibold text-primary">
            Dùng gợi ý toàn bộ
          </button>
          <button type="button" onClick={() => handleMarkPage('keep')} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700">
            Giữ lại trang này
          </button>
          <button type="button" onClick={() => handleMarkPage('discard')} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-700">
            Bỏ qua trang này
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo nội dung, tác giả hoặc video ID"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-primary">
            <option value="all">Tất cả</option>
            <option value="pending">Chờ xử lý</option>
            <option value="keep">Giữ lại</option>
            <option value="discard">Bỏ qua</option>
          </select>
          <button type="button" onClick={handleExportTrain} disabled={saving} className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary disabled:opacity-60">
            Xuất bộ train
          </button>
          <button type="button" onClick={handleMergeMaster} disabled={saving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:opacity-60">
            Gộp vào master + train
          </button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {currentItems.map((comment, index) => (
          <LabelCard
            key={comment.id}
            comment={comment}
            index={(currentPage - 1) * pageSize + index + 1}
            onChange={(patch) => updateComment(comment.id, patch)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <p>Đang hiển thị {currentItems.length} / {filtered.length} comment</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50">
            Trước
          </button>
          <span className="min-w-24 text-center font-semibold text-slate-800">{currentPage} / {pageCount}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))} disabled={currentPage === pageCount} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50">
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}

function LabelCard({ comment, index, onChange }) {
  const review = statusLabel(comment.review_state);
  const applySuggestion = () => {
    if (!comment.suggested_sentiment) return;
    onChange({
      sentiment: comment.suggested_sentiment,
      confidence: comment.suggested_confidence,
      method: comment.suggested_method || 'phobert',
      label_source: 'phobert',
      review_state: 'keep',
      use_for_training: true,
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={review.label} tone={review.tone} />
            <span className="text-xs text-slate-500">#{index}</span>
            {comment.preprocessed ? <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">Da tien xu ly</span> : null}
            {comment.sentiment ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{sentimentLabel(comment.sentiment)}</span> : null}
          </div>
          <p className="text-sm leading-6 text-slate-800">{comment.text || 'Comment trống'}</p>
          {comment.text_original && comment.text_original !== comment.text ? (
            <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold text-slate-600">Xem comment gốc</summary>
              <p className="mt-2 leading-5">{comment.text_original}</p>
            </details>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
        <Info label="Tác giả" value={comment.author || 'N/A'} />
        <Info label="Likes" value={comment.likes} />
        <Info label="Video" value={comment.video_id || 'N/A'} link={comment.video_url} />
        <Info label="Ngày tạo" value={comment.created_at || 'N/A'} />
      </div>

      {comment.suggested_sentiment ? (
        <div className="mt-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">PhoBERT gợi ý</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium text-slate-900">
              {sentimentLabel(comment.suggested_sentiment)} {comment.suggested_confidence ? `• ${(comment.suggested_confidence * 100).toFixed(1)}%` : ''}
            </p>
            <button type="button" onClick={applySuggestion} className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
              <Check className="h-4 w-4" />
              Dùng gợi ý
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Chọn nhãn sentiment</p>
          <div className="flex flex-wrap gap-2">
            {SENTIMENTS.map((item) => (
              <button key={item.value} type="button" onClick={() => onChange({ sentiment: item.value, label_source: 'manual', method: 'manual' })} className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${comment.sentiment === item.value ? item.className : 'bg-slate-300 text-slate-700'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái xử lý</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_STATES.map((item) => (
              <button key={item.value} type="button" onClick={() => onChange({ review_state: item.value, use_for_training: item.value === 'keep' })} className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${comment.review_state === item.value ? item.className : 'bg-slate-300 text-slate-700'}`}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value, link }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-400">{label}</p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="font-medium text-primary">{value}</a>
      ) : (
        <p className="font-medium text-slate-800">{value}</p>
      )}
    </div>
  );
}

function Metric({ label, value, tone }) {
  const colors = {
    slate: 'bg-slate-50 text-slate-900',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[tone] || colors.slate}`}>
      <p className="text-xs uppercase opacity-75">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, disabled, dark = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold disabled:opacity-60 ${dark ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
