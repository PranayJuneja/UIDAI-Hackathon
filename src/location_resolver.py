"""
Location Resolver for Chronos-X
================================
Resolves natural language location names (cities, states) to PIN codes.

This enables queries like "Delhi" instead of requiring exact PIN codes.
"""

import polars as pl
from pathlib import Path
from typing import List, Optional, Dict
import re

# State to PIN prefix mapping (first 2-3 digits)
# Based on Indian PIN code system
STATE_PIN_PREFIXES: Dict[str, List[str]] = {
    # North India
    "delhi": ["110"],
    "haryana": ["121", "122", "123", "124", "125", "126", "127", "131", "132", "133", "134", "135", "136"],
    "punjab": ["140", "141", "142", "143", "144", "145", "146", "147", "148", "150", "151", "152", "160"],
    "himachal pradesh": ["171", "172", "173", "174", "175", "176", "177"],
    "jammu and kashmir": ["180", "181", "182", "184", "185", "190", "191", "192", "193", "194"],
    "uttarakhand": ["246", "247", "248", "249", "262", "263"],
    "chandigarh": ["160"],
    
    # West India
    "maharashtra": ["400", "401", "402", "403", "410", "411", "412", "413", "414", "415", "416", "421", "422", "423", "424", "425", "431", "440", "441", "442", "443", "444", "445"],
    "gujarat": ["360", "361", "362", "363", "364", "365", "370", "380", "381", "382", "383", "384", "385", "387", "388", "389", "390", "391", "392", "393", "394", "395", "396"],
    "goa": ["403"],
    "rajasthan": ["301", "302", "303", "304", "305", "306", "307", "311", "312", "313", "314", "321", "322", "323", "324", "325", "326", "327", "328", "331", "332", "333", "334", "335"],
    
    # South India
    "karnataka": ["560", "561", "562", "563", "570", "571", "572", "573", "574", "575", "576", "577", "580", "581", "582", "583", "584", "585", "586", "587", "590", "591"],
    "tamil nadu": ["600", "601", "602", "603", "604", "605", "606", "607", "608", "609", "610", "611", "612", "613", "614", "620", "621", "622", "623", "624", "625", "626", "627", "628", "629", "630", "631", "632", "633", "634", "635", "636", "637", "638", "639", "641", "642", "643"],
    "kerala": ["670", "671", "672", "673", "674", "675", "676", "677", "678", "679", "680", "681", "682", "683", "684", "685", "686", "687", "688", "689", "690", "691", "692", "693", "694", "695", "696"],
    "andhra pradesh": ["500", "501", "502", "503", "504", "505", "506", "507", "508", "509", "515", "516", "517", "518", "520", "521", "522", "523", "524", "530", "531", "532", "533", "534", "535"],
    "telangana": ["500", "501", "502", "503", "504", "505", "506", "507", "508", "509"],
    
    # East India
    "west bengal": ["700", "711", "712", "713", "721", "722", "723", "731", "732", "733", "734", "735", "736", "737", "741", "742", "743"],
    "odisha": ["751", "752", "753", "754", "755", "756", "757", "758", "759", "760", "761", "762", "763", "764", "765", "766", "767", "768", "769", "770"],
    "bihar": ["800", "801", "802", "803", "804", "805", "811", "812", "813", "814", "821", "822", "823", "824", "841", "842", "843", "844", "845", "846", "847", "848", "851", "852", "853", "854", "855"],
    "jharkhand": ["813", "814", "815", "822", "825", "826", "827", "828", "829", "831", "832", "833", "834", "835"],
    
    # Central India
    "madhya pradesh": ["450", "451", "452", "453", "454", "455", "456", "457", "458", "460", "461", "462", "463", "464", "465", "466", "467", "470", "471", "472", "473", "474", "475", "476", "477", "480", "481", "482", "483", "484", "485", "486", "487", "488"],
    "chhattisgarh": ["490", "491", "492", "493", "494", "495", "496", "497"],
    
    # North East
    "assam": ["781", "782", "783", "784", "785", "786", "787", "788"],
    "meghalaya": ["793", "794"],
    "manipur": ["795"],
    "mizoram": ["796"],
    "tripura": ["799"],
    "nagaland": ["797", "798"],
    "arunachal pradesh": ["790", "791", "792"],
    "sikkim": ["737"],
    
    # Others
    "uttar pradesh": ["201", "202", "203", "204", "205", "206", "207", "208", "209", "210", "211", "212", "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231", "232", "233", "241", "242", "243", "244", "245", "246", "247", "250", "251", "261", "262", "271", "272", "273", "274", "275", "276", "277", "281", "282", "283", "284", "285"],
}

# City to state mapping for common cities
CITY_TO_STATE: Dict[str, str] = {
    "delhi": "delhi",
    "new delhi": "delhi",
    "mumbai": "maharashtra",
    "bombay": "maharashtra",
    "pune": "maharashtra",
    "nagpur": "maharashtra",
    "bangalore": "karnataka",
    "bengaluru": "karnataka",
    "mysore": "karnataka",
    "chennai": "tamil nadu",
    "madras": "tamil nadu",
    "coimbatore": "tamil nadu",
    "hyderabad": "telangana",
    "secunderabad": "telangana",
    "kolkata": "west bengal",
    "calcutta": "west bengal",
    "ahmedabad": "gujarat",
    "surat": "gujarat",
    "vadodara": "gujarat",
    "jaipur": "rajasthan",
    "jodhpur": "rajasthan",
    "udaipur": "rajasthan",
    "lucknow": "uttar pradesh",
    "kanpur": "uttar pradesh",
    "varanasi": "uttar pradesh",
    "agra": "uttar pradesh",
    "noida": "uttar pradesh",
    "gurgaon": "haryana",
    "gurugram": "haryana",
    "faridabad": "haryana",
    "chandigarh": "chandigarh",
    "bhopal": "madhya pradesh",
    "indore": "madhya pradesh",
    "patna": "bihar",
    "ranchi": "jharkhand",
    "bhubaneswar": "odisha",
    "guwahati": "assam",
    "kochi": "kerala",
    "cochin": "kerala",
    "trivandrum": "kerala",
    "thiruvananthapuram": "kerala",
    "visakhapatnam": "andhra pradesh",
    "vizag": "andhra pradesh",
    "vijayawada": "andhra pradesh",
    "goa": "goa",
    "panaji": "goa",
    "shimla": "himachal pradesh",
    "dehradun": "uttarakhand",
    "srinagar": "jammu and kashmir",
    "jammu": "jammu and kashmir",
    "amritsar": "punjab",
    "ludhiana": "punjab",
    "raipur": "chhattisgarh",
}

# City-specific PIN prefixes (more specific than state)
CITY_PIN_PREFIXES: Dict[str, List[str]] = {
    "delhi": ["110"],
    "new delhi": ["110"],
    "mumbai": ["400"],
    "pune": ["411"],
    "bangalore": ["560"],
    "bengaluru": ["560"],
    "chennai": ["600"],
    "hyderabad": ["500"],
    "kolkata": ["700"],
    "ahmedabad": ["380"],
    "jaipur": ["302"],
    "lucknow": ["226"],
    "gurgaon": ["122"],
    "gurugram": ["122"],
    "noida": ["201"],
    "bhopal": ["462"],
    "indore": ["452"],
    "chandigarh": ["160"],
    "kochi": ["682"],
    "cochin": ["682"],
    "goa": ["403"],
    "shimla": ["171"],
    "dehradun": ["248"],
}


class LocationResolver:
    """
    Resolves natural language location names to PIN codes.
    
    Can work in two modes:
    1. Static: Uses predefined mappings (fast, offline)
    2. Dynamic: Uses pulse_vectors.parquet for actual PIN codes
    """
    
    def __init__(self, pulse_table_path: Optional[str] = None):
        """
        Initialize the resolver.
        
        Args:
            pulse_table_path: Path to pulse_vectors.parquet for dynamic resolution
        """
        self.pulse_table: Optional[pl.DataFrame] = None
        self.available_pincodes: set = set()
        self.pincode_to_state: Dict[str, str] = {}
        
        if pulse_table_path:
            self._load_pulse_table(pulse_table_path)
        else:
            # Try default path
            default_path = Path(__file__).parent.parent / "data" / "output" / "pulse_vectors.parquet"
            if default_path.exists():
                self._load_pulse_table(str(default_path))
    
    def _load_pulse_table(self, path: str):
        """Load pulse table for dynamic resolution."""
        try:
            self.pulse_table = pl.read_parquet(path)
            # Get unique pincodes and their states
            unique_pins = self.pulse_table.select(["pincode", "state"]).unique()
            
            # Convert pincodes to strings (they might be integers in the parquet)
            pincodes = unique_pins["pincode"].to_list()
            states = unique_pins["state"].to_list()
            
            self.available_pincodes = set(str(p) for p in pincodes)
            
            # Build pincode to state mapping
            for pin, state in zip(pincodes, states):
                self.pincode_to_state[str(pin)] = state
                
        except Exception as e:
            print(f"Warning: Could not load pulse table: {e}")
    
    def resolve(self, query: str) -> List[str]:
        """
        Resolve a location query to a list of PIN codes.
        
        Args:
            query: Location query (PIN code, city name, or state name)
            
        Returns:
            List of matching PIN codes (may be empty if no match)
        """
        query = query.strip().lower()
        
        # 1. Check if it's already a valid PIN code (6 digits)
        if re.match(r'^\d{6}$', query):
            if self.available_pincodes and query in self.available_pincodes:
                return [query]
            elif not self.available_pincodes:
                # No data loaded, assume valid
                return [query]
            else:
                # PIN not in our data
                return []
        
        # 2. Check if it's a city
        if query in CITY_TO_STATE:
            state = CITY_TO_STATE[query]
            return self._get_pins_for_location(query, state, is_city=True)
        
        # 3. Check if it's a state
        if query in STATE_PIN_PREFIXES:
            return self._get_pins_for_location(query, query, is_city=False)
        
        # 4. Try partial matching for common variations
        for city, state in CITY_TO_STATE.items():
            if query in city or city in query:
                return self._get_pins_for_location(city, state, is_city=True)
        
        for state in STATE_PIN_PREFIXES.keys():
            if query in state or state in query:
                return self._get_pins_for_location(state, state, is_city=False)
        
        return []
    
    def _get_pins_for_location(self, location: str, state: str, is_city: bool) -> List[str]:
        """Get PIN codes for a location, using data if available."""
        
        # If we have actual data, use it
        if self.available_pincodes:
            matching_pins = []
            
            # Get prefixes for this location
            if is_city and location in CITY_PIN_PREFIXES:
                prefixes = CITY_PIN_PREFIXES[location]
            elif state in STATE_PIN_PREFIXES:
                prefixes = STATE_PIN_PREFIXES[state]
            else:
                prefixes = []
            
            # Find PINs that match these prefixes
            for pin in self.available_pincodes:
                for prefix in prefixes:
                    if pin.startswith(prefix):
                        matching_pins.append(pin)
                        break
            
            # Sort and limit
            matching_pins.sort()
            return matching_pins[:50]  # Limit to 50 for performance
        
        # Fallback: Generate sample PINs from prefixes
        if is_city and location in CITY_PIN_PREFIXES:
            prefixes = CITY_PIN_PREFIXES[location]
        elif state in STATE_PIN_PREFIXES:
            prefixes = STATE_PIN_PREFIXES[state]
        else:
            return []
        
        # Generate sample PINs (just the first prefix + 001)
        return [f"{prefixes[0]}001"]
    
    def get_state_for_pin(self, pincode: str) -> Optional[str]:
        """Get the state name for a PIN code."""
        if pincode in self.pincode_to_state:
            return self.pincode_to_state[pincode]
        
        # Fallback: use prefix mapping
        for state, prefixes in STATE_PIN_PREFIXES.items():
            for prefix in prefixes:
                if pincode.startswith(prefix):
                    return state.title()
        
        return None
    
    def get_representative_pin(self, location: str) -> Optional[str]:
        """
        Get a single representative PIN code for a location.
        Useful when you need just one example PIN.
        """
        pins = self.resolve(location)
        return pins[0] if pins else None


# Convenience function
def resolve_location(query: str, pulse_table_path: Optional[str] = None) -> List[str]:
    """
    Resolve a location query to PIN codes.
    
    Args:
        query: City name, state name, or PIN code
        pulse_table_path: Optional path to pulse_vectors.parquet
        
    Returns:
        List of matching PIN codes
    """
    resolver = LocationResolver(pulse_table_path)
    return resolver.resolve(query)


# Test when run directly
if __name__ == "__main__":
    resolver = LocationResolver()
    
    test_queries = [
        "Delhi",
        "110001",
        "Mumbai",
        "Karnataka",
        "Bangalore",
        "chennai",
        "HYDERABAD",
    ]
    
    print("Location Resolution Tests:")
    print("=" * 50)
    
    for query in test_queries:
        result = resolver.resolve(query)
        print(f"'{query}' -> {result[:5]}{'...' if len(result) > 5 else ''} ({len(result)} total)")
