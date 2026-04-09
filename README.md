# TokenScope

AI Proxy & Token Analytics Platform - Track, optimize, and analyze your LLM API usage.

## Features

- **Proxy URL Generator** - Create unique proxy URLs for your API keys
- **Real-time Dashboard** - Live monitoring of API requests, tokens, and costs
- **TF-IDF Prompt Optimization** - Automatically enhance prompts to reduce token usage
- **Multi-Provider Support** - OpenAI, Google Gemini, and Anthropic
- **Cost Analytics** - Track spending across providers and models
- **Live Logs** - Real-time streaming of all API requests

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS, Recharts
- **Backend**: FastAPI, Python
- **Database**: SQLite
- **Auth**: Simple session-based (Clerk ready)

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

## Usage

### Create a Proxy URL

1. Go to the Dashboard
2. Click "Create Proxy URL"
3. Enter your API key (stored securely)
4. Configure settings (temperature, max tokens, system prompt)
5. Optionally enable "Auto-Enhance" for TF-IDF prompt optimization
6. Copy your new proxy URL

### Use Your Proxy

Instead of calling the API directly:

```bash
# Direct API call
curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'

# With TokenScope proxy
curl -X POST "http://localhost:8000/api/v1/proxy/YOUR_PROXY_ID" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

### Prompt Optimizer

Visit `/optimizer` to paste prompts and see:
- Token importance analysis
- TF-IDF scores per word
- Optimized prompt suggestions

## Project Structure

```
tokenscope/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Dashboard
│   │   ├── docs/page.tsx     # Documentation
│   │   └── optimizer/page.tsx
│   ├── components/
│   │   └── Navbar.tsx
│   └── lib/
│       └── api.ts            # API client
├── backend/
│   └── app/
│       ├── main.py           # FastAPI app
│       ├── database.py       # SQLite models
│       ├── routers/         # API endpoints
│       │   ├── proxy.py      # Proxy handler
│       │   ├── keys.py       # Proxy key management
│       │   ├── stats.py      # Statistics
│       │   ├── logs.py       # Live logs (SSE)
│       │   ├── usage.py      # Usage tracking
│       │   └── analyzer.py   # TF-IDF analyzer
│       └── services/
│           ├── token_analyzer.py
│           ├── tfidf_engine.py
│           ├── proxy_forwarder.py
│           └── live_logger.py
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/keys` | GET | List all proxy keys |
| `/api/v1/keys` | POST | Create new proxy key |
| `/api/v1/proxy/{id}` | POST | Forward request to LLM |
| `/api/v1/stats/overview` | GET | Get usage statistics |
| `/api/v1/logs/stream` | GET | SSE stream for live logs |
| `/api/v1/analyzer/analyze` | POST | Analyze prompt with TF-IDF |

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend (.env)
```
DATABASE_URL=sqlite+aiosqlite:///./tokenscope.db
```
 


by  hiyoo