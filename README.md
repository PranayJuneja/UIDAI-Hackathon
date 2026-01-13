# Chronos-X: Temporal Spatial Intelligence for Aadhaar Demand Forecasting

**Engineered for UIDAI Hackathon 2026**
**Team CVPL | TeamID: UIDAI_7**

---

## Executive Summary

**Chronos-X** is a high-fidelity predictive analytics platform architected to shift the Unique Identification Authority of India (UIDAI) from an operational stance of *reactive mitigation* (solving queues after they form) to *proactive orchestration* (deploying resources before demand surges).

By synthesizing granular transaction logs into multidimensional **Pulse Vectors**, the system transforms static administrative data into a dynamic behavioral map of India. This allows for the prediction of Aadhaar service requirements—Enrolment, Document Updates, and Biometric Updates—with 1-month to 6-month horizons at the specific PIN code level.

This solution directly addresses the "blind spot" problem in internal migration monitoring. Instead of relying on lagged census data or post-facto complaints, Chronos-X leverages **Amazon Chronos zero-shot foundation models** and a proprietary **Spatial Parallel Search** algorithm to identify high-velocity demographic corridors *before* they manifest as service bottlenecks.

---

## Core Methodology & Algorithmic innovations

### 1. The Pulse Vector Framework ($V_{p,t}$)
Standard raw transaction counts are non-comparable across regions due to vast disparities in population density (e.g., comparing a PIN code in Mumbai to one in rural Ladakh). To solve this, Chronos-X implements a Z-score normalization pipeline that converts raw log data into a unified 3-dimensional vector for every geographic unit at time $t$:

$$V_{p,t} = [Growth, Flow, Labor]$$

#### Vector Components:
1.  **Growth Signal ($\mu_{enrol}, \sigma_{enrol}$)**:
    *   **Source**: Aadhaar Enrolments (Age 0-5).
    *   **Insight**: Acts as a proxy for new family settlements and residential variance. High growth signals typically precede higher demand for child biometric updates 5 years later.
    *   **Operational Trigger**: Creation of new permanent enrolment centers.

2.  **Flow Signal ($\mu_{demo}, \sigma_{demo}$)**:
    *   **Source**: Demographic Address Updates.
    *   **Insight**: A direct measure of urbanization, rental corridor shifts, and seasonal migration. This signal often "ripples" across states before biometric demand spikes.
    *   **Operational Trigger**: Deployment of mobile update vans and "Mega Camps" at transit hubs.

3.  **Labor Signal ($\mu_{bio}, \sigma_{bio}$)**:
    *   **Source**: Biometric Updates (Age 17+).
    *   **Insight**: Correlates strongly with manual labor intensity (fingerprint wear) and industrial workforce turnover.
    *   **Operational Trigger**: Extension of center operating hours (e.g., 6 PM - 9 PM) to accommodate daily wage workers.

### 2. The "Spatial Parallel Search" Algorithm (The Time Machine)
Standard time-series models (ARIMA, LSTM, Prophet) suffer catastrophic failure modes when historical data is sparse (e.g., < 6 months), known as the *Cold Start Problem*. Chronos-X circumvents this by trading *temporal depth* for *spatial breadth*.

**Hypothesis**: India is vast enough that for any given developing region $A$ (e.g., a new suburb in Pune), there exists a "Spatial Parallel" $B$ (e.g., a similar suburb in Bangalore) that exhibited an identical Pulse Vector trajectory $N$ months ago.

**Algorithm Steps**:
1.  **Vector Encoding**: The system encodes the recent $V_{p,t}$ trajectory of the target PIN code.
2.  **Cosine Similarity Scan**: It performs a vectorized similarity search across all 19,000+ PIN codes in the dataset, explicitly excluding the target's own state from the search space to force cross-regional learning.
    $$Similarity(A, B) = \frac{A \cdot B}{\|A\| \|B\|}$$
3.  **Outcome Projection**: If Region $B$ (the parallel) saw a 40% labor spike in month $t+1$, we project a similar probability distribution onto Region $A$.
4.  **Ensemble Weighting**: The final forecast is a weighted average of the **Amazon Chronos Zero-Shot** prediction (Temporal Logic) and the **Spatial Parallel** prediction (Behavioral Logic), weighted by the confidence interval width.

---

## System Architecture

The application is built on a decoupled, event-driven microservices architecture designed for sub-millisecond data processing and 60fps rendering.

### Frontend Layer (The "Glass" Interface)
*   **Next.js 16 (App Router)**: Leverages React Server Components (RSC) to pre-render heavy map geometries on the server, ensuring rapid First Contentful Paint (FCP).
*   **D3.js Visualization Engine**: Bypasses standard DOM rendering for direct SVG/Canvas manipulation, enabling smooth 60fps zoom/pan interactions even with 800+ rendered district polygons.
*   **Zustand State Store**: Manages complex, nested global state (selected hierarchy, active filters, timeline position) without the boilerplate of Redux.
*   **TissueDeck Design System**: A custom-built UI library implementing "glassmorphism" with rigorous concern for contrast ratios, utilizing CSS Modules for scoped, non-leaking styles.
*   **Real-Time WebSockets**: Manages persistent connections (`/ws/chat`, `/ws/terminal-chat`, `/ws/compare`) for bi-directional streaming of AI tokens and recommendation data.

### Backend Layer (The "Engine" Room)
*   **FastAPI**: Selected for its asynchronous native support (`async/await`), crucial for handling concurrent WebSocket connections without blocking the main event loop.
*   **Polars Data Engine**: Replaces Pandas for ETL operations. Polars' Rust-based query engine enables multi-threaded, lazy-evaluated data transformations, reducing aggregation times on the 200MB+ dataset by ~40x.
*   **Amazon Chronos (T5-Base)**: A foundation model based on the T5 transformer architecture. Unlike statistical models, it tokenizes time-series values into a fixed vocabulary, allowing it to "generate" future values using standard NLP-like attention mechanisms.
*   **LangChain AI Orchestrator**: Manages the context injection pipeline for the LLM, dynamically inserting relevant Pulse Vector stats into the system prompt before every inference.

---

## Detailed Feature Breakdown

### 1. Chronos Forecast Timeline Strategy
*   **GPU-Accelerated Batch Inference**: The system uses a dedicated Google Colab Pro pipeline (`chronos_colab_v2.ipynb`) to batch process 18,827 PINs. It utilizes the T4 GPU to run inference on 1024-PIN batches, effectively generating millions of predictions in minutes.
*   **Timeline Visualization**: The timeline component distinguishes between **Ground Truth** (blue markers) and **AI Forecasts** (amber, hollow markers).
*   **Confidence Logic**: The forecast visibility is gated by a confidence threshold; low-confidence predictions trigger a UI fallback to rule-based estimations to prevent misleading decision-makers.

### 2. Terminal Intelligence Engine
The terminal is not just a visual gimmick; it's a high-density information display optimized for rapid comprehension.
*   **Burst vs. Stream Rendering**:
    *   *State View*: Uses "Burst" rendering to instantly display high-level stats (Districts, PINs, Aggregate Signals) followed by a 1-second cognitive pause before streaming insights.
    *   *District View*: Switches to a "Stream" mode with auto-scrolling, mimicking a live data feed to guide the user's eye down to the "Recommended Actions."
*   **Markdown Chat Integration**: The integrated terminal chat component (`TerminalInfoDisplay.tsx`) uses a custom `ReactMarkdown` renderer to supporttables, lists, and code blocks within the chat bubbles, enabling the AI to format complex data (e.g., "Top 5 Migrant PINs") as structured tables.

### 3. AI-Powered Comparison Dashboard
*   **Vector Similarity Recommendations**: Instead of random suggestions, the "Compare" tab runs a real-time KNN (K-Nearest Neighbors) search to surface regions that are mathematically most similar to the current view.
*   **Streaming Fallback Protocol**: To ensure zero downtime:
    1.  Attempt **WebSocket** connection for real-time tokens.
    2.  If WS fails (>300ms), fallback to **HTTP** REST endpoint.
    3.  If HTTP fails/times out, fallback to local **Rule-Based** calculation.

---

## Data Pipeline Specification

The system follows a strict ETL (Extract, Transform, Load) pipeline defined in `src/data_pipeline.py`:

1.  **Ingestion**: Scans `data/input/*.csv` for raw UIDAI dumps.
2.  **Normalization**:
    *   Applies `normalize_state_names()` to fix 30+ variations of state spellings (e.g., "Orissa" -> "Odisha", "Daman and Diu" merged).
    *   Parses inconsistent date formats (`DD-MM-YYYY`, `YYYY-MM-DD`) into strict `datetime.date` objects.
3.  **Aggregation**: Groups millions of rows by `(pincode, month)` and sums signal values.
4.  **Fusion**: Performs an inner join on the three disparate datasets (Enrolment, Demo, Bio) to create the master table.
5.  **Z-Score Computation**: Calculates mean ($\mu$) and standard deviation ($\sigma$) per signal type across the entire dataset to generate the normalized Pulse Vectors.
6.  **Parquet Export**: Dumps the final processed table to `data/output/pulse_vectors.parquet` for optimized read performance by the API server.

---

## Installation and Deployment

### Prerequisites
*   **Python**: 3.10+ (Required for `match` case syntax and advanced typing)
*   **Node.js**: 20+ (Required for Next.js 16 App Router)
*   **System**: 8GB RAM minimum, 16GB recommended for full India-scale rendering.

### Comprehensive Setup Guide

#### 1. Repository Setup
```bash
git clone https://github.com/PranayJuneja/UIDAI-Hackathon.git
cd UIDAI-Hackathon
```

#### 2. Backend Environment (The Brain)
```bash
# Create formatted virtual environment
python -m venv venv

# Activate environment (Windows)
.\venv\Scripts\activate

# Install heavy dependencies (Torch, Polars, FastAPI)
pip install -r requirements.txt

# EXECUTE DATA PIPELINE
# Crucial: This generates the .parquet files needed for the API to run.
# Without this step, the API will fail to start.
python src/data_pipeline.py
```

#### 3. Frontend Environment (The Face)
```bash
cd frontend

# Install exact dependencies from package-lock.json
npm ci

# Install new dependencies if package.json has changed
npm install
```

#### 4. Environment Configuration
Create a `.env` file in the root directory:
```env
# AI Model Configuration
OPENROUTER_API_KEY=sk-or-v1-your-key-here
MODEL_NAME=google/gemini-2.0-flash-exp

# Security Configuration
ALLOWED_ORIGINS=http://localhost:3000
API_DEBUG_MODE=True
```

### Execution Strategy

**Terminal A (Backend Server)**
Runs the FastAPI server on port 8000.
```bash
python api_server.py
# Logs should indicate: "Uvicorn running on http://127.0.0.1:8000"
# Swager Docs: http://127.0.0.1:8000/docs
```

**Terminal B (Frontend Development)**
Runs the Next.js TurboPack server on port 3000.
```bash
cd frontend
npm run dev
# Dashboard: http://localhost:3000
```

---

## API Reference Points

The backend exposes a RESTful API compliant with OpenAPI 3.1 standards.

| Endpoint | Method | Response Type | Description |
|:---|:---|:---|:---|
| `/api/map` | `GET` | `GeoJSON` | Returns simplified India geometry enriched with aggregated Pulse Vector intensities for heatmap rendering. |
| `/api/states/{id}` | `GET` | `JSON` | Returns state metadata, aggregated signals, and a list of top-priority districts based on hotspot intensity. |
| `/api/predict/{pin}` | `GET` | `JSON` | Returns the 6-month forecast values, confidence intervals (90th percentile), and citations of the parallel PINs used for the prediction. |
| `/api/trends/{id}` | `GET` | `JSON` | Returns time-series history formatted for D3.js line charts. |
| `/ws/chat` | `WS` | `Stream` | Global chatbot websocket. accepts JSON: `{text: string, context: object}`. |
| `/ws/terminal-chat` | `WS` | `Stream` | Lightweight terminal-specific websocket. Optimized for lower latency and strictly scoped to the current view (State/District). |

---

## License

This project is open-sourced under the **MIT License**. See [LICENSE](./LICENSE) for full legal text.

**Disclaimer**: This is a prototype developed for **UIDAI Hackathon 2026**. All data vizualized is synthetic, anonymized, or aggregated to ensure zero privacy risk. Use of the "Aadhaar" trademark is purely for demonstrative context within the hackathon track.
