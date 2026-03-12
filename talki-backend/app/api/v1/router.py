from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    conversations,
    lessons,
    users,
    payments,
    achievements,
    mistakes,
    admin,
)

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(lessons.router)
router.include_router(conversations.router)
router.include_router(payments.router)
router.include_router(achievements.router)
router.include_router(mistakes.router)
router.include_router(admin.router)
