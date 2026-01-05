"""
Chronos-X Engine ("The Time Machine")
=====================================
Unified interface for the Time Machine feature.
Consolidates fast lookups (pre-computed) with on-demand AI forecasting.

This is the user-facing API that the dashboard/UI will talk to.
"""

import polars as pl
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime, date

# Import core AI module
# Adjust path if needed based on project structure
try:
    from src.ai_forecaster import HybridPredictor
except ImportError:
    # Fallback for when running from root
    from ai_forecaster import HybridPredictor

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ChronosX")

class ChronosX:
    """
    The "Parallel-Future Engine" - unified interface for predictions.
    Wraps AI Forecaster + Spatial Search + pre-computed batch results.
    """
    
    def __init__(self, predictions_path: str = "data/output/predictions.parquet"):
        """
        Initialize the Chronos Engine.
        
        Args:
            predictions_path: Path to pre-computed predictions parquet file.
                              If file doesn't exist, engine falls back to real-time mode.
        """
        self.predictions_path = Path(predictions_path)
        self.predictions = None
        self.hybrid = HybridPredictor()
        
        # Load cached predictions if available
        self._load_cache()
    
    def _load_cache(self):
        """Attempt to load pre-computed predictions."""
        if self.predictions_path.exists():
            try:
                self.predictions = pl.read_parquet(self.predictions_path)
                logger.info(f"Loaded {len(self.predictions)} cached predictions from {self.predictions_path}")
            except Exception as e:
                logger.error(f"Failed to load predictions cache: {e}")
                self.predictions = None
        else:
            logger.warning(f"Cache file {self.predictions_path} not found. Running in On-Demand Mode.")
            self.predictions = None

    def lookup(self, pincode: str) -> Optional[Dict[str, Any]]:
        """
        Instant lookup from pre-computed predictions.
        
        Args:
            pincode: 6-digit PIN code string
            
        Returns:
            Dictionary with complete prediction context or None if not found in cache.
        """
        if self.predictions is None:
            return None
            
        # Fast filter
        row = self.predictions.filter(pl.col("pincode") == pincode)
        
        if len(row) == 0:
            return None
            
        # Convert single row to dict
        data = row.to_dicts()[0]
        
        # Decode JSON fields (forecasts are stored as JSON strings in parquet)
        try:
            if "forecast_growth" in data and isinstance(data["forecast_growth"], str):
                data["forecast_growth"] = json.loads(data["forecast_growth"])
                data["forecast_growth_lower"] = json.loads(data["forecast_growth_lower"])
                data["forecast_growth_upper"] = json.loads(data["forecast_growth_upper"])
                
            if "forecast_flow" in data and isinstance(data["forecast_flow"], str):
                data["forecast_flow"] = json.loads(data["forecast_flow"])
                data["forecast_flow_lower"] = json.loads(data["forecast_flow_lower"])
                data["forecast_flow_upper"] = json.loads(data["forecast_flow_upper"])
                
            if "forecast_labor" in data and isinstance(data["forecast_labor"], str):
                data["forecast_labor"] = json.loads(data["forecast_labor"])
                data["forecast_labor_lower"] = json.loads(data["forecast_labor_lower"])
                data["forecast_labor_upper"] = json.loads(data["forecast_labor_upper"])
        except json.JSONDecodeError:
            logger.warning(f"Failed to decode JSON forecasts for PIN {pincode}")
            
        return data

    def find_parallel_universe(self, pincode: str, mode: str = "spatial") -> List[Dict[str, Any]]:
        """
        Find similar patterns for a given PIN code.
        
        Args:
            pincode: Target PIN
            mode: "spatial" (cross-state) or "temporal" (time-travel)
            
        Returns:
            List of similar PIN contexts (parallels)
        """
        # For now, we mainly support spatial parallels as defined in v1
        if mode == "spatial":
            # Check cache first
            data = self.lookup(pincode)
            if data and data.get("top_parallel_1"):
                # Construct parallel objects from cached simple fields
                parallels = []
                for i in range(1, 4):
                    p_pin = data.get(f"top_parallel_1") if i==1 else data.get(f"top_parallel_2") if i==2 else data.get(f"top_parallel_3")
                    if p_pin:
                        parallels.append({
                            "pincode": p_pin,
                            "type": "spatial",
                            "rank": i
                        })
                return parallels
            
            # Fallback to on-demand computation
            # We need the pulse table loaded in hybrid predictor
            if self.hybrid._pulse_table is None:
                # Try to load default pulse table
                 try:
                    self.hybrid.load_pulse_table()
                 except Exception:
                     logger.error("Pulse table not available for on-demand spatial search")
                     return []

            result = self.hybrid.predict(pincode, num_parallels=3)
            if "spatial_parallels" in result and "parallels" in result["spatial_parallels"]:
                return result["spatial_parallels"]["parallels"]
                
        return []

    def predict_by_date(self, pincode: str, target_date: str) -> Dict[str, Any]:
        """
        Get prediction for a specific future date.
        Automatically calculates the horizon from the reference date (claimed as Nov 2025).
        
        Args:
            pincode: Target PIN
            target_date: Target date string (YYYY-MM-DD)
            
        Returns:
            Prediction dictionary for that specific target horizon.
        """
        # Hardcoded reference for this hackathon version - ideally from data
        # "Today" / Latest Data = Nov 1, 2025
        reference_date = date(2025, 11, 1)
        
        try:
            target = datetime.strptime(target_date, "%Y-%m-%d").date()
        except ValueError:
            return {"error": "Invalid date format. Use YYYY-MM-DD"}
            
        # Calculate monthly horizon
        # diff in years * 12 + diff in months
        horizon = (target.year - reference_date.year) * 12 + (target.month - reference_date.month)
        
        if horizon <= 0:
            return {"error": "Target date must be in the future (after Nov 2025)"}
            
        logger.info(f"Predicting for {target_date} (Horizon: {horizon} months)")
        
        return self.predict_future(pincode, horizon=horizon)

    def predict_future(self, pincode: str, horizon: int = 6) -> Dict[str, Any]:
        """
        Get future prediction.
        Cache-First Strategy:
          1. Try to get from parquet cache.
          2. If invalid (missing or horizon too long), run on-demand.
          
        Args:
            pincode: Target PIN
            horizon: 1-6 months supported by cache. >6 triggers on-demand.
            
        Returns:
            Prediction dictionary with forecasts and bounds.
        """
        # 1. Try Cache
        cached_data = self.lookup(pincode)
        
        # Check if cache is sufficient
        cache_hit = False
        if cached_data:
            # Check if we have enough forecast points for the requested horizon
            # Assuming standard cache is 6 months
            cached_horizon = len(cached_data.get("forecast_growth", []))
            if cached_horizon >= horizon:
                cache_hit = True
                # Slice to requested horizon
                return {
                    "source": "cache",
                    "pincode": pincode,
                    "growth": {
                        "median": cached_data["forecast_growth"][:horizon],
                        "lower": cached_data["forecast_growth_lower"][:horizon],
                        "upper": cached_data["forecast_growth_upper"][:horizon]
                    },
                    "flow": {
                        "median": cached_data["forecast_flow"][:horizon],
                        "lower": cached_data["forecast_flow_lower"][:horizon],
                        "upper": cached_data["forecast_flow_upper"][:horizon]
                    },
                    "labor": {
                        "median": cached_data["forecast_labor"][:horizon],
                        "lower": cached_data["forecast_labor_lower"][:horizon],
                        "upper": cached_data["forecast_labor_upper"][:horizon]
                    },
                    "confidence": cached_data.get("confidence", 0.0)
                }
        
        # 2. On-Demand Fallback
        logger.info(f"Cache miss or insufficient horizon for PIN {pincode}. Running On-Demand.")
        
        # Ensure data is loaded
        if self.hybrid._pulse_table is None:
            try:
                self.hybrid.load_pulse_table()
            except Exception as e:
                return {"error": f"Failed to load data for on-demand prediction: {e}"}
        
        # Run hybrid prediction (defaults to 1 month usually, need to force horizon)
        # Note: HybridPredictor.predict is optimized for next-month. 
        # We need to access the internal ai_forecaster for multi-step if needed,
        # or just accept that Hybrid gives next-month + context.
        
        # Let's use the internal AI forecaster for raw multi-step
        try:
            forecasts = self.hybrid.ai_forecaster.forecast_pulse_vector(
                self.hybrid.pulse_table, 
                pincode, 
                horizon=horizon
            )
            
            # Format similar to cache structure
            return {
                "source": "on-demand",
                "pincode": pincode,
                "growth": {
                    "median": forecasts["growth_forecast"]["median"],
                    "lower": forecasts["growth_forecast"]["lower_bound"],
                    "upper": forecasts["growth_forecast"]["upper_bound"]
                } if forecasts.get("growth_forecast") else None,
                "flow": {
                    "median": forecasts["flow_forecast"]["median"],
                    "lower": forecasts["flow_forecast"]["lower_bound"],
                    "upper": forecasts["flow_forecast"]["upper_bound"]
                } if forecasts.get("flow_forecast") else None,
                "labor": {
                    "median": forecasts["labor_forecast"]["median"],
                    "lower": forecasts["labor_forecast"]["lower_bound"],
                    "upper": forecasts["labor_forecast"]["upper_bound"]
                } if forecasts.get("labor_forecast") else None
            }
            
        except Exception as e:
            return {"error": f"On-demand prediction failed: {e}"}

    def get_attestation_context(self, pincode: str) -> Dict[str, Any]:
        """
        Prepare context for LLM attestation (Step 4).
        Aggregates all known info about the PIN to feed into the LLM.
        """
        # Get basic info
        data = self.lookup(pincode)
        
        if not data:
            # Try on-demand simple fetch
            # Ensure table is loaded
            if self.hybrid._pulse_table is None:
                try: 
                    self.hybrid.load_pulse_table()
                except:
                    pass
            
            # Basic lookup from pulse table if cache missing
            if self.hybrid._pulse_table is not None:
                try:
                    row = self.hybrid.pulse_table.filter(pl.col("pincode") == pincode)
                    # We might have multiple rows (months), get the latest reference month
                    # Assuming batch_predict uses 2025-11-01 as reference
                    row = row.filter(pl.col("month") == date(2025, 11, 1))
                    
                    if len(row) > 0:
                        data = {
                            "pincode": pincode,
                            "state": row["state"][0],
                            "current_growth": row["growth_norm"][0],
                            "current_flow": row["flow_norm"][0],
                            "current_labor": row["labor_norm"][0]
                        }
                except Exception as e:
                    logger.warning(f"On-demand lookup failed: {e}")
        
        if not data:
            return {"error": "PIN not found"}
            
        return {
            "pincode": pincode,
            "state": data.get("state", "Unknown"),
            "current": {
                "growth": data.get("current_growth", 0),
                "flow": data.get("current_flow", 0),
                "labor": data.get("current_labor", 0)
            },
            "risk_factors": {
                "high_growth": data.get("current_growth", 0) > 0.8,
                "high_flow": data.get("current_flow", 0) > 0.8,
                "anomalous_labor": data.get("current_labor", 0) < 0.2
            },
            "parallels": [
                data.get("top_parallel_1"),
                data.get("top_parallel_2")
            ],
            "forecast_summary": {
                "next_month_growth": data.get("next_growth"),
                "confidence": data.get("confidence")
            }
        }
