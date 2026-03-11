# Talki — Nền tảng luyện Phản xạ & Tự tin Giao tiếp (AI Mentor)

> **Version:** 2.1 | **Ngôn ngữ mục tiêu:** Tiếng Việt | **Cập nhật:** 09/03/2026

> 📋 **Git workflow & quy tắc commit:** xem [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cấu trúc Monorepo](#2-cấu-trúc-monorepo)
3. [Frontend — React + Vite](#3-frontend--react--vite)
4. [Backend — FastAPI + Python](#4-backend--fastapi--python)
5. [Luồng dữ liệu chính](#5-luồng-dữ-liệu-chính)
6. [Cách chạy dự án](#6-cách-chạy-dự-án)
7. [Biến môi trường](#7-biến-môi-trường)

---

## 1. Tổng quan

Talki giúp sinh viên và người đi làm luyện **kỹ năng giao tiếp tiếng Việt** thông qua các phiên hội thoại giả lập (Boss Fight) với AI. Hệ thống gồm hai thành phần độc lập:

| Thành phần   | Công nghệ                                               | Port mặc định |
| ------------ | ------------------------------------------------------- | ------------- |
| **Frontend** | React 18 + Vite + TypeScript + shadcn/ui                | `5173`        |
| **Backend**  | FastAPI (Python) + SQLAlchemy async + Supabase Postgres | `8000`        |

Auth được xử lý hoàn toàn bởi **Supabase Auth** (JWT). Backend chỉ verify JWT, không lưu mật khẩu.

---

## 2. Cấu trúc Monorepo

```
EXE201/
├── docker-compose.yml     ← Chạy toàn bộ stack bằng 1 lệnh
├── frontend/              ← React Web App
│   └── Dockerfile.dev     ← Docker image cho Vite dev server
├── talki-backend/         ← FastAPI REST API
│   └── Dockerfile         ← Docker image cho uvicorn
└── README.md              ← file này
```

---

## 3. Frontend — React + Vite

### 3.1 Stack

- **Vite** + **TypeScript** — build tool
- **React Router v6** — routing
- **TanStack Query** — server state / caching
- **shadcn/ui** + **Radix UI** + **Tailwind CSS** — UI components
- **Supabase JS** — auth client

### 3.2 Cấu trúc thư mục

```
frontend/src/
│
├── main.tsx                  ← Entry point (mount React app)
├── App.tsx                   ← Router + global providers
│
├── pages/                    ← Mỗi file = 1 màn hình (route)
│   ├── Auth.tsx              ← Màn hình đăng nhập / đăng ký
│   ├── RoadMap.tsx           ← Lộ trình học (Chapter → Lesson)
│   ├── Practice.tsx          ← Danh sách bài luyện tập
│   ├── BossChallengeWrapper.tsx  ← Wrapper khởi động Boss Fight
│   ├── Achievements.tsx      ← Thành tích & huy hiệu
│   ├── Profile.tsx           ← Hồ sơ người dùng
│   ├── PhoBan.tsx            ← Sổ tay lỗi (My Mistakes)
│   ├── Payment.tsx           ← Upgrade Premium
│   └── NotFound.tsx          ← 404
│
├── components/
│   ├── BossChallenge.tsx     ← UI hội thoại Boss Fight (mic, transcript, turns)
│   ├── Navbar.tsx            ← Thanh điều hướng chính
│   ├── ProtectedRoute.tsx    ← Guard route (yêu cầu đăng nhập)
│   ├── VoiceControls.tsx     ← Nút ghi âm / dừng ghi âm
│   └── ui/                  ← shadcn/ui components (Button, Card, Dialog...)
│
├── services/                 ← Tất cả giao tiếp với Backend API
│   ├── api.ts                ← Base fetch helper (tự đính JWT từ Supabase)
│   ├── conversationService.ts ← start / speak / getFeedback
│   ├── lessonService.ts      ← getChapters / completeLesson
│   └── userService.ts        ← getMe / updateMe
│
├── hooks/                    ← Custom React hooks
│   ├── useConversation.ts    ← State machine: idle→starting→active→finished
│   ├── useLearningPath.ts    ← Fetch chapters + tính % unlock Boss
│   ├── useProgress.ts        ← Progress tracking helper
│   ├── use-mobile.tsx        ← Responsive breakpoint hook
│   └── use-toast.ts          ← Toast notification hook
│
├── contexts/
│   └── UserContext.tsx       ← Profile + Energy toàn app (React Context)
│
├── types/
│   └── index.ts              ← TypeScript interfaces dùng chung
│
├── integrations/supabase/
│   ├── client.ts             ← Khởi tạo Supabase JS client
│   └── types.ts              ← Auto-generated DB types từ Supabase CLI
│
├── lib/
│   └── utils.ts              ← Utility functions (cn, classnames...)
│
└── utils/
    └── voiceRecorder.ts      ← MediaRecorder wrapper (ghi âm WebM/Opus)
```

### 3.3 Routing

| Route           | Component              | Ghi chú                                   |
| --------------- | ---------------------- | ----------------------------------------- |
| `/`             | `Auth`                 | Redirect sang `/roadmap` nếu đã đăng nhập |
| `/roadmap`      | `RoadMap`              | 🔒 Protected                              |
| `/practice`     | `Practice`             | 🔒 Protected                              |
| `/boss/:bossId` | `BossChallengeWrapper` | 🔒 Protected — trừ Energy khi vào         |
| `/achievements` | `Achievements`         | 🔒 Protected                              |
| `/profile`      | `Profile`              | 🔒 Protected                              |
| `/mistakes`     | `PhoBan`               | 🔒 Protected — Sổ tay lỗi                 |
| `/payment`      | `Payment`              | 🔒 Protected                              |

### 3.4 Data flow trong một phiên Boss Fight

```
BossChallengeWrapper
  └── useConversation hook
        ├── conversationService.start(bossId)     → POST /conversations/start
        ├── VoiceControls (ghi âm WebM)
        ├── conversationService.speak(blob)        → POST /conversations/{id}/speak
        │     ← SpeakResponse { transcript, ai_reply, ai_audio_url, is_last_turn }
        └── conversationService.getFeedback()      → GET  /conversations/{id}/feedback
              ← FeedbackResponse { scores, advice_per_turn }
```

---

## 4. Backend — FastAPI + Python

### 4.1 Stack

- **FastAPI** — API framework
- **SQLAlchemy 2.x async** + **asyncpg** — ORM + DB driver
- **Supabase Postgres** — Database chính
- **Google Gemini 2.5 Flash** (`google-genai`) — AI Mentor (roleplay + feedback)
- **Google Cloud Speech-to-Text** — Chuyển giọng nói → văn bản (vi-VN)
- **FPT.AI TTS** — Chuyển văn bản → giọng nói (vi-VN, chất lượng cao)
- **PyJWT** — Verify Supabase JWT token
- **PayOS** — Thanh toán QR (gói Monthly/Yearly)

### 4.2 Cấu trúc thư mục

```
talki-backend/
├── .env.example              ← Mẫu biến môi trường
├── requirements.txt          ← Python dependencies
├── run.ps1                   ← Script chạy nhanh (Windows)
│
└── app/
    ├── main.py               ← Khởi tạo FastAPI app + CORS middleware
    │
    ├── core/
    │   ├── config.py         ← Settings (đọc từ .env) — Pydantic BaseSettings
    │   ├── database.py       ← Async engine, session factory, get_db dependency
    │   └── security.py       ← Decode JWT Supabase → lấy user_id
    │
    ├── models/               ← SQLAlchemy ORM models (ánh xạ DB tables)
    │   ├── user.py           ← User (energy, plan, role)
    │   ├── lesson.py         ← Chapter → Lesson → Boss, UserLessonProgress
    │   └── conversation.py   ← Conversation, ConversationTurn,
    │                           ConversationFeedback, UserMistake
    │
    ├── schemas/              ← Pydantic schemas (request/response validation)
    │   ├── user.py           ← UserPublic, UserUpdate
    │   ├── lesson.py         ← ChapterOut, LessonOut, BossOut
    │   └── conversation.py   ← StartConversationResponse, SpeakResponse,
    │                           FeedbackResponse
    │
    ├── services/
    │   ├── ai_service.py     ← Gemini 2.5 Flash: chat_turn() + generate_feedback()
    │   ├── stt_service.py    ← Google STT: audio bytes → text (vi-VN)
    │   ├── tts_service.py    ← Google TTS / FPT.AI: text → MP3
    │   ├── conversation_service.py  ← Orchestrate toàn bộ luồng Boss Fight
    │   └── heart_service.py  ← consume_energy(), passive regen
    │
    ├── api/v1/
    │   ├── router.py         ← Gộp tất cả endpoints, prefix /api/v1
    │   └── endpoints/
    │       ├── users.py      ← GET /users/me, PATCH /users/me
    │       ├── lessons.py    ← GET /lessons/chapters
    │       │                   POST /lessons/{id}/complete
    │       └── conversations.py ← POST /conversations/start
    │                             POST /conversations/{id}/speak
    │                             GET  /conversations/{id}/feedback
    │
    └── utils/
        └── text_analysis.py  ← Đếm filler words tiếng Việt (à, ừ, kiểu như...)
```

### 4.3 Database Schema (các bảng chính — v2.1)

```
users               → energy, max_energy, plan (free/monthly/yearly), role (user/admin)
chapters            → boss_unlock_threshold (% hoàn thành để mở Boss Fight)
lessons             → video_url, action_prompt (The Loop: Learn → Action → Feedback)
bosses              → persona_prompt, max_turns, pass_score (mặc định 60 = 3/5 sao)
user_lesson_progress → watched, stars (0-5), completed (stars >= 3)
lesson_attempt_feedbacks → content/speed/emotion feedback cho từng lần thực hành
conversations       → status (active/completed/abandoned), final_score, stars
conversation_turns  → user_transcript, filler_word_count, ai_reply_text
conversation_feedbacks → fluency/confidence/content score, advice_json
energy_logs         → delta, reason (lesson_action/-1, boss_fight/-3, plan_upgrade)
user_mistakes       → word_or_phrase, occurrence_count (Sổ tay lỗi)
payment_orders      → PayOS transaction (pending → paid/failed)
subscriptions       → gói active, liên kết với payment_orders
```

Migration file: `frontend/supabase/migrations/20260309000000_talki_v2_schema.sql`

### 4.4 API Endpoints

| Method  | Path                                  | Mô tả                                         |
| ------- | ------------------------------------- | --------------------------------------------- |
| `GET`   | `/health`                             | Health check                                  |
| `GET`   | `/api/v1/users/me`                    | Lấy profile + energy hiện tại                 |
| `PATCH` | `/api/v1/users/me`                    | Cập nhật tên / avatar                         |
| `GET`   | `/api/v1/lessons/chapters`            | Toàn bộ lộ trình + trạng thái unlock của user |
| `POST`  | `/api/v1/lessons/{id}/complete`       | Đánh dấu bài học đã xem                       |
| `POST`  | `/api/v1/conversations/start`         | Bắt đầu Boss Fight (trừ 3 energy)             |
| `POST`  | `/api/v1/conversations/{id}/speak`    | Gửi audio → nhận transcript + AI reply        |
| `GET`   | `/api/v1/conversations/{id}/feedback` | Lấy bảng điểm sau trận                        |

> Tất cả endpoints (trừ `/health`) đều yêu cầu header `Authorization: Bearer <supabase_jwt>`.

---

## 5. Luồng dữ liệu chính

```
[Người dùng nói vào mic]
        │
        ▼
VoiceControls (WebM Blob)
        │
        ▼
conversationService.speak()
        │  multipart/form-data
        ▼
POST /api/v1/conversations/{id}/speak
        │
        ├─► stt_service.transcribe_audio()   → Google STT → text
        ├─► text_analysis.total_filler_count()
        ├─► ai_service.chat_turn()            → Gemini 2.5 Flash → AI reply text
        └─► tts_service.synthesize_speech()  → FPT.AI TTS → MP3 URL
        │
        ▼
SpeakResponse { transcript, ai_reply_text, ai_audio_url, is_last_turn }
        │
        ▼
[Frontend phát audio AI, hiện transcript]
        │
  (nếu is_last_turn = true)
        ▼
GET /api/v1/conversations/{id}/feedback
        │
        └─► ai_service.generate_feedback()   → Gemini → JSON scorecard
        │
        ▼
FeedbackResponse { fluency_score, advice_per_turn, ... }
```

---

## 6. Cách chạy dự án

### Setup lần đầu

```powershell
# Clone repo
git clone https://github.com/vinhleechem/Talki.git
cd Talki
```

---

### ⚡ Cách nhanh nhất — Docker Compose (khuyến nghị)

> Yêu cầu: [Docker Desktop](https://www.docker.com/products/docker-desktop/) đã được cài và đang chạy.

**Bước 1 — Tạo file `.env` cho cả 2 service:**

```powershell
Copy-Item frontend\.env.example frontend\.env          # điền VITE_SUPABASE_* + VITE_API_URL
Copy-Item talki-backend\.env.example talki-backend\.env  # điền DATABASE_URL, GEMINI_API_KEY...
```

**Bước 2 — Build và chạy (lần đầu):**

```powershell
docker compose up --build
```

**Những lần sau (đã build rồi):**

```powershell
docker compose up
```

**Tắt:**

```powershell
docker compose down
```

| Service           | URL                          | Hot-reload |
| ----------------- | ---------------------------- | ---------- |
| Frontend (Vite)   | `http://localhost:5173`      | ✅         |
| Backend (FastAPI) | `http://localhost:8000`      | ✅         |
| Swagger UI        | `http://localhost:8000/docs` | —          |

> **Lưu ý:** `VITE_API_URL` giữ nguyên `http://localhost:8000` — browser (không phải container) gọi backend nên dùng địa chỉ localhost bình thường.

---

### Chạy thủ công (không dùng Docker)

**Frontend:**

```powershell
cd frontend
bun install            # hoặc: npm install
Copy-Item .env.example .env   # điền VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
bun run dev
# → http://localhost:5173
```

**Backend:**

```powershell
cd talki-backend
pip install -r requirements.txt
Copy-Item .env.example .env   # điền DATABASE_URL, SUPABASE_*, GEMINI_API_KEY
.\run.ps1
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs  (chỉ khi DEBUG=True)
```

### Database

> **Chỉ cần chạy 1 lần duy nhất cho cả team** — database Supabase là cloud dùng chung, dev còn lại không cần chạy lại.

Vào **Supabase Dashboard → SQL Editor** → paste toàn bộ nội dung file `frontend/supabase/migrations/20260309000000_talki_v2_schema.sql` → **Run**.

---

## 7. Biến môi trường

### Frontend (`frontend/.env`)

| Biến                            | Mô tả                    | Lấy tại                         |
| ------------------------------- | ------------------------ | ------------------------------- |
| `VITE_SUPABASE_URL`             | Supabase project URL     | Dashboard → Settings → API      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Dashboard → Settings → API      |
| `VITE_SUPABASE_PROJECT_ID`      | Project ref ID           | Dashboard → Settings → General  |
| `VITE_API_URL`                  | URL backend              | `http://localhost:8000` (local) |

### Backend (`talki-backend/.env`)

| Biến                            | Mô tả                                   | Lấy tại                          |
| ------------------------------- | --------------------------------------- | -------------------------------- |
| `DATABASE_URL`                  | `postgresql+asyncpg://...`              | Dashboard → Settings → Database  |
| `SUPABASE_URL`                  | Supabase project URL                    | Dashboard → Settings → API       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role key (**không commit!**)    | Dashboard → Settings → API       |
| `SUPABASE_JWT_SECRET`           | Legacy JWT secret (HS256)               | Dashboard → Settings → API → JWT |
| `GEMINI_API_KEY`                | Google AI Studio API key                | aistudio.google.com/app/apikey   |
| `GEMINI_MODEL`                  | Model ID (mặc định: `gemini-2.5-flash`) | —                                |
| `GOOGLE_CLOUD_CREDENTIALS_JSON` | Path đến service account JSON (STT/TTS) | Google Cloud Console             |
| `DEBUG`                         | `True` bật Swagger UI                   | —                                |

---
