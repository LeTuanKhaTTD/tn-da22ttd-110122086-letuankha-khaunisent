"""Vẽ biểu đồ so sánh PhoBERT và Gemini."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import ConfusionMatrixDisplay


def save_comparison_charts(summary: dict[str, Any], y_true: list[str], predictions: dict[str, list[str]], out_dir: Path) -> list[Path]:
    paths: list[Path] = []
    models = ["phobert", "gemini"]
    labels = ["PhoBERT fine-tuned", "Gemini"]

    accuracy = [summary[model]["accuracy"] for model in models]
    macro_f1 = [summary[model]["macro_f1"] for model in models]
    x = np.arange(len(models))
    width = 0.36

    plt.figure(figsize=(8, 5), dpi=180)
    plt.bar(x - width / 2, accuracy, width, label="Accuracy", color="#2563eb")
    plt.bar(x + width / 2, macro_f1, width, label="Macro F1", color="#22c55e")
    plt.xticks(x, labels)
    plt.ylim(0, 1)
    plt.title("So sánh độ chính xác giữa PhoBERT và Gemini")
    plt.ylabel("Giá trị")
    plt.legend()
    plt.grid(axis="y", alpha=0.25)
    plt.tight_layout()
    paths.append(out_dir / "chart_model_metrics.png")
    plt.savefig(paths[-1], facecolor="white")
    plt.close()

    times = [summary[model]["total_seconds"] for model in models]
    plt.figure(figsize=(8, 5), dpi=180)
    plt.bar(labels, times, color=["#2563eb", "#f59e0b"])
    plt.title("So sánh thời gian xử lý giữa PhoBERT và Gemini")
    plt.ylabel("Thời gian (giây)")
    plt.grid(axis="y", alpha=0.25)
    plt.tight_layout()
    paths.append(out_dir / "chart_model_time.png")
    plt.savefig(paths[-1], facecolor="white")
    plt.close()

    class_labels = ["positive", "neutral", "negative"]
    for model, title in [("phobert", "PhoBERT fine-tuned"), ("gemini", "Gemini")]:
        display = ConfusionMatrixDisplay.from_predictions(
            y_true,
            predictions[model],
            labels=class_labels,
            display_labels=class_labels,
            cmap="Blues",
            values_format="d",
            colorbar=False,
        )
        display.ax_.set_title(f"Confusion matrix - {title}")
        display.ax_.set_xlabel("Nhãn dự đoán")
        display.ax_.set_ylabel("Nhãn thật")
        display.figure_.set_size_inches(6, 5)
        display.figure_.set_dpi(180)
        display.figure_.tight_layout()
        paths.append(out_dir / f"confusion_matrix_{model}.png")
        display.figure_.savefig(paths[-1], facecolor="white")
        plt.close(display.figure_)

    return paths
