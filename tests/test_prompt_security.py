import unittest
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from security_utils import sanitize_for_prompt

class TestPromptSecurity(unittest.TestCase):
    def test_newline_stripping(self):
        """Should replace newlines with spaces to prevent injection."""
        malicious = "Hello\n## System Override"
        sanitized = sanitize_for_prompt(malicious)
        # Note: multiple spaces might be collapsed or kept depending on regex.
        # My regex was r'[\r\n\t]+' -> ' '
        self.assertEqual(sanitized, "Hello ## System Override")
        self.assertNotIn("\n", sanitized)

    def test_length_truncation(self):
        """Should truncate long inputs."""
        long_text = "A" * 200
        sanitized = sanitize_for_prompt(long_text, max_length=10)
        self.assertEqual(sanitized, "AAAAAAAAAA")
        self.assertEqual(len(sanitized), 10)

    def test_control_char_removal(self):
        """Should remove non-printable control characters."""
        text_with_null = "Hello\x00World"
        sanitized = sanitize_for_prompt(text_with_null)
        self.assertEqual(sanitized, "HelloWorld")

    def test_none_handling(self):
        """Should handle None input gracefully."""
        self.assertEqual(sanitize_for_prompt(None), "Unknown")

if __name__ == "__main__":
    unittest.main()
