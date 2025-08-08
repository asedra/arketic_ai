#!/usr/bin/env python3
import requests
import json
import os

# Test LangChain service with internal key
LANGCHAIN_URL = "http://localhost:3001"

# Test internal endpoint with proper auth
print("Testing internal chat message endpoint with proper auth...")

test_data = {
    "chatId": "11dbe14b-d530-4acd-811f-df9f02e2444e",  # Valid UUID from our test
    "message": "Test message",
    "settings": {
        "provider": "openai",
        "model": "gpt-3.5-turbo",
        "temperature": 0.7,
        "maxTokens": 100
    }
}

# Get the OpenAI key from environment or use a test key
openai_key = os.getenv("OPENAI_API_KEY", "sk-test-key")

headers = {
    "Content-Type": "application/json",
    "x-internal-api-key": "dev_internal_api_key_change_in_production",
    # Don't send x-user-id to use null
    "x-api-key": openai_key
}

try:
    response = requests.post(
        f"{LANGCHAIN_URL}/internal/chat/message",
        json=test_data,
        headers=headers
    )
    
    print(f"Response status: {response.status_code}")
    print(f"Response: {response.text[:500]}")  # First 500 chars
    
except Exception as e:
    print(f"Error: {e}")