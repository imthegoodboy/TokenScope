# TokenScope

**AI Proxy & Token Analytics Platform** - Track, optimize, and analyze your LLM API usage. Save up to 40% on API costs with AI-powered prompt optimization.

![TokenScope Banner](https://via.placeholder.com/1200x400/000000/FF6B00?text=TokenScope)

## What is TokenScope?

TokenScope is a smart middleware that sits between your app and LLM providers (OpenAI, Gemini, Anthropic). It tracks every API call, analyzes prompt efficiency using TF-IDF, and helps you save money by optimizing prompts automatically.

### Key Benefits
- **Track Everything** - Monitor token usage, costs, and latency in real-time
- **Save Money** - TF-IDF optimization reduces token usage by 20-40%
- **Team Collaboration** - Create groups, share codes, and track team usage
- **Chrome Extension** - Optimize prompts anywhere on the web

## Features

### 1. Proxy URL Generator
Create unique proxy URLs for your API keys. Route all your LLM requests through TokenScope to track and optimize them.

### 2. Real-time Analytics Dashboard
Live monitoring of:
- Token usage (prompt, completion, total)
- API costs in USD
- Request latency
- Per-model breakdown

### 3. TF-IDF Prompt Optimization
Automatically analyze and enhance prompts:
- Word importance scoring
- Remove "noise" tokens
- Maintain meaning while reducing cost

### 4. Chrome Extension
VS Code-style inline suggestions that work on any website:
- Works on ChatGPT, Claude, Gemini, and more
- Press **Tab** to accept optimized prompts
- See token savings in real-time
- Attention score tracking

### 5. Team Groups
Collaborate with your team:
- Admin creates group → gets unique 8-char code
- Members join using code
- Admin sees all members' stats
- Filter by acceptance rate, tokens saved
- Export team reports as PDF

### 6. Multi-Provider Support
One interface for all LLM providers:
- OpenAI (GPT-4, GPT-4o, GPT-3.5)
- Google Gemini
- Anthropic (Claude)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI (Python) |
| Database | SQLite |
| Authentication | Clerk |
| Extension | Chrome Extension Manifest V3 |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Landing   │  │Dashboard │  │Extension │  │ Groups   │       │
│  │   Page    │  │          │  │   Page    │  │  Admin   │       │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘       │
└────────┼──────────────┼──────────────┼──────────────┼──────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                              │
                     ┌────────▼────────┐
                     │   FastAPI       │
                     │   Backend       │
                     └────────┬────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   ┌─────▼─────┐      ┌──────▼──────┐      ┌──────▼──────┐
   │  SQLite   │      │  TF-IDF     │      │  Extension  │
   │ Database  │      │  Engine     │      │  Service    │
   └───────────┘      └─────────────┘      └─────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   ┌─────▼─────┐      ┌──────▼──────┐      ┌──────▼──────┐
   │  OpenAI   │      │   Gemini    │      │ Anthropic   │
   └───────────┘      └─────────────┘      └─────────────┘
```

## How It Works

### 1. Create Proxy URL
```
Dashboard → Create Proxy URL → Enter API Key → Configure → Copy URL
```

### 2. Use in Your App
```javascript
// Instead of calling OpenAI directly:
POST https://api.openai.com/v1/chat/completions

// Use TokenScope proxy:
POST http://localhost:8000/api/v1/proxy/YOUR_PROXY_ID
```

### 3. Track & Optimize
- Every request is logged with tokens, cost, latency
- TF-IDF analyzes prompt importance
- Auto-enhance removes low-value tokens

### 4. Chrome Extension
```
User types prompt → Extension detects → Backend analyzes → Overlay shows optimized version → User presses Tab to accept
```

### 5. Team Collaboration
```
Admin creates group → Gets 8-char code → Members join → All usage tracked → Admin views dashboard with filters & exports
```

## Quick Start

### 1. Install Dependencies

```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 2. Start Backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend

```bash
npm run dev
```

### 4. Open in Browser

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

### 5. Setup Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `chrome-extension` folder

## Pages Overview

| Page | URL | Purpose |
|------|-----|---------|
| Landing | `/` | Marketing page with features |
| Dashboard | `/dashboard` | Proxy URL management & stats |
| Extension Stats | `/extension` | Your Chrome extension usage |
| Groups | `/groups` | Create/join team groups |
| Group Admin | `/groups/admin` | Manage members & export reports |
| Optimizer | `/optimizer` | Paste prompts for TF-IDF analysis |
| Connect | `/connect` | Link extension to your account |

## API Endpoints

### Proxy
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/keys` | GET | List proxy keys |
| `/api/v1/keys` | POST | Create proxy key |
| `/api/v1/proxy/{id}` | POST | Forward LLM request |

### Stats
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/stats/overview` | GET | Usage statistics |
| `/api/v1/stats/daily` | GET | Daily breakdown |
| `/api/v1/logs/stream` | GET | Live SSE logs |

### Extension
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/extension/log` | POST | Log optimization |
| `/api/v1/extension/stats/overview` | GET | Extension stats |
| `/api/v1/extension/connect` | POST | Get connection token |

### Groups
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/groups` | GET | List user's groups |
| `/api/v1/groups` | POST | Create group |
| `/api/v1/groups/join` | POST | Join via code |
| `/api/v1/groups/{id}/members` | GET | Get members |

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend (.env)
```
DATABASE_URL=sqlite+aiosqlite:///./tokenscope.db
```

## Project Structure

```
tokenscope/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── connect/page.tsx      # Extension connect
│   │   ├── optimizer/page.tsx    # TF-IDF optimizer
│   │   ├── docs/page.tsx         # Documentation
│   │   ├── (auth)/               # Sign in/up
│   │   └── (dashboard)/
│   │       ├── dashboard/        # Main dashboard
│   │       ├── extension/        # Extension stats
│   │       └── groups/           # Team groups + admin
│   ├── components/
│   │   ├── ExtensionAuthSync.tsx # Sync auth to extension
│   │   └── GroupSync.tsx         # Sync group to extension
│   └── lib/
│       └── api.ts                # API client
├── backend/
│   └── app/
│       ├── main.py               # FastAPI app
│       ├── database.py          # SQLAlchemy models
│       ├── routers/
│       │   ├── proxy.py          # Proxy forwarding
│       │   ├── keys.py           # Key management
│       │   ├── stats.py          # Statistics
│       │   ├── logs.py           # SSE streaming
│       │   ├── analyzer.py       # TF-IDF
│       │   ├── extension.py      # Extension tracking
│       │   ├── groups.py         # Team groups
│       │   └── connect.py        # Extension connection
│       └── services/
│           ├── tfidf_engine.py   # TF-IDF algorithm
│           └── proxy_forwarder.py # LLM API calls
└── chrome-extension/
    ├── manifest.json             # Extension config
    ├── background.js            # Service worker
    ├── content.js               # Page injection
    └── popup/                    # Popup UI
```

## Database Schema

### ProxyKey
- `id`, `user_id`, `proxy_id`, `api_key`, `provider`, `model`
- `temperature`, `max_tokens`, `system_prompt`, `auto_enhance`

### APILog
- `id`, `proxy_id`, `user_id`, `provider`, `model`
- `prompt_tokens`, `completion_tokens`, `total_tokens`, `cost`, `latency_ms`

### ExtensionLog
- `id`, `user_id`, `group_id`, `original_prompt`, `optimized_prompt`
- `tokens_saved`, `cost_saved`, `attention_score`, `chatbot`, `accepted`

### Group / GroupMember
- Group: `id`, `name`, `code`, `admin_id`
- Member: `group_id`, `user_id`, `role`

## License

MIT License - 2026 TokenScope

---

Built with ❤️ by the TokenScope team