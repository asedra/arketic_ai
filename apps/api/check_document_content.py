#!/usr/bin/env python3
"""Check document content and why no embeddings exist"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

async def check_document():
    DATABASE_URL = "postgresql+asyncpg://arketic:arketic_dev_password@localhost:5432/arketic_dev"
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Get document details
        result = await session.execute(text("""
            SELECT id, title, content, source_type, file_name, file_type, 
                   chunk_count, token_count, processing_status, error_message,
                   created_at, updated_at
            FROM knowledge_documents 
            WHERE id = '3d2f647c-f474-4a64-8bce-22e470a72967'
        """))
        doc = result.fetchone()
        
        if doc:
            print("=== DOCUMENT DETAILS ===")
            print(f"ID: {doc[0]}")
            print(f"Title: {doc[1]}")
            print(f"Source Type: {doc[3]}")
            print(f"File Name: {doc[4]}")
            print(f"File Type: {doc[5]}")
            print(f"Chunk Count: {doc[6]}")
            print(f"Token Count: {doc[7]}")
            print(f"Processing Status: {doc[8]}")
            print(f"Error Message: {doc[9]}")
            print(f"Created At: {doc[10]}")
            print(f"Updated At: {doc[11]}")
            print(f"\nContent Length: {len(doc[2]) if doc[2] else 0} characters")
            if doc[2]:
                print(f"Content Preview (first 500 chars):\n{doc[2][:500]}...")
            else:
                print("Content is NULL or empty!")
            
            # Check if there are ANY embeddings for this document
            emb_check = await session.execute(text("""
                SELECT COUNT(*) FROM knowledge_embeddings 
                WHERE document_id = '3d2f647c-f474-4a64-8bce-22e470a72967'
            """))
            emb_count = emb_check.scalar()
            print(f"\n=== EMBEDDINGS STATUS ===")
            print(f"Total embeddings for this document: {emb_count}")
            
            # Check ALL embeddings in the database
            all_emb = await session.execute(text("""
                SELECT document_id, COUNT(*) as count 
                FROM knowledge_embeddings 
                GROUP BY document_id
            """))
            print(f"\n=== ALL EMBEDDINGS IN DATABASE ===")
            for row in all_emb:
                print(f"Document {row[0]}: {row[1]} embeddings")
                
            # Check if PGVector extension is enabled
            pgvector_check = await session.execute(text("""
                SELECT extname FROM pg_extension WHERE extname = 'vector'
            """))
            pgvector = pgvector_check.fetchone()
            print(f"\n=== PGVECTOR STATUS ===")
            print(f"PGVector extension installed: {'Yes' if pgvector else 'No'}")
            
            # Check the embedding table structure
            table_info = await session.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'knowledge_embeddings'
                ORDER BY ordinal_position
            """))
            print(f"\n=== EMBEDDING TABLE STRUCTURE ===")
            for col in table_info:
                print(f"{col[0]}: {col[1]}")

if __name__ == "__main__":
    asyncio.run(check_document())