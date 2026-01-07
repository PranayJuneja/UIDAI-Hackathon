# Cognexis: The Weather Forecast for Aadhaar 🧬

> **UIDAI Hackathon Submission - AI-Powered Demand Forecasting**

[![Submission](https://img.shields.io/badge/Read-Submission_Document-blue?style=for-the-badge&logo=markdown)](Submission.md)
[![Devin Wiki](https://img.shields.io/badge/Devin-Wiki-blue?style=for-the-badge)](https://app.devin.ai/wiki/PranayJuneja/UIDAI-Hackathon)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Polars](https://img.shields.io/badge/Polars-Fast_Data-orange)
![Amazon Chronos](https://img.shields.io/badge/AI-Amazon_Chronos_T5-purple)
![TissueDeck](https://img.shields.io/badge/UI-TissueDeck_Design-teal)

**Cognexis** (formerly Chronos-X) transforms UIDAI operations from **Reactive** to **Proactive**.
Instead of waiting for queues to form, our AI predicts **Migration**, **Settlement**, and **Labor Trends** 1-3 months in advance.

> *"India is too big for a single timeline. We built a system that finds parallel timelines to predict the future."*

---

## 🦾 The AI Brain (New in v1.8)

Chronos-X isn't just a forecasting model; it's a **Conversational Intelligence**.

### The "4-Step Thinking Process"
When you ask *"What is the migration outlook for North Delhi vs Bangalore?"*, the system executes a complex cognitive pipeline:

1.  **🧠 Intent Parsing (NLU)**:
    *   Detects **Intent**: `Comparison`
    *   Extracts **Primary Location**: `North Delhi` -> Maps to `Delhi` (PIN 110xxx)
    *   Extracts **Secondary Location**: `Bangalore` -> Maps to `Bangalore` (PIN 560xxx)
    *   Extracts **Horizon**: `Default (1 month)`

2.  **📍 Hyper-Resolution**:
    *   Uses **Fuzzy Matching** to fix typos ("Banglaore" -> "Bangalore").
    *   Resolves **Abbreviations** ("Blr", "Del", "UP", "TN").
    *   Filters through **74,000+ data rows** to find the most representative Pulse Vectors.

3.  **⏳ Dual-Context Loading**:
    *   Spins up *two separate* prediction instances.
    *   Fetches **Spatial Parallels** for *both* locations simultaneously.
    *   Injects **Cross-State Learning** (e.g., finding that Delhi's pattern matches a district in UP).

4.  **🗣️ Authoritative Attestation**:
    *   Synthesizes all 6 data points (Growth/Flow/Labor for City A & City B).
    *   Generates a **Comparative Strategic Analysis** for UIDAI officials.

All of this happens in **< 3 seconds**.

---

## 🏆 Hackathon Submission
This repository contains the complete source code and documentation for our solution.

👉 **[Read the Full Submission Document (Submission.md)](Submission.md)** for:
1.  **Problem Statement:** Moving from "Firefighting" to "Weather Forecasting".
2.  **Methodology:** How we use **Pulse Vectors** and **Spatial Parallel Search**.
3.  **Datasets:** Fusion of Enrolment, Demographic, and Biometric data.
4.  **Winning Criteria:** Detailed alignment with the judging parameters.

---

## 💡 The Core Innovation

### 1. The "Pulse Vector" ($V_{p,t}$)
We don't just count transactions. We fuse three signals into a 3D "DNA" for every PIN code:
*   **Growth Signal (0-5 Enrolments):** Families settling down.
*   **Flow Signal (Demographic Updates):** Migration and urbanization.
*   **Labor Signal (Biometric Updates):** Manual labor intensity.

### 2. The "Time Machine" (Spatial Parallel Search)
*   **Insight:** India is vast. What happens in a developing suburb of **Pune** today often *already happened* in a similar suburb of **Bangalore** last month.
*   **Engine:** Our AI finds these "Parallel Universes" across states to predict the future trajectory of a region even with limited historical data.

### 3. Foundation Model Forecasting
We utilize **Amazon Chronos T5**, a Zero-Shot time-series foundation model, to generate accurate forecasts even on short (2-3 month) data horizons where traditional models fail.

---

## 🎨 Frontend Dashboard (New in v2.1)

Premium UI built with **Next.js 16**, Google Fonts, and Framer Motion.

### Quick Start
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

### Technology Stack
| Technology | Purpose |
|:-----------|:--------|
| Next.js 16 | React framework with App Router |
| TypeScript | Type safety |
| Framer Motion | Smooth animations |
| Google Fonts | Outfit (headings), Inter (body) |
| Zustand | State management |
| D3-geo | Map projections |

### Design System
- **Theme**: Premium off-white light (`#FAFBFC`) with dark accents
- **Typography**: Outfit 800 for display, Inter for body
- **Colors**: Signal-specific palettes (Growth/Flow/Labor)
- **Maps**: Interactive Drill-Down (India -> State -> District)
- **Philosophy**: "Data-Forward" - Minimal chrome, maximum insight.

### Key Features
1.  **TissueDeck Visuals**: Ambient aurora backgrounds, glassmorphic containers, and precision grids.
2.  **Smart Drill-Down**: Click-to-zoom for all 36 states/UTs with auto-scaling.
3.  **Context Sidebar**: Sidebar updates dynamically to show National vs State vs District insights.
4.  **Deep Polish**: distraction-free UI with no artifacts or decorative noise.


---

## 🌐 API Server (New in v2.0)

The Chronos-X API powers the dashboard with **real-time data aggregation**.

### Quick Start
```bash
python api_server.py
# Server starts at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### REST Endpoints
| Endpoint | Description |
|:---------|:------------|
| `GET /api/health` | Server health + loaded data stats |
| `GET /api/timeline` | Available months for timeline slider |
| `GET /api/states` | All 36 states with hotspot intensities |
| `GET /api/states/{id}` | State details + district breakdown |
| `GET /api/pins/{code}` | PIN-level data + AI forecasts |
| `GET /api/search?q=` | Fuzzy search (states, districts, PINs) |
| `GET /api/map?month=` | Complete map data for rendering |
| `WS /ws/chat` | Real-time AI chatbot (WebSocket) |

---

## 📂 Directory Structure

```plaintext
chronos-x/
├── Submission.md               # 📄 MASTER SUBMISSION DOCUMENT
├── README.md                   # Project Overview
├── api_server.py               # 🌐 FastAPI Backend Server
│
├── frontend/                   # 🎨 Next.js Dashboard (NEW)
│   ├── app/
│   │   ├── globals.css         # Design system (300+ lines)
│   │   ├── page.tsx            # Landing page with animations
│   │   └── layout.tsx          # Root layout
│   └── package.json
│
├── data/                       # Dataset Storage
│   ├── api_data_aadhar_*       # Raw CSV inputs
│   └── output/                 # Generated artifacts (pulse_vectors.parquet)
│
├── src/                        # Core Application Code
│   ├── data_pipeline.py        # ETL: Load -> Fuse -> Normalize -> Export
│   ├── ai_forecaster.py        # AI Engine: Chronos Model + Spatial Search
│   ├── chronos_engine.py       # Wrapper for Chronos
│   ├── context_engine.py       # Seasonal/Event Context
│   └── location_resolver.py    # Fuzzy Location Matching
│
├── scripts/                    # Analysis Tools
│   └── analyze_feasibility.py  # Data stats
│
├── chronos_chatbot.py          # 🤖 AI Chatbot Interface
├── chronos_cli.py              # Command Line Interface
└── requirements.txt            # Dependencies
```

---

## ⚡ Quick Start

### 1. Installation
```bash
pip install -r requirements.txt
```

### 2. Run the Data Pipeline
Fuse the raw UIDAI CSVs into the Master Pulse Table.
```bash
python src/data_pipeline.py
```

### 3. Ask the AI 🤖
Launch the interactive chatbot to query predictions in natural language.
```bash
python chronos_chatbot.py
```

**Try these "Power Queries":**
*   `"Compare Mumbai vs Bangalore"` (Dual-context comparison)
*   `"What should I do in UP next month?"` (State-level abbreviation + Recommendation)
*   `"Why is the labor signal high in 560001?"` (Deep-dive explanation)
*   `"Forecast for Blr"` (City abbreviation support)

#### Chatbot Commands
| Command | Description |
| :--- | :--- |
| `pin <code>` | Instant context switch (e.g., `pin 110001`) |
| `status` | View current engine state, loaded PIN, and context |
| `history` | View memory of last 10 conversation turns |
| `clear` | Wipe conversation memory |


### 4. Generate Forecasts
Run the hybrid forecasting engine.
```bash
python chronos_cli.py --pincode 110001
```

---

## 📊 Visualisation
Check out `chronos_colab.ipynb` for interactive charts and deep-dive analysis of the Pulse Vectors and Forecast confidence intervals.

---

> **Team Chronos-X** | UIDAI Hackathon 2026
