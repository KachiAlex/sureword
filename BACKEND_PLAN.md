# Backend Implementation Plan

## Objective
Rebuild the Express.js backend from scratch, wired to a Neon PostgreSQL database via `@vercel/postgres`, deployed as a Vercel serverless function. Every endpoint must match the exact URL patterns the frontend already calls.

## 1. Tech Stack
- **Runtime:** Node.js + Express + TypeScript
- **Database:** Neon PostgreSQL via `@vercel/postgres`
- **Auth:** JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- **File Uploads:** `multer` for sermon audio (stored in `/uploads`)
- **Serverless:** `serverless-http` for Vercel
- **Deployment:** Vercel (function: `api/index.ts`)

## 2. Database Schema

### Tables

```sql
users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'listener',  -- 'listener' | 'broadcaster' | 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

broadcasts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scripture_reference TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',  -- 'scheduled' | 'live' | 'ended'
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  broadcaster_id TEXT NOT NULL,
  audio_path TEXT,
  stream_key TEXT,
  stream_type TEXT DEFAULT 'church_online',
  church_online_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

sermons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scripture_reference TEXT,
  speaker TEXT,
  series TEXT,
  audio_url TEXT NOT NULL,
  date TEXT NOT NULL,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

chat_messages (
  id TEXT PRIMARY KEY,
  broadcast_id TEXT,
  user_id TEXT,
  user_name TEXT,
  message TEXT NOT NULL,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)

schedule (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0=Sunday ... 6=Saturday
  time TEXT NOT NULL,
  type TEXT DEFAULT 'service',   -- 'service' | 'study' | 'prayer'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Seed Data
- 3 default schedule entries (Sunday, Wednesday, Friday)
- 1 admin user: `admin@zionite.online` / `admin123` (bcrypt hashed)

## 3. API Routes (all prefixed with `/api` by Vercel rewrite)

### Auth (`/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create listener account, return JWT |
| POST | `/auth/login` | — | Validate credentials, return JWT |
| GET | `/auth/verify` | JWT | Return current user object |
| GET | `/auth/users` | JWT + admin | List all users |
| PUT | `/auth/users/:id/role` | JWT + admin | Update user role |

### Broadcasts (`/broadcasts`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/broadcasts` | — | List all broadcasts |
| GET | `/broadcasts/active` | — | Return the single broadcast with `status='live'` or null |
| GET | `/broadcasts/:id` | — | Get broadcast by ID |
| POST | `/broadcasts` | JWT + broadcaster/admin | Create new broadcast, set status='live' |
| POST | `/broadcasts/:id/end` | JWT + broadcaster/admin | Set status='ended', set ended_at |
| GET | `/broadcasts/stats/overview` | JWT + broadcaster/admin | Return `{ listening, peak, avg }` |

### Sermons (`/sermons`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sermons` | — | List all sermons (supports `?limit=N`) |
| POST | `/sermons` | JWT + admin | Upload sermon with audio file (multipart) |

### Schedule (`/schedule`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/schedule` | — | List all schedule entries |

### Chat (`/chat`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chat/broadcast/:broadcastId` | — | Get messages for broadcast |
| POST | `/chat/broadcast/:broadcastId` | JWT | Post message to broadcast |

### Status (`/status`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/status` | — | Return `{ status, database, streaming, timestamp }` |

## 4. Auth Middleware
- `authenticateToken`: Extract `Bearer` token from `Authorization` header, verify with `JWT_SECRET`, attach `req.user`
- `requireRole(...roles)`: Check `req.user.role` against allowed roles, return 403 if mismatch

## 5. Database Layer (`db.ts`)
- Lazy pool creation using `createPool()` (reads `DATABASE_URL` from env)
- `dbReady` flag for fast-fail when env var missing
- `initDb()` idempotent function: creates tables if not exists, seeds schedule + admin
- All routes call `initDb()` before first query
- 15-second timeout on `initDb()` to prevent Vercel cold-start hangs

## 6. Vercel Deployment Config

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "cd backend && npx tsc && cd ../frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "npm install && cd backend && npm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/socket.io/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### `api/index.ts`
```typescript
import app from '../backend/dist/index'
export default app
```

### Path Stripping
Express routes are mounted at root (`/auth`, `/broadcasts`, etc.). Vercel rewrites `/api/*` to the function. Middleware strips `/api` prefix so routes match.

## 7. File Structure
```
zionite/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          (Express app, route mounts, serverless export)
│       ├── db.ts             (Pool, schema, initDb, seed)
│       ├── middleware/
│       │   └── auth.ts       (JWT_SECRET, authenticateToken, requireRole)
│       └── routes/
│           ├── auth.ts
│           ├── broadcasts.ts
│           ├── sermons.ts
│           ├── schedule.ts
│           ├── chat.ts
│           └── status.ts
├── api/
│   └── index.ts              (Vercel serverless entry)
├── frontend/                 (existing, untouched)
├── vercel.json
└── package.json              (root, includes backend build steps)
```

## 8. Environment Variables (Vercel Dashboard)
| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes |
| `JWT_SECRET` | Yes |
| `JWT_REFRESH_SECRET` | Yes |

## 9. Implementation Order
1. Backend scaffolding (`package.json`, `tsconfig.json`)
2. Database layer (`db.ts`)
3. Auth middleware (`middleware/auth.ts`)
4. Auth routes (`routes/auth.ts`)
5. Broadcast routes (`routes/broadcasts.ts`)
6. Sermon routes (`routes/sermons.ts`)
7. Schedule routes (`routes/schedule.ts`)
8. Chat routes (`routes/chat.ts`)
9. Status routes (`routes/status.ts`)
10. Main app wiring (`src/index.ts`)
11. Serverless entry (`api/index.ts`)
12. Vercel config update
13. Type-check, build, push
