#!/usr/bin/env python3
"""
Chronos-X API Server
====================
FastAPI backend powering the god-tier Chronos-X dashboard.

Provides:
- REST endpoints for map data at state/district/PIN levels
- Real-time WebSocket for AI chatbot
- Aggregation engine for heatmap generation
- Time-series filtering for timeline navigation

Run:
    uvicorn api_server:app --reload --port 8000

Author: Chronos-X Team
"""

import asyncio
import json
import logging
import os
import re
import sys
import threading
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
import time
from typing import Any, Dict, List, Optional

import polars as pl
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    from security_utils import sanitize_for_prompt
except ImportError:
    # Fallback if import fails
    def sanitize_for_prompt(text: str) -> str:
        return text.strip()

# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("ChronosAPI")

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION (from environment)
# ═══════════════════════════════════════════════════════════════════════════════
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", 
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
).split(",")
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
MAX_WS_MESSAGE_SIZE = 10 * 1024  # 10KB max WebSocket message
MAX_WS_CONNECTIONS_PER_IP = int(os.getenv("MAX_WS_CONNECTIONS_PER_IP", "10"))
WS_RECEIVE_TIMEOUT_SECONDS = int(os.getenv("WS_RECEIVE_TIMEOUT_SECONDS", "300"))  # 5 minute timeout
MONTH_PATTERN = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')

# Forecast configuration
HISTORICAL_DATA_END = "2025-12"  # Last month with actual data
FORECAST_MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS (Pydantic)
# ═══════════════════════════════════════════════════════════════════════════════

class SignalData(BaseModel):
    """Three-dimensional signal decomposition."""
    growth: float = Field(..., description="Growth/Settlement signal (0-5 age enrollments)")
    flow: float = Field(..., description="Migration/Flow signal (demographic updates)")
    labor: float = Field(..., description="Labor intensity signal (biometric updates)")

class HotspotData(BaseModel):
    """Hotspot intensity for visualization."""
    intensity: float = Field(..., ge=0, le=1, description="Normalized intensity 0-1")
    level: str = Field(..., description="low/medium/high classification")
    pulse_speed: float = Field(..., description="Animation speed multiplier")

class StateAggregation(BaseModel):
    """State-level aggregated data for map."""
    state_id: str
    state_name: str
    signals: SignalData
    hotspot: HotspotData
    pin_count: int
    top_districts: List[str]
    trend: str = Field(..., description="rising/stable/falling")

class DistrictAggregation(BaseModel):
    """District-level data."""
    district_id: str
    district_name: str
    state_name: str
    signals: SignalData
    hotspot: HotspotData
    pin_count: int
    pincodes: List[str]

class PinCodeData(BaseModel):
    """Individual PIN code data."""
    pincode: str
    state: str
    district: Optional[str]
    signals: SignalData
    forecast: Optional[SignalData]
    confidence: Optional[float]
    parallel_states: Optional[List[str]]
    context: Optional[Dict[str, Any]]

class TimelineData(BaseModel):
    """Available time periods."""
    months: List[str]
    years: List[int]
    current_month: str
    data_range: Dict[str, str]

class ChatMessage(BaseModel):
    """Chat message structure."""
    role: str = Field(..., description="user/assistant/system")
    content: str
    locations: Optional[List[str]] = Field(None, description="Referenced locations")
    timestamp: Optional[str] = None

class MapDataResponse(BaseModel):
    """Complete map data for rendering."""
    states: List[StateAggregation]
    national_averages: SignalData
    month: str
    generated_at: str

class TrendDataPoint(BaseModel):
    """Single point in time series."""
    month: str
    growth: Optional[float] = None
    flow: Optional[float] = None
    labor: Optional[float] = None

class TrendResponse(BaseModel):
    """Time series data for trend charts."""
    location_id: str
    location_name: str
    location_type: str
    data: List[TrendDataPoint]
    data_range: Dict[str, str]

class ForecastResponse(BaseModel):
    """Forecast data with confidence bounds."""
    location_id: str
    location_name: str
    horizon: str
    forecast: SignalData
    confidence: float
    lower_bound: SignalData
    upper_bound: SignalData
    historical_accuracy: Optional[float] = None

# ═══════════════════════════════════════════════════════════════════════════════
# STATE GEOMETRY MAPPINGS (India specific)
# ═══════════════════════════════════════════════════════════════════════════════

# State name normalization (handle variations in data)
STATE_NAME_MAP = {
    "delhi": "Delhi",
    "ncr": "Delhi",
    "uttar pradesh": "Uttar Pradesh",
    "madhya pradesh": "Madhya Pradesh",
    "tamil nadu": "Tamil Nadu",
    "west bengal": "West Bengal",
    "andhra pradesh": "Andhra Pradesh",
    "arunachal pradesh": "Arunachal Pradesh",
    "himachal pradesh": "Himachal Pradesh",
    "jammu and kashmir": "Jammu & Kashmir",
    "jammu & kashmir": "Jammu & Kashmir",
    "maharashtra": "Maharashtra",
    "karnataka": "Karnataka",
    "gujarat": "Gujarat",
    "rajasthan": "Rajasthan",
    "bihar": "Bihar",
    "jharkhand": "Jharkhand",
    "odisha": "Odisha",
    "orissa": "Odisha",
    "kerala": "Kerala",
    "telangana": "Telangana",
    "punjab": "Punjab",
    "haryana": "Haryana",
    "uttarakhand": "Uttarakhand",
    "chhattisgarh": "Chhattisgarh",
    "assam": "Assam",
    "goa": "Goa",
    "sikkim": "Sikkim",
    "meghalaya": "Meghalaya",
    "manipur": "Manipur",
    "mizoram": "Mizoram",
    "tripura": "Tripura",
    "nagaland": "Nagaland",
    "chandigarh": "Chandigarh",
    "puducherry": "Puducherry",
    "pondicherry": "Puducherry",
    "dadra and nagar haveli": "Dadra & Nagar Haveli",
    "daman and diu": "Daman & Diu",
    "lakshadweep": "Lakshadweep",
    "andaman and nicobar islands": "Andaman & Nicobar",
    "ladakh": "Ladakh",
}

# State ID mapping for GeoJSON compatibility
STATE_ID_MAP = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR", 
    "Assam": "AS",
    "Bihar": "BR",
    "Chhattisgarh": "CT",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kerala": "KL",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Odisha": "OR",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TG",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UT",
    "West Bengal": "WB",
    "Delhi": "DL",
    "Jammu & Kashmir": "JK",
    "Ladakh": "LA",
    "Puducherry": "PY",
    "Chandigarh": "CH",
    "Andaman & Nicobar": "AN",
    "Dadra & Nagar Haveli": "DN",
    "Daman & Diu": "DD",
    "Lakshadweep": "LD",
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATA ENGINE (Singleton)
# ═══════════════════════════════════════════════════════════════════════════════

class ChronosDataEngine:
    """
    Central data engine for aggregations and caching.
    
    Loads pulse vectors and predictions, provides aggregations at various levels.
    """
    
    # Class-level lock for thread-safe initialization
    _init_lock = threading.Lock()
    
    def __init__(self):
        self.pulse_vectors: Optional[pl.DataFrame] = None
        self.predictions: Optional[pl.DataFrame] = None
        self.district_mapping: Dict[str, Dict[str, List[str]]] = {}  # state -> {district -> [pins]}
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 300  # 5 minutes
        self._cache_timestamps: Dict[str, float] = {}  # Track cache entry times for TTL
        self._cache_locks: Dict[str, threading.Lock] = {}  # Stampede protection
        self._cache_lock_master = threading.Lock()  # Lock for accessing cache_locks dict
        self._initialized = False
        
    def initialize(self):
        """Load all data sources. Thread-safe to prevent race conditions."""
        # Quick check before acquiring lock (double-checked locking pattern)
        if self._initialized:
            return
            
        with ChronosDataEngine._init_lock:
            # Re-check after acquiring lock
            if self._initialized:
                return
                
            base_path = Path(__file__).parent / "data" / "output"
            
            # Load pulse vectors
            pulse_path = base_path / "pulse_vectors.parquet"
            if pulse_path.exists():
                self.pulse_vectors = pl.read_parquet(pulse_path)
                logger.info(f"✓ Loaded pulse_vectors: {self.pulse_vectors.shape[0]:,} rows")
            else:
                logger.warning(f"✗ pulse_vectors.parquet not found at {pulse_path}")
                
            # Load predictions
            pred_path = base_path / "predictions.parquet"
            if pred_path.exists():
                self.predictions = pl.read_parquet(pred_path)
                logger.info(f"✓ Loaded predictions: {self.predictions.shape[0]:,} rows")
            else:
                logger.warning(f"✗ predictions.parquet not found at {pred_path}")
                
            # Build district mapping from demographic data
            self._build_district_mapping()
            
            # Correct merged UT state names in pulse_vectors based on district mapping
            self._correct_pulse_vectors_states()
            
            self._initialized = True
            logger.info("═" * 60)
            logger.info("Chronos Data Engine initialized successfully")
            logger.info("═" * 60)

        
    def _build_district_mapping(self):
        """Build state -> district -> pincodes mapping."""
        demo_dir = Path(__file__).parent / "data" / "api_data_aadhar_demographic"
        if not demo_dir.exists():
            return
            
        csv_files = list(demo_dir.glob("*.csv"))
        if not csv_files:
            return
        
        # Districts belonging to Daman & Diu (DD)
        DD_DISTRICTS = {"daman", "diu"}
            
        try:
            df = pl.read_csv(csv_files[0])
            if all(col in df.columns for col in ["state", "district", "pincode"]):
                for row in df.select(["state", "district", "pincode"]).unique().iter_rows(named=True):
                    raw_state = str(row["state"]).lower().strip()
                    district = str(row["district"]).strip().title()
                    pincode = str(row["pincode"])
                    
                    # Handle merged UT state: split based on district
                    if "dadra" in raw_state and "daman" in raw_state:
                        # This is the merged state - split based on district name
                        if district.lower() in DD_DISTRICTS:
                            state = "Daman & Diu"
                        else:
                            state = "Dadra & Nagar Haveli"
                    else:
                        state = self._normalize_state(str(row["state"]))
                    
                    if state not in self.district_mapping:
                        self.district_mapping[state] = {}
                    if district not in self.district_mapping[state]:
                        self.district_mapping[state][district] = []
                    if pincode not in self.district_mapping[state][district]:
                        self.district_mapping[state][district].append(pincode)
                        
                logger.info(f"✓ Built district mapping: {len(self.district_mapping)} states")
        except Exception as e:
            logger.warning(f"Could not build district mapping: {e}")
    
    def _correct_pulse_vectors_states(self):
        """
        Correct the merged UT state names in pulse_vectors based on pincode mapping.
        
        The source parquet may contain 'Dadra and Nagar Haveli and Daman and Diu' as
        a merged state name. We use the district mapping (which was built with proper
        splits) to find the correct state for each pincode.
        """
        if self.pulse_vectors is None:
            return
        
        # Build pincode -> corrected state mapping from district_mapping
        pincode_to_state = {}
        for state_name, districts in self.district_mapping.items():
            for district, pincodes in districts.items():
                for pin in pincodes:
                    pincode_to_state[pin] = state_name
        
        if not pincode_to_state:
            return
        
        # Check if we have any merged UT state entries to fix
        merged_ut_pattern = "dadra and nagar haveli and daman"
        
        states_in_data = self.pulse_vectors["state"].unique().to_list()
        has_merged_ut = any(merged_ut_pattern in str(s).lower() for s in states_in_data)
        
        if not has_merged_ut:
            return  # No correction needed
        
        try:
            # Create corrected state column based on pincode lookup
            def correct_state(row):
                pincode = str(row["pincode"])
                state = row["state"]
                if merged_ut_pattern in str(state).lower():
                    # Use mapping to get correct state
                    return pincode_to_state.get(pincode, state)
                return state
            
            # Apply correction using map
            corrected_states = []
            for row in self.pulse_vectors.iter_rows(named=True):
                corrected_states.append(correct_state(row))
            
            self.pulse_vectors = self.pulse_vectors.with_columns(
                pl.Series("state", corrected_states)
            )
            
            logger.info("✓ Corrected merged UT state names in pulse_vectors")
        except Exception as e:
            logger.warning(f"Could not correct pulse_vectors states: {e}")
            
    def _normalize_state(self, state: str) -> str:
        """Normalize state name to consistent format."""
        lower = state.lower().strip()
        return STATE_NAME_MAP.get(lower, state.title())
        
    def _calculate_hotspot(self, signals: SignalData) -> HotspotData:
        """
        Calculate hotspot intensity from signals.
        
        Uses weighted formula:
        - Growth: 0.3 weight (new settlements)
        - Flow: 0.4 weight (migration - primary indicator)
        - Labor: 0.3 weight (labor intensity)
        """
        # Normalize signals to 0-1 range (assuming they're already z-scores)
        # Clamp to reasonable range [-3, 3] then normalize
        # Handle None values safely - default to 0 (neutral, becomes 0.5 after normalization)
        def normalize(val: float) -> float:
            if val is None:
                return 0.5  # Neutral default when data is missing
            clamped = max(-3, min(3, val))
            return (clamped + 3) / 6
            
        g = normalize(signals.growth)
        f = normalize(signals.flow)
        l = normalize(signals.labor)

        
        # Weighted intensity
        intensity = 0.3 * g + 0.4 * f + 0.3 * l
        
        # Classification
        if intensity < 0.33:
            level = "low"
            pulse_speed = 0.5  # Slow pulse
        elif intensity < 0.66:
            level = "medium"
            pulse_speed = 1.0  # Normal pulse
        else:
            level = "high"
            pulse_speed = 2.0  # Fast pulse
            
        return HotspotData(intensity=round(intensity, 3), level=level, pulse_speed=pulse_speed)
        
    def _calculate_trend(self, current: float, previous: float) -> str:
        """Determine trend direction."""
        diff = current - previous
        if diff > 0.1:
            return "rising"
        elif diff < -0.1:
            return "falling"
        return "stable"
        
    def get_available_months(self) -> List[str]:
        """Get list of available months in data."""
        if self.pulse_vectors is None:
            return []
        # Handle both date objects and strings
        months_raw = self.pulse_vectors["month"].unique().to_list()
        months = []
        for m in months_raw:
            if hasattr(m, 'strftime'):  # It's a date/datetime object
                months.append(m.strftime("%Y-%m"))
            else:
                months.append(str(m))
        return sorted(months)
        
    def get_timeline_data(self) -> TimelineData:
        """Get timeline metadata."""
        months = self.get_available_months()
        years = sorted(set(m[:4] for m in months)) if months else []
        
        return TimelineData(
            months=months,
            years=[int(y) for y in years],
            current_month=months[-1] if months else "",
            data_range={
                "start": months[0] if months else "",
                "end": months[-1] if months else ""
            }
        )
        
    def _parse_month_filter(self, month_str: str):
        """Parse month string (YYYY-MM) to match the month column type."""
        if not month_str:
            return None
        # Validate format with regex
        if not MONTH_PATTERN.match(month_str):
            raise ValueError(f"Invalid month format: '{month_str}'. Expected YYYY-MM (e.g., 2025-01)")
        try:
            from datetime import date
            # Parse YYYY-MM format to first day of month
            year, mon = month_str.split('-')
            return date(int(year), int(mon), 1)
        except Exception as e:
            raise ValueError(f"Could not parse month '{month_str}': {e}")
            
    def get_national_averages(self, month: Optional[str] = None) -> SignalData:
        """Calculate national averages for signals."""
        if self.pulse_vectors is None:
            return SignalData(growth=0, flow=0, labor=0)
            
        df = self.pulse_vectors
        if month:
            month_val = self._parse_month_filter(month)
            df = df.filter(pl.col("month") == month_val)
            
        if df.height == 0:
            return SignalData(growth=0, flow=0, labor=0)
            
        return SignalData(
            growth=round(df["growth_norm"].mean(), 3),
            flow=round(df["flow_norm"].mean(), 3),
            labor=round(df["labor_norm"].mean(), 3)
        )
        
    def aggregate_by_state(self, month: Optional[str] = None) -> List[StateAggregation]:
        """
        Aggregate data at state level for map rendering.
        
        Returns list of state aggregations with signals, hotspots, and metadata.
        Uses caching with TTL to optimize repeated calls (important for trends).
        """
        if self.pulse_vectors is None:
            return []
        
        # Check cache first
        cache_key = f"state_agg_{month or 'latest'}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
            
        df = self.pulse_vectors
        
        # Filter by month if specified
        if month:
            month_val = self._parse_month_filter(month)
            df = df.filter(pl.col("month") == month_val)
        else:
            # Use latest month
            latest = df["month"].max()
            df = df.filter(pl.col("month") == latest)
            
        if df.height == 0:
            return []
            
        # Group by state
        state_agg = df.group_by("state").agg([
            pl.col("growth_norm").mean().alias("avg_growth"),
            pl.col("flow_norm").mean().alias("avg_flow"),
            pl.col("labor_norm").mean().alias("avg_labor"),
            pl.count().alias("pin_count"),
        ])
        
        results = []
        for row in state_agg.iter_rows(named=True):
            state_name = self._normalize_state(row["state"])
            state_id = STATE_ID_MAP.get(state_name, state_name[:2].upper())
            
            signals = SignalData(
                growth=round(row["avg_growth"], 3),
                flow=round(row["avg_flow"], 3),
                labor=round(row["avg_labor"], 3)
            )
            
            # Get top districts for this state
            top_districts = list(self.district_mapping.get(state_name, {}).keys())[:5]
            
            results.append(StateAggregation(
                state_id=state_id,
                state_name=state_name,
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=row["pin_count"],
                top_districts=top_districts,
                trend="stable"  # Would calculate from previous month
            ))
            
        results = sorted(results, key=lambda x: x.hotspot.intensity, reverse=True)
        
        # Cache the result
        self._set_cached(cache_key, results)
        return results
    
    def aggregate_forecast_by_state(self, month: str) -> List[StateAggregation]:
        """
        Aggregate FORECAST data at state level for future months.
        
        Reads from predictions_v2.parquet and extracts the appropriate month index.
        """
        import json
        
        # Check cache first
        cache_key = f"forecast_state_agg_{month}"
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached
        
        # Load predictions if not already loaded
        pred_path = Path(__file__).parent / "data" / "output" / "predictions_v2.parquet"
        if not pred_path.exists():
            logger.warning(f"Forecast file not found: {pred_path}")
            return []
        
        try:
            predictions_df = pl.read_parquet(pred_path)
        except Exception as e:
            logger.error(f"Failed to load predictions: {e}")
            return []
        
        # Determine month index (0 = Jan 2026, 5 = Jun 2026)
        try:
            month_idx = FORECAST_MONTHS.index(month)
        except ValueError:
            logger.warning(f"Month {month} not in forecast range")
            return []
        
        # Parse JSON arrays and extract the correct month value
        def extract_month_value(json_str, idx):
            try:
                arr = json.loads(json_str) if isinstance(json_str, str) else json_str
                if isinstance(arr, list) and len(arr) > idx:
                    return float(arr[idx])
                return 0.0
            except:
                return 0.0
        
        # Add extracted columns
        predictions_df = predictions_df.with_columns([
            pl.col("forecast_growth").map_elements(lambda x: extract_month_value(x, month_idx), return_dtype=pl.Float64).alias("growth_val"),
            pl.col("forecast_flow").map_elements(lambda x: extract_month_value(x, month_idx), return_dtype=pl.Float64).alias("flow_val"),
            pl.col("forecast_labor").map_elements(lambda x: extract_month_value(x, month_idx), return_dtype=pl.Float64).alias("labor_val"),
        ])
        
        # Group by state
        state_agg = predictions_df.group_by("state").agg([
            pl.col("growth_val").mean().alias("avg_growth"),
            pl.col("flow_val").mean().alias("avg_flow"),
            pl.col("labor_val").mean().alias("avg_labor"),
            pl.count().alias("pin_count"),
        ])
        
        results = []
        for row in state_agg.iter_rows(named=True):
            state_name = self._normalize_state(row["state"])
            state_id = STATE_ID_MAP.get(state_name, state_name[:2].upper())
            
            signals = SignalData(
                growth=round(row["avg_growth"] or 0.0, 3),
                flow=round(row["avg_flow"] or 0.0, 3),
                labor=round(row["avg_labor"] or 0.0, 3)
            )
            
            # Get top districts for this state
            top_districts = list(self.district_mapping.get(state_name, {}).keys())[:5]
            
            results.append(StateAggregation(
                state_id=state_id,
                state_name=state_name,
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=row["pin_count"],
                top_districts=top_districts,
                trend="forecast"  # Mark as forecast data
            ))
        
        results = sorted(results, key=lambda x: x.hotspot.intensity, reverse=True)
        
        # Cache the result
        self._set_cached(cache_key, results)
        logger.info(f"Served forecast data for {month} ({len(results)} states)")
        return results
    
    def _get_cached(self, key: str) -> Optional[Any]:
        """Get cached value if not expired."""
        if key in self._cache and key in self._cache_timestamps:
            if time.time() - self._cache_timestamps[key] < self._cache_ttl:
                return self._cache[key]
            else:
                # Expired, cleanup
                del self._cache[key]
                del self._cache_timestamps[key]
        return None
    
    def _set_cached(self, key: str, value: Any):
        """Set cached value with timestamp."""
        self._cache[key] = value
        self._cache_timestamps[key] = time.time()
    
    def _get_cache_lock(self, key: str) -> threading.Lock:
        """Get or create a lock for a specific cache key (stampede protection)."""
        with self._cache_lock_master:
            if key not in self._cache_locks:
                self._cache_locks[key] = threading.Lock()
            return self._cache_locks[key]
    
    def get_with_stampede_protection(self, key: str, compute_fn) -> Any:
        """
        Get cached value or compute it with stampede protection.
        
        Only one thread will compute the value; others wait for the result.
        """
        # Fast path: check cache without lock
        cached = self._get_cached(key)
        if cached is not None:
            return cached
        
        # Slow path: acquire per-key lock
        lock = self._get_cache_lock(key)
        with lock:
            # Double-check after acquiring lock (another thread may have populated)
            cached = self._get_cached(key)
            if cached is not None:
                return cached
            
            # Compute and cache
            result = compute_fn()
            self._set_cached(key, result)
            return result
        
    def aggregate_by_district(self, state: str, month: Optional[str] = None) -> List[DistrictAggregation]:
        """Aggregate data at district level for a specific state."""
        if self.pulse_vectors is None:
            return []
            
        state_normalized = self._normalize_state(state)
        districts = self.district_mapping.get(state_normalized, {})
        
        if not districts:
            return []
            
        df = self.pulse_vectors
        if month:
            month_val = self._parse_month_filter(month)
            df = df.filter(pl.col("month") == month_val)
        else:
            latest = df["month"].max()
            df = df.filter(pl.col("month") == latest)
        
        # Special case: Delhi - treat as single district since GeoJSON only has 1 feature
        if state_normalized == "Delhi":
            all_pincodes = [pin for pins in districts.values() for pin in pins]
            state_df = df.filter(pl.col("pincode").cast(str).is_in(all_pincodes))
            
            if state_df.height == 0:
                return []
            
            signals = SignalData(
                growth=round(state_df["growth_norm"].mean(), 3),
                flow=round(state_df["flow_norm"].mean(), 3),
                labor=round(state_df["labor_norm"].mean(), 3)
            )
            
            return [DistrictAggregation(
                district_id="DL_DELHI",
                district_name="Delhi",
                state_name="Delhi",
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=state_df.height,
                pincodes=all_pincodes[:20]
            )]
            
        results = []
        for district_name, pincodes in districts.items():
            # Filter to this district's pincodes
            district_df = df.filter(pl.col("pincode").cast(str).is_in(pincodes))
            
            if district_df.height == 0:
                continue
                
            signals = SignalData(
                growth=round(district_df["growth_norm"].mean(), 3),
                flow=round(district_df["flow_norm"].mean(), 3),
                labor=round(district_df["labor_norm"].mean(), 3)
            )
            
            results.append(DistrictAggregation(
                district_id=f"{STATE_ID_MAP.get(state_normalized, 'XX')}_{district_name.strip().upper().replace(' ', '_')}",
                district_name=district_name,
                state_name=state_normalized,
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=district_df.height,
                pincodes=pincodes[:20]  # Limit for response size
            ))
            
        return sorted(results, key=lambda x: x.hotspot.intensity, reverse=True)
    
    def aggregate_forecast_by_district(self, state: str, month: str) -> List[DistrictAggregation]:
        """
        Aggregate FORECAST data at district level for future months.
        """
        import json
        
        state_normalized = self._normalize_state(state)
        districts = self.district_mapping.get(state_normalized, {})
        
        if not districts:
            return []
        
        # Load predictions
        pred_path = Path(__file__).parent / "data" / "output" / "predictions_v2.parquet"
        if not pred_path.exists():
            return []
        
        try:
            predictions_df = pl.read_parquet(pred_path)
        except:
            return []
        
        # Get month index
        try:
            month_idx = FORECAST_MONTHS.index(month)
        except ValueError:
            return []
        
        # Parse JSON arrays
        def extract_month_value(json_str, idx):
            try:
                arr = json.loads(json_str) if isinstance(json_str, str) else json_str
                if isinstance(arr, list) and len(arr) > idx:
                    return float(arr[idx])
                return 0.0
            except:
                return 0.0
        
        # Filter to state and add extracted columns
        state_df = predictions_df.filter(pl.col("state") == state_normalized)
        if state_df.height == 0:
            # Try normalized matching
            state_df = predictions_df.filter(
                pl.col("state").str.to_lowercase() == state_normalized.lower()
            )
        
        if state_df.height == 0:
            return []
        
        state_df = state_df.with_columns([
            pl.col("forecast_growth").map_elements(lambda x: extract_month_value(x, month_idx), return_dtype=pl.Float64).alias("growth_val"),
            pl.col("forecast_flow").map_elements(lambda x: extract_month_value(x, month_idx), return_dtype=pl.Float64).alias("flow_val"),
            pl.col("forecast_labor").map_elements(lambda x: extract_month_value(x, month_idx), return_dtype=pl.Float64).alias("labor_val"),
        ])
        
        # Special case: Delhi - treat as single district since GeoJSON only has 1 feature
        if state_normalized == "Delhi":
            all_pincodes = [pin for pins in districts.values() for pin in pins]
            delhi_df = state_df.filter(pl.col("pincode").cast(str).is_in(all_pincodes))
            
            if delhi_df.height == 0:
                return []
            
            signals = SignalData(
                growth=round(delhi_df["growth_val"].mean() or 0.0, 3),
                flow=round(delhi_df["flow_val"].mean() or 0.0, 3),
                labor=round(delhi_df["labor_val"].mean() or 0.0, 3)
            )
            
            return [DistrictAggregation(
                district_id="DL_DELHI",
                district_name="Delhi",
                state_name="Delhi",
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=delhi_df.height,
                pincodes=all_pincodes[:20]
            )]
        
        results = []
        for district_name, pincodes in districts.items():
            # Filter to district's pincodes
            district_df = state_df.filter(pl.col("pincode").cast(str).is_in(pincodes))
            
            if district_df.height == 0:
                continue
            
            signals = SignalData(
                growth=round(district_df["growth_val"].mean() or 0.0, 3),
                flow=round(district_df["flow_val"].mean() or 0.0, 3),
                labor=round(district_df["labor_val"].mean() or 0.0, 3)
            )
            
            results.append(DistrictAggregation(
                district_id=f"{STATE_ID_MAP.get(state_normalized, 'XX')}_{district_name.strip().upper().replace(' ', '_')}",
                district_name=district_name,
                state_name=state_normalized,
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=district_df.height,
                pincodes=pincodes[:20]
            ))
        
        return sorted(results, key=lambda x: x.hotspot.intensity, reverse=True)
        
    def get_pin_data(self, pincode: str) -> Optional[PinCodeData]:
        """Get complete data for a specific PIN code."""
        if self.pulse_vectors is None:
            return None
            
        # Get latest data for this PIN
        pin_df = self.pulse_vectors.filter(pl.col("pincode").cast(str) == pincode)
        
        if pin_df.height == 0:
            return None
            
        # Get latest month's data
        latest = pin_df.sort("month", descending=True).head(1)
        row = latest.row(0, named=True)
        
        signals = SignalData(
            growth=round(row["growth_norm"], 3),
            flow=round(row["flow_norm"], 3),
            labor=round(row["labor_norm"], 3)
        )
        
        # Helper function to safely convert to float
        def safe_float(val, default=0.0):
            if val is None:
                return default
            try:
                return float(val)
            except (ValueError, TypeError):
                return default
        
        # Get prediction if available
        forecast = None
        confidence = None
        parallel_states = None
        
        if self.predictions is not None:
            pred_df = self.predictions.filter(pl.col("pincode").cast(str) == pincode)
            if pred_df.height > 0:
                pred_row = pred_df.row(0, named=True)
                forecast = SignalData(
                    growth=round(safe_float(pred_row.get("forecast_growth", 0)), 3),
                    flow=round(safe_float(pred_row.get("forecast_flow", 0)), 3),
                    labor=round(safe_float(pred_row.get("forecast_labor", 0)), 3)
                )
                confidence = safe_float(pred_row.get("confidence", None), None)
                parallel_states_raw = pred_row.get("parallel_states", None)
                if parallel_states_raw:
                    parallel_states = [parallel_states_raw] if isinstance(parallel_states_raw, str) else parallel_states_raw
                    
        # Find district
        district = None
        state = self._normalize_state(row["state"])
        for d_name, pins in self.district_mapping.get(state, {}).items():
            if pincode in pins:
                district = d_name
                break
                
        return PinCodeData(
            pincode=pincode,
            state=state,
            district=district,
            signals=signals,
            forecast=forecast,
            confidence=confidence,
            parallel_states=parallel_states,
            context=None
        )
        
    def get_time_series(self, pincode: str) -> List[Dict[str, Any]]:
        """Get time series data for a PIN code."""
        if self.pulse_vectors is None:
            return []
            
        pin_df = self.pulse_vectors.filter(
            pl.col("pincode").cast(str) == pincode
        ).sort("month")
        
        return [
            {
                "month": row["month"],
                "growth": round(row["growth_norm"], 3),
                "flow": round(row["flow_norm"], 3),
                "labor": round(row["labor_norm"], 3),
            }
            for row in pin_df.iter_rows(named=True)
        ]
        
    def search_locations(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for locations matching query. Input is sanitized for safety."""
        results = []
        
        # Input sanitization
        query = sanitize_for_prompt(query)[:100]  # Sanitize and limit length
        if not query:
            return []
        query_lower = query.lower()
        
        # Search states
        for state_name, state_id in STATE_ID_MAP.items():
            if query_lower in state_name.lower():
                results.append({
                    "type": "state",
                    "id": state_id,
                    "name": state_name,
                    "match_score": 1.0 if state_name.lower().startswith(query_lower) else 0.8
                })
                
        # Search districts
        for state, districts in self.district_mapping.items():
            for district in districts.keys():
                if query_lower in district.lower():
                    results.append({
                    "type": "district",
                    "id": f"{STATE_ID_MAP.get(state, 'XX')}_{district.strip().upper().replace(' ', '_')}",
                    "name": district,
                    "state": state,
                    "match_score": 1.0 if district.lower().startswith(query_lower) else 0.8
                })
                    
        # Search PIN codes
        if query.isdigit() and self.pulse_vectors is not None:
            matching_pins = self.pulse_vectors.filter(
                pl.col("pincode").cast(str).str.starts_with(query)
            ).select(["pincode", "state"]).unique().head(limit)
            
            for row in matching_pins.iter_rows(named=True):
                results.append({
                    "type": "pincode",
                    "id": str(row["pincode"]),
                    "name": str(row["pincode"]),
                    "state": self._normalize_state(row["state"]),
                    "match_score": 1.0
                })
                
        # Sort by match score and limit
        results.sort(key=lambda x: x["match_score"], reverse=True)
        return results[:limit]
    
    def get_similar_districts(
        self, 
        state_name: str, 
        district_name: str, 
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Find districts with similar pulse vector patterns (spatial similarity).
        
        Uses cosine similarity on the three-dimensional pulse vector (growth, flow, labor)
        to find "twin regions" across other states.
        
        Args:
            state_name: The state of the target district
            district_name: The target district name
            limit: Number of similar districts to return
            
        Returns:
            List of similar districts with name, state, signals, and similarity score
        """
        if self.pulse_vectors is None:
            return []
        
        # Get target district's signals
        target_signals = None
        state_normalized = self._normalize_state(state_name)
        districts_in_state = self.district_mapping.get(state_normalized, {})
        target_pincodes = districts_in_state.get(district_name, [])
        
        if not target_pincodes:
            # Try case-insensitive match
            for d_name, pins in districts_in_state.items():
                if d_name.lower() == district_name.lower():
                    target_pincodes = pins
                    district_name = d_name
                    break
        
        if not target_pincodes:
            return []
        
        # Get latest month data
        df = self.pulse_vectors
        latest = df["month"].max()
        df = df.filter(pl.col("month") == latest)
        
        # Calculate target district's mean signals
        target_df = df.filter(pl.col("pincode").cast(str).is_in(target_pincodes))
        if target_df.height == 0:
            return []
        
        target_vector = [
            target_df["growth_norm"].mean(),
            target_df["flow_norm"].mean(),
            target_df["labor_norm"].mean()
        ]
        
        # Get all other districts from OTHER states for cross-regional similarity
        similar_districts = []
        
        for other_state, other_districts in self.district_mapping.items():
            # Skip same state for true cross-regional learning
            if other_state == state_normalized:
                continue
                
            for other_district_name, other_pincodes in other_districts.items():
                other_df = df.filter(pl.col("pincode").cast(str).is_in(other_pincodes))
                
                if other_df.height == 0:
                    continue
                
                other_vector = [
                    other_df["growth_norm"].mean(),
                    other_df["flow_norm"].mean(),
                    other_df["labor_norm"].mean()
                ]
                
                # Compute cosine similarity
                import numpy as np
                target_arr = np.array(target_vector)
                other_arr = np.array(other_vector)
                
                norm_target = np.linalg.norm(target_arr)
                norm_other = np.linalg.norm(other_arr)
                
                if norm_target == 0 or norm_other == 0:
                    similarity = 0.0
                else:
                    similarity = float(np.dot(target_arr, other_arr) / (norm_target * norm_other))
                
                # Only include positive similarities
                if similarity > 0.5:
                    similar_districts.append({
                        "district_name": other_district_name,
                        "state_name": other_state,
                        "similarity": round(similarity, 3),
                        "signals": {
                            "growth": round(other_vector[0], 3),
                            "flow": round(other_vector[1], 3),
                            "labor": round(other_vector[2], 3)
                        }
                    })
        
        # Sort by similarity descending and return top N
        similar_districts.sort(key=lambda x: x["similarity"], reverse=True)
        return similar_districts[:limit]


# ═══════════════════════════════════════════════════════════════════════════════
# CHATBOT BRIDGE (WebSocket integration)
# ═══════════════════════════════════════════════════════════════════════════════

class ChatbotBridge:
    """
    Bridge to the existing Chronos chatbot.
    
    Wraps the ChronosChatbot class for WebSocket communication.
    """
    
    def __init__(self):
        self.chatbot = None
        self._initialized = False
        self._init_error: Optional[str] = None  # Track initialization error for better messages
        
    def initialize(self):
        """Initialize the chatbot instance."""
        if self._initialized:
            return
            
        try:
            # Try loading the new LangChain bot
            from src.langchain_bot import LangChainBot
            self.chatbot = LangChainBot()
            self._initialized = True
            self._init_error = None
            logger.info("✓ LangChain Bot initialized")
        except ImportError as ie:
             logger.warning(f"LangChain dependencies missing ({ie}), falling back to legacy bot")
             try:
                 from chronos_chatbot import ChronosChatbot
                 self.chatbot = ChronosChatbot()
                 self._initialized = True
                 self._init_error = None
                 logger.info("✓ Legacy Chatbot initialized")
             except Exception as e:
                 self._init_error = f"Legacy chatbot failed: {str(e)[:100]}"
                 logger.error(f"✗ Failed to initialize legacy chatbot: {e}")
        except Exception as e:
            self._init_error = f"LangChain bot failed: {str(e)[:100]}"
            logger.error(f"✗ Failed to initialize chatbot: {e}")
            
    def _is_streaming_supported(self) -> bool:
        """Check if the current chatbot supports streaming."""
        return (
            self._initialized 
            and self.chatbot is not None 
            and hasattr(self.chatbot, "process_message_stream")
        )
    
    async def process_message(self, message: str) -> Dict[str, Any]:
        """
        Process a chat message and return response.
        """
        if not self._initialized or self.chatbot is None:
            error_detail = f" Reason: {self._init_error}" if self._init_error else ""
            return {
                "text": f"Chatbot is not available.{error_detail} Please check server logs or try again later.",
                "client_action": None
            }
            
        try:
            # Check if it's the LangChain bot (has async process_message)
            if hasattr(self.chatbot, "process_message"):
                return await self.chatbot.process_message(message)
            
            # Legacy Fallback
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None, 
                self.chatbot.process_query, 
                message
            )
            
            # Extract locations mentioned in response
            locations = self._extract_locations(response)
            
            # Determine action based on response
            action = self._determine_action(message, response)
            
            return {
                "text": response,
                "client_action": action
            }
            
        except Exception as e:
            logger.error(f"Chatbot error: {e}")
            return {
                "text": f"I encountered an error: {str(e)}",
                "client_action": None
            }
    
    async def process_message_stream(self, message: str):
        """
        Process a chat message and yield streaming chunks for real-time UX.
        
        Yields:
            Dict with either:
            - {"type": "chunk", "content": "partial text"} for streaming content
            - {"type": "complete", "content": "full text", "client_action": {...}} at the end
        """
        if not self._initialized or self.chatbot is None:
            error_detail = f" Reason: {self._init_error}" if self._init_error else ""
            yield {
                "type": "complete",
                "content": f"Chatbot is not available.{error_detail} Please check server logs or try again later.",
                "client_action": None
            }
            return
        
        try:
            # Check if the bot supports streaming
            if hasattr(self.chatbot, "process_message_stream"):
                # Use the streaming interface from LangChain bot
                accumulated_text = ""
                client_action = None
                
                async for chunk in self.chatbot.process_message_stream(message):
                    if chunk.get("type") == "token":
                        accumulated_text += chunk.get("content", "")
                        yield {"type": "chunk", "content": chunk.get("content", "")}
                    elif chunk.get("type") == "action":
                        client_action = chunk.get("client_action")
                
                yield {
                    "type": "complete",
                    "content": accumulated_text,
                    "client_action": client_action
                }
            else:
                # Fallback: Non-streaming response, simulate with single chunk
                result = await self.process_message(message)
                # Simulate streaming by chunking the response
                text = result.get("text", "")
                chunk_size = 20  # Characters per chunk for simulation
                
                for i in range(0, len(text), chunk_size):
                    chunk = text[i:i + chunk_size]
                    yield {"type": "chunk", "content": chunk}
                    await asyncio.sleep(0.02)  # Small delay to simulate typing
                
                yield {
                    "type": "complete",
                    "content": text,
                    "client_action": result.get("client_action")
                }
                
        except Exception as e:
            logger.error(f"Streaming chatbot error: {e}")
            yield {
                "type": "complete",
                "content": f"I encountered an error: {str(e)}",
                "client_action": None
            }
            
    def _extract_locations(self, text: str) -> List[str]:
        """Extract location mentions from text."""
        locations = []
        
        # Check for state names
        for state in STATE_ID_MAP.keys():
            if state.lower() in text.lower():
                locations.append(state)
                
        # Check for PIN codes (6 digits)
        import re
        pins = re.findall(r'\b\d{6}\b', text)
        locations.extend(pins)
        
        return list(set(locations))[:5]  # Limit to 5
        
    def _determine_action(self, query: str, response: str) -> Optional[Dict[str, Any]]:
        """Determine frontend action based on query/response."""
        query_lower = query.lower()
        
        if "compare" in query_lower:
            return {"type": "compare", "mode": "split"}
        elif "show" in query_lower and "map" in query_lower:
            return {"type": "highlight"}
        elif "zoom" in query_lower:
            return {"type": "zoom"}
        elif "forecast" in query_lower or "predict" in query_lower:
            return {"type": "forecast", "show_confidence": True}
            
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

# Global instances
data_engine = ChronosDataEngine()
chatbot_bridge = ChatbotBridge()

# Terminal bot for district-level chat (lightweight, agent-free)
try:
    from terminal_bot import terminal_bot
    TERMINAL_BOT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Terminal bot not available: {e}")
    TERMINAL_BOT_AVAILABLE = False
    terminal_bot = None

# Copilot bot for comprehensive global chat (replaces slow LangChain agent)
try:
    from copilot_bot import copilot_bot
    COPILOT_BOT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Copilot bot not available: {e}")
    COPILOT_BOT_AVAILABLE = False
    copilot_bot = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - initialize on startup."""
    logger.info("═" * 60)
    logger.info("  Chronos-X API Server Starting...")
    logger.info("═" * 60)
    
    # Initialize data engine
    data_engine.initialize()
    
    # Initialize chatbot (optional - may fail if deps missing)
    try:
        chatbot_bridge.initialize()
    except Exception as e:
        logger.warning(f"Chatbot initialization skipped: {e}")
    
    # Initialize terminal bot (lightweight, for district chat)
    if TERMINAL_BOT_AVAILABLE and terminal_bot:
        try:
            terminal_bot.initialize()
            logger.info("Terminal bot initialized successfully")
        except Exception as e:
            logger.warning(f"Terminal bot initialization skipped: {e}")
    
    # Initialize copilot bot (comprehensive global chat)
    if COPILOT_BOT_AVAILABLE and copilot_bot:
        try:
            copilot_bot.set_data_engine(data_engine)  # Inject data engine for context
            copilot_bot.initialize()
            logger.info("Copilot bot initialized successfully")
        except Exception as e:
            logger.warning(f"Copilot bot initialization skipped: {e}")
    
    yield
    
    logger.info("Chronos-X API Server shutting down...")

app = FastAPI(
    title="Chronos-X API",
    description="Backend API for the Chronos-X UIDAI Dashboard",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info(f"CORS enabled for origins: {ALLOWED_ORIGINS}")

# Security middleware (rate limiting + security headers)
try:
    from middleware import add_security_middleware
    add_security_middleware(app)
except ImportError as e:
    logger.warning(f"Security middleware not loaded: {e}")

# ═══════════════════════════════════════════════════════════════════════════════
# REST ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "Chronos-X API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "data_loaded": data_engine._initialized,
        "chatbot_available": chatbot_bridge._initialized,
        "pulse_vectors_rows": data_engine.pulse_vectors.height if data_engine.pulse_vectors is not None else 0,
    }


# ───────────────────────────────────────────────────────────────────────────────
# TIMELINE ENDPOINTS
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/timeline", response_model=TimelineData, tags=["Timeline"])
async def get_timeline():
    """Get available time periods for the timeline slider."""
    return data_engine.get_timeline_data()

# ───────────────────────────────────────────────────────────────────────────────
# MAP DATA ENDPOINTS
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/map", response_model=MapDataResponse, tags=["Map"])
async def get_map_data(
    month: Optional[str] = Query(None, description="Filter by month (YYYY-MM format)")
):
    """
    Get complete map data for rendering.
    
    Returns all states with aggregated signals and hotspot data.
    """
    try:
        states = data_engine.aggregate_by_state(month)
        national_avg = data_engine.get_national_averages(month)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Determine which month we're returning
    timeline = data_engine.get_timeline_data()
    actual_month = month or timeline.current_month
    
    return MapDataResponse(
        states=states,
        national_averages=national_avg,
        month=actual_month,
        generated_at=datetime.now().isoformat()
    )

@app.get("/api/states", response_model=List[StateAggregation], tags=["Map"])
async def get_states(
    month: Optional[str] = Query(None, description="Filter by month")
):
    """Get all states with aggregated data (historical or forecast)."""
    try:
        # Route to forecast aggregation for future months
        if month and month > HISTORICAL_DATA_END:
            return data_engine.aggregate_forecast_by_state(month)
        return data_engine.aggregate_by_state(month)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/states/{state_id}", tags=["Map"])
async def get_state_detail(
    state_id: str,
    month: Optional[str] = Query(None, description="Filter by month")
):
    """Get detailed data for a specific state including districts."""
    # Find state by ID
    state_name = None
    for name, sid in STATE_ID_MAP.items():
        if sid == state_id.upper():
            state_name = name
            break
            
    if not state_name:
        raise HTTPException(status_code=404, detail=f"State not found: {state_id}")
    
    # Route to forecast or historical based on month
    is_forecast = month and month > HISTORICAL_DATA_END
    
    # Get state aggregation
    if is_forecast:
        states = data_engine.aggregate_forecast_by_state(month)
    else:
        states = data_engine.aggregate_by_state(month)
    
    state_data = next((s for s in states if s.state_id == state_id.upper()), None)
    
    if not state_data:
        raise HTTPException(status_code=404, detail=f"No data for state: {state_id}")
    
    # Get districts (forecast or historical)
    if is_forecast:
        districts = data_engine.aggregate_forecast_by_district(state_name, month)
    else:
        districts = data_engine.aggregate_by_district(state_name, month)
    
    return {
        "state": state_data,
        "districts": districts,
        "district_count": len(districts),
        "is_forecast": is_forecast
    }

@app.get("/api/districts/{district_id}", response_model=DistrictAggregation, tags=["Map"])
async def get_district_detail(
    district_id: str,
    month: Optional[str] = Query(None, description="Filter by month")
):
    """Get detailed data for a specific district."""
    # Parse district ID (format: STATE_DISTRICT_NAME where district name may contain underscores)
    parts = district_id.split("_", 1)  # Split only on first underscore
    if len(parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid district ID format")
        
    state_code = parts[0]
    
    # Find state name
    state_name = None
    for name, sid in STATE_ID_MAP.items():
        if sid == state_code.upper():
            state_name = name
            break
            
    if not state_name:
        raise HTTPException(status_code=404, detail=f"State not found: {state_code}")
        
    districts = data_engine.aggregate_by_district(state_name, month)
    district = next((d for d in districts if d.district_id == district_id.upper()), None)
    
    if not district:
        raise HTTPException(status_code=404, detail=f"District not found: {district_id}")
        
    return district

# ───────────────────────────────────────────────────────────────────────────────
# PIN CODE ENDPOINTS
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/pins/{pincode}", response_model=PinCodeData, tags=["PIN"])
async def get_pin_data(pincode: str):
    """Get complete data for a specific PIN code."""
    # Validate format AND range (Indian PIN codes: 100000-999999)
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid PIN code format")
    pin_int = int(pincode)
    if pin_int < 100000 or pin_int > 999999:
        raise HTTPException(status_code=400, detail="PIN code out of valid range (100000-999999)")
        
    data = data_engine.get_pin_data(pincode)
    if not data:
        raise HTTPException(status_code=404, detail=f"No data for PIN: {pincode}")
        
    return data

@app.get("/api/pins/{pincode}/timeseries", tags=["PIN"])
async def get_pin_timeseries(pincode: str):
    """Get historical time series for a PIN code."""
    # Validate format AND range
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid PIN code format")
    pin_int = int(pincode)
    if pin_int < 100000 or pin_int > 999999:
        raise HTTPException(status_code=400, detail="PIN code out of valid range (100000-999999)")
        
    series = data_engine.get_time_series(pincode)
    if not series:
        raise HTTPException(status_code=404, detail=f"No time series for PIN: {pincode}")
        
    return {"pincode": pincode, "series": series}

# ───────────────────────────────────────────────────────────────────────────────
# SEARCH ENDPOINT
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/search", tags=["Search"])
async def search_locations(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Max results")
):
    """Search for states, districts, or PIN codes."""
    results = data_engine.search_locations(q, limit)
    return {"query": q, "results": results, "count": len(results)}

# ───────────────────────────────────────────────────────────────────────────────
# COMPARISON ENDPOINT
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/compare", tags=["Analysis"])
async def compare_locations(
    loc1: str = Query(..., description="First location (state ID, district ID, or PIN)"),
    loc2: str = Query(..., description="Second location"),
    month: Optional[str] = Query(None, description="Month for comparison")
):
    """Compare two locations side by side."""
    
    # Sanitize location IDs
    loc1 = sanitize_for_prompt(loc1)
    loc2 = sanitize_for_prompt(loc2)

    # Additional validation for location IDs
    def validate_location_id(loc: str) -> bool:
        if not loc:
            return False
        # Only allow alphanumeric, underscore, and ampersand (for state names like "Jammu & Kashmir")
        import re
        return bool(re.match(r'^[a-zA-Z0-9_&\s]+$', loc))

    if not validate_location_id(loc1) or not validate_location_id(loc2):
        raise HTTPException(status_code=400, detail="Invalid location ID format")
    
    def get_location_data(loc: str):
        # Try as PIN code
        if loc.isdigit() and len(loc) == 6:
            return data_engine.get_pin_data(loc)
        # Try as state ID
        if len(loc) == 2:
            states = data_engine.aggregate_by_state(month)
            return next((s for s in states if s.state_id == loc.upper()), None)
        # Try as district ID
        if "_" in loc:
            parts = loc.split("_", 1)  # Split only on first underscore
            if len(parts) >= 2:
                # Find state and get district
                for name, sid in STATE_ID_MAP.items():
                    if sid == parts[0].upper():
                        districts = data_engine.aggregate_by_district(name, month)
                        return next((d for d in districts if d.district_id == loc.upper()), None)
        return None
        
    data1 = get_location_data(loc1)
    data2 = get_location_data(loc2)
    
    if not data1:
        raise HTTPException(status_code=404, detail=f"Location not found: {loc1}")
    if not data2:
        raise HTTPException(status_code=404, detail=f"Location not found: {loc2}")
        
    return {
        "location1": data1,
        "location2": data2,
        "month": month or data_engine.get_timeline_data().current_month
    }

# ───────────────────────────────────────────────────────────────────────────────
# TRENDS ENDPOINT (Time Series)
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/trends/{location_id}", response_model=TrendResponse, tags=["Analysis"])
async def get_trends(
    location_id: str,
    months: int = Query(default=12, ge=1, le=36, description="Number of months of data"),
    signals: Optional[str] = Query(None, description="Comma-separated signals to include: growth,flow,labor")
):
    """
    Get time series data for trend charts.
    
    Returns historical data points for the specified location.
    """
    # Parse signals filter
    signal_list = None
    if signals:
        signal_list = [s.strip().lower() for s in signals.split(",")]
        valid_signals = {"growth", "flow", "labor"}
        if not all(s in valid_signals for s in signal_list):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid signals. Must be comma-separated list of: growth, flow, labor"
            )
    
    # Determine location type and get data
    location_name = ""
    location_type = ""
    
    # PIN code (6 digits)
    if location_id.isdigit() and len(location_id) == 6:
        location_type = "pin"
        location_name = f"PIN {location_id}"
        series = data_engine.get_time_series(location_id)
        if not series:
            raise HTTPException(status_code=404, detail=f"No data for PIN: {location_id}")
            
        # Convert series to TrendDataPoint format
        trend_data = [
            TrendDataPoint(
                month=s["month"] if isinstance(s["month"], str) else s["month"].strftime("%Y-%m") if hasattr(s["month"], 'strftime') else str(s["month"]),
                growth=s.get("growth") if not signal_list or "growth" in signal_list else None,
                flow=s.get("flow") if not signal_list or "flow" in signal_list else None,
                labor=s.get("labor") if not signal_list or "labor" in signal_list else None
            )
            for s in series[-months:]
        ]
        
    # State ID (2 characters)
    elif len(location_id) == 2:
        location_type = "state"
        state_id = location_id.upper()
        
        # Find state name
        for name, sid in STATE_ID_MAP.items():
            if sid == state_id:
                location_name = name
                break
        
        if not location_name:
            raise HTTPException(status_code=404, detail=f"State not found: {location_id}")
        
        # Get monthly aggregations for this state
        timeline = data_engine.get_timeline_data()
        trend_data = []
        
        for month in timeline.months[-months:]:
            states = data_engine.aggregate_by_state(month)
            state_data = next((s for s in states if s.state_id == state_id), None)
            
            if state_data:
                trend_data.append(TrendDataPoint(
                    month=month,
                    growth=state_data.signals.growth if not signal_list or "growth" in signal_list else None,
                    flow=state_data.signals.flow if not signal_list or "flow" in signal_list else None,
                    labor=state_data.signals.labor if not signal_list or "labor" in signal_list else None
                ))
                
    # District ID (STATE_DIST format where district name may contain underscores)
    elif "_" in location_id:
        location_type = "district"
        parts = location_id.split("_", 1)  # Split only on first underscore
        if len(parts) < 2:
            raise HTTPException(status_code=400, detail="Invalid district ID format. Use STATE_DISTRICT")
        
        state_code = parts[0].upper()
        district_code = parts[1].upper()
        
        # Find state name
        state_name = None
        for name, sid in STATE_ID_MAP.items():
            if sid == state_code:
                state_name = name
                break
        
        if not state_name:
            raise HTTPException(status_code=404, detail=f"State not found: {state_code}")
        
        location_name = f"{district_code}, {state_name}"
        
        # Get monthly aggregations for this district
        timeline = data_engine.get_timeline_data()
        trend_data = []
        
        for month in timeline.months[-months:]:
            districts = data_engine.aggregate_by_district(state_name, month)
            district_data = next((d for d in districts if d.district_id == location_id.upper()), None)
            
            if district_data:
                trend_data.append(TrendDataPoint(
                    month=month,
                    growth=district_data.signals.growth if not signal_list or "growth" in signal_list else None,
                    flow=district_data.signals.flow if not signal_list or "flow" in signal_list else None,
                    labor=district_data.signals.labor if not signal_list or "labor" in signal_list else None
                ))
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid location ID. Use 6-digit PIN, 2-char state ID, or STATE_DISTRICT format"
        )
    
    if not trend_data:
        raise HTTPException(status_code=404, detail=f"No trend data for location: {location_id}")
    
    return TrendResponse(
        location_id=location_id.upper(),
        location_name=location_name,
        location_type=location_type,
        data=trend_data,
        data_range={
            "start": trend_data[0].month if trend_data else "",
            "end": trend_data[-1].month if trend_data else ""
        }
    )

# ───────────────────────────────────────────────────────────────────────────────
# FORECAST ENDPOINT
# ───────────────────────────────────────────────────────────────────────────────

@app.get("/api/forecast/{location_id}", response_model=ForecastResponse, tags=["Analysis"])
async def get_forecast(
    location_id: str,
    horizon: str = Query(default="1m", description="Forecast horizon: 1m, 3m, 6m")
):
    """
    Get forecast data with confidence bounds for a location.
    
    Returns predicted signals and uncertainty estimates.
    """
    # Validate horizon
    valid_horizons = {"1m", "3m", "6m"}
    if horizon not in valid_horizons:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid horizon. Must be one of: {', '.join(valid_horizons)}"
        )
    
    # PIN code forecast
    if location_id.isdigit() and len(location_id) == 6:
        data = data_engine.get_pin_data(location_id)
        if not data:
            raise HTTPException(status_code=404, detail=f"No data for PIN: {location_id}")
        
        if data.forecast is None:
            raise HTTPException(status_code=404, detail=f"No forecast available for PIN: {location_id}")
        
        # Calculate bounds based on confidence
        confidence = data.confidence or 0.5
        margin = (1 - confidence) * 1.5  # Higher uncertainty = wider bounds
        
        # Helper to clamp values to reasonable range
        def clamp(val: float, min_val: float = -5.0, max_val: float = 5.0) -> float:
            return max(min_val, min(max_val, val))
        
        return ForecastResponse(
            location_id=location_id,
            location_name=f"PIN {location_id}",
            horizon=horizon,
            forecast=data.forecast,
            confidence=confidence,
            lower_bound=SignalData(
                growth=round(clamp(data.forecast.growth - margin), 3),
                flow=round(clamp(data.forecast.flow - margin), 3),
                labor=round(clamp(data.forecast.labor - margin), 3)
            ),
            upper_bound=SignalData(
                growth=round(clamp(data.forecast.growth + margin), 3),
                flow=round(clamp(data.forecast.flow + margin), 3),
                labor=round(clamp(data.forecast.labor + margin), 3)
            ),
            historical_accuracy=None
        )
    
    # State/District forecasts - aggregate from underlying PINs
    elif len(location_id) == 2:
        # State forecast
        state_id = location_id.upper()
        state_name = None
        for name, sid in STATE_ID_MAP.items():
            if sid == state_id:
                state_name = name
                break
        
        if not state_name:
            raise HTTPException(status_code=404, detail=f"State not found: {location_id}")
        
        # Get state aggregation for forecast estimate
        states = data_engine.aggregate_by_state()
        state_data = next((s for s in states if s.state_id == state_id), None)
        
        if not state_data:
            raise HTTPException(status_code=404, detail=f"No data for state: {location_id}")
        
        # Estimate forecast as slight variation based on trend
        trend_factor = 1.05 if state_data.trend == "rising" else (0.95 if state_data.trend == "falling" else 1.0)
        
        forecast = SignalData(
            growth=round(state_data.signals.growth * trend_factor, 3),
            flow=round(state_data.signals.flow * trend_factor, 3),
            labor=round(state_data.signals.labor * trend_factor, 3)
        )
        
        # Confidence decreases with horizon
        horizon_confidence = {"1m": 0.75, "3m": 0.60, "6m": 0.45}
        confidence = horizon_confidence.get(horizon, 0.5)
        margin = (1 - confidence) * 1.5
        
        return ForecastResponse(
            location_id=state_id,
            location_name=state_name,
            horizon=horizon,
            forecast=forecast,
            confidence=confidence,
            lower_bound=SignalData(
                growth=round(forecast.growth - margin, 3),
                flow=round(forecast.flow - margin, 3),
                labor=round(forecast.labor - margin, 3)
            ),
            upper_bound=SignalData(
                growth=round(forecast.growth + margin, 3),
                flow=round(forecast.flow + margin, 3),
                labor=round(forecast.labor + margin, 3)
            ),
            historical_accuracy=0.72  # Placeholder
        )
    
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid location ID. Use 6-digit PIN or 2-char state ID"
        )

# ═══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINT (Real-time Chat)
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """Manage WebSocket connections with thread-safe operations and per-IP limits."""
    
    def __init__(self, max_per_ip: int = 10):
        self.active_connections: List[WebSocket] = []
        self._ip_connections: Dict[str, int] = defaultdict(int)  # Track connections per IP
        self._ws_to_ip: Dict[WebSocket, str] = {}  # Map websocket to its IP
        self._lock = threading.Lock()
        self._max_per_ip = max_per_ip
    
    def _get_client_ip(self, websocket: WebSocket) -> str:
        """Extract client IP from WebSocket connection."""
        # Check headers for proxied connections
        forwarded = websocket.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = websocket.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        
        # Direct connection
        if websocket.client:
            return websocket.client.host
        return "unknown"
        
    async def connect(self, websocket: WebSocket) -> bool:
        """Accept connection if under per-IP limit. Returns True if accepted."""
        client_ip = self._get_client_ip(websocket)
        
        with self._lock:
            # Check per-IP limit
            if self._ip_connections[client_ip] >= self._max_per_ip:
                logger.warning(f"Connection limit ({self._max_per_ip}) exceeded for IP: {client_ip}")
                return False
        
        # Accept the connection first
        await websocket.accept()
        
        with self._lock:
            self.active_connections.append(websocket)
            self._ip_connections[client_ip] += 1
            self._ws_to_ip[websocket] = client_ip
            logger.info(f"WebSocket connected from {client_ip}. Active: {len(self.active_connections)}. IP count: {self._ip_connections[client_ip]}")
        
        return True
        
    def disconnect(self, websocket: WebSocket):
        """Safely disconnect a WebSocket, handling cases where it may already be removed."""
        with self._lock:
            try:
                if websocket in self.active_connections:
                    self.active_connections.remove(websocket)
                
                # Decrement IP connection count
                client_ip = self._ws_to_ip.pop(websocket, None)
                if client_ip and self._ip_connections.get(client_ip, 0) > 0:
                    self._ip_connections[client_ip] -= 1
                    if self._ip_connections[client_ip] == 0:
                        del self._ip_connections[client_ip]
            except ValueError:
                pass  # Already removed, ignore
            logger.info(f"WebSocket disconnected. Active: {len(self.active_connections)}")
    
    def cleanup_stale(self):
        """Remove any stale connections (defensive cleanup)."""
        with self._lock:
            # Filter out connections that are no longer open
            original_count = len(self.active_connections)
            self.active_connections = [
                ws for ws in self.active_connections 
                if ws.client_state.name == "CONNECTED"
            ]
            removed = original_count - len(self.active_connections)
            if removed > 0:
                logger.info(f"Cleaned up {removed} stale connections")
        
    async def send_json(self, websocket: WebSocket, data: dict):
        await websocket.send_json(data)
    
    async def receive_text_with_timeout(
        self, 
        websocket: WebSocket, 
        timeout: int = WS_RECEIVE_TIMEOUT_SECONDS
    ) -> str:
        """
        Receive text from WebSocket with a timeout.
        
        Raises:
            asyncio.TimeoutError: If no message received within timeout.
            WebSocketDisconnect: If client disconnects.
        """
        return await asyncio.wait_for(websocket.receive_text(), timeout=timeout)

# Separate managers for each WebSocket type to isolate per-IP limits
chat_manager = ConnectionManager(max_per_ip=MAX_WS_CONNECTIONS_PER_IP)
terminal_manager = ConnectionManager(max_per_ip=MAX_WS_CONNECTIONS_PER_IP)
compare_manager = ConnectionManager(max_per_ip=MAX_WS_CONNECTIONS_PER_IP)
copilot_manager = ConnectionManager(max_per_ip=MAX_WS_CONNECTIONS_PER_IP)

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for real-time AI chat.
    
    Message format (from client):
    {
        "type": "message",
        "content": "What's happening in Mumbai?"
    }
    
    Response format (to client):
    {
        "type": "response" | "system" | "typing",
        "content": "Mumbai is showing...",
        "action": {"type": "FLY_TO", "payload": "Delhi"}
    }
    """
    # Check connection limit
    if not await chat_manager.connect(websocket):
        # Connection rejected - limit exceeded
        # Can't send message since connection wasn't accepted
        return
    
    # Send welcome message
    try:
        await chat_manager.send_json(websocket, {
            "type": "system",
            "content": "Connected to Chronos-X AI. Ask me anything about migration patterns, forecasts, or regional analysis!",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Failed to send welcome message: {e}")
        chat_manager.disconnect(websocket)
        return
    
    try:
        while True:
            # Receive raw text from client with timeout
            try:
                raw_data = await chat_manager.receive_text_with_timeout(websocket)
            
            except asyncio.TimeoutError:
                # Client idle for too long
                logger.info("Chat WebSocket timed out - closing connection")
                await chat_manager.send_json(websocket, {
                    "type": "system",
                    "content": "Connection timed out due to inactivity. Please reconnect.",
                    "timestamp": datetime.now().isoformat()
                })
                break
            
            # Check message size limit
            if len(raw_data) > MAX_WS_MESSAGE_SIZE:
                await chat_manager.send_json(websocket, {
                    "type": "error",
                    "content": f"Message too large. Maximum size is {MAX_WS_MESSAGE_SIZE // 1024}KB.",
                    "timestamp": datetime.now().isoformat()
                })
                continue
            
            # Parse JSON or fallback to plain text
            user_content = ""
            try:
                message_data = json.loads(raw_data)
                # Support both {type: "message", content: "..."} and {content: "..."}
                user_content = message_data.get("content", "")
            except json.JSONDecodeError:
                # Plain text fallback
                user_content = raw_data
            
            # Sanitize user content
            user_content = sanitize_for_prompt(user_content)

            # Skip empty messages
            if not user_content:
                continue
            
            # Send typing indicator
            try:
                await chat_manager.send_json(websocket, {
                    "type": "typing",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception:
                pass  # Non-critical, continue processing
            
            # Process with chatbot using streaming for better UX
            try:
                # Notify client that streaming is starting
                await chat_manager.send_json(websocket, {
                    "type": "stream_start",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Stream chunks to client
                async for chunk in chatbot_bridge.process_message_stream(user_content):
                    if chunk.get("type") == "chunk":
                        # Send individual token/chunk
                        await chat_manager.send_json(websocket, {
                            "type": "stream",
                            "content": chunk.get("content", "")
                        })
                    elif chunk.get("type") == "complete":
                        # Send final message with complete content and action
                        await chat_manager.send_json(websocket, {
                            "type": "stream_end",
                            "content": chunk.get("content", ""),
                            "action": chunk.get("client_action"),
                            "timestamp": datetime.now().isoformat()
                        })
                        
            except Exception as e:
                logger.error(f"Chatbot processing error: {e}")
                await chat_manager.send_json(websocket, {
                    "type": "response",
                    "content": "I encountered an error processing your request. Please try again.",
                    "action": None,
                    "timestamp": datetime.now().isoformat()
                })
            
    except WebSocketDisconnect:
        logger.info("Client disconnected from chat")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        chat_manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════════════════════
# COPILOT WEBSOCKET (Comprehensive, Fast Global Chat)
# ═══════════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/copilot")
async def websocket_copilot(websocket: WebSocket):
    """
    WebSocket endpoint for the enhanced Chronos Copilot.
    Fast, comprehensive chat with NO auto-navigation.
    
    Handles:
    - State queries
    - District queries
    - Pincode queries
    - Forecast queries
    - Comparison queries
    - Spatial similarity
    
    Message format (from client):
    {
        "type": "message",
        "content": "What's happening in Maharashtra?"
    }
    
    Response format (to client):
    {
        "type": "stream_start" | "stream" | "stream_end",
        "content": "...",
        "timestamp": "..."
    }
    """
    # Check connection limit
    if not await copilot_manager.connect(websocket):
        return
    
    # Check copilot availability
    if not COPILOT_BOT_AVAILABLE or copilot_bot is None:
        try:
            await copilot_manager.send_json(websocket, {
                "type": "system",
                "content": "Copilot is not available. Please check server configuration.",
                "timestamp": datetime.now().isoformat()
            })
        except Exception:
            pass
        copilot_manager.disconnect(websocket)
        return
    
    # Send welcome message
    try:
        await copilot_manager.send_json(websocket, {
            "type": "system",
            "content": "Connected to Chronos-X AI. Ask me anything about migration patterns, forecasts, or regional analysis!",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Copilot: Failed to send welcome: {e}")
        copilot_manager.disconnect(websocket)
        return
    
    session_id = f"copilot_{id(websocket)}"
    
    try:
        while True:
            # Receive message with timeout
            try:
                raw_data = await copilot_manager.receive_text_with_timeout(websocket)
            except asyncio.TimeoutError:
                logger.info("Copilot WebSocket timed out - closing connection")
                await copilot_manager.send_json(websocket, {
                    "type": "system",
                    "content": "Connection timed out due to inactivity.",
                    "timestamp": datetime.now().isoformat()
                })
                break
            
            # Check message size
            if len(raw_data) > MAX_WS_MESSAGE_SIZE:
                await copilot_manager.send_json(websocket, {
                    "type": "error",
                    "content": f"Message too large. Max size is {MAX_WS_MESSAGE_SIZE // 1024}KB.",
                    "timestamp": datetime.now().isoformat()
                })
                continue
            
            # Parse message
            try:
                message_data = json.loads(raw_data)
                user_content = message_data.get("content", "")
            except json.JSONDecodeError:
                user_content = raw_data
            
            # Sanitize user content
            user_content = sanitize_for_prompt(user_content)

            # Skip empty messages
            if not user_content:
                continue
            
            # Send typing indicator
            try:
                await copilot_manager.send_json(websocket, {
                    "type": "typing",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception:
                pass
            
            # Stream response from copilot bot
            try:
                await copilot_manager.send_json(websocket, {
                    "type": "stream_start",
                    "timestamp": datetime.now().isoformat()
                })
                
                async for chunk in copilot_bot.stream_response(
                    message=user_content,
                    session_id=session_id
                ):
                    if chunk.get("type") == "token":
                        await copilot_manager.send_json(websocket, {
                            "type": "stream",
                            "content": chunk.get("content", "")
                        })
                    elif chunk.get("type") == "complete":
                        await copilot_manager.send_json(websocket, {
                            "type": "stream_end",
                            "content": chunk.get("content", ""),
                            "timestamp": datetime.now().isoformat()
                        })
                        
            except Exception as e:
                logger.error(f"Copilot streaming error: {e}")
                await copilot_manager.send_json(websocket, {
                    "type": "response",
                    "content": "I encountered an error. Please try again.",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from Copilot")
    except Exception as e:
        logger.error(f"Copilot WebSocket error: {e}")
    finally:
        if copilot_bot:
            copilot_bot.clear_session(session_id)
        copilot_manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════════════════════
# TERMINAL CHAT WEBSOCKET (Lightweight, District-specific)
# ═══════════════════════════════════════════════════════════════════════════════

@app.websocket("/ws/terminal-chat")
async def websocket_terminal_chat(websocket: WebSocket):
    """
    WebSocket endpoint for terminal chat (district view).
    Uses lightweight bot with direct LLM streaming - no agent overhead.
    
    Message format (from client):
    {
        "type": "message",
        "content": "Why is growth so high?",
        "session_id": "MH_MUMBAI",  // District ID
        "context": {
            "location": "Mumbai",
            "type": "district",
            "state": "Maharashtra",
            "signals": {"growth": 0.82, "flow": 0.45, "labor": 0.67}
        }
    }
    
    Response format (to client):
    {
        "type": "stream_start" | "stream" | "stream_end",
        "content": "...",
        "timestamp": "..."
    }
    """
    # Check connection limit
    if not await terminal_manager.connect(websocket):
        return
    
    # Check terminal bot availability
    if not TERMINAL_BOT_AVAILABLE or terminal_bot is None:
        try:
            await terminal_manager.send_json(websocket, {
                "type": "system",
                "content": "Terminal chat is not available. Please use the main chat.",
                "timestamp": datetime.now().isoformat()
            })
        except Exception:
            pass
        terminal_manager.disconnect(websocket)
        return
    
    # Send welcome message
    try:
        await terminal_manager.send_json(websocket, {
            "type": "system",
            "content": "Terminal ready. Ask about this location's signals and trends.",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Terminal chat: Failed to send welcome: {e}")
        terminal_manager.disconnect(websocket)
        return
    
    current_session_id: Optional[str] = None
    
    try:
        while True:
            # Receive message with timeout
            try:
                raw_data = await terminal_manager.receive_text_with_timeout(websocket)
            except asyncio.TimeoutError:
                logger.info("Terminal WebSocket timed out - closing connection")
                await terminal_manager.send_json(websocket, {
                    "type": "system",
                    "content": "Connection timed out due to inactivity.",
                    "timestamp": datetime.now().isoformat()
                })
                break
            
            # Check message size
            if len(raw_data) > MAX_WS_MESSAGE_SIZE:
                await terminal_manager.send_json(websocket, {
                    "type": "error",
                    "content": f"Message too large. Max size is {MAX_WS_MESSAGE_SIZE // 1024}KB.",
                    "timestamp": datetime.now().isoformat()
                })
                continue
            
            # Parse message
            try:
                message_data = json.loads(raw_data)
                user_content = message_data.get("content", "")
                session_id = message_data.get("session_id", "default")
                context = message_data.get("context", {})
            except json.JSONDecodeError:
                user_content = raw_data
                session_id = "default"
                context = {}
            
            # Sanitize user content
            user_content = sanitize_for_prompt(user_content)

            # Skip empty messages
            if not user_content:
                continue
            
            # Clear session if district changed
            if current_session_id is not None and current_session_id != session_id:
                terminal_bot.clear_session(current_session_id)
                logger.debug(f"Terminal: Session switched from {current_session_id} to {session_id}")
            
            current_session_id = session_id
            
            # Enrich context with spatial similarity data
            if context.get("type") == "district" and context.get("location") and context.get("state"):
                try:
                    similar_districts = data_engine.get_similar_districts(
                        state_name=context["state"],
                        district_name=context["location"],
                        limit=3
                    )
                    if similar_districts:
                        context["similar_districts"] = similar_districts
                        logger.debug(f"Terminal: Found {len(similar_districts)} similar districts for {context['location']}")
                except Exception as e:
                    logger.warning(f"Could not fetch similar districts: {e}")
            
            # Send typing indicator
            try:
                await terminal_manager.send_json(websocket, {
                    "type": "typing",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception:
                pass
            
            # Stream response from terminal bot
            try:
                # Notify client that streaming started
                await terminal_manager.send_json(websocket, {
                    "type": "stream_start",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Stream tokens
                async for chunk in terminal_bot.stream_response(
                    message=user_content,
                    context=context,
                    session_id=session_id
                ):
                    if chunk.get("type") == "token":
                        await terminal_manager.send_json(websocket, {
                            "type": "stream",
                            "content": chunk.get("content", "")
                        })
                    elif chunk.get("type") == "complete":
                        await terminal_manager.send_json(websocket, {
                            "type": "stream_end",
                            "content": chunk.get("content", ""),
                            "timestamp": datetime.now().isoformat()
                        })
                        
            except Exception as e:
                logger.error(f"Terminal chat streaming error: {e}")
                await terminal_manager.send_json(websocket, {
                    "type": "response",
                    "content": "I encountered an error. Please try again.",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from terminal chat")
    except Exception as e:
        logger.error(f"Terminal WebSocket error: {e}")
    finally:
        # Clean up session on disconnect
        if current_session_id:
            terminal_bot.clear_session(current_session_id)
        terminal_manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════════════════════
# COMPARISON WEBSOCKET (AI-Powered Region Comparison)
# ═══════════════════════════════════════════════════════════════════════════════

# Comparison-focused system prompt
COMPARISON_SYSTEM_PROMPT = """You are **Chronos-X Comparative Analyst**, an AI that provides strategic resource allocation recommendations based on Aadhaar demand signals.

## 📊 COMPARISON DATA

### Location 1: {loc1_name} ({loc1_type})
- **Growth Signal**: {loc1_growth:.2f} (New settlements, child 0-5 enrolments)
- **Flow Signal**: {loc1_flow:.2f} (Migration patterns, address updates)
- **Labor Signal**: {loc1_labor:.2f} (Workforce activity, biometric updates)
- **Hotspot Intensity**: {loc1_hotspot:.1%}

### Location 2: {loc2_name} ({loc2_type})
- **Growth Signal**: {loc2_growth:.2f} (New settlements, child 0-5 enrolments)
- **Flow Signal**: {loc2_flow:.2f} (Migration patterns, address updates)
- **Labor Signal**: {loc2_labor:.2f} (Workforce activity, biometric updates)
- **Hotspot Intensity**: {loc2_hotspot:.1%}

---

## 🎯 YOUR TASK

Provide a **concise, decisive comparative analysis** that answers:

1. **Which region needs more attention?** — Based on signal magnitudes, identify the priority region
2. **What's the key difference?** — Highlight the most significant signal gap (growth, flow, or labor)
3. **Resource allocation recommendation** — Be specific: "Shift X% of mobile units from Y to Z" or "Add 2 permanent centres in X"
4. **Cross-regional strategy** — Can these regions share resources? Consider:
   - Mobile camps rotating between them
   - Shared weekend overflow capacity
   - Peak-hour load balancing (if labor signals differ)

---

## 📋 RESPONSE GUIDELINES

- **Be decisive** — Don't hedge. Make a clear recommendation.
- **Use actual numbers** — Reference the signal values to sound data-driven.
- **Keep it actionable** — Tell UIDAI exactly what to do.
- **3-5 sentences max** — This is a summary, not a report.
- **Professional tone** — Sound like a senior UIDAI planning officer.

Example tone: "Given Mumbai's significantly higher Growth signal (0.82 vs 0.45), new enrolment demand is concentrated there. Recommend deploying 60% of mobile camps to Mumbai, with remaining capacity on rotation to Pune for weekend overflow during high-flow periods."
"""


@app.websocket("/ws/compare")
async def websocket_compare(websocket: WebSocket):
    """
    WebSocket endpoint for AI-powered region comparison.
    
    Message format (from client):
    {
        "type": "compare_request",
        "location1": {
            "name": "Mumbai",
            "type": "district",
            "signals": {"growth": 0.82, "flow": 0.45, "labor": 0.67},
            "hotspot": {"intensity": 0.75}
        },
        "location2": {
            "name": "Pune",
            "type": "district",
            "signals": {"growth": 0.45, "flow": 0.52, "labor": 0.38},
            "hotspot": {"intensity": 0.42}
        }
    }
    
    Response format (to client):
    {
        "type": "stream" | "stream_end" | "error",
        "content": "...",
        "timestamp": "..."
    }
    """
    # Check connection limit
    if not await compare_manager.connect(websocket):
        return
    
    # Check terminal bot availability (we reuse its LLM setup)
    if not TERMINAL_BOT_AVAILABLE or terminal_bot is None or terminal_bot.llm is None:
        try:
            await compare_manager.send_json(websocket, {
                "type": "error",
                "message": "AI comparison not available. Using fallback.",
                "timestamp": datetime.now().isoformat()
            })
        except Exception:
            pass
        compare_manager.disconnect(websocket)
        return
    
    try:
        while True:
            # Receive message with timeout
            try:
                raw_data = await compare_manager.receive_text_with_timeout(websocket)
            except asyncio.TimeoutError:
                logger.info("Compare WebSocket timed out - closing connection")
                break
            
            # Check message size
            if len(raw_data) > MAX_WS_MESSAGE_SIZE:
                await compare_manager.send_json(websocket, {
                    "type": "error",
                    "message": f"Message too large. Max size is {MAX_WS_MESSAGE_SIZE // 1024}KB.",
                    "timestamp": datetime.now().isoformat()
                })
                continue
            
            # Parse message
            try:
                message_data = json.loads(raw_data)
            except json.JSONDecodeError:
                await compare_manager.send_json(websocket, {
                    "type": "error",
                    "message": "Invalid JSON format.",
                    "timestamp": datetime.now().isoformat()
                })
                continue
            
            # Check message type
            if message_data.get("type") != "compare_request":
                continue
            
            # Extract location data
            loc1 = message_data.get("location1", {})
            loc2 = message_data.get("location2", {})
            
            loc1_signals = loc1.get("signals", {})
            loc2_signals = loc2.get("signals", {})
            loc1_hotspot = loc1.get("hotspot", {})
            loc2_hotspot = loc2.get("hotspot", {})
            
            # Build the comparison prompt
            system_prompt = COMPARISON_SYSTEM_PROMPT.format(
                loc1_name=loc1.get("name", "Location 1"),
                loc1_type=loc1.get("type", "region"),
                loc1_growth=loc1_signals.get("growth", 0),
                loc1_flow=loc1_signals.get("flow", 0),
                loc1_labor=loc1_signals.get("labor", 0),
                loc1_hotspot=loc1_hotspot.get("intensity", 0),
                loc2_name=loc2.get("name", "Location 2"),
                loc2_type=loc2.get("type", "region"),
                loc2_growth=loc2_signals.get("growth", 0),
                loc2_flow=loc2_signals.get("flow", 0),
                loc2_labor=loc2_signals.get("labor", 0),
                loc2_hotspot=loc2_hotspot.get("intensity", 0)
            )
            
            # Generate AI response using terminal bot's LLM
            try:
                from langchain_core.messages import SystemMessage, HumanMessage
                
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=f"Compare {loc1.get('name', 'Location 1')} with {loc2.get('name', 'Location 2')} and provide your recommendation.")
                ]
                
                # Stream the response
                accumulated_text = ""
                
                async for chunk in terminal_bot.llm.astream(messages):
                    if chunk.content:
                        accumulated_text += chunk.content
                        await compare_manager.send_json(websocket, {
                            "type": "stream",
                            "content": chunk.content
                        })
                
                # Send completion message
                await compare_manager.send_json(websocket, {
                    "type": "stream_end",
                    "content": accumulated_text,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                logger.error(f"Comparison AI error: {e}")
                await compare_manager.send_json(websocket, {
                    "type": "error",
                    "message": "AI generation failed. Please try again.",
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        logger.info("Client disconnected from comparison WebSocket")
    except Exception as e:
        logger.error(f"Comparison WebSocket error: {e}")
    finally:
        compare_manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    print("""
    ╔═══════════════════════════════════════════════════════════════════════════╗
    ║                                                                           ║
    ║   ██████╗██╗  ██╗██████╗  ██████╗ ███╗   ██╗ ██████╗ ███████╗             ║
    ║  ██╔════╝██║  ██║██╔══██╗██╔═══██╗████╗  ██║██╔═══██╗██╔════╝             ║
    ║  ██║     ███████║██████╔╝██║   ██║██╔██╗ ██║██║   ██║███████╗             ║
    ║  ██║     ██╔══██║██╔══██╗██║   ██║██║╚██╗██║██║   ██║╚════██║             ║
    ║  ╚██████╗██║  ██║██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝███████║             ║
    ║   ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝             ║
    ║                                                                           ║
    ║                        API Server v2.0.0                                  ║
    ║                                                                           ║
    ╚═══════════════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
