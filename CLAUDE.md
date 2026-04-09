# TokenScope Project

## Overview
TokenScope is an AI Proxy & Token Analytics Platform. Users can create proxy URLs that forward requests to OpenAI/Gemini/Anthropic while tracking token usage, costs, and providing TF-IDF prompt optimization.

## Tech Stack
- Frontend: Next.js 16 with TypeScript, Tailwind CSS, Recharts
- Backend: FastAPI (Python)
- Database: SQLite
- Design: Orange (#FF6B00), Black (#0A0A0A), White (#FFFFFF)

## Running the Project

### Frontend
```bash
npm run dev  # http://localhost:3000
```

### Backend
```bash
cd backend
uvicorn app.main:app --reload --port 8000  # http://localhost:8000
```

## Key Files

### Frontend
- `src/app/page.tsx` - Main dashboard
- `src/app/optimizer/page.tsx` - TF-IDF prompt optimizer
- `src/app/docs/page.tsx` - Integration documentation
- `src/components/Navbar.tsx` - Navigation
- `src/lib/api.ts` - API client

### Backend
- `backend/app/main.py` - FastAPI application
- `backend/app/database.py` - SQLAlchemy models
- `backend/app/routers/proxy.py` - Proxy endpoint
- `backend/app/routers/keys.py` - API key management
- `backend/app/services/tfidf_engine.py` - TF-IDF analysis
- `backend/app/services/proxy_forwarder.py` - LLM API forwarding

## Notes
- API keys are stored in plain text in SQLite (for demo purposes)
- User ID is passed via X-User-Id header
- Live logs use Server-Sent Events (SSE)
