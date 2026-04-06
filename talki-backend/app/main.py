import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router
from app.core.config import settings
from app.core.error_messages import to_public_error_message

logger = logging.getLogger(__name__)

_CORS_ORIGINS = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Sanitize HTTPException detail before returning to client."""
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _CORS_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"

    safe_detail = to_public_error_message(exc.detail, exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": safe_detail},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler so unhandled exceptions still get CORS headers."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in _CORS_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers=headers,
    )


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )
    # Add global HTTPBearer security scheme so Swagger shows one "Authorize" button
    schema.setdefault("components", {}).setdefault("securitySchemes", {})["BearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Paste the access_token returned by POST /api/v1/auth/token",
    }
    # Apply the scheme globally to every operation
    for path_item in schema.get("paths", {}).values():
        for operation in path_item.values():
            if isinstance(operation, dict):
                operation.setdefault("security", [{"BearerAuth": []}])
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi  # type: ignore


@app.get("/health")
async def health():
    return {"status": "ok"}
