# Clarity Chat

Clarity Chat is a two-panel AI learning app:
- Main chat for topic-focused tutoring.
- Side chat for quick contextual explanations of highlighted text from assistant responses.

The project has:
- `backend/`: Django + Django REST Framework API.
- `frontend/`: React + Vite + TypeScript UI.

## Features
- Start a main learning conversation by topic.
- Ask follow-up questions in the main thread.
- Highlight assistant text and open a side conversation for focused clarification.
- Persist conversations/messages in SQLite (default backend setup).
- OpenAI-compatible LLM provider support via configurable base URL and model.

## Tech Stack
- Frontend: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- Backend: Django, Django REST Framework, django-cors-headers, OpenAI SDK.
- Database: SQLite (default), PostgreSQL dependency included for production migration.

## Repository Structure
```text
clarity-chat/
  backend/
    api/                 # models, serializers, views, service layer, prompts, LLM gateway
    chat_backend/        # Django settings/urls/asgi/wsgi
    manage.py
  frontend/
    src/components/      # chat UI, side panel, input, selectors
    src/lib/api.ts       # frontend API client (Django or Supabase edge fallback)
    package.json
```

## Prerequisites
- Node.js 18+
- Python 3.11+ (project metadata targets 3.13)
- pip

## Backend Setup (Django)
From the repo root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env`:

```env
DJANGO_SECRET_KEY=replace-me
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=*

LLM_API_KEY=your_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

Run migrations and start server:

```powershell
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Backend base URL: `http://localhost:8000/api`

## Frontend Setup (React + Vite)
From the repo root:

```powershell
cd frontend
npm install
```

Create `frontend/.env` for Django backend mode:

```env
VITE_DJANGO_API_URL=http://localhost:8000/api
```

Start frontend:

```powershell
npm run dev
```

Frontend URL: `http://localhost:8080`

## API Modes in Frontend
`frontend/src/lib/api.ts` supports two modes:

1. Django mode (recommended for this repo)
- Triggered when `VITE_DJANGO_API_URL` is set.
- Calls Django endpoints under `/api`.

2. Supabase Edge fallback
- Used when `VITE_DJANGO_API_URL` is not set.
- Requires:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

## Backend API Endpoints
All endpoints are prefixed with `/api`.

### Main Conversation
- `POST /conversations/main`
  - Body: `{ "main_topic": "string" }`
- `POST /chat/main/{conversation_id}/message`
  - Body: `{ "message": "string" }`
- `GET /chat/main/{conversation_id}`

### Side Conversation
- `POST /chat/side`
  - Body:
    ```json
    {
      "main_conversation_id": "uuid",
      "highlighted_text": "string",
      "surrounding_context": "string (optional)",
      "user_question": "string",
      "user_level": "beginner"
    }
    ```
- `POST /chat/side/{side_conversation_id}/message`
  - Body: `{ "message": "string" }`
- `POST /chat/side/{side_conversation_id}/close`
- `GET /chat/side/{side_conversation_id}`

## How to Run the Full App
1. Start backend on `:8000`.
2. Start frontend on `:8080` with `VITE_DJANGO_API_URL` set.
3. Open `http://localhost:8080`.

## Testing
Frontend tests:

```powershell
cd frontend
npm test
```

Backend has a test module scaffold at `backend/api/tests.py`, but no implemented test suite yet.

## Notes
- CORS is currently configured as allow-all in backend settings (`CORS_ALLOW_ALL_ORIGINS = True`) for development.
- Side panel follow-up UI is currently marked as MVP-only in `LearningChat` (`onSendMessage` is a stub).
