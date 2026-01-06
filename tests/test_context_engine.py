
import unittest
import sys
import os
from datetime import datetime
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from context_engine import ContextEngine

class TestContextEngine(unittest.TestCase):
    def setUp(self):
        self.engine = ContextEngine()
    
    def test_school_season_march(self):
        """March should trigger School Admission season."""
        ctx = self.engine.get_context("560001", datetime(2025, 3, 15))
        drivers = [d["name"] for d in ctx.get("seasonal_drivers", [])]
        self.assertIn("School Admission Season", drivers)
        self.assertIn("Mandatory Biometric Updates (MBU)", drivers)
    
    def test_kharif_october(self):
        """October should trigger Kharif Harvest."""
        ctx = self.engine.get_context("143001", datetime(2025, 10, 15))
        drivers = [d["name"] for d in ctx.get("seasonal_drivers", [])]
        self.assertIn("Kharif Harvest", drivers)
        self.assertNotIn("School Admission Season", drivers)
        
    def test_rabi_april(self):
        """April should trigger Rabi Harvest AND School Season."""
        ctx = self.engine.get_context("143001", datetime(2025, 4, 15))
        drivers = [d["name"] for d in ctx.get("seasonal_drivers", [])]
        self.assertIn("Rabi Harvest", drivers)
        self.assertIn("School Admission Season", drivers)
    
    def test_search_punjab_harvest(self):
        """Search in Punjab (14xxxx) during Oct should yield harvest news."""
        ctx = self.engine.get_context("143001", datetime(2025, 10, 15), run_search=True)
        events = ctx.get("local_events", [])
        self.assertTrue(any("paddy arrival" in e for e in events))
        
    def test_search_bihar_harvest(self):
        """Search in Bihar (84xxxx) during Oct should yield return migration news."""
        ctx = self.engine.get_context("840001", datetime(2025, 10, 15), run_search=True)
        events = ctx.get("local_events", [])
        self.assertTrue(any("returning workers" in e for e in events))
    
    def test_search_bangalore_school(self):
        """Search in Bangalore (56xxxx) during April should yield school news."""
        ctx = self.engine.get_context("560001", datetime(2025, 4, 15), run_search=True)
        events = ctx.get("local_events", [])
        self.assertTrue(any("nursery admission" in e for e in events))
    
    def test_no_search_by_default(self):
        """Search should not run unless explicitly requested."""
        ctx = self.engine.get_context("560001", datetime(2025, 4, 1), run_search=False)
        self.assertEqual(ctx.get("local_events", []), [])

if __name__ == "__main__":
    unittest.main()
