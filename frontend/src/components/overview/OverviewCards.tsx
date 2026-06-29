import type { ComponentType } from 'react';
import { Progress, Tag } from 'antd';
import Card from '@/components/ui/Card';
import { formatCount, formatPercent } from '@/utils/formatters';
import type { HealthResponse } from '@/types/health';

export function pct(value?: number) {
  return formatPercent(Number(value ?? 0));
}

export function count(value?: number) {
  return value || value === 0 ? formatCount(value) : '--';
}

export function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Tag className="m-0 rounded-full px-3 py-1 font-semibold" color={ok ? 'green' : 'orange'}>
      {label}
    </Tag>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="section-card h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-sm font-medium text-slate-500">{label}</p>
          <p className="m-0 mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}>
          <Icon className="text-lg" />
        </div>
      </div>
    </Card>
  );
}

export function SystemStatus({ health }: { health: HealthResponse }) {
  const model = health.model || {};
  const ready = Boolean(health.model_loaded);
  const macroF1 = model.holdout_test_metrics?.baseline_f1_macro ?? model.test_f1_macro;
  const readiness = [
    { label: 'Backend', ok: ready },
    { label: 'PhoBERT', ok: health.model_mode === 'phobert' && ready },
    { label: 'Apify', ok: Boolean(health.apify_configured) },
  ];
  const readyPercent = Math.round((readiness.filter((item) => item.ok).length / readiness.length) * 100);

  return (
    <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/15">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Trạng thái hệ thống</p>
          <h3 className="m-0 mt-2 text-2xl font-bold">{ready ? 'Sẵn sàng' : 'Cần kiểm tra'}</h3>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-bold ${ready ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
          {ready ? 'ONLINE' : 'WAITING'}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs font-semibold text-slate-300">
          <span>Mức sẵn sàng</span>
          <span>{readyPercent}%</span>
        </div>
        <Progress percent={readyPercent} showInfo={false} strokeColor="#22c55e" trailColor="rgba(255,255,255,0.12)" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {readiness.map((item) => (
          <div key={item.label} className="rounded-xl bg-white/8 px-3 py-3">
            <span className="block text-xs text-slate-400">{item.label}</span>
            <strong className={item.ok ? 'text-emerald-200' : 'text-amber-200'}>{item.ok ? 'OK' : 'Check'}</strong>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Info label="Model" value={health.model_mode || 'phobert'} />
        <Info label="Thiết bị" value={health.device || 'cpu'} />
        <Info label="Dataset" value={count(model.dataset_size)} />
        <Info label="Macro F1" value={pct(macroF1)} />
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <strong className="mt-1 block truncate text-sm text-white">{value}</strong>
    </div>
  );
}

export function ModelSummary({ health }: { health: HealthResponse }) {
  const model = health.model || {};
  const holdout = model.holdout_test_metrics || {};
  const macroF1 = holdout.baseline_f1_macro ?? model.test_f1_macro;
  const accuracy = holdout.baseline_accuracy ?? model.test_accuracy;
  const total = Number(model.dataset_size || 0);
  const train = Number(model.train_size || 0);
  const val = Number(model.val_size || 0);
  const test = Number(model.test_size || 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Card title="Thông số model chính" className="section-card">
        <div className="grid gap-3 md:grid-cols-4">
          <SmallMetric label="Accuracy" value={pct(accuracy)} />
          <SmallMetric label="Macro F1" value={pct(macroF1)} />
          <SmallMetric label="Max length" value={count(model.max_len)} />
          <SmallMetric label="Epochs" value={count(model.epochs)} />
        </div>
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">Checkpoint đang dùng</p>
          <p className="m-0 mt-1 truncate text-sm font-semibold text-slate-800">{model.model_path || '--'}</p>
        </div>
      </Card>

      <Card title="Dữ liệu fine-tune" className="section-card">
        <div className="grid gap-3 sm:grid-cols-3">
          <SmallMetric label="Train" value={count(train)} />
          <SmallMetric label="Validation" value={count(val)} />
          <SmallMetric label="Test" value={count(test)} />
        </div>
        {total ? (
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>Tổng dataset: {count(total)}</span>
              <span>70 / 15 / 15</span>
            </div>
            <Progress percent={Number(((train / total) * 100).toFixed(1))} showInfo={false} strokeColor="#2563eb" />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
      <p className="m-0 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="m-0 mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
