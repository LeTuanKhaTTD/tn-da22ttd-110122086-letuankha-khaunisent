import json
import os
import time
import traceback
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.app.utils.response import error_response, success_response
from backend.crawler import ApifyError, crawl_channel_comments, crawl_video_details
from backend.gemini_compare import compare_comments_with_gemini
from backend.labeling_store import (
    apply_model_prelabels,
    export_train_dataset,
    export_master_manual_train_dataset,
    load_label_queue,
    merge_reviewed_comments_into_master,
    save_label_queue,
    build_label_queue,
)
from backend.sentiment import analyze_batch, analyze_batch_with_timings, get_model_info, load_model, summarize

PROJECT_ROOT = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = PROJECT_ROOT.parent
load_dotenv(PROJECT_ROOT / '.env', override=False, encoding='utf-8-sig')
load_dotenv(WORKSPACE_ROOT / '.env', override=False, encoding='utf-8-sig')

app = FastAPI(title='TikUniSent API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

model_loaded = False
model_device = 'cpu'
model_mode = 'phobert'
gemini_enabled = False


def reload_runtime_model() -> dict:
    global model_loaded, model_device, model_mode, gemini_enabled
    info = load_model()
    model_loaded = True
    model_device = info.get('device', 'cpu')
    model_mode = info.get('model_mode', 'phobert')
    gemini_enabled = bool(info.get('gemini_enabled', False))
    return info


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    _ = request
    message = str(exc.detail or 'Có lỗi xảy ra khi xử lý yêu cầu')
    return JSONResponse(status_code=exc.status_code, content=error_response(message))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    _ = request
    first_error = exc.errors()[0] if exc.errors() else {}
    field = '.'.join(str(item) for item in first_error.get('loc', []) if item != 'body')
    message = first_error.get('msg', 'Dữ liệu gửi lên không hợp lệ')
    if field:
        message = f'Dữ liệu không hợp lệ ở trường {field}: {message}'
    return JSONResponse(status_code=422, content=error_response(message))


class VideoRequest(BaseModel):
    url: str = Field(..., min_length=10)
    apify_token: str = Field('', min_length=0)
    max_comments: int = Field(100, ge=1, le=500)
    model: str = Field('phobert', pattern='^(phobert|auto|gemini)$')


class ChannelRequest(BaseModel):
    username: str = Field(..., min_length=1)
    apify_token: str = Field('', min_length=0)
    max_videos: int = Field(20, ge=1, le=50)
    comments_per_video: int = Field(100, ge=1, le=500)
    model: str = Field('phobert', pattern='^(phobert|auto|gemini)$')


class CommentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    model: str = Field('phobert', pattern='^(phobert|auto|gemini)$')


class GeminiCompareRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=10)
    gemini_model: str = Field('', min_length=0, max_length=80)


class LabelQueueRequest(BaseModel):
    metadata: dict = Field(default_factory=dict)
    comments: list[dict] = Field(default_factory=list)
    model_preference: str = Field('phobert')


def get_env_apify_token() -> str:
    env_candidates = [
        os.getenv('APIFY_API_TOKEN', '').strip(),
        os.getenv('APIFY_TOKEN', '').strip(),
        os.getenv('APIFY_API_KEY', '').strip(),
    ]
    for candidate in env_candidates:
        if candidate:
            return candidate
    return ''


def resolve_apify_token(request_token: str) -> str:
    token = (request_token or '').strip()
    if token:
        return token

    env_token = get_env_apify_token()
    if env_token:
        return env_token
    raise HTTPException(status_code=500, detail='Thiếu APIFY_API_TOKEN trong .env của backend')


def build_timings(
    crawl_seconds: float,
    preprocess_seconds: float,
    inference_seconds: float,
    aggregation_seconds: float,
    total_seconds: float,
) -> dict:
    return {
        'crawl_seconds': round(crawl_seconds, 4),
        'preprocess_seconds': round(preprocess_seconds, 4),
        'inference_seconds': round(inference_seconds, 4),
        'aggregation_seconds': round(aggregation_seconds, 4),
        'total_seconds': round(total_seconds, 4),
    }


def load_dashboard_stats() -> dict:
    data_path = PROJECT_ROOT / 'data' / 'tong_hop_comment.json'
    fallback = {
        'total_videos': 0,
        'total_comments': 0,
        'positive_percent': 0.0,
        'avg_comments_per_video': 0.0,
    }

    if not data_path.exists():
        return fallback

    try:
        with data_path.open('r', encoding='utf-8') as file:
            payload = json.load(file)
    except (OSError, json.JSONDecodeError):
        return fallback

    videos = payload.get('videos', []) if isinstance(payload, dict) else []
    total_videos = int(payload.get('total_videos') or len(videos) or 0)
    total_comments = int(payload.get('total_comments') or 0)

    if not total_comments and isinstance(videos, list):
        total_comments = sum(len(video.get('comments', [])) for video in videos if isinstance(video, dict))

    sentiment = payload.get('global_sentiment_summary', {}) if isinstance(payload, dict) else {}
    positive_entry = sentiment.get('positive', {}) if isinstance(sentiment, dict) else {}
    positive_percent = float(positive_entry.get('percentage') or positive_entry.get('percent') or 0.0)

    if not positive_percent and isinstance(videos, list):
        positive_count = 0
        counted = 0
        for video in videos:
            if not isinstance(video, dict):
                continue
            for comment in video.get('comments', []):
                if not isinstance(comment, dict):
                    continue
                sentiment_label = str(comment.get('sentiment', '')).strip().lower()
                if sentiment_label:
                    counted += 1
                if sentiment_label == 'positive':
                    positive_count += 1
        positive_percent = (positive_count / counted * 100) if counted else 0.0

    avg_comments = (total_comments / total_videos) if total_videos else 0.0

    return {
        'total_videos': total_videos,
        'total_comments': total_comments,
        'positive_percent': round(positive_percent, 2),
        'avg_comments_per_video': round(avg_comments, 2),
    }


@app.on_event('startup')
async def startup_event():
    global model_loaded
    try:
        reload_runtime_model()
    except Exception as e:
        model_loaded = False
        print(f'Khởi tạo model thất bại: {e}')


@app.get('/')
async def root():
    return success_response({'message': 'TikUniSent API'})


@app.get('/health')
async def health():
    model_info = get_model_info()
    return success_response({
        'model_loaded': model_loaded,
        'device': model_device,
        'model_mode': model_mode,
        'gemini_enabled': gemini_enabled,
        'apify_configured': bool(get_env_apify_token()),
        'model': model_info,
    })


@app.post('/admin/reload-model')
async def reload_model_endpoint():
    try:
        info = reload_runtime_model()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Không thể tải lại model: {e}') from e
    return success_response({'message': 'Đã tải lại model PhoBERT', 'model': info})


@app.get('/stats')
async def stats():
    return success_response(load_dashboard_stats())


@app.post('/analyze/video')
async def analyze_video(request: VideoRequest):
    total_started = time.perf_counter()
    if not model_loaded:
        raise HTTPException(status_code=503, detail='Model chưa được load')

    if 'tiktok.com' not in request.url.lower():
        raise HTTPException(status_code=400, detail='URL không phải TikTok')

    if request.model == 'gemini':
        raise HTTPException(status_code=400, detail='Gemini chỉ dùng để đánh giá và so sánh, phân tích web dùng PhoBERT')

    apify_token = resolve_apify_token(request.apify_token)

    try:
        crawl_started = time.perf_counter()
        video_data = await crawl_video_details(request.url, apify_token, request.max_comments)
        crawl_seconds = time.perf_counter() - crawl_started
        comments = video_data.get('comments', [])
    except ApifyError as e:
        message = str(e)
        status = 401 if 'token không hợp lệ' in message.lower() else 502
        raise HTTPException(status_code=status, detail=message)
    except Exception as e:
        raise HTTPException(status_code=504, detail=f'Crawl timeout hoặc lỗi Apify: {e}')

    try:
        analyzed, sentiment_timings = analyze_batch_with_timings(comments, request.model)
        aggregation_started = time.perf_counter()
        summary = summarize(analyzed)
        aggregation_seconds = time.perf_counter() - aggregation_started
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail='Lỗi phân tích sentiment')

    model_used = analyzed[0].get('method', request.model) if analyzed else request.model
    total_seconds = time.perf_counter() - total_started

    return success_response({
        'status': 'success',
        'input_url': request.url,
        'video_title': video_data.get('video_title') or '',
        'comments_analyzed': len(analyzed),
        'summary': summary,
        'details': analyzed,
        'model_used': model_used,
        'timings': build_timings(
            crawl_seconds,
            sentiment_timings.get('preprocess_seconds', 0.0),
            sentiment_timings.get('inference_seconds', 0.0),
            aggregation_seconds,
            total_seconds,
        ),
    })


@app.post('/analyze/channel')
async def analyze_channel(request: ChannelRequest):
    total_started = time.perf_counter()
    if not model_loaded:
        raise HTTPException(status_code=503, detail='Model chưa được load')

    if request.model == 'gemini':
        raise HTTPException(status_code=400, detail='Gemini chỉ dùng để đánh giá và so sánh, phân tích web dùng PhoBERT')

    try:
        apify_token = resolve_apify_token(request.apify_token)
        crawl_started = time.perf_counter()
        channel_data = await crawl_channel_comments(
            request.username,
            apify_token,
            request.max_videos,
            request.comments_per_video,
        )
        crawl_seconds = time.perf_counter() - crawl_started
    except ApifyError as e:
        message = str(e)
        status = 404 if 'không có dữ liệu local' in message.lower() else 502
        raise HTTPException(status_code=status, detail=message)
    except Exception as e:
        raise HTTPException(status_code=504, detail=f'Crawl timeout hoặc lỗi Apify: {e}')

    try:
        overall_comments = []
        videos_result = []
        preprocess_seconds = 0.0
        inference_seconds = 0.0
        aggregation_seconds = 0.0

        for video in channel_data.get('videos', []):
            comments = video.get('comments', [])
            if comments:
                analyzed, sentiment_timings = analyze_batch_with_timings(comments, request.model)
                preprocess_seconds += sentiment_timings.get('preprocess_seconds', 0.0)
                inference_seconds += sentiment_timings.get('inference_seconds', 0.0)
            else:
                analyzed = []
                sentiment_timings = {}
            summary_started = time.perf_counter()
            summary = summarize(analyzed) if comments else {
                'total': 0,
                'positive': {'count': 0, 'percent': 0.0},
                'neutral': {'count': 0, 'percent': 0.0},
                'negative': {'count': 0, 'percent': 0.0},
                'avg_confidence': 0.0,
                'top_positive': [],
                'top_negative': [],
            }
            aggregation_seconds += time.perf_counter() - summary_started

            videos_result.append({
                'video_id': video.get('video_id'),
                'video_url': video.get('video_url'),
                'description': video.get('description'),
                'author': video.get('author'),
                'author_username': video.get('author_username'),
                'created_at': video.get('created_at'),
                'duration': video.get('duration', 0),
                'views': video.get('views', 0),
                'likes': video.get('likes', 0),
                'shares': video.get('shares', 0),
                'saves': video.get('saves', 0),
                'comments_count': video.get('comments_count', 0),
                'music_title': video.get('music_title'),
                'cover_url': video.get('cover_url'),
                'summary': summary,
                'details': analyzed,
            })
            overall_comments.extend(analyzed)

        overall_started = time.perf_counter()
        overall_summary = summarize(overall_comments)
        aggregation_seconds += time.perf_counter() - overall_started

    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail='Lỗi phân tích sentiment')

    model_used = overall_comments[0].get('method', request.model) if overall_comments else request.model
    channel_info = channel_data.get('channel_info', {})
    total_seconds = time.perf_counter() - total_started

    return success_response({
        'status': 'success',
        'username': request.username,
        'channel_info': channel_info,
        'analysis_scope': {
            'requested_max_videos': request.max_videos,
            'requested_comments_per_video': request.comments_per_video,
            'videos_analyzed': channel_data.get('total_videos', 0),
            'metadata_videos_collected': channel_data.get('metadata_videos_collected', 0),
            'comments_analyzed': len(overall_comments),
            'declared_comments_in_selected_videos': channel_info.get('total_declared_comments', 0),
            'total_views_in_selected_videos': channel_info.get('total_views', 0),
            'total_likes_in_selected_videos': channel_info.get('total_likes', 0),
            'total_shares_in_selected_videos': channel_info.get('total_shares', 0),
            'total_saves_in_selected_videos': channel_info.get('total_saves', 0),
            'total_views_in_channel_videos': channel_info.get('total_views', 0),
            'total_likes_in_channel_videos': channel_info.get('total_likes', 0),
            'total_shares_in_channel_videos': channel_info.get('total_shares', 0),
            'total_saves_in_channel_videos': channel_info.get('total_saves', 0),
        },
        'total_videos': channel_data.get('total_videos', 0),
        'total_comments': channel_data.get('total_comments', 0),
        'overall_summary': overall_summary,
        'videos': videos_result,
        'model_used': model_used,
        'timings': build_timings(
            crawl_seconds,
            preprocess_seconds,
            inference_seconds,
            aggregation_seconds,
            total_seconds,
        ),
    })


@app.post('/analyze/comment')
async def analyze_comment(request: CommentRequest):
    total_started = time.perf_counter()
    if not model_loaded:
        raise HTTPException(status_code=503, detail='Model chưa được load')

    if request.model == 'gemini':
        raise HTTPException(status_code=400, detail='Gemini chỉ dùng để đánh giá và so sánh, test nhanh dùng PhoBERT')

    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail='Comment không được để trống')

    try:
        analyzed, sentiment_timings = analyze_batch_with_timings([text], request.model)
        aggregation_started = time.perf_counter()
        _ = summarize(analyzed)
        aggregation_seconds = time.perf_counter() - aggregation_started
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail='Lỗi phân tích comment bằng PhoBERT')

    result = analyzed[0] if analyzed else {}
    total_seconds = time.perf_counter() - total_started
    return success_response({
        'status': 'success',
        'input_text': text,
        'result': result,
        'model_used': result.get('method', request.model),
        'timings': build_timings(
            0.0,
            sentiment_timings.get('preprocess_seconds', 0.0),
            sentiment_timings.get('inference_seconds', 0.0),
            aggregation_seconds,
            total_seconds,
        ),
    })


@app.post('/compare/gemini')
async def compare_gemini(request: GeminiCompareRequest):
    if not model_loaded:
        raise HTTPException(status_code=503, detail='Model chưa được load')

    try:
        result = compare_comments_with_gemini(request.texts, request.gemini_model)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail='Lỗi so sánh PhoBERT với Gemini')

    return success_response(result)


@app.get('/labeling/queue')
async def get_label_queue():
    return success_response(load_label_queue())


@app.post('/labeling/queue')
async def save_label_queue_endpoint(request: LabelQueueRequest):
    return success_response(save_label_queue(request.model_dump()))


@app.post('/labeling/queue/reset')
async def reset_label_queue_endpoint():
    payload = build_label_queue()
    return success_response(save_label_queue(payload))


@app.post('/labeling/queue/prelabel')
async def prelabel_queue_endpoint(request: LabelQueueRequest):
    if not model_loaded:
        raise HTTPException(status_code=503, detail='Model chưa được load')
    payload = apply_model_prelabels(request.model_dump(), request.model_preference or 'phobert')
    return success_response(save_label_queue(payload))


@app.post('/labeling/queue/export-train')
async def export_label_queue_endpoint(request: LabelQueueRequest):
    queue_file = PROJECT_ROOT / 'data' / 'labeled' / 'manual_review_train_queue.json'
    master_file = PROJECT_ROOT / 'data' / 'labeled' / 'phobert_retrain_manual_master.json'
    queue_export = export_train_dataset(request.model_dump(), queue_file)
    master_export = export_master_manual_train_dataset(master_file)
    return success_response({
        'queue_export': queue_export,
        'master_export': master_export,
        'total_comments': master_export.get('total_comments', 0),
        'file_path': master_export.get('file_path'),
    })


@app.post('/labeling/queue/merge-master')
async def merge_label_queue_endpoint(request: LabelQueueRequest):
    result = merge_reviewed_comments_into_master(request.model_dump())
    train_file = PROJECT_ROOT / 'data' / 'labeled' / 'phobert_retrain_manual_master.json'
    result['train_export'] = export_master_manual_train_dataset(train_file)
    if result.get('updated', 0) > 0:
        save_label_queue(build_label_queue())
    return success_response(result)
