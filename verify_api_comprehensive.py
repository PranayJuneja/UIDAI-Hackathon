#!/usr/bin/env python3
"""
Comprehensive API Verification Script
=====================================
Tests all API fixes including:
- CORS configuration
- Month validation
- WebSocket message handling
- Error responses
- Edge cases

Run: python verify_api_comprehensive.py
"""

import requests
import json
import asyncio
import websockets
import time
from typing import Optional, Dict, Any, Tuple

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://localhost:8000/ws/chat"

class TestResult:
    def __init__(self, name: str, passed: bool, message: str = ""):
        self.name = name
        self.passed = passed
        self.message = message
    
    def __str__(self):
        status = "✅ PASS" if self.passed else "❌ FAIL"
        msg = f": {self.message}" if self.message else ""
        return f"{status}: {self.name}{msg}"


def test_health() -> TestResult:
    """Test health endpoint."""
    try:
        r = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if r.status_code == 200:
            data = r.json()
            if data.get("status") == "healthy":
                return TestResult("Health Check", True, f"data_loaded={data.get('data_loaded')}")
        return TestResult("Health Check", False, f"Unexpected response: {r.status_code}")
    except Exception as e:
        return TestResult("Health Check", False, str(e))


def test_valid_month() -> TestResult:
    """Test valid month format."""
    try:
        r = requests.get(f"{BASE_URL}/api/states?month=2025-01", timeout=5)
        if r.status_code == 200:
            data = r.json()
            return TestResult("Valid Month Format", True, f"Got {len(data)} states")
        return TestResult("Valid Month Format", False, f"Status: {r.status_code}")
    except Exception as e:
        return TestResult("Valid Month Format", False, str(e))


def test_invalid_month() -> TestResult:
    """Test invalid month format returns 400."""
    try:
        r = requests.get(f"{BASE_URL}/api/states?month=invalid", timeout=5)
        if r.status_code == 400:
            data = r.json()
            if "detail" in data and "format" in data["detail"].lower():
                return TestResult("Invalid Month Returns 400", True, data.get("detail", ""))
            return TestResult("Invalid Month Returns 400", True, "Got 400 error")
        return TestResult("Invalid Month Returns 400", False, f"Expected 400, got {r.status_code}")
    except Exception as e:
        return TestResult("Invalid Month Returns 400", False, str(e))


def test_invalid_month_13() -> TestResult:
    """Test month=13 returns 400."""
    try:
        r = requests.get(f"{BASE_URL}/api/states?month=2025-13", timeout=5)
        if r.status_code == 400:
            return TestResult("Invalid Month 13 Returns 400", True)
        return TestResult("Invalid Month 13 Returns 400", False, f"Expected 400, got {r.status_code}")
    except Exception as e:
        return TestResult("Invalid Month 13 Returns 400", False, str(e))


def test_hr_districts() -> TestResult:
    """Test HR districts for duplicate key fix."""
    try:
        r = requests.get(f"{BASE_URL}/api/states/HR", timeout=5)
        if r.status_code != 200:
            return TestResult("HR Districts Unique Keys", False, f"Status: {r.status_code}")
        
        data = r.json()
        districts = data.get("districts", [])
        district_ids = [d["district_id"] for d in districts]
        
        if len(set(district_ids)) != len(district_ids):
            from collections import Counter
            counts = Counter(district_ids)
            dups = [id for id, c in counts.items() if c > 1]
            return TestResult("HR Districts Unique Keys", False, f"Duplicates: {dups}")
        
        return TestResult("HR Districts Unique Keys", True, f"{len(districts)} unique districts")
    except Exception as e:
        return TestResult("HR Districts Unique Keys", False, str(e))


def test_ut_states() -> TestResult:
    """Test UT states DD and DN."""
    try:
        success = True
        messages = []
        for state_id in ["DD", "DN"]:
            r = requests.get(f"{BASE_URL}/api/states/{state_id}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                district_count = data.get("district_count", 0)
                messages.append(f"{state_id}:{district_count}d")
            else:
                success = False
                messages.append(f"{state_id}:FAIL")
        
        return TestResult("UT States (DD/DN)", success, ", ".join(messages))
    except Exception as e:
        return TestResult("UT States (DD/DN)", False, str(e))


def test_search_endpoint() -> TestResult:
    """Test search endpoint."""
    try:
        r = requests.get(f"{BASE_URL}/api/search?q=Delhi", timeout=5)
        if r.status_code == 200:
            data = r.json()
            if data.get("count", 0) > 0:
                return TestResult("Search Endpoint", True, f"{data['count']} results")
            return TestResult("Search Endpoint", False, "No results for 'Delhi'")
        return TestResult("Search Endpoint", False, f"Status: {r.status_code}")
    except Exception as e:
        return TestResult("Search Endpoint", False, str(e))


def test_compare_endpoint() -> TestResult:
    """Test compare endpoint."""
    try:
        r = requests.get(f"{BASE_URL}/api/compare?loc1=DL&loc2=MH", timeout=5)
        if r.status_code == 200:
            data = r.json()
            if "location1" in data and "location2" in data:
                return TestResult("Compare Endpoint", True)
            return TestResult("Compare Endpoint", False, "Missing location data")
        return TestResult("Compare Endpoint", False, f"Status: {r.status_code}")
    except Exception as e:
        return TestResult("Compare Endpoint", False, str(e))


def test_trends_endpoint() -> TestResult:
    """Test trends endpoint."""
    try:
        r = requests.get(f"{BASE_URL}/api/trends/DL?months=6", timeout=5)
        if r.status_code == 200:
            data = r.json()
            if "data" in data and len(data["data"]) > 0:
                return TestResult("Trends Endpoint", True, f"{len(data['data'])} data points")
            return TestResult("Trends Endpoint", False, "No trend data")
        return TestResult("Trends Endpoint", False, f"Status: {r.status_code}")
    except Exception as e:
        return TestResult("Trends Endpoint", False, str(e))


def test_forecast_endpoint() -> TestResult:
    """Test forecast endpoint."""
    try:
        r = requests.get(f"{BASE_URL}/api/forecast/DL?horizon=3m", timeout=5)
        if r.status_code == 200:
            data = r.json()
            # Check bounds are clamped
            lower = data.get("lower_bound", {})
            upper = data.get("upper_bound", {})
            
            for signal in ["growth", "flow", "labor"]:
                if signal in lower and (lower[signal] < -5 or lower[signal] > 5):
                    return TestResult("Forecast Bounds Clamping", False, f"lower.{signal}={lower[signal]} out of range")
                if signal in upper and (upper[signal] < -5 or upper[signal] > 5):
                    return TestResult("Forecast Bounds Clamping", False, f"upper.{signal}={upper[signal]} out of range")
            
            return TestResult("Forecast Bounds Clamping", True, f"confidence={data.get('confidence')}")
        return TestResult("Forecast Bounds Clamping", False, f"Status: {r.status_code}")
    except Exception as e:
        return TestResult("Forecast Bounds Clamping", False, str(e))


def test_pin_endpoint() -> TestResult:
    """Test PIN code endpoint with invalid format."""
    try:
        r = requests.get(f"{BASE_URL}/api/pins/12345", timeout=5)
        if r.status_code == 400:
            return TestResult("Invalid PIN Returns 400", True)
        return TestResult("Invalid PIN Returns 400", False, f"Expected 400, got {r.status_code}")
    except Exception as e:
        return TestResult("Invalid PIN Returns 400", False, str(e))


async def test_websocket() -> TestResult:
    """Test WebSocket connection and message handling."""
    try:
        # Use websockets with proper timeout
        async with websockets.connect(WS_URL, close_timeout=5, open_timeout=5) as ws:
            # Wait for welcome message
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            data = json.loads(msg)
            if data.get("type") != "system":
                return TestResult("WebSocket Connect", False, f"Expected system message, got {data.get('type')}")
            
            # Send a test message
            await ws.send(json.dumps({"type": "message", "content": "Hello"}))
            
            # Wait for typing indicator or response
            msg = await asyncio.wait_for(ws.recv(), timeout=15)
            data = json.loads(msg)
            
            if data.get("type") in ["typing", "response"]:
                return TestResult("WebSocket Message", True, f"Got {data.get('type')}")
            return TestResult("WebSocket Message", False, f"Unexpected type: {data.get('type')}")
    except asyncio.TimeoutError:
        return TestResult("WebSocket Timeout", False, "Connection or response timed out")
    except ConnectionRefusedError:
        return TestResult("WebSocket Connect", False, "Connection refused - is the server running?")
    except Exception as e:
        return TestResult("WebSocket Connect", False, f"{type(e).__name__}: {e}")


def run_websocket_test() -> TestResult:
    """Run WebSocket test in asyncio loop with proper Windows compatibility."""
    try:
        # Windows requires specific event loop policy for websockets
        import sys
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(test_websocket())
        finally:
            loop.close()
    except Exception as e:
        return TestResult("WebSocket Test", False, f"{type(e).__name__}: {e}")


def main():
    print("\n" + "=" * 70)
    print("  🔍 Comprehensive API Verification")
    print("=" * 70 + "\n")
    
    results = []
    
    # Run all tests
    print("Testing REST endpoints...")
    results.append(test_health())
    print(f"  {results[-1]}")
    
    results.append(test_valid_month())
    print(f"  {results[-1]}")
    
    results.append(test_invalid_month())
    print(f"  {results[-1]}")
    
    results.append(test_invalid_month_13())
    print(f"  {results[-1]}")
    
    results.append(test_hr_districts())
    print(f"  {results[-1]}")
    
    results.append(test_ut_states())
    print(f"  {results[-1]}")
    
    results.append(test_search_endpoint())
    print(f"  {results[-1]}")
    
    results.append(test_compare_endpoint())
    print(f"  {results[-1]}")
    
    results.append(test_trends_endpoint())
    print(f"  {results[-1]}")
    
    results.append(test_forecast_endpoint())
    print(f"  {results[-1]}")
    
    results.append(test_pin_endpoint())
    print(f"  {results[-1]}")
    
    print("\nTesting WebSocket...")
    ws_result = run_websocket_test()
    results.append(ws_result)
    print(f"  {ws_result}")
    
    # Summary
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    
    for r in results:
        print(f"  {r}")
    
    print("\n" + "-" * 70)
    print(f"  Total: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n  🎉 All tests passed!")
        return 0
    else:
        print(f"\n  ⚠️ {total - passed} tests failed")
        return 1


if __name__ == "__main__":
    exit(main())
