## TokenScope

Build a smart LLM token usage dashboard with token-level importance highlighting




### Frontend (Next.js 14+ — App Router)
| Layer       | Technology                            |
|-------------|---------------------------------------|
| Framework   | Next.js 14 (App Router, TypeScript)   |
| Styling     | Tailwind CSS + CSS Variables          |
| UI          | shadcn/ui (headless components)       |
| 2D Charts   | Recharts (lightweight, React-native)  |
| 3D Charts   | React Three Fiber + @react-three/drei |
| Animation   | Framer Motion                         |
| State       | Zustand (lightweight global state)    |
| Auth        | Clerk (Next.js SDK)                   |
| Forms       | React Hook Form + Zod                 |
| Tables      | TanStack Table                        |

### Backend (FastAPI — Python)
| Layer           | Technology                              |
|-----------------|----------------------------------------|
| Framework       | FastAPI (async, high-performance)      |
| ORM             | SQLModel (Pydantic v2 + SQLAlchemy)    |
| Database        | SQLite (dev) → PostgreSQL (prod)       |
| Cache           | Redis (session, rate limiting, stats) |
| ML / TF-IDF     | scikit-learn (TF-IDF vectorizer)       |
| Token Encoding  | tiktoken (OpenAI), anthropic SDK       |
| API Providers   | OpenAI SDK, Anthropic SDK, Google GenAI|
| Auth            | Clerk backend SDK (JWT verification)  |
| Migration       | Alembic                                 |
| Testing         | pytest + pytest-asyncio                |

 
---
