from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator

from backend.app.core.constants import MAX_COMMENTS_PER_VIDEO, MAX_VIDEOS_PER_CHANNEL, MIN_COMMENT_LENGTH, SENTIMENT_LABELS


ModelChoice = Literal['auto', 'phobert', 'gemini']
SentimentChoice = Literal['positive', 'negative', 'neutral']


class CommentBase(BaseModel):
    cid: str | None = None
    text: str = Field(min_length=MIN_COMMENT_LENGTH, max_length=5000)
    author: str | None = None
    likes: int = 0
    created_at: str | None = None
    video_id: str | None = None
    video_url: str | None = None


class CommentCreate(CommentBase):
    sentiment: SentimentChoice | str = 'neutral'
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    review_state: str = 'pending'
    use_for_training: bool = False
    label_source: str = 'manual'
    suggested_sentiment: SentimentChoice | str | None = None
    suggested_confidence: float | None = None
    method: str = 'manual'


class CommentResponse(CommentBase):
    id: str
    sentiment: SentimentChoice | str = 'neutral'
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    scores: dict[str, float] = Field(default_factory=dict)
    method: str = 'phobert'
    review_state: str = 'pending'
    use_for_training: bool = False
    label_source: str = 'phobert'
    suggested_sentiment: SentimentChoice | str | None = None
    suggested_confidence: float | None = None


class SentimentResult(BaseModel):
    label: SentimentChoice
    confidence: float = Field(ge=0.0, le=1.0)
    scores: dict[str, float] = Field(default_factory=dict)


class ChannelStatistics(BaseModel):
    total: int = 0
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    positive_ratio: float = 0.0
    negative_ratio: float = 0.0
    neutral_ratio: float = 0.0
    avg_confidence: float = 0.0
    total_videos: int = 0
    total_comments: int = 0


class AnalysisRequest(BaseModel):
    url: HttpUrl | None = None
    username: str | None = None
    max_comments: int = Field(default=100, ge=1, le=MAX_COMMENTS_PER_VIDEO)
    max_videos: int = Field(default=10, ge=1, le=MAX_VIDEOS_PER_CHANNEL)
    comments_per_video: int = Field(default=50, ge=1, le=MAX_COMMENTS_PER_VIDEO)
    model: ModelChoice = 'auto'
    apify_token: str = ''

    @model_validator(mode='after')
    def validate_source(self) -> 'AnalysisRequest':
        if self.url is None and not self.username:
            raise ValueError('Either url or username must be provided')
        return self


class AnalysisResponse(BaseModel):
    comments: list[CommentResponse] = Field(default_factory=list)
    statistics: ChannelStatistics = Field(default_factory=ChannelStatistics)
    summary: dict[str, Any] = Field(default_factory=dict)
    model_used: str = ''
    source_url: str | None = None
    username: str | None = None


class ErrorResponse(BaseModel):
    code: str
    message: str
    detail: str | None = None


class VideoRequest(BaseModel):
    url: HttpUrl
    apify_token: str = ''
    max_comments: int = Field(default=100, ge=1, le=MAX_COMMENTS_PER_VIDEO)
    model: ModelChoice = 'auto'


class ChannelRequest(BaseModel):
    username: str = Field(min_length=1)
    apify_token: str = ''
    max_videos: int = Field(default=20, ge=1, le=MAX_VIDEOS_PER_CHANNEL)
    comments_per_video: int = Field(default=100, ge=1, le=MAX_COMMENTS_PER_VIDEO)
    model: ModelChoice = 'auto'


class LabelQueuePayload(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)
    comments: list[dict[str, Any]] = Field(default_factory=list)


class LabelQueueActionRequest(BaseModel):
    metadata: dict[str, Any] = Field(default_factory=dict)
    comments: list[dict[str, Any]] = Field(default_factory=list)
    model_preference: str = 'phobert'


class AnalysisHistoryPayload(BaseModel):
    type: str
    title: str
    input: dict[str, Any] = Field(default_factory=dict)
    summary: dict[str, Any] = Field(default_factory=dict)
    model_used: str = ''
    created_at: str = ''


class AnalyzeTextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class AnalyzeTextResponse(BaseModel):
    sentiment: str
    confidence: float
    model: str
    raw_response: dict[str, Any]


class AnalysisHistoryItem(BaseModel):
    id: str
    text: str
    sentiment: str
    confidence: float
    created_at: str


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user_id: str
    email: EmailStr
    full_name: str


class ReportCreateRequest(BaseModel):
    title: str
    summary: str
    metrics: dict[str, Any]


class ReportItem(BaseModel):
    id: str
    title: str
    summary: str
    metrics: dict[str, Any]
    created_at: str


__all__ = [
    'AnalysisHistoryItem',
    'AnalysisHistoryPayload',
    'AnalysisRequest',
    'AnalysisResponse',
    'AnalyzeTextRequest',
    'AnalyzeTextResponse',
    'ChannelRequest',
    'ChannelStatistics',
    'CommentBase',
    'CommentCreate',
    'CommentResponse',
    'ErrorResponse',
    'LabelQueueActionRequest',
    'LabelQueuePayload',
    'LoginRequest',
    'ModelChoice',
    'RegisterRequest',
    'ReportCreateRequest',
    'ReportItem',
    'SentimentChoice',
    'SentimentResult',
    'TokenResponse',
    'VideoRequest',
    'SENTIMENT_LABELS',
]
