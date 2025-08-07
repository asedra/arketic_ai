# apps/api/services/langchain_client.py
import httpx
import asyncio
import os
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Circuit breaker pattern implementation for service resilience"""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def is_open(self) -> bool:
        """Check if circuit breaker is open (blocking requests)"""
        if self.state == "OPEN":
            if self.last_failure_time and \
               datetime.now() - self.last_failure_time > timedelta(seconds=self.timeout):
                self.state = "HALF_OPEN"
                return False
            return True
        return False
    
    def record_success(self):
        """Record successful request - reset failure count and close circuit"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def record_failure(self):
        """Record failed request - increment failure count and potentially open circuit"""
        self.failure_count += 1
        self.last_failure_time = datetime.now()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


class LangChainServiceClient:
    """
    Client for communicating with LangChain microservice
    
    Provides circuit breaker pattern for resilient AI service integration.
    All OpenAI communication is handled through LangChain service only.
    """
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv("LANGCHAIN_SERVICE_URL", "http://langchain:3001")
        self.client = httpx.AsyncClient(timeout=30.0)
        self.circuit_breaker = CircuitBreaker()
        
    async def send_message(
        self, 
        chat_id: str, 
        message: str, 
        user_id: str, 
        api_key: str, 
        settings: Dict[str, Any],
        auth_token: str = ""
    ) -> Dict[str, Any]:
        """
        Send message to LangChain service with circuit breaker
        
        Args:
            chat_id: Chat identifier
            message: User message content
            user_id: User identifier
            api_key: OpenAI API key
            settings: Chat configuration (model, temperature, etc.)
            
        Returns:
            Dict containing AI response or fallback response
        """
        
        if self.circuit_breaker.is_open():
            logger.error("Circuit breaker is open, LangChain service unavailable")
            raise Exception("LangChain service temporarily unavailable")
        
        try:
            response = await self.client.post(
                f"{self.base_url}/internal/chat/message",
                json={
                    "message": message,
                    "chatId": chat_id,
                    "settings": {
                        "provider": settings.get("provider", "openai"),
                        "model": settings.get("model", "gpt-3.5-turbo"),
                        "temperature": settings.get("temperature", 0.7),
                        "maxTokens": settings.get("maxTokens", 2048),
                        "streaming": False
                    }
                },
                headers={
                    "x-internal-api-key": os.getenv("LANGCHAIN_INTERNAL_API_KEY", "dev_internal_api_key_change_in_production"),
                    "x-user-id": user_id,
                    "x-api-key": api_key,
                    "Content-Type": "application/json"
                }
            )
            
            response.raise_for_status()
            self.circuit_breaker.record_success()
            
            result = response.json()
            logger.info(f"LangChain service responded for chat {chat_id}")
            return result
            
        except httpx.HTTPError as e:
            logger.error(f"LangChain service error: {e}")
            self.circuit_breaker.record_failure()
            
            if self.circuit_breaker.is_open():
                raise Exception("LangChain service temporarily unavailable")
            
            raise
    
    async def send_streaming_message(
        self, 
        chat_id: str, 
        message: str, 
        user_id: str, 
        api_key: str, 
        settings: Dict[str, Any],
        auth_token: str = ""
    ):
        """
        Send message to LangChain service for streaming response
        
        Yields response chunks for real-time streaming
        """
        
        if self.circuit_breaker.is_open():
            logger.error("Circuit breaker is open, LangChain service unavailable")
            raise Exception("LangChain service temporarily unavailable")
        
        try:
            async with self.client.stream(
                'POST',
                f"{self.base_url}/internal/chat/message",
                json={
                    "message": message,
                    "chatId": chat_id,
                    "settings": {
                        "provider": settings.get("provider", "openai"),
                        "model": settings.get("model", "gpt-3.5-turbo"),
                        "temperature": settings.get("temperature", 0.7),
                        "maxTokens": settings.get("maxTokens", 2048),
                        "streaming": True
                    }
                },
                headers={
                    "x-internal-api-key": os.getenv("LANGCHAIN_INTERNAL_API_KEY", "dev_internal_api_key_change_in_production"),
                    "x-user-id": user_id,
                    "x-api-key": api_key,
                    "Content-Type": "application/json"
                }
            ) as response:
                response.raise_for_status()
                self.circuit_breaker.record_success()
                
                async for line in response.aiter_lines():
                    if line.startswith('data: '):
                        chunk_data = line[6:]  # Remove 'data: ' prefix
                        if chunk_data.strip() == '[DONE]':
                            break
                        try:
                            import json
                            chunk_json = json.loads(chunk_data)
                            if 'content' in chunk_json:
                                yield chunk_json['content']
                        except json.JSONDecodeError:
                            continue
                            
        except httpx.HTTPError as e:
            logger.error(f"LangChain streaming error: {e}")
            self.circuit_breaker.record_failure()
            
            if self.circuit_breaker.is_open():
                raise Exception("LangChain service temporarily unavailable")
            else:
                raise
    
    
    
    async def test_connection(self) -> bool:
        """Test LangChain service connectivity"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            return response.status_code == 200
        except:
            return False
    
    async def get_service_health(self) -> Dict[str, Any]:
        """Get detailed service health information"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                return {
                    "status": "healthy",
                    "response_time_ms": response.elapsed.total_seconds() * 1000,
                    "circuit_breaker_state": self.circuit_breaker.state,
                    "failure_count": self.circuit_breaker.failure_count,
                    "service_url": self.base_url
                }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
        
        return {
            "status": "unhealthy", 
            "circuit_breaker_state": self.circuit_breaker.state,
            "failure_count": self.circuit_breaker.failure_count,
            "service_url": self.base_url,
            "error": "Service unavailable"
        }
    
    def _get_internal_service_token(self) -> str:
        """
        Get internal service authentication token
        
        In production, this should generate or retrieve a proper JWT token
        for service-to-service authentication
        """
        # For now, return a placeholder token
        # In production, implement proper JWT token generation
        return os.getenv("LANGCHAIN_SERVICE_TOKEN", "internal-service-token")
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    def get_circuit_breaker_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics"""
        return {
            "state": self.circuit_breaker.state,
            "failure_count": self.circuit_breaker.failure_count,
            "failure_threshold": self.circuit_breaker.failure_threshold,
            "timeout_seconds": self.circuit_breaker.timeout,
            "last_failure_time": self.circuit_breaker.last_failure_time.isoformat() if self.circuit_breaker.last_failure_time else None
        }


# Global client instance
_langchain_client = None

def get_langchain_client() -> LangChainServiceClient:
    """Get singleton LangChain service client"""
    global _langchain_client
    if _langchain_client is None:
        _langchain_client = LangChainServiceClient()
    return _langchain_client

async def cleanup_langchain_client():
    """Cleanup global client on application shutdown"""
    global _langchain_client
    if _langchain_client:
        await _langchain_client.close()
        _langchain_client = None