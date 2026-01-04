# Implementation Plan: Chronos-X ("The Parallel-Future Engine")

## Goal
Build a functional prototype of "Chronos-X" that:
1.  Fuses Biometric, Demographic, and Enrolment data into a "Pulse Vector" ($V_{p,t}$) for every PIN code.
2.  Indexes these vectors to find "Parallel Universes" (spatial parallels with limited data, temporal with full data).
3.  Predicts future trends using **AI-augmented forecasting** to overcome limited temporal data.

## Critical Constraint & Solution
> [!WARNING]
> **Data Limitation:** Only 2 months of data available (Nov-Dec 2025), not 5 years.
> 
> **AI Solution:** Use foundation time-series models + spatial parallel search to compensate.

---

## Proposed Changes

### 1. Data Pipeline (`src/data_pipeline.py`)
> [NEW]
- **`load_and_fuse_data()`**: Polars-based function to:
    - Load all 3 CSV types
    - Normalize dates to Month-Start
    - Aggregate by (Pincode, Month)
    - Inner Join → `Master_Pulse_Table`
    - Export to `pulse_vectors.parquet`

---

### 2. AI Forecasting Module (`src/ai_forecaster.py`)
> [NEW] **AI-Powered Component**

#### 2.1 Zero-Shot Forecasting with Amazon Chronos
```python
# pip install chronos-forecasting torch
from chronos import ChronosPipeline
import torch

class AIForecaster:
    def __init__(self):
        # Pre-trained on millions of time series - works with just 2 data points!
        self.pipeline = ChronosPipeline.from_pretrained("amazon/chronos-t5-base")
    
    def forecast_pin(self, pin_history: list[float], horizon: int = 6):
        """
        Zero-shot forecast using foundation model.
        Works even with just 2 months of data!
        """
        context = torch.tensor(pin_history)
        forecast = self.pipeline.predict(context, prediction_length=horizon)
        return {
            "median": forecast.median(dim=0).values.tolist(),
            "lower_bound": forecast.quantile(0.1, dim=0).tolist(),
            "upper_bound": forecast.quantile(0.9, dim=0).tolist()
        }
```

#### 2.2 Spatial Parallel Search (Adapted for Limited Data)
```python
def find_spatial_parallels(target_pin: str, target_month: str, 
                           pulse_table: pl.DataFrame, k: int = 5):
    """
    With limited temporal data, search ACROSS REGIONS instead of ACROSS TIME.
    
    Logic: Find PINs in OTHER states with similar Nov patterns,
    then look at their Dec patterns to predict target's Dec.
    """
    target_vector = get_vector(target_pin, "2025-11")
    
    # Exclude same-state PINs (want cross-regional learning)
    target_state = pulse_table.filter(pl.col("pincode") == target_pin)["state"][0]
    candidates = pulse_table.filter(
        (pl.col("month") == "2025-11") & 
        (pl.col("state") != target_state)
    )
    
    # Find most similar PINs from OTHER states
    similarities = compute_similarity(target_vector, candidates)
    return candidates.sort(similarities, descending=True).head(k)
```

---

### 3. The "Time Machine" Engine (`src/chronos_engine.py`)
> [NEW] Updated with AI integration

- **`class ChronosX`**:
    - **`index_history()`**: Load & normalize Pulse Vectors
    - **`find_parallel_universe()`**: 
        - Mode 1: **Temporal** (if full history available)
        - Mode 2: **Spatial** (with 2-month data - find cross-state parallels)
    - **`predict_future()`**: Hybrid prediction combining:
        1. Spatial parallels (what happened to similar PINs in Dec)
        2. AI forecast (Chronos foundation model prediction)
    - **`generate_attestation()`**: LLM-powered explanation

---

### 4. LLM Attestation Module (`src/attestation.py`)
> [NEW] **Explainability Layer**

```python
# pip install ollama (for local LLM) or use OpenAI API
from ollama import Client

class Attestor:
    def __init__(self):
        self.client = Client()
    
    def explain_prediction(self, target_pin, parallels, prediction):
        prompt = f"""
        You are an analyst explaining Aadhaar data patterns.
        
        PIN {target_pin} in November 2025 shows:
        - Child enrolment: {prediction['current']['enrol']}
        - Adult migrations: {prediction['current']['demo']}
        - Biometric updates: {prediction['current']['bio']}
        
        Similar patterns were found in these PINs: {parallels}
        
        In December, those parallel PINs showed: {prediction['parallel_outcomes']}
        
        AI Model predicts PIN {target_pin} December: {prediction['ai_forecast']}
        
        Write a 3-sentence explanation of what to expect and why.
        """
        return self.client.generate(model="llama3", prompt=prompt)
```

---

### 5. CLI Interface (`chronos_cli.py`)
> [NEW]
```bash
python chronos_cli.py --pincode 110001

# Output:
# ═══════════════════════════════════════════════════════════════
# CHRONOS-X PREDICTION: PIN 110001 (Delhi)
# ═══════════════════════════════════════════════════════════════
# 
# PARALLEL MATCHES (Cross-State):
#   1. PIN 400001 (Maharashtra) - Similarity: 94.2%
#   2. PIN 560001 (Karnataka)   - Similarity: 91.8%
# 
# AI FORECAST (Amazon Chronos):
#   Dec 2025: Enrolment ↑ 12% (Confidence: 85%)
# 
# ATTESTATION:
#   "PIN 110001 shows urban growth patterns similar to Mumbai suburbs
#    in November. Based on Mumbai's December trajectory and AI analysis,
#    expect increased child enrolment as families settle before year-end."
# ═══════════════════════════════════════════════════════════════
```

---

## Technical Stack

| Component | Technology | Purpose |
|:---|:---|:---|
| **Data Processing** | `Polars` | Fast CSV fusion for 2GB+ data |
| **AI Forecasting** | `Amazon Chronos` | Zero-shot time-series prediction |
| **Parallel Search** | `NumPy` / `Faiss` | Vector similarity search |
| **Attestation** | `Ollama` + `Llama3` | Local LLM for explainability |
| **Visualization** | `Streamlit` | Interactive dashboard |

---

## Verification Plan

### Automated Verification
- **Pipeline Test:** Assert `Master_Pulse_Table` has >30k rows
- **AI Forecast Test:** Predict Dec from Nov for 100 PINs, compare to actual Dec data
- **Parallel Search Test:** Verify cross-state matching excludes same-state

### Validation Strategy (Limited Data)
```
1. Use November data as input
2. Find spatial parallels (other states, November)
3. Look at those parallels' December actuals
4. Run AI forecast on November → December
5. Compare BOTH predictions to actual December data
6. Report accuracy: "Spatial Parallel: 78% | AI Forecast: 82%"
```

### Manual Verification
- **Run CLI:** `python chronos_cli.py --pincode 110001`
- **Check:** Output shows parallels + AI forecast + attestation

---

## Hackathon Submission Framing

> [!TIP]
> In your PDF, present this as:
> 
> *"Chronos-X is a **scalable** parallel-future engine. With the provided 2-month sample, we demonstrate:*
> 1. *Spatial parallels (cross-state pattern matching)*
> 2. *AI-augmented forecasting (foundation models)*
> 3. *LLM-powered explainability (attestation)*
> 
> *With access to UIDAI's full 5-year history, the system transitions seamlessly to temporal parallel search for long-horizon forecasting."*

---

## Implementation Timeline

| Phase | Duration | Deliverable |
|:---|:---|:---|
| Data Pipeline | Day 1-2 | `pulse_vectors.parquet` |
| AI Forecaster | Day 2-3 | Working Chronos predictions |
| Spatial Search | Day 3-4 | Cross-state parallel matching |
| Attestation | Day 4-5 | LLM explanations |
| CLI + Dashboard | Day 5-6 | Interactive demo |
| Documentation | Day 6-7 | Submission PDF |
