import asyncio
from collections import defaultdict
from typing import List, Dict
import json
from pathlib import Path

import httpx

from backend.app.core.constants import CHANNEL_METADATA_VIDEO_LIMIT

APIFY_BASE_URL = 'https://api.apify.com/v2'
VIDEO_ACTOR_SLUG = 'clockworks~tiktok-scraper'
COMMENTS_ACTOR_SLUG = 'clockworks~tiktok-comments-scraper'
PROJECT_ROOT = Path(__file__).resolve().parent.parent

LOCAL_CHANNEL_DATA_CANDIDATES = [
    PROJECT_ROOT / 'data' / 'tong_hop_comment.json',
    PROJECT_ROOT / 'data' / 'merged' / 'tiktok_travinhuniversity_merged.json',
]


class ApifyError(Exception):
    pass


def _unwrap_data(payload):
    if isinstance(payload, dict) and isinstance(payload.get('data'), dict):
        return payload['data']
    return payload


def _to_int(value) -> int:
    try:
        if value is None or value == '':
            return 0
        return int(float(str(value).replace(',', '').strip()))
    except (TypeError, ValueError):
        return 0


def _pick_text(source: dict, keys: tuple[str, ...]) -> str:
    for key in keys:
        current = source
        for part in key.split('.'):
            if not isinstance(current, dict):
                current = None
                break
            current = current.get(part)
        value = str(current if current is not None else source.get(key) or '').strip()
        if value:
            return value
    return ''


def _pick_int(source: dict, keys: tuple[str, ...]) -> int:
    for key in keys:
        current = source
        for part in key.split('.'):
            if not isinstance(current, dict):
                current = None
                break
            current = current.get(part)
        value = _to_int(current if current is not None else source.get(key))
        if value:
            return value
    return 0


async def _create_run(actor_slug: str, payload: dict, apify_token: str) -> dict:
    url = f'{APIFY_BASE_URL}/acts/{actor_slug}/runs'
    headers = {'Authorization': f'Bearer {apify_token}'}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)

        if resp.status_code == 401:
            raise ApifyError('Apify token không hợp lệ hoặc hết hạn')

        resp.raise_for_status()
        return _unwrap_data(resp.json())
    except httpx.HTTPStatusError as e:
        text = (e.response.text or '').strip()
        raise ApifyError(f'Apify API lỗi {e.response.status_code}: {text[:300]}') from e
    except httpx.RequestError as e:
        raise ApifyError(f'Không kết nối được Apify: {e}') from e


def _extract_comment_texts(items: List[dict], max_comments: int) -> List[str]:
    comments = []

    def append_text(value) -> None:
        text = str(value or '').strip()
        if text:
            comments.append(text)

    for item in items:
        if len(comments) >= max_comments:
            break
        if not isinstance(item, dict):
            continue

        for nested_key in ('comments', 'commentsList', 'commentList'):
            nested = item.get(nested_key)
            if isinstance(nested, list):
                comments.extend(_extract_comment_texts(nested, max_comments - len(comments)))
                break

        for key in ('text', 'comment', 'commentText', 'content', 'textOriginal'):
            if len(comments) >= max_comments:
                break
            append_text(item.get(key))

    return comments[:max_comments]


def _extract_video_title(items: List[dict]) -> str:
    title_keys = (
        'video_title',
        'videoTitle',
        'title',
        'description',
        'desc',
        'caption',
    )

    for item in items:
        if not isinstance(item, dict):
            continue

        for key in title_keys:
            value = str(item.get(key) or '').strip()
            if value and len(value) > 3:
                return value

        for nested_key in ('video', 'post', 'item', 'aweme'):
            nested = item.get(nested_key)
            if isinstance(nested, dict):
                nested_title = _extract_video_title([nested])
                if nested_title:
                    return nested_title

    return ''


async def _get_run(run_id: str, apify_token: str) -> dict:
    url = f'{APIFY_BASE_URL}/actor-runs/{run_id}'
    headers = {'Authorization': f'Bearer {apify_token}'}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=headers)

        resp.raise_for_status()
        return _unwrap_data(resp.json())
    except httpx.HTTPStatusError as e:
        text = (e.response.text or '').strip()
        raise ApifyError(f'Không đọc được trạng thái run Apify: {e.response.status_code} {text[:250]}') from e
    except httpx.RequestError as e:
        raise ApifyError(f'Lỗi mạng khi kiểm tra run Apify: {e}') from e


async def _get_dataset_items(dataset_id: str, apify_token: str) -> List[dict]:
    url = f'{APIFY_BASE_URL}/datasets/{dataset_id}/items?clean=true&limit=10000'
    headers = {'Authorization': f'Bearer {apify_token}'}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.get(url, headers=headers)

        resp.raise_for_status()
        payload = resp.json()
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            if isinstance(payload.get('data'), list):
                return payload['data']
            if isinstance(payload.get('items'), list):
                return payload['items']
        return []
    except httpx.HTTPStatusError as e:
        text = (e.response.text or '').strip()
        raise ApifyError(f'Không lấy được dataset Apify: {e.response.status_code} {text[:250]}') from e
    except httpx.RequestError as e:
        raise ApifyError(f'Lỗi mạng khi lấy dataset Apify: {e}') from e


def _normalize_profile(username: str) -> str:
    value = str(username or '').strip()
    if not value:
        return value
    if 'tiktok.com/' in value.lower():
        return value
    if value.startswith('@'):
        value = value[1:]
    return f'https://www.tiktok.com/@{value}'


def _normalize_username(username: str) -> str:
    value = str(username or '').strip().lower()
    if value.startswith('@'):
        value = value[1:]
    return value


def _extract_video_id(video: dict) -> str:
    raw = str(video.get('video_id') or video.get('id') or '').strip()
    if raw:
        return raw
    url = str(video.get('video_url') or video.get('url') or '').strip()
    if '/video/' in url:
        return url.split('/video/')[-1].split('?')[0]
    return url.split('/')[-1].split('?')[0] if url else ''


def _extract_video_url(video: dict) -> str:
    return str(
        video.get('video_url')
        or video.get('videoUrl')
        or video.get('webVideoUrl')
        or video.get('postUrl')
        or video.get('url')
        or ''
    ).strip()


def _extract_video_metadata(video: dict) -> dict:
    return {
        'video_id': _extract_video_id(video),
        'video_url': _extract_video_url(video),
        'description': _pick_text(video, ('description', 'caption', 'text', 'desc', 'title')),
        'author': _pick_text(video, ('author', 'authorName', 'username', 'userName', 'nickname')),
        'author_username': _pick_text(video, ('authorUsername', 'username', 'userName', 'author')),
        'created_at': _pick_text(video, ('created_at', 'createTimeISO', 'createTime', 'timestamp', 'date')),
        'duration': _pick_int(video, ('duration', 'videoDuration', 'durationSec')),
        'views': _pick_int(video, ('playCount', 'views', 'viewCount', 'videoViews')),
        'likes': _pick_int(video, ('diggCount', 'likes', 'likeCount', 'total_likes')),
        'shares': _pick_int(video, ('shareCount', 'shares')),
        'saves': _pick_int(video, ('collectCount', 'saveCount', 'saves')),
        'comments_count': _pick_int(video, ('commentCount', 'comments_count', 'commentsCount')),
        'music_title': _pick_text(video, ('musicTitle', 'music', 'musicName', 'soundTitle')),
        'cover_url': _pick_text(video, ('coverUrl', 'videoCover', 'thumbnail', 'thumbnailUrl', 'cover')),
    }


def _extract_channel_info(username: str, items: List[dict], videos: List[dict], analyzed_count: int | None = None) -> dict:
    first = items[0] if items else {}
    normalized = _normalize_username(username)
    total_likes = sum(_to_int(video.get('likes')) for video in videos)
    total_shares = sum(_to_int(video.get('shares')) for video in videos)
    total_views = sum(_to_int(video.get('views')) for video in videos)
    total_saves = sum(_to_int(video.get('saves')) for video in videos)
    total_declared_comments = sum(_to_int(video.get('comments_count')) for video in videos)

    return {
        'username': normalized,
        'display_name': _pick_text(first, ('authorMeta.name', 'authorMeta.nickName', 'nickname', 'authorName', 'name', 'username')) or normalized,
        'profile_url': _normalize_profile(username),
        'avatar_url': _pick_text(first, ('authorMeta.avatar', 'avatar', 'avatarUrl', 'authorAvatar', 'profilePicUrl')),
        'bio': _pick_text(first, ('signature', 'bio', 'description')),
        'followers': _pick_int(first, ('fans', 'followers', 'followerCount', 'authorMeta.fans')),
        'following': _pick_int(first, ('following', 'followingCount')),
        'likes': _pick_int(first, ('heart', 'heartCount', 'totalLikes')) or total_likes,
        'posts_analyzed': analyzed_count if analyzed_count is not None else len(videos),
        'posts_collected': len(videos),
        'total_views': total_views,
        'total_likes': total_likes,
        'total_shares': total_shares,
        'total_saves': total_saves,
        'total_declared_comments': total_declared_comments,
    }


def _video_matches_username(video: dict, username: str) -> bool:
    target = _normalize_username(username)
    if not target:
        return True

    url = _extract_video_url(video).lower()
    owner = str(video.get('username') or video.get('author') or '').strip().lower().lstrip('@')
    if owner and owner == target:
        return True
    return f'@{target}/' in url


def _load_local_channel_data() -> dict:
    for path in LOCAL_CHANNEL_DATA_CANDIDATES:
        if not path.exists():
            continue
        try:
            with path.open('r', encoding='utf-8') as f:
                payload = json.load(f)
            if isinstance(payload, dict):
                return payload
        except (OSError, json.JSONDecodeError):
            continue
    raise ApifyError('Không tìm thấy dữ liệu local để phân tích kênh (data/tong_hop_comment.json)')


def load_channel_comments_from_local(username: str, max_videos: int = 20, comments_per_video: int = 100) -> Dict:
    source = _load_local_channel_data()
    videos = source.get('videos', []) if isinstance(source, dict) else []

    selected = []
    matching_metadata = []
    for video in videos:
        if not isinstance(video, dict):
            continue
        if not _video_matches_username(video, username):
            continue

        matching_metadata.append(_extract_video_metadata(video))

        video_comments = video.get('comments', []) if isinstance(video.get('comments', []), list) else []
        comments = []
        for item in video_comments:
            text = str((item or {}).get('text', '')).strip() if isinstance(item, dict) else str(item).strip()
            if text:
                comments.append(text)
            if len(comments) >= comments_per_video:
                break

        if not comments:
            continue

        metadata = _extract_video_metadata(video)
        selected.append({
            **metadata,
            'comments_count': metadata.get('comments_count') or len(video_comments),
            'comments': comments,
        })

        if len(selected) >= max_videos:
            break

    if not selected:
        raise ApifyError(f'Không có dữ liệu local cho kênh @{_normalize_username(username)}')

    total_comments = sum(len(v.get('comments', [])) for v in selected)
    return {
        'total_videos': len(selected),
        'total_comments': total_comments,
        'metadata_videos_collected': len(matching_metadata),
        'channel_info': _extract_channel_info(username, videos, matching_metadata, len(selected)),
        'videos': selected,
    }


async def _wait_for_success(run_id: str, apify_token: str, timeout_sec: int = 300) -> dict:
    waited = 0
    interval = 4

    while waited < timeout_sec:
        run_data = await _get_run(run_id, apify_token)
        status = run_data.get('status', '').upper()

        if status == 'SUCCEEDED':
            return run_data

        if status in ('FAILED', 'ABORTED', 'TIMED-OUT'):
            raise ApifyError(f'Apify run status không thành công: {status}')

        await asyncio.sleep(interval)
        waited += interval

    raise ApifyError(f'Crawl timeout sau {timeout_sec} giây')


async def crawl_video_details(video_url: str, apify_token: str, max_comments: int = 100) -> Dict:
    if not video_url or 'tiktok.com' not in video_url:
        raise ValueError('URL phải chứa tiktok.com')

    payload = {
        'postURLs': [video_url],
        'resultsPerPage': max(20, int(max_comments)),
    }

    run_data = await _create_run(COMMENTS_ACTOR_SLUG, payload, apify_token)
    run_id = str(run_data.get('id', ''))
    if not run_id:
        raise ApifyError('Không lấy được run_id từ Apify')

    finished = await _wait_for_success(run_id, apify_token)
    dataset_id = finished.get('defaultDatasetId') or finished.get('datasetId')
    if not dataset_id:
        raise ApifyError('Không tìm thấy dataset ID từ Apify run')

    items = await _get_dataset_items(dataset_id, apify_token)

    comments = _extract_comment_texts(items, max_comments)

    if not comments:
        raise ApifyError('Apify không trả về bình luận nào cho video này')

    return {
        'video_url': video_url,
        'video_title': _extract_video_title(items),
        'comments': comments,
    }


async def crawl_video_comments(video_url: str, apify_token: str, max_comments: int = 100) -> List[str]:
    video_data = await crawl_video_details(video_url, apify_token, max_comments)
    comments = video_data.get('comments', [])
    return comments


async def crawl_channel_comments(username: str, apify_token: str, max_videos: int = 20, comments_per_video: int = 100) -> Dict:
    if not username:
        raise ValueError('Username không được để trống')

    metadata_limit = max(int(max_videos), CHANNEL_METADATA_VIDEO_LIMIT)
    payload = {
        'profiles': [_normalize_profile(username)],
        'resultsPerPage': metadata_limit,
    }

    run_data = await _create_run(VIDEO_ACTOR_SLUG, payload, apify_token)
    run_id = str(run_data.get('id', ''))
    if not run_id:
        raise ApifyError('Không lấy được run_id từ Apify')

    finished = await _wait_for_success(run_id, apify_token)
    dataset_id = finished.get('defaultDatasetId') or finished.get('datasetId')
    if not dataset_id:
        raise ApifyError('Không tìm thấy dataset ID từ Apify run')

    items = await _get_dataset_items(dataset_id, apify_token)

    metadata_videos = []
    for item in items:
        video_url = _extract_video_url(item)
        if not video_url:
            continue
        metadata_videos.append(_extract_video_metadata(item))

    videos = []
    for item in items[:max_videos]:
        vid_id = str(item.get('videoId') or item.get('postId') or item.get('id') or '').strip()
        if not vid_id:
            video_url = _extract_video_url(item)
            vid_id = video_url.split('/')[-1].split('?')[0]

        video_url = _extract_video_url(item)
        if not video_url:
            continue

        metadata = _extract_video_metadata(item)

        embedded_comments = _extract_comment_texts([item], comments_per_video)
        comments = embedded_comments
        if len(comments) < comments_per_video:
            try:
                comments = await crawl_video_comments(video_url, apify_token, comments_per_video)
            except ApifyError:
                comments = embedded_comments

        if not comments:
            continue

        videos.append({
            **metadata,
            'video_id': vid_id,
            'video_url': video_url,
            'comments_count': metadata.get('comments_count') or len(comments),
            'comments': comments[:comments_per_video],
        })

    total_comments = sum(len(v['comments']) for v in videos)

    return {
        'total_videos': len(videos),
        'total_comments': total_comments,
        'metadata_videos_collected': len(metadata_videos),
        'channel_info': _extract_channel_info(username, items, metadata_videos, len(videos)),
        'videos': videos,
    }
