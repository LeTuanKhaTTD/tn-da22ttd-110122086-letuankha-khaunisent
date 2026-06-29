import { Ghost } from 'lucide-react';

/**
 * @param {{title: string, description: string, actionLabel?: string, onAction?: () => void}} props
 */
export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
        <Ghost className="h-6 w-6 text-slate-400" />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-slate-700">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
