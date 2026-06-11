import { Menu, RefreshCcw } from 'lucide-react';
import Badge from '@/components/shared/Badge';

export default function Header({ title, breadcrumbs, health, onRefresh, onToggleSidebar }) {
  const statusTone = health?.model_loaded ? 'success' : 'danger';
  const statusLabel = health?.model_loaded ? 'PhoBERT sẵn sàng' : 'Model lỗi';

  return (
    <header className="app-header sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 px-6">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          aria-label="Thu gọn menu"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400">{breadcrumbs.join(' / ')}</p>
          <h1 className="truncate text-xl font-bold text-slate-950">{title}</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Badge label={statusLabel} tone={statusTone} />
        <Badge label={health?.model_mode || 'phobert'} tone="info" />
        <Badge label={health?.device || 'cpu'} tone="neutral" />
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <RefreshCcw className="h-4 w-4" />
          Làm mới
        </button>
      </div>
    </header>
  );
}
