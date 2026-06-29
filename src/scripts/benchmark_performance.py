"""Đo thời gian xử lý các luồng chính của KhaUniSent/TikUniSent."""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.crawler import ApifyError, crawl_channel_comments, crawl_video_details
from backend.sentiment import analyze_batch_with_timings, load_model, summarize
from scripts.performance_charts import save_charts


def seconds(value: float) -> float:
    return round(float(value), 4)


def load_local_videos() -> list[dict[str, Any]]:
    path = ROOT / "data" / "tong_hop_comment.json"
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    return [video for video in payload.get("videos", []) if isinstance(video, dict)]


def comment_texts(video: dict[str, Any], limit: int) -> list[str]:
    rows = video.get("comments", [])
    texts = []
    for item in rows if isinstance(rows, list) else []:
        text = str(item.get("text", "") if isinstance(item, dict) else item).strip()
        if text:
            texts.append(text)
        if len(texts) >= limit:
            break
    return texts


def pick_video(videos: list[dict[str, Any]], min_comments: int) -> dict[str, Any] | None:
    candidates = []
    for video in videos:
        url = str(video.get("video_url") or video.get("url") or "").strip()
        count = len(comment_texts(video, 10_000))
        if "tiktok.com" in url and count >= min_comments:
            candidates.append((count, video))
    candidates.sort(reverse=True, key=lambda item: item[0])
    return candidates[0][1] if candidates else None


def run_sentiment(comments: list[str]) -> tuple[dict[str, Any], dict[str, float]]:
    analyzed, timing = analyze_batch_with_timings(comments, "phobert")
    started = time.perf_counter()
    summary = summarize(analyzed)
    aggregate_seconds = time.perf_counter() - started
    return summary, {
        "preprocess_seconds": timing.get("preprocess_seconds", 0.0),
        "inference_seconds": timing.get("inference_seconds", 0.0),
        "aggregation_seconds": aggregate_seconds,
    }


async def fetch_video_comments(video: dict[str, Any], token: str, limit: int) -> tuple[list[str], float, str]:
    url = str(video.get("video_url") or video.get("url") or "").strip()
    started = time.perf_counter()
    try:
        data = await crawl_video_details(url, token, limit)
        return data.get("comments", [])[:limit], time.perf_counter() - started, "apify"
    except Exception as exc:
        comments = comment_texts(video, limit)
        return comments, time.perf_counter() - started, f"local_fallback: {exc}"


async def fetch_channel_comments(username: str, token: str, videos: list[dict[str, Any]]) -> tuple[list[str], int, float, str]:
    started = time.perf_counter()
    try:
        data = await crawl_channel_comments(username, token, max_videos=10, comments_per_video=100)
        comments = []
        for video in data.get("videos", []):
            comments.extend([str(text) for text in video.get("comments", []) if str(text).strip()])
        return comments[:1000], int(data.get("total_videos", 0)), time.perf_counter() - started, "apify"
    except Exception as exc:
        comments = []
        selected = 0
        for video in videos:
            batch = comment_texts(video, 100)
            if not batch:
                continue
            comments.extend(batch)
            selected += 1
            if len(comments) >= 1000 or selected >= 10:
                break
        return comments[:1000], selected, time.perf_counter() - started, f"local_fallback: {exc}"


def make_row(test_id: str, scenario: str, videos: int, comments: list[str], crawl_seconds: float, source: str) -> dict[str, Any]:
    total_started = time.perf_counter()
    _, timing = run_sentiment(comments)
    total_seconds = crawl_seconds + timing["preprocess_seconds"] + timing["inference_seconds"] + timing["aggregation_seconds"]
    wall_total = time.perf_counter() - total_started + crawl_seconds
    total_seconds = max(total_seconds, wall_total)
    count = len(comments)
    return {
        "ma_test": test_id,
        "kich_ban": scenario,
        "so_video": videos,
        "so_binh_luan": count,
        "thu_thap_du_lieu_s": seconds(crawl_seconds),
        "tien_xu_ly_s": seconds(timing["preprocess_seconds"]),
        "suy_luan_phobert_s": seconds(timing["inference_seconds"]),
        "tong_hop_s": seconds(timing["aggregation_seconds"]),
        "tong_thoi_gian_s": seconds(total_seconds),
        "toc_do_binh_luan_giay": seconds(count / total_seconds if total_seconds else 0),
        "nguon_du_lieu": source,
    }


def save_table(rows: list[dict[str, Any]], out_dir: Path) -> None:
    csv_path = out_dir / "benchmark_results.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    md_lines = ["| Mã test | Kịch bản | Video | Bình luận | Thu thập (s) | Tiền xử lý (s) | PhoBERT (s) | Tổng hợp (s) | Tổng (s) | BL/giây |",
                "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for row in rows:
        md_lines.append(
            f"| {row['ma_test']} | {row['kich_ban']} | {row['so_video']} | {row['so_binh_luan']} | "
            f"{row['thu_thap_du_lieu_s']} | {row['tien_xu_ly_s']} | {row['suy_luan_phobert_s']} | "
            f"{row['tong_hop_s']} | {row['tong_thoi_gian_s']} | {row['toc_do_binh_luan_giay']} |"
        )
    (out_dir / "benchmark_results.md").write_text("\n".join(md_lines), encoding="utf-8")


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel", default="travinhuniversity")
    args = parser.parse_args()
    load_dotenv(ROOT / ".env", override=False, encoding="utf-8-sig")
    token = os.getenv("APIFY_API_TOKEN", "").strip()
    out_dir = ROOT / "reports" / "performance"
    out_dir.mkdir(parents=True, exist_ok=True)
    videos = load_local_videos()
    load_model()

    rows = [make_row("TC01", "Phân tích 1 bình luận đơn lẻ", 0, ["học phí cao quá v"], 0.0, "direct")]
    small_video = pick_video(videos, 50) or (videos[0] if videos else {})
    medium_video = pick_video(videos, 200) or small_video
    small_comments, crawl, source = await fetch_video_comments(small_video, token, 100)
    rows.append(make_row("TC02", "Phân tích 1 video nhỏ", 1, small_comments[:100], crawl, source))
    medium_comments, crawl, source = await fetch_video_comments(medium_video, token, 300)
    rows.append(make_row("TC03", "Phân tích 1 video trung bình", 1, medium_comments[:300], crawl, source))
    channel_comments, video_count, crawl, source = await fetch_channel_comments(args.channel, token, videos)
    rows.append(make_row("TC04", "Phân tích kênh nhiều video", video_count, channel_comments[:1000], crawl, source))

    save_table(rows, out_dir)
    chart_paths = save_charts(rows, out_dir)
    (out_dir / "benchmark_notes.json").write_text(json.dumps({"rows": rows, "charts": [str(p) for p in chart_paths]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"out_dir": str(out_dir), "rows": rows, "charts": [str(p) for p in chart_paths]}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
