from __future__ import annotations

import html
import re
from copy import deepcopy
from typing import Any, Dict, List

from backend.app.core.constants import MIN_COMMENT_LENGTH

_MENTION_RE = re.compile(r"(?<!\w)@\S+", re.UNICODE)
_URL_RE = re.compile(r"(?:https?://|www\.)\S+", re.IGNORECASE)
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?84|0)(?:[\s.\-]?\d){8,10}(?!\d)")
_REPEAT_RE = re.compile(r"(.)\1{3,}", re.UNICODE)
_SPACE_RE = re.compile(r"\s+")
_NOISE_RE = re.compile(
    r"[^\w\s"
    r"ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúý"
    r"ĂăĐđĨĩŨũƠơƯư"
    r"Ạ-ỹ"
    r"!?.,:;/%\-]",
    re.UNICODE,
)
_TEXT_SIGNAL_RE = re.compile(r"[A-Za-zÀ-ỹ0-9]", re.UNICODE)


def _normalize_repeated_chars(text: str) -> str:
    # Giữ tối đa 3 ký tự lặp để không làm mất sắc thái cảm xúc.
    return _REPEAT_RE.sub(lambda match: match.group(1) * 3, text)


def _normalize_spaces(text: str) -> str:
    return _SPACE_RE.sub(" ", text).strip()


def _is_emoji_only(text: str) -> bool:
    compact = re.sub(r"[\s!?.,:;/%\-_]+", "", text)
    return bool(compact) and not _TEXT_SIGNAL_RE.search(compact)


def clean_comment_text(value: object) -> str:
    """Tiền xử lý 10 bước cho comment TikTok trước khi gán nhãn."""
    text = str(value or "")
    text = _MENTION_RE.sub(" ", text)
    text = _URL_RE.sub(" ", text)
    text = _PHONE_RE.sub(" ", text)
    text = html.unescape(text)
    text = _normalize_repeated_chars(text)
    text = _NOISE_RE.sub(" ", text)
    text = _normalize_spaces(text)
    return text


def preprocess_labeling_comments(comments: List[Dict[str, Any]]) -> Dict[str, Any]:
    processed: List[Dict[str, Any]] = []
    removed: List[Dict[str, Any]] = []
    seen_texts: set[str] = set()

    stats = {
        "input_comments": len(comments),
        "kept_comments": 0,
        "removed_emoji_only": 0,
        "removed_too_short": 0,
        "removed_duplicate": 0,
    }

    for comment in comments:
        row = deepcopy(comment)
        original = str(row.get("text_original") or row.get("text") or "")
        cleaned = clean_comment_text(original)

        if _is_emoji_only(cleaned):
            row["removal_reason"] = "emoji_only"
            removed.append(row)
            stats["removed_emoji_only"] += 1
            continue

        if len(cleaned) < MIN_COMMENT_LENGTH:
            row["removal_reason"] = "too_short"
            removed.append(row)
            stats["removed_too_short"] += 1
            continue

        text_key = cleaned.lower()
        if text_key in seen_texts:
            row["removal_reason"] = "duplicate_clean_text"
            removed.append(row)
            stats["removed_duplicate"] += 1
            continue
        seen_texts.add(text_key)

        row["text_original"] = original
        row["text"] = cleaned
        row["preprocessed"] = True
        processed.append(row)

    stats["kept_comments"] = len(processed)
    stats["removed_comments"] = len(removed)
    return {"comments": processed, "removed": removed, "stats": stats}
