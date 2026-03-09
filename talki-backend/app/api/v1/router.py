from fastapi import APIRouter

from app.api.v1.endpoints import conversations, lessons, users

router = APIRouter(prefix="/api/v1")

router.include_router(users.router)
router.include_router(lessons.router)
router.include_router(conversations.router)
