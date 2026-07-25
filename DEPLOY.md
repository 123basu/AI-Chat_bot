![alt text](<WhatsApp Image 2026-07-25 at 2.37.01 PM.jpeg>)# Deployment Guide

Deploy the backend on Render and the frontend on Vercel.

---

## Prerequisites

- A GitHub repository with the code pushed
- OpenRouter API key (https://openrouter.ai/keys)
- Render account (https://render.com)
- Vercel account (https://vercel.com)

---

## 1. Backend — Deploy to Render

### Option A: Render Blueprint (recommended)

A `render.yaml` is already included in the `backend/` folder. Connect your GitHub repo and Render will auto-detect it.

Steps:

1. Push code to GitHub
2. In Render dashboard, click **New → Blueprint**
3. Connect your GitHub repo
4. Render reads `backend/render.yaml` and creates the service
5. After creation, go to **Environment** and add:
   - `OPENROUTER_API_KEY` = your OpenRouter key
6. The service starts automatically. Note your URL (e.g. `https://ai-chat-backend.onrender.com`)

### Option B: Manual Setup

1. In Render dashboard, click **New → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**, add:
   - `OPENROUTER_API_KEY` = your OpenRouter key
5. Click **Create Web Service**

---

## 2. Frontend — Deploy to Vercel

1. In Vercel dashboard, click **Add New → Project**
2. Import your GitHub repo
3. Configure:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Under **Environment Variables**, add:
   - (No frontend env vars needed — the backend URL goes in vercel.json)
5. Click **Deploy**

### Connect Frontend to Backend

Edit `frontend/vercel.json` and replace the placeholder URL with your actual Render backend URL:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-backend.onrender.com/$1" }
  ]
}
```

Push this change to GitHub — Vercel auto-redeploys.

---

## 3. Verify

1. Open your Vercel frontend URL in a browser
2. Type a message and click Send
3. The frontend calls `/api/chat` → Vercel rewrites to `https://your-backend.onrender.com/chat` → OpenRouter → response displayed

---

## Important Notes

- **Single-process backend:** The in-memory conversation storage is per-process. On Render's free tier, if the service sleeps and restarts, all conversations are lost. This is expected.
- **Session isolation:** Each browser tab generates a unique `session_id`. Multiple users talking to the same backend instance will have isolated conversations.
- **Cold starts:** Render's free tier spins down after 15 minutes of inactivity. The first request after idle time will take a few seconds to wake up.
