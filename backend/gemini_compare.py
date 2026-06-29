import os
import time
from typing import Any

from backend.sentiment import analyze_batch_with_timings

try:
    from google import genai
except Exception:
    genai = None


LABELS = ("positive", "neutral", "negative")
PROMPT = """Bạn là bộ phân loại cảm xúc bình luận TikTok tiếng Việt.
Chỉ trả lời đúng một nhãn trong ba nhãn: positive, neutral, negative.
Bình luận: {text}
Nhãn:"""


def _normalize_label(value: str) -> str:
    text = str(value or "").strip().lower()
    for label in LABELS:
        if label in text:
            return label
    return "neutral"


def _gemini_client():
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Thiếu GEMINI_API_KEY trong .env của backend")
    if genai is None:
        raise RuntimeError("Backend chưa cài thư viện google-genai")
    return genai.Client(api_key=api_key)


def compare_comments_with_gemini(texts: list[str], gemini_model: str = "") -> dict[str, Any]:
    clean_texts = [str(text or "").strip() for text in texts if str(text or "").strip()]
    if not clean_texts:
        raise ValueError("Danh sách bình luận không được để trống")
    if len(clean_texts) > 10:
        raise ValueError("Chỉ so sánh tối đa 10 bình luận mỗi lần để tránh tốn quota Gemini")

    phobert_started = time.perf_counter()
    phobert_results, phobert_timings = analyze_batch_with_timings(clean_texts, "phobert")
    phobert_seconds = time.perf_counter() - phobert_started

    model_name = gemini_model or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    client = _gemini_client()
    gemini_results = []
    gemini_started = time.perf_counter()
    for text in clean_texts:
        response = client.models.generate_content(
            model=model_name,
            contents=PROMPT.format(text=text[:1000]),
        )
        raw = str(getattr(response, "text", "") or "").strip()
        gemini_results.append({"sentiment": _normalize_label(raw), "raw": raw})
    gemini_seconds = time.perf_counter() - gemini_started

    items = []
    agree_count = 0
    for text, phobert, gemini in zip(clean_texts, phobert_results, gemini_results):
        agreement = phobert.get("sentiment") == gemini.get("sentiment")
        agree_count += int(agreement)
        items.append({
            "text": text,
            "phobert": {
                "sentiment": phobert.get("sentiment"),
                "confidence": phobert.get("confidence"),
                "scores": phobert.get("scores", {}),
            },
            "gemini": gemini,
            "agreement": agreement,
        })

    total = len(items)
    return {
        "model_used": {
            "main": "phobert",
            "comparison": model_name,
        },
        "summary": {
            "total": total,
            "agreement_count": agree_count,
            "disagreement_count": total - agree_count,
            "agreement_percent": round((agree_count / total * 100) if total else 0.0, 2),
        },
        "items": items,
        "timings": {
            "phobert_seconds": round(phobert_seconds, 4),
            "phobert_preprocess_seconds": round(phobert_timings.get("preprocess_seconds", 0.0), 4),
            "phobert_inference_seconds": round(phobert_timings.get("inference_seconds", 0.0), 4),
            "gemini_seconds": round(gemini_seconds, 4),
            "total_seconds": round(phobert_seconds + gemini_seconds, 4),
        },
    }
