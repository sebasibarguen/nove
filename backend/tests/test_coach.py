# ABOUTME: Tests for coach conversation and messaging endpoints.
# ABOUTME: Validates CRUD, ownership, and SSE streaming with mocked Claude API.

from unittest.mock import AsyncMock, MagicMock, patch

from httpx import AsyncClient

PREFIX = "/api/v1"


async def _register_and_get_headers(client: AsyncClient) -> dict[str, str]:
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={
            "email": "coach@example.com",
            "password": "pass1234",
            "full_name": "Coach User",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_create_conversation(client: AsyncClient):
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        f"{PREFIX}/conversations",
        json={"title": "Mi primera conversacion", "conversation_type": "general"},
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Mi primera conversacion"
    assert data["conversation_type"] == "general"
    assert "id" in data


async def test_list_conversations(client: AsyncClient):
    headers = await _register_and_get_headers(client)

    await client.post(
        f"{PREFIX}/conversations",
        json={"title": "Conv 1"},
        headers=headers,
    )
    await client.post(
        f"{PREFIX}/conversations",
        json={"title": "Conv 2"},
        headers=headers,
    )

    resp = await client.get(f"{PREFIX}/conversations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


async def test_conversation_not_found(client: AsyncClient):
    headers = await _register_and_get_headers(client)

    resp = await client.get(
        f"{PREFIX}/conversations/00000000-0000-0000-0000-000000000000/messages",
        headers=headers,
    )
    assert resp.status_code == 404


async def test_get_messages_empty(client: AsyncClient):
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        f"{PREFIX}/conversations",
        json={"title": "Empty"},
        headers=headers,
    )
    conv_id = resp.json()["id"]

    resp = await client.get(
        f"{PREFIX}/conversations/{conv_id}/messages",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json() == []


async def test_send_message_streams_response(client: AsyncClient):
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        f"{PREFIX}/conversations",
        json={"title": "Streaming test"},
        headers=headers,
    )
    conv_id = resp.json()["id"]

    # Mock the Anthropic streaming API
    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock(return_value=False)

    async def fake_text_stream():
        yield "Hola, "
        yield "soy Nove."

    mock_stream.text_stream = fake_text_stream()

    mock_client = MagicMock()
    mock_client.messages.stream = MagicMock(return_value=mock_stream)

    with patch("nove.coach.service.anthropic.AsyncAnthropic", return_value=mock_client):
        resp = await client.post(
            f"{PREFIX}/conversations/{conv_id}/messages",
            json={"content": "Hola coach"},
            headers=headers,
        )

    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    body = resp.text
    assert "Hola, " in body
    assert "soy Nove." in body
    assert "[DONE]" in body


async def test_messages_persisted_after_streaming(client: AsyncClient):
    headers = await _register_and_get_headers(client)

    resp = await client.post(
        f"{PREFIX}/conversations",
        json={"title": "Persist test"},
        headers=headers,
    )
    conv_id = resp.json()["id"]

    mock_stream = AsyncMock()
    mock_stream.__aenter__ = AsyncMock(return_value=mock_stream)
    mock_stream.__aexit__ = AsyncMock(return_value=False)

    async def fake_text_stream():
        yield "Respuesta del coach"

    mock_stream.text_stream = fake_text_stream()

    mock_client = MagicMock()
    mock_client.messages.stream = MagicMock(return_value=mock_stream)

    with patch("nove.coach.service.anthropic.AsyncAnthropic", return_value=mock_client):
        await client.post(
            f"{PREFIX}/conversations/{conv_id}/messages",
            json={"content": "Pregunta del usuario"},
            headers=headers,
        )

    resp = await client.get(
        f"{PREFIX}/conversations/{conv_id}/messages",
        headers=headers,
    )
    assert resp.status_code == 200
    messages = resp.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Pregunta del usuario"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["content"] == "Respuesta del coach"


async def test_conversation_ownership(client: AsyncClient):
    """User A cannot access User B's conversation."""
    # Register user A
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "a@example.com", "password": "pass1234", "full_name": "User A"},
    )
    headers_a = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # Register user B
    resp = await client.post(
        f"{PREFIX}/auth/register",
        json={"email": "b@example.com", "password": "pass1234", "full_name": "User B"},
    )
    headers_b = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    # User A creates conversation
    resp = await client.post(
        f"{PREFIX}/conversations",
        json={"title": "A's conversation"},
        headers=headers_a,
    )
    conv_id = resp.json()["id"]

    # User B tries to access it
    resp = await client.get(
        f"{PREFIX}/conversations/{conv_id}/messages",
        headers=headers_b,
    )
    assert resp.status_code == 404
