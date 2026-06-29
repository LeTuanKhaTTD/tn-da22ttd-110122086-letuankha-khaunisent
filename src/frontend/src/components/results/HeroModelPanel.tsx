import { BrainCircuit, Gauge, HardDrive, ShieldCheck } from 'lucide-react';
import { formatCount, formatPercent } from '@/utils/formatters';
import type { HealthResponse } from '@/types/health';

interface HeroModelPanelProps {
  health?: HealthResponse;
  feature: 'video' | 'channel';
}

export default function HeroModelPanel({ health, feature }: HeroModelPanelProps) {
  const model = health?.model;
  const datasetSize = Number(model?.dataset_size ?? 0);

  return (
    <div className="analysis-hero__panel">
      <div className="analysis-hero__metric">
        <span>Model chính</span>
        <strong>{health?.model_mode || 'phobert'}</strong>
        <small>{model?.model_name || 'vinai/phobert-base'}</small>
      </div>

      <div className="analysis-hero__score-grid">
        <div>
          <span>Accuracy test</span>
          <strong>{formatPercent(model?.test_accuracy ?? 0)}</strong>
        </div>
        <div>
          <span>Macro F1</span>
          <strong>{formatPercent(model?.test_f1_macro ?? 0)}</strong>
        </div>
        <div>
          <span>Dataset</span>
          <strong>{datasetSize ? formatCount(datasetSize) : '--'}</strong>
        </div>
        <div>
          <span>Device</span>
          <strong>{health?.device || 'cpu'}</strong>
        </div>
      </div>

      <div className="analysis-hero__metric-grid">
        <div><BrainCircuit size={16} /><span>PhoBERT fine-tuned</span></div>
        <div><Gauge size={16} /><span>{feature === 'channel' ? 'Tổng hợp theo video' : 'Confidence scoring'}</span></div>
        <div><ShieldCheck size={16} /><span>Response chuẩn</span></div>
        <div><HardDrive size={16} /><span className="analysis-hero__path">{model?.model_path || 'Đang tải model path'}</span></div>
      </div>
    </div>
  );
}
