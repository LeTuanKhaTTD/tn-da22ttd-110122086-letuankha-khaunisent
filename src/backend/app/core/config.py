from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(PROJECT_ROOT / '.env'), str(PROJECT_ROOT.parent / '.env')),
        env_file_encoding='utf-8',
        extra='ignore',
    )

    app_name: str = 'TikUniSent'
    api_host: str = '0.0.0.0'
    api_port: int = 8000
    cors_origins_raw: str = 'http://localhost:5173,http://127.0.0.1:5173'

    apify_api_token: str = ''
    apify_api_base_url: str = 'https://api.apify.com/v2'
    apify_actor_slug: str = 'clockworks~tiktok-scraper'

    phobert_model_path: str = './models/phobert-sentiment'
    vncorenlp_path: str = './models/vncorenlp'
    sentiment_labels: list[str] = Field(default_factory=lambda: ['positive', 'negative', 'neutral'])
    inference_batch_size: int = 32
    phobert_max_length: int = 256

    jwt_secret_key: str = 'change-me-in-env'
    jwt_algorithm: str = 'HS256'
    jwt_expire_minutes: int = 60 * 24

    supabase_url: str = ''
    supabase_service_role_key: str = ''

    gemini_api_key: str = ''
    gemini_model: str = 'gemini-2.5-flash'
    gemini_enable_cache: bool = True
    gemini_max_retries: int = 5
    gemini_base_delay: float = 0.8

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(',') if origin.strip()]


settings = Settings()
