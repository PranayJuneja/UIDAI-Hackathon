# Chronos-X: The Weather Forecast for Aadhaar 🌦️

> **UIDAI Hackathon Submission - AI-Powered Demand Forecasting**

[![Submission](https://img.shields.io/badge/Read-Submission_Document-blue?style=for-the-badge&logo=markdown)](Submission.md)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Polars](https://img.shields.io/badge/Polars-Fast_Data-orange)
![Amazon Chronos](https://img.shields.io/badge/AI-Amazon_Chronos_T5-purple)

**Chronos-X** transforms UIDAI operations from **Reactive** to **Proactive**.
Instead of waiting for queues to form, our AI predicts **Migration**, **Settlement**, and **Labor Trends** 1-3 months in advance.

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

## 📂 Directory Structure

```plaintext
chronos-x/
├── Submission.md               # 📄 MASTER SUBMISSION DOCUMENT
├── README.md                   # Project Overview
│
├── data/                       # Dataset Storage
│   ├── api_data_aadhar_*       # Raw CSV inputs
│   └── output/                 # Generated artifacts (pulse_vectors.parquet)
│
├── src/                        # Core Application Code
│   ├── data_pipeline.py        # ETL: Load -> Fuse -> Normalize -> Export
│   ├── ai_forecaster.py        # AI Engine: Chronos Model + Spatial Search
│   ├── chronos_engine.py       # wrapper for chronos
│   └── ...
│
├── scripts/                    # Analysis Tools
│   ├── analyze_feasibility.py  # Data stats
│   └── ...
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
# Example: "What is the migration outlook for Delhi?"
```

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
