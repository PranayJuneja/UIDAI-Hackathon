"""
Context Engine module for Chronos-X.
===================================
Injects qualitative context (calendar events, local news) into forecasts
without modifying the underlying quantitative numbers.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger("ChronosX")

class ContextEngine:
    """
    Contextual Intelligence Layer for Chronos-X.
    
    Provides qualitative context based on:
    1. Deterministic Calendar (Seasonality)
    2. Live/Mock Web Search (Local Events)
    """
    
    def __init__(self):
        self.logger = logging.getLogger("ChronosX.Context")
        
    def get_context(
        self, 
        pincode: str, 
        target_month: datetime,
        run_search: bool = False
    ) -> Dict[str, Any]:
        """
        Generate contextual intelligence for a prediction.
        
        Args:
            pincode: Target PIN code
            target_month: The month being predicted
            run_search: If True, trigger web search for local events
            
        Returns:
            Dictionary with:
            - seasonal_drivers: List of active seasonal factors
            - local_events: News/events from search (if run_search=True)
        """
        context = {
            "seasonal_drivers": self._get_calendar_events(target_month),
            "local_events": []
        }
        
        if run_search:
            context["local_events"] = self._search_events(pincode, target_month)
            
        return context

    def _get_calendar_events(self, date: datetime) -> List[Dict[str, str]]:
        """
        Map month to active seasonal drivers.
        
        Based on "overconstruct.md" findings:
        - School Admissions: Mar-Jun (Growth Signal)
        - Kharif Harvest: Oct-Nov (Flow/Labor Signal)
        - Rabi Harvest: Mar-Apr (Flow/Labor Signal)
        - MBU Deadlines: All Year (Biometric Signal)
        """
        month = date.month
        drivers = []
        
        # 1. School Admissions (March-June)
        if 3 <= month <= 6:
            drivers.append({
                "name": "School Admission Season",
                "months": "March-June",
                "signal": "Growth (0-5y)",
                "hint": "Expect surge in child enrolments (0-5y) as schools require Aadhaar for admission."
            })
            
        # 2. Kharif Harvest (Oct-Nov)
        if 10 <= month <= 11:
            drivers.append({
                "name": "Kharif Harvest",
                "months": "Oct-Nov",
                "signal": "Flow & Labor",
                "hint": "Active harvest season. Expect labor movement (Arrival in agri belts vs Return in source belts)."
            })
            
        # 3. Rabi Harvest (March-April)
        if 3 <= month <= 4:
            drivers.append({
                "name": "Rabi Harvest",
                "months": "Mar-Apr",
                "signal": "Flow & Labor",
                "hint": "Secondary harvest season. Expect moderate labor migration."
            })
            
        # 4. MBU Deadlines (Always active context, but especially end of financial year)
        # We'll just add it as a general background driver
        drivers.append({
            "name": "Mandatory Biometric Updates (MBU)",
            "months": "Year-round",
            "signal": "Biometric (5y/15y)",
            "hint": "Check for 5y/15y age clusters needing mandatory updates."
        })
        
        return drivers

    def _search_events(self, pincode: str, date: datetime) -> List[str]:
        """
        Wrapper for live web search (Mock Mode for stability).
        
        In a production system, this would call Google/Bing Search API.
        For Hackathon/Demo, we return deterministic "news" for specific regions
        to demonstrate the capability without flakiness.
        """
        # Mock responses for specific scenarios from overconstruct.md
        
        # Punjab (Agri Destination) + October (Kharif)
        if pincode.startswith("14") and date.month == 10:
            return [
                "Local mandis preparing for record paddy arrival.",
                "Admin sets up temporary labor camps near Ludhiana.",
                "District magistrate orders special Aadhaar camps for migrant workers."
            ]
            
        # Bihar (Labor Source) + October (Kharif)
        if pincode.startswith("84") and date.month == 10:
            return [
                "Special trains announced for workers returning from Punjab for Chhath Puja.",
                "Local panchayats report high number of returning workers."
            ]
            
        # Bangalore/Delhi (Metro) + April (School)
        if (pincode.startswith("56") or pincode.startswith("11")) and date.month == 4:
            return [
                "Private schools issue circulars making Aadhaar mandatory for nursery admission.",
                "Education department warns schools not to deny admission without Aadhaar.",
                "Long queues reported at enrolment centers due to admission rush."
            ]
            
        # Default fallback
        return []

# Singleton instance for easy import
context_engine = ContextEngine()
