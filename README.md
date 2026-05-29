# Less Game Editor

Визуальный редактор визуальных новелл на блок-схемах с экспортом в Ren'Py.

## Стек

- **Frontend:** Next.js 15, React Flow, TanStack Query, Zustand, Tailwind CSS
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL / SQLite (локально)
- **Auth:** JWT (httpOnly cookies), регистрация с подтверждением email
- **Storage:** локальное хранилище (dev) / S3-совместимое (prod)

## Быстрый старт (Windows, без Docker)

```powershell
.\start.ps1
```

Поднимает backend + frontend локально на SQLite.

**Demo-аккаунт:** `demo@example.com` / `demo12345`

## Быстрый старт (Docker)

```bash
cp .env.example .env
docker compose up --build
```

Сервисы:

| Сервис   | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:8000      |
| Mailpit  | http://localhost:8025      |
| MinIO    | http://localhost:9001      |

## Локальная разработка без Docker

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Требуется PostgreSQL на `localhost:5432` (см. `.env.example`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Возможности

- Редактор блок-схем: 14 типов блоков (сцена, диалог, выбор, музыка, эффекты и др.)
- Превью сцены сверху, панель действий справа
- Загрузка медиа: фоны, персонажи, музыка, звуки
- Autosave графа
- Несколько проектов: создание, переименование, дублирование, переключение в редакторе
- Экспорт ZIP для Ren'Py (`script.rpy` + assets)

## Переменные окружения

Скопируйте `.env.example` в `.env` и настройте:

- `DATABASE_URL` — PostgreSQL
- `JWT_SECRET` — секрет для JWT
- `SMTP_*` — SMTP для писем подтверждения
- `STORAGE_BACKEND` — `local` или `s3`
- `S3_*` — параметры S3/MinIO (для prod)

## API

- `POST /auth/register` — регистрация
- `GET /auth/verify-email?token=...` — подтверждение email
- `POST /auth/login` — вход
- `GET /projects` — список проектов
- `POST /projects/{id}/duplicate` — дублировать проект
- `PATCH /projects/{id}/graph` — сохранение блок-схемы
- `POST /projects/{id}/assets` — загрузка медиа
- `GET /projects/{id}/export/renpy` — экспорт ZIP

## Структура экспорта Ren'Py

```
{game_title}/
├── game/
│   ├── script.rpy
│   ├── options.rpy
│   ├── images/bg/
│   ├── images/char/
│   └── audio/
└── project.json
```

Скопируйте папку в проект Ren'Py SDK или используйте как основу для новой игры.
