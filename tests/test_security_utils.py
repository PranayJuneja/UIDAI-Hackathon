import unittest
from src.security_utils import sanitize_for_prompt

class TestSecurityUtils(unittest.TestCase):

    def test_basic_sanitization(self):
        """Test basic whitespace collapsing and trimming."""
        input_text = "  Hello   World  "
        expected = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_unicode_normalization(self):
        """Test NFKC normalization."""
        # 'ℍ' (U+210D) -> 'H'
        # '²' (U+00B2) -> '2'
        input_text = "ℍello²"
        expected = "Hello2"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_control_characters(self):
        """Test removal of control characters."""
        # null byte, bell, etc.
        input_text = "Hello\x00World\x07"
        expected = "HelloWorld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_newlines_collapsed(self):
        """Test that newlines are collapsed to spaces."""
        input_text = "Hello\nWorld\r\nTest"
        expected = "Hello World Test"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_length_truncation(self):
        """Test truncation to max length."""
        input_text = "a" * 1005
        result = sanitize_for_prompt(input_text, max_length=1000)
        self.assertEqual(len(result), 1000)
        self.assertEqual(result, "a" * 1000)

    def test_non_string_input(self):
        """Test robust handling of non-string input."""
        self.assertEqual(sanitize_for_prompt(None), "")
        self.assertEqual(sanitize_for_prompt(123), "")

    def test_bidi_override(self):
        """Test removal of Bidi overrides (Category Cf)."""
        # Right-to-Left Override (U+202E)
        input_text = "Hello\u202EWorld"
        expected = "HelloWorld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_zero_width_space(self):
        """Test removal of zero width space (Category Cf)."""
        # Zero Width Space (U+200B)
        input_text = "Hello\u200BWorld"
        expected = "HelloWorld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

if __name__ == '__main__':
    unittest.main()
