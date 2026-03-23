"""Cloudinary helpers – generate signed upload parameters for direct browser upload."""
import hashlib
import time

from app.core.config import settings


def _sha1(data: str) -> str:
    return hashlib.sha1(data.encode()).hexdigest()


def get_upload_signature(resource_type: str = "video") -> dict:
    """
    Generate a signed upload parameter set so the browser can upload
    directly to Cloudinary without routing the file through this server.

    Returns a dict ready to be POSTed to:
      https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/upload
    """
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
        raise RuntimeError("Cloudinary chưa được cấu hình. Kiểm tra CLOUDINARY_* trong .env")

    timestamp = int(time.time())
    folder = settings.CLOUDINARY_UPLOAD_FOLDER

    # Build the string to sign (params sorted alphabetically, no api_key/file/resource_type)
    params_to_sign = f"folder={folder}&timestamp={timestamp}"
    signature = _sha1(params_to_sign + settings.CLOUDINARY_API_SECRET)

    return {
        "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
        "api_key": settings.CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "resource_type": resource_type,
        # Convenience – FE constructs the upload URL from this
        "upload_url": (
            f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}"
            f"/{resource_type}/upload"
        ),
    }
