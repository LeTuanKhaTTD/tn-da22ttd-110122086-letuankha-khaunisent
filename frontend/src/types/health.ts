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
    best_val_macro_f1?: number;
    test_accuracy?: number;
    test_f1_macro?: number;
    train_size?: number;
    val_size?: number;
    test_size?: number;
    id2label?: Record<string, string>;
  };
}
