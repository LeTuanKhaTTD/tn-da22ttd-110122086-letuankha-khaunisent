export type BackendDevice = 'cpu' | 'cuda' | string;
export type BackendModelMode = 'auto' | 'phobert' | 'gemini' | string;

export interface HealthResponse {
  model_loaded: boolean;
  device: BackendDevice;
  model_mode: BackendModelMode;
  gemini_enabled: boolean;
  apify_configured?: boolean;
  gemini_status?: 'enabled' | 'disabled' | 'missing' | 'invalid' | 'error' | 'unknown' | string;
  model?: {
    model_path?: string;
    model_name?: string;
    fine_tuned_on?: string;
    train_sources?: string[];
    dataset_size?: number;
    max_len?: number;
    epochs?: number;
    best_val_macro_f1?: number;
    test_accuracy?: number;
    test_f1_weighted?: number;
    test_f1_macro?: number;
    train_size?: number;
    val_size?: number;
    test_size?: number;
    holdout_test_metrics?: {
      baseline_accuracy?: number;
      baseline_f1_weighted?: number;
      baseline_f1_macro?: number;
      tuned_accuracy?: number;
      tuned_f1_weighted?: number;
      tuned_f1_macro?: number;
      neg_threshold?: number;
      selection_tier?: string;
    };
    manual_benchmark_metrics?: {
      support?: number;
      accuracy?: number;
      f1_weighted?: number;
      f1_macro?: number;
      dataset?: string;
      rule?: string;
    };
    id2label?: Record<string, string>;
  };
}
