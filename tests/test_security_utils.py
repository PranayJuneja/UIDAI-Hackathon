
import unittest
import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security_utils import sanitize_for_prompt, sanitize_context_data

class TestSecurityUtils(unittest.TestCase):

    def test_sanitize_for_prompt_basic(self):
        """Test basic string sanitization."""
        self.assertEqual(sanitize_for_prompt("Hello World"), "Hello World")
        self.assertEqual(sanitize_for_prompt("  Trim Me  "), "Trim Me")

    def test_sanitize_for_prompt_control_chars(self):
        """Test removal of control characters."""
        # Null byte, Bell, Escape
        input_str = "Hello\x00\x07\x1bWorld"
        self.assertEqual(sanitize_for_prompt(input_str), "HelloWorld")

    def test_sanitize_for_prompt_newlines(self):
        """Test that newlines are preserved, but tabs converted to spaces."""
        input_str = "Line 1\nLine 2\tTabbed"
        self.assertEqual(sanitize_for_prompt(input_str), "Line 1\nLine 2 Tabbed")

    def test_sanitize_for_prompt_unicode(self):
        """Test unicode normalization."""
        # Fraction (NFKC normalizes to fraction slash 1\u20442)
        # We check that it is normalized, even if not to ASCII slash
        self.assertEqual(sanitize_for_prompt("½"), "1⁄2")
        # Fancy text
        self.assertEqual(sanitize_for_prompt("𝔖𝔢𝔠𝔯𝔢𝔱"), "Secret")

    def test_sanitize_for_prompt_length(self):
        """Test length limiting."""
        long_str = "a" * 2000
        sanitized = sanitize_for_prompt(long_str, max_length=10)
        self.assertEqual(len(sanitized), 10)
        self.assertEqual(sanitized, "aaaaaaaaaa")

    def test_sanitize_context_data_dict(self):
        """Test recursive dictionary sanitization."""
        data = {
            "key1": "Value\x001",
            "key2": {
                "subKey": "Value\x072"
            }
        }
        expected = {
            "key1": "Value1",
            "key2": {
                "subKey": "Value2"
            }
        }
        self.assertEqual(sanitize_context_data(data), expected)

    def test_sanitize_context_data_list(self):
        """Test list sanitization."""
        data = ["Item\x001", "Item\x072"]
        expected = ["Item1", "Item2"]
        self.assertEqual(sanitize_context_data(data), expected)

    def test_sanitize_context_data_mixed(self):
        """Test mixed types (int, None, etc)."""
        data = {
            "str": "Clean",
            "int": 123,
            "none": None,
            "bool": True
        }
        # Primitives should be preserved as is
        self.assertEqual(sanitize_context_data(data), data)

if __name__ == '__main__':
    unittest.main()
