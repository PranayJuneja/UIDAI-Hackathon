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
> [COMPLETE ✅]
- **`load_and_fuse_data()`**: Polars-based function to:
    - Load all 3 CSV types (Biometric, Demographic, Enrolment)
    - Normalize dates to Month-Start
    - Aggregate by (Pincode, Month)
    - Inner Join → `Master_Pulse_Table`
    - Export to `pulse_vectors.parquet` (74,829 rows)

---

### 2. AI Forecasting Module (`src/ai_forecaster.py`)
> [COMPLETE ✅] **AI-Powered Component**

#### 2.1 Zero-Shot Forecasting with Amazon Chronos
**Status:** Implemented with `amazon/chronos-t5-base` model.

**Classes Implemented:**
- **`AIForecaster`**: Zero-shot time-series forecaster using Chronos foundation model
  - `forecast_pin()`: Single PIN prediction with confidence bounds
  - `forecast_pulse_vector()`: Full 3-component (growth/flow/labor) forecast
  - `batch_forecast()`: Efficient batch processing for multiple PINs
  
- **`HybridPredictor`**: Combines AI + Spatial parallel search
  - `predict()`: Weighted ensemble of AI forecast + spatial parallel outcomes
  - Configurable AI weight (default: 0.5 for 50/50 blend)

#### 2.2 Spatial Parallel Search (Adapted for Limited Data)
**Status:** Implemented as `find_spatial_parallels()` function.

**Features:**
- Cross-state pattern matching (excludes same-state PINs)
- Cosine similarity-based vector comparison
- `predict_from_parallels()`: Uses parallel PINs' actual outcomes for prediction

#### 2.3 Batch Prediction Script (`scripts/batch_predict.py`)
> [NEW] **Pre-computation for Production Use**

**Purpose:** Generate predictions for ALL 19,079 PIN codes to enable instant responses in production.

**Usage:**
```bash
python scripts/batch_predict.py
```

**Output:** `data/output/predictions.parquet` containing:
| Field | Description |
|:---|:---|
| `pincode`, `state` | PIN code and state identifier |
| `current_growth/flow/labor` | November 2025 Pulse Vector values |
| `next_growth/flow/labor` | Ensemble prediction for December 2025 |
| `forecast_growth/flow/labor` | 6-month AI forecast (JSON arrays) |
| `confidence` | Spatial parallel similarity confidence |
| `parallel_states` | Top 3 matched states |
| `top_parallel_1/2/3` | Top 3 matched PIN codes |
| `ensemble_method` | "hybrid" (AI + Spatial blend) |

---

### 3. The "Time Machine" Engine (`src/chronos_engine.py`)
> [COMPLETE ✅] **Unified API Layer**

**Purpose:** Consolidate all prediction logic into a clean, user-facing API.

```python
class ChronosX:
    """
    The "Parallel-Future Engine" - unified interface for predictions.
    Wraps AI Forecaster + Spatial Search + pre-computed batch results.
    """
    
    def __init__(self, predictions_path: str = "data/output/predictions.parquet"):
        """Load pre-computed predictions for instant lookup."""
        self.predictions = pl.read_parquet(predictions_path)
        self.hybrid = HybridPredictor()  # For on-demand predictions
    
    def lookup(self, pincode: str) -> dict:
        """
        Instant lookup from pre-computed predictions.
        Returns complete prediction with parallels and forecasts.
        """
        pass
    
    def find_parallel_universe(self, pincode: str, mode: str = "spatial") -> list:
        """
        Find similar patterns:
        - mode="spatial": Cross-state parallels (for 2-month data)
        - mode="temporal": Time-based parallels (for 5+ year data)
        """
        pass
    
    def predict_future(self, pincode: str, horizon: int = 6) -> dict:
        """
        Get future prediction (from cache or compute on-demand).
        Returns median, lower_bound, upper_bound for each component.
        """
        pass
    
    def get_attestation_context(self, pincode: str) -> dict:
        """
        Prepare context for LLM attestation (Step 4).
        Returns current values, parallels, and predictions.
        """
        pass
```

**Implementation Tasks:**
1. [ ] Create `src/chronos_engine.py`
2. [ ] Implement `ChronosX.lookup()` - instant retrieval from parquet
3. [ ] Implement `ChronosX.find_parallel_universe()` - wrapper for spatial/temporal
4. [ ] Implement `ChronosX.predict_future()` - cache-first, fallback to on-demand
5. [ ] Implement `ChronosX.get_attestation_context()` - prepare for LLM

---

### 4. LLM Attestation Module (`src/attestation.py`)
> [NEW] **Explainability Layer**

```python
# pip install openai
from openai import OpenAI
import os

class Attestor:
    def __init__(self):
        # Using Vercel AI Gateway (OpenAI-compatible)
        self.client = OpenAI(
            base_url=os.environ.get("AI_GATEWAY_BASE_URL"),
            api_key=os.environ.get("AI_GATEWAY_API_KEY")
        )
        self.model = os.environ.get("AI_MODEL", "minimax/minimax-m2.1")
    
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
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
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
| **Attestation** | `Vercel AI Gateway` | LLM for explainability (Minimax/OpenAI compatible) |
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
