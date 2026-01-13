# Chronos-X Technical Codebase Analysis

**Version:** 3.1.0 (Live)
**Last Updated:** 2026-01-13
**Status:** Stable / Production-Ready

This document provides a comprehensive, engineering-level breakdown of the Chronos-X application architecture. It dissects the system into its core layers: Backend API, AI Intelligence, Data Pipeline, and Frontend UX. Each section details the specific scripts, classes, and logic flows that power the application.

---

## 1. Backend Architecture (`/` and `src/`)

The backend is built on **FastAPI** (`api_server.py`) with a highly modular "brain" located in the `src/` directory. It uses a **Hub-and-Spoke** architecture where the API Server acts as the hub, coordinating specialized modules for Forecasting, NLP, and Data retrieval.

### 1.1 Core Server Entry Point
#### `api_server.py`
**Type**: FastAPI Application
**Role**: Central Orchestrator & WebSocket Gateway
**Dependencies**: `fastapi`, `uvicorn`, `websockets`, `src.chronos_engine`

**Key Responsibilities**:
1.  **Lifecycle Management**:
    *   **Startup**: Initializes the `ChronosDataEngine` singleton. It uses a thread-safe locking mechanism (`threading.Lock`) to load the heavy `predictions_v2.parquet` file (approx. 20MB) into memory only once, preventing race conditions during concurrent worker startup.
    *   **Shutdown**: Gracefully closes all active WebSocket connections and clears forecast caches.

2.  **WebSocket Architecture**:
    *   `/ws/chat`: The primary channel for the **Global Chatbot (Chronos Assistant)**. It implements the new **Token Streaming Protocol** (v2.9.12), ensuring AI responses are yielded character-by-character for a "typewriter" effect.
        *   **Protocol**: `stream_start` → `stream` (payload: token) → `stream_end`.
    *   `/ws/terminal-chat`: **[NEW in v2.9.18]** A specialized, ultra-low-latency endpoint for the **Map Terminal**. It bypasses the LangChain Agent interactions (which add ~2s overhead) and directly invokes the `TerminalBot` for immediate, context-aware answers.
    *   `/ws/compare`: **[NEW in v3.1.0]** Dedicated stream for the **Comparison Dashboard**. It runs an asynchronous analysis of two locations and streams back a structured comparison report.

3.  **Data Aggregation Layer**:
    *   **Dynamic Aggregation**: The server does NOT store pre-computed state/district averages for every possible query. Instead, it aggregates them on-the-fly from PIN-code level data using optimized Polars queries.
    *   **Caching**: Implements a Time-To-Live (TTL) cache (5 minutes) for heavy aggregation queries (e.g., "Get all states trends") to reduce CPU load during high traffic.

4.  **Forecast Routing**:
    *   Smartly routes requests based on the requested date.
    *   **Historical (<= Dec 2025)**: Returns verified ground-truth data from `pulse_vectors.parquet`.
    *   **Forecast (> Dec 2025)**: Returns probabilistic projections from `predictions_v2.parquet`, flagging them with `is_forecast: true` so the frontend can render them with the specific "Amber/Hollow-Ring" styling.

### 1.2 Intelligence Modules (`src/`)

These modules contain the "business logic" of the AI.

#### `src/ai_forecaster.py`
**Type**: Core Forecasting Engine
**Role**: Mathematical Prediction Logic
**Key Classes**:

*   **`AIForecaster`**:
    *   **Wrapper for Amazon Chronos T5**: Encapsulates the HuggingFace `ChronosPipeline`.
    *   **`forecast_pin(history, horizon)`**: Performs zero-shot inference. It converts the input list of floats into a Torch tensor, passes it to the T5 model, and extracts quantiles (10th, 50th, 90th percentiles) to generate confidence bounds.
    *   **`forecast_pulse_vector(...)`**: A wrapper that calls `forecast_pin` three times—once for each signal (Growth, Flow, Labor)—to generate a complete Pulse Vector forecast.

*   **`HybridPredictor` (The "Secret Sauce")**:
    *   **Philosophy**: Pure time-series forecasting (Chronos) struggles with only 2 months of history. This class Augments it with "Spatial Parallel Search".
    *   **`find_spatial_parallels(target_pin, ...)`**: Uses **Cosine Similarity** to find "Twin Districts" in *other states*.
        *   *Logic*: "If Place A (Nov) looks like Place B (Nov), then Place A (Dec) will likely look like Place B (Dec)."
    *   **`predict(...)`**: The main execution method. It runs the Spatial Search and the AI Forecast in parallel, then combines them using a weighted ensemble (default: 50/50 split).

#### `src/terminal_bot.py`
**Type**: Lightweight AI Logic
**Role**: Chat engine for the Map Terminal
**Key Features**:
*   **Session Isolation**: Maintains a dictionary of `chat_histories` keyed by `session_id` (derived from District ID). This ensures that chatting about "Bangalore" doesn't bleed context into "Mumbai" when the user switches districts.
*   **Prompt Engineering**: Uses a "Senior Planning Officer" persona.
*   **Similarity Injection**: It receives the output of `get_similar_districts()` and injects it into the system prompt.
    *   *Prompt fragment*: `You are analyzing [District]. It is spatially similar to [Sister District] (87% match). Use this comparison to justify your recommendations.`

#### `src/langchain_bot.py`
**Type**: Advanced Reasoning Engine
**Role**: Chat engine for the main Assistant
**Key Classes**:
*   **`LangChainBot`**:
    *   **Agent Logic**: Uses `create_openai_functions_agent` to bind Python functions as Tools.
    *   **Tools**:
        *   `control_map(action, target)`: The bot "decides" to move the map. It returns a structured string that the frontend parses to trigger Redux actions (`flyTo`, `setCompare`).
        *   `get_aadhaar_stats(pincode)`: Fetches raw signal data to answer quantitative questions.
    *   **Streaming**: Implements `process_message_stream()` using `astream_events`. This complex iterator captures both "text tokens" (for the user) and "tool calls" (for the map) in a single async stream.

#### `src/data_pipeline.py`
**Type**: ETL (Extract, Transform, Load)
**Role**: Data Ingestion System
**Key Functions**:
*   **`normalize_state_names(df)`**: A critical cleaning function. It maps over 30 variations of state names (e.g., "Orissa", "pondicherry", "Daman and Diu") to their modern, official canonical names.
*   **`compute_pulse_vector(df)`**: Performs Z-Score Normalization.
    *   `Value_Norm = (Value - Mean) / StdDev`
    *   This ensures that "High Growth" (which might be 5k enrollments/month) and "High Flow" (which might be 500 updates/month) are comparable on the same 0-1 scale.
*   **`fuse_datasets(...)`**: Performs an SQL-like `INNER JOIN` on three massive CSVs using `(pincode, month)` as the composite primary key.

#### `src/location_resolver.py`
**Type**: Search & Resolution Engine
**Role**: Translating "text" to "place"
**Key Logic**:
*   **Initialization**: It loads the Master Pulse Table to build an in-memory "Place Index".
*   **`resolve(query)`**:
    1.  **Exact Match Checker**: Checks if input is a known District ID or State Key.
    2.  **Fuzzy Matcher**: Uses `difflib.get_close_matches` (Levenshtein distance) to handle typos (e.g., "Banaglore" -> "Bangalore").
    3.  **PIN Code Validator**: Checks if the input is a valid 6-digit integer present in the dataset.

---

## 2. Frontend Architecture (`frontend/app/`)

The frontend is a sophisticated **Next.js 13+** Single Page Application (SPA). It is heavily optimized for performance, utilizing **CSS Modules** for styling and **React Server Components** (RSC) where possible, falling back to Client Components for interactive dashboard elements.

### 2.1 The "Neon Cyberpunk" Design System
**Philosophy**: "Premium, Dark, Data-First."
**Implementation**:
*   **`globals.css`**: The source of truth. Defines CSS Variables for colors (`--brand-primary`: cyan, `--brand-secondary`: purple, `--signal-growth`: neon green).
*   **Dual-Theme Engine (v3.0.0)**:
    *   A `.light` class on the `<body>` tag inverts these variables to create a Light Mode.
    *   **Dashboard Exception**: The `.dashboard-container` explicitly overrides these light variables with `!important` calls to enforce Dark Mode, ensuring the map and terminal always look cool.

### 2.2 Dashboard Module (`app/dashboard.tsx`)
This is the main interactive route. It holds the global state for the visualization session.

#### `app/components/Map/IndiaMap.tsx`
**Role**: The Visualization Canvas
**Technology**: D3.js + TopoJSON
**Key Mechanics**:
*   **Vector Rendering**: Renders India's districts as SVG paths.
*   **Responsive Resize**: Listens to the window resize event AND the "Terminal Open" state.
    *   *Logic*: When `isTerminalOpen === true`, the map width transitions from `100%` to `60%`. D3 performs a recalculation of the projection scale and translation to "re-center" the map in the new, smaller viewport.
*   **Performance**: Uses `memo()` to prevent re-rendering the heavy SVG map when unrelated props (like Chatbot state) change. Only re-renders when `coloredData` (the signal values) updates.

#### `app/components/Map/TerminalInfoDisplay.tsx`
**Role**: The Data readout
**Design**: Skeuomorphic CRT Monitor
**Key Mechanics**:
*   **Animation Sequencer**:
    *   Stage 1: **Burst**. Instant rendering of header data.
    *   Stage 2: **Scan**. A CSS animation moves a "scanline" gradient down the screen.
    *   Stage 3: **Typewriter**. Uses a `setInterval` loop to append one character every 1ms to the `displayedText` state.
*   **Split-Mode**: Uses Conditional Rendering to switch layouts.
    *   `State Mode`: Shows broad stats and a "Drill Down" prompt.
    *   `District Mode`: Enables the Chat Input field and specialized "Action Recommendations".

#### `app/components/Timeline/Timeline.tsx`
**Role**: Time Travel Control
**Update (v2.10.0)**:
*   **Visual Logic**:
    *   Months `<=` 2025-12 are rendered as **Solid Blue Dots** (Historical).
    *   Months `>` 2025-12 are rendered as **Hollow Orange Rings** (Foreign/Predicted).
*   **Interaction**: Dragging the slider updates the `selectedMonth` in the global `MapStore`. This triggers a chain reaction:
    1.  `dashboard.tsx` detects the change.
    2.  It calls `useMapData` hook with the new month.
    3.  `api_server` receives the request.
    4.  If future month, `api_server` fetches from Forecast Parquet.
    5.  Data flows back → Map recolors → Signal cards update.

#### `app/components/Comparison/ComparisonPanel.tsx`
**Role**: Side-by-Side Analysis
**Key Logic**:
*   **AbortController**: Critical for performance. If the user rapidly switches Location 2 (e.g., clicking Bangalore then Mumbai then Delhi), previous pending API requests are cancelled using the `AbortSignal`. This prevents "Race Conditions" where the wrong data overwrites the display.
*   **Stream Reader**: implements a custom `readStream()` function that decodes the `TextDecoder` stream from the `/ws/compare` endpoint, accumulating the Markdown analysis in real-time.

---

## 3. Data Engineering Layer

The system relies on a robust offline processing pipeline to generate the intelligence that the online system serves.

### `chronos_colab_v2.ipynb`
**Role**: High-Performance Inference Environment
**Platform**: Google Colab Pro (T4/A100 GPU)
**Workflow**:
1.  **Setup**: Installs `chronos-forecasting` via pip.
2.  **IO**: Downloads the `pulse_vectors.parquet` (uploaded by user) to local Colab storage.
3.  **Batching Strategy**:
    *   Loading all 18,827 PINs into RAM is fine, but inference is VRAM heavy.
    *   It chunks the dataset into **Batches of 1024**.
    *   Forecasting 1 batch takes ~45 seconds on T4 GPU.
4.  **Save/Resume**: Implements "Checkpointing". Every 50 batches, it saves the intermediate results to disk. If the Colab runtime crashes (common with long jobs), it can resume from the last checkpoint.

---

## 4. Utility Scripting (`scripts/`)

### `scripts/scan_metadata.py`
**Purpose**: Pre-Flight Check.
**Logic**: Iterates through every CSV in the data folder. It parses the filename and the header row (without reading the full file) to extract:
*   Min/Max Dates
*   Pincode Coverage
*   Missing Columns
**Value**: Prevents "Garbage In, Garbage Out". It flagged the "Orissa vs Odisha" mismatch early in development.

### `scripts/verify_api_comprehensive.py`
**Purpose**: The "Green Light" script.
**Logic**: A python script that acts as a test client. It runs a sequence of 12 requests against `localhost:8000`:
1.  **Health Check**: `GET /health`
2.  **Date Validation**: `GET /api/states?month=invalid` (Expects 400)
3.  **Data Integrity**: `GET /api/states/KA` (Checks if Karnataka data exists)
4.  **Search Logic**: `GET /api/search?q=bangalore`
5.  **WebSocket Handshake**: Connects to `/ws/chat`, sends a ping, expects a pong.
**Usage**: Must pass 100% before any commit to `main`.
