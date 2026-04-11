# Fe Containerize

Демо застосунок з 4 сервісів:

- `frontend`: React + Vite, у проді віддається через nginx
- `backend`: NestJS + TypeORM
- `microfrontend`: окремий React widget у форматі IIFE
- `db`: PostgreSQL

## Architecture

```text
┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
│       Frontend       │─────▶│       Backend        │─────▶│      PostgreSQL      │
│    React + nginx     │      │   NestJS + TypeORM   │      │     postgres:16      │
│        :3080         │      │        :8000         │      │        :5432         │
└──────────┬───────────┘      └──────────────────────┘      └──────────────────────┘
           │
           │ loads JS bundle at runtime
           ▼
┌──────────────────────┐
│    Micro-frontend    │
│  React IIFE + nginx  │
│      internal        │
└──────────────────────┘
```

## API

- `GET /api/health`
- `GET /api/items`
- `POST /api/items`
- `DELETE /api/items/:id`

`POST /api/items` приймає JSON:

```json
{
  "name": "Item name",
  "description": "Optional description"
}
```

## Project Structure

```text
fe_containerize/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── RemoteWidget.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── main.ts
│   │   └── items/
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.build.json
│   └── tsconfig.json
├── microfrontend/
│   ├── src/
│   │   ├── Widget.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   └── vite.config.js
├── db/
│   └── init.sql
├── docker-compose.yml
└── .env.example
```

## Quick Start

```bash
cp .env.example .env
docker compose up --build -d
```

Після старту frontend доступний на `http://localhost:3080`, якщо використовується `.env.example` без змін.

Перевірка:

```bash
curl http://localhost:3080/api/health
curl http://localhost:3080/api/items
curl -I http://localhost:3080/mfe/widget.iife.js
```

### Зупинка і відновлення

```bash
# Тимчасова зупинка (контейнери і дані зберігаються)
docker compose stop

# Відновлення після stop
docker compose start

# Зупинити і видалити контейнери (volume з БД залишається)
docker compose down

# Видалити разом з даними БД
docker compose down -v
```

### Перемикання на інший додаток (на тому ж порті)

```bash
# Зупинити поточний
cd ~/fe_containerize
docker compose down

# Запустити інший додаток на тому ж порті
cd ~/my-other-app
docker compose up -d
# В docker-compose нового додатку порт має бути:
#   ports:
#     - "${FRONTEND_PORT:-3080}:80"

# Повернути назад
cd ~/my-other-app && docker compose down
cd ~/fe_containerize && docker compose up -d
```

## Environment Variables

`.env.example` містить лише змінні, які реально використовуються поточною конфігурацією:

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DB` | `appdb` | Назва БД |
| `POSTGRES_USER` | `appuser` | Користувач БД |
| `POSTGRES_PASSWORD` | `CHANGE_ME_USE_STRONG_PASSWORD` | Пароль БД |
| `FRONTEND_PORT` | `3080` | Зовнішній порт frontend |
| `ALLOWED_ORIGINS` | `https://demo.triggers.online` | CORS origins для backend |

## Local Development

Потрібен локальний PostgreSQL на `localhost:5432`, або контейнер з `db/init.sql`.

1. Backend:

```bash
cd backend
npm install
npm run start:dev
```

2. Microfrontend:

```bash
cd microfrontend
npm install
npm run dev
```

3. Frontend:

```bash
cd frontend
npm install
npm run dev
```

Dev proxy:

- `frontend/vite.config.js` проксіює `/api` на `http://localhost:8000`
- `frontend/vite.config.js` проксіює `/mfe` на `http://localhost:3001`
- `microfrontend/vite.config.js` проксіює `/api` на `http://localhost:8000`

## Production Notes

- Назовні достатньо відкривати тільки `FRONTEND_PORT`
- `backend` і `db` залишаються у внутрішній Docker-мережі
- `frontend/nginx.conf` проксіює `/api` до `backend:8000`
- `frontend/nginx.conf` проксіює `/mfe` до `microfrontend:80`
- `db/init.sql` виконується лише при першому створенні тому
