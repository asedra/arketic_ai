"""Health check endpoints with comprehensive service monitoring"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import os
import asyncio
import redis.asyncio as aioredis
from typing import Dict, Any

from core.database import check_database_health
from core.config import settings

router = APIRouter()


async def check_redis_connection() -> Dict[str, Any]:
    """Check Redis connection and basic operations"""
    try:
        redis_url = settings.REDIS_URL
        redis = aioredis.from_url(redis_url, decode_responses=True)
        
        # Test basic operations
        await redis.ping()
        test_key = "health_check_test"
        await redis.set(test_key, "ok", ex=10)
        value = await redis.get(test_key)
        await redis.delete(test_key)
        
        info = await redis.info()
        connected_clients = info.get('connected_clients', 0)
        used_memory = info.get('used_memory_human', 'unknown')
        
        await redis.close()
        
        return {
            "status": "healthy",
            "message": "Redis connection OK",
            "connected_clients": connected_clients,
            "used_memory": used_memory,
            "test_passed": value == "ok"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Redis connection failed: {str(e)}"
        }

@router.get("/health")
async def health_check():
    """Basic health check endpoint with database status"""
    timestamp = datetime.utcnow().isoformat()
    
    try:
        # Check database
        db_health = await check_database_health()
        overall_status = "healthy" if db_health["status"] == "healthy" else "degraded"
        
        return {
            "status": overall_status,
            "timestamp": timestamp,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT.value,
            "database": db_health
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": timestamp,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT.value,
            "database": {
                "status": "unhealthy",
                "message": f"Database check failed: {str(e)}"
            }
        }

@router.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with comprehensive service monitoring"""
    timestamp = datetime.utcnow().isoformat()
    
    # Check all services
    services_status = {}
    overall_status = "healthy"
    
    # Check database
    try:
        db_health = await check_database_health()
        services_status["database"] = db_health
        if db_health["status"] != "healthy":
            overall_status = "degraded"
    except Exception as e:
        services_status["database"] = {
            "status": "unhealthy",
            "message": f"Database check failed: {str(e)}"
        }
        overall_status = "unhealthy"
    
    # Check Redis
    try:
        redis_health = await check_redis_connection()
        services_status["redis"] = redis_health
        if redis_health["status"] != "healthy":
            overall_status = "degraded" if overall_status == "healthy" else "unhealthy"
    except Exception as e:
        services_status["redis"] = {
            "status": "unhealthy",
            "message": f"Redis check failed: {str(e)}"
        }
        overall_status = "unhealthy"
    
    # API is operational if we reach this point
    services_status["api"] = {
        "status": "healthy",
        "message": "API is operational"
    }
    
    return {
        "status": overall_status,
        "timestamp": timestamp,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT.value,
        "system": {
            "platform": os.name,
            "cwd": os.getcwd(),
            "pid": os.getpid(),
            "host": settings.HOST,
            "port": settings.PORT
        },
        "services": services_status,
        "config": {
            "debug": settings.DEBUG,
            "database_type": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite",
            "redis_configured": bool(settings.REDIS_URL),
            "ai_providers": list(settings.ai_providers_config.keys()),
            "vector_stores": list(settings.vector_stores_config.keys())
        }
    }


@router.get("/health/readiness")
async def readiness_check():
    """Kubernetes-style readiness probe"""
    try:
        # Check critical dependencies
        db_health = await check_database_health()
        redis_health = await check_redis_connection()
        
        if db_health["status"] == "healthy" and redis_health["status"] == "healthy":
            return {
                "status": "ready",
                "timestamp": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(
                status_code=503,
                detail={
                    "status": "not_ready",
                    "timestamp": datetime.utcnow().isoformat(),
                    "database": db_health["status"],
                    "redis": redis_health["status"]
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "not_ready",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e)
            }
        )


@router.get("/health/liveness")
async def liveness_check():
    """Kubernetes-style liveness probe"""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": (datetime.utcnow() - datetime.utcnow()).total_seconds()  # This would be calculated from app start time
    }