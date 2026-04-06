"""
Application configuration loaded from environment variables.

Supabase fields are optional today; wire them when you add vector RAG.
"""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings (see .env for values)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # OpenAI — required for /chat
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_model: str = Field(default="gpt-4.1", description="Chat model id")

    # Optional tuning
    openai_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    openai_max_tokens: int | None = Field(default=None, ge=1)

    # Embeddings + RAG (FAISS / knowledge/company.txt)
    openai_embedding_model: str = Field(
        default="text-embedding-3-small",
        description="OpenAI embedding model for FAISS",
    )
    knowledge_file: str = Field(
        default="knowledge/company.txt",
        description="Path to company knowledge file (relative to project root or absolute)",
    )
    rag_chunk_size: int = Field(default=500, ge=200, le=4000)
    rag_chunk_overlap: int = Field(default=80, ge=0, le=500)
    rag_top_k: int = Field(default=4, ge=1, le=20)

    # Supabase — use when connecting LangChain vector store / RAG
    supabase_url: str | None = Field(default=None, description="Supabase project URL")
    supabase_key: str | None = Field(
        default=None,
        description="Supabase service role or anon key (for client SDK)",
    )

    # Telegram — optional lead alerts (Bot API sendMessage)
    telegram_bot_token: str | None = Field(
        default=None,
        description="Telegram Bot API token from @BotFather",
    )
    telegram_chat_id: str | int | None = Field(
        default=None,
        description="Target chat_id (user, group, or channel)",
    )

    @field_validator("telegram_chat_id", mode="before")
    @classmethod
    def _strip_telegram_chat_id(cls, v: object) -> str | int | None:
        if v is None or v == "":
            return None
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return v

    # Twilio WhatsApp — optional lead alerts (same body as Telegram)
    twilio_account_sid: str | None = Field(
        default=None,
        description="Twilio Account SID (AC…)",
    )
    twilio_auth_token: str | None = Field(
        default=None,
        description="Twilio Auth Token",
    )
    twilio_whatsapp_from: str | None = Field(
        default=None,
        description="WhatsApp-enabled sender, e.g. whatsapp:+14155238886",
    )
    twilio_whatsapp_to: str | None = Field(
        default=None,
        description="Destination WhatsApp number, e.g. whatsapp:+905322652660",
    )

    @field_validator(
        "twilio_account_sid",
        "twilio_auth_token",
        "twilio_whatsapp_from",
        "twilio_whatsapp_to",
        mode="before",
    )
    @classmethod
    def _strip_optional_str(cls, v: object) -> str | None:
        if v is None or v == "":
            return None
        if isinstance(v, str):
            s = v.strip()
            return s if s else None
        return str(v) if v is not None else None

    # API
    api_title: str = "POS Sales Agent API"
    api_version: str = "1.0.0"


@lru_cache
def get_settings() -> Settings:
    """Single cached settings instance per process."""
    return Settings()
