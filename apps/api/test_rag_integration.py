#!/usr/bin/env python3
"""
Test RAG integration with Assistant knowledge bases
"""

import requests
import json
import time

# Configuration
API_BASE_URL = "http://localhost:8000"
CHAT_ID = "3ccc111d-f408-4c94-90d6-a3400dce0bae"  # Your test chat

# Test credentials
TEST_EMAIL = "test@arketic.com"
TEST_PASSWORD = "testpass123"

def authenticate():
    """Get authentication token"""
    response = requests.post(
        f"{API_BASE_URL}/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Authentication failed: {response.text}")
        return None

def send_chat_message(token, chat_id, message):
    """Send a message to the chat"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "message": message,
        "stream": False,
        "save_to_history": True
    }
    
    print(f"\nSending message: {message}")
    print(f"To chat: {chat_id}")
    
    response = requests.post(
        f"{API_BASE_URL}/api/v1/chat/chats/{chat_id}/ai-message",
        headers=headers,
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        print("\n✅ Response received successfully!")
        
        # Debug: print full response
        print(f"\n📦 Full Response:")
        print(json.dumps(data, indent=2)[:500])  # First 500 chars
        
        # Print AI response
        # Try different possible response fields
        ai_content = None
        if "ai_message" in data:
            ai_content = data["ai_message"].get("content")
        elif "data" in data and "ai_response" in data["data"]:
            ai_content = data["data"]["ai_response"].get("content")
        elif "ai_response" in data:
            ai_content = data["ai_response"].get("content")
        
        print(f"\n🤖 AI Response:")
        print("-" * 60)
        print(ai_content or "No content found")
        print("-" * 60)
        
        # Check for RAG metadata
        if "ragMetadata" in data:
            print(f"\n📚 RAG Metadata:")
            print(json.dumps(data["ragMetadata"], indent=2))
        
        return data
    else:
        print(f"❌ Failed to send message: {response.status_code}")
        print(response.text)
        return None

def main():
    print("="*60)
    print("Testing RAG Integration with Knowledge Base")
    print("="*60)
    
    # Authenticate
    print("\n1. Authenticating...")
    token = authenticate()
    if not token:
        print("Failed to authenticate")
        return
    
    print("✅ Authenticated successfully")
    
    # Test questions about Ali Mehmetoglu (from the knowledge base)
    test_questions = [
        "Who is Ali Mehmetoglu?",
        "What is Ali's experience with AI and ML?",
        "Tell me about Ali's technical skills",
        "What projects has Ali worked on?"
    ]
    
    for question in test_questions:
        print("\n" + "="*60)
        result = send_chat_message(token, CHAT_ID, question)
        
        if result:
            # Check if RAG was used
            if result.get("ragMetadata"):
                print("\n✅ RAG was used for this response")
            else:
                print("\n⚠️  RAG was not used for this response")
        
        # Wait a bit between questions
        time.sleep(2)
    
    print("\n" + "="*60)
    print("Test completed!")

if __name__ == "__main__":
    main()