#!/usr/bin/env python3
"""
Health check script for Arketic API Docker container
Comprehensive health checks for API, database, and Redis
"""

import sys
import requests
import time
import json
import asyncio
import redis.asyncio as aioredis
import asyncpg
from typing import Dict, Any, Optional
import os


async def check_redis_health() -> Dict[str, Any]:
    """Check Redis connection health"""
    try:
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
        redis = aioredis.from_url(redis_url, decode_responses=True)
        
        # Test basic operations
        await redis.ping()
        await redis.set('health_check', 'ok', ex=10)
        value = await redis.get('health_check')
        
        await redis.close()
        
        return {
            "status": "healthy",
            "message": "Redis connection OK",
            "test_result": value == 'ok'
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}"
        }


async def check_database_health() -> Dict[str, Any]:
    """Check PostgreSQL database connection health"""
    try:
        database_url = os.getenv('DATABASE_URL', '')
        if not database_url or 'sqlite' in database_url.lower():
            return {
                "status": "healthy",
                "message": "SQLite database (dev mode)",
                "type": "sqlite"
            }
        
        # Parse PostgreSQL connection
        if database_url.startswith('postgresql+asyncpg://'):
            db_url = database_url.replace('postgresql+asyncpg://', 'postgresql://', 1)
        else:
            db_url = database_url
            
        conn = await asyncpg.connect(db_url)
        result = await conn.fetchval('SELECT 1')
        await conn.close()
        
        return {
            "status": "healthy",
            "message": "PostgreSQL connection OK",
            "test_result": result == 1
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }


def check_api_health() -> Dict[str, Any]:
    """Check the API service health"""
    try:
        # Check main health endpoint
        response = requests.get(
            "http://localhost:8000/health",
            timeout=10,
            headers={"User-Agent": "HealthCheck/1.0"}
        )
        
        if response.status_code == 200:
            health_data = response.json()
            return {
                "status": "healthy",
                "response_time": response.elapsed.total_seconds(),
                "details": health_data
            }
        else:
            return {
                "status": "unhealthy",
                "error": f"HTTP {response.status_code}",
                "response_time": response.elapsed.total_seconds()
            }
            
    except requests.exceptions.Timeout:
        return {
            "status": "unhealthy",
            "error": "Request timeout"
        }
    except requests.exceptions.ConnectionError:
        return {
            "status": "unhealthy",
            "error": "Connection refused"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


async def comprehensive_health_check() -> Dict[str, Any]:
    """Perform comprehensive health check of all services"""
    results = {
        "timestamp": time.time(),
        "overall_status": "healthy",
        "services": {}
    }
    
    # Check API health
    api_health = check_api_health()
    results["services"]["api"] = api_health
    
    # Check database health
    db_health = await check_database_health()
    results["services"]["database"] = db_health
    
    # Check Redis health
    redis_health = await check_redis_health()
    results["services"]["redis"] = redis_health
    
    # Determine overall status
    unhealthy_services = [
        service for service, status in results["services"].items()
        if status["status"] != "healthy"
    ]
    
    if unhealthy_services:
        results["overall_status"] = "unhealthy"
        results["unhealthy_services"] = unhealthy_services
    
    return results

def main():
    """Main health check function"""
    try:
        # Run comprehensive health check
        result = asyncio.run(comprehensive_health_check())
        
        if result["overall_status"] == "healthy":
            print("✓ All services are healthy")
            for service, status in result["services"].items():
                response_time = status.get('response_time', 0)
                if response_time > 0:
                    print(f"  - {service}: OK (response time: {response_time:.3f}s)")
                else:
                    print(f"  - {service}: OK")
            sys.exit(0)
        else:
            print("✗ Some services are unhealthy:")
            for service in result.get("unhealthy_services", []):
                status = result["services"][service]
                error_msg = status.get('error') or status.get('message', 'Unknown error')
                print(f"  - {service}: {error_msg}")
            sys.exit(1)
            
    except Exception as e:
        print(f"✗ Health check failed: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()