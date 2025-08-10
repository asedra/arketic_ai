#!/usr/bin/env python3
"""Test direct vector similarity search"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

async def test_search():
    DATABASE_URL = "postgresql+asyncpg://arketic:arketic_dev_password@localhost:5432/arketic_dev"
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # First check if embeddings exist
        check = await session.execute(text("""
            SELECT id, document_id, chunk_index, 
                   SUBSTRING(content, 1, 50) as content_preview,
                   CASE 
                       WHEN embedding IS NULL THEN 'NULL'
                       WHEN LENGTH(embedding::text) > 0 THEN 'EXISTS (' || LENGTH(embedding::text) || ' chars)'
                       ELSE 'EMPTY'
                   END as embedding_status,
                   array_length(embedding::float4[], 1) as vector_dims
            FROM knowledge_embeddings
            WHERE document_id = 'a6822960-5401-44d2-9f8f-eb2ac9bf880f'
            ORDER BY chunk_index
        """))
        
        print("=== EMBEDDINGS CHECK ===")
        for row in check:
            print(f"Chunk {row[2]}: {row[3]}...")
            print(f"  Embedding: {row[4]}, Dimensions: {row[5]}")
        
        # Get one embedding to use as query
        query_emb = await session.execute(text("""
            SELECT embedding
            FROM knowledge_embeddings
            WHERE document_id = 'a6822960-5401-44d2-9f8f-eb2ac9bf880f'
            LIMIT 1
        """))
        
        emb_row = query_emb.fetchone()
        if emb_row and emb_row[0]:
            print(f"\n=== SELF-SIMILARITY TEST ===")
            print(f"Using embedding from first chunk as query")
            
            # Test cosine similarity with itself (should be 1.0)
            similarity_test = await session.execute(text("""
                SELECT 
                    chunk_index,
                    1 - (embedding <=> :query_embedding) as similarity,
                    embedding <=> :query_embedding as distance
                FROM knowledge_embeddings
                WHERE document_id = 'a6822960-5401-44d2-9f8f-eb2ac9bf880f'
                ORDER BY embedding <=> :query_embedding
            """), {"query_embedding": emb_row[0]})
            
            print("\nSimilarity results:")
            for row in similarity_test:
                print(f"  Chunk {row[0]}: Similarity={row[1]:.4f}, Distance={row[2]:.4f}")
        
        # Test if vector operations work at all
        print("\n=== VECTOR OPERATIONS TEST ===")
        vector_test = await session.execute(text("""
            SELECT 
                COUNT(*) as total,
                COUNT(embedding) as with_embedding,
                AVG(array_length(embedding::float4[], 1)) as avg_dims
            FROM knowledge_embeddings
        """))
        
        vt = vector_test.fetchone()
        print(f"Total embeddings: {vt[0]}")
        print(f"With embedding data: {vt[1]}")
        print(f"Average dimensions: {vt[2]}")

if __name__ == "__main__":
    asyncio.run(test_search())