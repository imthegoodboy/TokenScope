# TokenScope

**AI Token Analytics & Optimization Platform** — track, analyze, and optimize your AI spend across OpenAI, Anthropic, and Google Gemini.

## Features

- **Token Tracking** — Record every API call with prompt/completion tokens and cost
- **TF-IDF Prompt Analysis** — Identify important tokens using scikit-learn TF-IDF
- **Prompt Optimization** — Get AI-powered suggestions to reduce token usage
- **3D Visualizations** — Interactive 3D bar charts and scatter plots
- **Multi-Provider** — OpenAI, Anthropic Claude, Google Gemini support
- **Per-User Isolation** — All data is securely isolated per user via Clerk auth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind, shadcn/ui |
| 3D Charts | React Three Fiber + Drei |
| 2D Charts | Recharts |
| Backend | FastAPI, Python |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Cache | Redis |
| Auth | Clerk |
| ML | scikit-learn TF-IDF |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Clerk account (free tier works)

### 1. Clone & Install

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` in the `frontend/` directory and fill in your Clerk keys.

```bash
# Frontend
cp frontend/.env.local.example frontend/.env.local

# Backend
cp .env.example backend/.env
```

Get your Clerk keys from [clerk.com](https://clerk.com) → Applications → API Keys.

### 3. Run

```bash
# Frontend (port 3000)
cd frontend && npm run dev

# Backend (port 8000)
cd backend && uvicorn app.main:app --reload
```

### 4. Docker (optional)

```bash
docker-compose up
```

## Project Structure

```
tokenscope/
├── frontend/              # Next.js 14 app
│   ├── app/               # App Router pages
│   ├── components/        # UI components
│   │   ├── ui/           # Base components (Button, Input, etc.)
│   │   ├── charts/       # 3D and 2D charts
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── analyzer/     # Prompt analyzer components
│   │   └── layout/       # Sidebar, Header
│   ├── lib/               # API client, utilities
│   └── store/             # Zustand state
├── backend/               # FastAPI app
│   ├── app/
│   │   ├── routers/      # API endpoints
│   │   ├── models/       # SQLModel database models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic (token counting, TF-IDF)
│   │   └── middleware/    # Auth middleware
│   └── requirements.txt
└── docker-compose.yml
```

## Pages

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/sign-in` | Clerk sign in |
| `/sign-up` | Clerk sign up |
| `/dashboard` | Main stats dashboard |
| `/dashboard/keys` | API key management |
| `/dashboard/analyzer` | Prompt TF-IDF analyzer |
| `/dashboard/history` | Full usage history |
| `/dashboard/analytics` | 3D charts & heatmaps |
| `/dashboard/settings` | Account settings |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/usage/track` | Track a usage record |
| GET | `/api/v1/usage/summary` | Get usage summary |
| GET | `/api/v1/usage/history` | Paginated history |
| GET | `/api/v1/usage/chart-data` | Chart data |
| POST | `/api/v1/keys/` | Add API key |
| GET | `/api/v1/keys/` | List API keys |
| DELETE | `/api/v1/keys/{id}` | Delete API key |
| POST | `/api/v1/analyze/prompt` | Analyze prompt (TF-IDF) |
| POST | `/api/v1/analyze/optimize` | Optimize prompt |
| GET | `/api/v1/stats/realtime` | Real-time stats |

## Design System

| Role | Color | Hex |
|------|-------|-----|
| Background | Cream | `#FAF7F2` |
| Surface | White | `#FFFFFF` |
| Text | Black | `#0A0A0A` |
| Border | Light | `#E8E4DE` |
| Danger | Red | `#DC2626` |
| Success | Green | `#16A34A` |

## License

MIT
