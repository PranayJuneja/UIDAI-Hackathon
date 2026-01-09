# Chronos-X: UIDAI Hackathon 2026 Submission

**Project Code:** UIDAI-HACK-2026-CHRONOS
**Version:** 2.6.0 (The Liquid Glass Release)

## Project Overview

Chronos-X is a demand forecasting platform for UIDAI that shifts operations from "Reactive Logistics" to "Proactive Anticipation". It fuses Biometric, Demographic, and Enrolment data into a unified **Pulse Vector** to predict migration trends, labor movements, and settlement patterns.

**Core Innovation:**
*   **Pulse Vector ($V_p$):** A normalized tensor representing socio-economic activity (Growth, Flow, Labor) for a PIN code.
*   **Spatial Parallel Search:** A behavioral cloning algorithm that predicts a region's future by finding "parallel universes"—other regions that exhibited identical patterns in the past.
*   **Amazon Chronos:** Uses the Amazon Chronos foundation model for time-series forecasting.

## System Architecture

### Backend (Inference Engine)
*   **Framework:** FastAPI (Python 3.10+)
*   **Data Engine:** Polars (Rust-backed DataFrame engine) for high-performance ETL.
*   **AI Orchestration:** LangChain + Amazon Chronos.
*   **Key Components:**
    *   `api_server.py`: Main entry point, REST API, and WebSocket server.
    *   `src/data_pipeline.py`: ETL pipeline transforming CSVs to Parquet.
    *   `src/chronos_engine.py`: Model inference logic.
    *   `src/attestation.py`: LLM-driven reasoning layer.

### Frontend (Experience Layer)
*   **Framework:** Next.js 16.1.1 (React 19, App Router)
*   **Language:** TypeScript 5.0
*   **State Management:** Zustand
*   **Visualization:** D3-geo (Map projections), Framer Motion (Animations).
*   **Design System:** "TissueDeck" (Glassmorphism, particle dynamics).

## Setup & Execution

### Prerequisites
*   Python 3.10 or higher
*   Node.js 20.x or higher
*   Memory: 8GB RAM minimum

### 1. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Data Pipeline
Transform raw data into the optimized Pulse Vector store.
```bash
python src/data_pipeline.py
# Generates data/output/pulse_vectors.parquet
```

### 3. Run Backend Server
```bash
python api_server.py
# Server starts at http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### 4. Frontend Setup & Run
```bash
cd frontend
npm install
npm run dev
# App starts at http://localhost:3000
```

## Key Directories

*   **`src/`**: Core backend logic (AI engine, data pipeline, location resolver).
*   **`frontend/`**: Next.js source code.
    *   `app/`: App Router pages and layouts.
    *   `components/`: UI components (Charts, Map, Chatbot).
*   **`data/`**:
    *   `api_data_*`: Raw CSV datasets.
    *   `output/`: Processed Parquet files.
*   **`docs/`**: Detailed documentation (Architecture, Feasibility, API).
*   **`scripts/`**: Analysis and utility scripts.

## Development Conventions

*   **Python:** Strictly typed (using `typing`), Pydantic for data validation.
*   **Frontend:** TypeScript strict mode. Functional components. CSS Modules for styling.
*   **API:** RESTful design + WebSocket for real-time chat.
*   **Logging:** Centralized logging configuration in `api_server.py`.
