import pytest
from fastapi.testclient import TestClient
from api_server import app
from src.security import sanitize_input
import html

# Create a TestClient for the FastAPI app
client = TestClient(app)

def test_sanitize_input():
    # Test basic sanitization
    assert sanitize_input("hello") == "hello"
    assert sanitize_input("  hello  ") == "hello"

    # Test control characters removal
    assert sanitize_input("hello\x00world") == "helloworld"

    # Test unicode normalization
    # Fancy quote -> regular quote might vary by NFKC, but let's check basic printable
    # Tabs are converted to spaces by .split() and ' '.join()
    assert sanitize_input("hello\tworld") == "hello world"

    # HTML tags should NOT be stripped by default
    assert sanitize_input("<script>alert(1)</script>") == "<script>alert(1)</script>"

    # HTML tags SHOULD be escaped if requested
    assert sanitize_input("<script>alert(1)</script>", escape_html=True) == "&lt;script&gt;alert(1)&lt;/script&gt;"

def test_search_xss_prevention():
    # Attempt a reflected XSS payload
    payload = "<script>alert('XSS')</script>"
    response = client.get(f"/api/search?q={payload}")

    assert response.status_code == 200
    data = response.json()

    # The 'query' field in response should be SANITIZED AND ESCAPED
    # It should NOT be the raw payload
    # html.escape escapes quotes by default in python 3.2+
    expected = html.escape(payload)
    assert data["query"] == expected
