"""
Chronos-X AI Forecasting Module
================================
AI-powered forecasting using Amazon Chronos foundation model and spatial parallel search.

This module provides:
1. Zero-shot time-series forecasting (works with limited data)
2. Cross-regional spatial parallel search (finds similar patterns across states)

Author: Chronos-X Team
Date: January 2026
"""

import polars as pl
import numpy as np
from typing import Optional, Union
from pathlib import Path
from datetime import date, datetime


def _parse_date(date_input: Union[str, date]) -> date:
    """Convert string or date to date object for column filtering."""
    if isinstance(date_input, date):
        return date_input
    # Parse string formats like "2025-11-01"
    return datetime.strptime(date_input, "%Y-%m-%d").date()


# Lazy imports for heavy dependencies
_chronos_pipeline = None
_torch = None


def _get_torch():
    """Lazy load torch."""
    global _torch
    if _torch is None:
        import torch
        _torch = torch
    return _torch


def _get_chronos_pipeline():
    """Lazy load ChronosPipeline to avoid slow imports."""
    global _chronos_pipeline
    if _chronos_pipeline is None:
        from chronos import ChronosPipeline
        _chronos_pipeline = ChronosPipeline
    return _chronos_pipeline


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1: AI FORECASTER (Amazon Chronos Foundation Model)
# ═══════════════════════════════════════════════════════════════════════════════

class AIForecaster:
    """
    Zero-shot time-series forecaster using Amazon Chronos foundation model.
    
    Chronos is pre-trained on millions of time series and can make predictions
    even with just 2 data points! This is crucial for our limited 2-month dataset.
    
    Attributes:
        model_name: Chronos model variant (default: "amazon/chronos-t5-base")
        pipeline: Loaded Chronos inference pipeline
    """
    
    def __init__(self, model_name: str = "amazon/chronos-t5-base"):
        """
        Initialize the AIForecaster.
        
        Args:
            model_name: HuggingFace model identifier. Options:
                - "amazon/chronos-t5-tiny"  (fastest, least accurate)
                - "amazon/chronos-t5-mini"  
                - "amazon/chronos-t5-small"
                - "amazon/chronos-t5-base"  (balanced, recommended)
                - "amazon/chronos-t5-large" (most accurate, slowest)
        """
        self.model_name = model_name
        self._pipeline = None
    
    @property
    def pipeline(self):
        """Lazy-load the Chronos pipeline."""
        if self._pipeline is None:
            ChronosPipeline = _get_chronos_pipeline()
            print(f"Loading Chronos model: {self.model_name}...")
            self._pipeline = ChronosPipeline.from_pretrained(self.model_name)
            print("Model loaded successfully!")
        return self._pipeline
    
    def forecast_pin(
        self, 
        pin_history: list[float], 
        horizon: int = 6,
        num_samples: int = 20
    ) -> dict:
        """
        Generate zero-shot forecast for a single PIN code's time series.
        
        This works even with just 2 months of historical data thanks to
        Chronos's pre-training on diverse time series patterns.
        
        Args:
            pin_history: Historical values (e.g., [Nov_value, Dec_value])
            horizon: Number of future time steps to predict (default: 6 months)
            num_samples: Number of probabilistic samples (default: 20)
        
        Returns:
            Dictionary with:
                - median: Median forecast values
                - lower_bound: 10th percentile (pessimistic)
                - upper_bound: 90th percentile (optimistic)
                - samples: Raw forecast samples
        """
        torch = _get_torch()
        
        # Convert to tensor - Chronos expects this format
        context = torch.tensor(pin_history, dtype=torch.float32)
        
        # Generate probabilistic forecast (positional args per official API)
        # Returns shape [num_series, num_samples, prediction_length]
        forecast = self.pipeline.predict(context, horizon, num_samples=num_samples)
        
        # Extract quantiles for uncertainty bounds (using numpy as per official docs)
        import numpy as np
        forecast_np = forecast[0].numpy()  # [num_samples, prediction_length]
        low, median, high = np.quantile(forecast_np, [0.1, 0.5, 0.9], axis=0)
        
        return {
            "median": median.tolist(),
            "lower_bound": low.tolist(),
            "upper_bound": high.tolist(),
            "samples": forecast_np.tolist()
        }
    
    def forecast_pulse_vector(
        self,
        pulse_table: pl.DataFrame,
        pincode: str,
        horizon: int = 6
    ) -> dict:
        """
        Forecast all three Pulse Vector components for a PIN code.
        
        Args:
            pulse_table: Master Pulse Table with historical data
            pincode: Target PIN code to forecast
            horizon: Forecast horizon in months
        
        Returns:
            Dictionary with forecasts for each component:
                - growth_forecast: Child enrolment prediction
                - flow_forecast: Migration prediction
                - labor_forecast: Biometric update prediction
        """
        # Filter to target PIN and sort by month
        pin_data = pulse_table.filter(
            pl.col("pincode") == pincode
        ).sort("month")
        
        if len(pin_data) == 0:
            raise ValueError(f"PIN code {pincode} not found in pulse table")
        
        results = {}
        
        # Forecast each component of the Pulse Vector
        for component in ["growth", "flow", "labor"]:
            history = pin_data[f"{component}_norm"].to_list()
            
            if len(history) >= 1:  # Chronos can work with even 1 data point
                results[f"{component}_forecast"] = self.forecast_pin(
                    history, 
                    horizon=horizon
                )
            else:
                results[f"{component}_forecast"] = None
        
        return results
    
    def batch_forecast(
        self,
        pulse_table: pl.DataFrame,
        pincodes: list[str],
        horizon: int = 6
    ) -> dict[str, dict]:
        """
        Batch forecast for multiple PIN codes.
        
        Args:
            pulse_table: Master Pulse Table
            pincodes: List of PIN codes to forecast
            horizon: Forecast horizon
        
        Returns:
            Dictionary mapping PIN codes to their forecasts
        """
        results = {}
        for i, pin in enumerate(pincodes):
            if (i + 1) % 100 == 0:
                print(f"Forecasting PIN {i+1}/{len(pincodes)}...")
            try:
                results[pin] = self.forecast_pulse_vector(
                    pulse_table, pin, horizon
                )
            except Exception as e:
                results[pin] = {"error": str(e)}
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2: SPATIAL PARALLEL SEARCH
# ═══════════════════════════════════════════════════════════════════════════════

def compute_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.
    
    Args:
        vec1: First vector
        vec2: Second vector
    
    Returns:
        Cosine similarity in range [-1, 1]
    """
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(np.dot(vec1, vec2) / (norm1 * norm2))


def get_pulse_vector(
    pulse_table: pl.DataFrame, 
    pincode: str, 
    month: str
) -> Optional[np.ndarray]:
    """
    Extract the Pulse Vector for a specific PIN and month.
    
    Args:
        pulse_table: Master Pulse Table
        pincode: Target PIN code
        month: Target month (format: "YYYY-MM-DD")
    
    Returns:
        NumPy array [growth, flow, labor] or None if not found
    """
    row = pulse_table.filter(
        (pl.col("pincode") == pincode) & 
        (pl.col("month") == _parse_date(month))
    )
    
    if len(row) == 0:
        return None
    
    return np.array([
        row["growth_norm"][0],
        row["flow_norm"][0],
        row["labor_norm"][0]
    ])


def find_spatial_parallels(
    target_pin: str,
    target_month: str,
    pulse_table: pl.DataFrame,
    k: int = 5,
    exclude_same_state: bool = True
) -> pl.DataFrame:
    """
    Find PIN codes with similar Pulse Vector patterns from OTHER regions.
    
    With limited temporal data (2 months), we search ACROSS REGIONS
    instead of ACROSS TIME. The insight: India's diversity means patterns
    that will happen in Delhi may have ALREADY happened in Bangalore.
    
    Logic:
        1. Get target PIN's November Pulse Vector
        2. Find PINs in OTHER states with similar November patterns
        3. Use their December outcomes to project target's December
    
    Args:
        target_pin: PIN code to find parallels for
        target_month: Reference month to compare (e.g., "2025-11-01")
        pulse_table: Master Pulse Table with all data
        k: Number of parallels to return
        exclude_same_state: If True, exclude PINs from the same state
    
    Returns:
        DataFrame with top-k most similar PINs and their similarity scores
    """
    # Get target's Pulse Vector
    target_vector = get_pulse_vector(pulse_table, target_pin, target_month)
    
    if target_vector is None:
        raise ValueError(f"No data for PIN {target_pin} in month {target_month}")
    
    # Get target's state for exclusion
    target_state = pulse_table.filter(
        pl.col("pincode") == target_pin
    )["state"][0]
    
    # Get all candidates from the target month
    candidates = pulse_table.filter(
        (pl.col("month") == _parse_date(target_month)) &
        (pl.col("pincode") != target_pin)  # Exclude self
    )
    
    # Optionally exclude same-state PINs (for true cross-regional learning)
    if exclude_same_state:
        candidates = candidates.filter(pl.col("state") != target_state)
    
    # Compute similarity for each candidate using vectorized operations
    if len(candidates) > 0:
        candidate_matrix = candidates.select(
            ["growth_norm", "flow_norm", "labor_norm"]
        ).to_numpy()

        # Cosine Similarity: (A . B) / (|A| * |B|)
        dot_product = np.dot(candidate_matrix, target_vector)
        target_norm = np.linalg.norm(target_vector)
        candidate_norms = np.linalg.norm(candidate_matrix, axis=1)

        # Handle zero norms to avoid division by zero
        denom = target_norm * candidate_norms
        valid_mask = denom > 0

        similarities = np.zeros(len(candidates))
        similarities[valid_mask] = dot_product[valid_mask] / denom[valid_mask]
    else:
        similarities = []
    
    # Add similarity column and sort
    candidates = candidates.with_columns(
        pl.Series("similarity", similarities)
    ).sort("similarity", descending=True).head(k)
    
    return candidates


def predict_from_parallels(
    target_pin: str,
    parallels: pl.DataFrame,
    pulse_table: pl.DataFrame,
    target_month: str,
    future_month: str
) -> dict:
    """
    Predict target PIN's future based on parallel PINs' actual outcomes.
    
    Example: If target is Delhi (Nov), and parallels are Mumbai+Bangalore (Nov),
    we look at what happened to Mumbai+Bangalore in December, and project
    that onto Delhi.
    
    Args:
        target_pin: PIN to predict for
        parallels: DataFrame of similar PINs from find_spatial_parallels()
        pulse_table: Master Pulse Table
        target_month: Reference month (e.g., "2025-11-01")
        future_month: Month to predict (e.g., "2025-12-01")
    
    Returns:
        Weighted prediction based on parallels' actual outcomes
    """
    parallel_outcomes = []
    weights = []
    
    for row in parallels.iter_rows(named=True):
        parallel_pin = row["pincode"]
        similarity = row["similarity"]
        
        # Get parallel's actual future data
        future_data = pulse_table.filter(
            (pl.col("pincode") == parallel_pin) &
            (pl.col("month") == _parse_date(future_month))
        )
        
        if len(future_data) > 0:
            parallel_outcomes.append({
                "pincode": parallel_pin,
                "state": row["state"],
                "similarity": similarity,
                "growth": future_data["growth_norm"][0],
                "flow": future_data["flow_norm"][0],
                "labor": future_data["labor_norm"][0]
            })
            weights.append(similarity)
    
    if not parallel_outcomes:
        return {
            "prediction": None,
            "confidence": 0,
            "message": "No parallel PINs had data for the future month"
        }
    
    # Weighted average prediction
    weights = np.array(weights)
    
    # Guard against division by zero - ensure weights sum is non-zero
    weight_sum = weights.sum()
    if weight_sum == 0 or len(weights) == 0:
        return {
            "prediction": None,
            "confidence": 0,
            "message": "No valid weights for prediction"
        }
    weights = weights / weight_sum  # Normalize
    
    prediction = {
        "growth": sum(w * o["growth"] for w, o in zip(weights, parallel_outcomes)),
        "flow": sum(w * o["flow"] for w, o in zip(weights, parallel_outcomes)),
        "labor": sum(w * o["labor"] for w, o in zip(weights, parallel_outcomes))
    }
    
    return {
        "prediction": prediction,
        "confidence": float(np.mean([o["similarity"] for o in parallel_outcomes])),
        "parallel_outcomes": parallel_outcomes,
        "weights": weights.tolist()
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3: HYBRID PREDICTOR (Combines AI + Spatial Parallels)
# ═══════════════════════════════════════════════════════════════════════════════

class HybridPredictor:
    """
    Combines AI forecasting with spatial parallel search for robust predictions.
    
    The hybrid approach works as follows:
    1. AI Forecast: Use Chronos foundation model for zero-shot prediction
    2. Spatial Parallels: Find similar regions and use their outcomes
    3. Ensemble: Combine both predictions with confidence weighting
    """
    
    def __init__(self, model_name: str = "amazon/chronos-t5-base"):
        """
        Initialize the hybrid predictor.
        
        Args:
            model_name: Chronos model to use for AI forecasting
        """
        self.ai_forecaster = AIForecaster(model_name)
        self._pulse_table = None
    
    def load_pulse_table(self, path: str = "data/output/pulse_vectors.parquet"):
        """Load the Master Pulse Table."""
        self._pulse_table = pl.read_parquet(path).with_columns(
            pl.col("pincode").cast(pl.Utf8)
        )
        return self
    
    @property
    def pulse_table(self) -> pl.DataFrame:
        """Get the loaded pulse table."""
        if self._pulse_table is None:
            raise ValueError("Pulse table not loaded. Call load_pulse_table() first.")
        return self._pulse_table
    
    def predict(
        self,
        pincode: str,
        num_parallels: int = 5,
        ai_weight: float = 0.5,
        reference_month: str = "2025-11-01",
        target_month: str = "2025-12-01"
    ) -> dict:
        """
        Generate hybrid prediction combining AI and spatial parallels.
        
        Args:
            pincode: Target PIN code
            num_parallels: Number of spatial parallels to use
            ai_weight: Weight for AI forecast (1-ai_weight for parallels)
            reference_month: Month to use as reference
            target_month: Month to predict
        
        Returns:
            Comprehensive prediction with both methods' outputs
        """
        result = {
            "pincode": pincode,
            "reference_month": reference_month,
            "target_month": target_month
        }
        
        # ─── 1. Get Current State ─────────────────────────────────────────
        current_vector = get_pulse_vector(
            self.pulse_table, pincode, reference_month
        )
        
        if current_vector is None:
            result["error"] = f"No data for PIN {pincode} in {reference_month}"
            return result
        
        result["current"] = {
            "growth": float(current_vector[0]),
            "flow": float(current_vector[1]),
            "labor": float(current_vector[2])
        }
        
        # Get state for context
        pin_info = self.pulse_table.filter(pl.col("pincode") == pincode)
        result["state"] = pin_info["state"][0] if len(pin_info) > 0 else "Unknown"
        
        # ─── 2. Spatial Parallel Prediction ───────────────────────────────
        try:
            parallels = find_spatial_parallels(
                target_pin=pincode,
                target_month=reference_month,
                pulse_table=self.pulse_table,
                k=num_parallels
            )
            
            spatial_pred = predict_from_parallels(
                target_pin=pincode,
                parallels=parallels,
                pulse_table=self.pulse_table,
                target_month=reference_month,
                future_month=target_month
            )
            
            result["spatial_parallels"] = {
                "parallels": parallels.select([
                    "pincode", "state", "similarity"
                ]).to_dicts(),
                "prediction": spatial_pred["prediction"],
                "confidence": spatial_pred["confidence"]
            }
        except Exception as e:
            result["spatial_parallels"] = {"error": str(e)}
        
        # ─── 3. AI Forecast ───────────────────────────────────────────────
        try:
            ai_forecast = self.ai_forecaster.forecast_pulse_vector(
                pulse_table=self.pulse_table,
                pincode=pincode,
                horizon=1  # Just next month
            )
            
            result["ai_forecast"] = {
                "growth": ai_forecast["growth_forecast"]["median"][0] 
                    if ai_forecast.get("growth_forecast") else None,
                "flow": ai_forecast["flow_forecast"]["median"][0]
                    if ai_forecast.get("flow_forecast") else None,
                "labor": ai_forecast["labor_forecast"]["median"][0]
                    if ai_forecast.get("labor_forecast") else None,
                "uncertainty": {
                    "growth_range": [
                        ai_forecast["growth_forecast"]["lower_bound"][0],
                        ai_forecast["growth_forecast"]["upper_bound"][0]
                    ] if ai_forecast.get("growth_forecast") else None
                }
            }

            # Calculate confidence from uncertainty width for growth
            # Assuming normalized data [0, 1]. Narrower width = Higher confidence.
            confidence = 0.0
            if result["ai_forecast"]["uncertainty"] and result["ai_forecast"]["uncertainty"].get("growth_range"):
                lower = result["ai_forecast"]["uncertainty"]["growth_range"][0]
                upper = result["ai_forecast"]["uncertainty"]["growth_range"][1]
                width = upper - lower
                # Heuristic: 1.0 width = 0% confidence, 0.0 width = 100% confidence
                confidence = max(0.0, min(100.0, (1.0 - width) * 100.0))

            result["ai_forecast"]["confidence"] = confidence

        except Exception as e:
            result["ai_forecast"] = {"error": str(e)}
        
        # ─── 4. Ensemble Prediction ───────────────────────────────────────
        spatial_pred = result.get("spatial_parallels", {}).get("prediction")
        ai_pred = result.get("ai_forecast", {})
        
        if spatial_pred and not isinstance(ai_pred, dict) or ai_pred.get("error"):
            # Only spatial available
            result["ensemble"] = spatial_pred
            result["ensemble_method"] = "spatial_only"
        elif ai_pred and not ai_pred.get("error") and not spatial_pred:
            # Only AI available
            result["ensemble"] = {
                "growth": ai_pred.get("growth"),
                "flow": ai_pred.get("flow"),
                "labor": ai_pred.get("labor")
            }
            result["ensemble_method"] = "ai_only"
        elif spatial_pred and ai_pred and not ai_pred.get("error"):
            # Both available - weighted average
            parallel_weight = 1 - ai_weight
            result["ensemble"] = {
                "growth": ai_weight * ai_pred["growth"] + parallel_weight * spatial_pred["growth"],
                "flow": ai_weight * ai_pred["flow"] + parallel_weight * spatial_pred["flow"],
                "labor": ai_weight * ai_pred["labor"] + parallel_weight * spatial_pred["labor"]
            }
            result["ensemble_method"] = f"weighted_avg (AI:{ai_weight}, Spatial:{parallel_weight})"
        else:
            result["ensemble"] = None
            result["ensemble_method"] = "no_predictions_available"
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4: UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def validate_forecast(
    pulse_table: pl.DataFrame,
    test_month: str = "2025-12-01",
    train_month: str = "2025-11-01",
    sample_size: int = 100
) -> dict:
    """
    Validate forecasting accuracy by comparing predictions to actuals.
    
    Uses November data to predict December, then compares to actual December.
    
    Args:
        pulse_table: Master Pulse Table
        test_month: Month with ground truth (to compare against)
        train_month: Month to use for prediction
        sample_size: Number of PINs to test
    
    Returns:
        Validation metrics (RMSE, MAE, etc.)
    """
    # Get PINs that have data in both months
    pincodes_train = set(pulse_table.filter(
        pl.col("month") == train_month
    )["pincode"].to_list())
    
    pincodes_test = set(pulse_table.filter(
        pl.col("month") == test_month
    )["pincode"].to_list())
    
    valid_pincodes = list(pincodes_train & pincodes_test)[:sample_size]
    
    if not valid_pincodes:
        return {"error": "No PINs with data in both months"}
    
    predictor = HybridPredictor()
    predictor._pulse_table = pulse_table
    
    errors = {"growth": [], "flow": [], "labor": []}
    
    for pin in valid_pincodes:
        prediction = predictor.predict(
            pincode=pin,
            reference_month=train_month,
            target_month=test_month
        )
        
        if prediction.get("ensemble"):
            actual = get_pulse_vector(pulse_table, pin, test_month)
            if actual is not None:
                errors["growth"].append(
                    (prediction["ensemble"]["growth"] - actual[0]) ** 2
                )
                errors["flow"].append(
                    (prediction["ensemble"]["flow"] - actual[1]) ** 2
                )
                errors["labor"].append(
                    (prediction["ensemble"]["labor"] - actual[2]) ** 2
                )
    
    return {
        "n_predictions": len(errors["growth"]),
        "rmse": {
            "growth": float(np.sqrt(np.mean(errors["growth"]))) if errors["growth"] else None,
            "flow": float(np.sqrt(np.mean(errors["flow"]))) if errors["flow"] else None,
            "labor": float(np.sqrt(np.mean(errors["labor"]))) if errors["labor"] else None
        },
        "valid_pincodes": len(valid_pincodes)
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Demo usage
    print("=" * 70)
    print("CHRONOS-X AI FORECASTER")
    print("=" * 70)
    
    # Check if pulse table exists
    pulse_path = Path("data/output/pulse_vectors.parquet")
    if not pulse_path.exists():
        print(f"\n⚠️  {pulse_path} not found!")
        print("   Run data_pipeline.py first to generate the Pulse Table.")
        exit(1)
    
    # Load and run demo
    print("\nLoading Pulse Table...")
    predictor = HybridPredictor()
    predictor.load_pulse_table(str(pulse_path))
    
    # Get a sample PIN
    sample_pin = predictor.pulse_table["pincode"][0]
    print(f"\nRunning prediction for PIN: {sample_pin}")
    
    result = predictor.predict(sample_pin)
    
    print("\n" + "-" * 70)
    print("PREDICTION RESULTS")
    print("-" * 70)
    print(f"PIN: {result['pincode']}")
    print(f"State: {result.get('state', 'Unknown')}")
    print(f"\nCurrent Pulse Vector ({result['reference_month']}):")
    print(f"  Growth: {result['current']['growth']:.4f}")
    print(f"  Flow:   {result['current']['flow']:.4f}")
    print(f"  Labor:  {result['current']['labor']:.4f}")
    
    if result.get("ensemble"):
        print(f"\nEnsemble Prediction ({result['target_month']}):")
        print(f"  Growth: {result['ensemble']['growth']:.4f}")
        print(f"  Flow:   {result['ensemble']['flow']:.4f}")
        print(f"  Labor:  {result['ensemble']['labor']:.4f}")
        print(f"  Method: {result['ensemble_method']}")
    
    print("\n" + "=" * 70)
