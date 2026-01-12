
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Add root directory to path to import api_server
sys.path.insert(0, str(Path(__file__).parent.parent))

from api_server import app

class TestSecurityHeaders(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_security_headers_present(self):
        """Verify that essential security headers are present in responses."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)

        headers = response.headers

        # Check X-Content-Type-Options
        self.assertIn("x-content-type-options", headers)
        self.assertEqual(headers["x-content-type-options"], "nosniff")

        # Check X-Frame-Options
        self.assertIn("x-frame-options", headers)
        # Should be DENY or SAMEORIGIN. We plan to set it to DENY.
        self.assertEqual(headers["x-frame-options"], "DENY")

        # Check X-XSS-Protection
        self.assertIn("x-xss-protection", headers)
        self.assertEqual(headers["x-xss-protection"], "1; mode=block")

        # Check Referrer-Policy
        self.assertIn("referrer-policy", headers)
        self.assertEqual(headers["referrer-policy"], "strict-origin-when-cross-origin")

if __name__ == "__main__":
    unittest.main()
