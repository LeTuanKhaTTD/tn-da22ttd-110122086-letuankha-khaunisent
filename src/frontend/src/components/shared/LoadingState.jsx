/**
 * @param {{title: string, subtitle?: string}} props
 */
export default function LoadingState({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white px-6 py-10 shadow-card">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle ? <p className="text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
