#!/usr/bin/env python3

import asyncio
import json
import websockets
import httpx
from datetime import datetime

async def test_ai_streaming():
    base_url = 'http://localhost:8000'
    ws_url = 'ws://localhost:8000'
    
    # Login first to get token
    login_data = {
        'email': 'arketic@arketic.com',
        'password': 'Arketic123!'
    }
    
    print('🔍 Testing AI Streaming via WebSocket...')
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            # 1. Login and get token
            print('\n1. Getting authentication token...')
            auth_response = await client.post(f'{base_url}/api/v1/auth/login', json=login_data)
            
            if auth_response.status_code != 200:
                print('❌ Login failed')
                return
            
            auth_data = auth_response.json()
            token = auth_data.get('access_token')
            user_id = auth_data.get('user', {}).get('id')
            
            if not token:
                print('❌ No access token received')
                return
            
            print('✅ Token obtained')
            headers = {'Authorization': f'Bearer {token}'}
            
            # 2. Check if OpenAI API key is set
            print('\n2. Checking OpenAI API key...')
            settings_response = await client.get(f'{base_url}/api/v1/openai-settings/api-keys', headers=headers)
            
            if settings_response.status_code == 200:
                settings_data = settings_response.json()
                has_key = settings_data.get('has_active_key', False)
                
                if not has_key:
                    print('⚠️ No OpenAI API key configured. Setting a dummy key for testing...')
                    
                    # Try to set a dummy API key (this will fail but we can test the flow)
                    key_data = {
                        'api_key': 'sk-dummy-key-for-testing-12345678901234567890123456789012'
                    }
                    
                    set_key_response = await client.post(
                        f'{base_url}/api/v1/openai-settings/api-keys',
                        json=key_data,
                        headers=headers
                    )
                    
                    if set_key_response.status_code in [200, 201]:
                        print('✅ Dummy API key set for testing')
                    else:
                        print('⚠️ Could not set API key, but continuing test...')
                else:
                    print('✅ OpenAI API key is configured')
            else:
                print('⚠️ Could not check API key status')
            
            # 3. Create a test chat
            print('\n3. Creating test chat...')
            create_chat_data = {
                'title': 'AI Streaming Test',
                'description': 'Test chat for AI streaming',
                'chat_type': 'direct',
                'ai_model': 'gpt-3.5-turbo',
                'enable_ai_responses': True
            }
            
            create_response = await client.post(
                f'{base_url}/api/v1/chat/chats',
                json=create_chat_data,
                headers=headers
            )
            
            if create_response.status_code != 200:
                print('❌ Chat creation failed')
                return
                
            chat_data = create_response.json()
            chat_id = chat_data.get('id')
            print(f'✅ Chat created: {chat_id}')
            
            # 4. Connect to WebSocket and send message
            print(f'\n4. Connecting to WebSocket and sending message...')
            ws_endpoint = f'{ws_url}/api/v1/chat/chats/{chat_id}/ws?token={token}'
            
            async with websockets.connect(ws_endpoint) as websocket:
                print('✅ WebSocket connected')
                
                # Wait for welcome message
                welcome_msg = await websocket.recv()
                welcome_data = json.loads(welcome_msg)
                print(f'📨 Welcome: {welcome_data.get("message", "N/A")}')
                
                # Send a message via HTTP API (this should trigger AI response via WebSocket)
                print('\n5. Sending user message via API...')
                message_data = {
                    'content': 'Hello! Please respond with exactly "Hello there!" to test streaming.',
                    'message_type': 'user'
                }
                
                message_response = await client.post(
                    f'{base_url}/api/v1/chat/chats/{chat_id}/messages',
                    json=message_data,
                    headers=headers
                )
                
                if message_response.status_code == 200:
                    print('✅ Message sent successfully')
                    
                    # Listen for AI streaming response
                    print('\n6. Listening for AI streaming response...')
                    ai_response_started = False
                    ai_response_content = ""
                    
                    # Listen for messages for up to 30 seconds
                    try:
                        timeout_counter = 0
                        max_timeout = 30  # 30 seconds
                        
                        while timeout_counter < max_timeout:
                            try:
                                # Wait for message with 1 second timeout
                                ws_message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                                ws_data = json.loads(ws_message)
                                message_type = ws_data.get('type', 'unknown')
                                
                                print(f'📥 Received: {message_type}')
                                
                                if message_type == 'ai_response_start':
                                    print('🤖 AI response started')
                                    ai_response_started = True
                                    
                                elif message_type == 'ai_response_chunk':
                                    chunk = ws_data.get('chunk', '')
                                    ai_response_content = ws_data.get('full_content', ai_response_content)
                                    print(f'📄 Chunk: "{chunk}"')
                                    
                                elif message_type == 'ai_response_complete':
                                    print('✅ AI response completed')
                                    final_content = ws_data.get('message', {}).get('content', ai_response_content)
                                    print(f'📝 Final content: "{final_content}"')
                                    break
                                    
                                elif message_type == 'ai_error':
                                    print(f'❌ AI error: {ws_data.get("error", "Unknown error")}')
                                    error_code = ws_data.get('error_code', 'unknown')
                                    print(f'🔍 Error code: {error_code}')
                                    break
                                    
                                elif message_type == 'new_message':
                                    # This might be our own message echoed back
                                    msg = ws_data.get('message', {})
                                    if msg.get('message_type') == 'user':
                                        print(f'👤 User message echoed: "{msg.get("content", "")}"')
                                    else:
                                        print(f'🔄 New message: {msg.get("content", "")}')
                                
                                timeout_counter = 0  # Reset timeout counter on receiving message
                                
                            except asyncio.TimeoutError:
                                timeout_counter += 1
                                if timeout_counter % 5 == 0:  # Print every 5 seconds
                                    print(f'⏳ Waiting for AI response... ({timeout_counter}s)')
                                continue
                    
                    except Exception as e:
                        print(f'❌ Error listening to WebSocket: {e}')
                    
                    if ai_response_started:
                        print('\n✅ AI streaming test completed successfully!')
                        if ai_response_content:
                            print(f'📊 Final AI response: "{ai_response_content}"')
                    else:
                        print('\n⚠️ No AI response received - this might be due to missing/invalid API key')
                        
                else:
                    print(f'❌ Failed to send message: {message_response.text}')
                
        except Exception as e:
            print(f'❌ General error: {e}')
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_ai_streaming())