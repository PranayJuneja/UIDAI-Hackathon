import unittest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security_utils import sanitize_for_prompt, sanitize_context_data

class TestSecurityUtils(unittest.TestCase):
    def test_sanitize_for_prompt(self):
        # Basic trimming
        self.assertEqual(sanitize_for_prompt(" hello "), "hello")

        # Tabs to spaces
        self.assertEqual(sanitize_for_prompt("hello\tworld"), "hello world")

        # Control characters removal (keep internal newline)
        self.assertEqual(sanitize_for_prompt("hello\x00world\nnext"), "helloworld\nnext")

        # Whitespace collapsing
        self.assertEqual(sanitize_for_prompt("hello   world"), "hello world")

        # Unicode normalization (NFKC)
        # e.g., '²' (superscript 2) -> '2'
        self.assertEqual(sanitize_for_prompt("x²"), "x2")

        # Max length
        long_str = "a" * 2000
        sanitized = sanitize_for_prompt(long_str, max_length=10)
        self.assertEqual(len(sanitized), 10)
        self.assertEqual(sanitized, "aaaaaaaaaa")

    def test_sanitize_context_data(self):
        data = {
            "key1": " value1 ",
            "key2": [" item 1 ", " item 2 "],
            "nested": {"key3": " value3 "}
        }
        expected = {
            "key1": "value1",
            "key2": ["item 1", "item 2"],
            "nested": {"key3": "value3"}
        }
        self.assertEqual(sanitize_context_data(data), expected)

if __name__ == '__main__':
    unittest.main()
