#!/usr/bin/env python3
"""Check database for document and embeddings"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

async def check_data():
    # Use asyncpg URL
    DATABASE_URL = "postgresql+asyncpg://arketic:arketic_dev_password@localhost:5432/arketic_dev"
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        # Check if document exists
        result = await session.execute(text("""
            SELECT id, title, processing_status, chunk_count 
            FROM knowledge_documents 
            WHERE id = '3d2f647c-f474-4a64-8bce-22e470a72967'
        """))
        doc = result.fetchone()
        
        if doc:
            print(f'Document found: ID={doc[0]}, Title={doc[1]}, Status={doc[2]}, Chunks={doc[3]}')
            
            # Check embeddings for this document
            emb_result = await session.execute(text("""
                SELECT COUNT(*) as count, 
                       MIN(chunk_index) as min_idx, 
                       MAX(chunk_index) as max_idx
                FROM knowledge_embeddings 
                WHERE document_id = '3d2f647c-f474-4a64-8bce-22e470a72967'
            """))
            emb = emb_result.fetchone()
            print(f'Embeddings: Count={emb[0]}, MinIndex={emb[1]}, MaxIndex={emb[2]}')
            
            # Check embedding content sample with "ali" search
            sample_result = await session.execute(text("""
                SELECT chunk_index, content, 
                       CASE 
                           WHEN embedding IS NULL THEN 'NULL'
                           ELSE 'EXISTS'
                       END as embedding_status
                FROM knowledge_embeddings 
                WHERE document_id = '3d2f647c-f474-4a64-8bce-22e470a72967'
                  AND LOWER(content) LIKE '%ali%'
                LIMIT 5
            """))
            
            rows = sample_result.fetchall()
            if rows:
                print('\nChunks containing "ali":')
                for row in rows:
                    print(f'  Chunk {row[0]}: {row[1][:100]}... - Embedding: {row[2]}')
            else:
                print('\nNo chunks containing "ali" found in this document')
                
                # Check all content
                all_content = await session.execute(text("""
                    SELECT chunk_index, SUBSTRING(content, 1, 100) as content_preview
                    FROM knowledge_embeddings 
                    WHERE document_id = '3d2f647c-f474-4a64-8bce-22e470a72967'
                    ORDER BY chunk_index
                    LIMIT 5
                """))
                print('\nFirst 5 chunks:')
                for row in all_content:
                    print(f'  Chunk {row[0]}: {row[1]}...')
                    
        else:
            print('Document not found with ID: 3d2f647c-f474-4a64-8bce-22e470a72967')
            
            # List all documents
            all_docs = await session.execute(text("""
                SELECT id, title, processing_status, chunk_count
                FROM knowledge_documents 
                ORDER BY created_at DESC
                LIMIT 10
            """))
            print('\nAvailable documents:')
            for doc in all_docs:
                print(f'  ID: {doc[0]}, Title: {doc[1]}, Status: {doc[2]}, Chunks: {doc[3]}')
                
        # Check if any embeddings exist for any document containing "ali"
        any_ali = await session.execute(text("""
            SELECT kd.id, kd.title, COUNT(ke.id) as match_count
            FROM knowledge_documents kd
            LEFT JOIN knowledge_embeddings ke ON kd.id = ke.document_id
            WHERE LOWER(ke.content) LIKE '%ali%'
            GROUP BY kd.id, kd.title
            LIMIT 5
        """))
        
        ali_docs = any_ali.fetchall()
        if ali_docs:
            print('\nDocuments with "ali" in content:')
            for doc in ali_docs:
                print(f'  Doc ID: {doc[0]}, Title: {doc[1]}, Matching chunks: {doc[2]}')
        else:
            print('\nNo documents found with "ali" in their content')

if __name__ == "__main__":
    asyncio.run(check_data())