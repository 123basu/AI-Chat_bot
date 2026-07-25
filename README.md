# AI Chat Assistant

A simple chat application using React + Vite (frontend) and FastAPI (backend) with OpenRouter API.

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenRouter API key (https://openrouter.ai/keys)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
```

Create `backend/.env` with your OpenRouter API key:

```
OPENROUTER_API_KEY=your_key_here
```

Run the server:

```bash
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## API

**POST** `/chat`

```json
{ "message": "Hello" }
```

Response:

```json
{ "reply": "Hi! How can I help you?" }
```

## Deployment

- **Frontend**: Deploy to Vercel — point to `frontend/` directory.
- **Backend**: Deploy to Render — use `backend/render.yaml` or point to `backend/` directory.

Update `frontend/vercel.json` with your actual Render backend URL before deploying.
