#!/usr/bin/env python3

import asyncio
import json
import websockets
import httpx
from datetime import datetime

async def comprehensive_chat_test():
    """
    Comprehensive chat system test covering:
    1. Authentication
    2. Chat CRUD operations 
    3. Message operations
    4. WebSocket real-time functionality
    5. Error handling
    6. AI integration flow
    """
    base_url = 'http://localhost:8000'
    ws_url = 'ws://localhost:8000'
    
    print('🚀 Starting Comprehensive Chat System Test')
    print('=' * 60)
    
    # Test credentials
    login_data = {
        'email': 'arketic@arketic.com',
        'password': 'Arketic123!'
    }
    
    test_results = {
        'auth': {'status': 'pending', 'details': []},
        'chat_crud': {'status': 'pending', 'details': []},
        'messaging': {'status': 'pending', 'details': []},
        'websocket': {'status': 'pending', 'details': []},
        'error_handling': {'status': 'pending', 'details': []},
        'ai_integration': {'status': 'pending', 'details': []},
        'performance': {'status': 'pending', 'details': []}
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            # =========================
            # 1. AUTHENTICATION TESTS
            # =========================
            print('\n📋 1. AUTHENTICATION TESTS')
            print('-' * 40)
            
            # Test login
            start_time = datetime.now()
            auth_response = await client.post(f'{base_url}/api/v1/auth/login', json=login_data)
            
            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                token = auth_data.get('access_token')
                user_id = auth_data.get('user', {}).get('id')
                
                if token and user_id:
                    test_results['auth']['status'] = 'passed'
                    test_results['auth']['details'].append('✅ Login successful')
                    print('✅ Login successful')
                    
                    headers = {'Authorization': f'Bearer {token}'}
                    
                    # Test token validation
                    test_response = await client.get(f'{base_url}/api/v1/test-auth', headers=headers)
                    if test_response.status_code == 200:
                        test_results['auth']['details'].append('✅ Token validation successful')
                        print('✅ Token validation successful')
                    else:
                        test_results['auth']['details'].append('❌ Token validation failed')
                        print('❌ Token validation failed')
                else:
                    test_results['auth']['status'] = 'failed'
                    test_results['auth']['details'].append('❌ Missing token or user_id')
                    print('❌ Missing token or user_id')
                    return test_results
            else:
                test_results['auth']['status'] = 'failed'
                test_results['auth']['details'].append(f'❌ Login failed: {auth_response.status_code}')
                print(f'❌ Login failed: {auth_response.status_code}')
                return test_results
                
            auth_time = (datetime.now() - start_time).total_seconds()
            test_results['auth']['details'].append(f'⏱️ Auth time: {auth_time:.2f}s')
            
            # =========================
            # 2. CHAT CRUD OPERATIONS
            # =========================
            print('\n📋 2. CHAT CRUD OPERATIONS')
            print('-' * 40)
            
            start_time = datetime.now()
            
            # Test create chat
            create_chat_data = {
                'title': 'Comprehensive Test Chat',
                'description': 'Full system test chat',
                'chat_type': 'direct',
                'ai_model': 'gpt-3.5-turbo',
                'temperature': 0.7,
                'max_tokens': 2048,
                'enable_ai_responses': True
            }
            
            create_response = await client.post(
                f'{base_url}/api/v1/chat/chats',
                json=create_chat_data,
                headers=headers
            )
            
            if create_response.status_code == 200:
                chat_data = create_response.json()
                chat_id = chat_data.get('id')
                test_results['chat_crud']['details'].append('✅ Chat creation successful')
                print(f'✅ Chat created: {chat_id}')
                
                # Test get user chats
                chats_response = await client.get(f'{base_url}/api/v1/chat/chats', headers=headers)
                if chats_response.status_code == 200:
                    chats_data = chats_response.json()
                    test_results['chat_crud']['details'].append(f'✅ Retrieved {len(chats_data)} chats')
                    print(f'✅ Retrieved {len(chats_data)} chats')
                    
                    # Test get chat history
                    history_response = await client.get(f'{base_url}/api/v1/chat/chats/{chat_id}', headers=headers)
                    if history_response.status_code == 200:
                        history_data = history_response.json()
                        messages = history_data.get('messages', [])
                        test_results['chat_crud']['details'].append(f'✅ Chat history retrieved: {len(messages)} messages')
                        print(f'✅ Chat history retrieved: {len(messages)} messages')
                        
                        test_results['chat_crud']['status'] = 'passed'
                    else:
                        test_results['chat_crud']['status'] = 'failed'
                        test_results['chat_crud']['details'].append('❌ Failed to get chat history')
                        print('❌ Failed to get chat history')
                else:
                    test_results['chat_crud']['status'] = 'failed'
                    test_results['chat_crud']['details'].append('❌ Failed to get user chats')
                    print('❌ Failed to get user chats')
            else:
                test_results['chat_crud']['status'] = 'failed'
                test_results['chat_crud']['details'].append('❌ Failed to create chat')
                print('❌ Failed to create chat')
                return test_results
            
            crud_time = (datetime.now() - start_time).total_seconds()
            test_results['chat_crud']['details'].append(f'⏱️ CRUD time: {crud_time:.2f}s')
            
            # =========================
            # 3. MESSAGING TESTS
            # =========================
            print('\n📋 3. MESSAGING TESTS')
            print('-' * 40)
            
            start_time = datetime.now()
            
            # Test send multiple messages
            test_messages = [
                'Hello, this is test message 1',
                'This is test message 2 with more content',
                'Test message 3: Special characters !@#$%^&*()',
                'Test message 4: Unicode 🚀 🎯 ✅ 📊'
            ]
            
            sent_messages = []
            for i, content in enumerate(test_messages):
                message_data = {
                    'content': content,
                    'message_type': 'user'
                }
                
                message_response = await client.post(
                    f'{base_url}/api/v1/chat/chats/{chat_id}/messages',
                    json=message_data,
                    headers=headers
                )
                
                if message_response.status_code == 200:
                    message_result = message_response.json()
                    sent_messages.append(message_result)
                    print(f'✅ Message {i+1} sent: {message_result.get("id", "N/A")}')
                else:
                    test_results['messaging']['status'] = 'failed'
                    test_results['messaging']['details'].append(f'❌ Failed to send message {i+1}')
                    print(f'❌ Failed to send message {i+1}')
                    break
            
            if len(sent_messages) == len(test_messages):
                test_results['messaging']['status'] = 'passed'
                test_results['messaging']['details'].append(f'✅ All {len(test_messages)} messages sent')
                print(f'✅ All {len(test_messages)} messages sent')
                
                # Test message retrieval
                history_response = await client.get(f'{base_url}/api/v1/chat/chats/{chat_id}', headers=headers)
                if history_response.status_code == 200:
                    history_data = history_response.json()
                    retrieved_messages = history_data.get('messages', [])
                    test_results['messaging']['details'].append(f'✅ Retrieved {len(retrieved_messages)} messages')
                    print(f'✅ Retrieved {len(retrieved_messages)} messages')
            
            messaging_time = (datetime.now() - start_time).total_seconds()
            test_results['messaging']['details'].append(f'⏱️ Messaging time: {messaging_time:.2f}s')
            
            # =========================
            # 4. WEBSOCKET TESTS
            # =========================
            print('\n📋 4. WEBSOCKET TESTS')
            print('-' * 40)
            
            start_time = datetime.now()
            
            try:
                ws_endpoint = f'{ws_url}/api/v1/chat/chats/{chat_id}/ws?token={token}'
                
                async with websockets.connect(ws_endpoint) as websocket:
                    test_results['websocket']['details'].append('✅ WebSocket connected')
                    print('✅ WebSocket connected')
                    
                    # Wait for welcome message
                    welcome_msg = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    welcome_data = json.loads(welcome_msg)
                    
                    if welcome_data.get('type') == 'welcome':
                        test_results['websocket']['details'].append('✅ Welcome message received')
                        print('✅ Welcome message received')
                        
                        # Test ping-pong
                        ping_message = {
                            "type": "ping",
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        await websocket.send(json.dumps(ping_message))
                        
                        pong_response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                        pong_data = json.loads(pong_response)
                        
                        if pong_data.get('type') == 'pong':
                            test_results['websocket']['details'].append('✅ Ping-pong successful')
                            print('✅ Ping-pong successful')
                            test_results['websocket']['status'] = 'passed'
                        else:
                            test_results['websocket']['status'] = 'failed'
                            test_results['websocket']['details'].append('❌ Ping-pong failed')
                            print('❌ Ping-pong failed')
                    else:
                        test_results['websocket']['status'] = 'failed'
                        test_results['websocket']['details'].append('❌ Invalid welcome message')
                        print('❌ Invalid welcome message')
                        
            except Exception as ws_error:
                test_results['websocket']['status'] = 'failed'
                test_results['websocket']['details'].append(f'❌ WebSocket error: {str(ws_error)}')
                print(f'❌ WebSocket error: {str(ws_error)}')
            
            websocket_time = (datetime.now() - start_time).total_seconds()
            test_results['websocket']['details'].append(f'⏱️ WebSocket time: {websocket_time:.2f}s')
            
            # =========================
            # 5. ERROR HANDLING TESTS
            # =========================
            print('\n📋 5. ERROR HANDLING TESTS')
            print('-' * 40)
            
            # Test invalid chat access
            invalid_chat_response = await client.get(
                f'{base_url}/api/v1/chat/chats/invalid-chat-id',
                headers=headers
            )
            
            if invalid_chat_response.status_code == 404:
                test_results['error_handling']['details'].append('✅ Invalid chat ID handled correctly')
                print('✅ Invalid chat ID handled correctly')
                
                # Test invalid token
                invalid_token_response = await client.get(
                    f'{base_url}/api/v1/chat/chats/{chat_id}',
                    headers={'Authorization': 'Bearer invalid-token'}
                )
                
                if invalid_token_response.status_code == 401:
                    test_results['error_handling']['details'].append('✅ Invalid token handled correctly')
                    print('✅ Invalid token handled correctly')
                    test_results['error_handling']['status'] = 'passed'
                else:
                    test_results['error_handling']['status'] = 'failed'
                    test_results['error_handling']['details'].append('❌ Invalid token not handled')
                    print('❌ Invalid token not handled')
            else:
                test_results['error_handling']['status'] = 'failed'
                test_results['error_handling']['details'].append('❌ Error handling failed')
                print('❌ Error handling failed')
            
            # =========================
            # 6. AI INTEGRATION TESTS
            # =========================
            print('\n📋 6. AI INTEGRATION TESTS')
            print('-' * 40)
            
            # Test connection test endpoint
            ai_test_response = await client.post(f'{base_url}/api/v1/chat/test/connection', headers=headers)
            
            if ai_test_response.status_code == 200:
                ai_test_data = ai_test_response.json()
                openai_status = ai_test_data.get('data', {}).get('openai_api', {})
                
                if openai_status.get('success') is False and openai_status.get('error_code') == 'no_api_key':
                    test_results['ai_integration']['details'].append('✅ AI integration flow working (no API key configured)')
                    print('✅ AI integration flow working (no API key configured)')
                    test_results['ai_integration']['status'] = 'passed'
                elif openai_status.get('success') is True:
                    test_results['ai_integration']['details'].append('✅ AI integration fully working')
                    print('✅ AI integration fully working')
                    test_results['ai_integration']['status'] = 'passed'
                else:
                    test_results['ai_integration']['details'].append('⚠️ AI integration status unclear')
                    print('⚠️ AI integration status unclear')
                    test_results['ai_integration']['status'] = 'partial'
            else:
                test_results['ai_integration']['status'] = 'failed'
                test_results['ai_integration']['details'].append('❌ AI integration test failed')
                print('❌ AI integration test failed')
            
            # =========================
            # 7. PERFORMANCE TESTS
            # =========================
            print('\n📋 7. PERFORMANCE SUMMARY')
            print('-' * 40)
            
            total_time = auth_time + crud_time + messaging_time + websocket_time
            test_results['performance']['details'].extend([
                f'⏱️ Authentication: {auth_time:.2f}s',
                f'⏱️ CRUD Operations: {crud_time:.2f}s',
                f'⏱️ Messaging: {messaging_time:.2f}s',
                f'⏱️ WebSocket: {websocket_time:.2f}s',
                f'⏱️ Total Test Time: {total_time:.2f}s'
            ])
            
            if total_time < 10.0:
                test_results['performance']['status'] = 'passed'
                test_results['performance']['details'].append('✅ Performance acceptable')
                print('✅ Performance acceptable')
            elif total_time < 20.0:
                test_results['performance']['status'] = 'partial'
                test_results['performance']['details'].append('⚠️ Performance could be better')
                print('⚠️ Performance could be better')
            else:
                test_results['performance']['status'] = 'failed'
                test_results['performance']['details'].append('❌ Performance issues detected')
                print('❌ Performance issues detected')
            
        except Exception as e:
            print(f'❌ General error: {e}')
            import traceback
            traceback.print_exc()
    
    # =========================
    # FINAL RESULTS SUMMARY
    # =========================
    print('\n' + '=' * 60)
    print('📊 COMPREHENSIVE CHAT TEST RESULTS')
    print('=' * 60)
    
    total_tests = len(test_results)
    passed_tests = len([r for r in test_results.values() if r['status'] == 'passed'])
    partial_tests = len([r for r in test_results.values() if r['status'] == 'partial'])
    failed_tests = len([r for r in test_results.values() if r['status'] == 'failed'])
    
    for test_name, result in test_results.items():
        status_icon = {
            'passed': '✅',
            'partial': '⚠️',
            'failed': '❌',
            'pending': '⏳'
        }.get(result['status'], '❓')
        
        print(f"\n{status_icon} {test_name.upper().replace('_', ' ')}: {result['status'].upper()}")
        for detail in result['details']:
            print(f"   {detail}")
    
    print(f"\n📈 OVERALL SUMMARY:")
    print(f"   ✅ Passed: {passed_tests}/{total_tests}")
    print(f"   ⚠️ Partial: {partial_tests}/{total_tests}")
    print(f"   ❌ Failed: {failed_tests}/{total_tests}")
    
    success_rate = (passed_tests + partial_tests * 0.5) / total_tests * 100
    print(f"   📊 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 85:
        print(f"\n🎉 CHAT SYSTEM STATUS: EXCELLENT")
    elif success_rate >= 70:
        print(f"\n👍 CHAT SYSTEM STATUS: GOOD")
    elif success_rate >= 50:
        print(f"\n⚠️ CHAT SYSTEM STATUS: NEEDS IMPROVEMENT")
    else:
        print(f"\n❌ CHAT SYSTEM STATUS: CRITICAL ISSUES")
    
    return test_results

if __name__ == '__main__':
    asyncio.run(comprehensive_chat_test())