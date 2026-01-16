import unittest
from src.security_utils import sanitize_for_prompt

class TestSecurityUtils(unittest.TestCase):
    def test_sanitize_basic(self):
        input_text = "Hello World"
        expected = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_whitespace(self):
        input_text = "  Hello   World  "
        expected = "Hello World"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_newlines(self):
        input_text = "Hello\nWorld"
        expected = "Hello World" # collapsed by regex
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_control_chars(self):
        # ASCII Bell (0x07) should be removed
        input_text = "Hello\x07World"
        expected = "HelloWorld"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_unicode_normalization(self):
        # Full-width characters should be normalized
        input_text = "Ｈｅｌｌｏ"
        expected = "Hello"
        self.assertEqual(sanitize_for_prompt(input_text), expected)

    def test_sanitize_none(self):
        self.assertEqual(sanitize_for_prompt(None), "")

    def test_sanitize_not_string(self):
        self.assertEqual(sanitize_for_prompt(123), "123")

if __name__ == '__main__':
    unittest.main()
