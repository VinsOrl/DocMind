from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Known insecure/default values — the app refuses to start with any of these.
WEAK_SECRETS = {
    "change-me",
    "dev-secret-key",
    "dev-secret-key-change-this-in-production",
    "your-super-secret-key-change-this",
}


class Settings(BaseSettings):
    # LLM — always Ollama, never OpenAI
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma4:31b-cloud"
    EMBEDDING_MODEL: str = "intfloat/multilingual-e5-base"
    SECRET_KEY: str = "change-me"
    DATABASE_URL: str = "sqlite:///./docmind.db"
    UPLOAD_DIR: str = "./uploads"
    CHROMA_DIR: str = "./chroma_db"
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("SECRET_KEY")
    @classmethod
    def _validate_secret(cls, v: str) -> str:
        if v in WEAK_SECRETS or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be a strong random value (>= 32 chars) and not a "
                "default. Generate one with:\n"
                '  python -c "import secrets; print(secrets.token_urlsafe(48))"\n'
                "then set it via the SECRET_KEY environment variable."
            )
        return v


settings = Settings()
