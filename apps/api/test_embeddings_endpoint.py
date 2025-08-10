#!/usr/bin/env python3
"""
Test script for the new document embeddings endpoint
"""

import json
import requests
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_embeddings_endpoint():
    """Test the document embeddings retrieval endpoint"""
    
    # Step 1: Login to get token
    print("1. Logging in...")
    login_response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={
            "email": "test@arketic.com",
            "password": "testpass123"
        }
    )
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"✓ Login successful")
    
    # Step 2: Create a test document
    print("\n2. Creating test document...")
    doc_response = requests.post(
        f"{BASE_URL}/api/v1/knowledge/upload",
        headers=headers,
        json={
            "title": "Test Document for Embeddings",
            "content": "This is a test document to verify the embeddings endpoint. It contains multiple sentences that will be split into chunks. Each chunk will have its own embedding vector generated. This allows us to test the retrieval and display of embeddings in the frontend.",
            "source_type": "text"
        }
    )
    
    if doc_response.status_code not in [200, 201]:
        print(f"Document creation failed: {doc_response.text}")
        return
    
    document_id = doc_response.json()["document_id"]
    print(f"✓ Document created with ID: {document_id}")
    print(f"  Chunks: {doc_response.json().get('chunk_count', 'N/A')}")
    print(f"  Tokens: {doc_response.json().get('token_count', 'N/A')}")
    
    # Step 3: Wait a moment for processing
    print("\n3. Waiting for embeddings to process...")
    time.sleep(2)
    
    # Step 4: Fetch embeddings for the document
    print("\n4. Fetching document embeddings...")
    embeddings_response = requests.get(
        f"{BASE_URL}/api/v1/knowledge/{document_id}/embeddings",
        headers=headers
    )
    
    if embeddings_response.status_code != 200:
        print(f"Failed to fetch embeddings: {embeddings_response.text}")
        return
    
    embeddings_data = embeddings_response.json()
    print(f"✓ Embeddings retrieved successfully!")
    print(f"\n📊 Embedding Information:")
    print(f"  Document ID: {embeddings_data.get('document_id')}")
    print(f"  Title: {embeddings_data.get('title')}")
    print(f"  Total Chunks: {embeddings_data.get('total_chunks')}")
    print(f"  Total Tokens: {embeddings_data.get('total_tokens')}")
    print(f"  Model: {embeddings_data.get('embedding_model')}")
    print(f"  Dimensions: {embeddings_data.get('embedding_dimensions')}")
    
    # Step 5: Display chunk information
    print(f"\n📄 Chunks:")
    chunks = embeddings_data.get('chunks', [])
    for i, chunk in enumerate(chunks[:3]):  # Show first 3 chunks
        print(f"\n  Chunk {chunk.get('chunk_index', i) + 1}:")
        print(f"    Text: {chunk.get('chunk_text', '')[:100]}...")
        print(f"    Tokens: {chunk.get('token_count', 0)}")
        print(f"    Embedding Preview: {chunk.get('embedding_preview', [])[:3]}...")
    
    if len(chunks) > 3:
        print(f"\n  ... and {len(chunks) - 3} more chunks")
    
    # Step 6: Test document detail endpoint for comparison
    print("\n5. Testing document detail endpoint...")
    detail_response = requests.get(
        f"{BASE_URL}/api/v1/knowledge/{document_id}",
        headers=headers
    )
    
    if detail_response.status_code == 200:
        detail_data = detail_response.json()
        print(f"✓ Document details retrieved")
        print(f"  Content available: {'Yes' if detail_data.get('content') else 'No'}")
    
    # Step 7: Cleanup - delete test document
    print("\n6. Cleaning up test document...")
    delete_response = requests.delete(
        f"{BASE_URL}/api/v1/knowledge/{document_id}",
        headers=headers
    )
    
    if delete_response.status_code in [200, 204]:
        print(f"✓ Test document deleted")
    else:
        print(f"⚠ Could not delete test document: {delete_response.text}")
    
    print("\n✅ Test completed successfully!")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("Testing Document Embeddings Endpoint")
    print("=" * 60)
    
    try:
        success = test_embeddings_endpoint()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        exit(1)