#!/usr/bin/env python3
"""
Debug script to check chat knowledge base configuration
"""

import asyncio
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
import json
from uuid import UUID

# Database configuration
DATABASE_URL = "postgresql+asyncpg://arketic:arketic_dev_password@localhost:5432/arketic_dev"

async def check_chat_knowledge(chat_id: str):
    """Check knowledge base configuration for a specific chat"""
    
    # Create database engine
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Query to get chat details with knowledge fields
            query = text("""
                SELECT 
                    c.id,
                    c.title,
                    c.assistant_id,
                    c.assistant_knowledge_bases,
                    c.assistant_documents,
                    c.system_prompt,
                    c.ai_model,
                    a.name as assistant_name,
                    a.system_prompt as assistant_system_prompt
                FROM chats c
                LEFT JOIN assistants a ON c.assistant_id = a.id
                WHERE c.id = :chat_id
            """)
            
            result = await session.execute(query, {"chat_id": chat_id})
            chat = result.fetchone()
            
            if not chat:
                print(f"Chat {chat_id} not found")
                return
            
            print("\n" + "="*60)
            print(f"CHAT DETAILS: {chat_id}")
            print("="*60)
            print(f"Title: {chat.title}")
            print(f"Assistant ID: {chat.assistant_id}")
            print(f"Assistant Name: {chat.assistant_name}")
            print(f"AI Model: {chat.ai_model}")
            print(f"\nSystem Prompt (Chat): {chat.system_prompt[:100] if chat.system_prompt else 'None'}...")
            print(f"System Prompt (Assistant): {chat.assistant_system_prompt[:100] if chat.assistant_system_prompt else 'None'}...")
            print(f"\nKnowledge Base IDs: {chat.assistant_knowledge_bases}")
            print(f"Document IDs: {chat.assistant_documents}")
            
            # If there's an assistant, check its knowledge bases
            if chat.assistant_id:
                kb_query = text("""
                    SELECT 
                        akb.knowledge_base_id,
                        kb.name as kb_name,
                        kb.description as kb_description
                    FROM assistant_knowledge_bases akb
                    JOIN knowledge_bases kb ON akb.knowledge_base_id = kb.id
                    WHERE akb.assistant_id = :assistant_id
                """)
                
                kb_result = await session.execute(kb_query, {"assistant_id": str(chat.assistant_id)})
                knowledge_bases = kb_result.fetchall()
                
                print(f"\n--- Assistant's Knowledge Bases ---")
                if knowledge_bases:
                    for kb in knowledge_bases:
                        print(f"  - {kb.knowledge_base_id}: {kb.kb_name}")
                        print(f"    Description: {kb.kb_description[:50] if kb.kb_description else 'None'}...")
                else:
                    print("  No knowledge bases attached to assistant")
                
                # Check documents
                doc_query = text("""
                    SELECT 
                        ad.document_id,
                        kd.title as doc_title,
                        kd.knowledge_base_id
                    FROM assistant_documents ad
                    JOIN knowledge_documents kd ON ad.document_id = kd.id
                    WHERE ad.assistant_id = :assistant_id
                """)
                
                doc_result = await session.execute(doc_query, {"assistant_id": str(chat.assistant_id)})
                documents = doc_result.fetchall()
                
                print(f"\n--- Assistant's Documents ---")
                if documents:
                    for doc in documents:
                        print(f"  - {doc.document_id}: {doc.doc_title}")
                        print(f"    Knowledge Base: {doc.knowledge_base_id}")
                else:
                    print("  No documents attached to assistant")
            
            print("\n" + "="*60)
            
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await engine.dispose()

async def list_recent_chats():
    """List recent chats to help select one for debugging"""
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            query = text("""
                SELECT 
                    c.id,
                    c.title,
                    c.created_at,
                    c.assistant_id,
                    a.name as assistant_name
                FROM chats c
                LEFT JOIN assistants a ON c.assistant_id = a.id
                ORDER BY c.created_at DESC
                LIMIT 10
            """)
            
            result = await session.execute(query)
            chats = result.fetchall()
            
            print("\n" + "="*60)
            print("RECENT CHATS")
            print("="*60)
            
            for chat in chats:
                assistant_info = f" (Assistant: {chat.assistant_name})" if chat.assistant_name else ""
                print(f"{chat.id}: {chat.title}{assistant_info}")
                print(f"  Created: {chat.created_at}")
            
            print("="*60)
            
        finally:
            await engine.dispose()

async def main():
    if len(sys.argv) > 1:
        chat_id = sys.argv[1]
        await check_chat_knowledge(chat_id)
    else:
        await list_recent_chats()
        print("\nUsage: python debug_chat_knowledge.py <chat_id>")
        print("Example: python debug_chat_knowledge.py 3572a6a6-4da5-4bb5-a9ce-1f2c3b963afa")

if __name__ == "__main__":
    asyncio.run(main())