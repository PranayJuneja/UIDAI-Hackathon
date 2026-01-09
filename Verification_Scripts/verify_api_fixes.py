#!/usr/bin/env python3
"""Verification script for API fixes."""

import requests

BASE_URL = "http://127.0.0.1:8000"

def test_hr_districts():
    """Test HR districts for duplicate key fix."""
    print("=" * 60)
    print("TEST 1: HR Districts (Duplicate Key Fix)")
    print("=" * 60)
    
    r = requests.get(f"{BASE_URL}/api/states/HR")
    if r.status_code != 200:
        print(f"❌ HR state returned {r.status_code}")
        return False
    
    data = r.json()
    districts = data.get("districts", [])
    district_ids = [d["district_id"] for d in districts]
    
    print(f"Total districts: {len(districts)}")
    
    # Check for duplicates
    unique_ids = set(district_ids)
    if len(unique_ids) != len(district_ids):
        print("❌ DUPLICATE IDs FOUND!")
        from collections import Counter
        counts = Counter(district_ids)
        for id, count in counts.items():
            if count > 1:
                print(f"  - {id}: {count} occurrences")
        return False
    
    print("✅ All district IDs are unique")
    
    # Check for Yamunanagar/Yamuna Nagar
    yamuna_ids = [d for d in districts if "YAMUNA" in d["district_id"]]
    if yamuna_ids:
        print("Yamuna-related districts:")
        for d in yamuna_ids:
            print(f"  - {d['district_id']}: {d['district_name']}")
    
    return True

def test_ut_states():
    """Test UT states DD and DN."""
    print()
    print("=" * 60)
    print("TEST 2: UT States (DD/DN Data Retrieval)")
    print("=" * 60)
    
    success = True
    for state_id in ["DD", "DN"]:
        r = requests.get(f"{BASE_URL}/api/states/{state_id}")
        if r.status_code == 200:
            data = r.json()
            district_count = data.get("district_count", 0)
            state_info = data.get("state", {})
            print(f"✅ {state_id}: 200 OK - {district_count} districts")
            if "districts" in data:
                for d in data["districts"]:
                    print(f"   - {d['district_name']}")
        else:
            print(f"❌ {state_id}: {r.status_code}")
            success = False
    
    return success

def test_health():
    """Test health endpoint."""
    print()
    print("=" * 60)
    print("TEST 3: Health Check")
    print("=" * 60)
    
    r = requests.get(f"{BASE_URL}/api/health")
    if r.status_code == 200:
        data = r.json()
        print(f"✅ Status: {data.get('status')}")
        print(f"   Data loaded: {data.get('data_loaded')}")
        print(f"   Chatbot available: {data.get('chatbot_available')}")
        print(f"   Pulse vectors rows: {data.get('pulse_vectors_rows')}")
        return True
    else:
        print(f"❌ Health check failed: {r.status_code}")
        return False

if __name__ == "__main__":
    print("\n🔍 API Server Fix Verification\n")
    
    results = []
    results.append(("HR Districts (Duplicate Key)", test_hr_districts()))
    results.append(("UT States (DD/DN)", test_ut_states()))
    results.append(("Health Check", test_health()))
    
    print()
    print("=" * 60)
    print("SUMMARY")
    print("=" * 60)
    all_passed = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {name}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 All tests passed!")
    else:
        print("⚠️ Some tests failed")
