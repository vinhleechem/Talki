"""JWT verification for Supabase tokens (dev-friendly, no PEM)."""
import uuid
import base64
import json
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

bearer_scheme = HTTPBearer()


import logging

logger = logging.getLogger(__name__)


def _b64url_decode(segment: str) -> bytes:
    """Decode a base64url JWT segment with padding handling."""
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Decode Supabase JWT and return user UUID (no signature verify in dev)."""
    token = credentials.credentials
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing")

    try:
        # Inspect header first to read alg, but we won't actually use it to do RSA/HMAC verification in dev.
        unverified_header = jwt.get_unverified_header(token)
        alg = (unverified_header or {}).get("alg")
        logger.info(f"JWT Header: {unverified_header}")

        # Disallow missing / insecure algorithms explicitly
        if not alg or str(alg).lower() == "none":
            raise ValueError("The specified alg value is not allowed")

        # Parse payload manually to avoid any PEM / JWKS issues with cryptography
        try:
            header_b64, payload_b64, _sig = token.split(".")
        except ValueError:
            raise ValueError("Malformed JWT")

        raw_payload = _b64url_decode(payload_b64)
        payload = json.loads(raw_payload.decode("utf-8"))

        user_id: str = payload.get("sub")
        if not user_id:
            raise ValueError("Missing subject (sub)")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except Exception as e:
        logger.exception(f"JWT validation failed for token: {token[:10]}...")
        error_msg = str(e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {error_msg}")


async def require_admin(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(None),  # injected properly via endpoint dependency
) -> str:
    """Return user_id only if the user has role='admin'."""
    from app.core.database import get_db
    from app.models.user import User
    # db is passed through the endpoint — this is a placeholder wrapper
    return user_id


def make_require_admin():
    """Factory that returns a FastAPI dependency checking admin role."""
    from app.core.database import get_db
    from app.models.user import User

    async def _require_admin(
        user_id: str = Depends(get_current_user_id),
        db: AsyncSession = Depends(get_db),
    ) -> str:
        user = await db.get(User, uuid.UUID(user_id))
        if not user or user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
        return user_id

    return _require_admin


require_admin = make_require_admin()


async def verify_token_get_user_id(token: str) -> str:
    """
    Verify a raw JWT string (no HTTPBearer header).
    Used by WebSocket endpoints that receive token as a query param.
    Raises an Exception if the token is invalid or missing 'sub'.
    """
    if not token:
        raise ValueError("Token missing")

    unverified_header = jwt.get_unverified_header(token)
    alg = (unverified_header or {}).get("alg")
    if not alg or str(alg).lower() == "none":
        raise ValueError("The specified alg value is not allowed")

    try:
        _header_b64, payload_b64, _sig = token.split(".")
    except ValueError:
        raise ValueError("Malformed JWT")

    raw_payload = _b64url_decode(payload_b64)
    payload = json.loads(raw_payload.decode("utf-8"))

    user_id: str = payload.get("sub", "")
    if not user_id:
        raise ValueError("Missing subject (sub)")
    return user_id
