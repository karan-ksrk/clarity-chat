# Learning Chat — Django Backend

## Quick Start

```bash
cd django_backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit with your LLM_API_KEY
python manage.py migrate
python manage.py runserver 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/conversations/main` | Create main conversation |
| POST | `/chat/main/{id}/message` | Send message to main chat |
| GET | `/chat/main/{id}` | Get main conversation + messages |
| POST | `/chat/side` | Create side chat |
| POST | `/chat/side/{id}/message` | Send follow-up in side chat |
| POST | `/chat/side/{id}/close` | Close side chat |
| GET | `/chat/side/{id}` | Get side conversation + messages |

## Architecture

```
chat/
├── models.py       # Conversation & Message models
├── prompts.py      # System prompt templates
├── llm_gateway.py  # LLM abstraction (OpenAI-compatible)
├── services.py     # Business logic (fat services, thin views)
├── serializers.py  # DRF request/response serializers
├── views.py        # API endpoint handlers
└── urls.py         # URL routing
```

## Connect the Frontend

Set `VITE_DJANGO_API_URL=http://localhost:8000` in the Lovable frontend `.env` and the app will route API calls to your Django server.
