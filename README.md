# Chronos-X ("The Weather Forecast for Aadhaar")

> **AI-Powered Biometric, Demographic, and Enrolment Forecasting for UIDAI**

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Polars](https://img.shields.io/badge/Polars-Fast_Data-orange)
![Amazon Chronos](https://img.shields.io/badge/AI-Amazon_Chronos_T5-purple)
![License](https://img.shields.io/badge/License-MIT-green)

---

### **1. The Core Concept: "The Weather Forecast for Aadhaar"**

**What is it?**
Chronos-X is an AI engine that predicts **where people will need Aadhaar services next month**. 

Instead of looking at a static map of India, it treats every PIN code as a living, breathing organism with a "Pulse." It watches these pulses to forecast **Migration**, **New Settlements**, and **Labor Trends** before they happen.

### **2. How It Works (The "Secret Sauce")**

The system runs on two innovative pillars:

#### **A. The "Pulse Vector" ($V_{p,t}$)**
We don't just count "transactions." We fuse three isolated datasets into a single 3-dimensional "DNA" for every PIN code:
1.  **Growth Signal (Child Enrolment 0-5):** High signal = Young families are settling here. *Action: Needs more Tablet/Child enrolment staff.*
2.  **Flow Signal (Demographic Updates):** High signal = People are moving in/changing addresses. *Action: Needs Document Update Centers.*
3.  **Labor Signal (Biometric Updates 18+):** High signal = Manual laborers (fingerprints wearing out). *Action: Needs robust biometric scanners & camps.*

#### **B. The "Time Machine" Logic (Spatial Parallel Search)**
*   **The Problem:** We only have ~2 months of data continuously. How can we predict the future?
*   **The Solution:** India is huge. What is happening in a developing suburb of **Pune** today (Month 2) probably *already happened* in a similar suburb of **Bangalore** last month (Month 1).
*   **The AI:** Our hybrid engine finds these "Parallel Universes"—regions in different states that share the same Pulse Vector pattern—and uses their trajectory to predict your target's future.

### **3. The "UIDAI Official" View (The Value)**

#### **Value 1: From Reactive to Proactive Governance**
*   **Current State:** UIDAI waits for a queue to form at a center, citizens complain, then they send more machines. (Lag time: 3-6 months).
*   **With Chronos-X:** The AI predicts a "Demographic Surge" (Migration) in PIN 1100xx next month.
*   **Impact:** Regional Offices (ROs) can deploy **Mobile Aadhaar Vans** to that specific PIN code *before* the queue even forms.

#### **Value 2: Resource Optimization (Saving Money)**
*   **Current State:** Thousands of kits sit idle in low-demand areas while high-demand areas are starving.
*   **With Chronos-X:** The system flags "Low Pulse" zones.
*   **Impact:** Dynamically shift manpower/machines from "Cooling" zones to "Heating" zones on a monthly cycle.

#### **Value 3: Macro-Economic Intelligence**
*   This tool accidentally solves a bigger problem: **Real-time Internal Migration Tracking**.
*   By tracking the "Labor Pulse" (Biometric Updates) moving across PIN codes, UIDAI can show the government where the labor force is migrating for the harvest or industrial season *in real-time*, faster than any Census.

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
