"""SQLAlchemy ORM model – Users (mirrors Supabase auth.users via FK)."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, List
from datetime import date

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.payment import PaymentOrder, Subscription
    from app.models.achievement import UserAchievement


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)

    # Hearts / energy system (v2.1 uses energy instead of hearts, matching schema `users.energy`)
    energy: Mapped[int] = mapped_column(Integer, default=3)
    max_energy: Mapped[int] = mapped_column(Integer, default=3)
    last_energy_refill: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Legacy field - leaving here just in case other parts reference it before refactoring, but mapped to energy
    @property
    def hearts(self):
        return self.energy
    
    @hearts.setter
    def hearts(self, value):
        self.energy = value

    @property
    def is_premium(self) -> bool:
        return self.plan in ("monthly", "yearly")

    # Subscription & Role
    role: Mapped[str] = mapped_column(String, default="user") # 'user' or 'admin'
    plan: Mapped[str] = mapped_column(String, default="free") # 'free', 'monthly', 'yearly'
    plan_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Phase 2: System Progress Tracking
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    highest_streak: Mapped[int] = mapped_column(Integer, default=0)
    total_points: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    payment_orders: Mapped[list["PaymentOrder"]] = relationship(back_populates="user", foreign_keys="[PaymentOrder.user_id]")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user", foreign_keys="[Subscription.user_id]")
    achievements: Mapped[List["UserAchievement"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    energy_logs: Mapped[list["EnergyLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class EnergyLog(Base):
    """Audit log for every energy change (consume, regen, admin top-up)."""

    __tablename__ = "energy_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    delta: Mapped[int] = mapped_column(Integer, nullable=False)          # âm = tiêu, dương = nhận
    reason: Mapped[str] = mapped_column(String(100), nullable=False)     # "boss_fight" | "lesson_action" | "regen" | "admin"
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    energy_after: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="energy_logs")
