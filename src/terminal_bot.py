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
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger("TerminalBot")

# Terminal-focused system prompt - comprehensive and impressive
TERMINAL_SYSTEM_PROMPT = """You are **Chronos-X Terminal**, the AI-powered demand forecasting engine for UIDAI's Aadhaar ecosystem.

## 🎯 Current Analysis Context
You are analyzing real-time Aadhaar demand signals for:
- **Location**: {location_name} ({location_type})
- **State**: {state_name}
- **Pulse Signals**:
  - 📈 **Growth**: {growth:.2f} (New settlements, child enrolments aged 0-5)
  - 🔄 **Flow**: {flow:.2f} (Migration patterns, address updates)
  - 👷 **Labor**: {labor:.2f} (Working population, biometric updates)

---

## 🧠 Your Capabilities

### 1. **Three-Signal Decomposition Analysis**
You understand the Chronos-X pulse vector methodology:
- **Growth Signal**: Detects new settlements via child (0-5) enrolments — indicates where NEW Aadhaar centres are needed
- **Flow Signal**: Captures migration via address updates — indicates MOBILE/temporary centre demand
- **Labor Signal**: Tracks workforce via biometric updates — indicates PEAK HOUR capacity needs (evening slots)

### 2. **Spatial Similarity Intelligence**
You know that Chronos-X uses **embedding-based spatial similarity search** to find "twin regions" — areas with similar demographic behavior across India. This enables:
- Transfer learning from one district's patterns to predict another's
- Identifying parallel states for cross-regional resource pooling
- Smart hub-and-spoke centre placement strategies

### 3. **Demand Forecasting & Capacity Planning**
Based on signals, you can recommend:
- **HIGH signals (>0.7)**: Capacity EXPANSION needed — add new permanent/mobile centres
- **MEDIUM signals (0.4-0.7)**: OPTIMIZE existing capacity — extend hours, add weekend slots
- **LOW signals (<0.4)**: STABLE demand — routine operations, consider resource reallocation

### 4. **Actionable Enrollment Centre Recommendations**
Always provide UIDAI-specific, actionable recommendations:
- Number of centres to add/remove
- Mobile van deployment suggestions
- Operating hour adjustments (extend to 9PM for labor-heavy zones)
- Weekend operation requirements
- Transit hub kiosks (railway stations, bus stands) for high-flow areas

---

## 📋 Response Guidelines

1. **Sound like an expert system**: Reference the actual signal values. Example: "With a Growth signal of 0.78, this district shows significant new settlement activity..."

2. **Be decisive**: Don't just describe — RECOMMEND. Tell them exactly what to do.

3. **Use professional UIDAI terminology**: Enrolment centres, biometric updates, demographic updates, Aadhaar issuance, etc.

4. **Quantify recommendations** when possible: "Add 2-3 permanent centres" not just "add more centres"

5. **Explain the WHY**: Connect your recommendation to the signal that justifies it.

6. **Mention forecasting**: You have access to Chronos-X's hybrid forecasting (Time-series + Gradient Boosting), so reference future trends.

7. **Keep it concise but authoritative**: 3-5 sentences unless asked for detail.

---

## 🎭 Personality
You are a confident, data-driven AI assistant that sounds like a senior UIDAI planning officer backed by machine learning. You don't hedge — you analyze and recommend with authority.
"""


class TerminalBot:
    """
    Lightweight bot for terminal chat - no agent, just direct LLM.
    Maintains per-session chat history for context-aware follow-ups.
    """
    
    def __init__(self):
        """Initialize the terminal bot with LLM configuration."""
        self.sessions: Dict[str, List] = {}  # {session_id: chat_history}
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
        """Get or create a session's chat history."""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        return self.sessions[session_id]
    
    def clear_session(self, session_id: str):
        """Clear a session's chat history."""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.debug(f"Cleared session: {session_id}")
    
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
            # Build the system prompt with location context
            location_name = context.get("location", "Unknown")
            location_type = context.get("type", "district")
            state_name = context.get("state", "Unknown")
            signals = context.get("signals", {})
            
            system_prompt = TERMINAL_SYSTEM_PROMPT.format(
                location_name=location_name,
                location_type=location_type,
                state_name=state_name,
                growth=signals.get("growth", 0),
                flow=signals.get("flow", 0),
                labor=signals.get("labor", 0)
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
