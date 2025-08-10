#!/usr/bin/env python3
"""
Test script for Ali Assistant functionality
"""

import asyncio
import aiohttp
import json
from datetime import datetime
import time

API_BASE_URL = "http://localhost:8000/api/v1"
WEB_BASE_URL = "http://localhost:3000"
TEST_EMAIL = "test@arketic.com"
TEST_PASSWORD = "testpass123"

async def test_ali_assistant():
    """Test Ali assistant chat functionality"""
    
    async with aiohttp.ClientSession() as session:
        print("=" * 60)
        print("Ali Assistant Test")
        print("=" * 60)
        
        findings = []
        
        # 1. Login
        print("\n1. Testing Login...")
        try:
            login_response = await session.post(
                f"{API_BASE_URL}/auth/login",
                json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
            )
            
            if login_response.status == 200:
                login_data = await login_response.json()
                token = login_data["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                print("✅ Login successful")
            else:
                error_text = await login_response.text()
                findings.append(f"Login failed with status {login_response.status}: {error_text}")
                print(f"❌ Login failed: {login_response.status}")
                return findings
                
        except Exception as e:
            findings.append(f"Login exception: {str(e)}")
            print(f"❌ Login exception: {e}")
            return findings
        
        # 2. Get assistants list
        print("\n2. Getting assistants list...")
        try:
            assistants_response = await session.get(
                f"{API_BASE_URL}/assistants",
                headers=headers
            )
            
            if assistants_response.status == 200:
                assistants_data = await assistants_response.json()
                assistants = assistants_data.get("assistants", [])
                print(f"✅ Found {len(assistants)} assistants")
                
                # Look for Ali assistant
                ali_assistant = None
                for assistant in assistants:
                    print(f"   - {assistant['name']} (ID: {assistant['id']})")
                    if "ali" in assistant['name'].lower():
                        ali_assistant = assistant
                
                if not ali_assistant:
                    # Create Ali assistant if not found
                    print("\n⚠️  Ali assistant not found, creating one...")
                    create_assistant_response = await session.post(
                        f"{API_BASE_URL}/assistants",
                        headers=headers,
                        json={
                            "name": "Ali",
                            "description": "Ali is a helpful AI assistant",
                            "system_prompt": "You are Ali, a friendly and helpful AI assistant.",
                            "ai_model": "gpt-3.5-turbo",
                            "temperature": 0.7,
                            "max_tokens": 2048,
                            "visibility": "private"
                        }
                    )
                    
                    if create_assistant_response.status == 200:
                        ali_assistant = await create_assistant_response.json()
                        print(f"✅ Created Ali assistant: {ali_assistant['id']}")
                    else:
                        error_text = await create_assistant_response.text()
                        findings.append(f"Failed to create Ali assistant: {error_text}")
                        print(f"❌ Failed to create Ali assistant")
                else:
                    print(f"✅ Found Ali assistant: {ali_assistant['name']}")
                    
            else:
                findings.append(f"Failed to get assistants: {assistants_response.status}")
                print(f"❌ Failed to get assistants")
                return findings
                
        except Exception as e:
            findings.append(f"Get assistants exception: {str(e)}")
            print(f"❌ Exception getting assistants: {e}")
            return findings
        
        # 3. Create chat with Ali assistant
        print("\n3. Creating chat with Ali assistant...")
        try:
            create_chat_response = await session.post(
                f"{API_BASE_URL}/chat/chats",
                headers=headers,
                json={
                    "title": f"Chat with Ali - {datetime.now().isoformat()}",
                    "description": "Testing chat with Ali assistant",
                    "chat_type": "direct",
                    "assistant_id": ali_assistant["id"],
                    "is_private": True
                }
            )
            
            if create_chat_response.status == 200:
                chat_data = await create_chat_response.json()
                chat_id = chat_data["id"]
                print(f"✅ Chat created: {chat_id}")
                
                # Check if assistant is properly attached
                if chat_data.get("assistant_id") != ali_assistant["id"]:
                    findings.append(f"Assistant ID mismatch: expected {ali_assistant['id']}, got {chat_data.get('assistant_id')}")
                    
                if chat_data.get("assistant_name") != ali_assistant["name"]:
                    findings.append(f"Assistant name mismatch: expected {ali_assistant['name']}, got {chat_data.get('assistant_name')}")
                    
            else:
                error_text = await create_chat_response.text()
                findings.append(f"Failed to create chat: {create_chat_response.status} - {error_text}")
                print(f"❌ Failed to create chat: {create_chat_response.status}")
                return findings
                
        except Exception as e:
            findings.append(f"Create chat exception: {str(e)}")
            print(f"❌ Exception creating chat: {e}")
            return findings
        
        # 4. Send message to Ali
        print("\n4. Sending message to Ali assistant...")
        test_message = "Hello Ali, can you help me with something?"
        
        try:
            # Send message
            send_response = await session.post(
                f"{API_BASE_URL}/chat/chats/{chat_id}/ai-message",
                headers=headers,
                json={
                    "message": test_message,
                    "save_to_history": True,
                    "stream": False
                }
            )
            
            if send_response.status == 200:
                response_data = await send_response.json()
                print(f"✅ Message sent successfully")
                
                # Check response structure
                if "data" in response_data:
                    data = response_data["data"]
                    if "ai_message" in data:
                        ai_response = data["ai_message"]["content"]
                        print(f"   Ali's response: {ai_response[:100]}...")
                        
                        # Check if response mentions Ali
                        if "ali" not in ai_response.lower() and ali_assistant.get("system_prompt"):
                            if "ali" in ali_assistant["system_prompt"].lower():
                                findings.append("AI response doesn't reflect Ali persona from system prompt")
                    else:
                        findings.append("No ai_message in response data")
                else:
                    findings.append("Unexpected response structure - no 'data' field")
                    
            elif send_response.status == 400:
                error_data = await send_response.json()
                error_detail = error_data.get("detail", "Unknown error")
                
                # Common errors
                if "assistant configured" in error_detail:
                    findings.append("BUG: Chat claims no assistant configured despite being created with assistant_id")
                elif "OpenAI API key" in error_detail:
                    findings.append("OpenAI API key not configured for test user")
                else:
                    findings.append(f"Bad request: {error_detail}")
                    
                print(f"❌ Failed to send message: {error_detail}")
                
            else:
                error_text = await send_response.text()
                findings.append(f"Failed to send message: {send_response.status} - {error_text}")
                print(f"❌ Failed to send message: {send_response.status}")
                
        except Exception as e:
            findings.append(f"Send message exception: {str(e)}")
            print(f"❌ Exception sending message: {e}")
        
        # 5. Check chat history
        print("\n5. Checking chat history...")
        try:
            history_response = await session.get(
                f"{API_BASE_URL}/chat/chats/{chat_id}/messages",
                headers=headers
            )
            
            if history_response.status == 200:
                history_data = await history_response.json()
                messages = history_data.get("messages", [])
                print(f"✅ Chat history retrieved: {len(messages)} messages")
                
                # Check if messages are properly saved
                user_messages = [m for m in messages if m.get("message_type") == "USER"]
                ai_messages = [m for m in messages if m.get("message_type") == "AI"]
                
                if len(user_messages) == 0:
                    findings.append("User message not saved to history")
                if len(ai_messages) == 0 and send_response.status == 200:
                    findings.append("AI response not saved to history")
                    
            else:
                findings.append(f"Failed to get chat history: {history_response.status}")
                print(f"❌ Failed to get chat history")
                
        except Exception as e:
            findings.append(f"Get history exception: {str(e)}")
            print(f"❌ Exception getting history: {e}")
        
        # 6. Test streaming
        print("\n6. Testing streaming with Ali...")
        try:
            stream_response = await session.post(
                f"{API_BASE_URL}/chat/chats/{chat_id}/ai-message",
                headers=headers,
                json={
                    "message": "Ali, tell me a short story",
                    "save_to_history": True,
                    "stream": True
                }
            )
            
            if stream_response.status == 200:
                print("✅ Streaming request accepted")
            elif stream_response.status == 400:
                error_data = await stream_response.json()
                error_detail = error_data.get("detail", "Unknown error")
                findings.append(f"Streaming not working: {error_detail}")
                print(f"⚠️  Streaming issue: {error_detail}")
            else:
                findings.append(f"Streaming failed: {stream_response.status}")
                print(f"❌ Streaming failed: {stream_response.status}")
                
        except Exception as e:
            findings.append(f"Streaming exception: {str(e)}")
            print(f"❌ Streaming exception: {e}")
        
        return findings

async def main():
    findings = await test_ali_assistant()
    
    print("\n" + "=" * 60)
    print("TEST FINDINGS:")
    print("=" * 60)
    
    if findings:
        print("\n🐛 Issues found:")
        for i, finding in enumerate(findings, 1):
            print(f"{i}. {finding}")
        return findings
    else:
        print("\n✅ No issues found - Ali assistant working correctly!")
        return []

if __name__ == "__main__":
    findings = asyncio.run(main())
    
    # Return findings for Jira creation
    if findings:
        print("\n📝 These findings will be reported to Jira as bugs")
        exit(1)
    else:
        exit(0)