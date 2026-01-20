"""
Chronos-X Terminal Bot
======================
Lightweight, agent-free bot for the terminal chat in district view.
Uses direct LLM streaming for faster responses - no AgentExecutor overhead.

Features:
- Session-scoped chat history (per district)
- Pre-loaded context (signals data passed in each message)
- Focused system prompt for UIDAI terminal analysis
"""

import os
import logging
import time
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime

from security_utils import sanitize_for_prompt
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger("TerminalBot")

# Terminal-focused system prompt - comprehensive and impressive
TERMINAL_SYSTEM_PROMPT = """You are **Chronos-X Terminal**, the AI-powered demand forecasting engine for UIDAI's Aadhaar ecosystem.

## 🎯 Current Analysis Context
You are analyzing real-time Aadhaar demand signals for:
- **Location**: {location_name} ({location_type})
- **State**: {state_name}
- **Pulse Vector Signals** (normalized 0.0-1.0):
  - 📈 **Growth**: {growth:.2f} ({growth_pct}%) — New settlements, child enrolments (0-5 age group)
  - 🔄 **Flow**: {flow:.2f} ({flow_pct}%) — Migration patterns, address/demographic updates
  - 👷 **Labor**: {labor:.2f} ({labor_pct}%) — Working population, biometric updates

**Dominant Signal**: {dominant_signal}
**Estimated Monthly Volume**: ~{est_volume} transactions

---

## 🧠 Pulse Vector Methodology

### Signal Decomposition (Know This Cold)
Each signal represents a specific Aadhaar demand driver:

1. **Growth Signal** → Child Enrolments (0-5 age)
   - HIGH (>0.7): Birth registrations driving demand, new settlements forming
   - MODERATE (0.4-0.7): Steady infant enrollments, stable population growth
   - LOW (<0.4): Mature demographics, focus on updates over new enrollments

2. **Flow Signal** → Address Updates / Migration
   - HIGH (>0.7): Significant in/out migration, transit corridor active
   - MODERATE (0.4-0.7): Normal population mobility, standard update flow
   - LOW (<0.4): Stable resident population, minimal demographic movement

3. **Labor Signal** → Biometric Updates / Working Population
   - HIGH (>0.7): Industrial zone activity, frequent workforce updates, evening demand spike
   - MODERATE (0.4-0.7): Normal workforce activity, standard update patterns
   - LOW (<0.4): Lower workforce density, baseline update frequency

### Intervention Framework
Based on signal intensity, provide QUANTIFIED recommendations:

| Hotspot Intensity | Capacity Action | Staffing | Timing |
|-------------------|-----------------|----------|--------|
| HIGH (≥0.7) | +3-4 stations | +5 operators | Extended hours |
| MODERATE (0.4-0.7) | +1-2 stations | +2 operators | Standard |
| LOW (<0.4) | Maintain current | Adequate | Standard |

---

## 📊 How to Reference Signals

**Good**: "With a Growth signal of 0.78 (78%), this district shows HIGH new enrollment activity. Recommend deploying +3 stations focused on maternity wards and PHCs."

**Bad**: "Growth is high, so we need more centres."

Always:
1. Quote the EXACT signal value (e.g., "Labor @ 0.67")
2. Convert to percentage for clarity (e.g., "67% biometric update rate")
3. Classify the intensity level (HIGH/MODERATE/LOW)
4. Connect to specific intervention

---

## 🎬 Response Structure

When answering questions, structure your response as:

1. **Signal Analysis**: Which pulse vectors are driving this pattern?
2. **Root Cause**: What demographic behavior explains this?
3. **Intervention**: Quantified recommendation (X stations, Y staff, Z hours)
4. **Priority**: Is this CRITICAL, HIGH, or MEDIUM priority?

Keep responses concise (3-5 sentences) unless asked for detail.

---

## 🎭 Personality
You are a confident, data-driven AI that sounds like a senior UIDAI planning officer backed by Chronos-X's ML forecasting. Reference signal values authoritatively. Don't hedge — analyze and recommend with precision.
"""


class TerminalBot:
    """
    Lightweight bot for terminal chat - no agent, just direct LLM.
    Maintains per-session chat history for context-aware follow-ups.
    """
    
    # Session expiry configuration
    SESSION_TTL_SECONDS = 1800  # 30 minutes
    CLEANUP_INTERVAL_SECONDS = 300  # Cleanup every 5 minutes
    MAX_SESSIONS = 100  # Maximum concurrent sessions
    
    def __init__(self):
        """Initialize the terminal bot with LLM configuration."""
        self.sessions: Dict[str, List] = {}  # {session_id: chat_history}
        self._session_timestamps: Dict[str, float] = {}  # {session_id: last_access_time}
        self._last_cleanup = time.time()
        self._initialized = False
        self._init_error: Optional[str] = None
        self.llm: Optional[ChatOpenAI] = None
        
    def initialize(self):
        """Initialize the LLM. Call this once at startup."""
        try:
            # Get API configuration
            api_key = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("OPENAI_API_KEY")
            base_url = os.environ.get("AI_GATEWAY_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
            
            if not base_url and os.environ.get("AI_GATEWAY_API_KEY"):
                base_url = "https://gateway.ai.vercel.dev/v1"
            
            model = os.environ.get("AI_MODEL", "gpt-3.5-turbo")
            
            if not api_key:
                self._init_error = "No API key found"
                logger.warning("TerminalBot: No API key found")
                return
            
            self.llm = ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url,
                temperature=0.3,
                streaming=True,
                max_tokens=500,  # Keep responses concise
                model_kwargs={
                    "extra_headers": {
                        "HTTP-Referer": "https://uidai-hackathon.vercel.app",
                        "X-Title": "Chronos Terminal"
                    }
                }
            )
            
            self._initialized = True
            logger.info(f"TerminalBot initialized with model: {model}")
            
        except Exception as e:
            self._init_error = str(e)
            logger.error(f"TerminalBot initialization failed: {e}")
    
    def get_session_history(self, session_id: str) -> List:
        """Get or create a session's chat history. Updates access timestamp."""
        now = time.time()
        
        # Trigger cleanup periodically
        if now - self._last_cleanup > self.CLEANUP_INTERVAL_SECONDS:
            self._cleanup_expired_sessions()
        
        if session_id not in self.sessions:
            # Check if we're at capacity
            if len(self.sessions) >= self.MAX_SESSIONS:
                self._cleanup_expired_sessions(force=True)
            self.sessions[session_id] = []
        
        # Update access timestamp
        self._session_timestamps[session_id] = now
        return self.sessions[session_id]
    
    def clear_session(self, session_id: str):
        """Clear a session's chat history."""
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self._session_timestamps:
            del self._session_timestamps[session_id]
        logger.debug(f"Cleared session: {session_id}")
    
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
            logger.info(f"TerminalBot: Cleaned up {len(expired)} expired sessions")
        
        # Force cleanup oldest if still over capacity
        if force and len(self.sessions) >= self.MAX_SESSIONS:
            # Sort by timestamp and remove oldest
            sorted_sessions = sorted(
                self._session_timestamps.items(),
                key=lambda x: x[1]
            )
            to_remove = len(self.sessions) - self.MAX_SESSIONS + 10  # Remove 10 extra
            for sid, _ in sorted_sessions[:to_remove]:
                self.clear_session(sid)
            logger.info(f"TerminalBot: Force-removed {to_remove} oldest sessions")
    
    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs."""
        return list(self.sessions.keys())
    
    async def stream_response(
        self,
        message: str,
        context: Dict[str, Any],
        session_id: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream response directly from LLM with session-scoped history.
        
        Args:
            message: User's question
            context: Location context with signals data
            session_id: Session ID (typically district_id)
            
        Yields:
            {"type": "token", "content": "..."} for each token
            {"type": "complete", "content": "full text"} at the end
        """
        if not self._initialized or self.llm is None:
            error_msg = f"TerminalBot not available. {self._init_error or 'Not initialized.'}"
            yield {"type": "token", "content": error_msg}
            yield {"type": "complete", "content": error_msg}
            return
        
        try:
            # Sanitize user input
            message = sanitize_for_prompt(message)
            if not message:
                yield {"type": "token", "content": "Please enter a valid message."}
                yield {"type": "complete", "content": "Please enter a valid message."}
                return

            # Build the system prompt with location context
            location_name = context.get("location", "Unknown")
            location_type = context.get("type", "district")
            state_name = context.get("state", "Unknown")
            signals = context.get("signals", {})
            
            # Extract signal values
            growth = signals.get("growth", 0)
            flow = signals.get("flow", 0)
            labor = signals.get("labor", 0)
            
            # Compute percentages
            growth_pct = round(growth * 100)
            flow_pct = round(flow * 100)
            labor_pct = round(labor * 100)
            
            # Identify dominant signal
            signal_map = {"GROWTH": growth, "FLOW": flow, "LABOR": labor}
            dominant_signal = max(signal_map, key=signal_map.get)
            
            # Estimate monthly volume based on signals
            est_volume = round((growth * 1000) + (flow * 500) + (labor * 800))
            
            system_prompt = TERMINAL_SYSTEM_PROMPT.format(
                location_name=location_name,
                location_type=location_type,
                state_name=state_name,
                growth=growth,
                flow=flow,
                labor=labor,
                growth_pct=growth_pct,
                flow_pct=flow_pct,
                labor_pct=labor_pct,
                dominant_signal=dominant_signal,
                est_volume=est_volume
            )
            
            # Add real spatial similarity data if available
            similar_districts = context.get("similar_districts", [])
            if similar_districts:
                similarity_section = "\n\n## 🔗 SPATIAL SIMILARITY DATA (Real-time)\n"
                similarity_section += "Chronos-X has identified **twin regions** with similar demographic patterns:\n\n"
                
                for i, sim in enumerate(similar_districts, 1):
                    sim_name = sim.get("district_name", "Unknown")
                    sim_state = sim.get("state_name", "Unknown")
                    sim_score = sim.get("similarity", 0) * 100
                    sim_signals = sim.get("signals", {})
                    
                    similarity_section += f"**{i}. {sim_name}, {sim_state}** — {sim_score:.0f}% similarity\n"
                    similarity_section += f"   - Growth: {sim_signals.get('growth', 0):.2f}, Flow: {sim_signals.get('flow', 0):.2f}, Labor: {sim_signals.get('labor', 0):.2f}\n"
                
                similarity_section += "\n**Use this data** to recommend cross-regional resource pooling and learn from these twin districts' experiences.\n"
                system_prompt += similarity_section
            
            # Get session history
            history = self.get_session_history(session_id)
            
            # Build messages list
            messages = [SystemMessage(content=system_prompt)]
            
            # Add history (limit to last 6 messages for performance)
            for msg in history[-6:]:
                messages.append(msg)
            
            # Add current user message
            messages.append(HumanMessage(content=message))
            
            # Stream response directly from LLM - no AgentExecutor!
            accumulated_text = ""
            
            async for chunk in self.llm.astream(messages):
                if chunk.content:
                    accumulated_text += chunk.content
                    yield {"type": "token", "content": chunk.content}
            
            # Save to session history
            history.append(HumanMessage(content=message))
            history.append(AIMessage(content=accumulated_text))
            
            # Limit history size to prevent memory bloat
            if len(history) > 20:
                self.sessions[session_id] = history[-20:]
            
            # Yield complete message
            yield {"type": "complete", "content": accumulated_text}
            
        except Exception as e:
            logger.error(f"TerminalBot stream error: {e}")
            error_msg = f"I encountered an error: {str(e)}"
            yield {"type": "token", "content": error_msg}
            yield {"type": "complete", "content": error_msg}


# Singleton instance for use in api_server
terminal_bot = TerminalBot()
