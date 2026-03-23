from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Talki API"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = False

    # Database (Supabase Postgres)
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/db

    # Supabase (for auth & storage)
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str = ""          # public anon key – used for user-facing auth
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str

    # Google Gemini AI
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # Google Cloud (STT / TTS)
    GOOGLE_CLOUD_CREDENTIALS_JSON: str = ""  # path to service account JSON

    # PayOS
    PAYOS_CLIENT_ID: str = ""
    PAYOS_API_KEY: str = ""
    PAYOS_CHECKSUM_KEY: str = ""

    # Cloudinary (media hosting for lesson videos)
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


settings = Settings()
