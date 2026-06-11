from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from backend.preprocessing import preprocess_labeling_comments

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MASTER_FILE = PROJECT_ROOT / 'data' / 'tong_hop_comment.json'
LABEL_QUEUE_FILE = PROJECT_ROOT / 'data' / 'labeled' / 'tiktok_new_comments_label_queue.json'
VALID_REVIEW_STATES = {'pending', 'keep', 'discard'}
VALID_SENTIMENTS = {'positive', 'neutral', 'negative'}
VALID_LABEL_SOURCES = {'', 'manual', 'phobert'}


def _load_json(path: Path) -> Any:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def _save_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def _normalize_review_state(value: object) -> str:
    state = str(value or 'pending').strip().lower()
    return state if state in VALID_REVIEW_STATES else 'pending'


def _normalize_sentiment(value: object) -> str:
    sentiment = str(value or '').strip().lower()
    return sentiment if sentiment in VALID_SENTIMENTS else ''


def _normalize_label_source(value: object) -> str:
    label_source = str(value or '').strip().lower()
    return label_source if label_source in VALID_LABEL_SOURCES else ''


def _iter_unlabeled_comments(master_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    comments: List[Dict[str, Any]] = []
    for video in master_data.get('videos', []):
        if not isinstance(video, dict):
            continue
        for comment in video.get('comments', []):
            if not isinstance(comment, dict):
                continue
            sentiment = str(comment.get('sentiment', '')).strip().lower()
            method = str(comment.get('method', '')).strip().lower()
            if method == 'unlabeled' or not sentiment:
                row = deepcopy(comment)
                row.setdefault('sentiment', '')
                row['sentiment'] = ''
                row['review_state'] = _normalize_review_state(row.get('review_state', 'pending'))
                row['use_for_training'] = bool(row.get('use_for_training', False))
                row['labeled_at'] = str(row.get('labeled_at', '')).strip()
                row['label_source'] = _normalize_label_source(row.get('label_source', ''))
                row['suggested_sentiment'] = _normalize_sentiment(row.get('suggested_sentiment', ''))
                row['suggested_confidence'] = float(row.get('suggested_confidence', 0.0) or 0.0)
                row['suggested_method'] = str(row.get('suggested_method', '')).strip().lower()
                comments.append(row)
    return comments


def build_label_queue() -> Dict[str, Any]:
    master_data = _load_json(MASTER_FILE)
    raw_comments = _iter_unlabeled_comments(master_data)
    preprocess_result = preprocess_labeling_comments(raw_comments)
    comments = preprocess_result.get('comments', [])
    preprocess_stats = preprocess_result.get('stats', {})

    return {
        'metadata': {
            'source_file': str(MASTER_FILE).replace('\\', '/'),
            'created_at': datetime.now().isoformat(timespec='seconds'),
            'total_comments': len(comments),
            'pending_comments': len(comments),
            'keep_comments': 0,
            'discard_comments': 0,
            'label_schema': 'sentiment + review_state',
            'label_mode': 'human_review_with_model_suggestions',
            'preprocessed': True,
            'preprocess_stats': preprocess_stats,
        },
        'comments': comments,
    }


def normalize_label_queue(payload: Dict[str, Any]) -> Dict[str, Any]:
    comments: List[Dict[str, Any]] = []
    keep_count = 0
    discard_count = 0
    pending_count = 0

    for item in payload.get('comments', []):
        if not isinstance(item, dict):
            continue
        row = deepcopy(item)
        row['sentiment'] = _normalize_sentiment(row.get('sentiment', ''))
        row['suggested_sentiment'] = _normalize_sentiment(row.get('suggested_sentiment', ''))
        row['suggested_confidence'] = float(row.get('suggested_confidence', 0.0) or 0.0)
        row['suggested_method'] = str(row.get('suggested_method', '')).strip().lower()
        row['review_state'] = _normalize_review_state(row.get('review_state', 'pending'))
        row['use_for_training'] = bool(row.get('use_for_training', False)) or row['review_state'] == 'keep'
        row['label_source'] = _normalize_label_source(row.get('label_source', ''))
        row['labeled_at'] = str(row.get('labeled_at', '')).strip()
        if row['review_state'] == 'keep':
            keep_count += 1
        elif row['review_state'] == 'discard':
            discard_count += 1
        else:
            pending_count += 1
        comments.append(row)

    metadata = dict(payload.get('metadata', {}) if isinstance(payload.get('metadata', {}), dict) else {})
    metadata.update(
        {
            'total_comments': len(comments),
            'pending_comments': pending_count,
            'keep_comments': keep_count,
            'discard_comments': discard_count,
            'updated_at': datetime.now().isoformat(timespec='seconds'),
        }
    )

    return {'metadata': metadata, 'comments': comments}


def apply_model_prelabels(payload: Dict[str, Any], model_preference: str = 'phobert') -> Dict[str, Any]:
    from backend.sentiment import analyze_batch, load_model

    normalized = normalize_label_queue(payload)
    comments = normalized.get('comments', [])
    texts = [str(item.get('text', '')).strip() for item in comments]
    if texts:
        load_model()
    predictions = analyze_batch(texts, model_preference or 'phobert') if texts else []

    for index, item in enumerate(comments):
        prediction = predictions[index] if index < len(predictions) else {}
        suggested_sentiment = _normalize_sentiment(prediction.get('sentiment', ''))
        suggested_confidence = float(prediction.get('confidence', 0.0) or 0.0)

        item['suggested_sentiment'] = suggested_sentiment
        item['suggested_confidence'] = suggested_confidence
        item['suggested_method'] = str(prediction.get('method', model_preference or 'phobert')).strip().lower() or 'phobert'
        item['label_source'] = 'phobert'
        item['auto_labeled_at'] = datetime.now().isoformat(timespec='seconds')
        if not item.get('sentiment') or item.get('review_state') == 'pending':
            item['sentiment'] = suggested_sentiment
            item['confidence'] = suggested_confidence
            item['method'] = item['suggested_method']

    return normalize_label_queue({'metadata': normalized.get('metadata', {}), 'comments': comments})


def load_label_queue() -> Dict[str, Any]:
    fresh_payload = build_label_queue()
    fresh_comments = fresh_payload.get('comments', [])

    if LABEL_QUEUE_FILE.exists():
        try:
            with LABEL_QUEUE_FILE.open('r', encoding='utf-8') as handle:
                payload = json.load(handle)
            if isinstance(payload, dict) and isinstance(payload.get('comments'), list):
                normalized = normalize_label_queue(payload)
                existing_keys = {_build_comment_key(item) for item in normalized.get('comments', [])}
                merged_comments = list(normalized.get('comments', []))
                added = 0
                for item in fresh_comments:
                    key = _build_comment_key(item)
                    if key not in existing_keys:
                        merged_comments.append(item)
                        existing_keys.add(key)
                        added += 1
                merged = normalize_label_queue({
                    'metadata': {
                        **normalized.get('metadata', {}),
                        'source_file': str(MASTER_FILE).replace('\\', '/'),
                        'last_synced_at': datetime.now().isoformat(timespec='seconds'),
                        'new_comments_added': added,
                    },
                    'comments': merged_comments,
                })
                if added:
                    save_label_queue(merged)
                return merged
        except (OSError, json.JSONDecodeError):
            pass

    save_label_queue(fresh_payload)
    return fresh_payload


def save_label_queue(payload: Dict[str, Any]) -> Dict[str, Any]:
    normalized = normalize_label_queue(payload)
    _save_json(LABEL_QUEUE_FILE, normalized)
    return normalized


def _build_comment_key(comment: Dict[str, Any]) -> tuple[str, str, str, str]:
    return (
        str(comment.get('video_id', '')).strip(),
        str(comment.get('text_original') or comment.get('text', '')).strip().lower(),
        str(comment.get('author', '')).strip().lower(),
        str(comment.get('created_at', '')).strip(),
    )


def _safe_int(value: object) -> int:
    try:
        return int(float(value or 0))
    except (TypeError, ValueError):
        return 0


def _refresh_master_stats(master_data: Dict[str, Any]) -> None:
    global_counts = {label: 0 for label in VALID_SENTIMENTS}
    total_comments = 0
    total_likes = 0

    for video in master_data.get('videos', []):
        if not isinstance(video, dict):
            continue
        comments = video.get('comments', []) if isinstance(video.get('comments', []), list) else []
        video['comments_count'] = len(comments)
        video['total_likes'] = sum(_safe_int(comment.get('likes', 0)) for comment in comments if isinstance(comment, dict))
        video['avg_likes_per_comment'] = round(video['total_likes'] / len(comments), 2) if comments else 0

        summary = {label: 0 for label in VALID_SENTIMENTS}
        for comment in comments:
            if not isinstance(comment, dict):
                continue
            sentiment = str(comment.get('sentiment', '')).strip().lower()
            if sentiment in summary:
                summary[sentiment] += 1

        labeled_total = sum(summary.values())
        video['sentiment_summary'] = summary
        video['sentiment_percentages'] = {
            label: round((summary[label] / labeled_total) * 100, 6) if labeled_total else 0.0
            for label in VALID_SENTIMENTS
        }

        total_comments += len(comments)
        total_likes += video['total_likes']
        for label in VALID_SENTIMENTS:
            global_counts[label] += summary[label]

    labeled_total = sum(global_counts.values())
    master_data['total_videos'] = len(master_data.get('videos', []))
    master_data['total_comments'] = total_comments
    master_data['total_likes'] = total_likes
    master_data['analyzed_at'] = datetime.now().isoformat(timespec='seconds')
    master_data['global_sentiment_summary'] = {
        label: {
            'count': global_counts.get(label, 0),
            'percentage': (global_counts.get(label, 0) / labeled_total * 100) if labeled_total else 0.0,
        }
        for label in VALID_SENTIMENTS
    }


def merge_reviewed_comments_into_master(payload: Dict[str, Any]) -> Dict[str, Any]:
    master_data = _load_json(MASTER_FILE)
    normalized = normalize_label_queue(payload)
    keep_items = [item for item in normalized.get('comments', []) if item.get('review_state') == 'keep']
    reviewed_items = [item for item in keep_items if item.get('sentiment')]
    skipped_without_sentiment = len(keep_items) - len(reviewed_items)

    master_key_map: Dict[tuple[str, str, str, str], Dict[str, Any]] = {}
    master_cid_map: Dict[str, Dict[str, Any]] = {}

    for video in master_data.get('videos', []):
        if not isinstance(video, dict):
            continue
        for comment in video.get('comments', []):
            if not isinstance(comment, dict):
                continue
            key = _build_comment_key(comment)
            master_key_map[key] = comment
            cid = str(comment.get('cid', '')).strip()
            if cid:
                master_cid_map[cid] = comment

    updated = 0
    appended = 0
    for item in reviewed_items:
        candidate = master_cid_map.get(str(item.get('cid', '')).strip()) or master_key_map.get(_build_comment_key(item))
        if candidate is None:
            appended += 1
            continue

        label_source = _normalize_label_source(item.get('label_source', '')) or ('phobert' if item.get('suggested_sentiment') == item.get('sentiment') else 'manual')
        candidate['sentiment'] = item.get('sentiment', '')
        candidate['confidence'] = float(item.get('confidence', item.get('suggested_confidence', 0.0)) or 0.0)
        # Người dùng đã duyệt nhãn trên UI, vì vậy dữ liệu được tính là manual để fine-tune.
        candidate['method'] = 'manual'
        candidate['review_state'] = 'keep'
        candidate['use_for_training'] = True
        candidate['label_source'] = label_source
        candidate['labeled_at'] = datetime.now().isoformat(timespec='seconds')
        candidate['reviewed_at'] = candidate['labeled_at']
        updated += 1

    backup_dir = PROJECT_ROOT / 'data' / 'backup'
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"tong_hop_comment_before_label_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    _save_json(backup_path, _load_json(MASTER_FILE))

    master_data['last_label_merge_at'] = datetime.now().isoformat(timespec='seconds')
    master_data['last_label_merge_updated'] = updated
    master_data['last_label_merge_appended'] = appended
    _refresh_master_stats(master_data)
    _save_json(MASTER_FILE, master_data)

    return {
        'master_file': str(MASTER_FILE).replace('\\', '/'),
        'updated': updated,
        'appended': appended,
        'total_reviewed': len(reviewed_items),
        'skipped_without_sentiment': skipped_without_sentiment,
        'merged_at': master_data['last_label_merge_at'],
        'backup_file': str(backup_path).replace('\\', '/'),
    }


def export_train_dataset(payload: Dict[str, Any], out_file: Path) -> Dict[str, Any]:
    trainable = export_trainable_comments(payload)
    export_payload = {
        'metadata': {
            'source_file': str(LABEL_QUEUE_FILE).replace('\\', '/'),
            'exported_at': datetime.now().isoformat(timespec='seconds'),
            'total_comments': len(trainable),
            'label_mode': 'approved_comments_only',
        },
        'comments': trainable,
    }
    _save_json(out_file, export_payload)
    return {
        'file_path': str(out_file).replace('\\', '/'),
        'total_comments': len(trainable),
    }


def export_master_manual_train_dataset(out_file: Path) -> Dict[str, Any]:
    master_data = _load_json(MASTER_FILE)
    comments: List[Dict[str, Any]] = []
    counts = {label: 0 for label in VALID_SENTIMENTS}

    for video in master_data.get('videos', []):
        if not isinstance(video, dict):
            continue
        for comment in video.get('comments', []):
            if not isinstance(comment, dict):
                continue
            sentiment = _normalize_sentiment(comment.get('sentiment', ''))
            method = str(comment.get('method', '')).strip().lower()
            text = str(comment.get('text', '')).strip()
            if not text or not sentiment or method != 'manual':
                continue
            row = deepcopy(comment)
            row['sentiment'] = sentiment
            row['method'] = 'manual'
            row['use_for_training'] = True
            comments.append(row)
            counts[sentiment] += 1

    export_payload = {
        'metadata': {
            'source_file': str(MASTER_FILE).replace('\\', '/'),
            'exported_at': datetime.now().isoformat(timespec='seconds'),
            'mode': 'master_manual_for_phobert_retrain',
            'total_comments': len(comments),
            'sentiment_counts': counts,
        },
        'comments': comments,
    }
    _save_json(out_file, export_payload)
    return {
        'file_path': str(out_file).replace('\\', '/'),
        'total_comments': len(comments),
        'sentiment_counts': counts,
    }


def export_trainable_comments(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    normalized = normalize_label_queue(payload)
    trainable: List[Dict[str, Any]] = []
    for item in normalized.get('comments', []):
        if item.get('review_state') != 'keep':
            continue
        if not item.get('sentiment'):
            continue
        trainable.append(item)
    return trainable
