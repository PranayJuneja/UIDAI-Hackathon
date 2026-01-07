# Cognexis: Temporal Spatial Intelligence for Aadhaar

> **UIDAI Hackathon 2026 Submission**
>
> **Project Code**: UIDAI-HACK-2026-CHRONOS
> **Version**: 2.6.0 (The Liquid Glass Release)

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Executive Summary

**Cognexis** (formerly Chronos-X) acts as the central nervous system for UIDAI's demand forecasting operations. It represents a paradigm shift from **Reactive Logistics**—responding to queues after they form—to **Proactive Anticipation**—provisioning resources 1-3 months before demand surges.

By synthesizing disparate data signals (Biometric updates, Demographic changes, and New Enrolments) into a unified **Pulse Vector**, Cognexis creates a high-fidelity digital twin of India's socio-economic movement. It utilizes **Amazon Chronos**, a foundation model for time-series forecasting, coupled with a novel **Spatial Parallel Search** algorithm to predict migration trends, labor movements, and settlement patterns with unprecedented accuracy, even in data-sparse environments.

This platform provides UIDAI officials with a "Weather Forecast" for Aadhaar services, enabling data-driven decisions for center allocation, manpower planning, and dynamic resource distribution.

---

## System Architecture

The Cognexis platform is architected as a decoupled, event-driven system comprising a high-performance Python inference engine and a hardware-accelerated React frontend.

### 1. The Inference Engine (Backend)
Built on **FastAPI**, the backend serves as the orchestration layer for three critical sub-systems:
*   **Data Ingestion Pipeline**: A Polars-based ETL engine that fuses raw CSV dumps into optimized Parquet artifacts.
*   **Chronos-X Forecasting Core**: A hybrid prediction engine combining large-scale primitive foundation models with spatial behavioral cloning.
*   **Contextual Attestation Layer**: An LLM-driven reasoning module that explains *why* a prediction was made, citing local events (e.g., Harvest Season, School Admissions).

### 2. The Experience Layer (Frontend)
Built on **Next.js 16**, the frontend is a strictly typed, component-driven application designed for high-density data visualization.
*   **Visual Engine**: A memoized D3-geo projection system capable of rendering 500+ district paths at 60fps.
*   **State Management**: A global Zustand store managing temporal states, geographical selection, and cross-component signaling.
*   **Design System**: "TissueDeck"—a proprietary design language utilizing glassmorphism, physics-based particle dynamics, and chromatic aberration to visualize data depth.

---

## Theoretical Framework: The Pulse Vector

At the heart of Cognexis lies the **Pulse Vector ($V_p$)**, a normalized 3-dimensional tensor representing the socio-economic heartbeat of a specific PIN code at time $t$.

$$ V_{p,t} = \langle G_{p,t}, F_{p,t}, L_{p,t} \rangle $$

Where:
*   **$G$ (Growth Signal)**: Normalized velocity of child enrolments (0-5 years). Indicates residential settlement and family unit formation.
    *   *Source*: New Enrolment Dataset
*   **$F$ (Flow Signal)**: Rate of demographic updates (Address changes). Proxy for urban migration and housing shifts.
    *   *Source*: Demographic Update Dataset
*   **$L$ (Labor Signal)**: Intensity of biometric updates. Correlates with manual labor workforce movement and aging populations.
    *   *Source*: Biometric Update Dataset

### Normalization Logic
Raw transaction counts are meaningless across disparate geographies (e.g., comparing Mumbai to a rural village). We apply Z-Score Normalization relative to the state's baseline to extract the *intensity* of the signal.

$$ Signal_{norm} = \frac{x - \mu_{state}}{\sigma_{state}} $$

This allows the AI to learn universal behavioral patterns (e.g., "Pre-Harvest Migration") independent of absolute population scale.

---

## Algorithmic Innovation: Spatial Parallel Search

Traditional time-series models (ARIMA, LSTM) fail when historical data is limited (e.g., < 6 months). Cognexis overcomes this with **Spatial Parallel Search**, a technique inspired by behavioral cloning.

**The Hypothesis**: India is vast. The future trajectory of a developing suburb in one state often mirrors the *past* trajectory of a clearer, more mature suburb in another state.

**The Algorithm**:
1.  **Vector Embedding**: Encode the last $k$ months of Pulse Vectors for the target PIN $P_{target}$.
2.  **Cosine Similarity Scan**: Search the entire national database (19,000+ PINs) for "Parallel Universes"—PINs ($P_{parallel}$) in *different* states that exhibited an identical behavioral signature $n$ months ago.
    $$ Similarity(A, B) = \frac{A \cdot B}{\|A\| \|B\|} $$
3.  **Future Projection**: If regions $P_{target}$ and $P_{parallel}$ shared the same past, we infer that $P_{target}$'s future will statistically resemble $P_{parallel}$'s present.
4.  **Ensemble Weighting**: These spatial projections are fused with Amazon Chronos (T5-Base) zero-shot forecasts using a confidence-weighted average.

---

## Technical Specifications

### Frontend Application
The frontend is engineered for performance and visual fidelity, handling complex vector mapping without blocking the main thread.

**Core Stack**:
*   **Framework**: Next.js 16.1.1 (App Router)
*   **Language**: TypeScript 5.0 (Strict Mode)
*   **Rendering**: React 19 (Server Components + Client Islands)
*   **Styling**: CSS Modules with "TissueDeck" Design Tokens
*   **Motion**: Framer Motion (Spring Physics)

**Key Modules**:
*   **`MapVisuals`**: A `React.memo` optimized component separating D3 calculations from rendering updates. Ensures hover interactions (0ms latency) do not trigger map reprojections.
*   **`Chatbot.tsx`**: A WebSocket client implementing a robust "Heartbeat" protocol tailored for unstable network conditions. Features a custom "Liquid Glass" UI implementation.
*   **`Timeline.tsx`**: A continuous interaction slider syncing global app state (`mapStore`) with temporal data slices, utilizing debounced dispatchers for smooth playback.

### Backend Services
The backend is a high-throughput synchronous/asynchronous hybrid server.

**Core Stack**:
*   **Server**: FastAPI (Uvicorn Worker Class)
*   **Language**: Python 3.10+
*   **Data Processing**: Polars (Rust-backed DataFrame engine)
*   **AI Orchestration**: LangChain + Amazon Chronos

**Key Modules**:
*   **`api_server.py`**: Entry point defining REST contracts and WebSocket lifecycle management.
*   **`chronos_engine.py`**: Encapsulates model inference logic, caching mechanisms, and HuggingFace transformer pipelines.
*   **`attestation.py`**: The "Reasoning Layer". Parses natural language intent, injects statistical context, and acts as a gateway to Large Language Models (LLM) via Vercel AI Gateway.
*   **`location_resolver.py`**: A deterministic fuzzy-logic engine capable of resolving 75,000+ non-standard location strings (e.g., "Banglaore", "Del") to canonical PIN codes.

---

## Installation & Deployment

### Prerequisites
*   **Python**: 3.10 or higher
*   **Node.js**: 20.x or higher
*   **Memory**: 8GB RAM minimum (16GB recommended for full India map rendering)
*   **GPU**: Optional (Required only for batch training/inference with Amazon Chronos)

### 1. Clone & Initialize
```bash
git clone https://github.com/PranayJuneja/UIDAI-Hackathon.git
cd UIDAI-Hackathon
```

### 2. Backend Setup
Create a virtual environment and install dependencies.
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Data Pipeline Execution
Transform raw CSVs into the Pulse Vector Parquet store.
```bash
python src/data_pipeline.py
# Output: data/output/pulse_vectors.parquet (approx. 50MB)
```

### 4. Frontend Setup
Navigate to the frontend directory and install dependencies.
```bash
cd frontend
npm install
```

### 5. Running the Application
**Terminal 1 (Backend)**:
```bash
python api_server.py
# Server listening on http://localhost:8000
```

**Terminal 2 (Frontend)**:
```bash
cd frontend
npm run dev
# Application live at http://localhost:3000
```

---

## API Documentation

The API adheres to OpenAPI 3.0 standards. Full Swagger documentation is available at `http://localhost:8000/docs` when the server is running.

### Core Endpoints

#### `GET /api/map`
Retrieves the complete GeoJSON data fused with current Pulse Vector intensities for map rendering.
*   **Parameters**: `month` (YYYY-MM), `signal` (growth|flow|labor)
*   **Response**: Compressed GeoJSON `FeatureCollection`.

#### `GET /api/states/{id}`
Fetches drill-down data for a specific state, including district-level aggregation.
*   **Parameters**: `id` (State Code, e.g., 'MH', 'UP')
*   **Response**: JSON object containing normalized growth metrics for all districts in the state.

#### `GET /api/predict/{pincode}`
Triggers the inference engine for a specific locale.
*   **Parameters**: `horizon` (1-6 months)
*   **Response**:
    ```json
    {
      "forecast": { "growth": 0.85, "flow": 1.2, "labor": -0.3 },
      "attestation": "High inbound migration predicted due to post-harvest labor shift...",
      "parallels": [ "560034", "110001" ]
    }
    ```

#### `WS /ws/chat`
Bi-directional WebSocket for the Chronos Copilot.
*   **Protocol**: JSON-RPC style messages.
    *   **Inbound**: `{ "query": "Analysis for Mumbai", "context": {...} }`
    *   **Outbound**: `{ "type": "token", "content": "..." }` | `{ "type": "action", "payload": "ZOOM_MAP" }`

---

## Contributing

We welcome contributions from the open-source community, particularly in the areas of:
1.  **Model Fine-tuning**: Improving Amazon Chronos weights with regional Indian datasets.
2.  **Visualization Optimizations**: Enhancing WebGL performance for low-end devices.
3.  **Localization**: Adding vernacular support to the Attestation engine.

**Pull Request Workflow**:
1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes following the [Conventional Commits](https://www.conventionalcommits.org/) specification.
4.  Push to the branch.
5.  Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

> **Disclaimer**: This is a prototype developed for the UIDAI Hackathon 2026. All data used is synthetic or anonymized for demonstration purposes.
