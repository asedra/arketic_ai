"""
Redis configuration and connection management
Provides connection pooling and utility functions for caching
"""

import asyncio
import logging
import json
from typing import Optional, Any, Dict, List, Union
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from redis.asyncio import Redis

from .config import settings

logger = logging.getLogger(__name__)

# Global Redis connection pool
redis_pool: Optional[Redis] = None


async def init_redis():
    """Initialize Redis connection pool"""
    global redis_pool
    
    if redis_pool is None:
        try:
            logger.info(f"Initializing Redis connection: {settings.REDIS_URL}")
            
            redis_pool = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                max_connections=20
            )
            
            # Test connection
            await redis_pool.ping()
            logger.info("Redis connection established successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            redis_pool = None
            raise


async def close_redis():
    """Close Redis connection pool"""
    global redis_pool
    
    if redis_pool:
        await redis_pool.close()
        redis_pool = None
        logger.info("Redis connection closed")


def get_redis() -> Redis:
    """Get Redis connection instance"""
    if redis_pool is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    return redis_pool


@asynccontextmanager
async def get_redis_connection():
    """Get Redis connection context manager"""
    if redis_pool is None:
        raise RuntimeError("Redis not initialized. Call init_redis() first.")
    
    try:
        yield redis_pool
    except Exception as e:
        logger.error(f"Redis operation failed: {e}")
        raise


# Cache utilities
class RedisCache:
    """Redis-based caching utility"""
    
    def __init__(self, default_ttl: int = 3600):
        self.default_ttl = default_ttl
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            redis = get_redis()
            value = await redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Failed to get cache key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        try:
            redis = get_redis()
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)
            await redis.setex(key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Failed to set cache key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            redis = get_redis()
            result = await redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Failed to delete cache key {key}: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            redis = get_redis()
            result = await redis.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Failed to check cache key {key}: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment counter in cache"""
        try:
            redis = get_redis()
            result = await redis.incrby(key, amount)
            return result
        except Exception as e:
            logger.error(f"Failed to increment cache key {key}: {e}")
            return None
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration for key"""
        try:
            redis = get_redis()
            result = await redis.expire(key, ttl)
            return result
        except Exception as e:
            logger.error(f"Failed to set expiration for key {key}: {e}")
            return False
    
    async def get_keys(self, pattern: str = "*") -> List[str]:
        """Get keys matching pattern"""
        try:
            redis = get_redis()
            keys = await redis.keys(pattern)
            return keys
        except Exception as e:
            logger.error(f"Failed to get keys with pattern {pattern}: {e}")
            return []
    
    async def flush_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            redis = get_redis()
            keys = await redis.keys(pattern)
            if keys:
                result = await redis.delete(*keys)
                return result
            return 0
        except Exception as e:
            logger.error(f"Failed to flush keys with pattern {pattern}: {e}")
            return 0
    
    async def get_info(self) -> Dict[str, Any]:
        """Get Redis info"""
        try:
            redis = get_redis()
            info = await redis.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory_human": info.get("used_memory_human", "unknown"),
                "used_memory": info.get("used_memory", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "uptime_in_seconds": info.get("uptime_in_seconds", 0)
            }
        except Exception as e:
            logger.error(f"Failed to get Redis info: {e}")
            return {}


# Rate limiting utilities
class RedisRateLimiter:
    """Redis-based rate limiter"""
    
    def __init__(self, window_size: int = 60):
        self.window_size = window_size
    
    async def is_allowed(self, key: str, limit: int) -> tuple[bool, int, int]:
        """
        Check if request is allowed under rate limit
        Returns: (is_allowed, current_count, remaining_requests)
        """
        try:
            redis = get_redis()
            
            # Use sliding window counter
            current_time = int(asyncio.get_event_loop().time())
            window_start = current_time - self.window_size
            
            # Remove old entries
            await redis.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_count = await redis.zcard(key)
            
            if current_count < limit:
                # Add current request
                await redis.zadd(key, {str(current_time): current_time})
                await redis.expire(key, self.window_size)
                return True, current_count + 1, limit - current_count - 1
            else:
                return False, current_count, 0
                
        except Exception as e:
            logger.error(f"Rate limiter error for key {key}: {e}")
            # Allow request on error to avoid blocking
            return True, 0, limit


# Session management
class RedisSessionManager:
    """Redis-based session management"""
    
    def __init__(self, session_ttl: int = 3600):
        self.session_ttl = session_ttl
        self.prefix = "session:"
    
    async def create_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Create new session"""
        try:
            redis = get_redis()
            key = f"{self.prefix}{session_id}"
            serialized_data = json.dumps(data, default=str)
            await redis.setex(key, self.session_ttl, serialized_data)
            return True
        except Exception as e:
            logger.error(f"Failed to create session {session_id}: {e}")
            return False
    
    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data"""
        try:
            redis = get_redis()
            key = f"{self.prefix}{session_id}"
            data = await redis.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            logger.error(f"Failed to get session {session_id}: {e}")
            return None
    
    async def update_session(self, session_id: str, data: Dict[str, Any]) -> bool:
        """Update session data"""
        try:
            redis = get_redis()
            key = f"{self.prefix}{session_id}"
            serialized_data = json.dumps(data, default=str)
            await redis.setex(key, self.session_ttl, serialized_data)
            return True
        except Exception as e:
            logger.error(f"Failed to update session {session_id}: {e}")
            return False
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session"""
        try:
            redis = get_redis()
            key = f"{self.prefix}{session_id}"
            result = await redis.delete(key)
            return result > 0
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False
    
    async def extend_session(self, session_id: str) -> bool:
        """Extend session TTL"""
        try:
            redis = get_redis()
            key = f"{self.prefix}{session_id}"
            result = await redis.expire(key, self.session_ttl)
            return result
        except Exception as e:
            logger.error(f"Failed to extend session {session_id}: {e}")
            return False


# Global instances
cache = RedisCache(default_ttl=settings.RESPONSE_CACHE_TTL)
rate_limiter = RedisRateLimiter()
session_manager = RedisSessionManager()


# Health check function
async def check_redis_health() -> Dict[str, Any]:
    """Check Redis connection health"""
    if redis_pool is None:
        return {"status": "error", "message": "Redis not initialized"}
    
    try:
        await redis_pool.ping()
        info = await cache.get_info()
        return {
            "status": "healthy",
            "message": "Redis connection OK",
            "info": info
        }
    except Exception as e:
        return {"status": "error", "message": f"Redis connection failed: {str(e)}"}


# Export all necessary components
__all__ = [
    "init_redis",
    "close_redis",
    "get_redis",
    "get_redis_connection",
    "RedisCache",
    "RedisRateLimiter",
    "RedisSessionManager",
    "cache",
    "rate_limiter",
    "session_manager",
    "check_redis_health",
]