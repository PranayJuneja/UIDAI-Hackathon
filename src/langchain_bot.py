"""
Chronos-X LangChain Bot
=======================
The "Brain" of the operation.
Uses LangChain to control the dashboard map and answer questions.
"""

import json
import logging
from typing import Dict, Any, List, Optional
import os

from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Internal engines
try:
    from src.chronos_engine import ChronosX, ChronosDataEngine
    from src.attestation import Attestor
    from src.security_utils import sanitize_for_prompt
except ImportError:
    # Fallback for relative imports
    from chronos_engine import ChronosX, ChronosDataEngine
    from attestation import Attestor
    from security_utils import sanitize_for_prompt

logger = logging.getLogger("ChronosBot")

SYSTEM_PROMPT = """You are **Chronos-X**, the AI Co-pilot for the UIDAI Dashboard.

## Your Mission
You control the "Weather Forecast for Aadhaar" dashboard. You don't just talk; you **act**.
Your goal is to help users visualize data on the interactive map.

## Capabilities (Tools)
You have access to valid tools to control hooks in the dashboard.
1. `control_map(action, target)`: USE THIS FREQUENTLY.
   - If user says "Show me Delhi", call `control_map("fly_to", "Delhi")`.
   - If user says "Compare Mumbai and Bangalore", call `control_map("compare", "Mumbai vs Bangalore")`.
   - If user says "Zoom in", call `control_map("zoom", "in")`.

2. `get_aadhaar_stats(pincode)`:
   - Use this to get Growth, Flow, and Labor signals for a PIN code.
   - Always quote the numbers from this tool in your text response.

## Rules
- **Be Action-Oriented**: If a user mentions a place, ALWAYS try to show it on the map.
- **Context Aware**: If the user asks "Why is it high?", assume "it" is the last location you looked at.
- **Short & Professional**: Keep text responses under 3 sentences unless asked for a detailed report.
- **UIDAI Focus**: You analyze Aadhaar Enrolment (Growth), Updates (Flow), and Biometrics (Labor).

## Response Format
You will be invoked via an Agent. Your final text response should be friendly and data-driven.
"""

class LangChainBot:
    """
    Main chatbot class using LangChain Agents.
    """
    
    def __init__(self):
        self.engine = ChronosX()
        self.data_engine = ChronosDataEngine()  # Should be singleton, but init here for tools
        
        # Initialize LLM
        # Priority: Env Var > Vercel Gateway > OpenAI Default
        api_key = os.environ.get("AI_GATEWAY_API_KEY") or os.environ.get("OPENAI_API_KEY")
        base_url = os.environ.get("AI_GATEWAY_BASE_URL") or os.environ.get("OPENAI_BASE_URL")
        
        # If no base_url is provided but we have a gateway key, default to Vercel's standard endpoint
        if not base_url and os.environ.get("AI_GATEWAY_API_KEY"):
            base_url = "https://gateway.ai.vercel.dev/v1"

        model = os.environ.get("AI_MODEL", "gpt-3.5-turbo")

        if not api_key:
            logger.warning("No API Key found. Chatbot will fail.")
        
        self.llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url,
            temperature=0.3,
            streaming=True,  # Enable streaming for real-time token output
            # Vercel AI Gateway often requires an app name for analytics
            model_kwargs={
                "extra_headers": {
                    "HTTP-Referer": "https://uidai-hackathon.vercel.app",
                    "X-Title": "Chronos Aadhaar Analytics"
                }
            }
        )

        # Define Tools
        @tool
        def control_map(action: str, target: str = "") -> str:
            """
            Control the dashboard map.
            actions: 'fly_to' (for locations), 'compare' (for two locations), 'zoom' ('in'/'out'), 'reset'.
            target: The city name, state name, or PIN code (e.g. "Delhi", "560001"). For comparison use "Loc1 vs Loc2".
            """
            # This tool doesn't *actually* move the map (the frontend does that). 
            # It returns a special string that the Agent will include in its "action" output.
            return f"ACTION_TRIGGERED: {action} -> {target}"

        @tool
        def get_aadhaar_stats(pincode: str) -> str:
            """
            Get Aadhaar Pulse signals (Growth, Flow, Labor) for a 6-digit PIN code.
            Returns JSON string with normalized values (0-1).
            """
            # Use the existing engine
            data = self.engine.lookup(pincode)
            if not data:
                 # Try on-demand
                 return json.dumps({"error": "Data not found for PIN. Suggest user tries a major city."})
            
            # Format nicely for the LLM
            stats = {
                "pincode": pincode,
                "state": data.get("state"),
                "growth": data.get("current", {}).get("growth"),
                "flow": data.get("current", {}).get("flow"),
                "labor": data.get("current", {}).get("labor"),
                "forecast": data.get("forecast_summary")
            }
            return json.dumps(stats)

        self.tools = [control_map, get_aadhaar_stats]

        # Create Agent
        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])

        self.agent = create_openai_functions_agent(self.llm, self.tools, prompt)
        self.agent_executor = AgentExecutor(agent=self.agent, tools=self.tools, verbose=True)

        # Session memory (simple dict for Hackathon)
        self.chat_history = [] 

    async def process_message(self, user_text: str) -> Dict[str, Any]:
        """
        Input: User text
        Output: { "text": "...", "client_action": { type: "...", payload: "..." } }
        """
        # Sanitize input to prevent injection attacks
        user_text = sanitize_for_prompt(user_text)

        response = await self.agent_executor.ainvoke({
            "input": user_text,
            "chat_history": self.chat_history[-10:]  # Keep last 10 turns
        })

        output_text = response["output"]
        
        # Save to memory
        self.chat_history.append(HumanMessage(content=user_text))
        self.chat_history.append(AIMessage(content=output_text))

        # Parse output for Map Actions
        # Since the tool just returns a string, we need to see if the tool was CALLED.
        # LangChain's intermediate_steps contains the tool calls.
        client_action = None
        
        for step in response.get("intermediate_steps", []):
            tool_call = step[0]  # AgentAction object
            if tool_call.tool == "control_map":
                # Extract args
                tool_input = tool_call.tool_input
                action_type = tool_input.get("action")
                target = tool_input.get("target")

                # Map to frontend structure
                if action_type == "fly_to":
                    client_action = {"type": "FLY_TO", "payload": target}
                elif action_type == "compare":
                    client_action = {"type": "COMPARE", "payload": target}
                elif action_type == "zoom":
                    client_action = {"type": "ZOOM", "payload": target}
                elif action_type == "reset":
                    client_action = {"type": "RESET", "payload": None}

        return {
            "text": output_text,
            "client_action": client_action
        }
    
    async def process_message_stream(self, user_text: str):
        """
        Streaming version of process_message.
        Yields tokens as they are generated for real-time UX.
        
        Yields:
            {"type": "token", "content": "..."} for each token
            {"type": "action", "client_action": {...}} at the end if applicable
        """
        # Sanitize input to prevent injection attacks
        user_text = sanitize_for_prompt(user_text)

        accumulated_text = ""
        client_action = None
        
        try:
            # Use astream_events for streaming with tool tracking
            async for event in self.agent_executor.astream_events(
                {"input": user_text, "chat_history": self.chat_history[-10:]},
                version="v2"
            ):
                kind = event.get("event")
                
                # Stream tokens from the LLM
                if kind == "on_chat_model_stream":
                    chunk = event.get("data", {}).get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        accumulated_text += chunk.content
                        yield {"type": "token", "content": chunk.content}
                
                # Capture tool calls for client actions
                elif kind == "on_tool_end":
                    tool_name = event.get("name")
                    if tool_name == "control_map":
                        # Get the input from the tool run
                        tool_input = event.get("data", {}).get("input", {})
                        action_type = tool_input.get("action")
                        target = tool_input.get("target")
                        
                        if action_type == "fly_to":
                            client_action = {"type": "FLY_TO", "payload": target}
                        elif action_type == "compare":
                            client_action = {"type": "COMPARE", "payload": target}
                        elif action_type == "zoom":
                            client_action = {"type": "ZOOM", "payload": target}
                        elif action_type == "reset":
                            client_action = {"type": "RESET", "payload": None}
            
            # Save to memory
            if accumulated_text:
                self.chat_history.append(HumanMessage(content=user_text))
                self.chat_history.append(AIMessage(content=accumulated_text))
            
            # Yield final action if present
            if client_action:
                yield {"type": "action", "client_action": client_action}
                
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            yield {"type": "token", "content": f"Error: {str(e)}"}
