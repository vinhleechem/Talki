from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Talki API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False
    # Comma-separated origins for browser requests (add prod domain in .env.production)
    CORS_ORIGINS: str = (
        "http://localhost:8080,http://localhost:5173,"
        "http://talki.id.vn,https://talki.id.vn,"
        "http://www.talki.id.vn,https://www.talki.id.vn"
    )

    # Database (Supabase Postgres)
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/db
    DB_POOL_SIZE: int = 2
    DB_MAX_OVERFLOW: int = 0
    DB_POOL_TIMEOUT: int = 30

    # Supabase (for auth & storage)
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str = ""          # public anon key – used for user-facing auth
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Google Gemini AI
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_TTS_FAST_MODEL: str = "gemini-2.5-flash-preview-tts"
    GOOGLE_CLOUD_CREDENTIALS_JSON: str = ""


    # Cloudinary (media hosting for lesson videos)
    CLOUDINARY_URL: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_UPLOAD_FOLDER: str = "talki-lessons"

    # Hearts system
    FREE_HEARTS_PER_DAY: int = 3
    HEART_REGEN_HOURS: int = 8  # 1 heart every N hours

    # Audio storage (Supabase Storage bucket)
    AUDIO_BUCKET: str = "conversation-audio"
    AUDIO_RETENTION_DAYS: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
