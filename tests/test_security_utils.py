import unittest
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security_utils import sanitize_for_prompt, sanitize_location_id

class TestSecurityUtils(unittest.TestCase):
    def test_sanitize_for_prompt_basic(self):
        input_text = "Hello   World"
        expected = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_for_prompt_control_chars(self):
        input_text = "Hello\x00World"
        expected = "HelloWorld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_for_prompt_newlines(self):
        input_text = "Hello\nWorld"
        expected = "Hello\nWorld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_for_prompt_tabs(self):
        input_text = "Hello\tWorld"
        expected = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_for_prompt_unicode(self):
        # NFKC normalization: composed characters
        input_text = "\u0043\u0327" # C with cedilla decomposed
        expected = "\u00C7" # C with cedilla composed
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_for_prompt_length(self):
        input_text = "a" * 2000
        result = sanitize_for_prompt(input_text, max_length=10)
        self.assertEqual(len(result), 10)
        self.assertEqual(result, "a" * 10)

    def test_sanitize_location_id_valid(self):
        self.assertEqual(sanitize_location_id("Mumbai"), "Mumbai")
        self.assertEqual(sanitize_location_id("New_York"), "New_York")
        self.assertEqual(sanitize_location_id("Jammu & Kashmir"), "Jammu & Kashmir")

    def test_sanitize_location_id_invalid(self):
        self.assertEqual(sanitize_location_id("Mumbai!"), "") # ! not allowed
        self.assertEqual(sanitize_location_id("Select *"), "") # * not allowed
        self.assertEqual(sanitize_location_id("alert(1)"), "") # () not allowed

    def test_sanitize_location_id_length(self):
        input_text = "a" * 100
        # It should truncate to 50 THEN check regex.
        # "a"*50 matches regex.
        self.assertEqual(len(sanitize_location_id(input_text)), 50)

    def test_sanitize_location_id_empty(self):
        self.assertEqual(sanitize_location_id(""), "")
        self.assertEqual(sanitize_location_id(None), "")

if __name__ == '__main__':
    unittest.main()
