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
import sys
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import polars as pl
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

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
    
    def __init__(self):
        self.pulse_vectors: Optional[pl.DataFrame] = None
        self.predictions: Optional[pl.DataFrame] = None
        self.district_mapping: Dict[str, Dict[str, List[str]]] = {}  # state -> {district -> [pins]}
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = 300  # 5 minutes
        self._initialized = False
        
    def initialize(self):
        """Load all data sources."""
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
            
        try:
            df = pl.read_csv(csv_files[0])
            if all(col in df.columns for col in ["state", "district", "pincode"]):
                for row in df.select(["state", "district", "pincode"]).unique().iter_rows(named=True):
                    state = self._normalize_state(str(row["state"]))
                    district = str(row["district"]).strip().title()
                    pincode = str(row["pincode"])
                    
                    if state not in self.district_mapping:
                        self.district_mapping[state] = {}
                    if district not in self.district_mapping[state]:
                        self.district_mapping[state][district] = []
                    if pincode not in self.district_mapping[state][district]:
                        self.district_mapping[state][district].append(pincode)
                        
                logger.info(f"✓ Built district mapping: {len(self.district_mapping)} states")
        except Exception as e:
            logger.warning(f"Could not build district mapping: {e}")
            
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
        def normalize(val: float) -> float:
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
        try:
            from datetime import date
            # Parse YYYY-MM format to first day of month
            year, mon = month_str.split('-')
            return date(int(year), int(mon), 1)
        except:
            return month_str  # Fallback to string comparison
            
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
        """
        if self.pulse_vectors is None:
            return []
            
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
            
        return sorted(results, key=lambda x: x.hotspot.intensity, reverse=True)
        
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
                district_id=f"{STATE_ID_MAP.get(state_normalized, 'XX')}_{district_name.replace(' ', '').upper()}",
                district_name=district_name,
                state_name=state_normalized,
                signals=signals,
                hotspot=self._calculate_hotspot(signals),
                pin_count=district_df.height,
                pincodes=pincodes[:20]  # Limit for response size
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
        """Search for locations matching query."""
        results = []
        query_lower = query.lower().strip()
        
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
                        "id": f"{STATE_ID_MAP.get(state, 'XX')}_{district[:3].upper()}",
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
        
    def initialize(self):
        """Initialize the chatbot instance."""
        if self._initialized:
            return
            
        try:
            # Try loading the new LangChain bot
            from src.langchain_bot import LangChainBot
            self.chatbot = LangChainBot()
            self._initialized = True
            logger.info("✓ LangChain Bot initialized")
        except ImportError:
             logger.warning("LangChain dependencies missing, falling back to legacy bot")
             try:
                 from chronos_chatbot import ChronosChatbot
                 self.chatbot = ChronosChatbot()
                 self._initialized = True
                 logger.info("✓ Legacy Chatbot initialized")
             except Exception as e:
                 logger.error(f"✗ Failed to initialize legacy chatbot: {e}")
        except Exception as e:
            logger.error(f"✗ Failed to initialize chatbot: {e}")
            
    async def process_message(self, message: str) -> Dict[str, Any]:
        """
        Process a chat message and return response.
        """
        if not self._initialized or self.chatbot is None:
            return {
                "text": "Chatbot is not available. Please try again later.",
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
            
        except Exception as e:
            logger.error(f"Chatbot error: {e}")
            return {
                "response": f"I encountered an error: {str(e)}",
                "locations": [],
                "action": None
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
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    states = data_engine.aggregate_by_state(month)
    national_avg = data_engine.get_national_averages(month)
    
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
    """Get all states with aggregated data."""
    return data_engine.aggregate_by_state(month)

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
        
    # Get state aggregation
    states = data_engine.aggregate_by_state(month)
    state_data = next((s for s in states if s.state_id == state_id.upper()), None)
    
    if not state_data:
        raise HTTPException(status_code=404, detail=f"No data for state: {state_id}")
        
    # Get districts
    districts = data_engine.aggregate_by_district(state_name, month)
    
    return {
        "state": state_data,
        "districts": districts,
        "district_count": len(districts)
    }

@app.get("/api/districts/{district_id}", response_model=DistrictAggregation, tags=["Map"])
async def get_district_detail(
    district_id: str,
    month: Optional[str] = Query(None, description="Filter by month")
):
    """Get detailed data for a specific district."""
    # Parse district ID (format: STATE_DIST)
    parts = district_id.split("_")
    if len(parts) != 2:
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
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid PIN code format")
        
    data = data_engine.get_pin_data(pincode)
    if not data:
        raise HTTPException(status_code=404, detail=f"No data for PIN: {pincode}")
        
    return data

@app.get("/api/pins/{pincode}/timeseries", tags=["PIN"])
async def get_pin_timeseries(pincode: str):
    """Get historical time series for a PIN code."""
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(status_code=400, detail="Invalid PIN code format")
        
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
            parts = loc.split("_")
            if len(parts) == 2:
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

# ═══════════════════════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINT (Real-time Chat)
# ═══════════════════════════════════════════════════════════════════════════════

class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Active: {len(self.active_connections)}")
        
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Active: {len(self.active_connections)}")
        
    async def send_json(self, websocket: WebSocket, data: dict):
        await websocket.send_json(data)

manager = ConnectionManager()

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    WebSocket endpoint for real-time AI chat.
    
    Message format:
    {
        "type": "message",
        "content": "What's happening in Mumbai?"
    }
    
    Response format:
    {
        "type": "response",
        "content": "Mumbai is showing...",
        "locations": ["Mumbai", "Maharashtra"],
        "action": {"type": "highlight"}
    }
    """
    await manager.connect(websocket)
    
    # Send welcome message
    await manager.send_json(websocket, {
        "type": "system",
        "content": "Connected to Chronos-X AI. Ask me anything about migration patterns, forecasts, or regional analysis!",
        "timestamp": datetime.now().isoformat()
    })
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                message = data.get("content", "")
                
                # Send typing indicator
                await manager.send_json(websocket, {
                    "type": "typing",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Process with chatbot
                result = await chatbot_bridge.process_message(message)
                
                # Send response
            # Receive text from client (expecting JSON structure)
            data_text = await websocket.receive_text()
            
            try:
                message_data = json.loads(data_text)
                user_content = message_data.get("content", "")
            except json.JSONDecodeError:
                # Fallback for plain text if any
                user_content = data_text
            
            if not user_content:
                continue

            # Process via LangChain Bot
            # The bot returns { "text": "...", "client_action": ... }
            result = await chatbot_bridge.process_message(user_content)
            
            # Map to Frontend Protocol: { "type": "response", "content": "...", "action": ... }
            response_payload = {
                "type": "response",
                "content": result.get("text"),
                "action": result.get("client_action")
            }
            
            # Send back JSON
            await websocket.send_json(response_payload)
            
    except WebSocketDisconnect:
        logger.info("Client disconnected from chat")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

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
