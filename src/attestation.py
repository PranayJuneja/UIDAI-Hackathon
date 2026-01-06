from openai import OpenAI
import os
import json
from typing import Dict, Any, List, Optional

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS - Based on README "Weather Forecast for Aadhaar" Concept
# ═══════════════════════════════════════════════════════════════════════════════

CHRONOS_SYSTEM_PROMPT = """You are **Chronos-X**, an AI-powered forecasting assistant for UIDAI (Unique Identification Authority of India).

## Your Expertise
You analyze Aadhaar enrollment and update patterns to predict regional demand. You operate like a "Weather Forecast for Aadhaar" - instead of predicting rain, you predict where Aadhaar services will be needed.

## The Three Signals You Monitor
Every PIN code has a 3-dimensional "Pulse Vector" you analyze:

1. **Growth Signal (Child Enrolment 0-5)**: 
   - High value = Young families are settling in this area
   - *Action if high*: Deploy more tablet-based enrolment kits and child enrolment staff
   
2. **Flow Signal (Demographic Updates - Address/DOB changes)**: 
   - High value = Migration and urbanization happening
   - *Action if high*: Open Document Update Centers, expect address change requests
   
3. **Labor Signal (Biometric Updates 18+)**: 
   - High value = Manual laborers present (fingerprints wearing out from physical work)
   - *Action if high*: Deploy robust biometric scanners, organize worker camps

## Your Methodology
- **Pulse Vectors**: Normalized 0-1 values representing relative activity levels
- **Spatial Parallels**: You find "Parallel Universes" — PIN codes in DIFFERENT states with similar patterns — to predict trajectories
- **AI Forecasting**: Amazon Chronos T5 foundation model for zero-shot predictions

## Response Guidelines
1. **Be data-driven**: Always reference the actual values and forecasts provided
2. **Be actionable**: UIDAI officials need specific, practical recommendations
3. **Explain reasoning**: Reference spatial parallels and their outcomes
4. **Use the 3-signal framework**: Frame insights in terms of Growth, Flow, and Labor
5. **Be conversational**: You're helping someone understand regional patterns
6. **Interpret Contextual Drivers**: When seasonal context is provided, explain HOW it affects the forecast:
   - **School Season** + High Growth → "Child enrolment demand from school admissions"
   - **Harvest Season** + High Flow → Use region type to determine direction:
     * Agricultural destinations (Punjab, Haryana, AP) → "Labor arriving for harvest"
     * Labor source regions (Bihar, UP, Jharkhand) → "Workers returning home"
   - Use your geographic knowledge to infer migration direction

## Example Insight Format
"This region shows [signal pattern]. Similar patterns in [parallel regions] led to [outcome]. 
Recommendation: [specific UIDAI action]."
"""

QUERY_PARSER_PROMPT = """You are a query parser for Chronos-X, an AI that predicts Aadhaar demand.

Extract structured information from user queries. Return ONLY valid JSON.

## IMPORTANT: Ignore Greetings
Users often start with informal greetings. IGNORE these completely and focus on the actual query:
- Greetings to ignore: "oi", "hi", "hey", "hello", "yo", "hii", "hola", "sup", "wassup", "namaste", "bro", "dude"
- Example: "oi 560001 for jan 2028" → Extract "560001" and "jan 2028", ignore "oi"

## Location Patterns
- **PIN codes (PRIORITY)**: Always look for 6-digit numbers like "110001", "560001", "400001" - these are PIN codes!
- City names: "Delhi", "Mumbai", "Bangalore", "Chennai", etc.
- State names: "Maharashtra", "Karnataka", "Tamil Nadu", etc.
- State abbreviations: "UP" (Uttar Pradesh), "MP" (Madhya Pradesh), "TN" (Tamil Nadu), "MH" (Maharashtra)
- Regions: "North India", "South", etc.
- Compound locations: "North Delhi", "Greater Mumbai", "Navi Mumbai" → Resolve to base city

## Time Patterns
- Specific months: "jan 2028", "january 2028", "feb 2025" → Calculate months from now (Jan 2026)
- "6 months" → horizon: 6
- "next month" → horizon: 1
- "after 3 months" → horizon: 3  
- "next year" → horizon: 12
- "2028" alone → assume Jan 2028 → horizon: 24 (from Jan 2026)
- "this quarter" → horizon: 3
- "end of year" or "year end" → horizon: 12
- "after monsoon" → horizon: 4 (approx Oct from Jun)
- No time mentioned → horizon: 1 (default)

## Intent Types
- "forecast": User wants to know what WILL happen (default if location is mentioned)
- "recommendation": User asks what to DO
- "comparison": User wants to compare regions (keywords: compare, vs, versus, differ, difference)
- "explanation": User asks WHY something is happening
- "status": User asks about CURRENT state

## Multiple Locations (Comparison)
If query mentions two locations, extract the FIRST as primary location:
- "Compare Delhi with Mumbai" → location: "Delhi", secondary_location: "Mumbai", intent: "comparison"
- "How does 560001 differ from 110001" → location: "560001", secondary_location: "110001", intent: "comparison"

## Output Format
{"location": "<city/state/pin or null>", "horizon": <months int>, "intent": "<type>", "raw_location": "<original text>", "secondary_location": "<optional, for comparisons>"}

## Examples
Query: "oi 560001 for jan 2028"
Output: {"location": "560001", "horizon": 24, "intent": "forecast", "raw_location": "560001"}

Query: "hi! what about delhi next year?"
Output: {"location": "Delhi", "horizon": 12, "intent": "forecast", "raw_location": "Delhi"}

Query: "What to do in Delhi after 6 months?"
Output: {"location": "Delhi", "horizon": 6, "intent": "recommendation", "raw_location": "Delhi"}

Query: "Compare 110001 with Bangalore"
Output: {"location": "110001", "horizon": 1, "intent": "comparison", "raw_location": "110001", "secondary_location": "Bangalore"}

Query: "Why is migration high?"
Output: {"location": null, "horizon": 1, "intent": "explanation", "raw_location": null}

Query: "yo 400001"
Output: {"location": "400001", "horizon": 1, "intent": "forecast", "raw_location": "400001"}

Query: "560001"
Output: {"location": "560001", "horizon": 1, "intent": "forecast", "raw_location": "560001"}

Query: "UP prediction"
Output: {"location": "UP", "horizon": 1, "intent": "forecast", "raw_location": "UP"}

Query: "Mumbai vs Delhi"
Output: {"location": "Mumbai", "horizon": 1, "intent": "comparison", "raw_location": "Mumbai", "secondary_location": "Delhi"}

Query: "What about the labor signal?"
Output: {"location": null, "horizon": 1, "intent": "status", "raw_location": null, "signal_focus": "labor"}
"""



class Attestor:
    """
    Enhanced Attestation module for Chronos-X.
    
    Provides:
    - explain_prediction(): Legacy 3-sentence explanations
    - chat(): Full conversational AI with context injection
    - parse_query(): Natural language understanding for intent extraction
    """
    
    def __init__(self, model: Optional[str] = None, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        Initialize the Attestor with OpenAI client for Vercel AI Gateway / Minimax.
        
        Args:
            model (str, optional): The model identifier. Defaults to env var AI_MODEL or "minimax/minimax-m2.1".
            api_key (str, optional): API key. If None, tries AI_GATEWAY_API_KEY then OPENAI_API_KEY.
            base_url (str, optional): Base URL. If None, tries AI_GATEWAY_BASE_URL then OPENAI_BASE_URL.
        """
        self.model = model or os.environ.get("AI_MODEL", "minimax/minimax-m2.1")
        self.max_tokens = int(os.environ.get("AI_MAX_TOKENS", "8192"))
        self.temperature = float(os.environ.get("AI_TEMPERATURE", "0.4"))
        
        # Resolve API Key
        final_api_key = api_key or os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("OPENAI_API_KEY")
        if not final_api_key:
            # warning or handle gracefully? For now, we'll let client crash if called
            pass
            
        # Resolve Base URL
        final_base_url = base_url or os.environ.get("AI_GATEWAY_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
        
        if final_api_key:
            self.client = OpenAI(
                api_key=final_api_key,
                base_url=final_base_url
            )
        else:
            self.client = None
    
    def _local_fallback_parse(self, user_message: str) -> Dict[str, Any]:
        """
        Local fallback parser for when AI is unavailable or for simple queries.
        Uses regex patterns to extract basic information.
        """
        import re
        
        result = {
            "location": None,
            "horizon": 1,
            "intent": "forecast",
            "raw_location": None,
            "secondary_location": None
        }
        
        # Look for 6-digit PIN codes
        pin_matches = re.findall(r'\b(\d{6})\b', user_message)
        if pin_matches:
            result["location"] = pin_matches[0]
            result["raw_location"] = pin_matches[0]
            if len(pin_matches) > 1:
                result["secondary_location"] = pin_matches[1]
                result["intent"] = "comparison"
        
        # Look for common cities (case insensitive)
        cities = ["delhi", "mumbai", "bangalore", "bengaluru", "chennai", "kolkata", 
                  "hyderabad", "pune", "ahmedabad", "jaipur", "lucknow", "kanpur",
                  "surat", "kochi", "goa", "chandigarh", "bhopal", "indore"]
        lower_msg = user_message.lower()
        found_cities = [c for c in cities if c in lower_msg]
        if found_cities and not result["location"]:
            result["location"] = found_cities[0].title()
            result["raw_location"] = found_cities[0].title()
            if len(found_cities) > 1:
                result["secondary_location"] = found_cities[1].title()
        
        # Detect comparison intent
        comparison_keywords = ["compare", "vs", "versus", "differ", "difference", "between"]
        if any(kw in lower_msg for kw in comparison_keywords):
            result["intent"] = "comparison"
        
        # Detect recommendation intent
        recommendation_keywords = ["what to do", "should", "recommend", "prepare", "action"]
        if any(kw in lower_msg for kw in recommendation_keywords):
            result["intent"] = "recommendation"
        
        # Detect explanation intent
        explanation_keywords = ["why", "reason", "because", "explain", "how come"]
        if any(kw in lower_msg for kw in explanation_keywords):
            result["intent"] = "explanation"
        
        # Extract time horizon
        if "next year" in lower_msg:
            result["horizon"] = 12
        elif "6 month" in lower_msg or "six month" in lower_msg:
            result["horizon"] = 6
        elif "3 month" in lower_msg or "three month" in lower_msg:
            result["horizon"] = 3
        elif "next month" in lower_msg:
            result["horizon"] = 1
        
        return result
    
    def parse_query(self, user_message: str) -> Dict[str, Any]:
        """
        Parse natural language query to extract location, time horizon, and intent.
        
        Enhanced with:
        - Local fallback for simple queries (no API call needed)
        - Validation of AI parser output
        - Better error handling
        
        Args:
            user_message: Natural language query (e.g., "What to do in Delhi after 6 months?")
            
        Returns:
            Dictionary with:
            - location: Extracted location (city, state, or PIN)
            - horizon: Time horizon in months
            - intent: Type of query (forecast, recommendation, comparison, explanation)
            - raw_location: Original location text from query
            - secondary_location: Optional, for comparison queries
        """
        import re
        
        # Quick local extraction for very simple patterns (no API call needed)
        # This handles cases like "560001" or just a PIN code
        stripped = user_message.strip()
        if re.match(r'^\d{6}$', stripped):
            # Just a PIN code - no need to call AI
            return {
                "location": stripped,
                "horizon": 1,
                "intent": "forecast",
                "raw_location": stripped
            }
        
        # If API is not configured, use local fallback
        if not self.client:
            result = self._local_fallback_parse(user_message)
            result["fallback_used"] = True
            return result
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": QUERY_PARSER_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=200,
                temperature=0.1  # Low temperature for structured output
            )
            
            result_text = response.choices[0].message.content.strip()
            
            # Try to extract JSON from the response
            # Handle cases where model might wrap JSON in markdown code blocks
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            parsed = json.loads(result_text)
            
            # Validate and sanitize the result
            if not isinstance(parsed.get("horizon"), int):
                parsed["horizon"] = 1
            if parsed.get("horizon", 1) < 1:
                parsed["horizon"] = 1
            if parsed.get("horizon", 1) > 60:  # Cap at 5 years
                parsed["horizon"] = 60
            
            valid_intents = ["forecast", "recommendation", "comparison", "explanation", "status"]
            if parsed.get("intent") not in valid_intents:
                parsed["intent"] = "forecast"
            
            return parsed
            
        except json.JSONDecodeError:
            # Fallback to local parser
            result = self._local_fallback_parse(user_message)
            result["parse_error"] = "AI returned invalid JSON, used local fallback"
            return result
        except Exception as e:
            # Fallback to local parser
            result = self._local_fallback_parse(user_message)
            result["error"] = str(e)
            result["fallback_used"] = True
            return result
    
    def generate_fallback_response(self, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a basic response without AI when API is unavailable.
        Shows raw data in a readable format.
        
        Args:
            context: The prediction context dictionary
            
        Returns:
            A formatted string with the raw data
        """
        if not context:
            return "I couldn't retrieve data for this location. Please try a different PIN code or city name."
        
        pin = context.get("pincode", "Unknown")
        state = context.get("state", "Unknown")
        current = context.get("current", {})
        
        # Get signal values
        growth = current.get("growth", 0)
        flow = current.get("flow", 0)
        labor = current.get("labor", 0)
        
        # Determine levels
        def get_level(val):
            if val > 0.7:
                return "HIGH 🔴"
            elif val > 0.4:
                return "MODERATE 🟡"
            else:
                return "LOW 🟢"
        
        # Build response
        response = f"""📍 **PIN {pin}** ({state})

**Current Pulse Vector** (Normalized 0-1):
• Growth (Child Enrolment): {growth:.3f} [{get_level(growth)}]
• Flow (Migration/Updates): {flow:.3f} [{get_level(flow)}]
• Labor (Biometric Updates): {labor:.3f} [{get_level(labor)}]"""
        
        # Add parallels if available
        parallels = context.get("parallels", [])
        if parallels:
            response += "\n\n**Similar Regions:**"
            for i, p in enumerate(parallels[:3], 1):
                if p:
                    p_pin = p.get("pincode", "?")
                    p_state = p.get("state", "?")
                    p_sim = p.get("similarity", 0) * 100
                    response += f"\n• {p_pin} ({p_state}) - {p_sim:.0f}% similar"
        
        # Add AI forecast if available
        ai_forecast = context.get("ai_forecast", {})
        if ai_forecast and "error" not in ai_forecast:
            response += "\n\n**AI Forecast:**"
            for key in ["growth", "flow", "labor"]:
                if key in ai_forecast:
                    response += f"\n• {key.title()}: {ai_forecast[key]:.3f}"
        
        response += "\n\n⚠️ *AI analysis temporarily unavailable. Showing raw data.*"
        
        return response

    
    def chat(
        self, 
        user_message: str, 
        context: Optional[Dict[str, Any]] = None, 
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Full conversational AI with data context injection.
        
        This is the main interface for the interactive chatbot.
        
        Args:
            user_message: User's natural language query
            context: Dictionary with prediction data to inject:
                - pincode: Target PIN code
                - state: State name
                - current: {growth, flow, labor} current values
                - forecast: Prediction data
                - parallels: Similar regions found
            history: Previous conversation turns for multi-turn chat
            
        Returns:
            AI-generated response grounded in the provided data
        """
        if not self.client:
            return "Chat unavailable: API Key not configured."
        
        # Build messages array
        messages = [{"role": "system", "content": CHRONOS_SYSTEM_PROMPT}]
        
        # Add conversation history if provided
        if history:
            messages.extend(history)
        
        # Build context block if data is provided
        context_block = ""
        if context:
            context_block = self._format_context(context)
        
        # Construct final user message with context
        if context_block:
            full_message = f"""## Current Data Context
{context_block}

## User Question
{user_message}

Provide a helpful, data-driven response based on the context above."""
        else:
            full_message = user_message
        
        messages.append({"role": "user", "content": full_message})
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Response unavailable: {str(e)}"
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format prediction context into a readable block for the AI."""
        lines = []
        
        if context.get("pincode"):
            state = context.get("state", "Unknown")
            lines.append(f"**Target Region**: PIN {context['pincode']} ({state})")
        
        # Current Pulse Vector
        current = context.get("current", {})
        if current:
            lines.append("\n**Current Pulse Vector** (Normalized 0-1):")
            if "growth" in current:
                growth_val = current["growth"]
                growth_level = "HIGH" if growth_val > 0.7 else "MODERATE" if growth_val > 0.4 else "LOW"
                lines.append(f"- Growth (Child Enrolment): {growth_val:.3f} [{growth_level}]")
            if "flow" in current:
                flow_val = current["flow"]
                flow_level = "HIGH" if flow_val > 0.7 else "MODERATE" if flow_val > 0.4 else "LOW"
                lines.append(f"- Flow (Migration/Updates): {flow_val:.3f} [{flow_level}]")
            if "labor" in current:
                labor_val = current["labor"]
                labor_level = "HIGH" if labor_val > 0.7 else "MODERATE" if labor_val > 0.4 else "LOW"
                lines.append(f"- Labor (Biometric Updates): {labor_val:.3f} [{labor_level}]")
        
        # AI Forecast
        forecast = context.get("ai_forecast", {})
        if forecast and "error" not in forecast:
            lines.append("\n**AI Forecast (Amazon Chronos)**:")
            for key in ["growth", "flow", "labor"]:
                if key in forecast:
                    lines.append(f"- {key.title()}: {forecast[key]:.3f}")
        
        # Spatial Parallels
        parallels = context.get("parallels", [])
        if parallels:
            lines.append("\n**Spatial Parallels** (Similar regions in other states):")
            for i, p in enumerate(parallels[:3], 1):
                if p:
                    p_pin = p.get("pincode", "Unknown")
                    p_state = p.get("state", "Unknown")
                    p_sim = p.get("similarity", 0) * 100
                    lines.append(f"- {i}. PIN {p_pin} ({p_state}) - {p_sim:.1f}% similar")
        
        # Ensemble prediction
        ensemble = context.get("ensemble", {})
        if ensemble:
            lines.append("\n**Ensemble Prediction** (AI + Spatial blend):")
            for key in ["growth", "flow", "labor"]:
                if key in ensemble:
                    lines.append(f"- {key.title()}: {ensemble[key]:.3f}")
        
        # Contextual Drivers (from Context Engine)
        contextual = context.get("contextual_drivers", {})
        if contextual:
            lines.append("\n**Contextual Drivers** (External Intelligence):")
            seasonal = contextual.get("seasonal_drivers", [])
            for driver in seasonal:
                lines.append(f"- 📅 {driver['name']}: {driver['hint']}")
            
            events = contextual.get("local_events", [])
            if events:
                lines.append("\n**Local Events** (from Search):")
                for event in events[:3]:  # Limit to 3
                    lines.append(f"- 📰 {event}")
        
        return "\n".join(lines)

    def explain_prediction(self, target_pin: str, parallels: List[Dict[str, Any]], prediction: Dict[str, Any]) -> str:
        """
        Generate an explanation for the prediction using the LLM.
        
        Legacy method for backward compatibility with chronos_cli.py.

        Args:
            target_pin (str): The target PIN code.
            parallels (List[Dict]): List of similar PIN patterns found.
            prediction (Dict): Dictionary containing current stats, parallel outcomes, and AI forecast.
        
        Returns:
            str: A 3-sentence explanation generated by the LLM.
        """
        if not self.client:
            return "Attestation Unavailable: API Key not configured."

        # Map internal keys to human-readable terms
        # growth -> Child Enrolment
        # flow -> Adult Migration
        # labor -> Biometric Updates
        
        current = prediction.get('current', {}) # Expects {'growth':..., 'flow':..., 'labor':...}
        forecast = prediction.get('forecast_summary', {}) # Expects {'next_month_growth':...}
        
        prompt = f"""
        Analyze the following regional data trends.
        
        Region: {target_pin} ({prediction.get('state', 'Unknown')})
        
        Stats (Normalized):
        - Growth: {current.get('growth', 'N/A')}
        - Migration: {current.get('flow', 'N/A')}
        - Updates: {current.get('labor', 'N/A')}
        
        Similar Regions: {[p.get('pincode') for p in parallels if p]}
        Forecast: Growth {forecast.get('next_month_growth', 'Unknown')}
        
        Write 3 short sentences:
        1. Describe the current trend.
        2. Mention similarity to other regions.
        3. State the forecast.
        """
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a senior data scientist at UIDAI."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            return f"Explanation unavailable: {str(e)}"
