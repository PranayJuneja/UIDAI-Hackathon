# Deployment Guide for Chronos-X

This guide outlines how to host the Chronos-X platform. The architecture consists of a Python FastAPI backend and a Next.js frontend.

**Recommended Stack:**
*   **Backend:** Render, Railway, or any Docker-compatible PaaS.
*   **Frontend:** Vercel (Native support for Next.js).

---

## 1. Backend Deployment (Render.com)

We recommend deploying the backend first, as the frontend needs the backend URL to function.

1.  **Push your code to GitHub.**
2.  **Create a Render Account** at [render.com](https://render.com).
3.  **New Web Service:**
    *   Click "New +" -> "Web Service".
    *   Connect your GitHub repository.
    *   **Runtime:** choose **Docker**.
    *   **Region:** Choose one close to you (e.g., Singapore for India).
    *   **Plan:** "Free" (note: Free tier spins down after inactivity. For production, use "Starter").
4.  **Environment Variables:**
    *   `ALLOWED_ORIGINS`: Set this to `*` (for testing) or your Vercel Frontend URL (e.g., `https://chronos-frontend.vercel.app`) once known.
    *   `OPENAI_API_KEY`: (If you are using LLM features).
    *   `PORT`: `8000` (Optional, Render usually sets this automatically, but our Dockerfile respects it).
5.  **Deploy:** Click "Create Web Service".
6.  **Copy the URL:** Once deployed, copy your backend URL (e.g., `https://chronos-backend.onrender.com`).

**Note on "Health Check":**
Render may look for a health check path. You can use `/` or `/api/health`.

---

## 2. Frontend Deployment (Vercel)

1.  **Create a Vercel Account** at [vercel.com](https://vercel.com).
2.  **Add New Project:**
    *   Click "Add New..." -> "Project".
    *   Import your GitHub repository.
3.  **Configure Project:**
    *   **Framework Preset:** Next.js (should be auto-detected).
    *   **Root Directory:** Click "Edit" and select `frontend`. **(Crucial)**
4.  **Environment Variables:**
    *   Expand "Environment Variables".
    *   Add `NEXT_PUBLIC_API_BASE`: Set this to your **Backend URL** (e.g., `https://chronos-backend.onrender.com`).
    *   Add `NEXT_PUBLIC_WS_BASE`: Set this to your backend WS URL (e.g., `wss://chronos-backend.onrender.com`).
        *   *Note:* Use `wss://` (WebSocket Secure) if your backend is `https://`. Use `ws://` if `http://`. Render provides HTTPS, so use `wss://`.
    *   Add `NEXT_PUBLIC_GEOJSON_CDN`: (Optional, use default if not set).
5.  **Deploy:** Click "Deploy".

---

## 3. Verification

1.  Open your Vercel deployment URL.
2.  Check the browser console (F12) for any connection errors.
3.  Test the Chatbot (bottom right) to verify WebSocket connection.
4.  Verify the Map loads data from the API.

## Troubleshooting

*   **Backend Enjoys 502/503:** Check Render logs. If it says "Out of Memory", you might need a paid plan or lighter model. We configured the Dockerfile to use CPU-only Torch to save space.
*   **CORS Errors:** If the frontend can't talk to the backend, ensure your backend allows the Vercel domain.
    *   *Fix:* In `api_server.py`, update `ALLOWED_ORIGINS` to include your Vercel domain or set it to `["*"]` for testing.
