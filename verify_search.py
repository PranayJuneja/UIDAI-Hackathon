
import sys
import logging
from api_server import ChronosDataEngine, STATE_ID_MAP

# Setup minimal logging
logging.basicConfig(level=logging.INFO)

def verify_fix():
    print("Initializing Engine...")
    engine = ChronosDataEngine()
    
    query = "Yam"
    print(f"Searching for '{query}'...")
    results = engine.search_locations(query)
    
    print("\nResults:")
    for r in results:
        print(f"[{r['type']}] ID: {r['id']} | Name: {r['name']}")
        
    # Check for HR_YAM
    ids = [r['id'] for r in results]
    if "HR_YAM" in ids:
        print("\n❌ FAILED: Found truncated ID 'HR_YAM'")
    elif "HR_YAMUNANAGAR" in ids or "HR_YAMUNA_NAGAR" in ids:
        print("\n✅ SUCCESS: Found full ID")
    else:
        print("\n⚠️ WARNING: Yamunanagar not found in results?")

if __name__ == "__main__":
    verify_fix()
