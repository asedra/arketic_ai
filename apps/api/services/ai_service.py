"""
AI Service for integrating with various AI providers
Supports OpenAI, Anthropic, Groq, and other providers
"""

import asyncio
import logging
import time
from typing import Dict, List, Optional, Any, AsyncGenerator
from datetime import datetime
import json

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
import httpx

from core.config import settings
from core.monitoring import log_api_usage, performance_monitor

logger = logging.getLogger(__name__)


class AIServiceError(Exception):
    """Base exception for AI service errors"""
    pass


class AIProvider:
    """Base class for AI providers"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = None
    
    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Generate AI response"""
        raise NotImplementedError
    
    async def generate_streaming_response(self, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[str, None]:
        """Generate streaming AI response"""
        raise NotImplementedError
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate API cost"""
        return 0.0


class OpenAIProvider(AIProvider):
    """OpenAI API provider"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = AsyncOpenAI(api_key=api_key)
        
        # Pricing per 1K tokens (approximate)
        self.pricing = {
            "gpt-4o": {"input": 0.005, "output": 0.015},
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
        }
    
    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Generate OpenAI response"""
        try:
            start_time = time.time()
            
            model = kwargs.get("model", "gpt-3.5-turbo")
            temperature = kwargs.get("temperature", 0.7)
            max_tokens = kwargs.get("max_tokens", 2048)
            
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            duration = time.time() - start_time
            
            # Extract usage information
            usage = response.usage
            input_tokens = usage.prompt_tokens if usage else 0
            output_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0
            
            # Calculate cost
            cost = self.calculate_cost(model, input_tokens, output_tokens)
            
            # Log usage
            log_api_usage(
                provider="openai",
                model=model,
                tokens_used={"input": input_tokens, "output": output_tokens, "total": total_tokens},
                cost=cost,
                duration=duration
            )
            
            return {
                "content": response.choices[0].message.content,
                "model": model,
                "tokens_used": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost": cost,
                "duration": duration,
                "finish_reason": response.choices[0].finish_reason
            }
            
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise AIServiceError(f"OpenAI API error: {str(e)}")
    
    async def generate_streaming_response(self, messages: List[Dict[str, str]], **kwargs) -> AsyncGenerator[str, None]:
        """Generate streaming OpenAI response with improved error handling"""
        start_time = time.time()
        model = kwargs.get("model", "gpt-3.5-turbo")
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 2048)
        
        try:
            stream = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            
            chunk_count = 0
            async for chunk in stream:
                try:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            chunk_count += 1
                            yield delta.content
                except Exception as chunk_error:
                    logger.warning(f"Error processing chunk {chunk_count}: {chunk_error}")
                    continue
            
            # Log successful streaming completion
            duration = time.time() - start_time
            logger.info(f"OpenAI streaming completed: {chunk_count} chunks in {duration:.2f}s")
                    
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"OpenAI streaming error after {duration:.2f}s: {e}")
            
            # Provide more specific error messages
            error_msg = str(e).lower()
            if "api key" in error_msg or "unauthorized" in error_msg:
                raise AIServiceError("Invalid API key. Please check your OpenAI API key configuration.")
            elif "rate limit" in error_msg or "429" in error_msg:
                raise AIServiceError("Rate limit exceeded. Please try again in a moment.")
            elif "insufficient" in error_msg and "quota" in error_msg:
                raise AIServiceError("Insufficient API quota. Please check your OpenAI account billing.")
            elif "timeout" in error_msg:
                raise AIServiceError("Request timed out. Please try again.")
            else:
                raise AIServiceError(f"OpenAI API error: {str(e)}")
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate OpenAI API cost with fallback pricing"""
        # Use specific model pricing if available, otherwise use default
        pricing = self.pricing.get(model, self.pricing.get("gpt-3.5-turbo", {"input": 0.002, "output": 0.002}))
        
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        
        total_cost = input_cost + output_cost
        
        # Log cost calculation for monitoring
        logger.debug(f"Cost calculation for {model}: {input_tokens} input + {output_tokens} output = ${total_cost:.6f}")
        
        return total_cost


class AnthropicProvider(AIProvider):
    """Anthropic Claude API provider"""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.client = AsyncAnthropic(api_key=api_key)
        
        # Pricing per 1K tokens (approximate)
        self.pricing = {
            "claude-3-5-sonnet-20241022": {"input": 0.003, "output": 0.015},
            "claude-3-haiku-20240307": {"input": 0.00025, "output": 0.00125},
        }
    
    async def generate_response(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Generate Anthropic response"""
        try:
            start_time = time.time()
            
            model = kwargs.get("model", "claude-3-haiku-20240307")
            temperature = kwargs.get("temperature", 0.7)
            max_tokens = kwargs.get("max_tokens", 2048)
            
            # Convert messages format for Anthropic
            anthropic_messages = []
            system_message = None
            
            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    anthropic_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
            
            response = await self.client.messages.create(
                model=model,
                messages=anthropic_messages,
                system=system_message,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            duration = time.time() - start_time
            
            # Extract usage information
            input_tokens = response.usage.input_tokens if response.usage else 0
            output_tokens = response.usage.output_tokens if response.usage else 0
            total_tokens = input_tokens + output_tokens
            
            # Calculate cost
            cost = self.calculate_cost(model, input_tokens, output_tokens)
            
            # Log usage
            log_api_usage(
                provider="anthropic",
                model=model,
                tokens_used={"input": input_tokens, "output": output_tokens, "total": total_tokens},
                cost=cost,
                duration=duration
            )
            
            return {
                "content": response.content[0].text,
                "model": model,
                "tokens_used": total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cost": cost,
                "duration": duration,
                "finish_reason": response.stop_reason
            }
            
        except Exception as e:
            logger.error(f"Anthropic API error: {e}")
            raise AIServiceError(f"Anthropic API error: {str(e)}")
    
    def calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate Anthropic API cost"""
        if model not in self.pricing:
            return 0.0
        
        pricing = self.pricing[model]
        input_cost = (input_tokens / 1000) * pricing["input"]
        output_cost = (output_tokens / 1000) * pricing["output"]
        
        return input_cost + output_cost


class AIService:
    """Main AI service class"""
    
    def __init__(self):
        self.providers: Dict[str, AIProvider] = {}
        self._initialize_providers()
    
    def _initialize_providers(self):
        """Initialize available AI providers"""
        if settings.OPENAI_API_KEY:
            self.providers["openai"] = OpenAIProvider(settings.OPENAI_API_KEY)
            logger.info("OpenAI provider initialized")
        
        if settings.ANTHROPIC_API_KEY:
            self.providers["anthropic"] = AnthropicProvider(settings.ANTHROPIC_API_KEY)
            logger.info("Anthropic provider initialized")
        
        if not self.providers:
            logger.warning("No AI providers configured")
    
    def get_provider(self, provider_name: str) -> Optional[AIProvider]:
        """Get AI provider by name"""
        return self.providers.get(provider_name)
    
    def get_available_providers(self) -> List[str]:
        """Get list of available providers"""
        return list(self.providers.keys())
    
    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        provider: str = "openai",
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Generate AI response using specified provider"""
        ai_provider = self.get_provider(provider)
        if not ai_provider:
            raise AIServiceError(f"Provider '{provider}' not available")
        
        # Set default model based on provider
        if not model:
            if provider == "openai":
                model = "gpt-3.5-turbo"
            elif provider == "anthropic":
                model = "claude-3-haiku-20240307"
        
        kwargs["model"] = model
        
        return await ai_provider.generate_response(messages, **kwargs)
    
    async def generate_streaming_response(
        self,
        messages: List[Dict[str, str]],
        provider: str = "openai",
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Generate streaming AI response"""
        ai_provider = self.get_provider(provider)
        if not ai_provider:
            raise AIServiceError(f"Provider '{provider}' not available")
        
        # Set default model based on provider
        if not model:
            if provider == "openai":
                model = "gpt-3.5-turbo"
            elif provider == "anthropic":
                model = "claude-3-haiku-20240307"
        
        kwargs["model"] = model
        
        async for chunk in ai_provider.generate_streaming_response(messages, **kwargs):
            yield chunk
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of AI providers"""
        health_status = {
            "status": "healthy",
            "providers": {}
        }
        
        for provider_name, provider in self.providers.items():
            try:
                # Simple test message
                test_messages = [{"role": "user", "content": "Hello"}]
                await provider.generate_response(test_messages, max_tokens=10)
                health_status["providers"][provider_name] = "healthy"
            except Exception as e:
                health_status["providers"][provider_name] = f"error: {str(e)}"
                health_status["status"] = "degraded"
        
        return health_status


# Enhanced test function for OpenAI connection
async def test_openai_connection_with_key(api_key: str, model: str = "gpt-3.5-turbo") -> Dict[str, Any]:
    """Test OpenAI connection with provided API key and comprehensive error handling"""
    start_time = time.time()
    
    try:
        # Validate API key format
        if not api_key or not api_key.strip():
            return {
                "success": False,
                "message": "API key is empty or invalid",
                "error": "Empty API key provided",
                "error_type": "ValidationError"
            }
        
        if not api_key.startswith("sk-"):
            return {
                "success": False,
                "message": "Invalid API key format. OpenAI API keys should start with 'sk-'",
                "error": "Invalid API key format",
                "error_type": "ValidationError"
            }
        
        # Create temporary OpenAI client with timeout
        client = AsyncOpenAI(
            api_key=api_key,
            timeout=httpx.Timeout(30.0)  # 30 second timeout
        )
        
        # Simple test message
        test_messages = [
            {"role": "user", "content": "Hello! Please respond with just 'OK' to test the connection."}
        ]
        
        response = await client.chat.completions.create(
            model=model,
            messages=test_messages,
            max_tokens=10,
            temperature=0
        )
        
        duration = time.time() - start_time
        
        # Extract comprehensive model information
        model_info = {
            "model": response.model,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                "total_tokens": response.usage.total_tokens if response.usage else 0
            },
            "finish_reason": response.choices[0].finish_reason if response.choices else None
        }
        
        # Record successful test
        performance_monitor.record_ai_api_call(
            provider="openai",
            model=model,
            duration=duration,
            tokens_used={
                "input": model_info["usage"]["prompt_tokens"],
                "output": model_info["usage"]["completion_tokens"],
                "total": model_info["usage"]["total_tokens"]
            },
            status="success"
        )
        
        return {
            "success": True,
            "message": "OpenAI API connection successful",
            "model_info": model_info,
            "response_content": response.choices[0].message.content if response.choices else "",
            "duration_seconds": round(duration, 3),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        duration = time.time() - start_time
        logger.error(f"OpenAI connection test failed after {duration:.2f}s: {e}")
        
        # Parse common error types for better user messages
        error_message = str(e).lower()
        error_details = str(e)
        
        # More comprehensive error handling
        if "401" in error_message or "unauthorized" in error_message:
            user_message = "Invalid API key. Please check your OpenAI API key."
            error_type = "AuthenticationError"
        elif "403" in error_message or "forbidden" in error_message:
            user_message = "Access forbidden. Please check your API key permissions."
            error_type = "PermissionError"
        elif "429" in error_message or "rate limit" in error_message:
            user_message = "Rate limit exceeded. Please try again later."
            error_type = "RateLimitError"
        elif "insufficient_quota" in error_message or "billing" in error_message:
            user_message = "Insufficient quota. Please check your OpenAI account billing."
            error_type = "QuotaError"
        elif "model" in error_message and ("not found" in error_message or "does not exist" in error_message):
            user_message = f"Model '{model}' not available. Please try 'gpt-3.5-turbo' or 'gpt-4'."
            error_type = "ModelError"
        elif "timeout" in error_message or "timed out" in error_message:
            user_message = "Connection timeout. Please check your internet connection and try again."
            error_type = "TimeoutError"
        elif "connection" in error_message or "network" in error_message:
            user_message = "Network connection error. Please check your internet connection."
            error_type = "ConnectionError"
        elif "json" in error_message or "parse" in error_message:
            user_message = "Invalid response format from OpenAI API. Please try again."
            error_type = "ParseError"
        else:
            user_message = "Connection test failed. Please check your API key and try again."
            error_type = type(e).__name__
        
        # Record failed test
        performance_monitor.record_ai_api_call(
            provider="openai",
            model=model,
            duration=duration,
            tokens_used={"input": 0, "output": 0, "total": 0},
            status="error"
        )
        
        return {
            "success": False,
            "message": user_message,
            "error": error_details,
            "error_type": error_type,
            "duration_seconds": round(duration, 3),
            "timestamp": datetime.now().isoformat()
        }


# Global AI service instance
ai_service = AIService()