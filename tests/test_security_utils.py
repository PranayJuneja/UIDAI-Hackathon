import unittest
import unicodedata
from src.security_utils import sanitize_for_prompt, MAX_INPUT_LENGTH

class TestSecurityUtils(unittest.TestCase):

    def test_sanitize_basic(self):
        input_text = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), "Hello World")

    def test_sanitize_control_chars(self):
        # Should remove null bytes and other control chars
        input_text = "Hello\x00World\x1b[31mRed"
        # \x00 is control, \x1b is control.
        # sanitize_for_prompt preserves \n\r\t
        expected = "HelloWorld[31mRed"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_whitespace(self):
        input_text = "Hello   World\n\t  Test"
        # It collapses multiple spaces to single space, but what about newlines?
        # The regex `re.sub(r' +', ' ', text)` only targets spaces.
        # Let's check implementation behavior
        sanitized = sanitize_for_prompt(input_text)
        self.assertEqual(sanitized, "Hello World\n\t Test")

    def test_sanitize_unicode_normalization(self):
        # NFKC normalization
        input_text = "\u2163" # Roman Numeral IV
        self.assertEqual(sanitize_for_prompt(input_text), "IV")

    def test_length_limit(self):
        long_text = "a" * (MAX_INPUT_LENGTH + 100)
        sanitized = sanitize_for_prompt(long_text)
        self.assertEqual(len(sanitized), MAX_INPUT_LENGTH)

if __name__ == '__main__':
    unittest.main()
