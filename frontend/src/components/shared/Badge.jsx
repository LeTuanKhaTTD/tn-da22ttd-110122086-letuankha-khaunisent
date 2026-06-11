/**
 * @param {{label: string, tone?: 'success'|'danger'|'warning'|'info'|'neutral'|'question'}} props
 */
export default function Badge({ label, tone = 'neutral' }) {
  const toneMap = {
    success: 'bg-success/15 text-success',
    danger: 'bg-danger/15 text-danger',
    warning: 'bg-warning/15 text-warning',
    info: 'bg-primary/15 text-primary',
    neutral: 'bg-neutral/15 text-slate-600',
    question: 'bg-question/15 text-question',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>
      {label}
    </span>
  );
}
