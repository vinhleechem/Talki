"""Auth helpers – login endpoint so Swagger/Postman can get a JWT."""
import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Login – get JWT for Swagger / Postman",
    description=(
        "Calls Supabase signInWithPassword and returns the access_token. "
        "Paste it into the **Authorize** button (🔒) at the top of this page."
    ),
)
async def login(body: LoginRequest):
    """Exchange email+password for a Supabase JWT."""
    api_key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    url = f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json={"email": body.email, "password": body.password},
            headers={"apikey": api_key, "Content-Type": "application/json"},
            timeout=10,
        )

    if resp.status_code != 200:
        data = resp.json()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=data.get("error_description") or data.get("msg") or "Invalid credentials",
        )

    data = resp.json()
    return TokenResponse(
        access_token=data["access_token"],
        expires_in=data.get("expires_in", 3600),
    )
