"""
Database configuration and connection management
Supports SQLite for development and PostgreSQL for production
"""

import asyncio
import logging
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager

from sqlalchemy import create_engine, MetaData, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from .config import settings

logger = logging.getLogger(__name__)

# Database base class
Base = declarative_base()

# Global engine and session maker
engine: Optional[create_async_engine] = None
async_session_maker: Optional[async_sessionmaker] = None


def create_database_url():
    """Create database URL based on configuration"""
    db_url = settings.DATABASE_URL
    
    # Convert SQLite URL for async if needed
    if db_url.startswith("sqlite:///"):
        db_url = db_url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    return db_url


async def init_database():
    """Initialize database connection and create tables"""
    global engine, async_session_maker
    
    db_url = create_database_url()
    logger.info(f"Initializing database connection: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    
    # Create async engine
    if "sqlite" in db_url:
        # SQLite specific configuration
        engine = create_async_engine(
            db_url,
            echo=settings.is_development,
            poolclass=StaticPool,
            connect_args={
                "check_same_thread": False,
            },
        )
    else:
        # PostgreSQL configuration with connection pool optimization
        engine = create_async_engine(
            db_url,
            echo=settings.is_development,
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
            pool_recycle=3600,  # Recycle connections every hour
            pool_timeout=30,    # Timeout for getting connection from pool
            connect_args={
                "server_settings": {
                    "application_name": "arketic_chat_api",
                    "jit": "off",  # Disable JIT for faster connection
                }
            }
        )
    
    # Create session maker with optimized settings
    async_session_maker = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,  # Disable auto-flush to prevent premature constraint checks
        autocommit=False,  # Explicit commit required
    )
    
    # Create tables (with checkfirst to avoid recreating existing tables)
    try:
        async with engine.begin() as conn:
            # Use checkfirst=True to skip existing tables
            await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=True))
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


async def close_database():
    """Close database connections"""
    global engine
    
    if engine:
        await engine.dispose()
        logger.info("Database connections closed")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session dependency with improved error handling"""
    if not async_session_maker:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    session = None
    try:
        session = async_session_maker()
        yield session
    except Exception as e:
        logger.error(f"Database session error: {e}")
        if session:
            await session.rollback()
        raise
    finally:
        if session:
            await session.close()


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Get database session context manager with auto-commit"""
    if not async_session_maker:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    session = None
    try:
        session = async_session_maker()
        yield session
        await session.commit()
        logger.debug("Database session committed successfully")
    except Exception as e:
        logger.error(f"Database session error, rolling back: {e}")
        if session:
            try:
                await session.rollback()
            except Exception as rollback_error:
                logger.error(f"Error during rollback: {rollback_error}")
        raise
    finally:
        if session:
            try:
                await session.close()
            except Exception as close_error:
                logger.error(f"Error closing session: {close_error}")


# Health check function
async def check_database_health() -> dict:
    """Check database connection health"""
    if not engine:
        return {"status": "error", "message": "Database not initialized"}
    
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "message": "Database connection OK"}
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}


# Transaction decorator
def transactional(func):
    """Decorator for transactional database operations"""
    async def wrapper(*args, **kwargs):
        async with get_db_session() as session:
            kwargs['session'] = session
            return await func(*args, **kwargs)
    return wrapper


# Utility functions
async def execute_sql(query: str, params: dict = None):
    """Execute raw SQL query"""
    if not engine:
        raise RuntimeError("Database not initialized")
    
    async with engine.begin() as conn:
        result = await conn.execute(query, params or {})
        return result


async def reset_database():
    """Reset database (development only)"""
    if settings.is_production:
        raise RuntimeError("Cannot reset database in production")
    
    if not engine:
        raise RuntimeError("Database not initialized")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, checkfirst=False))
    
    logger.info("Database reset completed")


# Export all necessary components
__all__ = [
    "Base",
    "init_database",
    "close_database",
    "get_db",
    "get_db_session",
    "check_database_health",
    "transactional",
    "execute_sql",
    "reset_database",
]