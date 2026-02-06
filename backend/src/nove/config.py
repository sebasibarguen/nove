# ABOUTME: Application configuration loaded from environment variables.
# ABOUTME: Uses Pydantic BaseSettings for validation and .env file support.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "Nove"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://nove:nove@localhost:5432/nove"

    # Auth
    jwt_secret_key: str = "CHANGE-ME-IN-PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # Anthropic
    anthropic_api_key: str = ""

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "nove-labs"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Postmark
    postmark_server_token: str = ""
    postmark_inbound_address: str = "results@inbound.nove.health"

    # Inngest
    inngest_event_key: str = ""
    inngest_signing_key: str = ""

    # Sentry
    sentry_dsn: str = ""


settings = Settings()
