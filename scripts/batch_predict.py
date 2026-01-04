"""
Batch Prediction Script
=======================
Generates predictions for ALL PIN codes using the HybridPredictor (AI + Spatial).

Usage: python scripts/batch_predict.py

Output: data/output/predictions.parquet
"""

import polars as pl
import numpy as np
from pathlib import Path
from datetime import date, datetime
import time
import sys
import json

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from ai_forecaster import HybridPredictor, AIForecaster, find_spatial_parallels


def main():
    print("=" * 70)
    print("CHRONOS-X BATCH PREDICTION (Hybrid AI + Spatial)")
    print("=" * 70)
    
    # Configuration
    MODEL_NAME = "amazon/chronos-t5-base"
    HORIZON = 6  # 6-month forecast
    REFERENCE_MONTH = "2025-11-01"
    TARGET_MONTH = "2025-12-01"  # Next month for spatial parallels
    
    # Load pulse table
    pulse_path = Path("data/output/pulse_vectors.parquet")
    if not pulse_path.exists():
        print(f"ERROR: {pulse_path} not found!")
        return
    
    print(f"\nLoading {pulse_path}...")
    pulse_table = pl.read_parquet(pulse_path)
    print(f"Loaded {len(pulse_table)} rows")
    
    # Initialize predictors
    print(f"\nInitializing HybridPredictor with {MODEL_NAME}...")
    hybrid = HybridPredictor(model_name=MODEL_NAME)
    hybrid._pulse_table = pulse_table
    
    ai_forecaster = AIForecaster(model_name=MODEL_NAME)
    
    # Get unique PINs from reference month
    ref_date = datetime.strptime(REFERENCE_MONTH, "%Y-%m-%d").date()
    ref_pincodes = pulse_table.filter(
        pl.col("month") == ref_date
    )["pincode"].unique().to_list()
    
    print(f"\nPINs to process: {len(ref_pincodes)}")
    
    # Generate predictions
    print("\n" + "-" * 70)
    print("GENERATING HYBRID PREDICTIONS (AI + Spatial Parallels)")
    print("-" * 70)
    
    results = []
    total_pins = len(ref_pincodes)
    start_time = time.time()
    
    for idx, pincode in enumerate(ref_pincodes):
        if (idx + 1) % 100 == 0:
            elapsed = time.time() - start_time
            rate = (idx + 1) / elapsed
            remaining = (total_pins - idx - 1) / rate
            print(f"Processing PIN {idx+1}/{total_pins} ({rate:.1f}/sec, ~{remaining:.0f}s remaining)")
        
        try:
            # Get hybrid prediction (AI + Spatial for next month)
            hybrid_result = hybrid.predict(
                pincode=pincode,
                num_parallels=5,
                ai_weight=0.5,
                reference_month=REFERENCE_MONTH,
                target_month=TARGET_MONTH
            )
            
            # Get 6-month AI forecast
            ai_forecast = ai_forecaster.forecast_pulse_vector(
                pulse_table=pulse_table,
                pincode=pincode,
                horizon=HORIZON
            )
            
            # Build result row
            result = {
                "pincode": pincode,
                "state": hybrid_result.get("state", "Unknown"),
                # Current values
                "current_growth": hybrid_result.get("current", {}).get("growth", 0.0),
                "current_flow": hybrid_result.get("current", {}).get("flow", 0.0),
                "current_labor": hybrid_result.get("current", {}).get("labor", 0.0),
            }
            
            # Next month ensemble prediction
            ensemble = hybrid_result.get("ensemble")
            if ensemble:
                result["next_growth"] = ensemble.get("growth", 0.0)
                result["next_flow"] = ensemble.get("flow", 0.0)
                result["next_labor"] = ensemble.get("labor", 0.0)
            else:
                result["next_growth"] = result["current_growth"]
                result["next_flow"] = result["current_flow"]
                result["next_labor"] = result["current_labor"]
            
            # 6-month AI forecasts (serialize as JSON strings for parquet)
            if ai_forecast.get("growth_forecast"):
                result["forecast_growth"] = json.dumps(ai_forecast["growth_forecast"]["median"])
                result["forecast_growth_lower"] = json.dumps(ai_forecast["growth_forecast"]["lower_bound"])
                result["forecast_growth_upper"] = json.dumps(ai_forecast["growth_forecast"]["upper_bound"])
            else:
                result["forecast_growth"] = json.dumps([result["current_growth"]] * HORIZON)
                result["forecast_growth_lower"] = json.dumps([result["current_growth"]] * HORIZON)
                result["forecast_growth_upper"] = json.dumps([result["current_growth"]] * HORIZON)
                
            if ai_forecast.get("flow_forecast"):
                result["forecast_flow"] = json.dumps(ai_forecast["flow_forecast"]["median"])
                result["forecast_flow_lower"] = json.dumps(ai_forecast["flow_forecast"]["lower_bound"])
                result["forecast_flow_upper"] = json.dumps(ai_forecast["flow_forecast"]["upper_bound"])
            else:
                result["forecast_flow"] = json.dumps([result["current_flow"]] * HORIZON)
                result["forecast_flow_lower"] = json.dumps([result["current_flow"]] * HORIZON)
                result["forecast_flow_upper"] = json.dumps([result["current_flow"]] * HORIZON)
                
            if ai_forecast.get("labor_forecast"):
                result["forecast_labor"] = json.dumps(ai_forecast["labor_forecast"]["median"])
                result["forecast_labor_lower"] = json.dumps(ai_forecast["labor_forecast"]["lower_bound"])
                result["forecast_labor_upper"] = json.dumps(ai_forecast["labor_forecast"]["upper_bound"])
            else:
                result["forecast_labor"] = json.dumps([result["current_labor"]] * HORIZON)
                result["forecast_labor_lower"] = json.dumps([result["current_labor"]] * HORIZON)
                result["forecast_labor_upper"] = json.dumps([result["current_labor"]] * HORIZON)
            
            # Confidence and parallel info
            spatial_info = hybrid_result.get("spatial_parallels", {})
            result["confidence"] = spatial_info.get("confidence", 0.0)
            
            parallels = spatial_info.get("parallels", [])
            if parallels:
                result["parallel_states"] = ", ".join([p["state"] for p in parallels[:3]])
                result["top_parallel_1"] = parallels[0]["pincode"] if len(parallels) > 0 else None
                result["top_parallel_2"] = parallels[1]["pincode"] if len(parallels) > 1 else None
                result["top_parallel_3"] = parallels[2]["pincode"] if len(parallels) > 2 else None
            else:
                result["parallel_states"] = None
                result["top_parallel_1"] = None
                result["top_parallel_2"] = None
                result["top_parallel_3"] = None
            
            result["ensemble_method"] = hybrid_result.get("ensemble_method", "unknown")
            
            results.append(result)
            
        except Exception as e:
            print(f"Error processing PIN {pincode}: {e}")
            continue
    
    elapsed = time.time() - start_time
    print(f"\nCompleted {len(results)} predictions in {elapsed:.1f}s ({len(results)/elapsed:.1f}/sec)")
    
    # Convert to DataFrame and save
    predictions = pl.DataFrame(results)
    
    output_path = Path("data/output/predictions.parquet")
    predictions.write_parquet(output_path)
    print(f"\nSaved predictions to: {output_path}")
    print(f"File size: {output_path.stat().st_size / 1024:.1f} KB")
    
    # Show sample
    print("\n" + "-" * 70)
    print("SAMPLE PREDICTIONS")
    print("-" * 70)
    print(predictions.select([
        "pincode", "state", "current_growth", "next_growth", "confidence"
    ]).head(5))
    
    # Show stats
    print("\n" + "-" * 70)
    print("PREDICTION STATISTICS")
    print("-" * 70)
    print(f"Total predictions: {len(predictions)}")
    print(f"States covered: {predictions['state'].n_unique()}")
    print(f"Avg confidence: {predictions['confidence'].mean():.3f}")
    print(f"Forecast horizon: {HORIZON} months")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()
