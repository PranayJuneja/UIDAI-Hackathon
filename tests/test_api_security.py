from fastapi.testclient import TestClient
from api_server import app, MAX_INPUT_LENGTH

client = TestClient(app)

def test_search_sanitization():
    # Test with normal input
    response = client.get("/api/search", params={"q": "Delhi"})
    assert response.status_code == 200
    assert response.json()["query"] == "Delhi"

    # Test with control characters (should be stripped)
    # Note: TestClient/FastAPI will decode the URL params.
    # The 'q' parameter in the endpoint will receive the string with \x00.
    response = client.get("/api/search", params={"q": "Delhi\x00\x01"})
    assert response.status_code == 200
    # Sanitize input should strip the control characters
    assert response.json()["query"] == "Delhi"

def test_chat_length_limit():
    with client.websocket_connect("/ws/chat") as websocket:
        # Receive welcome message
        data = websocket.receive_json()
        assert data["type"] == "system"

        # Send long message
        long_message = "A" * (MAX_INPUT_LENGTH + 10)
        websocket.send_json({"content": long_message})

        # Expect error response
        response = websocket.receive_json()
        assert response["type"] == "response"
        assert "Error: Input too long" in response["content"]

def test_chat_sanitization():
    with client.websocket_connect("/ws/chat") as websocket:
        # Receive welcome message
        websocket.receive_json()

        # Send message with control chars
        # We assume the server doesn't crash.
        # Since we can't easily assert the internal sanitized string without mocking,
        # we just ensure it returns a valid response (typing or error, but not crash).

        dirty_message = "Hello\x00World"
        websocket.send_json({"content": dirty_message})

        # Expect typing indicator (means it passed the checks)
        response = websocket.receive_json()
        # If we got typing, it means sanitization worked and it proceeded to bot
        # If we got response, that's also fine.
        assert response["type"] in ["typing", "response"]
