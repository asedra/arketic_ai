#!/usr/bin/env python3
"""
Test LangChain service directly with knowledge base IDs
"""

import requests
import json

# Get auth token
auth_response = requests.post(
    "http://localhost:8000/api/v1/auth/login",
    json={"email": "test@arketic.com", "password": "testpass123"}
)
token = auth_response.json().get("access_token")
print(f"Got token: {token[:20]}...")

# Get OpenAI key from user settings (assuming it's configured)
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "x-api-key": "YOUR_OPENAI_KEY"  # You need to provide this
}

# Call LangChain service directly
langchain_payload = {
    "chatId": "3ccc111d-f408-4c94-90d6-a3400dce0bae",
    "message": "Who is Ali Mehmetoglu?",
    "settings": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.7,
        "maxTokens": 2048,
        "systemPrompt": "You are a helpful assistant with access to knowledge base about Ali Mehmetoglu.",
        "knowledgeBaseIds": ["8cb4c209-729d-48a7-829e-eea1e7c1280d"],
        "documentIds": ["6951baae-a538-4142-88a3-58453427d9f3"]
    }
}

print("\nSending to LangChain service:")
print(json.dumps(langchain_payload, indent=2))

# Call LangChain service
response = requests.post(
    "http://localhost:3001/api/chat/message",
    headers=headers,
    json=langchain_payload
)

print(f"\nStatus: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print("\nResponse:")
    print(json.dumps(result, indent=2))
else:
    print(f"Error: {response.text}")