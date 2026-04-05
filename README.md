# Fe Containerize

Демо застосунок з 4 сервісів, два варіанти деплою:

- [Docker Compose](README.docker-compose.md) — простий деплой на будь-який хост
- [k3s + Helm](helm/README.md) — Kubernetes-деплой на Raspberry Pi

## Architecture

```text
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│       Frontend       │─────▶│       Backend        │─────▶│      PostgreSQL      │
│  React + Vite + nginx│      │   NestJS + TypeORM   │      │     postgres:16      │
│        :3080         │      │        :8000         │      │        :5432         │
└──────────┬───────────┘      └──────────────────────┘      └──────────────────────┘
           │
           │ loads JS bundle at runtime
           ▼
┌──────────────────────┐
│    Micro-frontend    │
│ React + Vite IIFE    │
│      internal        │
└──────────────────────┘
```

## Services

| Service | Tech | Role |
|---|---|---|
| `frontend` | React + Vite → nginx | UI, проксює /api та /mfe |
| `backend` | NestJS + TypeORM | REST API |
| `microfrontend` | React + Vite (IIFE) → nginx | Незалежний widget |
| `db` | PostgreSQL 16 | Зберігання даних |

## API

- `GET /api/health` — статус API + DB
- `GET /api/items` — список items
- `POST /api/items` — створити item `{ "name": "...", "description": "..." }`
- `DELETE /api/items/:id` — видалити item
