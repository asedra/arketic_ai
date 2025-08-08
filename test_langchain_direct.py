#!/usr/bin/env python3
import requests
import json

# Test LangChain service directly
LANGCHAIN_URL = "http://localhost:3001"

# Test health endpoint
print("1. Testing LangChain health...")
health_response = requests.get(f"{LANGCHAIN_URL}/health")
print(f"Health status: {health_response.status_code}")
if health_response.status_code == 200:
    print(f"Health response: {json.dumps(health_response.json(), indent=2)}")

# Test internal endpoint with minimal data
print("\n2. Testing internal chat message endpoint...")

# Create minimal test data
test_data = {
    "chatId": "test-chat-id",
    "message": "Test message",
    "settings": {
        "provider": "openai",
        "model": "gpt-3.5-turbo"
    }
}

headers = {
    "Content-Type": "application/json",
    "x-api-key": "test-key",  # This should fail validation
    "x-service-auth": "internal-service-key",  # Internal service auth
    "x-user-id": "test-user"
}

try:
    response = requests.post(
        f"{LANGCHAIN_URL}/internal/chat/message",
        json=test_data,
        headers=headers
    )
    
    print(f"Response status: {response.status_code}")
    print(f"Response: {response.text}")
    
except Exception as e:
    print(f"Error: {e}")