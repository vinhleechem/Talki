"""Cloudinary helpers – using official SDK for secure signatures and management."""
import time
import cloudinary
import cloudinary.utils
import cloudinary.uploader

from app.core.config import settings

# Configure SDK
if settings.CLOUDINARY_CLOUD_NAME:
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True
    )

def get_upload_signature(resource_type: str = "auto", folder: str = None) -> dict:
    """
    Generate a signed upload parameter set so the browser can upload
    directly to Cloudinary without routing the file through this server.
    
    Args:
        resource_type: "image", "video", or "raw" (or "auto")
        folder: Optional target folder path (e.g. "talki/payments/qr")
    """
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
        raise RuntimeError("Cloudinary chưa được cấu hình. Kiểm tra CLOUDINARY_* trong .env")

    timestamp = int(time.time())
    # Use specified folder or fallback to default
    target_folder = folder or settings.CLOUDINARY_UPLOAD_FOLDER

    params = {
        "timestamp": timestamp,
        "folder": target_folder,
    }

    # The SDK sorts keys and appends the API Secret for SHA signing
    signature = cloudinary.utils.api_sign_request(params, settings.CLOUDINARY_API_SECRET)

    return {
        "cloud_name": settings.CLOUDINARY_CLOUD_NAME,
        "api_key": settings.CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "signature": signature,
        "folder": target_folder,
        "resource_type": resource_type,
        "upload_url": f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{resource_type}/upload",
    }

def extract_public_id(url: str) -> str | None:
    """
    Extract public_id from a Cloudinary URL.
    Works for: https://res.cloudinary.com/cloud_name/image/upload/v123/folder/public_id.jpg
    Returns: "folder/public_id"
    """
    if not url or "cloudinary.com" not in url:
        return None
    try:
        # Split by '/upload/' and discard the 'vXXXX' version part
        parts = url.split("/upload/")
        if len(parts) < 2:
            return None
        
        path = parts[1]
        # Remove version if present (v12345678/...)
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
            
        # Strip extension
        if "." in path:
            path = path.rsplit(".", 1)[0]
            
        return path
    except Exception:
        return None

def delete_media(public_id: str, resource_type: str = "image"):
    """
    Delete an asset from Cloudinary using the Admin/Uploader API.
    Note: public_id includes the folder if any (e.g. "talki/lessons/my_video")
    """
    if not public_id:
        return None
        
    try:
        # Determine resource_type if unknown (fallback to image)
        return cloudinary.uploader.destroy(public_id, resource_type=resource_type)
    except Exception as e:
        # Logging instead of raising to avoid breaking caller flow
        print(f"[Cloudinary] Error deleting {public_id}: {e}")
        return None
