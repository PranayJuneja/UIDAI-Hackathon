"""
Chronos-X Copilot Bot
======================
Comprehensive, unified AI assistant for the Chronos-X dashboard.
Replaces the slow LangChain agent with direct LLM streaming.

Features:
- Answers ANY question about Aadhaar analytics
- State/district/pincode queries
- Forecast queries
- Comparison queries
- Spatial similarity
- No auto-navigation (user stays in control)
"""

import os
import re
import logging
import time
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime

from security_utils import sanitize_for_prompt
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger("CopilotBot")

# Comprehensive system prompt for the Copilot
COPILOT_SYSTEM_PROMPT = """You are **Chronos-X Copilot**, the AI-powered analytics engine for UIDAI's Aadhaar ecosystem.

## 🎯 Your Mission
You answer ANY question about Aadhaar demand signals across India. You have access to real-time data for states, districts, and PIN codes.

## 📊 Understanding Pulse Vector Signals

Each location has three key signals (normalized 0.0 to 1.0):

1. **Growth Signal** → New Aadhaar enrollments (primarily 0-5 age group)
   - HIGH (>0.7): Birth registration surge, new settlements forming
   - MODERATE (0.4-0.7): Steady population growth
   - LOW (<0.4): Mature population, focus on updates

2. **Flow Signal** → Address updates, migration patterns
   - HIGH (>0.7): Active migration corridor, significant demographic movement
   - MODERATE (0.4-0.7): Normal mobility patterns
   - LOW (<0.4): Stable resident population

3. **Labor Signal** → Biometric updates (working population)
   - HIGH (>0.7): Industrial activity, frequent workforce updates
   - MODERATE (0.4-0.7): Normal employment activity
   - LOW (<0.4): Lower workforce density

## 🔮 Forecasting

For future months (2026+), we use **Amazon Chronos** foundation model for spatial-temporal forecasting.
Always mention this when discussing forecasts: "Based on Chronos ML predictions..."

## 🔗 Spatial Similarity

We identify "twin regions" - districts across India with similar demand patterns.
These are useful for cross-regional resource pooling and learning from analogous experiences.

## 📋 Response Guidelines

1. **Be data-driven**: Quote actual signal values when you have them
2. **Be actionable**: Provide specific recommendations (e.g., "+3 stations", "extend hours 6-8PM")
3. **Be concise**: 3-5 sentences for simple queries, more detail only when asked
4. **Be decisive**: Don't hedge - analyze and recommend with confidence
5. **Sound professional**: Like a senior UIDAI planning officer

## 📍 Current Context
{context}

---

Answer the user's question based on the data provided. If you don't have specific data for their query, provide general guidance and suggest what data would be helpful.
"""


class CopilotBot:
    """
    Unified Copilot for the Chronos-X dashboard.
    Handles all query types with direct LLM streaming.
    """
    
    SESSION_TTL_SECONDS = 1800  # 30 minutes
    CLEANUP_INTERVAL_SECONDS = 300  # 5 minutes
    MAX_SESSIONS = 100  # Prevent unbounded memory growth
    MAX_HISTORY_MESSAGES = 10
    MAX_INPUT_LENGTH = 1000  # Limit input size
    
    def __init__(self):
        """Initialize the Copilot bot."""
        self.sessions: Dict[str, List] = {}
        self._session_timestamps: Dict[str, float] = {}
        self._last_cleanup = time.time()
        self._initialized = False
        self._init_error: Optional[str] = None
        self.llm: Optional[ChatOpenAI] = None
        self._data_engine = None  # Set externally to avoid circular imports
        
    def set_data_engine(self, engine):
        """Set the data engine for context injection."""
        self._data_engine = engine
    
    def _cleanup_expired_sessions(self, force: bool = False):
        """
        Remove expired sessions to prevent memory bloat.
        
        Args:
            force: If True, also remove oldest sessions if over capacity.
        """
        now = time.time()
        self._last_cleanup = now
        
        # Find and remove expired sessions
        expired = [
            sid for sid, ts in self._session_timestamps.items()
            if now - ts > self.SESSION_TTL_SECONDS
        ]
        
        for sid in expired:
            self.clear_session(sid)
        
        if expired:
            logger.info(f"CopilotBot: Cleaned up {len(expired)} expired sessions")
        
        # Force cleanup oldest if still over capacity
        if force and len(self.sessions) >= self.MAX_SESSIONS:
            sorted_sessions = sorted(
                self._session_timestamps.items(),
                key=lambda x: x[1]
            )
            to_remove = len(self.sessions) - self.MAX_SESSIONS + 10
            for sid, _ in sorted_sessions[:to_remove]:
                self.clear_session(sid)
            logger.info(f"CopilotBot: Force-removed {to_remove} oldest sessions")
        
    def initialize(self):
        """Initialize the LLM. Call this once at startup."""
        try:
            api_key = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("OPENAI_API_KEY")
            base_url = os.environ.get("AI_GATEWAY_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
            
            if not base_url and os.environ.get("AI_GATEWAY_API_KEY"):
                base_url = "https://gateway.ai.vercel.dev/v1"
            
            model = os.environ.get("AI_MODEL", "gpt-3.5-turbo")
            
            if not api_key:
                self._init_error = "No API key found"
                logger.warning("CopilotBot: No API key found")
                return
            
            self.llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url,
                temperature=0.3,
                streaming=True,
                max_tokens=800,  # Slightly more for comprehensive responses
                model_kwargs={
                    "extra_headers": {
                        "HTTP-Referer": "https://uidai-hackathon.vercel.app",
                        "X-Title": "Chronos Copilot"
                    }
                }
            )
            
            self._initialized = True
            logger.info(f"CopilotBot initialized with model: {model}")
            
        except Exception as e:
            self._init_error = str(e)
            logger.error(f"CopilotBot initialization failed: {e}")
    
    def get_session_history(self, session_id: str) -> List:
        """Get or create a session's chat history. Triggers periodic cleanup."""
        now = time.time()
        
        # Trigger cleanup periodically
        if now - self._last_cleanup > self.CLEANUP_INTERVAL_SECONDS:
            self._cleanup_expired_sessions()
        
        if session_id not in self.sessions:
            # Check if we're at capacity
            if len(self.sessions) >= self.MAX_SESSIONS:
                self._cleanup_expired_sessions(force=True)
            self.sessions[session_id] = []
        
        self._session_timestamps[session_id] = now
        return self.sessions[session_id]
    
    def clear_session(self, session_id: str):
        """Clear a session's chat history."""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self._session_timestamps:
            del self._session_timestamps[session_id]
    
    # Major cities/districts mapped to their states for context lookup
    CITY_TO_STATE = {
        # Maharashtra
        'mumbai': 'Maharashtra', 'pune': 'Maharashtra', 'nagpur': 'Maharashtra', 
        'thane': 'Maharashtra', 'nashik': 'Maharashtra', 'aurangabad': 'Maharashtra',
        # Karnataka
        'bangalore': 'Karnataka', 'bengaluru': 'Karnataka', 'mysore': 'Karnataka', 'mysuru': 'Karnataka',
        # Tamil Nadu
        'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu',
        # Telangana
        'hyderabad': 'Telangana', 'secunderabad': 'Telangana', 'warangal': 'Telangana',
        # Gujarat
        'ahmedabad': 'Gujarat', 'surat': 'Gujarat', 'vadodara': 'Gujarat', 'rajkot': 'Gujarat',
        # Rajasthan
        'jaipur': 'Rajasthan', 'jodhpur': 'Rajasthan', 'udaipur': 'Rajasthan',
        # Uttar Pradesh
        'lucknow': 'Uttar Pradesh', 'kanpur': 'Uttar Pradesh', 'varanasi': 'Uttar Pradesh',
        'agra': 'Uttar Pradesh', 'noida': 'Uttar Pradesh', 'ghaziabad': 'Uttar Pradesh',
        # West Bengal
        'kolkata': 'West Bengal', 'howrah': 'West Bengal', 'durgapur': 'West Bengal',
        # Bihar
        'patna': 'Bihar', 'gaya': 'Bihar', 'bhagalpur': 'Bihar',
        # Kerala
        'kochi': 'Kerala', 'cochin': 'Kerala', 'thiruvananthapuram': 'Kerala', 'trivandrum': 'Kerala',
        # Punjab
        'ludhiana': 'Punjab', 'amritsar': 'Punjab', 'chandigarh': 'Punjab',
        # Madhya Pradesh
        'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh', 'gwalior': 'Madhya Pradesh',
        # Haryana
        'gurgaon': 'Haryana', 'gurugram': 'Haryana', 'faridabad': 'Haryana',
        # Delhi
        'delhi': 'Delhi', 'new delhi': 'Delhi',
        # Andhra Pradesh
        'visakhapatnam': 'Andhra Pradesh', 'vizag': 'Andhra Pradesh', 'vijayawada': 'Andhra Pradesh',
        # Odisha
        'bhubaneswar': 'Odisha', 'cuttack': 'Odisha',
        # Jharkhand
        'ranchi': 'Jharkhand', 'jamshedpur': 'Jharkhand',
        # Chhattisgarh
        'raipur': 'Chhattisgarh', 'bilaspur': 'Chhattisgarh',
        # Assam
        'guwahati': 'Assam', 'dibrugarh': 'Assam',
    }
    
    # State abbreviation mapping
    STATE_ABBREV = {
        'up': 'Uttar Pradesh', 'mp': 'Madhya Pradesh', 'tn': 'Tamil Nadu',
        'ap': 'Andhra Pradesh', 'wb': 'West Bengal', 'mh': 'Maharashtra',
        'raj': 'Rajasthan', 'guj': 'Gujarat', 'kar': 'Karnataka', 'ker': 'Kerala',
        'hp': 'Himachal Pradesh', 'uk': 'Uttarakhand', 'jk': 'Jammu & Kashmir',
    }
    
    def _detect_query_intent(self, message: str) -> Dict[str, Any]:
        """
        Detect query intent using keyword/pattern matching.
        Returns dict with query_type and extracted entities.
        """
        msg_lower = message.lower()
        intent = {"type": "general", "entities": {}}
        
        # Pincode detection (6 digits)
        pincode_match = re.search(r'\b(\d{6})\b', message)
        if pincode_match:
            intent["type"] = "pincode"
            intent["entities"]["pincode"] = pincode_match.group(1)
            return intent
        
        # Comparison detection
        compare_patterns = [
            r'compare\s+(.+?)\s+(?:and|vs|versus|with)\s+(.+)',
            r'(.+?)\s+vs\s+(.+)',
            r'difference\s+between\s+(.+?)\s+and\s+(.+)',
        ]
        for pattern in compare_patterns:
            match = re.search(pattern, msg_lower)
            if match:
                intent["type"] = "comparison"
                intent["entities"]["location1"] = match.group(1).strip()
                intent["entities"]["location2"] = match.group(2).strip()
                return intent
        
        # Forecast detection
        forecast_keywords = ['forecast', 'predict', 'prediction', 'future', 'next month', 'next quarter', '2026']
        if any(kw in msg_lower for kw in forecast_keywords):
            intent["type"] = "forecast"
        
        # Similarity detection
        similarity_keywords = ['similar', 'like', 'twin', 'parallel']
        if any(kw in msg_lower for kw in similarity_keywords):
            intent["type"] = "similarity"
        
        # Hotspot/ranking detection
        hotspot_keywords = ['hotspot', 'top', 'highest', 'lowest', 'ranking', 'rank', 'demand', 'across india', 'all states']
        if any(kw in msg_lower for kw in hotspot_keywords):
            intent["type"] = "hotspots"
        
        # City/District detection (check before states for specificity)
        for city, state in self.CITY_TO_STATE.items():
            if city in msg_lower:
                intent["entities"]["city"] = city.title()
                intent["entities"]["state"] = state
                if intent["type"] == "general":
                    intent["type"] = "district"
                break
        
        # State detection (common Indian states)
        if "state" not in intent["entities"]:
            states = [
                'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
                'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
                'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
                'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
                'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi',
            ]
            for state in states:
                if state in msg_lower:
                    intent["type"] = "state" if intent["type"] == "general" else intent["type"]
                    intent["entities"]["state"] = state.title()
                    break
            
            # Also check abbreviations
            if "state" not in intent["entities"]:
                for abbrev, full_name in self.STATE_ABBREV.items():
                    # Match abbreviation as whole word
                    if re.search(rf'\b{abbrev}\b', msg_lower):
                        intent["type"] = "state" if intent["type"] == "general" else intent["type"]
                        intent["entities"]["state"] = full_name
                        break
        
        return intent
    
    def _build_context(self, message: str, intent: Dict[str, Any]) -> str:
        """Build context string based on query intent and data engine."""
        if not self._data_engine:
            return "No real-time data available. Providing general guidance."
        
        context_parts = []
        
        try:
            query_type = intent.get("type", "general")
            entities = intent.get("entities", {})
            state_name = entities.get("state", "")
            city_name = entities.get("city", "")
            
            if query_type == "pincode":
                pincode = entities.get("pincode")
                if pincode:
                    pin_data = self._data_engine.get_pin_data(pincode)
                    if pin_data:
                        context_parts.append(f"## Pincode: {pincode}")
                        context_parts.append(f"- State: {pin_data.state}")
                        context_parts.append(f"- District: {pin_data.district or 'Unknown'}")
                        context_parts.append(f"- Growth: {pin_data.signals.growth:.2f}")
                        context_parts.append(f"- Flow: {pin_data.signals.flow:.2f}")
                        context_parts.append(f"- Labor: {pin_data.signals.labor:.2f}")
                        if pin_data.forecast:
                            context_parts.append(f"\n**Forecast (Chronos ML):**")
                            context_parts.append(f"- Forecast Growth: {pin_data.forecast.growth:.2f}")
                            context_parts.append(f"- Forecast Flow: {pin_data.forecast.flow:.2f}")
                            context_parts.append(f"- Forecast Labor: {pin_data.forecast.labor:.2f}")
                    else:
                        context_parts.append(f"No data found for pincode {pincode}")
            
            elif query_type == "comparison":
                loc1 = entities.get("location1", "")
                loc2 = entities.get("location2", "")
                context_parts.append(f"## Comparison Request: {loc1} vs {loc2}")
                
                # Try to get state data for both
                states = self._data_engine.aggregate_by_state()
                for state in states:
                    name_lower = state.state_name.lower()
                    if loc1.lower() in name_lower or name_lower in loc1.lower():
                        context_parts.append(f"\n**{state.state_name}:**")
                        context_parts.append(f"- Growth: {state.signals.growth:.2f}")
                        context_parts.append(f"- Flow: {state.signals.flow:.2f}")
                        context_parts.append(f"- Labor: {state.signals.labor:.2f}")
                        context_parts.append(f"- Hotspot: {state.hotspot.level} ({state.hotspot.intensity:.0%})")
                    if loc2.lower() in name_lower or name_lower in loc2.lower():
                        context_parts.append(f"\n**{state.state_name}:**")
                        context_parts.append(f"- Growth: {state.signals.growth:.2f}")
                        context_parts.append(f"- Flow: {state.signals.flow:.2f}")
                        context_parts.append(f"- Labor: {state.signals.labor:.2f}")
                        context_parts.append(f"- Hotspot: {state.hotspot.level} ({state.hotspot.intensity:.0%})")
            
            elif query_type == "hotspots":
                # ALWAYS provide comprehensive hotspot data
                states = self._data_engine.aggregate_by_state()
                context_parts.append("## Current Hotspot Analysis Across India\n")
                
                # Categorize states by growth trend
                high_growth = [s for s in states if s.signals.growth >= 0.5]
                declining = [s for s in states if s.signals.growth < 0.3]
                
                context_parts.append("### 🔥 HIGH DEMAND STATES (Growth ≥ 0.5)")
                if high_growth:
                    for state in sorted(high_growth, key=lambda x: x.signals.growth, reverse=True)[:5]:
                        context_parts.append(f"- **{state.state_name}**: Growth {state.signals.growth:.2f}, Flow {state.signals.flow:.2f}, Labor {state.signals.labor:.2f}")
                else:
                    context_parts.append("- No states currently at HIGH growth levels")
                
                context_parts.append("\n### 📉 DECLINING/STABLE STATES (Growth < 0.3)")
                if declining:
                    for state in sorted(declining, key=lambda x: x.signals.growth)[:5]:
                        context_parts.append(f"- **{state.state_name}**: Growth {state.signals.growth:.2f}, Flow {state.signals.flow:.2f}, Labor {state.signals.labor:.2f}")
                else:
                    context_parts.append("- No states currently in decline")
                
                context_parts.append("\n### 📊 TOP 10 HOTSPOTS BY INTENSITY")
                for i, state in enumerate(states[:10], 1):
                    context_parts.append(f"{i}. **{state.state_name}**: {state.hotspot.intensity:.0%} intensity ({state.hotspot.level})")
            
            elif query_type == "forecast":
                # Get forecast data - now properly uses state from city detection
                forecast_months = ["2026-01", "2026-02", "2026-03"]
                context_parts.append("## Forecast Data (Chronos ML Predictions)\n")
                
                if state_name:
                    # Get forecast for the specific state
                    context_parts.append(f"### {state_name} Forecast")
                    if city_name:
                        context_parts.append(f"*City focus: {city_name}*\n")
                    
                    for month in forecast_months:
                        try:
                            forecast_data = self._data_engine.aggregate_forecast_by_state(month)
                            for state in forecast_data:
                                if state_name.lower() in state.state_name.lower():
                                    context_parts.append(f"**{month}:**")
                                    context_parts.append(f"- Growth: {state.signals.growth:.2f}")
                                    context_parts.append(f"- Flow: {state.signals.flow:.2f}")
                                    context_parts.append(f"- Labor: {state.signals.labor:.2f}")
                                    break
                        except Exception:
                            pass
                    
                    # Also include district-level forecast if available
                    if city_name:
                        try:
                            district_forecasts = self._data_engine.aggregate_forecast_by_district(state_name, "2026-01")
                            for district in district_forecasts:
                                if city_name.lower() in district.district_name.lower():
                                    context_parts.append(f"\n**{city_name} District (2026-01):**")
                                    context_parts.append(f"- Growth: {district.signals.growth:.2f}")
                                    context_parts.append(f"- Flow: {district.signals.flow:.2f}")
                                    context_parts.append(f"- Labor: {district.signals.labor:.2f}")
                                    break
                        except Exception:
                            pass
                else:
                    # No specific location - show top states forecast
                    context_parts.append("### National Forecast Summary (2026-01)")
                    try:
                        forecast_data = self._data_engine.aggregate_forecast_by_state("2026-01")
                        for state in forecast_data[:5]:
                            context_parts.append(f"- **{state.state_name}**: Growth {state.signals.growth:.2f}, Flow {state.signals.flow:.2f}, Labor {state.signals.labor:.2f}")
                    except Exception:
                        context_parts.append("Forecast data unavailable")
            
            elif query_type == "district" or city_name:
                # City/district specific query
                if city_name and state_name:
                    context_parts.append(f"## {city_name}, {state_name}\n")
                    
                    # Get state data first
                    states = self._data_engine.aggregate_by_state()
                    for state in states:
                        if state_name.lower() in state.state_name.lower():
                            context_parts.append(f"**State Overview ({state.state_name}):**")
                            context_parts.append(f"- Growth: {state.signals.growth:.2f} ({state.signals.growth*100:.0f}%)")
                            context_parts.append(f"- Flow: {state.signals.flow:.2f} ({state.signals.flow*100:.0f}%)")
                            context_parts.append(f"- Labor: {state.signals.labor:.2f} ({state.signals.labor*100:.0f}%)")
                            context_parts.append(f"- Hotspot: {state.hotspot.level.upper()} ({state.hotspot.intensity:.0%})")
                            break
                    
                    # Try to get district-level data
                    try:
                        districts = self._data_engine.aggregate_by_district(state_name)
                        found_district = None
                        for district in districts:
                            if city_name.lower() in district.district_name.lower():
                                found_district = district
                                break
                        
                        if found_district:
                            context_parts.append(f"\n**{found_district.district_name} District:**")
                            context_parts.append(f"- Growth: {found_district.signals.growth:.2f}")
                            context_parts.append(f"- Flow: {found_district.signals.flow:.2f}")
                            context_parts.append(f"- Labor: {found_district.signals.labor:.2f}")
                            context_parts.append(f"- Hotspot: {found_district.hotspot.level} ({found_district.hotspot.intensity:.0%})")
                            context_parts.append(f"- PIN codes: {found_district.pin_count}")
                        else:
                            context_parts.append(f"\n*District-level data for {city_name} not available, using state data.*")
                    except Exception as e:
                        logger.debug(f"District lookup failed: {e}")
                    
                    # Add forecast data for this location
                    context_parts.append(f"\n**Forecast (2026-01):**")
                    try:
                        forecast_data = self._data_engine.aggregate_forecast_by_state("2026-01")
                        for state in forecast_data:
                            if state_name.lower() in state.state_name.lower():
                                context_parts.append(f"- Forecast Growth: {state.signals.growth:.2f}")
                                context_parts.append(f"- Forecast Flow: {state.signals.flow:.2f}")
                                context_parts.append(f"- Forecast Labor: {state.signals.labor:.2f}")
                                break
                    except Exception:
                        context_parts.append("- Forecast data unavailable")
            
            elif query_type == "state" or state_name:
                # State-specific query - COMPREHENSIVE
                target_state = state_name
                states = self._data_engine.aggregate_by_state()
                for state in states:
                    if target_state.lower() in state.state_name.lower() or state.state_name.lower() in target_state.lower():
                        context_parts.append(f"## {state.state_name} - Complete Analysis\n")
                        
                        # Current state overview
                        context_parts.append("### Current Enrollment Statistics")
                        context_parts.append(f"- Total PIN codes: {state.pin_count:,}")
                        context_parts.append(f"- **Growth Signal**: {state.signals.growth:.2f} ({state.signals.growth*100:.0f}%) - New enrollments (0-5 age)")
                        context_parts.append(f"- **Flow Signal**: {state.signals.flow:.2f} ({state.signals.flow*100:.0f}%) - Migration/address updates")
                        context_parts.append(f"- **Labor Signal**: {state.signals.labor:.2f} ({state.signals.labor*100:.0f}%) - Biometric updates")
                        context_parts.append(f"- Hotspot Level: {state.hotspot.level.upper()} ({state.hotspot.intensity:.0%})")
                        context_parts.append(f"- Trend: {state.trend}")
                        
                        # District-level breakdown
                        context_parts.append("\n### District-Level Breakdown")
                        try:
                            districts = self._data_engine.aggregate_by_district(state.state_name)
                            if districts:
                                # Sort by hotspot intensity (highest first)
                                sorted_districts = sorted(districts, key=lambda d: d.hotspot.intensity, reverse=True)
                                
                                context_parts.append(f"*{len(districts)} districts in {state.state_name}*\n")
                                
                                # Top 10 hotspot districts
                                context_parts.append("**Top 10 Districts by Demand:**")
                                for i, district in enumerate(sorted_districts[:10], 1):
                                    context_parts.append(
                                        f"{i}. **{district.district_name}**: "
                                        f"Growth {district.signals.growth:.2f}, "
                                        f"Flow {district.signals.flow:.2f}, "
                                        f"Labor {district.signals.labor:.2f} "
                                        f"— {district.hotspot.level.upper()} ({district.hotspot.intensity:.0%})"
                                    )
                            else:
                                context_parts.append("- District data not available")
                        except Exception as e:
                            logger.debug(f"District lookup failed: {e}")
                            context_parts.append("- District data unavailable")
                        
                        # Multi-month forecast
                        context_parts.append("\n### 14-Day / Monthly Forecast (Chronos ML)")
                        forecast_months = ["2026-01", "2026-02", "2026-03"]
                        try:
                            for month in forecast_months:
                                forecast_data = self._data_engine.aggregate_forecast_by_state(month)
                                for fs in forecast_data:
                                    if state.state_name.lower() in fs.state_name.lower():
                                        context_parts.append(
                                            f"- **{month}**: Growth {fs.signals.growth:.2f}, "
                                            f"Flow {fs.signals.flow:.2f}, Labor {fs.signals.labor:.2f}"
                                        )
                                        break
                        except Exception:
                            context_parts.append("- Forecast data unavailable")
                        
                        # Capacity recommendations based on signals
                        context_parts.append("\n### Recommended Capacity Adjustments")
                        if state.signals.growth >= 0.7:
                            context_parts.append("- 🔴 HIGH Growth: +3-4 enrollment stations, focus on maternity wards & PHCs")
                        elif state.signals.growth >= 0.4:
                            context_parts.append("- 🟡 MODERATE Growth: +1-2 enrollment stations")
                        else:
                            context_parts.append("- 🟢 LOW Growth: Maintain current enrollment capacity, reallocate to updates")
                        
                        if state.signals.flow >= 0.7:
                            context_parts.append("- 🔴 HIGH Flow: +5 update operators, extend hours 6-8PM for address updates")
                        elif state.signals.flow >= 0.4:
                            context_parts.append("- 🟡 MODERATE Flow: +2 update operators")
                        
                        if state.signals.labor >= 0.7:
                            context_parts.append("- 🔴 HIGH Labor: Mobile biometric camps near industrial zones, evening hours")
                        elif state.signals.labor >= 0.4:
                            context_parts.append("- 🟡 MODERATE Labor: Standard biometric update capacity")
                        
                        break
            
            else:
                # General query - provide national overview
                national = self._data_engine.get_national_averages()
                states = self._data_engine.aggregate_by_state()[:5]
                context_parts.append("## National Overview")
                context_parts.append(f"- National Avg Growth: {national.growth:.2f}")
                context_parts.append(f"- National Avg Flow: {national.flow:.2f}")
                context_parts.append(f"- National Avg Labor: {national.labor:.2f}")
                context_parts.append(f"\n**Top 5 Hotspot States:**")
                for state in states:
                    context_parts.append(f"- {state.state_name}: {state.hotspot.intensity:.0%}")
        
        except Exception as e:
            logger.warning(f"Context building error: {e}")
            context_parts.append(f"Data fetch encountered an issue: {str(e)[:100]}")
        
        return "\n".join(context_parts) if context_parts else "General query - no specific location data requested."
    
    async def stream_response(
        self,
        message: str,
        session_id: str = "default"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream response from LLM with dynamic context injection.
        
        Args:
            message: User's question
            session_id: Session ID for chat history
            
        Yields:
            {"type": "token", "content": "..."} for each token
            {"type": "complete", "content": "full text"} at the end
        """
        if not self._initialized or self.llm is None:
            error_msg = f"Copilot not available. {self._init_error or 'Not initialized.'}"
            yield {"type": "token", "content": error_msg}
            yield {"type": "complete", "content": error_msg}
            return
        
        try:
            # Sanitize user input
            message = sanitize_for_prompt(message)
            if not message:
                yield {"type": "token", "content": "Please enter a valid question."}
                yield {"type": "complete", "content": "Please enter a valid question."}
                return
            
            # Detect intent and build context
            intent = self._detect_query_intent(message)
            context = self._build_context(message, intent)
            
            # Build system prompt with context
            system_prompt = COPILOT_SYSTEM_PROMPT.format(context=context)
            
            # Get session history
            history = self.get_session_history(session_id)
            
            # Build messages list
            messages = [SystemMessage(content=system_prompt)]
            
            # Add history (limited for performance)
            for msg in history[-self.MAX_HISTORY_MESSAGES:]:
                messages.append(msg)
            
            # Add current user message
            messages.append(HumanMessage(content=message))
            
            # Stream response
            accumulated_text = ""
            
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    accumulated_text += chunk.content
                    yield {"type": "token", "content": chunk.content}
            
            # Save to session history
            history.append(HumanMessage(content=message))
            history.append(AIMessage(content=accumulated_text))
            
            # Limit history size
            if len(history) > self.MAX_HISTORY_MESSAGES * 2:
                self.sessions[session_id] = history[-(self.MAX_HISTORY_MESSAGES * 2):]
            
            yield {"type": "complete", "content": accumulated_text}
            
        except Exception as e:
            logger.error(f"CopilotBot stream error: {e}")
            error_msg = f"I encountered an error: {str(e)}"
            yield {"type": "token", "content": error_msg}
            yield {"type": "complete", "content": error_msg}


# Singleton instance
copilot_bot = CopilotBot()
