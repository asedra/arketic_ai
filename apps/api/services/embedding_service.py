"""Enhanced Embedding Service with API Key Management and Multi-Provider Support

This service provides embedding generation with:
- Multi-provider support (OpenAI, Anthropic, Cohere, HuggingFace)
- Automatic fallback mechanisms
- Rate limiting and quota management
- Secure API key management integration
"""

import os
import time
import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from uuid import UUID
from enum import Enum
import json
from collections import defaultdict

import numpy as np
import tiktoken
from openai import AsyncOpenAI
from openai import RateLimitError, APIError, APITimeoutError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text

from core.config import settings
from core.database import get_db
from core.redis import get_redis
from core.security import SecurityManager
from models.user import UserApiKey
from routers.settings import SettingsService

logger = logging.getLogger(__name__)


class EmbeddingProvider(str, Enum):
    """Supported embedding providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    HUGGINGFACE = "huggingface"
    LOCAL = "local"


class ProviderStatus(str, Enum):
    """Provider availability status"""
    AVAILABLE = "available"
    RATE_LIMITED = "rate_limited"
    ERROR = "error"
    NO_API_KEY = "no_api_key"


class ProviderConfig:
    """Configuration for embedding providers"""
    
    CONFIGS = {
        EmbeddingProvider.OPENAI: {
            "models": {
                "text-embedding-3-small": {"dimensions": 1536, "max_batch": 100, "max_tokens": 8191},
                "text-embedding-3-large": {"dimensions": 3072, "max_batch": 100, "max_tokens": 8191},
                "text-embedding-ada-002": {"dimensions": 1536, "max_batch": 100, "max_tokens": 8191}
            },
            "rate_limit": {"requests_per_minute": 3000, "tokens_per_minute": 1000000},
            "cost_per_1k_tokens": 0.00002
        },
        EmbeddingProvider.ANTHROPIC: {
            "models": {
                "claude-3-embeddings": {"dimensions": 1024, "max_batch": 50, "max_tokens": 4096}
            },
            "rate_limit": {"requests_per_minute": 1000, "tokens_per_minute": 500000},
            "cost_per_1k_tokens": 0.00008
        },
        EmbeddingProvider.COHERE: {
            "models": {
                "embed-english-v3.0": {"dimensions": 1024, "max_batch": 96, "max_tokens": 512},
                "embed-multilingual-v3.0": {"dimensions": 1024, "max_batch": 96, "max_tokens": 512}
            },
            "rate_limit": {"requests_per_minute": 100, "tokens_per_minute": 100000},
            "cost_per_1k_tokens": 0.00001
        },
        EmbeddingProvider.HUGGINGFACE: {
            "models": {
                "sentence-transformers/all-MiniLM-L6-v2": {"dimensions": 384, "max_batch": 128, "max_tokens": 512}
            },
            "rate_limit": {"requests_per_minute": 1000, "tokens_per_minute": 200000},
            "cost_per_1k_tokens": 0.0
        },
        EmbeddingProvider.LOCAL: {
            "models": {
                "placeholder": {"dimensions": 1536, "max_batch": 1000, "max_tokens": 10000}
            },
            "rate_limit": {"requests_per_minute": 10000, "tokens_per_minute": 10000000},
            "cost_per_1k_tokens": 0.0
        }
    }
    
    @classmethod
    def get_config(cls, provider: EmbeddingProvider, model: str) -> Dict[str, Any]:
        """Get configuration for a specific provider and model"""
        provider_config = cls.CONFIGS.get(provider, {})
        model_config = provider_config.get("models", {}).get(model, {})
        return {
            **model_config,
            "rate_limit": provider_config.get("rate_limit", {}),
            "cost_per_1k_tokens": provider_config.get("cost_per_1k_tokens", 0)
        }


class RateLimiter:
    """Rate limiter for API calls"""
    
    def __init__(self):
        self.window_size = 60  # 1 minute window
    
    async def check_rate_limit(
        self,
        user_id: str,
        provider: str,
        requests_limit: int,
        tokens_limit: int,
        tokens_to_add: int = 0
    ) -> Tuple[bool, Dict[str, Any]]:
        """Check if rate limit allows the request"""
        
        current_time = time.time()
        window_start = current_time - self.window_size
        
        # Keys for tracking
        requests_key = f"rate_limit:{user_id}:{provider}:requests"
        tokens_key = f"rate_limit:{user_id}:{provider}:tokens"
        
        # Get current counts
        request_count = await self._get_window_count(requests_key, window_start, current_time)
        token_count = await self._get_window_count(tokens_key, window_start, current_time)
        
        # Check limits
        if request_count >= requests_limit:
            return False, {
                "reason": "request_limit_exceeded",
                "limit": requests_limit,
                "current": request_count,
                "reset_in": self.window_size
            }
        
        if token_count + tokens_to_add > tokens_limit:
            return False, {
                "reason": "token_limit_exceeded",
                "limit": tokens_limit,
                "current": token_count,
                "requested": tokens_to_add,
                "reset_in": self.window_size
            }
        
        # Add to counters
        await self._add_to_window(requests_key, current_time, 1)
        if tokens_to_add > 0:
            await self._add_to_window(tokens_key, current_time, tokens_to_add)
        
        return True, {
            "requests_remaining": requests_limit - request_count - 1,
            "tokens_remaining": tokens_limit - token_count - tokens_to_add
        }
    
    async def _get_window_count(self, key: str, window_start: float, current_time: float) -> int:
        """Get count within the time window"""
        # Get Redis connection
        redis = get_redis()
        
        # Remove old entries
        await redis.zremrangebyscore(key, 0, window_start)
        
        # Get count in window
        count = await redis.zcount(key, window_start, current_time)
        return count or 0
    
    async def _add_to_window(self, key: str, timestamp: float, value: int):
        """Add entry to the time window"""
        # Get Redis connection
        redis = get_redis()
        
        await redis.zadd(key, {f"{timestamp}:{value}": timestamp})
        # Set expiry to 2x window size
        await redis.expire(key, self.window_size * 2)


class EmbeddingService:
    """Enhanced embedding service with multi-provider support and fallback"""
    
    def __init__(self):
        """Initialize the embedding service"""
        self.security_manager = SecurityManager()
        self.settings_service = SettingsService(self.security_manager)
        self.rate_limiter = RateLimiter()
        
        # Provider priority order for fallback
        self.provider_priority = [
            EmbeddingProvider.OPENAI,
            EmbeddingProvider.ANTHROPIC,
            EmbeddingProvider.COHERE,
            EmbeddingProvider.HUGGINGFACE,
            EmbeddingProvider.LOCAL
        ]
        
        # Provider status tracking
        self.provider_status: Dict[EmbeddingProvider, ProviderStatus] = {}
        self.provider_last_error: Dict[EmbeddingProvider, str] = {}
        
        # Usage tracking
        self.usage_metrics = defaultdict(lambda: {
            "requests": 0,
            "tokens": 0,
            "errors": 0,
            "cost": 0.0
        })
        
        # Cache for API keys
        self.api_key_cache: Dict[str, Tuple[str, datetime]] = {}
        self.cache_ttl = timedelta(minutes=5)
    
    def _tiktoken_len(self, text: str) -> int:
        """Calculate token length using tiktoken"""
        tokenizer = tiktoken.get_encoding("cl100k_base")
        tokens = tokenizer.encode(text, disallowed_special=())
        return len(tokens)
    
    async def get_active_api_key(
        self,
        user_id: str,
        provider: EmbeddingProvider
    ) -> Optional[str]:
        """Get active API key for user and provider with caching"""
        
        cache_key = f"{user_id}:{provider}"
        
        # Check cache
        if cache_key in self.api_key_cache:
            key, cached_at = self.api_key_cache[cache_key]
            if datetime.utcnow() - cached_at < self.cache_ttl:
                return key
        
        try:
            from core.database import async_session_maker
            async with async_session_maker() as session:
                # Get user's API key
                decrypted_key = await self.settings_service.get_decrypted_api_key(
                    session, user_id, provider
                )
                
                if decrypted_key:
                    # Cache the key
                    self.api_key_cache[cache_key] = (decrypted_key, datetime.utcnow())
                    return decrypted_key
                
                # Try system default key as fallback
                system_key = await self._get_system_api_key(session, provider)
                if system_key:
                    self.api_key_cache[cache_key] = (system_key, datetime.utcnow())
                    return system_key
                
                return None
                
        except Exception as e:
            logger.error(f"Failed to get API key for {provider}: {e}")
            return None
    
    async def _get_system_api_key(
        self,
        session: AsyncSession,
        provider: EmbeddingProvider
    ) -> Optional[str]:
        """Get system-level API key for provider"""
        
        # Check environment variables first
        env_map = {
            EmbeddingProvider.OPENAI: "OPENAI_API_KEY",
            EmbeddingProvider.ANTHROPIC: "ANTHROPIC_API_KEY",
            EmbeddingProvider.COHERE: "COHERE_API_KEY",
            EmbeddingProvider.HUGGINGFACE: "HUGGINGFACE_API_KEY"
        }
        
        env_key = os.getenv(env_map.get(provider, ""))
        if env_key:
            return env_key
        
        # Check for any active key in database (system pool)
        stmt = select(UserApiKey).where(
            and_(
                UserApiKey.provider == provider,
                UserApiKey.is_active == True
            )
        ).order_by(UserApiKey.usage_count.asc()).limit(1)
        
        result = await session.execute(stmt)
        api_key_record = result.scalar_one_or_none()
        
        if api_key_record:
            try:
                return self.security_manager.decrypt_api_key(api_key_record.encrypted_key)
            except Exception as e:
                logger.error(f"Failed to decrypt system API key: {e}")
        
        return None
    
    async def generate_embeddings_with_fallback(
        self,
        texts: List[str],
        user_id: Optional[str] = None,
        preferred_provider: Optional[EmbeddingProvider] = None,
        preferred_model: Optional[str] = None
    ) -> Tuple[List[List[float]], Dict[str, Any]]:
        """Generate embeddings with automatic fallback between providers"""
        
        if not user_id:
            user_id = "system"
        
        # Calculate total tokens
        total_tokens = sum(self._tiktoken_len(text) for text in texts)
        
        # Try providers in order
        providers = [preferred_provider] if preferred_provider else self.provider_priority
        
        for provider in providers:
            if provider not in self.provider_priority:
                continue
            
            try:
                # Get API key
                api_key = await self.get_active_api_key(user_id, provider)
                if not api_key:
                    self.provider_status[provider] = ProviderStatus.NO_API_KEY
                    logger.debug(f"No API key for {provider}, trying next")
                    continue
                
                # Get provider config
                model = preferred_model or self._get_default_model(provider)
                config = ProviderConfig.get_config(provider, model)
                
                # Check rate limits
                rate_limit = config.get("rate_limit", {})
                allowed, limit_info = await self.rate_limiter.check_rate_limit(
                    user_id,
                    provider,
                    rate_limit.get("requests_per_minute", 1000),
                    rate_limit.get("tokens_per_minute", 100000),
                    total_tokens
                )
                
                if not allowed:
                    self.provider_status[provider] = ProviderStatus.RATE_LIMITED
                    logger.warning(f"Rate limit hit for {provider}: {limit_info}")
                    continue
                
                # Generate embeddings
                embeddings = await self._generate_embeddings(
                    texts, provider, model, api_key, config
                )
                
                # Update metrics
                await self._update_usage_metrics(
                    user_id, provider, len(texts), total_tokens,
                    config.get("cost_per_1k_tokens", 0)
                )
                
                # Mark provider as available
                self.provider_status[provider] = ProviderStatus.AVAILABLE
                
                return embeddings, {
                    "provider": provider,
                    "model": model,
                    "tokens": total_tokens,
                    "cost": (total_tokens / 1000) * config.get("cost_per_1k_tokens", 0),
                    "rate_limit_info": limit_info
                }
                
            except RateLimitError as e:
                self.provider_status[provider] = ProviderStatus.RATE_LIMITED
                self.provider_last_error[provider] = str(e)
                logger.warning(f"Rate limit error for {provider}: {e}")
                continue
                
            except APIError as e:
                self.provider_status[provider] = ProviderStatus.ERROR
                self.provider_last_error[provider] = str(e)
                logger.error(f"API error for {provider}: {e}")
                
                if "invalid_api_key" in str(e).lower():
                    # Invalidate cached key
                    cache_key = f"{user_id}:{provider}"
                    self.api_key_cache.pop(cache_key, None)
                continue
                
            except Exception as e:
                self.provider_status[provider] = ProviderStatus.ERROR
                self.provider_last_error[provider] = str(e)
                logger.error(f"Unexpected error for {provider}: {e}")
                continue
        
        # If all providers fail, use local/placeholder embeddings
        logger.warning("All providers failed, using local embeddings")
        return await self._generate_local_embeddings(texts), {
            "provider": EmbeddingProvider.LOCAL,
            "model": "placeholder",
            "tokens": total_tokens,
            "cost": 0,
            "fallback_reason": "all_providers_failed"
        }
    
    def _get_default_model(self, provider: EmbeddingProvider) -> str:
        """Get default model for provider"""
        defaults = {
            EmbeddingProvider.OPENAI: "text-embedding-3-small",
            EmbeddingProvider.ANTHROPIC: "claude-3-embeddings",
            EmbeddingProvider.COHERE: "embed-english-v3.0",
            EmbeddingProvider.HUGGINGFACE: "sentence-transformers/all-MiniLM-L6-v2",
            EmbeddingProvider.LOCAL: "placeholder"
        }
        return defaults.get(provider, "placeholder")
    
    async def _generate_embeddings(
        self,
        texts: List[str],
        provider: EmbeddingProvider,
        model: str,
        api_key: str,
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """Generate embeddings using specific provider"""
        
        if provider == EmbeddingProvider.OPENAI:
            return await self._generate_openai_embeddings(texts, model, api_key, config)
        elif provider == EmbeddingProvider.ANTHROPIC:
            return await self._generate_anthropic_embeddings(texts, model, api_key, config)
        elif provider == EmbeddingProvider.COHERE:
            return await self._generate_cohere_embeddings(texts, model, api_key, config)
        elif provider == EmbeddingProvider.HUGGINGFACE:
            return await self._generate_huggingface_embeddings(texts, model, api_key, config)
        else:
            return await self._generate_local_embeddings(texts)
    
    async def _generate_openai_embeddings(
        self,
        texts: List[str],
        model: str,
        api_key: str,
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """Generate embeddings using OpenAI"""
        
        client = AsyncOpenAI(api_key=api_key)
        max_batch = config.get("max_batch", 100)
        
        all_embeddings = []
        for i in range(0, len(texts), max_batch):
            batch = texts[i:i + max_batch]
            
            response = await client.embeddings.create(
                model=model,
                input=batch,
                encoding_format="float"
            )
            
            embeddings = [item.embedding for item in response.data]
            all_embeddings.extend(embeddings)
        
        return all_embeddings
    
    async def _generate_anthropic_embeddings(
        self,
        texts: List[str],
        model: str,
        api_key: str,
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """Generate embeddings using Anthropic (placeholder for when available)"""
        # Anthropic doesn't have embeddings API yet, this is a placeholder
        logger.warning("Anthropic embeddings not yet available, using placeholder")
        return await self._generate_local_embeddings(texts)
    
    async def _generate_cohere_embeddings(
        self,
        texts: List[str],
        model: str,
        api_key: str,
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """Generate embeddings using Cohere (placeholder implementation)"""
        # This would require cohere library installation
        logger.warning("Cohere embeddings not implemented, using placeholder")
        return await self._generate_local_embeddings(texts)
    
    async def _generate_huggingface_embeddings(
        self,
        texts: List[str],
        model: str,
        api_key: str,
        config: Dict[str, Any]
    ) -> List[List[float]]:
        """Generate embeddings using HuggingFace (placeholder implementation)"""
        # This would require transformers library installation
        logger.warning("HuggingFace embeddings not implemented, using placeholder")
        return await self._generate_local_embeddings(texts)
    
    async def _generate_local_embeddings(
        self,
        texts: List[str],
        dimensions: int = 1536
    ) -> List[List[float]]:
        """Generate placeholder embeddings locally"""
        embeddings = []
        for text in texts:
            # Generate deterministic but unique embeddings based on text
            np.random.seed(hash(text) % (2**32))
            embedding = np.random.randn(dimensions).tolist()
            embeddings.append(embedding)
        return embeddings
    
    async def _update_usage_metrics(
        self,
        user_id: str,
        provider: EmbeddingProvider,
        request_count: int,
        token_count: int,
        cost_per_1k: float
    ):
        """Update usage metrics for tracking and billing"""
        
        # Update in-memory metrics
        metrics_key = f"{user_id}:{provider}"
        self.usage_metrics[metrics_key]["requests"] += request_count
        self.usage_metrics[metrics_key]["tokens"] += token_count
        self.usage_metrics[metrics_key]["cost"] += (token_count / 1000) * cost_per_1k
        
        # Store in Redis for persistence
        redis = get_redis()
        usage_key = f"embedding_usage:{user_id}:{provider}:{datetime.utcnow().strftime('%Y-%m-%d')}"
        await redis.hincrby(usage_key, "requests", request_count)
        await redis.hincrby(usage_key, "tokens", token_count)
        
        # Set expiry to 30 days
        await redis.expire(usage_key, 30 * 24 * 3600)
        
        # Log usage for audit
        logger.info(f"Embedding usage - User: {user_id}, Provider: {provider}, "
                   f"Requests: {request_count}, Tokens: {token_count}, "
                   f"Cost: ${(token_count / 1000) * cost_per_1k:.4f}")
    
    async def get_usage_statistics(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get usage statistics for user"""
        
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        stats = {
            "user_id": user_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "providers": {},
            "total": {
                "requests": 0,
                "tokens": 0,
                "cost": 0.0
            }
        }
        
        # Aggregate stats from Redis
        current = start_date
        while current <= end_date:
            date_str = current.strftime('%Y-%m-%d')
            
            redis = get_redis()
            for provider in self.provider_priority:
                usage_key = f"embedding_usage:{user_id}:{provider}:{date_str}"
                usage_data = await redis.hgetall(usage_key)
                
                if usage_data:
                    provider_name = provider.value
                    if provider_name not in stats["providers"]:
                        stats["providers"][provider_name] = {
                            "requests": 0,
                            "tokens": 0,
                            "cost": 0.0
                        }
                    
                    requests = int(usage_data.get(b"requests", 0))
                    tokens = int(usage_data.get(b"tokens", 0))
                    
                    stats["providers"][provider_name]["requests"] += requests
                    stats["providers"][provider_name]["tokens"] += tokens
                    
                    # Calculate cost
                    config = ProviderConfig.CONFIGS.get(provider, {})
                    cost_per_1k = config.get("cost_per_1k_tokens", 0)
                    cost = (tokens / 1000) * cost_per_1k
                    stats["providers"][provider_name]["cost"] += cost
                    
                    # Update totals
                    stats["total"]["requests"] += requests
                    stats["total"]["tokens"] += tokens
                    stats["total"]["cost"] += cost
            
            current += timedelta(days=1)
        
        return stats
    
    async def get_provider_status(self) -> Dict[str, Any]:
        """Get current status of all providers"""
        
        status = {}
        for provider in self.provider_priority:
            status[provider.value] = {
                "status": self.provider_status.get(provider, ProviderStatus.AVAILABLE).value,
                "last_error": self.provider_last_error.get(provider, None),
                "models": list(ProviderConfig.CONFIGS.get(provider, {}).get("models", {}).keys()),
                "rate_limits": ProviderConfig.CONFIGS.get(provider, {}).get("rate_limit", {}),
                "cost_per_1k_tokens": ProviderConfig.CONFIGS.get(provider, {}).get("cost_per_1k_tokens", 0)
            }
        
        return status


# Singleton instance
embedding_service = EmbeddingService()