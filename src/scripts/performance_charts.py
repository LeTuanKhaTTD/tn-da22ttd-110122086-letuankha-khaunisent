"""Vẽ biểu đồ hiệu năng cho báo cáo Chương 5."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np

STAGE_KEYS = [
    "thu_thap_du_lieu_s",
    "tien_xu_ly_s",
    "suy_luan_phobert_s",
    "tong_hop_s",
]
STAGE_LABELS = [
    "Thu thập dữ liệu",
    "Tiền xử lý",
    "Suy luận PhoBERT",
    "Tổng hợp",
]
STAGE_COLORS = ["#f59e0b", "#22c55e", "#2563eb", "#64748b"]


def _as_float(row: dict[str, Any], key: str) -> float:
    try:
        return float(row.get(key, 0) or 0)
    except (TypeError, ValueError):
        return 0.0


def _as_int(row: dict[str, Any], key: str) -> int:
    try:
        return int(float(row.get(key, 0) or 0))
    except (TypeError, ValueError):
        return 0


def _seconds_label(value: float) -> str:
    if value == 0:
        return "0s"
    if value < 0.01:
        return f"{value:.4f}s"
    if value < 1:
        return f"{value:.3f}s"
    if value < 10:
        return f"{value:.2f}s"
    return f"{value:.1f}s"


def _save(fig: plt.Figure, path: Path) -> Path:
    fig.tight_layout()
    fig.savefig(path, dpi=300, facecolor="white", bbox_inches="tight")
    plt.close(fig)
    return path


def _style_axes(ax: plt.Axes) -> None:
    ax.grid(axis="y", alpha=0.22, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)


def save_charts(rows: list[dict[str, Any]], out_dir: Path) -> list[Path]:
    """Tạo các biểu đồ hiệu năng rõ hơn cho báo cáo Word."""
    out_dir.mkdir(parents=True, exist_ok=True)

    labels = [str(row["ma_test"]) for row in rows]
    totals = np.array([_as_float(row, "tong_thoi_gian_s") for row in rows], dtype=float)
    comments = np.array([_as_int(row, "so_binh_luan") for row in rows], dtype=int)
    stage_matrix = np.array(
        [[_as_float(row, key) for key in STAGE_KEYS] for row in rows],
        dtype=float,
    )
    paths: list[Path] = []

    plt.rcParams.update(
        {
            "font.family": "Arial",
            "font.size": 12,
            "axes.titlesize": 17,
            "axes.labelsize": 13,
            "xtick.labelsize": 12,
            "ytick.labelsize": 12,
            "legend.fontsize": 11,
        }
    )

    # Biểu đồ 1: tổng thời gian, có nhãn giá trị để đọc rõ khi TC04 rất lớn.
    fig, ax = plt.subplots(figsize=(10.5, 6), dpi=300)
    bars = ax.bar(labels, totals, color="#2563eb", width=0.58)
    ymax = max(float(totals.max()), 1.0)
    ax.set_ylim(0, ymax * 1.18)
    for bar, total, count in zip(bars, totals, comments):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + ymax * 0.025,
            f"{_seconds_label(total)}\n{count} BL",
            ha="center",
            va="bottom",
            fontsize=11,
            fontweight="bold",
            color="#111827",
        )
    ax.set_title("So sánh tổng thời gian xử lý giữa các kịch bản", fontweight="bold")
    ax.set_xlabel("Kịch bản kiểm thử")
    ax.set_ylabel("Thời gian (giây)")
    _style_axes(ax)
    paths.append(_save(fig, out_dir / "chart_total_time.png"))

    # Biểu đồ 2: stacked bar theo giây, giữ ý nghĩa thời gian thực tế.
    fig, ax = plt.subplots(figsize=(11, 6.4), dpi=300)
    bottom = np.zeros(len(rows), dtype=float)
    for idx, (label, color) in enumerate(zip(STAGE_LABELS, STAGE_COLORS)):
        values = stage_matrix[:, idx]
        ax.bar(labels, values, bottom=bottom, label=label, color=color, width=0.58)
        for x_idx, value in enumerate(values):
            if value >= ymax * 0.035:
                ax.text(
                    x_idx,
                    bottom[x_idx] + value / 2,
                    _seconds_label(float(value)),
                    ha="center",
                    va="center",
                    fontsize=10,
                    fontweight="bold",
                    color="white" if idx in (0, 2, 3) else "#052e16",
                )
        bottom += values
    for x_idx, total in enumerate(totals):
        ax.text(
            x_idx,
            total + ymax * 0.02,
            f"Tổng {_seconds_label(float(total))}",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="bold",
            color="#111827",
        )
    ax.set_ylim(0, ymax * 1.16)
    ax.set_title("Thời gian xử lý theo từng giai đoạn", fontweight="bold")
    ax.set_xlabel("Kịch bản kiểm thử")
    ax.set_ylabel("Thời gian (giây)")
    ax.legend(loc="upper left", frameon=True, ncol=2)
    _style_axes(ax)
    paths.append(_save(fig, out_dir / "chart_stage_stacked.png"))

    # Biểu đồ 3: stacked 100%, giúp nhìn rõ tỷ trọng từng giai đoạn.
    safe_totals = np.where(totals > 0, totals, 1.0)
    ratios = stage_matrix / safe_totals[:, None] * 100
    fig, ax = plt.subplots(figsize=(11, 6.4), dpi=300)
    bottom_pct = np.zeros(len(rows), dtype=float)
    for idx, (label, color) in enumerate(zip(STAGE_LABELS, STAGE_COLORS)):
        values = ratios[:, idx]
        ax.bar(labels, values, bottom=bottom_pct, label=label, color=color, width=0.58)
        for x_idx, pct in enumerate(values):
            if pct >= 6:
                ax.text(
                    x_idx,
                    bottom_pct[x_idx] + pct / 2,
                    f"{pct:.1f}%",
                    ha="center",
                    va="center",
                    fontsize=10,
                    fontweight="bold",
                    color="white" if idx in (0, 2, 3) else "#052e16",
                )
            elif pct > 0.15:
                ax.text(
                    x_idx,
                    min(bottom_pct[x_idx] + pct + 1.4, 99),
                    f"{pct:.1f}%",
                    ha="center",
                    va="bottom",
                    fontsize=8,
                    fontweight="bold",
                    color=color,
                )
        bottom_pct += values
    ax.set_ylim(0, 104)
    ax.set_title("Tỷ trọng thời gian theo từng giai đoạn xử lý", fontweight="bold")
    ax.set_xlabel("Kịch bản kiểm thử")
    ax.set_ylabel("Tỷ trọng (%)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=4, frameon=False)
    _style_axes(ax)
    paths.append(_save(fig, out_dir / "chart_stage_ratio_100pct.png"))

    # Biểu đồ 4: phóng to các bước nội bộ sau crawl để các màu nhỏ xuất hiện rõ hơn.
    internal_labels = STAGE_LABELS[1:]
    internal_colors = STAGE_COLORS[1:]
    internal_values = stage_matrix[:, 1:]
    x = np.arange(len(labels))
    width = 0.24
    fig, ax = plt.subplots(figsize=(10.5, 6), dpi=300)
    for idx, (label, color) in enumerate(zip(internal_labels, internal_colors)):
        offset = (idx - 1) * width
        bars = ax.bar(x + offset, internal_values[:, idx], width=width, label=label, color=color)
        for bar, value in zip(bars, internal_values[:, idx]):
            if value > 0:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    value * 1.2 if value > 0.01 else value + 0.00008,
                    _seconds_label(float(value)),
                    ha="center",
                    va="bottom",
                    fontsize=9,
                    fontweight="bold",
                    color="#111827",
                )
    ax.set_yscale("symlog", linthresh=0.001)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_title("Phóng to thời gian xử lý nội bộ sau khi thu thập dữ liệu", fontweight="bold")
    ax.set_xlabel("Kịch bản kiểm thử")
    ax.set_ylabel("Thời gian (giây, thang symlog)")
    ax.legend(loc="upper left", frameon=True)
    _style_axes(ax)
    paths.append(_save(fig, out_dir / "chart_internal_processing_time.png"))

    # Biểu đồ 5: tỷ trọng nội bộ, bỏ riêng Apify để thấy rõ PhoBERT/tiền xử lý/tổng hợp.
    internal_totals = np.where(internal_values.sum(axis=1) > 0, internal_values.sum(axis=1), 1.0)
    internal_ratios = internal_values / internal_totals[:, None] * 100
    fig, ax = plt.subplots(figsize=(10.5, 6), dpi=300)
    bottom_internal = np.zeros(len(rows), dtype=float)
    for idx, (label, color) in enumerate(zip(internal_labels, internal_colors)):
        values = internal_ratios[:, idx]
        ax.bar(labels, values, bottom=bottom_internal, label=label, color=color, width=0.58)
        for x_idx, pct in enumerate(values):
            if pct >= 5:
                ax.text(
                    x_idx,
                    bottom_internal[x_idx] + pct / 2,
                    f"{pct:.1f}%",
                    ha="center",
                    va="center",
                    fontsize=10,
                    fontweight="bold",
                    color="white" if idx in (1, 2) else "#052e16",
                )
            elif pct > 0:
                ax.text(
                    x_idx,
                    min(bottom_internal[x_idx] + pct + 1.2, 99),
                    f"{pct:.2f}%",
                    ha="center",
                    va="bottom",
                    fontsize=8,
                    fontweight="bold",
                    color=color,
                )
        bottom_internal += values
    ax.set_ylim(0, 104)
    ax.set_title("Tỷ trọng xử lý nội bộ không tính thời gian Apify", fontweight="bold")
    ax.set_xlabel("Kịch bản kiểm thử")
    ax.set_ylabel("Tỷ trọng nội bộ (%)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.12), ncol=3, frameon=False)
    _style_axes(ax)
    paths.append(_save(fig, out_dir / "chart_internal_ratio_100pct.png"))

    # Biểu đồ 6: quan hệ số bình luận và tổng thời gian.
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    ax.plot(comments, totals, marker="o", color="#dc2626", linewidth=2.5, markersize=8)
    for x_value, y_value, label in zip(comments, totals, labels):
        ax.annotate(
            f"{label}\n{_seconds_label(float(y_value))}",
            (x_value, y_value),
            textcoords="offset points",
            xytext=(8, 8),
            fontsize=10,
            fontweight="bold",
        )
    ax.set_title("Quan hệ giữa số bình luận và tổng thời gian xử lý", fontweight="bold")
    ax.set_xlabel("Số bình luận")
    ax.set_ylabel("Tổng thời gian (giây)")
    _style_axes(ax)
    paths.append(_save(fig, out_dir / "chart_comments_vs_time.png"))

    return paths
