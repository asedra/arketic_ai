"""Rate limiting middleware with improved error handling"""

import logging
from fastapi import Request, HTTPException, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import time
from collections import defaultdict
from typing import Dict, List

logger = logging.getLogger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting with better error handling"""
    
    def __init__(self, app, requests_per_minute: int = 120):  # Increased limit for development
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self.enabled = False  # Disabled for development and testing
        
        # Exempt certain paths from rate limiting
        self.exempt_paths = {
            "/health",
            "/metrics", 
            "/api/docs",
            "/api/redoc",
            "/openapi.json"
        }
        
        logger.info(f"Rate limiting initialized: {requests_per_minute} requests per minute")
    
    def get_client_identifier(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Use X-Forwarded-For if available (for load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Fallback to client host
        if request.client:
            return request.client.host
        
        # Last resort
        return "unknown"
    
    async def dispatch(self, request: Request, call_next):
        try:
            # Skip rate limiting for exempt paths
            if request.url.path in self.exempt_paths or not self.enabled:
                return await call_next(request)
            
            client_id = self.get_client_identifier(request)
            current_time = time.time()
            
            # Clean old requests (older than 1 minute)
            cutoff_time = current_time - 60
            self.requests[client_id] = [
                req_time for req_time in self.requests[client_id]
                if req_time > cutoff_time
            ]
            
            # Check rate limit
            if len(self.requests[client_id]) >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for client {client_id}: {len(self.requests[client_id])} requests")
                
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate limit exceeded",
                        "message": f"Too many requests. Limit is {self.requests_per_minute} per minute.",
                        "retry_after": 60
                    },
                    headers={"Retry-After": "60"}
                )
            
            # Add current request
            self.requests[client_id].append(current_time)
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers to response
            remaining = max(0, self.requests_per_minute - len(self.requests[client_id]))
            response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limit middleware error: {e}")
            # If rate limiting fails, allow the request to proceed
            return await call_next(request)