import unittest
import sys
import os

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from security_utils import sanitize_for_prompt, sanitize_location_id, validate_pincode, sanitize_context_data

class TestSecurityUtils(unittest.TestCase):
    def test_sanitize_for_prompt(self):
        # Basic sanitization
        self.assertEqual(sanitize_for_prompt("Hello World"), "Hello World")
        self.assertEqual(sanitize_for_prompt("  Hello   World  "), "Hello World")

        # Control characters
        self.assertEqual(sanitize_for_prompt("Hello\r\nWorld"), "Hello\nWorld")
        self.assertEqual(sanitize_for_prompt("Hello\0World"), "HelloWorld")

        # Unicode normalization (NFKC decomposes compatibility chars like ligatures)
        # Note: NFKC does NOT convert smart quotes to ASCII quotes.
        # It handles things like ⁵ -> 5, etc.
        self.assertEqual(sanitize_for_prompt("ﬁ"), "fi")

        # Length limit (MAX_INPUT_LENGTH = 1000)
        long_string = "a" * 1005
        self.assertEqual(len(sanitize_for_prompt(long_string)), 1000)

    def test_sanitize_location_id(self):
        # Valid IDs
        self.assertEqual(sanitize_location_id("DL_DELHI"), "DL_DELHI")
        self.assertEqual(sanitize_location_id("Jammu & Kashmir"), "Jammu & Kashmir")

        # Invalid IDs
        self.assertEqual(sanitize_location_id("Delhi; DROP TABLE"), "")
        self.assertEqual(sanitize_location_id("<script>"), "")

        # Length limit
        long_id = "A" * 60
        self.assertEqual(len(sanitize_location_id(long_id)), 50)

    def test_validate_pincode(self):
        self.assertTrue(validate_pincode("110001"))
        self.assertTrue(validate_pincode("999999"))
        self.assertFalse(validate_pincode("010000")) # Valid range starts at 100000
        self.assertFalse(validate_pincode("123"))
        self.assertFalse(validate_pincode("1234567"))
        self.assertFalse(validate_pincode("abc"))
        self.assertFalse(validate_pincode(None))

    def test_sanitize_context_data(self):
        data = {
            "key1": "  Value 1  ",
            # \x00 is null byte (unprintable), 2 is printable.
            "key2": ["Item\r1", {"nested": "Value\x002"}],
            "key3": 123  # Should pass through
        }
        sanitized = sanitize_context_data(data)
        self.assertEqual(sanitized["key1"], "Value 1")
        self.assertEqual(sanitized["key2"][0], "Item1")
        self.assertEqual(sanitized["key2"][1]["nested"], "Value2")
        self.assertEqual(sanitized["key3"], 123)

if __name__ == '__main__':
    unittest.main()
