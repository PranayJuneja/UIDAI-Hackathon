# Chronos-X Deployment Guide

**Stack:** FastAPI (Python 3.10) + Next.js 16 | **Deploy:** GCP Cloud Run + Vercel

---

## TL;DR Quick Deploy

```bash
# 1. Backend → GCP Cloud Run (5 min)
gcloud run deploy chronos-api --source . --region asia-south1 --allow-unauthenticated --memory 2Gi --cpu 1 --min-instances 0 --max-instances 3 --set-env-vars "AI_GATEWAY_API_KEY=$AI_KEY,ALLOWED_ORIGINS=https://your-app.vercel.app"

# 2. Frontend → Vercel (2 min)
# Connect repo → Root: frontend → Add NEXT_PUBLIC_API_BASE=https://chronos-api-xxx-el.a.run.app
```

---

## Cost Breakdown (Monthly Estimates)

| Service | Free Tier | Light Use (1K req/day) | Moderate (10K req/day) |
|---------|-----------|------------------------|------------------------|
| **Cloud Run** | 2M req, 360K GB-sec | **$0** | ~$3-5 |
| **Artifact Registry** | 0.5GB free | **$0** | $0.10 |
| **Vercel** | 100GB bandwidth | **$0** | **$0** |
| **AI Gateway** | Per Vercel plan | Varies | Varies |
| **TOTAL** | — | **$0-2** | **$3-8** |

> **Cheapest path:** Cloud Run (scale-to-zero) + Vercel free tier = **$0/month** for hackathon demo traffic.

---

## Part 1: Backend on GCP Cloud Run

### Why Cloud Run?
- ✅ **Scale to zero** = No cost when idle
- ✅ **No waiting** = Deploy in 5 minutes (no VM provisioning)
- ✅ **WebSocket support** = Works out of the box
- ✅ **$300 free credits** for new accounts

### Pre-Requisites

```powershell
# Install gcloud CLI (if not installed)
winget install Google.CloudSDK

# Login
gcloud auth login

# Create project (skip if exists)
gcloud projects create chronos-uidai-2026 --name="Chronos UIDAI"
gcloud config set project chronos-uidai-2026

# Link billing (required, but free credits work)
# Do this in console: https://console.cloud.google.com/billing
```

### Enable APIs (One-Time)

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### Deploy Command (The Money Shot)

```powershell
cd "d:\Antigravity Projects\UIDAI Project"

gcloud run deploy chronos-api `
  --source . `
  --region asia-south1 `
  --platform managed `
  --allow-unauthenticated `
  --memory 2Gi `
  --cpu 1 `
  --timeout 300 `
  --min-instances 0 `
  --max-instances 5 `
  --concurrency 80 `
  --port 8000 `
  --set-env-vars "ALLOWED_ORIGINS=*,AI_GATEWAY_API_KEY=YOUR_KEY,AI_GATEWAY_BASE_URL=https://gateway.ai.vercel.dev/v1/openai,AI_MODEL=minimax/minimax-m2.1"
```

### Config Explained

| Flag | Value | Why |
|------|-------|-----|
| `--memory 2Gi` | 2GB RAM | Chronos + Torch CPU + Polars need ~1.5GB |
| `--cpu 1` | 1 vCPU | Sufficient for inference; keeps costs low |
| `--min-instances 0` | Scale to zero | **No charges when idle** |
| `--max-instances 5` | Cap at 5 | Prevents runaway costs |
| `--timeout 300` | 5 min | Some forecasts take time |
| `--concurrency 80` | 80 req/instance | FastAPI handles concurrency well |

### Get Your URL

```powershell
gcloud run services describe chronos-api --region asia-south1 --format="value(status.url)"
# Output: https://chronos-api-xxxxxx-el.a.run.app
```

### Update CORS After Frontend Deploy

```powershell
gcloud run services update chronos-api `
  --region asia-south1 `
  --set-env-vars "ALLOWED_ORIGINS=https://your-app.vercel.app"
```

---

## Part 2: Frontend on Vercel

### Steps

1. **Push to GitHub** (if not already)
2. **Import to Vercel:** [vercel.com/new](https://vercel.com/new)
3. **Configure:**
   - **Framework:** Next.js (auto-detected)
   - **Root Directory:** `frontend` ← **CRITICAL**
4. **Environment Variables:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_BASE` | `https://chronos-api-xxxxx-el.a.run.app` |
| `NEXT_PUBLIC_WS_BASE` | `wss://chronos-api-xxxxx-el.a.run.app` |

5. **Deploy** → Takes ~2 minutes

### Vercel Free Tier Limits

- 100GB bandwidth/month (plenty for demo)
- Unlimited deploys
- Edge functions included
- Custom domains included

---

## Part 3: Environment Variables Reference

### Backend (.env)

```env
# Required
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
AI_GATEWAY_BASE_URL=https://gateway.ai.vercel.dev/v1/openai
AI_MODEL=minimax/minimax-m2.1

# Optional (defaults shown)
ALLOWED_ORIGINS=https://your-app.vercel.app
RATE_LIMIT_PER_MINUTE=60
MAX_WS_CONNECTIONS_PER_IP=10
WS_RECEIVE_TIMEOUT_SECONDS=300
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_BASE=https://chronos-api-xxxxx-el.a.run.app
NEXT_PUBLIC_WS_BASE=wss://chronos-api-xxxxx-el.a.run.app
```

---

## Alternative: Even Cheaper (Cold Start Trade-off)

### Cloud Run with 512MB (If No AI Chat)

If you disable the AI chatbot, you can run lighter:

```powershell
gcloud run deploy chronos-api-lite `
  --source . `
  --region asia-south1 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --set-env-vars "ALLOWED_ORIGINS=*"
```

**Savings:** ~30% less memory costs, but loses LLM streaming capability.

---

## Cloud Run Pricing Deep Dive

### Free Tier (Monthly)

| Resource | Free Amount | After Free |
|----------|-------------|------------|
| Requests | 2 million | $0.40/million |
| CPU | 180,000 vCPU-seconds | $0.000024/vCPU-sec |
| Memory | 360,000 GB-seconds | $0.0000025/GB-sec |
| Networking | 1GB egress | $0.12/GB (Asia) |

### Example Calculation

**Scenario:** 1,000 requests/day, avg 2s response, 2GB memory

```
Monthly requests: 30,000 (free tier covers)
CPU time: 30,000 × 2s = 60,000 vCPU-sec (free tier: 180,000) ✅
Memory time: 30,000 × 2s × 2GB = 120,000 GB-sec (free tier: 360,000) ✅
```

**Result: $0/month** for this usage pattern.

---

## Verification Checklist

```
□ Backend URL returns 200 on /api/health
□ Map loads state data (check Network tab)
□ Timeline slider works
□ AI Chatbot streams responses
□ District terminal opens and chats work
□ No CORS errors in console
```

### Health Check URLs

```
GET  https://your-backend.run.app/                    → {"message": "Chronos-X API is up!"}
GET  https://your-backend.run.app/api/timeline        → Returns month list
GET  https://your-backend.run.app/api/map-data        → Returns state aggregations
WS   wss://your-backend.run.app/ws/chat               → WebSocket handshake
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **502/503 errors** | Increase `--memory` to 4Gi |
| **CORS errors** | Update `ALLOWED_ORIGINS` with exact Vercel URL |
| **Cold start slow (10s+)** | Set `--min-instances 1` (~$15/month) |
| **WebSocket disconnects** | Check `--timeout 300` is set |
| **AI not responding** | Verify `AI_GATEWAY_API_KEY` is correct |

### View Logs

```powershell
gcloud run logs read chronos-api --region asia-south1 --limit 50
```

---

## Alternative: Render.com (Simpler, Slower)

If GCP feels complex, use Render:

1. Connect GitHub repo
2. Create Web Service → **Docker** runtime
3. Set env vars same as above
4. **Free tier caveat:** Spins down after 15 min idle, 30s cold start

---

## Production Hardening (Post-Hackathon)

- [ ] Set `--min-instances 1` to eliminate cold starts
- [ ] Add Cloud Armor for DDoS protection
- [ ] Configure custom domain with HTTPS
- [ ] Set up Cloud Monitoring alerts
- [ ] Use Secret Manager for API keys (instead of env vars)

---

## Summary

| Component | Service | Cost | Deploy Time |
|-----------|---------|------|-------------|
| Backend | Cloud Run | $0-5/mo | 5 min |
| Frontend | Vercel | $0 | 2 min |
| Database | None (parquet files) | $0 | — |
| AI | Vercel AI Gateway | Per plan | — |

**Total for hackathon demo: $0/month** with scale-to-zero.
