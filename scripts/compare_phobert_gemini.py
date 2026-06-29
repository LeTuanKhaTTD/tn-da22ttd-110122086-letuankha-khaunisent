"""So sánh PhoBERT fine-tuned với Gemini trên test split."""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from google import genai
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.sentiment import analyze_batch_with_timings, load_model
from scripts.gemini_comparison_charts import save_comparison_charts

LABELS = ["positive", "neutral", "negative"]
PROMPT = """Bạn là bộ phân loại cảm xúc bình luận TikTok tiếng Việt.
Chỉ trả lời đúng một nhãn trong ba nhãn: positive, neutral, negative.
Bình luận: {text}
Nhãn:"""


def load_rows(path: Path) -> list[dict[str, str]]:
    raw = json.loads(path.read_text(encoding="utf-8-sig"))
    items = raw.get("comments", raw) if isinstance(raw, dict) else raw
    rows = []
    for item in items:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text", "")).strip()
        label = str(item.get("sentiment", "")).strip().lower()
        if text and label in LABELS:
            rows.append({"text": text, "label": label})
    return rows


def build_test_sample(rows: list[dict[str, str]], sample_size: int) -> list[dict[str, str]]:
    texts = [row["text"] for row in rows]
    labels = [row["label"] for row in rows]
    _, temp_texts, _, temp_labels = train_test_split(
        texts,
        labels,
        test_size=0.30,
        random_state=42,
        stratify=labels,
    )
    _, test_texts, _, test_labels = train_test_split(
        temp_texts,
        temp_labels,
        test_size=0.50,
        random_state=42,
        stratify=temp_labels,
    )
    test_rows = [{"text": text, "label": label} for text, label in zip(test_texts, test_labels)]
    if len(test_rows) <= sample_size:
        return test_rows
    _, sampled = train_test_split(
        test_rows,
        test_size=sample_size,
        random_state=42,
        stratify=[row["label"] for row in test_rows],
    )
    return list(sampled)


def predict_phobert(rows: list[dict[str, str]]) -> tuple[list[str], float]:
    started = time.perf_counter()
    predictions, timing = analyze_batch_with_timings([row["text"] for row in rows], "phobert")
    total = time.perf_counter() - started
    return [str(item.get("sentiment", "neutral")) for item in predictions], max(total, timing.get("sentiment_total_seconds", 0.0))


def normalize_label(text: str) -> str:
    value = text.strip().lower()
    for label in LABELS:
        if label in value:
            return label
    return "neutral"


def predict_gemini(rows: list[dict[str, str]], model_name: str, pause_seconds: float) -> tuple[list[str], float]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Thiếu GEMINI_API_KEY trong .env. Không thể chạy so sánh Gemini thật.")

    client = genai.Client(api_key=api_key)
    predictions: list[str] = []
    started = time.perf_counter()
    for row in rows:
        response = client.models.generate_content(
            model=model_name,
            contents=PROMPT.format(text=row["text"][:1000]),
        )
        predictions.append(normalize_label(getattr(response, "text", "") or ""))
        if pause_seconds:
            time.sleep(pause_seconds)
    return predictions, time.perf_counter() - started


def metric_block(y_true: list[str], y_pred: list[str], total_seconds: float) -> dict[str, Any]:
    report = classification_report(y_true, y_pred, labels=LABELS, output_dict=True, zero_division=0)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "macro_f1": round(float(f1_score(y_true, y_pred, labels=LABELS, average="macro", zero_division=0)), 4),
        "weighted_f1": round(float(f1_score(y_true, y_pred, labels=LABELS, average="weighted", zero_division=0)), 4),
        "total_seconds": round(float(total_seconds), 4),
        "comments_per_second": round(len(y_true) / total_seconds if total_seconds else 0, 4),
        "classification_report": report,
    }


def save_outputs(rows: list[dict[str, str]], preds: dict[str, list[str]], summary: dict[str, Any], out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    csv_path = out_dir / "gemini_comparison_predictions.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["text", "label_true", "phobert_pred", "gemini_pred", "phobert_correct", "gemini_correct"])
        for idx, row in enumerate(rows):
            true = row["label"]
            writer.writerow([row["text"], true, preds["phobert"][idx], preds["gemini"][idx], preds["phobert"][idx] == true, preds["gemini"][idx] == true])
    (out_dir / "gemini_comparison_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    charts = save_comparison_charts(summary, [row["label"] for row in rows], preds, out_dir)
    return [csv_path, out_dir / "gemini_comparison_summary.json", *charts]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="data/export/retrain_manual_phobert_9976.json")
    parser.add_argument("--sample-size", type=int, default=150)
    parser.add_argument("--gemini-model", default=os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    parser.add_argument("--pause-seconds", type=float, default=0.2)
    args = parser.parse_args()

    load_dotenv(ROOT / ".env", override=False, encoding="utf-8-sig")
    if not os.getenv("GEMINI_API_KEY", "").strip():
        raise RuntimeError("Thiếu GEMINI_API_KEY trong .env. Thêm key trước khi chạy so sánh Gemini.")
    rows = build_test_sample(load_rows(ROOT / args.data), args.sample_size)
    load_model()
    phobert_pred, phobert_time = predict_phobert(rows)
    gemini_pred, gemini_time = predict_gemini(rows, args.gemini_model, args.pause_seconds)
    y_true = [row["label"] for row in rows]
    summary = {
        "sample_size": len(rows),
        "dataset": args.data,
        "gemini_model": args.gemini_model,
        "phobert": metric_block(y_true, phobert_pred, phobert_time),
        "gemini": metric_block(y_true, gemini_pred, gemini_time),
    }
    files = save_outputs(rows, {"phobert": phobert_pred, "gemini": gemini_pred}, summary, ROOT / "reports" / "gemini_comparison")
    print(json.dumps({"summary": summary, "files": [str(path) for path in files]}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
