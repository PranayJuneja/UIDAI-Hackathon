#!/usr/bin/env python3
"""
Chronos-X Interactive AI Chatbot
================================
Full-fledged conversational AI interface for UIDAI regional predictions.

Usage:
    python chronos_chatbot.py
    
    # Or with a specific PIN for initial context:
    python chronos_chatbot.py --pincode 110001

Features:
- Natural language queries ("What to do in Delhi after 6 months?")
- Location resolution (city names → PIN codes)
- Multi-turn conversation with context memory
- Data-driven responses grounded in Chronos-X predictions
"""

import argparse
import sys
import os
import logging
import threading
import time
from pathlib import Path
from typing import Optional, Dict, Any, List

# ═══════════════════════════════════════════════════════════════════════════════
# SUPPRESS NOISY LOGGERS - Hide httpx, urllib3, and other debug logs
# ═══════════════════════════════════════════════════════════════════════════════
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("ChronosX").setLevel(logging.WARNING)

# Manual ANSI colors to avoid dependency
class Fore:
    CYAN = "\033[36m"
    YELLOW = "\033[33m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    WHITE = "\033[37m"
    MAGENTA = "\033[35m"
    BLUE = "\033[34m"

class Style:
    BRIGHT = "\033[1m"
    DIM = "\033[2m"
    RESET_ALL = "\033[0m"

# Ensure src is in path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# ═══════════════════════════════════════════════════════════════════════════════
# SECURITY CONSTANTS & INPUT SANITIZATION
# ═══════════════════════════════════════════════════════════════════════════════
MAX_INPUT_LENGTH = 1000
MAX_HISTORY_LENGTH = 50  # Prevent unbounded history growth

from src.security import sanitize_input

# Load environment variables from local.env
def load_env(filename="local.env"):
    path = Path(__file__).parent / filename
    if path.exists():
        with open(path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    try:
                        key, value = line.split("=", 1)
                        # Remove comments and whitespace
                        value = value.split("#", 1)[0].strip()
                        os.environ[key.strip()] = value
                    except ValueError:
                        pass

load_env("local.env")

try:
    from chronos_engine import ChronosX
    from attestation import Attestor
    from location_resolver import LocationResolver
    from context_engine import ContextEngine
except ImportError:
    # Fallback if run from src or different structure
    sys.path.insert(0, "src")
    from chronos_engine import ChronosX
    from attestation import Attestor
    from location_resolver import LocationResolver
    from context_engine import ContextEngine


# ═══════════════════════════════════════════════════════════════════════════════
# ANIMATED LOADING INDICATOR
# ═══════════════════════════════════════════════════════════════════════════════
class LoadingIndicator:
    """Animated loading indicator with blinking dots."""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def _animate(self):
        """Animation loop - runs in background thread."""
        frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        idx = 0
        while self.running:
            print(f"\r{Fore.YELLOW}{frames[idx]} Thinking...{Style.RESET_ALL}  ", end="", flush=True)
            idx = (idx + 1) % len(frames)
            time.sleep(0.1)
    
    def start(self):
        """Start the loading animation."""
        self.running = True
        self.thread = threading.Thread(target=self._animate, daemon=True)
        self.thread.start()
    
    def stop(self):
        """Stop the loading animation and clear the line."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=0.2)
        # Clear the loading line
        print(f"\r{' ' * 30}\r", end="", flush=True)


def print_banner():
    """Print the Chronos-X chatbot banner."""
    banner = f"""
{Fore.CYAN}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   {Fore.WHITE}{Style.BRIGHT}✨  CHRONOS-X AI ASSISTANT  ✨{Style.RESET_ALL}{Fore.CYAN}                            ║
║   {Fore.YELLOW}"The Weather Forecast for Aadhaar"{Fore.CYAN}                         ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝{Style.RESET_ALL}

{Fore.WHITE}Ask me about regional Aadhaar trends and predictions.{Style.RESET_ALL}

{Style.DIM}Example questions:{Style.RESET_ALL}
  {Fore.GREEN}•{Style.RESET_ALL} "What will happen in Delhi in 6 months?"
  {Fore.GREEN}•{Style.RESET_ALL} "Show me the prediction for 560001"
  {Fore.GREEN}•{Style.RESET_ALL} "Compare Mumbai with Bangalore"
  {Fore.GREEN}•{Style.RESET_ALL} "Why is migration high in Maharashtra?"
  {Fore.GREEN}•{Style.RESET_ALL} "What should UIDAI prepare for in UP?"  {Style.DIM}(state abbreviations work!){Style.RESET_ALL}

{Style.DIM}Commands:{Style.RESET_ALL}
  {Fore.YELLOW}status{Style.RESET_ALL}        - Show current context and session info
  {Fore.YELLOW}history{Style.RESET_ALL}       - Show recent queries
  {Fore.YELLOW}clear{Style.RESET_ALL}         - Clear conversation history
  {Fore.YELLOW}pin <code>{Style.RESET_ALL}    - Quick switch to a PIN (e.g., "pin 110001")
  {Fore.YELLOW}help{Style.RESET_ALL}          - Show this message
  {Fore.YELLOW}exit{Style.RESET_ALL} / {Fore.YELLOW}quit{Style.RESET_ALL}  - End the conversation

"""
    print(banner)


# Global loading indicator instance
loading_indicator = LoadingIndicator()


def print_response(response: str):
    """Print the AI response with formatting."""
    print(f"\n{Fore.CYAN}┌{'─' * 61}┐{Style.RESET_ALL}")
    print(f"{Fore.CYAN}│{Style.RESET_ALL} {Fore.WHITE}{Style.BRIGHT}Chronos-X{Style.RESET_ALL}")
    print(f"{Fore.CYAN}└{'─' * 61}┘{Style.RESET_ALL}")
    
    # Word wrap the response for better readability
    lines = response.split('\n')
    for line in lines:
        # Handle long lines
        while len(line) > 70:
            # Find a good break point
            break_point = line[:70].rfind(' ')
            if break_point == -1:
                break_point = 70
            print(f"  {line[:break_point]}")
            line = line[break_point:].lstrip()
        print(f"  {line}")
    print()


def get_prediction_context(
    engine: ChronosX, 
    pincode: str
) -> Dict[str, Any]:
    """Fetch prediction data for a PIN code to use as context."""
    try:
        # Get the full hybrid prediction
        prediction = engine.hybrid.predict(pincode, num_parallels=3)
        
        if "error" in prediction:
            return {"error": prediction["error"]}
        
        # Build context dictionary
        context = {
            "pincode": pincode,
            "state": prediction.get("state", "Unknown"),
            "current": prediction.get("current", {}),
            "ai_forecast": prediction.get("ai_forecast", {}),
            "parallels": prediction.get("spatial_parallels", {}).get("parallels", []),
            "ensemble": prediction.get("ensemble", {}),
        }
        
        return context
        
    except Exception as e:
        return {"error": str(e)}


class ChronosChatbot:
    """Interactive chatbot interface for Chronos-X."""
    
    def __init__(self, initial_pincode: Optional[str] = None):
        """
        Initialize the chatbot.
        
        Args:
            initial_pincode: Optional PIN to use as initial context
        """
        from datetime import datetime
        
        print(f"{Fore.YELLOW}⏳ Initializing Chronos-X Engine...{Style.RESET_ALL}")
        
        self.engine = ChronosX()
        self.attestor = Attestor()
        self.resolver = LocationResolver()
        self.context_engine = ContextEngine()
        
        # Ensure pulse table is loaded
        if self.engine.hybrid._pulse_table is None:
            self.engine.hybrid.load_pulse_table()
        
        # Current context
        self.current_context: Optional[Dict[str, Any]] = None
        self.current_pincode: Optional[str] = None
        
        # Conversation history for multi-turn chat
        self.history: List[Dict[str, str]] = []
        
        # Session tracking
        self.session_start = datetime.now()
        self.previous_pincodes: List[str] = []  # Track context switches
        self.query_count = 0
        
        # Set initial context if provided
        if initial_pincode:
            self._set_context(initial_pincode)
        
        print(f"{Fore.GREEN}✓ Engine ready!{Style.RESET_ALL}")
    
    def _set_context(self, pincode: str) -> bool:
        """Set the current context to a specific PIN code."""
        print(f"{Fore.YELLOW}📍 Loading context for PIN {pincode}...{Style.RESET_ALL}")
        
        context = get_prediction_context(self.engine, pincode)
        
        if "error" in context:
            print(f"{Fore.RED}⚠ Could not load context: {context['error']}{Style.RESET_ALL}")
            return False
        
        # Track previous PIN codes for context history
        if self.current_pincode and self.current_pincode != pincode:
            if self.current_pincode not in self.previous_pincodes:
                self.previous_pincodes.append(self.current_pincode)
            # Keep only last 10
            self.previous_pincodes = self.previous_pincodes[-10:]
        
        self.current_context = context
        self.current_pincode = pincode
        print(f"{Fore.GREEN}✓ Context loaded for PIN {pincode} ({context.get('state', 'Unknown')}){Style.RESET_ALL}")
        return True
    
    def _resolve_and_set_context(self, location: str) -> bool:
        """Resolve a location name and set context."""
        # Try to resolve the location
        pins = self.resolver.resolve(location)
        
        if not pins:
            # Maybe it's already a PIN
            if len(location) == 6 and location.isdigit():
                return self._set_context(location)
            return False
        
        # Use the first (most representative) PIN
        return self._set_context(pins[0])
    
    def process_query(self, user_input: str) -> str:
        """
        Process a user query and generate a response.
        
        ARCHITECTURE:
        1. Sanitize input
        2. Parse query → Extract structured JSON {location, horizon, intent}
        3. If PIN found → Load FRESH context for that specific PIN
        4. Handle comparison queries (two locations)
        5. Generate AI response with the CORRECT, fresh data
        6. Fallback to raw data if AI fails
        """
        # Increment query counter
        self.query_count += 1
        
        # Security: Sanitize input
        user_input = sanitize_input(user_input)
        
        # Security: Prevent DoS/Resource Exhaustion
        if len(user_input) > MAX_INPUT_LENGTH:
            return f"Error: Input too long. Please limit your query to {MAX_INPUT_LENGTH} characters."
        
        if not user_input:
            return "Please enter a query. Try asking about a PIN code or city like 'What will happen in Delhi?'"

        # ═══════════════════════════════════════════════════════════════════
        # STEP 1: Parse query to extract structured intent
        # ═══════════════════════════════════════════════════════════════════
        parsed = self.attestor.parse_query(user_input)
        
        extracted_location = parsed.get("location")
        extracted_horizon = parsed.get("horizon", 1)
        extracted_intent = parsed.get("intent", "forecast")
        secondary_location = parsed.get("secondary_location")
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 2: Resolve location to PIN and load FRESH context
        # ═══════════════════════════════════════════════════════════════════
        target_pin = None
        secondary_pin = None
        
        # Method A: Extracted location from AI parser
        if extracted_location:
            loc_str = str(extracted_location)
            if len(loc_str) == 6 and loc_str.isdigit():
                # It's already a PIN
                target_pin = loc_str
            else:
                # Resolve city/state name to PIN
                pins = self.resolver.resolve(loc_str)
                if pins:
                    target_pin = pins[0]
        
        # Resolve secondary location for comparisons
        if secondary_location and extracted_intent == "comparison":
            sec_str = str(secondary_location)
            if len(sec_str) == 6 and sec_str.isdigit():
                secondary_pin = sec_str
            else:
                pins = self.resolver.resolve(sec_str)
                if pins:
                    secondary_pin = pins[0]
        
        # Method B: Fallback - scan for 6-digit numbers in user input
        if not target_pin:
            import re
            pin_matches = re.findall(r'\b(\d{6})\b', user_input)
            if pin_matches:
                target_pin = pin_matches[0]
                if len(pin_matches) > 1 and not secondary_pin:
                    secondary_pin = pin_matches[1]
                    extracted_intent = "comparison"
        
        # Method C: Fallback - scan for city names
        if not target_pin:
            for word in user_input.lower().split():
                pins = self.resolver.resolve(word)
                if pins:
                    target_pin = pins[0]
                    break
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 3: Load context for the target PIN (ALWAYS refresh if new PIN)
        # ═══════════════════════════════════════════════════════════════════
        if target_pin and target_pin != self.current_pincode:
            # Load fresh context for the new PIN
            success = self._set_context(target_pin)
            if not success:
                # Context loading failed - tell user
                return f"I couldn't load data for PIN {target_pin}. This PIN may not be in our dataset. Try another PIN or use a city name like 'Delhi' or 'Mumbai'."
        
        # ═══════════════════════════════════════════════════════════════════
        # STEP 4: Generate AI response with the CORRECT context
        # ═══════════════════════════════════════════════════════════════════
        if not self.current_context:
            # No context at all - prompt user to specify location
            return "I need a location to analyze. Please specify a PIN code (e.g., '560001') or a city name (e.g., 'Bangalore', 'Delhi', 'UP')."
        
        # Add horizon info to context for the AI
        enriched_context = dict(self.current_context)
        enriched_context["requested_horizon"] = extracted_horizon
        enriched_context["user_intent"] = extracted_intent
        
        # Add secondary context for comparisons
        if secondary_pin and extracted_intent == "comparison":
            secondary_context = get_prediction_context(self.engine, secondary_pin)
            if "error" not in secondary_context:
                enriched_context["comparison_target"] = secondary_context
                enriched_context["comparison_pin"] = secondary_pin

        # ═══════════════════════════════════════════════════════════════════
        # STEP 3.5: Enrich context with CONTEXTUAL DRIVERS (Context Engine)
        # ═══════════════════════════════════════════════════════════════════
        from datetime import datetime, timedelta
        
        # Determine if we need live search (triggered by "Why?" queries)
        should_search = extracted_intent == "explanation" or "why" in user_input.lower()
        
        # Calculate target date based on horizon
        target_date = datetime.now() + timedelta(days=30 * extracted_horizon)
        
        # Get contextual intelligence
        context_drivers = self.context_engine.get_context(
            pincode=target_pin, 
            target_month=target_date,
            run_search=should_search
        )
        
        # Merge into enriched context
        enriched_context["contextual_drivers"] = context_drivers
        
        try:
            response = self.attestor.chat(
                user_message=user_input,
                context=enriched_context,
                history=self.history[-10:]  # Keep last 10 turns for context
            )
            
            # Detect unhelpful AI responses and fallback
            if (not response or 
                len(response.strip()) < 30 or
                "I don't" in response[:50] or
                "I cannot" in response[:50] or
                "I'm unable" in response[:50]):
                response = self.attestor.generate_fallback_response(self.current_context)
                
        except Exception as e:
            logging.warning(f"AI chat failed, using fallback: {e}")
            response = self.attestor.generate_fallback_response(self.current_context)
        
        # Update history (limit size to prevent memory issues)
        self.history.append({"role": "user", "content": user_input})
        self.history.append({"role": "assistant", "content": response})
        
        # Trim history if too long
        if len(self.history) > MAX_HISTORY_LENGTH * 2:
            self.history = self.history[-(MAX_HISTORY_LENGTH * 2):]
        
        return response
    
    def show_status(self):
        """Show current session status."""
        from datetime import datetime
        
        duration = datetime.now() - self.session_start
        minutes = int(duration.total_seconds() // 60)
        seconds = int(duration.total_seconds() % 60)
        
        print(f"\n{Fore.CYAN}═══ Session Status ═══{Style.RESET_ALL}")
        print(f"  {Fore.WHITE}Current PIN :{Style.RESET_ALL} {self.current_pincode or 'None'}")
        if self.current_context:
            print(f"  {Fore.WHITE}State       :{Style.RESET_ALL} {self.current_context.get('state', 'Unknown')}")
        print(f"  {Fore.WHITE}Queries     :{Style.RESET_ALL} {self.query_count}")
        print(f"  {Fore.WHITE}History     :{Style.RESET_ALL} {len(self.history) // 2} turns")
        print(f"  {Fore.WHITE}Session Time:{Style.RESET_ALL} {minutes}m {seconds}s")
        
        if self.previous_pincodes:
            print(f"  {Fore.WHITE}Previous PINs:{Style.RESET_ALL} {', '.join(self.previous_pincodes[-5:])}")
        print()
    
    def show_history(self):
        """Show recent query history."""
        if not self.history:
            print(f"{Fore.YELLOW}No history yet.{Style.RESET_ALL}")
            return
        
        print(f"\n{Fore.CYAN}═══ Recent Queries ═══{Style.RESET_ALL}")
        # Show last 5 user messages
        user_messages = [h for h in self.history if h["role"] == "user"]
        for i, msg in enumerate(user_messages[-5:], 1):
            # Truncate long messages
            content = msg["content"][:60] + "..." if len(msg["content"]) > 60 else msg["content"]
            print(f"  {i}. {content}")
        print()
    
    def clear_history(self):
        """Clear conversation history."""
        self.history = []
        print(f"{Fore.GREEN}✓ Conversation history cleared.{Style.RESET_ALL}")
    
    def run(self):
        """Run the interactive chatbot loop."""
        print_banner()
        
        if self.current_context:
            print(f"{Fore.GREEN}📍 Current context: PIN {self.current_pincode} ({self.current_context.get('state', 'Unknown')}){Style.RESET_ALL}\n")
        else:
            print(f"{Style.DIM}💡 Tip: Mention a location to get data-driven insights.{Style.RESET_ALL}\n")
        
        while True:
            try:
                # Get user input
                user_input = input(f"{Fore.GREEN}You:{Style.RESET_ALL} ").strip()
                
                # Handle empty input
                if not user_input:
                    continue
                
                # Handle commands
                lower_input = user_input.lower()
                
                if lower_input in ["exit", "quit", "bye", "q"]:
                    print(f"\n{Fore.CYAN}👋 Goodbye! Stay ahead of the curve with Chronos-X.{Style.RESET_ALL}\n")
                    break
                
                if lower_input == "clear":
                    self.clear_history()
                    continue
                
                if lower_input == "help":
                    print_banner()
                    continue
                
                if lower_input == "status":
                    self.show_status()
                    continue
                
                if lower_input == "history":
                    self.show_history()
                    continue
                
                if lower_input.startswith("pin "):
                    # Quick context switch: "pin 110001"
                    pin = lower_input.split()[1] if len(lower_input.split()) > 1 else ""
                    if len(pin) == 6 and pin.isdigit():
                        self._set_context(pin)
                    else:
                        print(f"{Fore.RED}Invalid PIN. Use: pin 110001{Style.RESET_ALL}")
                    continue
                
                # Process the query with animated loading
                loading_indicator.start()
                try:
                    response = self.process_query(user_input)
                finally:
                    loading_indicator.stop()
                print_response(response)
                
            except KeyboardInterrupt:
                print(f"\n\n{Fore.CYAN}👋 Interrupted. Goodbye!{Style.RESET_ALL}\n")
                break
            except Exception as e:
                # Security: Don't expose raw stack traces or internal errors to user
                logging.error(f"Error processing query: {str(e)}")
                print(f"\n{Fore.RED}⚠ An error occurred. Please try again.{Style.RESET_ALL}")
                print(f"{Style.DIM}Try again or type 'exit' to quit.{Style.RESET_ALL}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Chronos-X Interactive AI Chatbot - The Weather Forecast for Aadhaar"
    )
    parser.add_argument(
        "--pincode", 
        type=str, 
        help="Initial PIN code for context (optional)"
    )
    args = parser.parse_args()
    
    chatbot = ChronosChatbot(initial_pincode=args.pincode)
    chatbot.run()


if __name__ == "__main__":
    main()
