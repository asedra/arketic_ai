#!/usr/bin/env python3
"""
Test script for Assistant Creation with Knowledge Base Integration (AR-66)
"""

import asyncio
import json
import aiohttp
from datetime import datetime
from typing import Dict, Any, List

# API configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "test@arketic.com"
TEST_USER_PASSWORD = "testpass123"

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_test(message: str, status: str = "INFO"):
    """Print formatted test message"""
    color = Colors.OKBLUE
    if status == "PASS":
        color = Colors.OKGREEN
    elif status == "FAIL":
        color = Colors.FAIL
    elif status == "WARN":
        color = Colors.WARNING
    
    print(f"{color}[{status}]{Colors.ENDC} {message}")

async def login(session: aiohttp.ClientSession) -> str:
    """Login and get access token"""
    login_data = {
        "username": TEST_USER_EMAIL,  # Try username instead of email
        "password": TEST_USER_PASSWORD
    }
    
    async with session.post(f"{API_BASE_URL}/auth/login", json=login_data) as resp:
        if resp.status == 200:
            data = await resp.json()
            # Handle both formats: {"data": {"access_token": "..."}} and {"access_token": "..."}
            if "data" in data and "access_token" in data["data"]:
                return data["data"]["access_token"]
            elif "access_token" in data:
                return data["access_token"]
            else:
                raise Exception(f"No access token in response: {data}")
        else:
            # Try with email field
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            async with session.post(f"{API_BASE_URL}/auth/login", json=login_data) as resp2:
                if resp2.status == 200:
                    data = await resp2.json()
                    if "data" in data and "access_token" in data["data"]:
                        return data["data"]["access_token"]
                    elif "access_token" in data:
                        return data["access_token"]
                    else:
                        raise Exception(f"No access token in response: {data}")
                else:
                    raise Exception(f"Login failed: {await resp.text()}")

async def test_get_available_models(session: aiohttp.ClientSession, headers: Dict):
    """Test getting available AI models"""
    print_test("\n🤖 Testing Get Available Models...", "INFO")
    
    async with session.get(f"{API_BASE_URL}/assistants/models/available", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            models = data.get("data", {}).get("models", [])
            print_test(f"  Found {len(models)} available models", "PASS")
            for model in models[:3]:  # Show first 3 models
                print(f"    - {model['label']}: {model['description']}")
            return True
        else:
            print_test(f"  Failed to get models: {resp.status}", "FAIL")
            return False

async def test_list_knowledge_bases(session: aiohttp.ClientSession, headers: Dict) -> List[Dict]:
    """Test listing knowledge bases"""
    print_test("\n📚 Testing List Knowledge Bases...", "INFO")
    
    async with session.get(f"{API_BASE_URL}/knowledge/collections", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            collections = data.get("data", {}).get("collections", [])
            print_test(f"  Found {len(collections)} knowledge bases", "PASS")
            for kb in collections[:3]:  # Show first 3
                print(f"    - {kb['name']} ({kb['type']}): {kb['total_documents']} documents")
            return collections
        else:
            print_test(f"  Failed to list knowledge bases: {resp.status}", "FAIL")
            return []

async def test_create_assistant_without_knowledge(session: aiohttp.ClientSession, headers: Dict) -> str:
    """Test creating assistant without knowledge base"""
    print_test("\n➕ Testing Create Assistant (without knowledge)...", "INFO")
    
    assistant_data = {
        "name": f"Test Assistant {datetime.now().strftime('%H%M%S')}",
        "description": "Test assistant for AR-66 validation",
        "system_prompt": "You are a helpful AI assistant created for testing purposes.",
        "ai_model": "gpt-4o",
        "temperature": 0.7,
        "max_tokens": 2048,
        "is_public": False,
        "knowledge_base_ids": [],
        "document_ids": []
    }
    
    async with session.post(f"{API_BASE_URL}/assistants", json=assistant_data, headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            # Handle both response formats
            if "data" in data:
                assistant = data["data"]
            else:
                assistant = data
            
            assistant_id = assistant.get("id")
            assistant_name = assistant.get("name")
            print_test(f"  ✅ Created assistant: {assistant_name} (ID: {assistant_id})", "PASS")
            return assistant_id
        else:
            error_text = await resp.text()
            print_test(f"  Failed to create assistant: {error_text}", "FAIL")
            return None

async def test_create_assistant_with_knowledge(session: aiohttp.ClientSession, headers: Dict, knowledge_bases: List[Dict]) -> str:
    """Test creating assistant with knowledge base associations"""
    print_test("\n➕ Testing Create Assistant (with knowledge)...", "INFO")
    
    # Select first available knowledge base if any
    kb_ids = []
    doc_ids = []
    
    if knowledge_bases:
        kb_ids = [knowledge_bases[0]["id"]]
        print(f"    Using knowledge base: {knowledge_bases[0]['name']}")
    
    assistant_data = {
        "name": f"AI Assistant with KB {datetime.now().strftime('%H%M%S')}",
        "description": "Test assistant with knowledge base for AR-66",
        "system_prompt": "You are an AI assistant with access to knowledge bases.",
        "ai_model": "gpt-4o-mini",
        "temperature": 0.5,
        "max_tokens": 3000,
        "is_public": False,
        "knowledge_base_ids": kb_ids,
        "document_ids": doc_ids
    }
    
    async with session.post(f"{API_BASE_URL}/assistants", json=assistant_data, headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            # Handle both response formats
            if "data" in data:
                assistant = data["data"]
            else:
                assistant = data
                
            assistant_id = assistant.get("id")
            assistant_name = assistant.get("name")
            print_test(f"  ✅ Created assistant with knowledge: {assistant_name}", "PASS")
            print(f"    ID: {assistant_id}")
            print(f"    Knowledge bases: {assistant.get('knowledge_count', 0)}")
            print(f"    Documents: {assistant.get('document_count', 0)}")
            return assistant_id
        else:
            error_text = await resp.text()
            print_test(f"  Failed to create assistant: {error_text}", "FAIL")
            return None

async def test_get_assistant_knowledge(session: aiohttp.ClientSession, headers: Dict, assistant_id: str):
    """Test getting assistant's knowledge associations"""
    print_test(f"\n🔍 Testing Get Assistant Knowledge (ID: {assistant_id})...", "INFO")
    
    async with session.get(f"{API_BASE_URL}/assistants/{assistant_id}/knowledge", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            # Handle both response formats
            if "data" in data:
                knowledge_data = data["data"]
            else:
                knowledge_data = data
                
            kbs = knowledge_data.get("knowledge_bases", [])
            docs = knowledge_data.get("documents", [])
            
            print_test(f"  Retrieved knowledge associations", "PASS")
            print(f"    Knowledge bases: {len(kbs)}")
            print(f"    Documents: {len(docs)}")
            
            for kb in kbs:
                print(f"      - KB: {kb['name']} ({kb.get('type', 'unknown')})")
            
            return True
        else:
            print_test(f"  Failed to get knowledge: {resp.status}", "FAIL")
            return False

async def test_update_assistant_knowledge(session: aiohttp.ClientSession, headers: Dict, assistant_id: str, knowledge_bases: List[Dict]):
    """Test updating assistant's knowledge associations"""
    print_test(f"\n🔄 Testing Update Assistant Knowledge...", "INFO")
    
    # Select different knowledge bases for update
    new_kb_ids = []
    if len(knowledge_bases) > 1:
        new_kb_ids = [kb["id"] for kb in knowledge_bases[:2]]  # Select first 2
        print(f"    Adding {len(new_kb_ids)} knowledge bases")
    
    update_data = {
        "knowledge_base_ids": new_kb_ids,
        "document_ids": []
    }
    
    async with session.post(f"{API_BASE_URL}/assistants/{assistant_id}/knowledge", 
                           json=update_data, headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            result = data.get("data", {})
            print_test(f"  ✅ Updated knowledge associations", "PASS")
            print(f"    Knowledge bases: {result.get('knowledge_base_count', 0)}")
            print(f"    Documents: {result.get('document_count', 0)}")
            return True
        else:
            error_text = await resp.text()
            print_test(f"  Failed to update knowledge: {error_text}", "FAIL")
            return False

async def test_list_assistants(session: aiohttp.ClientSession, headers: Dict):
    """Test listing assistants"""
    print_test("\n📋 Testing List Assistants...", "INFO")
    
    params = {
        "page": 1,
        "limit": 10,
        "sort_by": "created_at",
        "sort_order": "desc"
    }
    
    async with session.get(f"{API_BASE_URL}/assistants", params=params, headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            assistants = data.get("data", {}).get("assistants", [])
            total = data.get("data", {}).get("total", 0)
            
            print_test(f"  Found {total} total assistants (showing {len(assistants)})", "PASS")
            for assistant in assistants[:3]:  # Show first 3
                kb_count = assistant.get("knowledge_count", 0)
                print(f"    - {assistant['name']}: {kb_count} KB, {assistant['total_messages']} messages")
            return True
        else:
            print_test(f"  Failed to list assistants: {resp.status}", "FAIL")
            return False

async def test_delete_assistant(session: aiohttp.ClientSession, headers: Dict, assistant_id: str):
    """Test deleting an assistant"""
    print_test(f"\n🗑️  Testing Delete Assistant (ID: {assistant_id})...", "INFO")
    
    async with session.delete(f"{API_BASE_URL}/assistants/{assistant_id}", headers=headers) as resp:
        if resp.status == 200:
            data = await resp.json()
            print_test(f"  ✅ {data.get('data', {}).get('message', 'Assistant deleted')}", "PASS")
            return True
        else:
            print_test(f"  Failed to delete assistant: {resp.status}", "FAIL")
            return False

async def run_tests():
    """Run all assistant knowledge integration tests"""
    print(f"\n{Colors.HEADER}{'='*60}")
    print(f"   ASSISTANT KNOWLEDGE BASE INTEGRATION TEST (AR-66)")
    print(f"{'='*60}{Colors.ENDC}\n")
    
    print(f"API URL: {API_BASE_URL}")
    print(f"Test User: {TEST_USER_EMAIL}")
    print(f"Timestamp: {datetime.now().isoformat()}\n")
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    tests_passed = []  # Initialize before try block
    
    async with aiohttp.ClientSession() as session:
        try:
            # Login
            print_test("🔐 Logging in...", "INFO")
            token = await login(session)
            headers = {"Authorization": f"Bearer {token}"}
            print_test("  Login successful", "PASS")
            
            # Run tests
            
            # Test 1: Get available models
            results["total"] += 1
            if await test_get_available_models(session, headers):
                results["passed"] += 1
                tests_passed.append("Get Available Models")
            else:
                results["failed"] += 1
            
            # Test 2: List knowledge bases
            results["total"] += 1
            knowledge_bases = await test_list_knowledge_bases(session, headers)
            if knowledge_bases is not None:
                results["passed"] += 1
                tests_passed.append("List Knowledge Bases")
            else:
                results["failed"] += 1
            
            # Test 3: Create assistant without knowledge
            results["total"] += 1
            assistant_id_1 = await test_create_assistant_without_knowledge(session, headers)
            if assistant_id_1:
                results["passed"] += 1
                tests_passed.append("Create Assistant (no KB)")
            else:
                results["failed"] += 1
            
            # Test 4: Create assistant with knowledge
            results["total"] += 1
            assistant_id_2 = await test_create_assistant_with_knowledge(session, headers, knowledge_bases)
            if assistant_id_2:
                results["passed"] += 1
                tests_passed.append("Create Assistant (with KB)")
            else:
                results["failed"] += 1
            
            # Test 5: Get assistant knowledge
            if assistant_id_2:
                results["total"] += 1
                if await test_get_assistant_knowledge(session, headers, assistant_id_2):
                    results["passed"] += 1
                    tests_passed.append("Get Assistant Knowledge")
                else:
                    results["failed"] += 1
            
            # Test 6: Update assistant knowledge
            if assistant_id_1 and knowledge_bases:
                results["total"] += 1
                if await test_update_assistant_knowledge(session, headers, assistant_id_1, knowledge_bases):
                    results["passed"] += 1
                    tests_passed.append("Update Assistant Knowledge")
                else:
                    results["failed"] += 1
            
            # Test 7: List assistants
            results["total"] += 1
            if await test_list_assistants(session, headers):
                results["passed"] += 1
                tests_passed.append("List Assistants")
            else:
                results["failed"] += 1
            
            # Test 8 & 9: Delete assistants (cleanup)
            if assistant_id_1:
                results["total"] += 1
                if await test_delete_assistant(session, headers, assistant_id_1):
                    results["passed"] += 1
                    tests_passed.append("Delete Assistant 1")
                else:
                    results["failed"] += 1
            
            if assistant_id_2:
                results["total"] += 1
                if await test_delete_assistant(session, headers, assistant_id_2):
                    results["passed"] += 1
                    tests_passed.append("Delete Assistant 2")
                else:
                    results["failed"] += 1
            
        except Exception as e:
            print_test(f"\nUnexpected error: {str(e)}", "FAIL")
            results["failed"] += 1
            results["total"] += 1
    
    # Print summary
    print(f"\n{Colors.HEADER}{'='*60}")
    print(f"                    TEST SUMMARY")
    print(f"{'='*60}{Colors.ENDC}\n")
    
    success_rate = (results["passed"] / results["total"] * 100) if results["total"] > 0 else 0
    
    print(f"Total Tests: {results['total']}")
    print(f"{Colors.OKGREEN}Passed: {results['passed']}{Colors.ENDC}")
    print(f"{Colors.FAIL}Failed: {results['failed']}{Colors.ENDC}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if results["passed"] == results["total"]:
        print(f"\n{Colors.OKGREEN}✅ ALL TESTS PASSED! AR-66 functionality is working correctly.{Colors.ENDC}")
    else:
        print(f"\n{Colors.WARNING}⚠️  Some tests failed. Please review the output above.{Colors.ENDC}")
    
    # Save results to file
    report = {
        "test_suite": "Assistant Knowledge Base Integration (AR-66)",
        "timestamp": datetime.now().isoformat(),
        "results": results,
        "tests_passed": tests_passed,
        "success_rate": success_rate
    }
    
    with open("/tmp/assistant_knowledge_test_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📊 Test report saved to: assistant_knowledge_test_report.json")

if __name__ == "__main__":
    asyncio.run(run_tests())