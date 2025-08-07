"""
Monitoring and metrics collection
Prometheus metrics, health checks, and performance monitoring
"""

import time
import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from functools import wraps
from collections import defaultdict, deque

try:
    from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    # Mock classes for when prometheus is not available
    class Counter:
        def __init__(self, *args, **kwargs): pass
        def labels(self, **kwargs): return self
        def inc(self, amount=1): pass
    
    class Histogram:
        def __init__(self, *args, **kwargs): pass
        def labels(self, **kwargs): return self
        def observe(self, value): pass
    
    class Gauge:
        def __init__(self, *args, **kwargs): pass
        def set(self, value): pass
    
    def generate_latest(): return b''
    CONTENT_TYPE_LATEST = 'text/plain'
from fastapi import Request, Response
from fastapi.responses import PlainTextResponse

from .config import settings

logger = logging.getLogger(__name__)

# Prometheus metrics
request_count = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

active_connections = Gauge(
    'active_connections',
    'Number of active connections'
)

database_operations = Counter(
    'database_operations_total',
    'Total database operations',
    ['operation', 'table']
)

ai_api_calls = Counter(
    'ai_api_calls_total',
    'Total AI API calls',
    ['provider', 'model', 'status']
)

ai_api_duration = Histogram(
    'ai_api_duration_seconds',
    'AI API call duration',
    ['provider', 'model']
)

ai_token_usage = Counter(
    'ai_tokens_used_total',
    'Total AI tokens consumed',
    ['provider', 'model', 'type']
)

memory_usage = Gauge(
    'memory_usage_bytes',
    'Memory usage in bytes'
)

cpu_usage = Gauge(
    'cpu_usage_percent',
    'CPU usage percentage'
)


class PerformanceMonitor:
    """Performance monitoring and metrics collection"""
    
    def __init__(self):
        self.request_times: deque = deque(maxlen=1000)
        self.error_rates: Dict[str, int] = defaultdict(int)
        self.endpoint_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            'total_requests': 0,
            'total_time': 0,
            'min_time': float('inf'),
            'max_time': 0,
            'error_count': 0
        })
        self.start_time = datetime.now(timezone.utc)
        
    def record_request(self, method: str, endpoint: str, duration: float, status_code: int):
        """Record request metrics"""
        # Prometheus metrics
        request_count.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        request_duration.labels(method=method, endpoint=endpoint).observe(duration)
        
        # Internal metrics
        self.request_times.append(duration)
        
        stats = self.endpoint_stats[f"{method} {endpoint}"]
        stats['total_requests'] += 1
        stats['total_time'] += duration
        stats['min_time'] = min(stats['min_time'], duration)
        stats['max_time'] = max(stats['max_time'], duration)
        
        if status_code >= 400:
            stats['error_count'] += 1
            self.error_rates[str(status_code)] += 1
    
    def record_database_operation(self, operation: str, table: str, duration: float = None):
        """Record database operation"""
        database_operations.labels(operation=operation, table=table).inc()
        if duration:
            # You can add a database duration histogram if needed
            pass
    
    def record_ai_api_call(self, provider: str, model: str, duration: float, 
                          tokens_used: Dict[str, int], status: str = "success"):
        """Record AI API call metrics"""
        ai_api_calls.labels(provider=provider, model=model, status=status).inc()
        ai_api_duration.labels(provider=provider, model=model).observe(duration)
        
        # Record token usage
        for token_type, count in tokens_used.items():
            ai_token_usage.labels(provider=provider, model=model, type=token_type).inc(count)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get current performance statistics"""
        uptime = (datetime.now(timezone.utc) - self.start_time).total_seconds()
        
        avg_response_time = sum(self.request_times) / len(self.request_times) if self.request_times else 0
        
        return {
            "uptime_seconds": uptime,
            "total_requests": sum(stats['total_requests'] for stats in self.endpoint_stats.values()),
            "average_response_time": avg_response_time,
            "error_rates": dict(self.error_rates),
            "endpoint_stats": {
                endpoint: {
                    **stats,
                    "average_time": stats['total_time'] / stats['total_requests'] if stats['total_requests'] > 0 else 0,
                    "error_rate": stats['error_count'] / stats['total_requests'] if stats['total_requests'] > 0 else 0
                }
                for endpoint, stats in self.endpoint_stats.items()
            }
        }


class HealthChecker:
    """System health monitoring"""
    
    def __init__(self):
        self.checks: Dict[str, callable] = {}
        self.last_check_results: Dict[str, Dict[str, Any]] = {}
        
    def register_check(self, name: str, check_func: callable):
        """Register a health check function"""
        self.checks[name] = check_func
        
    async def run_checks(self) -> Dict[str, Any]:
        """Run all health checks"""
        results = {}
        overall_status = "healthy"
        
        for name, check_func in self.checks.items():
            try:
                if asyncio.iscoroutinefunction(check_func):
                    result = await check_func()
                else:
                    result = check_func()
                
                results[name] = result
                self.last_check_results[name] = {
                    **result,
                    "last_checked": datetime.now(timezone.utc).isoformat()
                }
                
                if result.get("status") != "healthy":
                    overall_status = "unhealthy"
                    
            except Exception as e:
                error_result = {
                    "status": "error",
                    "message": f"Health check failed: {str(e)}"
                }
                results[name] = error_result
                self.last_check_results[name] = {
                    **error_result,
                    "last_checked": datetime.now(timezone.utc).isoformat()
                }
                overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "checks": results
        }
    
    def get_last_results(self) -> Dict[str, Any]:
        """Get last health check results"""
        return self.last_check_results


# Global instances
performance_monitor = PerformanceMonitor()
health_checker = HealthChecker()


async def metrics_endpoint() -> Response:
    """Prometheus metrics endpoint"""
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


async def health_endpoint() -> Dict[str, Any]:
    """Health check endpoint"""
    return await health_checker.run_checks()


async def status_endpoint() -> Dict[str, Any]:
    """System status endpoint"""
    health_results = await health_checker.run_checks()
    performance_stats = performance_monitor.get_performance_stats()
    
    return {
        "status": health_results["status"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT.value,
        "uptime_seconds": performance_stats["uptime_seconds"],
        "health": health_results,
        "performance": performance_stats
    }


def monitor_performance(func):
    """Decorator to monitor function performance"""
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            # You can add specific monitoring here
            return result
        except Exception as e:
            duration = time.time() - start_time
            # Record error metrics
            raise
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            # You can add specific monitoring here
            return result
        except Exception as e:
            duration = time.time() - start_time
            # Record error metrics
            raise
    
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


class MetricsMiddleware:
    """Middleware to collect HTTP request metrics"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        async def send_with_metrics(message):
            if message["type"] == "http.response.start":
                duration = time.time() - start_time
                
                # Extract request info
                method = scope["method"]
                path = scope["path"]
                status_code = message["status"]
                
                # Record metrics
                performance_monitor.record_request(method, path, duration, status_code)
            
            await send(message)
        
        await self.app(scope, receive, send_with_metrics)


def setup_monitoring():
    """Initialize monitoring system"""
    logger.info("Setting up monitoring system")
    
    # Register basic health checks
    def basic_health_check():
        return {"status": "healthy", "message": "Service is running"}
    
    health_checker.register_check("basic", basic_health_check)
    
    # You can register more health checks here
    logger.info("Monitoring system initialized")


def log_api_usage(provider: str, model: str, tokens_used: Dict[str, int], 
                 cost: float = None, duration: float = None):
    """Log AI API usage for cost tracking and monitoring"""
    logger.info(f"AI API Usage - Provider: {provider}, Model: {model}, "
               f"Tokens: {tokens_used}, Cost: ${cost:.4f}" + 
               (f", Duration: {duration:.2f}s" if duration else ""))
    
    # Record metrics
    if duration:
        performance_monitor.record_ai_api_call(provider, model, duration, tokens_used)


# Export all necessary components
__all__ = [
    "performance_monitor",
    "health_checker",
    "metrics_endpoint",
    "health_endpoint",
    "status_endpoint",
    "monitor_performance",
    "MetricsMiddleware",
    "setup_monitoring",
    "log_api_usage",
]