import json
import os
from pathlib import Path
from typing import Any

import torch
import torch.nn.functional as F
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from backend.app.core.constants import BATCH_SIZE, MAX_SEQUENCE_LENGTH, SENTIMENT_LABELS

try:
    from google import genai
except Exception:
    genai = None

try:
    from modules.text_preprocessor import preprocess
except Exception:
    preprocess = None


PROJECT_ROOT = Path(__file__).resolve().parent.parent
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_gemini_client = None
_gemini_enabled = False
_id2label = {0: "positive", 1: "neutral", 2: "negative"}
_model_info: dict[str, Any] = {}
_phobert = None
_tokenizer = None


def _is_model_dir(path: Path) -> bool:
    has_config = (path / "config.json").exists()
    has_weights = (path / "model.safetensors").exists() or (path / "pytorch_model.bin").exists()
    return has_config and has_weights


def _resolve_model_path() -> Path:
    env_path = os.getenv("PHOBERT_MODEL_PATH", "").strip()
    candidates = [
        Path(env_path) if env_path else None,
        PROJECT_ROOT / "models",
        PROJECT_ROOT / "phobert_tvu_sentiment",
        PROJECT_ROOT / "app" / "model" / "phobert_finetuned",
    ]

    for candidate in candidates:
        if candidate and _is_model_dir(candidate):
            return candidate

    raise FileNotFoundError("Không tìm thấy thư mục model PhoBERT fine-tuned")


def _load_metadata(model_path: Path) -> dict[str, Any]:
    metadata_path = model_path / "training_metadata.json"
    if not metadata_path.exists():
        return {}
    return json.loads(metadata_path.read_text(encoding="utf-8"))


def _clean_text(text: Any) -> str:
    raw = str(text or "").strip()
    if not raw:
        return ""
    if preprocess is None:
        return raw
    try:
        return preprocess(raw) or raw
    except Exception:
        return raw


def _init_gemini() -> None:
    global _gemini_client, _gemini_enabled

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or genai is None:
        _gemini_client = None
        _gemini_enabled = False
        return

    _gemini_client = genai.Client(api_key=api_key)
    _gemini_enabled = True


def load_model() -> dict[str, Any]:
    """Load PhoBERT fine-tuned làm model chính của hệ thống."""
    global _id2label, _model_info, _phobert, _tokenizer

    model_path = _resolve_model_path()
    metadata = _load_metadata(model_path)

    _tokenizer = AutoTokenizer.from_pretrained(str(model_path), local_files_only=True)
    _phobert = AutoModelForSequenceClassification.from_pretrained(str(model_path), local_files_only=True)
    _id2label = {int(idx): label for idx, label in _phobert.config.id2label.items()}
    _phobert.to(_device)
    _phobert.eval()
    _init_gemini()

    _model_info = {
        "device": str(_device),
        "model_mode": "phobert",
        "gemini_enabled": _gemini_enabled,
        "model_path": str(model_path),
        "model_name": metadata.get("model_name", "vinai/phobert-base"),
        "fine_tuned_on": metadata.get("fine_tuned_on", ""),
        "best_val_macro_f1": metadata.get("best_val_macro_f1"),
        "test_accuracy": metadata.get("test_accuracy"),
        "test_f1_macro": metadata.get("test_f1_macro"),
        "train_size": metadata.get("train_size"),
        "val_size": metadata.get("val_size"),
        "test_size": metadata.get("test_size"),
        "id2label": _id2label,
    }
    return _model_info


def get_model_info() -> dict[str, Any]:
    """Trả thông tin model PhoBERT đang được backend sử dụng."""
    return dict(_model_info)


def _predict_phobert(comments: list[Any]) -> list[dict[str, Any]]:
    if _phobert is None or _tokenizer is None:
        raise RuntimeError("PhoBERT chưa được load")

    results = []
    for start in range(0, len(comments), BATCH_SIZE):
        originals = comments[start:start + BATCH_SIZE]
        cleaned = [_clean_text(text) for text in originals]
        encoded = _tokenizer(
            cleaned,
            max_length=MAX_SEQUENCE_LENGTH,
            padding=True,
            truncation=True,
            return_tensors="pt",
        )
        encoded = {key: value.to(_device) for key, value in encoded.items()}

        with torch.no_grad():
            logits = _phobert(**encoded).logits
            probs_batch = F.softmax(logits, dim=1).cpu().tolist()

        for original, clean, probs in zip(originals, cleaned, probs_batch):
            pred_idx = int(max(range(len(probs)), key=lambda idx: probs[idx]))
            label = _id2label.get(pred_idx, "neutral")
            scores = {name: 0.0 for name in SENTIMENT_LABELS}
            for idx, value in enumerate(probs):
                score_label = _id2label.get(idx, "neutral")
                scores[score_label] = round(float(value), 4)

            results.append({
                "text": str(original or ""),
                "text_clean": clean,
                "sentiment": label,
                "confidence": scores[label],
                "scores": scores,
                "method": "phobert",
            })

    return results


def analyze_batch(comments: list[Any], model_preference: str = "phobert") -> list[dict[str, Any]]:
    """Phân tích batch comment. PhoBERT là model chính."""
    preference = (model_preference or "phobert").strip().lower()
    if preference == "gemini":
        raise RuntimeError("Gemini chỉ dùng cho đánh giá/so sánh, không phải luồng phân tích chính")
    return _predict_phobert(comments)


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Tổng hợp kết quả theo 3 nhãn sentiment."""
    if not isinstance(results, list):
        raise ValueError("results phải là list")

    total = len(results)
    grouped = {label: [item for item in results if item.get("sentiment") == label] for label in SENTIMENT_LABELS}

    def percent(count: int) -> float:
        return round(float(count / total * 100), 2) if total else 0.0

    avg_confidence = (
        round(sum(float(item.get("confidence", 0.0)) for item in results) / total, 4)
        if total
        else 0.0
    )

    return {
        "total": total,
        "positive": {"count": len(grouped["positive"]), "percent": percent(len(grouped["positive"]))},
        "negative": {"count": len(grouped["negative"]), "percent": percent(len(grouped["negative"]))},
        "neutral": {"count": len(grouped["neutral"]), "percent": percent(len(grouped["neutral"]))},
        "avg_confidence": avg_confidence,
        "top_positive": sorted(grouped["positive"], key=lambda x: x.get("confidence", 0.0), reverse=True)[:5],
        "top_negative": sorted(grouped["negative"], key=lambda x: x.get("confidence", 0.0), reverse=True)[:5],
    }
