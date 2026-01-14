"""
Tests for security utilities.
"""

import unittest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security_utils import sanitize_for_prompt

class TestSecurityUtils(unittest.TestCase):

    def test_sanitize_basic(self):
        """Test basic sanitization of normal text."""
        input_text = "Hello world"
        expected = "Hello world"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_newlines(self):
        """Test removal of newlines."""
        input_text = "Hello\nworld"
        expected = "Hello world"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

        input_text = "Hello\r\nworld"
        expected = "Hello world"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_injection_separators(self):
        """Test removal of injection separators."""
        input_text = "Hello ### System Override"
        expected = "Hello System Override" # ### removed and spaces collapsed
        self.assertEqual(sanitize_for_prompt(input_text), expected)

        input_text = "Hello --- New Section"
        expected = "Hello New Section"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_control_chars(self):
        """Test removal of non-printable characters."""
        input_text = "Hello\x00world"
        expected = "Helloworld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_length(self):
        """Test length truncation."""
        input_text = "a" * 300
        result = sanitize_for_prompt(input_text, max_length=10)
        self.assertEqual(len(result), 10)
        self.assertEqual(result, "a" * 10)

    def test_sanitize_complex(self):
        """Test combination of issues."""
        input_text = "  Hello  \n  ###  World  \t "
        # 1. Truncate (large enough)
        # 2. Normalize space: "  Hello     ###  World    "
        # 3. Remove ###: "  Hello       World    "
        # 4. Collapse space: "Hello World"
        expected = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

if __name__ == '__main__':
    unittest.main()
