"""Admin-only endpoints. All routes require role='admin'."""
import uuid
import httpx
import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_admin
from app.models.achievement import Achievement
from app.models.conversation import Conversation, ConversationStatus
from app.models.lesson import Boss, Chapter, Lesson
from app.models.payment import PaymentOrder
from app.models.user import EnergyLog, User
from app.services import cloudinary_service, payment_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────

class AdminStats(BaseModel):
    total_users: int
    active_lessons: int
    total_conversations: int
    total_revenue_vnd: int


class AdminUserOut(BaseModel):
    id: uuid.UUID
    display_name: str
    email: str
    role: str
    plan: str
    energy: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    display_name: str
    email: str
    password: str
    role: str = "user"
    plan: str = "free"
    energy: int = 3


class AdminUserUpdate(BaseModel):
    role: Optional[str] = None   # 'user' | 'admin'
    plan: Optional[str] = None   # 'free' | 'monthly' | 'yearly'
    energy: Optional[int] = None


class AdminChapterOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    thumbnail_url: Optional[str]
    order_index: int
    boss_unlock_threshold: int
    is_published: bool
    lesson_count: int = 0

    class Config:
        from_attributes = True


class ChapterCreate(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_index: int = 0
    boss_unlock_threshold: int = 80
    is_published: bool = False


class ChapterUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    order_index: Optional[int] = None
    boss_unlock_threshold: Optional[int] = None
    is_published: Optional[bool] = None


class AdminLessonOut(BaseModel):
    id: uuid.UUID
    chapter_id: uuid.UUID
    title: str
    video_url: Optional[str]
    video_duration: int
    action_prompt: Optional[str]
    order_index: int
    is_published: bool

    class Config:
        from_attributes = True


class LessonCreate(BaseModel):
    title: str
    video_url: Optional[str] = None
    video_duration: int = 0
    action_prompt: Optional[str] = None
    order_index: int = 0
    is_published: bool = False


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    video_url: Optional[str] = None
    video_duration: Optional[int] = None
    action_prompt: Optional[str] = None
    order_index: Optional[int] = None
    is_published: Optional[bool] = None


class AdminBossOut(BaseModel):
    id: uuid.UUID
    chapter_id: uuid.UUID
    name: str
    mission_prompt: str
    persona_prompt: str
    gender: str
    max_turns: int
    pass_score: int
    avatar_url: Optional[str]
    is_published: bool

    class Config:
        from_attributes = True


class BossCreate(BaseModel):
    name: str
    mission_prompt: Optional[str] = None
    persona_prompt: str
    gender: str = "neutral"
    max_turns: int = 5
    pass_score: int = 60
    avatar_url: Optional[str] = None
    is_published: bool = False


class BossUpdate(BaseModel):
    name: Optional[str] = None
    mission_prompt: Optional[str] = None
    persona_prompt: Optional[str] = None
    gender: Optional[str] = None
    max_turns: Optional[int] = None
    pass_score: Optional[int] = None
    avatar_url: Optional[str] = None
    is_published: Optional[bool] = None


class AdminAchievementOut(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: str
    icon_url: Optional[str]
    condition_type: str
    condition_value: int
    created_at: datetime

    class Config:
        from_attributes = True


class AchievementCreate(BaseModel):
    code: str
    name: str
    description: str
    icon_url: Optional[str] = None
    condition_type: str
    condition_value: int


class AchievementUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    condition_type: Optional[str] = None
    condition_value: Optional[int] = None


class AdminPaymentOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_name: str
    plan: str
    amount_vnd: int
    status: str
    transfer_note: Optional[str]
    admin_note: Optional[str]
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[uuid.UUID]
    created_at: datetime
    paid_at: Optional[datetime]

    class Config:
        from_attributes = True


class AdminManualPaymentConfigOut(BaseModel):
    qr_image_url: Optional[str]
    bank_name: Optional[str]
    account_number: Optional[str]
    account_name: Optional[str]
    transfer_prefix: str
    instructions: Optional[str]
    monthly_price: int
    yearly_price: int
    updated_at: Optional[datetime]


class AdminManualPaymentConfigUpdate(BaseModel):
    qr_image_url: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_name: Optional[str] = None
    transfer_prefix: Optional[str] = None
    instructions: Optional[str] = None
    monthly_price: Optional[int] = None
    yearly_price: Optional[int] = None


class AdminPaymentReviewRequest(BaseModel):
    status: str  # pending | paid | failed | cancelled
    admin_note: Optional[str] = None


class AdminConversationOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    boss_id: uuid.UUID
    boss_name: str
    user_name: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime]

    class Config:
        from_attributes = True


class AdminEnergyLogOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    delta: int
    reason: str
    energy_after: int
    reference_id: Optional[uuid.UUID]
    source_type: Optional[str]
    source_name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# DASHBOARD STATS
# ─────────────────────────────────────────────

@router.get("/stats", response_model=AdminStats)
async def get_stats(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active_lessons = (
        await db.execute(select(func.count(Lesson.id)).where(Lesson.is_published == True))
    ).scalar() or 0
    total_conversations = (await db.execute(select(func.count(Conversation.id)))).scalar() or 0
    total_revenue = (
        await db.execute(
            select(func.sum(PaymentOrder.amount_vnd)).where(PaymentOrder.status == "paid")
        )
    ).scalar() or 0

    return AdminStats(
        total_users=total_users,
        active_lessons=active_lessons,
        total_conversations=total_conversations,
        total_revenue_vnd=total_revenue,
    )


# ─────────────────────────────────────────────
# USER MANAGEMENT
# ─────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.post("/users", response_model=AdminUserOut, status_code=201)
async def create_user(
    body: AdminUserCreate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "email": body.email,
        "password": body.password,
        "email_confirm": True,
        "user_metadata": {
            "display_name": body.display_name
        }
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers, timeout=10)
    
    if resp.status_code not in (200, 201):
        err = resp.json()
        error_msg = err.get("message") or err.get("msg") or str(err)
        raise HTTPException(
            status_code=400, 
            detail=error_msg
        )
        
    data = resp.json()
    user_id = data.get("id")
    
    # Wait briefly for Supabase Postgres trigger to insert the user
    await asyncio.sleep(1)
    
    user = await db.get(User, uuid.UUID(user_id))
    if user:
        user.role = body.role
        user.plan = body.plan
        user.energy = body.energy
        await db.flush()
        return user

    # If trigger is slow or doesn't exist, we just return the object shape
    # The frontend will update local state nicely
    return AdminUserOut(
        id=uuid.UUID(user_id),
        display_name=body.display_name,
        email=body.email,
        role=body.role,
        plan=body.plan,
        energy=body.energy,
        created_at=datetime.now(timezone.utc)
    )


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.role is not None:
        if body.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="role must be 'user' or 'admin'")
        user.role = body.role
    if body.plan is not None:
        if body.plan not in ("free", "monthly", "yearly"):
            raise HTTPException(status_code=400, detail="Invalid plan")
        user.plan = body.plan
    if body.energy is not None:
        user.energy = body.energy
    await db.flush()
    return user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: uuid.UUID,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # Delete from Supabase Auth first
    url = f"{settings.SUPABASE_URL}/auth/v1/admin/users/{user_id}"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.delete(url, headers=headers, timeout=10)
    
    if resp.status_code not in (200, 204):
        err = resp.json() if resp.content else {}
        raise HTTPException(status_code=400, detail=err.get("message") or "Failed to delete user from Supabase")

    # Remove from local DB (cascade should handle related records)
    user = await db.get(User, user_id)
    if user:
        await db.delete(user)
        await db.flush()


# ─────────────────────────────────────────────
# CONTENT: CHAPTERS  (top-level, no levels table)
# ─────────────────────────────────────────────

@router.get("/chapters", response_model=list[AdminChapterOut])
async def list_chapters(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Chapter).order_by(Chapter.order_index))
    chapters = result.scalars().all()
    out = []
    for ch in chapters:
        count = (
            await db.execute(select(func.count(Lesson.id)).where(Lesson.chapter_id == ch.id))
        ).scalar() or 0
        out.append(AdminChapterOut(**{c: getattr(ch, c) for c in AdminChapterOut.model_fields if hasattr(ch, c)}, lesson_count=count))
    return out


@router.post("/chapters", response_model=AdminChapterOut, status_code=201)
async def create_chapter(
    body: ChapterCreate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    chapter = Chapter(**body.model_dump())
    db.add(chapter)
    await db.flush()
    await db.refresh(chapter)
    return AdminChapterOut(**{c: getattr(chapter, c) for c in AdminChapterOut.model_fields if hasattr(chapter, c)}, lesson_count=0)


@router.patch("/chapters/{chapter_id}", response_model=AdminChapterOut)
async def update_chapter(
    chapter_id: uuid.UUID,
    body: ChapterUpdate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    chapter = await db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(chapter, field, value)
    await db.flush()
    count = (
        await db.execute(select(func.count(Lesson.id)).where(Lesson.chapter_id == chapter.id))
    ).scalar() or 0
    return AdminChapterOut(**{c: getattr(chapter, c) for c in AdminChapterOut.model_fields if hasattr(chapter, c)}, lesson_count=count)


@router.delete("/chapters/{chapter_id}", status_code=204)
async def delete_chapter(
    chapter_id: uuid.UUID,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    chapter = await db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    await db.delete(chapter)


# ─────────────────────────────────────────────
# CONTENT: LESSONS
# ─────────────────────────────────────────────

@router.get("/chapters/{chapter_id}/lessons", response_model=list[AdminLessonOut])
async def list_lessons(
    chapter_id: uuid.UUID,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lesson).where(Lesson.chapter_id == chapter_id).order_by(Lesson.order_index)
    )
    return result.scalars().all()


@router.post("/chapters/{chapter_id}/lessons", response_model=AdminLessonOut, status_code=201)
async def create_lesson(
    chapter_id: uuid.UUID,
    body: LessonCreate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    lesson = Lesson(chapter_id=chapter_id, **body.model_dump())
    db.add(lesson)
    await db.flush()
    await db.refresh(lesson)
    return lesson


@router.patch("/lessons/{lesson_id}", response_model=AdminLessonOut)
async def update_lesson(
    lesson_id: uuid.UUID,
    body: LessonUpdate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(lesson, field, value)
    await db.flush()
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(
    lesson_id: uuid.UUID,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await db.delete(lesson)


# ─────────────────────────────────────────────
# BOSS MANAGEMENT
# ─────────────────────────────────────────────

@router.get("/bosses", response_model=list[AdminBossOut])
async def list_bosses(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Boss))
    return result.scalars().all()


@router.post("/chapters/{chapter_id}/boss", response_model=AdminBossOut, status_code=201)
async def create_boss(
    chapter_id: uuid.UUID,
    body: BossCreate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    chapter = await db.get(Chapter, chapter_id)
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    existing = (await db.execute(select(Boss).where(Boss.chapter_id == chapter_id))).scalar()
    if existing:
        raise HTTPException(status_code=400, detail="Boss already exists for this chapter")
    boss = Boss(chapter_id=chapter_id, **body.model_dump())
    db.add(boss)
    await db.flush()
    await db.refresh(boss)
    return boss


@router.patch("/bosses/{boss_id}", response_model=AdminBossOut)
async def update_boss(
    boss_id: uuid.UUID,
    body: BossUpdate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    boss = await db.get(Boss, boss_id)
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(boss, field, value)
    await db.flush()
    return boss


@router.delete("/bosses/{boss_id}", status_code=204)
async def delete_boss(
    boss_id: uuid.UUID,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    boss = await db.get(Boss, boss_id)
    if not boss:
        raise HTTPException(status_code=404, detail="Boss not found")
    await db.delete(boss)


# ─────────────────────────────────────────────
# ACHIEVEMENTS MANAGEMENT
# ─────────────────────────────────────────────

@router.get("/achievements", response_model=list[AdminAchievementOut])
async def list_achievements(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Achievement).order_by(Achievement.created_at))
    return result.scalars().all()


@router.post("/achievements", response_model=AdminAchievementOut, status_code=201)
async def create_achievement(
    body: AchievementCreate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(Achievement).where(Achievement.code == body.code))).scalar()
    if existing:
        raise HTTPException(status_code=400, detail=f"Achievement code '{body.code}' already exists")
    achievement = Achievement(**body.model_dump())
    db.add(achievement)
    await db.flush()
    await db.refresh(achievement)
    return achievement


@router.patch("/achievements/{achievement_id}", response_model=AdminAchievementOut)
async def update_achievement(
    achievement_id: uuid.UUID,
    body: AchievementUpdate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    achievement = await db.get(Achievement, achievement_id)
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(achievement, field, value)
    await db.flush()
    return achievement


@router.delete("/achievements/{achievement_id}", status_code=204)
async def delete_achievement(
    achievement_id: uuid.UUID,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    achievement = await db.get(Achievement, achievement_id)
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement not found")
    await db.delete(achievement)


# ─────────────────────────────────────────────
# PAYMENT MANAGEMENT
# ─────────────────────────────────────────────

@router.get("/payments", response_model=list[AdminPaymentOut])
async def list_payments(
    skip: int = 0,
    limit: int = 50,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaymentOrder)
        .where(PaymentOrder.status != "created")
        .order_by(PaymentOrder.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    orders = result.scalars().all()
    
    out = []
    for order in orders:
        user = await db.get(User, order.user_id)
        out.append(AdminPaymentOut(
            id=order.id,
            user_id=order.user_id,
            user_email=user.email if user else "Unknown",
            user_name=user.display_name if user else "Unknown",
            plan=order.plan,
            amount_vnd=order.amount_vnd,
            status=order.status,
            transfer_note=order.transfer_note,
            admin_note=order.admin_note,
            reviewed_at=order.reviewed_at,
            reviewed_by=order.reviewed_by,
            created_at=order.created_at,
            paid_at=order.paid_at,
        ))
    return out


@router.get("/payment-config", response_model=AdminManualPaymentConfigOut)
async def get_payment_config(
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await payment_service.get_or_create_manual_config(db)
    return AdminManualPaymentConfigOut(
        qr_image_url=config.qr_image_url,
        bank_name=config.bank_name,
        account_number=config.account_number,
        account_name=config.account_name,
        transfer_prefix=config.transfer_prefix,
        instructions=config.instructions,
        monthly_price=config.monthly_price,
        yearly_price=config.yearly_price,
        updated_at=config.updated_at,
    )


@router.put("/payment-config", response_model=AdminManualPaymentConfigOut)
async def update_payment_config(
    body: AdminManualPaymentConfigUpdate,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await payment_service.get_or_create_manual_config(db)

    update_data = body.model_dump(exclude_none=True)
    if "transfer_prefix" in update_data:
        transfer_prefix = (update_data["transfer_prefix"] or "").strip().upper()
        if not transfer_prefix:
            raise HTTPException(status_code=400, detail="transfer_prefix cannot be empty")
        update_data["transfer_prefix"] = transfer_prefix[:20]

    for field, value in update_data.items():
        setattr(config, field, value)

    await db.flush()
    await db.refresh(config)
    return AdminManualPaymentConfigOut(
        qr_image_url=config.qr_image_url,
        bank_name=config.bank_name,
        account_number=config.account_number,
        account_name=config.account_name,
        transfer_prefix=config.transfer_prefix,
        instructions=config.instructions,
        monthly_price=config.monthly_price,
        yearly_price=config.yearly_price,
        updated_at=config.updated_at,
    )


@router.patch("/payments/{payment_id}", response_model=AdminPaymentOut)
async def review_payment(
    payment_id: uuid.UUID,
    body: AdminPaymentReviewRequest,
    admin_user_id: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        order = await payment_service.admin_review_payment_order(
            db,
            payment_id,
            uuid.UUID(admin_user_id),
            body.status,
            body.admin_note,
        )
        user = await db.get(User, order.user_id)
        return AdminPaymentOut(
            id=order.id,
            user_id=order.user_id,
            user_email=user.email if user else "Unknown",
            user_name=user.display_name if user else "Unknown",
            plan=order.plan,
            amount_vnd=order.amount_vnd,
            status=order.status,
            transfer_note=order.transfer_note,
            admin_note=order.admin_note,
            reviewed_at=order.reviewed_at,
            reviewed_by=order.reviewed_by,
            created_at=order.created_at,
            paid_at=order.paid_at,
        )
    except ValueError as e:
        detail = str(e)
        status_code = 404 if detail == "Payment order not found" else 400
        raise HTTPException(status_code=status_code, detail=detail)


# ─────────────────────────────────────────────
# RECENT CONVERSATIONS (Boss Fights)
# ─────────────────────────────────────────────

@router.get("/conversations", response_model=list[AdminConversationOut])
async def list_conversations(
    skip: int = 0,
    limit: int = 20,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).order_by(Conversation.started_at.desc()).offset(skip).limit(limit)
    )
    convs = result.scalars().all()
    out = []
    for conv in convs:
        user = await db.get(User, conv.user_id)
        boss = await db.get(Boss, conv.boss_id)
        out.append(
            AdminConversationOut(
                id=conv.id,
                user_id=conv.user_id,
                boss_id=conv.boss_id,
                boss_name=boss.name if boss else "Unknown",
                user_name=user.display_name if user else "Unknown",
                status=conv.status.value,
                started_at=conv.started_at,
                ended_at=conv.ended_at,
            )
        )
    return out


@router.get("/energy-logs", response_model=list[AdminEnergyLogOut])
async def list_energy_logs(
    skip: int = 0,
    limit: int = 100,
    _: str = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EnergyLog).order_by(EnergyLog.created_at.desc()).offset(skip).limit(limit)
    )
    logs = result.scalars().all()

    out: list[AdminEnergyLogOut] = []
    for log in logs:
        user = await db.get(User, log.user_id)

        source_type: Optional[str] = None
        source_name: Optional[str] = None
        if log.reason == "lesson_action" and log.reference_id:
            lesson = await db.get(Lesson, log.reference_id)
            source_type = "lesson"
            source_name = lesson.title if lesson else "Lesson không xác định"
        elif log.reason == "boss_fight" and log.reference_id:
            boss = await db.get(Boss, log.reference_id)
            source_type = "boss"
            source_name = boss.name if boss else "Boss không xác định"
        elif log.reason in ("daily_refill", "regen"):
            source_type = "system"
            source_name = "Hồi năng lượng"
        elif log.reason == "admin":
            source_type = "admin"
            source_name = "Admin điều chỉnh"
        else:
            source_type = "other"
            source_name = log.reason

        out.append(
            AdminEnergyLogOut(
                id=log.id,
                user_id=log.user_id,
                user_name=user.display_name if user else "Unknown",
                delta=log.delta,
                reason=log.reason,
                energy_after=log.energy_after,
                reference_id=log.reference_id,
                source_type=source_type,
                source_name=source_name,
                created_at=log.created_at,
            )
        )

    return out


# ─── Cloudinary Upload Signature ─────────────────────────────────────────────

@router.post("/upload-signature")
async def get_upload_signature(
    resource_type: str = "video",
    folder: str = None,
    _: str = Depends(require_admin),
):
    """Trả về signed upload params để FE upload thẳng lên Cloudinary."""
    try:
        return cloudinary_service.get_upload_signature(
            resource_type=resource_type, folder=folder
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ─── Admin: Boss Config CRUD ─────────────────────────────────────────────────

from app.models.boss import BossConfig  # noqa: E402
from app.services import boss_service   # noqa: E402


class ScenarioIn(BaseModel):
    """Scenario object with context and greeting."""
    title: str
    context: str
    greeting_opener: str


class PersonalityIn(BaseModel):
    """Boss personality/character."""
    eng_key: str
    vi_display: str


class AdminBossConfigOut(BaseModel):
    id: str
    chapter_id: str
    chapter_title: str
    scenarios: list[ScenarioIn]
    personalities: list[PersonalityIn]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AdminBossConfigCreate(BaseModel):
    chapter_id: uuid.UUID
    scenarios: list[ScenarioIn]
    personalities: list[PersonalityIn]


class AdminBossConfigUpdate(BaseModel):
    chapter_id: Optional[uuid.UUID] = None
    scenarios: Optional[list[ScenarioIn]] = None
    personalities: Optional[list[PersonalityIn]] = None


def _normalize_scenarios(raw: list | None) -> list[ScenarioIn]:
    out: list[ScenarioIn] = []
    for item in raw or []:
        if isinstance(item, dict):
            out.append(
                ScenarioIn(
                    title=str(item.get("title", "Tình huống")),
                    context=str(item.get("context", "")),
                    greeting_opener=str(item.get("greeting_opener", "Chào bạn!")),
                )
            )
        else:
            text = str(item)
            out.append(
                ScenarioIn(
                    title="Tình huống",
                    context=text,
                    greeting_opener="Chào bạn!",
                )
            )
    return out


def _normalize_personalities(raw: list | None) -> list[PersonalityIn]:
    out: list[PersonalityIn] = []
    for item in raw or []:
        if isinstance(item, dict):
            out.append(
                PersonalityIn(
                    eng_key=str(item.get("eng_key", "neutral")),
                    vi_display=str(item.get("vi_display", "Trung lập")),
                )
            )
        else:
            text = str(item)
            if "-" in text:
                parts = text.split("-", 1)
                out.append(
                    PersonalityIn(
                        eng_key=parts[0].strip(),
                        vi_display=parts[1].strip(),
                    )
                )
            else:
                out.append(
                    PersonalityIn(
                        eng_key="neutral",
                        vi_display=text,
                    )
                )
    return out


def _boss_config_out(c: BossConfig) -> AdminBossConfigOut:
    return AdminBossConfigOut(
        id=str(c.id),
        chapter_id=str(c.chapter_id),
        chapter_title=c.chapter.title if c.chapter else "Chương đã bị xoá",
        scenarios=_normalize_scenarios(c.scenarios),
        personalities=_normalize_personalities(c.personalities),
        created_at=c.created_at.isoformat() if c.created_at else None,
        updated_at=c.updated_at.isoformat() if c.updated_at else None,
    )


@router.get("/boss-configs", response_model=list[AdminBossConfigOut])
async def admin_list_boss_configs(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Liệt kê tất cả cấu hình Boss."""
    configs = await boss_service.list_configs(db)
    return [_boss_config_out(c) for c in configs]


@router.post("/boss-configs", response_model=AdminBossConfigOut, status_code=201)
async def admin_create_boss_config(
    body: AdminBossConfigCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Tạo cấu hình Boss mới."""
    config = await boss_service.admin_create_config(db, body.model_dump())
    return _boss_config_out(config)


@router.put("/boss-configs/{config_id}", response_model=AdminBossConfigOut)
async def admin_update_boss_config(
    config_id: uuid.UUID,
    body: AdminBossConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Cập nhật cấu hình Boss."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    config = await boss_service.admin_update_config(db, config_id, updates)
    if not config:
        raise HTTPException(status_code=404, detail="BossConfig not found")
    return _boss_config_out(config)


@router.delete("/boss-configs/{config_id}", status_code=204)
async def admin_delete_boss_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_admin),
):
    """Xoá cấu hình Boss."""
    ok = await boss_service.admin_delete_config(db, config_id)
    if not ok:
        raise HTTPException(status_code=404, detail="BossConfig not found")
