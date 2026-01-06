# Changelog

All notable changes to the **Chronos-X** project (The "Time Machine" for Aadhaar) will be documented in this file.

## [1.9.0] - 2026-01-06 - 🌍 THE CONTEXTUAL INTELLIGENCE UPDATE

### 🔥 Headline Features

#### 1. Context Engine (`src/context_engine.py`)
> *Context is King.*
- **Deterministic Seasonality**: Implemented "Based Logic" regarding Indian socio-economic cycles:
  - **School Admissions (Mar-Jun)**: Predicts "Growth" signal spikes (0-5y enrolments) as schools mandate Aadhaar.
  - **Kharif Harvest (Oct-Nov)**: Predicts "Labor" & "Flow" movement in agri-hubs (Punjab, Haryana) vs source states (Bihar, UP).
  - **Rabi Harvest (Mar-Apr)**: Secondary migration wave logic.
- **Mock Live Search**: Stability-focused simulation of "Real-Time News" injection for demo purposes (e.g., detecting "Paddy Arrival" or "Chhath Puja" rush).

#### 2. Causal Reasoning Layer (`src/attestation.py`)
- **Context Injection**: The `Attestor` now consumes "Contextual Drivers" (Seasonality + Local Events) alongside raw data.
- **Why-Based Explanations**: The AI doesn't just read numbers; it links them to reality (e.g., "High Labor signal *because* of Kharif Harvest season").

---

## [1.8.0] - 2026-01-06 - 🧠 THE RESILIENCE & INTELLIGENCE UPDATE

### 🔥 Headline Features

#### 1. Hyper-Robust Location Resolver (`src/location_resolver.py`)
> *If you can name it, we can find it.*
- **Fuzzy Logic Engine**: Implemented `SequenceMatcher` based fuzzy matching to handle typos like "Banglaore" or "Delli" with 75% confidence threshold.
- **Smart Abbreviations**: Native support for Indian shorthand:
  - **Cities**: `Blr` (Bangalore), `Del` (Delhi), `Mum` (Mumbai), `Hyd` (Hyderabad), `Ggn` (Gurgaon), etc.
  - **States**: `UP`, `MP`, `TN`, `MH`, `KA`, `WB`, `AP`, `TS`, etc.
- **Compound Location Filtering**: Intelligent parsing of directional queries like "North Delhi", "Greater Mumbai", or "South Bangalore" mapping them to their core administrative zones.
- **District-Level Granularity**: Dynamically maps district names (e.g., "Gorakhpur") to valid PIN codes using the demographic dataset.

#### 2. Intent-Aware Query Parser (`src/attestation.py`)
> *Reading minds, not just keywords.*
- **Contextual NLU**: The AI now distinguishes between:
  - **Forecast**: "What will happen in Delhi?"
  - **Comparison**: "Compare Mumbai vs Bangalore" (Triggers dual-context loading)
  - **Recommendation**: "What should I do?"
  - **Explanation**: "Why is this happening?"
- **Local Fallback Circuit**: If the AI API fails or returns invalid JSON, a robust Regex-based local parser kicks in instantly to ensure 100% uptime for basic queries.

#### 3. Self-Healing Chatbot Architecture (`chronos_chatbot.py`)
- **Dynamic Context Switching**: Automatically detects when a user switches context (e.g., from "Delhi" to "Mumbai") and reloads the entire prediction engine state in milliseconds.
- **Session Memory**: Maintains a sliding window of the last 10 turns for natural multi-turn conversations.
- **Input Sanitization**: Enterprise-grade sanitization striping control characters and normalizing Unicode to prevent injection attacks.

### Changed
- **`attestation.py`**: Massive prompt engineering update to "Chronos-X System Prompt" to enforce data-driven 3-signal analysis (Growth, Flow, Labor).
- **`chronos_chatbot.py`**: Added "Thinking..." animation for better UX during AI inference.

---

## [1.7.0] - 2026-01-05 - 🧬 ARCHITECTURE FIX & QUERY PARSING

### Fixed
- **Critical Chatbot Architecture Issue**: Fixed a bug where the chatbot wasn't loading fresh context when users switched to a new PIN code. Now the architecture properly:
  1. Parses query → Extracts structured JSON `{location, horizon, intent}`
  2. Loads **FRESH** context for the extracted PIN
  3. Generates AI response with the **CORRECT** data

- **Query Parser Improvements** (`src/attestation.py`):
  - Added **greeting filter**: Ignores informal greetings like "oi", "hi", "hey", "yo", "namaste", "bro", etc.
  - **PIN code priority**: 6-digit numbers are now extracted with highest priority
  - **Specific month support**: Handles "jan 2028", "feb 2025" format queries
  - **Regex fallback**: If AI parser misses a PIN, regex scans for `\d{6}` patterns as backup

### Changed
- **`chronos_chatbot.py`**: Complete rewrite of `process_query()` with 4-step architecture:
  - Step 1: Parse query via AI → Structured JSON
  - Step 2: Resolve location to PIN (with fallback methods)
  - Step 3: Load fresh context for the target PIN
  - Step 4: Generate AI response with correct data
- **Enriched context**: Horizon and intent from parsed query are now passed to the AI for smarter responses

---

## [1.6.0] - 2026-01-05 - 🤖 INTERACTIVE AI CHATBOT RELEASE

### Added
- **Interactive AI Chatbot (`chronos_chatbot.py`)**:
  - Full-fledged conversational AI interface for UIDAI regional predictions.
  - Natural language query understanding ("What to do in Delhi after 6 months?").
  - Location resolution: Automatically converts city/state names to PIN codes.
  - Multi-turn conversation support with context memory.
  - Colorful REPL interface with helpful examples.
  - Usage: `python chronos_chatbot.py` or `python chronos_cli.py --interactive`

- **Enhanced Attestation Module (`src/attestation.py`)**:
  - **`chat()` method**: Full conversational AI with data context injection.
  - **`parse_query()` method**: NLU for extracting location, time horizon, and intent from queries.
  - **Refined System Prompt**: Based on README's "Weather Forecast for Aadhaar" concept.
  - **Increased Token Limit**: 8192 tokens (up from 2000) for reasoning-heavy responses.

- **Location Resolver (`src/location_resolver.py`)**:
  - Maps city names to PIN codes (e.g., "Delhi" → 110xxx PINs).
  - State-level PIN prefix mappings for all Indian states/UTs.
  - Dynamic resolution using `pulse_vectors.parquet` for actual PIN codes.

- **CLI Updates (`chronos_cli.py`)**:
  - New `--interactive` / `-i` flag to launch chatbot mode.
  - Pincode is now optional when using interactive mode.

### Changed
- **`local.env`**: Added `AI_MAX_TOKENS=8192` and `AI_TEMPERATURE=0.4` configuration.
- **README.md**: Updated usage section with chatbot documentation.

---

## [1.5.0] - 2026-01-05 - 🖥️ CLI & ATTESTATION RELEASE

### Added
- **Chronos-X CLI (`chronos_cli.py`)**:
  - Unified command-line interface for "Time Machine" lookups.
  - Usage: `python chronos_cli.py --pincode <PIN>`
  - Visual output with ANSI colors (Windows-compatible).
  - Displays:
    - **Prediction**: Growth, Migration, Labor trends.
    - **Parallel Matches**: Top 3 similar PINs across India with similarity %.
    - **AI Forecast**: Next-month trends from Amazon Chronos.
    - **Attestation**: Generative AI explanation of *why* the prediction was made.

- **Attestation Module (`src/attestation.py`)**:
  - LLM integration using Vercel AI Gateway (OpenAI-compatible).
  - Generates human-readable, authoritative explanations for UIDAI officials.
  - Context-aware prompting: Feeds current stats, parallels, and forecasts to the LLM.
  - **Robust Error Handling**: Added connection checks and graceful degradation.

- **Chronos Engine (`src/chronos_engine.py`)**:
  - `ChronosX` class: The "Brain" that orchestrates data fetching, AI prediction, and attestation context.
  - **On-Demand Hybrid Mode**: If cache is missing, automatically generates predictions using the Hybrid (AI + Spatial) engine.
  - Exposed `current` stats (Growth/Flow/Labor) for Attestation context.

### Fixed
- **Windows Encoding**: Resolved Unicode errors in CLI output (`═` -> `=`).
- **Env Config**: Fixed `local.env` parsing to strip inline comments which were breaking API keys/URLs.
- **LLM Reasoning**: Increased `max_tokens` to 2000 to prevent truncated explanations.

## [1.1.0] - 2026-01-05 - ☁️ CLOUD COMPATIBILITY UPDATE

### Fixed
- **Google Colab Compatibility**: 
  - Fixed `chronos-forecasting` package installation to use the official Amazon Science GitHub repository instead of PyPI (resolving API mismatch).
  - Patched `chronos_colab.ipynb` to use correct `predict()` method signature (positional arguments) and NumPy-based quantile calculation, aligning it with the local `src/ai_forecaster.py`.
  - Added robust error logging in the notebook to expose silent failures during batch prediction.
- **Empty Output Issue**: Resolved the issue where `predictions.parquet` was generated as an empty file (135 bytes) due to swallowed exceptions.

## [1.0.0] - 2026-01-05 - 🚀 THE CHRONOS-X LAUNCH

**"Predicting the Future of Digital Identity"**

This release marks the official v1.0 foundation of Chronos-X, a revolutionary system designed to forecast Aadhaar ecosystem dynamics using limited data. By combining **Foundation AI Models** with **Spatial Parallel Search**, we have created a system that can see into the future even without historical depth.

### 🔥 Headline Features

#### 1. The "Pulse Vector" Engine (`src/data_pipeline.py`)
> *Turning Raw Data into Digital Heartbeats*
- **Hyperscale Fusion**: Built a Polars-based pipeline capable of crushing **74,000+ rows** of biometric, demographic, and enrolment data in seconds.
- **Signal Normalization**: Invented the "Pulse Vector" ($V_p$) - a standardized 3D signal (`growth`, `flow`, `labor`) that represents the socio-economic heartbeat of every PIN code in India.
- **Data Quality Logic**: Smart state-name normalization reducing **50+ variations** (typos, legacy names) into **36 official states/UTs**.

#### 2. "Parallel-Future" AI Forecaster (`src/ai_forecaster.py`)
> *If we can't look back, we look sideways.*
- **Zero-Shot Foundation Model**: Integrated **Amazon Chronos (T5-Base)**, a massive 800MB transformer pre-trained on millions of time series. It predicts the future with **zero fine-tuning**, working magic on our limited 2-month dataset.
- **Spatial Parallel Search**: A "Behavioral Cloning" engine that finds PIN codes in *different states* that behave exactly like your target PIN. It uses their futures to predict yours.
- **Hybrid Ensemble Logic**: A smart weighting system that blends **AI Confidence** with **Spatial Reality** to generate the most robust predictions possible.

#### 3. Production-Ready Batch Predictor (`scripts/batch_predict.py`)
> *19,000 PINs. One Click.*
- **Full-Scale Inference**: Automated script generated forecasts for **every single PIN code in India** (19,079 total).
- **6-Month Horizon**: Generates detailed JSON-serialized forecasts for Growth, Migration, and Labor trends up to **June 2026**.
- **Cloud-Native**: Designed to run on **Google Colab T4 GPUs**, slashing processing time from 17 hours (CPU) to <1 hour (Cloud GPU).

### 🛠 Technical Architecture
- **Core**: Python 3.10+, Polars (Rust-backed speed), NumPy
- **AI**: PyTorch 2.0+, HuggingFace Transformers, Amazon Chronos
- **Infrastructure**: Parquet-native storage for 100x faster I/O than CSV.

---

## [0.2.0] - 2026-01-05

### Added

#### AI Forecasting Module (`src/ai_forecaster.py`)
- **`AIForecaster` class** - Zero-shot time-series forecasting using:
  - **Amazon Chronos T5**: Foundation model pre-trained on millions of time series.
  - **Small Data Capability**: Generates forecasts with as few as 2 data points (critical for our Nov-Dec dataset).
  - **Probabilistic Forecasts**: Returns median predictions with 10% and 90% confidence intervals.

- **`find_spatial_parallels()`** - Cross-region pattern matching engine:
  - Finds "Parallel Universes" (PINs in other states with similar November patterns).
  - Uses Cosine Similarity to identify structural matches.
  - Excludes same-state PINs to force cross-regional learning.

- **`HybridPredictor`** - Ensemble logic:
  - Combines **AI Forecast** (Chronos) + **Spatial Parallels** (Behavioral Cloning).
  - Configurable weighting (default 50/50).
  - Weighted averaging based on similarity scores.

- **`requirements.txt`** - Project dependencies:
  - `polars>=0.20.0` - Fast DataFrame processing
  - `numpy>=1.24.0` - Numerical operations
  - `chronos-forecasting>=1.0.0` - Amazon Chronos foundation model
  - `torch>=2.0.0` - PyTorch for ML inference
  - `ollama>=0.1.0` - Local LLM for attestation

- **Batch Prediction Script (`scripts/batch_predict.py`)**:
  - Automates 6-month forecasting for all 19,000+ PIN codes.
  - Generates `predictions.parquet` with strictly structured output.
  - Uses **Hybrid Ensemble** (AI + Spatial Parallels) for next-month prediction.
  - Includes confidence scores and top-3 parallel state matches.

### Fixed
- **Column Name Mismatch** - Updated `ai_forecaster.py` to use correct column names (`growth_norm`, `flow_norm`, `labor_norm`) matching `pulse_vectors.parquet` schema.
- **Date Type Mismatch** - Added `_parse_date()` helper to convert string dates to proper `date` objects for Polars filtering.

### Changed
- **Codebase Organization** - Major refactor for cleanliness:
  - `src/` - Core application code (`data_pipeline.py`, `ai_forecaster.py`).
  - `data/` - All input data (`api_data_*`) and outputs (`data/output/`).
  - `scripts/` - Utility and analysis scripts (`analyze_*.py`, `scan_metadata.py`).
  - `docs/` - Documentation, plans, and logs.
- **Path Updates** - All scripts updated to reference the new `data/` directory structure.

### Tested
- **AI Forecaster** - Successfully ran with real data from `pulse_vectors.parquet`:
  - Model: Amazon Chronos T5-Base (806MB)
  - Sample: PIN 638055 (Tamil Nadu)
  - Prediction method: Spatial parallels (cross-state matching)

## [0.1.0] - 2026-01-05

### Added

#### Data Pipeline (`src/data_pipeline.py`)
- **`load_and_fuse_data()`** - Main pipeline function that:
  - Loads all 3 CSV types (biometric, demographic, enrolment)
  - Normalizes dates to first-of-month using Polars
  - Aggregates data by (Pincode, Month)
  - Performs inner join to create `Master_Pulse_Table`
  - Computes normalized Pulse Vectors (Growth, Flow, Labor)
  - Exports to `data/output/pulse_vectors.parquet`

- **`normalize_state_names()`** - State name normalization function that handles:
  - Case variations (`ODISHA` → `Odisha`)
  - `&` vs `and` variations (`Jammu & Kashmir` → `Jammu and Kashmir`)
  - Old names (`Orissa` → `Odisha`, `Pondicherry` → `Puducherry`)
  - Typos (`West Bangal` → `West Bengal`)
  - Merged UTs (`Daman & Diu` + `Dadra & Nagar Haveli` → combined UT)

- **`STATE_NORMALIZATION_MAP`** - Comprehensive mapping of 50+ state name variations to 36 official state/UT names

- **Helper functions:**
  - `load_dataset()` - Load and concatenate CSVs by type
  - `parse_and_normalize_date()` - Parse DD-MM-YYYY and truncate to month-start
  - `aggregate_by_pincode_month()` - Group by (pincode, month) with sum aggregation
  - `fuse_datasets()` - Inner join all 3 datasets
  - `compute_pulse_vector()` - Z-score normalization for pulse signals
  - `export_to_parquet()` - Save to Parquet format

#### Analysis Scripts
- **`analyze_parquet.py`** - Script to analyze `pulse_vectors.parquet` statistics

#### Output
- **`data/output/pulse_vectors.parquet`** - Fused dataset with:
  - 74,829 rows
  - 19,339 unique pincodes
  - 36 states/UTs (normalized)
  - 4 months of data (Sept 2025 - Dec 2025)
  - Columns: `pincode`, `month`, `state`, `enrol_signal`, `demo_signal`, `bio_signal`, `growth_norm`, `flow_norm`, `labor_norm`

### Fixed
- **Data Quality**: Reduced state name variations from 50 to 36 official names through normalization
