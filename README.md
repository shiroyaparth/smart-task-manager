# TaskFlow AI
[![Live frontent](https://img.shields.io/badge/demo-live-brightgreen)](https://smart-task-manager-nine-tau.vercel.app/)
[![Live Backend](https://img.shields.io/badge/demo-live-brightgreen)](https://smart-task-manager-yqov.onrender.com)
[![API Docs](https://img.shields.io/badge/API-Swagger-blue)](https://smart-task-manager-yqov.onrender.com/docs)
[![Repo](https://img.shields.io/badge/github-repo-black)](https://github.com/shiroyaparth/smart-task-manager)

A full-stack task management application with an LLM-assisted productivity layer, built on FastAPI, PostgreSQL, and a vanilla JavaScript dashboard. Every AI feature is grounded in a server-built context of the user's real tasks (not free-floating chat) and degrades to a deterministic, rule-based response when no LLM provider key is configured — the app is fully usable with zero AI spend.

> **Demo note:** the backend is hosted on Render's free tier, so the first request after inactivity can take ~20–30s to wake the instance. Subsequent requests are fast.

---

## Screenshots

<!-- Replace these with real screenshots/GIFs before publishing. Recommended: List view, Kanban board, KPI panel. -->

| List View | Kanban Board | KPI / Analytics |
|---|---|---|
| `docs/screenshots/list-view.png` | `docs/screenshots/kanban.png` | `docs/screenshots/kpi.png` |

*(Add the three images above to `docs/screenshots/` and update the paths — a visible screenshot here is the single highest-impact change you can make to this README.)*

---

## Overview

TaskFlow AI is a personal task tracker with JWT authentication, per-user task ownership, and five AI-assisted workflows layered on conventional CRUD: a chat assistant, task breakdown, natural-language task entry, daily/weekly reporting, and natural-language search.


The project ships as two independently deployable pieces:

- a **FastAPI backend** that owns authentication, persistence, and AI orchestration
- a **static, framework-free frontend** that talks to it purely over REST

The AI layer is intentionally isolated behind a provider abstraction (`services/ai/`), so it can be swapped, tested, or removed without touching the persistence or auth code, and so the product doesn't hard-depend on a paid API to function.

---

## Key Features

- Email/password registration and login with JWT bearer auth (7-day expiry)
- Per-user task ownership on all **CRUD** routes — every task query is scoped to `Task.user_id == current_user.id`. *(Note: this scoping does not yet extend to the AI context builder — see [Limitations](#limitations) and [Trade-offs](#engineering-trade-offs).)*
- Full task CRUD: create, read, update, mark complete, delete
- Priority-based filtering and client-side search
- List and Kanban views, with live KPI/analytics panels (completion rate, priority distribution)
- AI chat assistant grounded in the user's actual task list
- AI productivity coach recommending what to work on next, based on task priority and age
- AI task breakdown — decomposes a task title into 3–5 structured subtasks via JSON-mode LLM output
- Natural-language task capture (e.g. *"urgent bugfix for auth tomorrow"* → structured title/priority/description)
- Natural-language search — free text translated into structured `priority`/`status`/`query` filters
- AI-generated daily summary (cached per user/day) and weekly productivity report
- Model-agnostic AI provider layer (OpenRouter), with deterministic fallback when unconfigured

---

## Architecture

Routing, request validation, and JWT verification live in `app/`. All LLM-facing logic is isolated in `services/ai/` behind a small set of orchestration functions, so route handlers stay thin and the AI layer is independently replaceable. The frontend is static HTML/CSS/JS with no build step, authenticating every `fetch` with a bearer token from `localStorage`.

```mermaid
flowchart LR
    subgraph Client
        UI[Static Frontend<br/>HTML / CSS / JS]
    end

    subgraph Backend["FastAPI Backend"]
        Routes[Route Handlers<br/>app/main.py]
        Auth[JWT Auth Dependency<br/>app/security.py]
        ORM[SQLAlchemy Models<br/>app/models.py]
        AISvc[AI Orchestration<br/>services/ai/assistant.py]
    end

    DB[(PostgreSQL)]
    LLM[OpenRouter API]

    UI -->|"fetch + Bearer JWT"| Routes
    Routes --> Auth
    Routes --> ORM
    Routes --> AISvc
    ORM --> DB
    AISvc --> LLM
```

### Database schema

```mermaid
erDiagram
    USERS ||--o{ TASKS : owns
    USERS {
        int id PK
        string name
        string email UK
        string hashed_password
        datetime created_at
    }
    TASKS {
        int id PK
        string title
        string description
        string priority
        string status
        datetime created_at
        datetime updated_at
        int user_id FK
    }
```

### AI request flow

Each AI endpoint follows the same pattern: build a token-efficient snapshot of the user's tasks, inject it into a feature-specific system prompt, and call the LLM provider — or, if no provider key is set, derive an equivalent deterministic response from the same context object instead of calling out at all.

```text
User request (chat / coach / breakdown / parse / summary / search)
    ↓
services/ai/context.py — build_user_context()
    ↓ (task list, stats, current date)
services/ai/prompts.py — feature-specific system prompt
    ↓
services/ai/provider.py — OpenRouter chat completion
    ↓
services/ai/parser.py — safe JSON extraction (for structured features)
    ↓
Response returned to client
```

---

## Engineering Trade-offs

Decisions made deliberately, with known limitations, rather than by default:

| Decision | Why | Known cost |
|---|---|---|
| In-process dict for daily-summary caching, not Redis | Avoids an extra infra dependency for a single-instance deployment | Cache is lost on restart and would be inconsistent across multiple backend instances — would move to Redis before scaling horizontally |
| `create_all()` + manual `ALTER TABLE`, not Alembic | Fast iteration during early development | No versioned migration history; risky against a populated production DB — Alembic is the first infra change I'd make before adding a second developer |
| AI context builder queries tasks globally, not per-user | Simplicity in the initial implementation of the AI layer | Currently the one place per-user scoping is *not* enforced — a real gap, tracked in Limitations, and the next fix I'd ship |
| No refresh-token flow | 7-day JWT expiry was "good enough" for a single-user demo use case | No server-side revocation; a compromised token is valid until expiry — would add short-lived access + refresh tokens for anything beyond a demo |
| OpenRouter instead of a single vendor SDK | Swapping `OPENROUTER_MODEL` changes the underlying LLM with no code change | Adds one layer of indirection/latency vs. calling a provider SDK directly |

**What I'd do differently with more time:** scope the AI context builder correctly first (it's the one place the security model is inconsistent), then add a `pytest` suite around auth boundaries and the AI fallback paths before anything else — those two are the highest-leverage fixes relative to effort.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (custom design tokens), vanilla JavaScript — no framework, no build step |
| Backend | FastAPI (Python 3.11) |
| ORM | SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Authentication | JWT (PyJWT), bcrypt password hashing (passlib) |
| AI Integration | OpenRouter (model-agnostic LLM gateway), default model `openai/gpt-3.5-turbo` |
| Containerization | Docker, Docker Compose |
| Deployment | Render |

---

## Project Structure

```text
taskflow-ai/
├── app/
│   ├── main.py          # FastAPI app, route handlers, JWT auth dependency
│   ├── models.py         # SQLAlchemy models: User, Task
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── database.py         # Engine, session factory, declarative Base
│   └── security.py          # Password hashing, JWT issuance
├── services/
│   └── ai/
│       ├── assistant.py     # Orchestrates each AI feature + fallback logic
│       ├── provider.py       # OpenRouter API client
│       ├── context.py         # Builds a per-user task context for prompts
│       ├── prompts.py          # System prompt templates, one per feature
│       └── parser.py            # Safe JSON parsing of LLM output
├── frontend/
│   ├── index.html / login.html / register.html / dashboard.html
│   ├── css/               # Design tokens, layout, component styles
│   └── js/                 # api.js, dashboard.js, ai.js, login.js, register.js, ui.js
├── Dockerfile              # Backend container image
├── docker-compose.yml        # Backend + PostgreSQL for local development
├── requirements.txt
└── .env.example
```

`frontend/` is excluded from the Docker build (`.dockerignore`) — it's served as static files independently of the API container.

---

## How It Works

1. A user registers or logs in; the backend hashes/verifies the password with bcrypt and issues a JWT signed with `SECRET_KEY`.
2. The frontend stores the token in `localStorage` and attaches it as a `Bearer` header on every request via `authFetch()`.
3. `get_current_user` decodes and validates the JWT on each protected route and loads the corresponding `User`; every task query filters by `Task.user_id == current_user.id`.
4. Task CRUD goes straight through SQLAlchemy to PostgreSQL.
5. AI endpoints additionally call `context.build_user_context()` to assemble task data and stats, format them into a compact prompt, and either call OpenRouter or fall back to a deterministic response.
6. The dashboard renders one `GET /tasks` fetch into three views — list, Kanban, and KPI/analytics.

---

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 16 (or Docker, via `docker-compose`)
- An [OpenRouter](https://openrouter.ai) API key *(optional — AI endpoints work without one, using rule-based fallbacks)*

### Installation

```bash
git clone https://github.com/shiroyaparth/smart-task-manager.git
cd taskflow-ai

python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

### Environment Variables

Copy `.env.example` to `.env` and fill in real values:

```bash
OPENROUTER_API_KEY=your_openrouter_api_key_here    # optional
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/smart_task_manager
SECRET_KEY=your_jwt_secret_key_here
DB_PASSWORD=your_postgres_password_here
```

`DATABASE_URL` and `SECRET_KEY` are required — the app raises `RuntimeError` on startup if either is missing. `OPENROUTER_API_KEY` is optional. `CORS_ORIGINS` (comma-separated) defaults to `http://127.0.0.1:5500,http://localhost:5500` (VS Code Live Server's default port).

### Run Locally

**Option A — Docker Compose (backend + database):**

```bash
docker-compose up --build
```

Starts PostgreSQL on port `5433` (host) and the API on `http://localhost:8000`.

**Option B — Manual:**

```bash
# with PostgreSQL already running and DATABASE_URL pointing at it
uvicorn app.main:app --reload
```

**Frontend:** static, no build step. Serve `frontend/` with any static file server (e.g. VS Code Live Server on port `5500`) — it talks to whatever `API_BASE_URL` is set to in `frontend/js/api.js`.

---

## API

Interactive docs auto-generated by FastAPI at `/docs` (Swagger) and `/redoc`.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | Health/welcome message | No |
| POST | `/register` | Create a new user account | No |
| POST | `/login` | Authenticate and receive a JWT | No |
| GET | `/tasks` | List the current user's tasks, optional `priority` filter | Yes |
| GET | `/tasks/{task_id}` | Fetch a single task | Yes |
| POST | `/tasks` | Create a task | Yes |
| PUT | `/tasks/{task_id}` | Replace a task's fields | Yes |
| PATCH | `/tasks/{task_id}/complete` | Mark a task as completed | Yes |
| DELETE | `/tasks/{task_id}` | Delete a task | Yes |
| POST | `/ai/chat` | Freeform chat grounded in the user's task context | Yes |
| POST | `/ai/coach` | Personalized "what to work on" recommendation | Yes |
| POST | `/ai/breakdown` | Decompose a task title into structured subtasks | Yes |
| POST | `/ai/parse-task` | Parse freeform text into a structured task | Yes |
| GET | `/ai/daily-summary` | Cached daily summary, `force_refresh` optional | Yes |
| GET | `/ai/weekly-report` | Weekly productivity report with aggregate stats | Yes |
| POST | `/ai/search-intent` | Translate a natural-language query into task filters | Yes |

All authenticated routes expect `Authorization: Bearer <token>` and return `401` for missing, invalid, or expired tokens.

**Example — `POST /ai/breakdown`**

```json
// Request
{ "title": "Migrate auth service to JWT refresh tokens" }

// Response
{
  "subtasks": [
    { "title": "Design refresh-token schema and rotation policy", "priority": "high" },
    { "title": "Add refresh endpoint and revoke-on-logout flow", "priority": "high" },
    { "title": "Update frontend token-refresh interceptor", "priority": "medium" },
    { "title": "Write auth boundary tests", "priority": "medium" }
  ]
}
```

---

## Database

PostgreSQL via SQLAlchemy's ORM, two tables:

- **`users`** — `id`, `name`, `email` (unique, indexed), `hashed_password`, `created_at`
- **`tasks`** — `id`, `title`, `description`, `priority`, `status`, `created_at`, `updated_at`, `user_id` (FK → `users.id`)

Tables are created via `Base.metadata.create_all()` on startup rather than a formal migration framework; schema changes after initial deployment (e.g. adding `user_id`) were applied as manual `ALTER TABLE` statements — see [Limitations](#limitations).

---

## Testing

No automated test suite yet. Endpoints are exercised manually through the Swagger UI at `/docs`. Adding `pytest` coverage for auth, task ownership boundaries, and AI fallback paths is the top item in [Future Improvements](#future-improvements) — see also [Engineering Trade-offs](#engineering-trade-offs) for why this is prioritized over other work.

---

## Deployment

- **Backend** — containerized via `Dockerfile`, deployed to [Render](https://render.com) as a web service; `frontend/js/api.js` points at the live Render URL.
- **Frontend** — static files, deployable to any static host (GitHub Pages, Netlify, Vercel, CDN); not currently in the CI/CD path.
- **Database** — `docker-compose.yml` provisions PostgreSQL 16 locally; production connects to a managed instance via `DATABASE_URL`.
- No CI/CD pipeline is configured at present.

---

## Security

- Passwords hashed with bcrypt via `passlib`; never stored or logged in plaintext.
- JWTs (`HS256`) with 7-day expiry; signing secret from `SECRET_KEY`, app refuses to start without it.
- Task read/write endpoints filter every query by authenticated `user_id`.
- CORS restricted to an explicit, environment-configured origin list (`CORS_ORIGINS`).
- All secrets supplied via environment variables / `.env`, excluded from version control.
- **Known gap:** the AI context builder does not currently enforce the same per-user scoping as the CRUD routes — see [Engineering Trade-offs](#engineering-trade-offs).

---

## Design Decisions

- **FastAPI over Flask/Django** — native async support, automatic OpenAPI/Swagger generation, Pydantic validation with minimal boilerplate.
- **Separate `services/ai` layer instead of inline AI calls in route handlers** — keeps prompt construction, JSON parsing, and provider selection out of the HTTP layer, so routes stay focused and the AI layer is independently testable/replaceable.
- **OpenRouter instead of a single vendor SDK** — the underlying LLM changes via `OPENROUTER_MODEL` with no code change.
- **Deterministic fallback for every AI endpoint** — each `assistant.py` function checks for a configured provider key and, if absent, computes an equivalent response from the same context data. Keeps the app fully demoable with zero secrets configured.
- **Framework-free frontend** — avoids a build pipeline, keeps the frontend deployable to any static host independently of the API's release cycle.

---

## Limitations

- No automated test suite (unit or integration).
- No formal migration tooling (Alembic); schema evolution has relied on `create_all()` plus manual `ALTER TABLE` statements.
- The AI context builder (`services/ai/context.py`) currently loads tasks across **all** users rather than scoping to the authenticated user — task CRUD endpoints correctly enforce per-user scoping, but this specific query does not yet mirror that restriction.
- Daily summaries are cached in an in-process dict — not persisted across restarts, not consistent across multiple backend instances.
- JWTs have a fixed 7-day expiry with no refresh-token flow or server-side revocation.
- No rate limiting on AI endpoints, which proxy to a paid third-party API.
- No CI/CD pipeline.

---

## Future Improvements

1. Scope the AI context builder to the authenticated user, matching the task CRUD endpoints. *(highest priority — see [Trade-offs](#engineering-trade-offs))*
2. Add a `pytest` suite covering authentication, task ownership, and AI fallback behavior, with a CI workflow on every push.
3. Introduce Alembic for versioned schema migrations.
4. Move the daily-summary cache to Redis for multi-instance support.
5. Add refresh tokens and/or server-side token revocation.
6. Add rate limiting on `/ai/*` routes.

---

## Contributing

1. Fork the repository and create a feature branch.
2. Install dependencies and set up `.env` as described above.
3. Keep AI orchestration logic in `services/ai/` and route handlers in `app/main.py` thin — this separation is intentional (see [Design Decisions](#design-decisions)).
4. Open a pull request describing the change and any manual testing performed via `/docs` (no automated suite exists yet — see [Limitations](#limitations)).

This is currently a personal project maintained by one contributor; issues and PRs are welcome but response time may vary.

---

