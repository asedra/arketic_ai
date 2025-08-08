#!/usr/bin/env python3
import requests
import json

# Test API endpoints
BASE_URL = "http://localhost:8000"

# Login
login_data = {
    "email": "test@arketic.com",
    "password": "testpass123"
}

try:
    # Login to get token
    print("1. Logging in...")
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        exit(1)
    
    response_data = login_response.json()
    token = response_data["access_token"]
    user_id = response_data.get("user", {}).get("user_id") or response_data.get("user_id", "unknown")
    print(f"✓ Login successful. User ID: {user_id}")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Check if user has OpenAI API key
    print("\n2. Checking user API keys...")
    api_keys_response = requests.get(f"{BASE_URL}/api/v1/settings/api-keys", headers=headers)
    
    if api_keys_response.status_code == 200:
        api_keys = api_keys_response.json()
        openai_keys = [k for k in api_keys if k['provider'] == 'openai' and k['is_active']]
        
        if openai_keys:
            print(f"✓ User has {len(openai_keys)} active OpenAI API key(s)")
        else:
            print("✗ No OpenAI API key found in database")
            print("  User needs to configure OpenAI API key in settings")
    else:
        print(f"Failed to get API keys: {api_keys_response.text}")
    
    # Test creating a chat with assistant
    print("\n3. Creating a chat with assistant...")
    assistant_id = "a2ce7ab9-eae5-40fc-83d5-b3c77f0018bc"  # aaaaaawwwww assistant
    
    chat_data = {
        "title": "Test Chat for AR-43",
        "assistant_id": assistant_id
    }
    
    chat_response = requests.post(f"{BASE_URL}/api/v1/chat/chats", json=chat_data, headers=headers)
    
    if chat_response.status_code in [200, 201]:
        chat_id = chat_response.json()["id"]
        print(f"✓ Chat created. Chat ID: {chat_id}")
        
        # Send AI message
        print("\n4. Sending AI message...")
        message_data = {
            "message": "Hello, this is a test message for AR-43 bug fix. Please respond briefly.",
            "stream": False,
            "save_to_history": True,
            "assistant_id": assistant_id
        }
        
        ai_response = requests.post(
            f"{BASE_URL}/api/v1/chat/chats/{chat_id}/ai-message", 
            json=message_data, 
            headers=headers
        )
        
        if ai_response.status_code == 200:
            print("✓ AI message sent successfully!")
            print(f"  Response: {ai_response.json().get('message', {}).get('content', 'No content')[:100]}...")
        else:
            print(f"✗ AI message failed with status {ai_response.status_code}")
            print(f"  Error: {ai_response.text}")
    else:
        print(f"Failed to create chat: {chat_response.text}")
        
except Exception as e:
    print(f"Error: {e}")