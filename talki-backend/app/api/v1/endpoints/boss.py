"""Boss Fight API – REST + WebSocket endpoints."""
import base64
import json
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.boss import BossConfig, BossSession
from app.services import boss_service, heart_service, payment_service

router = APIRouter(prefix="/boss", tags=["boss"])


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class ScenarioOut(BaseModel):
    title: str
    context: str
    greeting_opener: str


class PersonalityOut(BaseModel):
    eng_key: str
    vi_display: str

class BossConfigOut(BaseModel):
    id: str
    chapter_id: str
    chapter_title: str
    scenarios: list[ScenarioOut]
    personalities: list[PersonalityOut]
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class BossConfigCreate(BaseModel):
    chapter_id: uuid.UUID
    scenarios: list[ScenarioOut]
    personalities: list[PersonalityOut]


class BossConfigUpdate(BaseModel):
    chapter_id: Optional[uuid.UUID] = None
    scenarios: Optional[list[ScenarioOut]] = None
    personalities: Optional[list[PersonalityOut]] = None


def _normalize_scenarios(raw: list | None) -> list[ScenarioOut]:
    out: list[ScenarioOut] = []
    for item in raw or []:
        if isinstance(item, dict):
            out.append(
                ScenarioOut(
                    title=str(item.get("title", "Tình huống")),
                    context=str(item.get("context", "")),
                    greeting_opener=str(item.get("greeting_opener", "Chào bạn!")),
                )
            )
        else:
            text = str(item)
            out.append(
                ScenarioOut(
                    title="Tình huống",
                    context=text,
                    greeting_opener="Chào bạn!",
                )
            )
    return out


def _normalize_personalities(raw: list | None) -> list[PersonalityOut]:
    out: list[PersonalityOut] = []
    for item in raw or []:
        if isinstance(item, dict):
            out.append(
                PersonalityOut(
                    eng_key=str(item.get("eng_key", "neutral")),
                    vi_display=str(item.get("vi_display", "Trung lập")),
                )
            )
        else:
            text = str(item)
            if "-" in text:
                parts = text.split("-", 1)
                out.append(
                    PersonalityOut(
                        eng_key=parts[0].strip(),
                        vi_display=parts[1].strip(),
                    )
                )
            else:
                out.append(
                    PersonalityOut(
                        eng_key="neutral",
                        vi_display=text,
                    )
                )
    return out


class CreateSessionRequest(BaseModel):
    chapter_id: uuid.UUID
    max_turns: int = 7
    pass_score: int = 60


class SessionOut(BaseModel):
    session_id: str
    scenario_title: str
    scenario: str  # Display string version of scenario context
    personality: str  # Display name of personality
    max_turns: int
    pass_score: int
    greeting_text: str
    greeting_audio_b64: str


class SessionHistoryOut(BaseModel):
    id: str
    scenario: str  # Display string version of scenario context
    personality: str  # Display name of personality
    final_score: Optional[int]
    passed: Optional[bool]
    turn_count: int
    is_complete: bool
    started_at: str
    finished_at: Optional[str]


# ─── REST: Configs (public read) ──────────────────────────────────────────────

@router.get("/configs", response_model=list[BossConfigOut])
async def list_boss_configs(db: AsyncSession = Depends(get_db)):
    """List all boss configurations."""
    configs = await boss_service.list_configs(db)
    return [
        BossConfigOut(
            id=str(c.id),
            chapter_id=str(c.chapter_id),
            chapter_title=c.chapter.title if c.chapter else "Chương đã bị xoá",
            scenarios=_normalize_scenarios(c.scenarios),
            personalities=_normalize_personalities(c.personalities),
            created_at=c.created_at.isoformat() if c.created_at else None,
        )
        for c in configs
    ]


# ─── REST: Sessions ────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
async def create_boss_session(
    body: CreateSessionRequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new boss fight session and deduct the configured energy cost."""
    config = await payment_service.get_or_create_manual_config(db)
    boss_cost = config.boss_fight_cost
    try:
        await heart_service.consume_energy(
            db, current_user_id, amount=boss_cost, reason="boss_fight"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=str(e),
        )

    session, greeting_text, scenario_title = await boss_service.create_session(
        db=db,
        user_id=current_user_id,
        chapter_id=body.chapter_id,
        max_turns=body.max_turns,
        pass_score=body.pass_score,
    )

    # TTS for greeting
    greeting_audio_b64 = ""
    try:
        from app.services import tts_service
        personality_str = str(session.personality)
        greeting_audio_b64 = await tts_service.synthesize_base64(greeting_text, personality_str)
    except Exception as e:
        print(f"[Boss TTS] Greeting synthesis failed: {e}")

    scenario_display = str(session.scenario)
    personality_display = str(session.personality)

    return SessionOut(
        session_id=str(session.id),
        scenario_title=scenario_title,
        scenario=scenario_display,
        personality=personality_display,
        max_turns=session.max_turns,
        pass_score=session.pass_score,
        greeting_text=greeting_text,
        greeting_audio_b64=greeting_audio_b64,
    )


@router.get("/sessions/me", response_model=list[SessionHistoryOut])
async def get_my_sessions(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get the current user's boss fight history."""
    result = await db.execute(
        select(BossSession)
        .where(BossSession.user_id == current_user_id)
        .order_by(BossSession.started_at.desc())
        .limit(20)
    )
    sessions = list(result.scalars().all())
    return [
        SessionHistoryOut(
            id=str(s.id),
            scenario=str(s.scenario),
            personality=str(s.personality),
            final_score=s.final_score,
            passed=s.passed,
            turn_count=s.turn_count,
            is_complete=s.is_complete,
            started_at=s.started_at.isoformat(),
            finished_at=s.finished_at.isoformat() if s.finished_at else None,
        )
        for s in sessions
    ]


# ─── WebSocket: Real-time voice pipeline ──────────────────────────────────────
#
# Protocol:
#   Client → Server:  binary (raw audio bytes, WebM/Opus)
#                  or JSON text: {"type": "ping"}
#   Server → Client:  JSON text message with one of:
#     {"type": "processing"}
#     {"type": "turn_result", ...turn_result_fields...}
#     {"type": "error", "message": "..."}

@router.websocket("/ws/{session_id}")
async def boss_websocket(
    session_id: str,
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    WebSocket endpoint for real-time voice boss fight.

    Authentication: pass JWT token as query param ?token=<jwt>
    The client sends raw audio bytes (WebM/Opus) per turn.
    The server returns JSON with transcript, reply text, audio (base64 MP3),
    HP updates, and optionally final scores.
    """
    await websocket.accept()

    # ── Auth via token query param ───────────────────────────────────────────
    if not token:
        await websocket.send_text(json.dumps({"type": "error", "message": "Missing auth token"}))
        await websocket.close(code=4001)
        return

    try:
        from app.core.security import verify_token_get_user_id
        user_id = await verify_token_get_user_id(token)
    except Exception:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid or expired token"}))
        await websocket.close(code=4001)
        return

    # Load session
    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        await websocket.send_text(json.dumps({"type": "error", "message": "Invalid session ID"}))
        await websocket.close()
        return

    session = await db.get(BossSession, session_uuid)
    if not session:
        await websocket.send_text(json.dumps({"type": "error", "message": "Session not found"}))
        await websocket.close()
        return

    if session.is_complete:
        await websocket.send_text(json.dumps({"type": "error", "message": "Session already complete"}))
        await websocket.close()
        return

    try:
        while True:
            # Receive message (binary audio or text control)
            message = await websocket.receive()

            if "bytes" in message and message["bytes"]:
                audio_bytes = message["bytes"]

                # Acknowledge receipt immediately
                await websocket.send_text(json.dumps({"type": "processing"}))

                try:
                    result = await boss_service.process_audio_turn(
                        db=db,
                        session=session,
                        audio_bytes=audio_bytes,
                        mime_type="audio/webm",
                    )
                    await websocket.send_text(
                        json.dumps({"type": "turn_result", **result})
                    )

                    # Refresh session state after commit
                    await db.refresh(session)

                    if result.get("is_final"):
                        await websocket.close()
                        break

                except Exception as e:
                    await websocket.send_text(
                        json.dumps({"type": "error", "message": str(e)})
                    )

            elif "text" in message and message["text"]:
                try:
                    ctrl = json.loads(message["text"])
                    if ctrl.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                    elif ctrl.get("type") == "finish":
                        # Client requested early finish / evaluation
                        result = await boss_service.boss_evaluate(db, session)
                        await websocket.send_text(
                            json.dumps({"type": "turn_result", **result})
                        )
                        await websocket.close()
                        break
                except json.JSONDecodeError:
                    pass

    except WebSocketDisconnect:
        pass  # Normal disconnect, no cleanup needed
