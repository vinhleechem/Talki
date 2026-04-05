"""Upload file bytes to Supabase Storage. Dùng cho audio luyện tập (lưu 3 ngày).

Cấu hình Supabase:
- Tạo bucket tên đúng với AUDIO_BUCKET (.env, mặc định: conversation-audio).
- Storage > bucket > Settings: bật Public để URL public hoạt động (hoặc dùng signed URL).
- Có thể dùng Lifecycle rule xóa object sau 3 ngày (tùy chọn).
"""
import uuid

import httpx

from app.core.config import settings


def _storage_url(path: str) -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.AUDIO_BUCKET}/{path}"


def _public_url(path: str) -> str:
    """URL công khai để nghe file (bucket cần bật public hoặc dùng signed URL)."""
    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{settings.AUDIO_BUCKET}/{path}"


async def upload_audio(
    audio_bytes: bytes,
    subfolder: str,  # 'practice' or 'boss'
    user_id: uuid.UUID,
    file_id: uuid.UUID,
    content_type: str = "audio/webm",
) -> str | None:
    """
    Upload audio lên Supabase Storage.
    Đường dẫn: {subfolder}/{user_id}/{file_id}.webm
    Trả về URL công khai để nghe, hoặc None nếu lỗi.
    """
    if not audio_bytes or not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    path = f"{subfolder}/{user_id}/{file_id}.webm"
    url = _storage_url(path)
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": content_type,
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Dùng PUT cho raw bytes thường ổn định hơn trên Supabase Storage
            # X-Upsert: true cho phép ghi đè nếu tồn tại
            headers["x-upsert"] = "true"
            r = await client.put(url, content=audio_bytes, headers=headers)
            
            if r.status_code not in (200, 201):
                # Fallback sang POST nếu PUT không được hỗ trợ hoặc lỗi quyền
                print(f"[supabase_storage] PUT failed ({r.status_code}), trying POST...")
                r = await client.post(url, content=audio_bytes, headers=headers)
                
            if r.status_code not in (200, 201):
                print(f"[supabase_storage] Upload failed: {r.status_code} {r.text}")
                return None

        print(f"[supabase_storage] Uploaded successfully: {path}")
        return _public_url(path)
    except Exception as e:
        print(f"[supabase_storage] Exception: {e}")
        return None
