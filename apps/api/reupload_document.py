#!/usr/bin/env python3
"""Delete and reupload document to create embeddings"""

import asyncio
import requests
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

async def cleanup_document():
    DATABASE_URL = "postgresql+asyncpg://arketic:arketic_dev_password@localhost:5432/arketic_dev"
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Delete existing embeddings if any
        await session.execute(text("""
            DELETE FROM knowledge_embeddings 
            WHERE document_id = '3d2f647c-f474-4a64-8bce-22e470a72967'
        """))
        
        # Delete the document
        await session.execute(text("""
            DELETE FROM knowledge_documents 
            WHERE id = '3d2f647c-f474-4a64-8bce-22e470a72967'
        """))
        
        await session.commit()
        print("Document and embeddings deleted")

def upload_test_document():
    """Upload a test document with content containing 'ali'"""
    
    url = "http://localhost:8000/api/v1/knowledge/upload"
    headers = {
        "accept": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGFya2V0aWMuY29tIiwidXNlcl9pZCI6ImYyZGE5YTE4LTcyODEtNDlkZS05NTZkLTYzNDczYzI0YjRkZiIsImVtYWlsIjoidGVzdEBhcmtldGljLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkIiwid3JpdGUiLCJhZG1pbiIsInVzZXJzOm1hbmFnZSIsInJvbGVzOm1hbmFnZSIsInN5c3RlbTpjb25maWd1cmUiLCJyZXBvcnRzOnZpZXciLCJhbmFseXRpY3M6dmlldyJdLCJleHAiOjE3NTQ4MjAxODJ9.QknK3LbMzG3u5Zg_4Rb-mJVXo2x9nEG7QIpPkQniVSY",
        "Content-Type": "application/json"
    }
    
    # Test content with 'ali' keyword
    test_content = """
    Arketic AI Platform Documentation
    
    Bu dokümanda, Ali ve ekibi tarafından geliştirilen Arketic AI platformunun 
    temel özellikleri ve kullanım kılavuzu yer almaktadır.
    
    1. Giriş
    Platform, Ali'nin liderliğinde geliştirilmiş modern bir AI çözümüdür.
    
    2. Özellikler
    - RAG (Retrieval Augmented Generation) desteği
    - Vector database entegrasyonu (PGVector)
    - Semantic search yetenekleri
    - Multi-modal AI desteği
    
    3. Geliştirici Ekibi
    Proje lideri Ali ve deneyimli yazılım geliştirme ekibi tarafından 
    sürekli olarak güncellenmektedir.
    
    4. Teknik Detaylar
    Sistem, FastAPI backend ve Next.js frontend kullanarak geliştirilmiştir.
    Ali'nin önerdiği microservice mimarisi sayesinde yüksek performans 
    ve ölçeklenebilirlik sağlanmıştır.
    
    5. İletişim
    Sorularınız için Ali ve ekibine ulaşabilirsiniz.
    """
    
    data = {
        "title": "Arketic Platform Documentation",
        "content": test_content,
        "source_type": "text",
        "metadata": {
            "author": "Ali",
            "version": "1.0",
            "tags": ["documentation", "ali", "arketic"]
        }
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 201:
        result = response.json()
        print(f"Document uploaded successfully!")
        print(f"Document ID: {result['document_id']}")
        print(f"Chunks created: {result['chunk_count']}")
        print(f"Tokens: {result['token_count']}")
        return result['document_id']
    else:
        print(f"Upload failed: {response.status_code}")
        print(response.text)
        return None

async def verify_embeddings(document_id):
    """Verify embeddings were created"""
    DATABASE_URL = "postgresql+asyncpg://arketic:arketic_dev_password@localhost:5432/arketic_dev"
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Check embeddings
        result = await session.execute(text("""
            SELECT COUNT(*) as count,
                   COUNT(CASE WHEN LOWER(content) LIKE '%ali%' THEN 1 END) as ali_count
            FROM knowledge_embeddings 
            WHERE document_id = :doc_id
        """), {"doc_id": document_id})
        
        row = result.fetchone()
        print(f"\n=== EMBEDDINGS VERIFICATION ===")
        print(f"Total embeddings created: {row[0]}")
        print(f"Embeddings with 'ali' keyword: {row[1]}")
        
        # Get sample chunks with 'ali'
        samples = await session.execute(text("""
            SELECT chunk_index, SUBSTRING(content, 1, 100) as preview
            FROM knowledge_embeddings 
            WHERE document_id = :doc_id AND LOWER(content) LIKE '%ali%'
            LIMIT 3
        """), {"doc_id": document_id})
        
        print("\nSample chunks with 'ali':")
        for sample in samples:
            print(f"  Chunk {sample[0]}: {sample[1]}...")

async def main():
    # Clean up old document
    await cleanup_document()
    
    # Wait for API to be ready
    await asyncio.sleep(2)
    
    # Upload new document
    document_id = upload_test_document()
    
    if document_id:
        # Wait for processing
        await asyncio.sleep(3)
        
        # Verify embeddings
        await verify_embeddings(document_id)
        
        # Test search
        print("\n=== TESTING SEARCH ===")
        search_url = "http://localhost:8000/api/v1/knowledge/search"
        search_data = {
            "query": "ali",
            "document_id": document_id,
            "k": 5,
            "score_threshold": 0.5,
            "search_type": "semantic"
        }
        
        headers = {
            "accept": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGFya2V0aWMuY29tIiwidXNlcl9pZCI6ImYyZGE5YTE4LTcyODEtNDlkZS05NTZkLTYzNDczYzI0YjRkZiIsImVtYWlsIjoidGVzdEBhcmtldGljLmNvbSIsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJyb2xlcyI6WyJhZG1pbiJdLCJwZXJtaXNzaW9ucyI6WyJyZWFkIiwid3JpdGUiLCJhZG1pbiIsInVzZXJzOm1hbmFnZSIsInJvbGVzOm1hbmFnZSIsInN5c3RlbTpjb25maWd1cmUiLCJyZXBvcnRzOnZpZXciLCJhbmFseXRpY3M6dmlldyJdLCJleHAiOjE3NTQ4MjAxODJ9.QknK3LbMzG3u5Zg_4Rb-mJVXo2x9nEG7QIpPkQniVSY",
            "Content-Type": "application/json"
        }
        
        response = requests.post(search_url, headers=headers, json=search_data)
        result = response.json()
        
        print(f"Search results: {result['total_results']} found")
        if result['results']:
            for i, res in enumerate(result['results'][:3]):
                print(f"\nResult {i+1}:")
                print(f"  Score: {res['score']}")
                print(f"  Content: {res['content'][:100]}...")

if __name__ == "__main__":
    asyncio.run(main())