# Chronos-X

**Temporal Spatial Intelligence for Aadhaar Demand Forecasting**

> UIDAI Hackathon 2026 | Version 2.9.18

![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![Next.js](https://img.shields.io/badge/next.js-16-black)
![FastAPI](https://img.shields.io/badge/fastapi-0.115-009688)
![License](https://img.shields.io/badge/license-MIT-green)

---

## What Is This

Chronos-X transforms UIDAI from *reactive* ("the queue is 3 hours long") to *proactive* ("add two centres next month, trust us").

We built a demand forecasting system that synthesizes three behavioral signals—child enrolments, address changes, and biometric updates—into a unified **Pulse Vector** representing the socio-economic heartbeat of every PIN code in India. Then we point Amazon Chronos at it, add a spatial similarity algorithm we're unreasonably proud of, and let the math do the talking.

The result: a 1-6 month forecast for Aadhaar service demand across 19,000+ PIN codes, with actionable recommendations that even your least technical stakeholder can understand.

---

## The Core Idea: Pulse Vectors

Every geographic unit gets a 3D vector at time *t*:

```
V = <Growth, Flow, Labor>
```

| Signal | What It Measures | Why It Matters |
|--------|------------------|----------------|
| **Growth** | Child enrolments (0-5 years) | Family settlement, new residential zones |
| **Flow** | Address updates | Migration patterns, urban expansion |
| **Labor** | Biometric updates | Workforce movement, aging demographics |

Raw counts are useless across different population scales. We Z-score normalize everything against state baselines so the AI learns *patterns* (pre-harvest migration, school admissions) rather than memorizing population sizes.

---

## The Algorithm Nobody Asked For: Spatial Parallel Search

Traditional time-series models collapse when you have less than 6 months of history. Our solution: behavioral plagiarism.

**Hypothesis**: India is 3.3 million square kilometers of humans doing remarkably similar things in remarkably different places. A developing suburb in Maharashtra today probably looks like a suburb in Karnataka did 18 months ago.

**How it works**:
1. Encode the target PIN's recent Pulse Vector trajectory
2. Cosine similarity scan across 19,000+ PINs in *different* states
3. Find "Parallel Universes"—regions that had identical behavioral signatures N months ago
4. Infer that your target's future will resemble your parallel's present
5. Ensemble with Amazon Chronos zero-shot forecasts using confidence-weighted averaging

It works disturbingly well for regions with sparse data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 16)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ D3.js Map   │  │ TissueDeck  │  │ Terminal Display│  │
│  │ (60fps)     │  │ Design Sys  │  │ (CRT Aesthetic) │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST + WebSocket
┌────────────────────────┴────────────────────────────────┐
│                    BACKEND (FastAPI)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Polars ETL  │  │ Chronos     │  │ LangChain Bot   │  │
│  │ Pipeline    │  │ Forecaster  │  │ (Streaming)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Backend Stack
- **FastAPI** with async WebSocket support
- **Polars** (Rust-backed DataFrames, because pandas is for people with patience)
- **Amazon Chronos** (T5-Base foundation model)
- **LangChain** for the conversational AI layer
- **OpenRouter/Vercel AI Gateway** for LLM routing

### Frontend Stack
- **Next.js 16** (App Router, Server Components)
- **TypeScript 5.0** (Strict mode, obviously)
- **D3.js** for cartographic rendering at 60fps
- **Framer Motion** for physics-based animations
- **Zustand** for global state management
- **TissueDeck** design system (glassmorphism with taste)

---

## Features

### Interactive India Map
- Click-to-drill navigation: India → State → District
- Heatmap visualization by signal intensity
- Hardware-accelerated hover states
- Timeline slider for 12-month forecast exploration

### Terminal Intelligence Display
- CRT-aesthetic data overlay with scanline effects
- Typewriter animation for dramatic data reveals
- Split-view mode: 60/40 map-to-terminal ratio
- Strategic insights generation based on signal analysis
- Embedded chatbot for contextual queries

### AI Copilot
- WebSocket streaming responses (token-by-token, like the cool kids)
- Markdown rendering with full GFM support
- Context-aware recommendations citing similar districts
- Session-scoped chat history per district

### Comparison Mode
- Side-by-side region analysis
- Cross-type comparisons (State vs District vs PIN)
- Automated delta calculations

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 20+
- 8GB RAM minimum (16GB recommended for full map rendering)

### Installation

```bash
# Clone
git clone https://github.com/PranayJuneja/UIDAI-Hackathon.git
cd UIDAI-Hackathon

# Backend
python -m venv venv
.\venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Run data pipeline (transforms CSVs to Pulse Vectors)
python src/data_pipeline.py

# Frontend
cd frontend
npm install
```

### Running

**Terminal 1 (Backend)**:
```bash
python api_server.py
# http://localhost:8000
```

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm run dev
# http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` and configure:
```
OPENROUTER_API_KEY=your_key_here
ALLOWED_ORIGINS=http://localhost:3000
```

---

## API Reference

Full Swagger docs available at `http://localhost:8000/docs`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/map` | GET | GeoJSON with Pulse Vector intensities |
| `/api/states/{id}` | GET | State drill-down with district aggregation |
| `/api/districts/{id}` | GET | District-level signal breakdown |
| `/api/predict/{pincode}` | GET | Forecast with parallel region citations |
| `/api/trends/{location_id}` | GET | Time-series data for charts |
| `/ws/chat` | WS | Chatbot with streaming responses |
| `/ws/terminal-chat` | WS | Lightweight terminal-specific chat |

---

## Project Structure

```
├── api_server.py          # FastAPI server, WebSocket handlers
├── src/
│   ├── data_pipeline.py   # Polars ETL for Pulse Vectors
│   ├── ai_forecaster.py   # Spatial Parallel Search + Chronos
│   ├── langchain_bot.py   # Global chatbot with tool calling
│   └── terminal_bot.py    # Lightweight terminal-specific bot
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── Map/       # IndiaMap, TerminalInfoDisplay
│   │   │   ├── Dashboard/ # Stats, Hotspots, Breadcrumb
│   │   │   ├── Chatbot/   # Streaming WebSocket client
│   │   │   └── Charts/    # D3-based visualizations
│   │   └── lib/
│   │       ├── mapStore.ts    # Zustand state management
│   │       └── config.ts      # API endpoints
└── data/
    ├── input/             # Raw UIDAI CSVs
    └── output/            # Processed Parquet files
```

---

## Recent Highlights

See [CHANGELOG.md](./CHANGELOG.md) for the full history.

- **v2.9.18**: Separated terminal chat for 30-50% faster responses; real spatial similarity data in prompts
- **v2.9.14**: Burst animations and split-screen terminal layout
- **v2.9.12**: Token-by-token streaming for chatbot responses
- **v2.9.8**: Terminal information display with CRT aesthetics
- **v2.9.0**: Signal breakdown cards, trend charts, comparison mode
- **v2.8.0**: Homepage redesign with TissueDeck design system

---

## Contributing

We welcome PRs, particularly for:
- Model fine-tuning with regional Indian datasets
- WebGL performance optimizations
- Vernacular support in the attestation engine

Please follow [Conventional Commits](https://www.conventionalcommits.org/) and open a PR against `main`.

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

> **Note**: This is a hackathon prototype. All data is synthetic or anonymized for demonstration purposes. No actual UIDAI data was harmed in the making of this project.
