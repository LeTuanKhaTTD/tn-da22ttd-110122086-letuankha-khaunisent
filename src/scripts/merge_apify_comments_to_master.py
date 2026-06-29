from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MASTER_FILE = PROJECT_ROOT / "data" / "tong_hop_comment.json"
sys.path.insert(0, str(PROJECT_ROOT))

from backend.labeling_store import _refresh_master_stats


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def _video_id_from_url(url: str) -> str:
    match = re.search(r"/video/(\d+)", str(url or ""))
    return match.group(1) if match else ""


def _comment_key(comment: Dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        str(comment.get("video_id", "")).strip(),
        str(comment.get("cid", "")).strip(),
        str(comment.get("text", "")).strip().lower(),
        str(comment.get("author", "")).strip().lower(),
    )


def _normalize_apify_comment(item: Dict[str, Any]) -> Dict[str, Any]:
    video_url = str(item.get("videoWebUrl") or item.get("video_url") or "").strip()
    return {
        "text": str(item.get("text") or "").strip(),
        "author": str(item.get("uniqueId") or item.get("author") or "").strip(),
        "likes": int(item.get("diggCount") or item.get("likes") or 0),
        "video_id": _video_id_from_url(video_url),
        "video_url": video_url,
        "created_at": str(item.get("createTimeISO") or item.get("created_at") or "").strip(),
        "sentiment": "",
        "confidence": 0.0,
        "language": "vi",
        "method": "unlabeled",
        "cid": str(item.get("cid") or "").strip(),
        "uid": str(item.get("uid") or "").strip(),
        "replyCommentTotal": int(item.get("replyCommentTotal") or 0),
        "avatarThumbnail": str(item.get("avatarThumbnail") or "").strip(),
    }


def merge_dataset(source_file: Path) -> Dict[str, Any]:
    master = _load_json(MASTER_FILE)
    source = _load_json(source_file)
    if not isinstance(source, list):
        raise ValueError("File Apify phải là list comment")

    backup_path = PROJECT_ROOT / "data" / "backup" / f"tong_hop_comment_before_apify_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    _save_json(backup_path, master)

    videos = master.setdefault("videos", [])
    video_map = {str(video.get("video_id", "")): video for video in videos if isinstance(video, dict)}
    existing_keys = set()
    existing_cids = set()

    for video in videos:
        for comment in video.get("comments", []):
            if not isinstance(comment, dict):
                continue
            existing_keys.add(_comment_key(comment))
            cid = str(comment.get("cid", "")).strip()
            if cid:
                existing_cids.add(cid)

    grouped_new: dict[str, List[Dict[str, Any]]] = defaultdict(list)
    skipped_duplicate = 0
    skipped_invalid = 0

    for raw in source:
        if not isinstance(raw, dict):
            skipped_invalid += 1
            continue
        comment = _normalize_apify_comment(raw)
        if not comment["text"] or not comment["video_id"]:
            skipped_invalid += 1
            continue
        cid = comment.get("cid", "")
        key = _comment_key(comment)
        if (cid and cid in existing_cids) or key in existing_keys:
            skipped_duplicate += 1
            continue
        grouped_new[comment["video_id"]].append(comment)
        existing_keys.add(key)
        if cid:
            existing_cids.add(cid)

    appended = 0
    new_videos = 0
    for video_id, comments in grouped_new.items():
        video = video_map.get(video_id)
        if video is None:
            video = {
                "video_id": video_id,
                "video_url": comments[0].get("video_url", ""),
                "comments": [],
            }
            videos.append(video)
            video_map[video_id] = video
            new_videos += 1
        video.setdefault("comments", []).extend(comments)
        appended += len(comments)

    master["last_apify_merge_at"] = datetime.now().isoformat(timespec="seconds")
    master["last_apify_merge_source"] = str(source_file).replace("\\", "/")
    master["last_apify_merge_appended"] = appended
    _refresh_master_stats(master)
    _save_json(MASTER_FILE, master)

    return {
        "source_comments": len(source),
        "appended_comments": appended,
        "new_videos": new_videos,
        "skipped_duplicate": skipped_duplicate,
        "skipped_invalid": skipped_invalid,
        "backup_file": str(backup_path).replace("\\", "/"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_file")
    args = parser.parse_args()
    result = merge_dataset((PROJECT_ROOT / args.source_file).resolve())
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
