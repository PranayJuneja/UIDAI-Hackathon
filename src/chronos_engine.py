"""
Chronos-X Engine ("The Time Machine")
=====================================
Unified API layer for the Chronos-X system.
Integrates:
1. Pre-computed Batch Predictions (Instant Response)
2. Spatial Parallel Search (Cross-State)
3. AI Forecasting (Amazon Chronos)
4. Attestation Context Generation

Author: Chronos-X Team
Date: January 2026
"""

import polars as pl
import numpy as np
import json
from pathlib import Path
from typing import Optional, Dict, List, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from ai_forecaster import HybridPredictor, find_spatial_parallels

class ChronosX:
    """
    The "Parallel-Future Engine" - main entry point for the application.
    """
    
    def __init__(self, 
                 predictions_path: str = "data/output/predictions.parquet",
                 pulse_table_path: str = "data/output/pulse_vectors.parquet"):
        """
        Initialize the engine by loading pre-computed data.
        
        Args:
            predictions_path: Path to batch predictions parquet file
            pulse_table_path: Path to master pulse table (for on-demand fallback)
        """
        self.predictions_path = Path(predictions_path)
        self.pulse_table_path = Path(pulse_table_path)
        
        # 1. Load Pre-computed Predictions (Fast Layer)
        if self.predictions_path.exists():
            logger.info(f"Loading predictions from {self.predictions_path}...")
            self.predictions = pl.read_parquet(self.predictions_path)
            self.has_predictions = True
            logger.info(f"Loaded {len(self.predictions)} predictions")
        else:
            logger.warning(f"Predictions file not found at {self.predictions_path}")
            self.predictions = None
            self.has_predictions = False
            
        # 2. Initialize Fallback Predictor (Slow Layer)
        # We load this lazily or if predictions are missing
        self._hybrid_predictor = None
        
    @property
    def hybrid_predictor(self):
        """Lazy loader for the HybridPredictor."""
        if self._hybrid_predictor is None:
            if self.pulse_table_path.exists():
                logger.info("Initializing HybridPredictor for on-demand compute...")
                self._hybrid_predictor = HybridPredictor()
                self._hybrid_predictor.load_pulse_table(str(self.pulse_table_path))
            else:
                logger.error("Pulse table not found! Cannot initialize HybridPredictor.")
        return self._hybrid_predictor

    def lookup(self, pincode: str) -> Dict[str, Any]:
        """
        Instant lookup of a PIN code's prediction.
        
        Returns:
            Dictionary containing current values, forecasts, parallels, and attestation data.
            Returns None if PIN not found.
        """
        if not self.has_predictions:
            return self._compute_on_demand(pincode)
            
        # Fast filter
        row = self.predictions.filter(pl.col("pincode") == pincode)
        
        if row.height == 0:
            logger.info(f"PIN {pincode} not found in pre-computed set. Trying on-demand...")
            return self._compute_on_demand(pincode)
            
        # Unpack the row
        data = row.to_dicts()[0]
        
        # Deserialize JSON fields
        try:
            forecast_growth = json.loads(data["forecast_growth"])
            forecast_flow = json.loads(data["forecast_flow"])
            forecast_labor = json.loads(data["forecast_labor"])
            
            # Bounds
            forecast_growth_low = json.loads(data["forecast_growth_lower"])
            forecast_growth_high = json.loads(data["forecast_growth_upper"])
            
            forecast_flow_low = json.loads(data["forecast_flow_lower"])
            forecast_flow_high = json.loads(data["forecast_flow_upper"])
            
            forecast_labor_low = json.loads(data["forecast_labor_lower"])
            forecast_labor_high = json.loads(data["forecast_labor_upper"])
            
        except Exception as e:
            logger.error(f"Error deserializing JSON for {pincode}: {e}")
            return self._compute_on_demand(pincode)
            
        # Structure the response
        response = {
            "pincode": data["pincode"],
            "state": data["state"],
            
            # Current State (Nov 2025)
            "current": {
                "growth": data["current_growth"],
                "flow": data["current_flow"],
                "labor": data["current_labor"]
            },
            
            # Immediate Destination (Dec 2025 - Predicted)
            "next_month": {
                "growth": data["next_growth"],
                "flow": data["next_flow"],
                "labor": data["next_labor"]
            },
            
            # 6-Month AI Forecast
            "forecast": {
                "growth": {
                    "median": forecast_growth,
                    "lower": forecast_growth_low,
                    "upper": forecast_growth_high
                },
                "flow": {
                    "median": forecast_flow,
                    "lower": forecast_flow_low,
                    "upper": forecast_flow_high
                },
                "labor": {
                    "median": forecast_labor,
                    "lower": forecast_labor_low,
                    "upper": forecast_labor_high
                }
            },
            
            # Evidence
            "evidence": {
                "confidence": data["confidence"],
                "parallels": [
                    p for p in [data["top_parallel_1"], data["top_parallel_2"], data["top_parallel_3"]]
                    if p is not None
                ],
                "parallel_states": data["parallel_states"]
            }
        }
        
        return response

    def _compute_on_demand(self, pincode: str) -> Dict[str, Any]:
        """
        Fallback: Compute prediction on the fly if not in batch file.
        """
        if self.hybrid_predictor is None:
            return {"error": "Predictor not initialized and data missing"}
            
        logger.info(f"Computing on-demand prediction for {pincode}...")
        
        try:
            # 1. Hybrid Prediction (Next Month)
            hybrid_res = self.hybrid_predictor.predict(pincode)
            
            if not hybrid_res:
                return {"error": f"No data found for PIN {pincode}"}

            # 2. AI Forecast (6 Months) - we need to instantiate AIForecaster separately
            # or add a method to HybridPredictor. For now, let's keep it simple:
            # We will just use the next month prediction extended flat if we can't run the full model,
            # OR ideally, HybridPredictor should expose the full forecast.
            
            # For this prototype, we'll return what we have from hybrid_res
            # and mock the 6-month forecast using the current trend
            
            current = hybrid_res["current"]
            next_val = hybrid_res["ensemble"] or current
            
            # Mock projection for on-demand (expensive to run full Chronos T5 inference here if not optimized)
            # But HybridPredictor uses Chronos T5, so it might be slow.
            
            response = {
                "pincode": pincode,
                "state": hybrid_res.get("state", "Unknown"),
                "current": current,
                "next_month": next_val,
                "forecast": {
                    # Simple linear projection for fallback
                    "growth": {"median": [next_val["growth"]] * 6, "lower": [], "upper": []},
                    "flow": {"median": [next_val["flow"]] * 6, "lower": [], "upper": []},
                    "labor": {"median": [next_val["labor"]] * 6, "lower": [], "upper": []}
                },
                "evidence": {
                    "confidence": hybrid_res["spatial_parallels"]["confidence"],
                    "parallels": [p["pincode"] for p in hybrid_res["spatial_parallels"]["parallels"]],
                    "parallel_states": ", ".join({p["state"] for p in hybrid_res["spatial_parallels"]["parallels"]})
                }
            }
            return response
            
        except Exception as e:
            logger.error(f"On-demand computation failed: {e}")
            return {"error": str(e)}

    def find_parallel_universe(self, pincode: str) -> List[Dict]:
        """
        Get detailed parallel universe data for visualization.
        """
        # We can implement a more detailed search here if needed,
        # or extract just the parallel details from the lookup.
        data = self.lookup(pincode)
        if "error" in data:
            return []
            
        # If we have the parallels list, we might want to fetch their full details
        # This would require querying the pulse table for those PINs.
        return data.get("evidence", {}).get("parallels", [])

    def get_attestation_context(self, pincode: str) -> str:
        """
        Generate a text context for the LLM to explain the prediction.
        """
        data = self.lookup(pincode)
        if "error" in data:
            return "No data available."
            
        context = f"""
        Analysis for PIN {pincode} ({data['state']}):
        
        1. Current Status (Nov 2025):
           - Enrolment Growth: {data['current']['growth']:.2f}
           - Population Flow: {data['current']['flow']:.2f}
           - Biometric Updates: {data['current']['labor']:.2f}
           
        2. Prediction (Dec 2025):
           - The system predicts a move to:
             Growth: {data['next_month']['growth']:.2f}
             Flow: {data['next_month']['flow']:.2f}
             Labor: {data['next_month']['labor']:.2f}
             
        3. Comparable Regions (Spatial Parallels):
           - We found similar patterns in: {data['evidence']['parallel_states']}
           - Top matching PINs: {', '.join(data['evidence']['parallels'])}
           - Confidence Score: {data['evidence']['confidence']:.2f}
           
        4. Forecast Trend (6 Months):
           - Enrolment is expected to average {np.mean(data['forecast']['growth']['median']):.2f}
        """
        return context

# Simple test
if __name__ == "__main__":
    engine = ChronosX()
    # Test with a known PIN (Delhi GPO)
    print(json.dumps(engine.lookup("110001"), indent=2))
