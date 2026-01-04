# Chronos-X ("The Parallel-Future Engine")

> **AI-Powered Biometric, Demographic, and Enrolment Forecasting for UIDAI**

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Polars](https://img.shields.io/badge/Polars-Fast_Data-orange)
![Amazon Chronos](https://img.shields.io/badge/AI-Amazon_Chronos_T5-purple)
![License](https://img.shields.io/badge/License-MIT-green)

Chronos-X is an advanced predictive system designed for UIDAI to forecast enrolment trends and service demand at a hyper-local (PIN code) level. 

By fusing **Biometric update**, **Demographic change**, and **Enrolment** datasets into a unified "Pulse Vector", Chronos-X identifies **"Parallel Universes"**—regions with similar behavioral patterns—and uses **Foundation Time-Series Models (Amazon Chronos)** to predict future trends even with limited historical data.

---

## 🚀 Key Features

### 1. Unified Data Fusion ("Pulse Vectors")
Aggregates three disparate UIDAI datasets into a single, normalized signal vector for every PIN code:
- **Growth Signal:** Child enrolments (0-5 years) indicates new settlements.
- **Flow Signal:** Demographic updates (Address/DOB) indicates migration.
- **Labor Signal:** Biometric updates (18+) indicates manual labor intensity.

### 2. Zero-Shot AI Forecasting
Uses **Amazon Chronos T5**, a foundation model pre-trained on millions of time series, to generate accurate forecasts for PIN codes with as little as **2 months of data**. 
- **Probabilistic Predictions:** Provides confidence intervals (10th/90th percentile).
- **Small Data Robustness:** Does not require years of history to start working.

### 3. Spatial Parallel Search
Implements a "Parallel Universe" search engine that finds PIN codes in *different states* that share matching patterns.
- *Insight:* "What happened in a developing suburb of Bangalore today might happen in a similar suburb of Pune tomorrow."
- **Cross-Regional Learning:** Learns from the future trajectory of similar regions.

### 4. Hybrid Enforcement
Combines the statistical power of AI with the behavioral insights of spatial parallels for maximum accuracy.

---

## 📂 Directory Structure

```plaintext
chronos-x/
├── data/                       # Dataset Storage
│   ├── api_data_aadhar_*       # Raw CSV inputs (Bio, Demo, Enrol)
│   └── output/                 # Generated artifacts (Parquet files)
│
├── docs/                       # Documentation
│   ├── logs/                   # Analysis logs and metadata scans
│   └── implementation_plan.md  # Detailed technical roadmap
│
├── scripts/                    # Utility & Analysis Scripts
│   ├── analyze_*.py            # Data feasibility and statistical analysis
│   └── scan_metadata.py        # Metadata auditing tools
│
├── src/                        # Core Application Code
│   ├── data_pipeline.py        # ETL: Load -> Fuse -> Normalize -> Export
│   └── ai_forecaster.py        # Forecasting: AI Model + Spatial Search
│
└── CHANGELOG.md                # Version history
```

---

## 🛠️ Installation

### Prerequisites
- Python 3.10+
- 4GB+ RAM (for data processing)

### Dependencies
```bash
pip install polars numpy torch chronos-forecasting
```

---

## ⚡ Usage

### 1. Run the Data Pipeline
Fuse the raw CSVs into a master Pulse Vector table.
```bash
python src/data_pipeline.py
```
*Output:* `data/output/pulse_vectors.parquet` (~75k rows)

### 2. Run AI Forecasting
Generate forecasts for specific PIN codes or run value/accuracy validation.
```bash
python src/ai_forecaster.py
```
*Note: The script currently runs a demo prediction on a sample PIN code.*

### 3. Analyze Data Feasibility
Run the analysis script to inspect the generated data statistics.
```bash
python scripts/analyze_feasibility.py
```

---

## 🧩 How It Works

### The Pulse Vector ($V_{p,t}$)
For every PIN code $p$ at time $t$, we compute:
$$V_{p,t} = [G_{norm}, F_{norm}, L_{norm}]$$

Where components are Z-score normalized against the national average.

| Component | Metric | Meaning |
|:---|:---|:---|
| **Growth ($G$)** | Enrolment (0-5) | Families settling down |
| **Flow ($F$)** | Demo Updates | Migration / Urbanization |
| **Labor ($L$)** | Bio Updates | Manual work intensity |

### The "Time Machine" Logic
1. **Match:** Find PIN $q$ (e.g., in Maharashtra) that looked exactly like Target PIN $p$ (in Delhi) last month.
2. **Project:** Look at what happened to $q$ this month.
3. **Forecast:** Predict that $p$ will likely follow $q$'s trajectory.

---

## 📜 License
This project is licensed under the MIT License.

---

> **Status:** Prototype (v0.2.0)  
> **Author:** Chronos-X Team
