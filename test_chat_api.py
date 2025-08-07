#!/usr/bin/env python3

import asyncio
import httpx
import json
from datetime import datetime

async def test_chat_api():
    base_url = 'http://localhost:8000'
    
    # Test admin credentials
    login_data = {
        'email': 'arketic@arketic.com',
        'password': 'Arketic123!'
    }
    
    print('🔍 Testing Chat API endpoints...')
    print(f'Base URL: {base_url}')
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 1. Login first
            print('\n1. Testing login...')
            auth_response = await client.post(f'{base_url}/api/v1/auth/login', json=login_data)
            print(f'Auth status: {auth_response.status_code}')
            
            if auth_response.status_code != 200:
                print('❌ Login failed, cannot test chat endpoints')
                print(f'Response: {auth_response.text}')
                return
            
            auth_data = auth_response.json()
            token = auth_data.get('access_token')
            if not token:
                print('❌ No access token received')
                print(f'Auth data: {auth_data}')
                return
            
            print('✅ Login successful')
            headers = {'Authorization': f'Bearer {token}'}
            
            # 2. Test creating a chat
            print('\n2. Testing chat creation...')
            create_chat_data = {
                'title': 'Test Chat',
                'description': 'Test chat for API testing',
                'chat_type': 'direct',
                'ai_model': 'gpt-3.5-turbo',
                'temperature': 0.7,
                'max_tokens': 2048
            }
            
            create_response = await client.post(
                f'{base_url}/api/v1/chat/chats',
                json=create_chat_data,
                headers=headers
            )
            print(f'Create chat status: {create_response.status_code}')
            
            if create_response.status_code == 200:
                chat_data = create_response.json()
                chat_id = chat_data.get('id')
                print(f'✅ Chat created with ID: {chat_id}')
                print(f'Chat data: {json.dumps(chat_data, indent=2)}')
            else:
                print(f'❌ Chat creation failed: {create_response.text}')
                return
            
            # 3. Test getting user chats
            print('\n3. Testing get user chats...')
            chats_response = await client.get(f'{base_url}/api/v1/chat/chats', headers=headers)
            print(f'Get chats status: {chats_response.status_code}')
            
            if chats_response.status_code == 200:
                chats_data = chats_response.json()
                print(f'✅ Retrieved {len(chats_data)} chats')
                if chats_data:
                    print(f'First chat: {json.dumps(chats_data[0], indent=2)}')
            else:
                print(f'❌ Failed to get chats: {chats_response.text}')
            
            # 4. Test getting chat history
            print('\n4. Testing get chat history...')
            history_response = await client.get(f'{base_url}/api/v1/chat/chats/{chat_id}', headers=headers)
            print(f'Chat history status: {history_response.status_code}')
            
            if history_response.status_code == 200:
                history_data = history_response.json()
                messages = history_data.get('messages', [])
                print(f'✅ Retrieved chat history with {len(messages)} messages')
                if messages:
                    print(f'First message: {json.dumps(messages[0], indent=2)}')
            else:
                print(f'❌ Failed to get chat history: {history_response.text}')
            
            # 5. Test sending a message
            print('\n5. Testing send message...')
            message_data = {
                'content': 'Hello, this is a test message!',
                'message_type': 'user'
            }
            
            message_response = await client.post(
                f'{base_url}/api/v1/chat/chats/{chat_id}/messages',
                json=message_data,
                headers=headers
            )
            print(f'Send message status: {message_response.status_code}')
            
            if message_response.status_code == 200:
                message_result = message_response.json()
                message_id = message_result.get('id')
                print(f'✅ Message sent with ID: {message_id}')
                print(f'Message data: {json.dumps(message_result, indent=2)}')
            else:
                print(f'❌ Failed to send message: {message_response.text}')
            
            # 6. Test chat stats
            print('\n6. Testing chat stats...')
            stats_response = await client.get(f'{base_url}/api/v1/chat/stats', headers=headers)
            print(f'Stats status: {stats_response.status_code}')
            
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                print(f'✅ Retrieved chat stats: {json.dumps(stats_data, indent=2)}')
            else:
                print(f'❌ Failed to get stats: {stats_response.text}')
            
            # 7. Test connection test endpoint
            print('\n7. Testing connection test...')
            test_response = await client.post(f'{base_url}/api/v1/chat/test/connection', headers=headers)
            print(f'Connection test status: {test_response.status_code}')
            
            if test_response.status_code == 200:
                test_data = test_response.json()
                print(f'✅ Connection test result: {test_data.get("success", False)}')
                print(f'Test data: {json.dumps(test_data, indent=2)}')
            else:
                print(f'❌ Connection test failed: {test_response.text}')
                
        except httpx.ConnectError:
            print('❌ Cannot connect to API server. Make sure Docker containers are running.')
        except Exception as e:
            print(f'❌ Exception during testing: {e}')
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_chat_api())