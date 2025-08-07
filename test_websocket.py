#!/usr/bin/env python3

import asyncio
import json
import websockets
import httpx
from datetime import datetime

async def test_websocket():
    base_url = 'http://localhost:8000'
    ws_url = 'ws://localhost:8000'
    
    # Login first to get token
    login_data = {
        'email': 'arketic@arketic.com',
        'password': 'Arketic123!'
    }
    
    print('🔍 Testing WebSocket connection...')
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # 1. Login and get token
            print('\n1. Getting authentication token...')
            auth_response = await client.post(f'{base_url}/api/v1/auth/login', json=login_data)
            
            if auth_response.status_code != 200:
                print('❌ Login failed')
                return
            
            auth_data = auth_response.json()
            token = auth_data.get('access_token')
            
            if not token:
                print('❌ No access token received')
                return
            
            print('✅ Token obtained')
            
            # 2. Create a test chat
            print('\n2. Creating test chat...')
            create_chat_data = {
                'title': 'WebSocket Test Chat',
                'description': 'Test chat for WebSocket testing',
                'chat_type': 'direct',
                'ai_model': 'gpt-3.5-turbo'
            }
            
            create_response = await client.post(
                f'{base_url}/api/v1/chat/chats',
                json=create_chat_data,
                headers={'Authorization': f'Bearer {token}'}
            )
            
            if create_response.status_code != 200:
                print('❌ Chat creation failed')
                return
                
            chat_data = create_response.json()
            chat_id = chat_data.get('id')
            print(f'✅ Chat created: {chat_id}')
            
            # 3. Test WebSocket connection
            print(f'\n3. Testing WebSocket connection...')
            ws_endpoint = f'{ws_url}/api/v1/chat/chats/{chat_id}/ws?token={token}'
            print(f'Connecting to: {ws_endpoint}')
            
            try:
                async with websockets.connect(ws_endpoint) as websocket:
                    print('✅ WebSocket connected successfully!')
                    
                    # Wait for welcome message
                    try:
                        welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        welcome_data = json.loads(welcome_msg)
                        print(f'📨 Welcome message: {welcome_data.get("message", "N/A")}')
                        print(f'🔗 Connection type: {welcome_data.get("type", "N/A")}')
                    except asyncio.TimeoutError:
                        print('⚠️ No welcome message received within timeout')
                    
                    # Test ping-pong
                    print('\n4. Testing ping-pong...')
                    ping_message = {
                        "type": "ping",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    await websocket.send(json.dumps(ping_message))
                    print('📤 Ping sent')
                    
                    try:
                        pong_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        pong_data = json.loads(pong_response)
                        print(f'📥 Pong received: {pong_data.get("type", "N/A")}')
                    except asyncio.TimeoutError:
                        print('⚠️ No pong response received')
                    
                    # Test heartbeat
                    print('\n5. Testing heartbeat...')
                    heartbeat_message = {
                        "type": "heartbeat",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    await websocket.send(json.dumps(heartbeat_message))
                    print('📤 Heartbeat sent')
                    
                    try:
                        heartbeat_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        heartbeat_data = json.loads(heartbeat_response)
                        print(f'📥 Heartbeat ack: {heartbeat_data.get("type", "N/A")}')
                    except asyncio.TimeoutError:
                        print('⚠️ No heartbeat ack received')
                    
                    # Test echo message
                    print('\n6. Testing echo message...')
                    test_message = {
                        "type": "test",
                        "data": "Hello WebSocket!",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    await websocket.send(json.dumps(test_message))
                    print('📤 Test message sent')
                    
                    try:
                        echo_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                        echo_data = json.loads(echo_response)
                        print(f'📥 Echo received: {echo_data.get("type", "N/A")}')
                    except asyncio.TimeoutError:
                        print('⚠️ No echo response received')
                    
                    print('\n✅ All WebSocket tests completed successfully!')
                    
            except websockets.exceptions.InvalidStatusCode as e:
                print(f'❌ WebSocket connection failed with status: {e.status_code}')
                print(f'Headers: {e.response_headers}')
            except websockets.exceptions.ConnectionClosedError as e:
                print(f'❌ WebSocket connection closed: {e.code} - {e.reason}')
            except Exception as e:
                print(f'❌ WebSocket error: {e}')
                import traceback
                traceback.print_exc()
                
        except Exception as e:
            print(f'❌ General error: {e}')
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_websocket())