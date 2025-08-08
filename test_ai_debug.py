#!/usr/bin/env python3
"""
Debug script for AI message API issue
"""
import requests
import json
import time

BASE_URL = "http://localhost:8000"

# Login to get token
print("1. Logging in...")
login_response = requests.post(
    f"{BASE_URL}/api/v1/auth/login",
    json={
        "email": "test@arketic.com",
        "password": "testpass123"
    }
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

login_data = login_response.json()
token = login_data["access_token"]
user_id = login_data.get("user", {}).get("user_id", login_data.get("user_id", "unknown"))
print(f"✓ Token obtained for user: {user_id}")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Check API keys endpoint
print("\n2. Checking user's API keys...")
api_keys_response = requests.get(
    f"{BASE_URL}/api/v1/settings/api-keys",
    headers=headers
)
print(f"   Status: {api_keys_response.status_code}")
print(f"   Response: {api_keys_response.text[:200]}")

# Try to get/set OpenAI API key
print("\n3. Setting OpenAI API key for user...")
set_key_response = requests.post(
    f"{BASE_URL}/api/v1/settings/api-keys",
    json={
        "provider": "openai",
        "api_key": "sk-test-key-123456789",  # Test key
        "is_active": True
    },
    headers=headers
)
print(f"   Status: {set_key_response.status_code}")
print(f"   Response: {set_key_response.text[:200]}")

# Create assistant
print("\n4. Creating test assistant...")
assistant_response = requests.post(
    f"{BASE_URL}/api/v1/assistants",
    json={
        "name": "Test Assistant for Debug",
        "description": "Testing AI message",
        "instructions": "You are a helpful assistant",
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "max_tokens": 2048,
        "status": "active"
    },
    headers=headers
)

if assistant_response.status_code in [200, 201]:
    assistant_data = assistant_response.json()
    assistant_id = assistant_data["id"]
    print(f"✓ Assistant created: {assistant_id}")
else:
    print(f"✗ Failed to create assistant: {assistant_response.text}")
    exit(1)

# Create chat with assistant
print("\n5. Creating chat with assistant...")
chat_response = requests.post(
    f"{BASE_URL}/api/v1/chat/chats",
    json={
        "title": "Debug Test Chat",
        "assistant_id": assistant_id
    },
    headers=headers
)

if chat_response.status_code in [200, 201]:
    chat_data = chat_response.json()
    chat_id = chat_data["id"]
    print(f"✓ Chat created: {chat_id}")
else:
    print(f"✗ Failed to create chat: {chat_response.text}")
    exit(1)

# Send AI message
print("\n6. Sending AI message...")
print(f"   Chat ID: {chat_id}")
print(f"   Assistant ID: {assistant_id}")

ai_message_response = requests.post(
    f"{BASE_URL}/api/v1/chat/chats/{chat_id}/ai-message",
    json={
        "message": "Hello, please respond with a simple greeting",
        "stream": False,
        "save_to_history": True,
        "assistant_id": assistant_id
    },
    headers=headers
)

print(f"   Status: {ai_message_response.status_code}")
print(f"   Response: {json.dumps(ai_message_response.json(), indent=2)}")

# Check API logs
print("\n7. Checking recent logs...")
print("   Run: docker compose logs --tail=20 api | grep -i 'openai'")
print("   Run: docker compose logs --tail=20 langchain | grep -i 'api-key'")