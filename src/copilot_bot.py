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

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

try:
    from src.security_utils import sanitize_for_prompt
except ImportError:
    from security_utils import sanitize_for_prompt

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
    MAX_HISTORY_MESSAGES = 10
    
    def __init__(self):
        """Initialize the Copilot bot."""
        self.sessions: Dict[str, List] = {}
        self._session_timestamps: Dict[str, float] = {}
        self._initialized = False
        self._init_error: Optional[str] = None
        self.llm: Optional[ChatOpenAI] = None
        self._data_engine = None  # Set externally to avoid circular imports
        
    def set_data_engine(self, engine):
        """Set the data engine for context injection."""
        self._data_engine = engine
        
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
        """Get or create a session's chat history."""
        now = time.time()
        
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        self._session_timestamps[session_id] = now
        return self.sessions[session_id]
    
    def clear_session(self, session_id: str):
        """Clear a session's chat history."""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self._session_timestamps:
            del self._session_timestamps[session_id]
    
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
        hotspot_keywords = ['hotspot', 'top', 'highest', 'lowest', 'ranking', 'rank']
        if any(kw in msg_lower for kw in hotspot_keywords):
            intent["type"] = "hotspots"
        
        # State detection (common Indian states)
        states = [
            'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
            'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
            'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
            'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
            'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi',
            'up', 'mp', 'tn', 'ap', 'wb', 'mh', 'bihar', 'raj', 'guj'
        ]
        for state in states:
            if state in msg_lower:
                intent["type"] = "state" if intent["type"] == "general" else intent["type"]
                intent["entities"]["state"] = state
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
                states = self._data_engine.aggregate_by_state()[:10]  # Top 10
                context_parts.append("## Top Hotspot States (by intensity)")
                for i, state in enumerate(states, 1):
                    context_parts.append(f"{i}. **{state.state_name}**: {state.hotspot.intensity:.0%} ({state.hotspot.level})")
                    context_parts.append(f"   Growth: {state.signals.growth:.2f}, Flow: {state.signals.flow:.2f}, Labor: {state.signals.labor:.2f}")
            
            elif query_type == "forecast":
                # Get forecast months
                forecast_months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"]
                context_parts.append("## Forecast Data Available")
                context_parts.append(f"Chronos ML predictions available for: {', '.join(forecast_months)}")
                
                # If state is mentioned, get forecast for that state
                state_name = entities.get("state")
                if state_name:
                    for month in forecast_months[:3]:  # First 3 months
                        forecast_data = self._data_engine.aggregate_forecast_by_state(month)
                        for state in forecast_data:
                            if state_name.lower() in state.state_name.lower():
                                context_parts.append(f"\n**{state.state_name} ({month}):**")
                                context_parts.append(f"- Forecast Growth: {state.signals.growth:.2f}")
                                context_parts.append(f"- Forecast Flow: {state.signals.flow:.2f}")
                                context_parts.append(f"- Forecast Labor: {state.signals.labor:.2f}")
                                break
            
            elif query_type == "state" or entities.get("state"):
                state_name = entities.get("state", "")
                states = self._data_engine.aggregate_by_state()
                for state in states:
                    if state_name.lower() in state.state_name.lower() or state.state_name.lower() in state_name.lower():
                        context_parts.append(f"## {state.state_name}")
                        context_parts.append(f"- PIN codes: {state.pin_count:,}")
                        context_parts.append(f"- Growth: {state.signals.growth:.2f} ({state.signals.growth*100:.0f}%)")
                        context_parts.append(f"- Flow: {state.signals.flow:.2f} ({state.signals.flow*100:.0f}%)")
                        context_parts.append(f"- Labor: {state.signals.labor:.2f} ({state.signals.labor*100:.0f}%)")
                        context_parts.append(f"- Hotspot: {state.hotspot.level.upper()} ({state.hotspot.intensity:.0%})")
                        context_parts.append(f"- Trend: {state.trend}")
                        if state.top_districts:
                            context_parts.append(f"- Top Districts: {', '.join(state.top_districts[:5])}")
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
        # Sanitize input
        message = sanitize_for_prompt(message)

        if not self._initialized or self.llm is None:
            error_msg = f"Copilot not available. {self._init_error or 'Not initialized.'}"
            yield {"type": "token", "content": error_msg}
            yield {"type": "complete", "content": error_msg}
            return
        
        try:
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
