"""
System monitoring and metrics endpoints
Provides comprehensive system health and performance monitoring
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from typing import Dict, Any, List
import psutil
import os
import asyncio
from sqlalchemy import text

from core.database import get_db_session, check_database_health
from core.redis import check_redis_health, cache
from core.config import settings

router = APIRouter()


async def get_system_metrics() -> Dict[str, Any]:
    """Get system resource metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_metrics = {
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent,
            "used": memory.used,
            "free": memory.free
        }
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_metrics = {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": (disk.used / disk.total) * 100
        }
        
        # Process metrics
        process = psutil.Process(os.getpid())
        process_metrics = {
            "pid": process.pid,
            "memory_percent": process.memory_percent(),
            "cpu_percent": process.cpu_percent(),
            "num_threads": process.num_threads(),
            "create_time": process.create_time()
        }
        
        return {
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count
            },
            "memory": memory_metrics,
            "disk": disk_metrics,
            "process": process_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "error": f"Failed to get system metrics: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }


async def get_database_metrics() -> Dict[str, Any]:
    """Get database performance metrics"""
    try:
        async with get_db_session() as session:
            # Get database size
            if "postgresql" in settings.DATABASE_URL:
                size_query = text("""
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size,
                           pg_database_size(current_database()) as size_bytes
                """)
                result = await session.execute(size_query)
                size_data = result.fetchone()
                
                # Get connection count
                conn_query = text("""
                    SELECT count(*) as active_connections
                    FROM pg_stat_activity
                    WHERE state = 'active'
                """)
                conn_result = await session.execute(conn_query)
                conn_data = conn_result.fetchone()
                
                return {
                    "type": "postgresql",
                    "size": size_data.size if size_data else "unknown",
                    "size_bytes": size_data.size_bytes if size_data else 0,
                    "active_connections": conn_data.active_connections if conn_data else 0,
                    "status": "healthy"
                }
            else:
                # SQLite metrics
                return {
                    "type": "sqlite",
                    "status": "healthy",
                    "note": "Limited metrics available for SQLite"
                }
                
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


@router.get("/monitoring/health/comprehensive")
async def comprehensive_health_check():
    """Comprehensive health check with all system metrics"""
    timestamp = datetime.utcnow()
    
    # Collect all health data
    health_data = {
        "timestamp": timestamp.isoformat(),
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT.value,
        "status": "healthy"
    }
    
    # Check services
    services = {}
    
    # Database health
    try:
        db_health = await check_database_health()
        db_metrics = await get_database_metrics()
        services["database"] = {**db_health, "metrics": db_metrics}
        
        if db_health["status"] != "healthy":
            health_data["status"] = "degraded"
    except Exception as e:
        services["database"] = {"status": "error", "error": str(e)}
        health_data["status"] = "unhealthy"
    
    # Redis health
    try:
        redis_health = await check_redis_health()
        services["redis"] = redis_health
        
        if redis_health["status"] != "healthy":
            health_data["status"] = "degraded" if health_data["status"] == "healthy" else "unhealthy"
    except Exception as e:
        services["redis"] = {"status": "error", "error": str(e)}
        health_data["status"] = "unhealthy"
    
    # System metrics
    try:
        system_metrics = await get_system_metrics()
        health_data["system_metrics"] = system_metrics
        
        # Check for resource alerts
        alerts = []
        if system_metrics.get("cpu", {}).get("percent", 0) > 80:
            alerts.append("High CPU usage")
        if system_metrics.get("memory", {}).get("percent", 0) > 80:
            alerts.append("High memory usage")
        if system_metrics.get("disk", {}).get("percent", 0) > 80:
            alerts.append("High disk usage")
            
        if alerts:
            health_data["alerts"] = alerts
            health_data["status"] = "degraded" if health_data["status"] == "healthy" else health_data["status"]
            
    except Exception as e:
        health_data["system_metrics"] = {"error": str(e)}
    
    health_data["services"] = services
    
    return health_data


@router.get("/monitoring/metrics")
async def get_metrics():
    """Get system and application metrics for monitoring"""
    try:
        system_metrics = await get_system_metrics()
        db_metrics = await get_database_metrics()
        
        # Redis metrics
        try:
            redis_info = await cache.get_info()
            redis_metrics = {
                "status": "healthy",
                "info": redis_info
            }
        except Exception as e:
            redis_metrics = {
                "status": "error",
                "error": str(e)
            }
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": system_metrics,
            "database": db_metrics,
            "redis": redis_metrics,
            "application": {
                "environment": settings.ENVIRONMENT.value,
                "version": "1.0.0",
                "uptime": "calculated_uptime_would_go_here"
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get metrics: {str(e)}"
        )


@router.get("/monitoring/status")
async def get_service_status():
    """Get quick status of all services"""
    services = {}
    overall_status = "healthy"
    
    # Check database
    try:
        db_health = await check_database_health()
        services["database"] = db_health["status"]
        if db_health["status"] != "healthy":
            overall_status = "degraded"
    except Exception:
        services["database"] = "error"
        overall_status = "unhealthy"
    
    # Check Redis
    try:
        redis_health = await check_redis_health()
        services["redis"] = redis_health["status"]
        if redis_health["status"] != "healthy":
            overall_status = "degraded" if overall_status == "healthy" else "unhealthy"
    except Exception:
        services["redis"] = "error"
        overall_status = "unhealthy"
    
    # API is healthy if we reach this point
    services["api"] = "healthy"
    
    return {
        "overall_status": overall_status,
        "services": services,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/monitoring/alerts")
async def get_system_alerts():
    """Get system alerts and warnings"""
    alerts = []
    warnings = []
    
    try:
        # Check system resources
        system_metrics = await get_system_metrics()
        
        cpu_percent = system_metrics.get("cpu", {}).get("percent", 0)
        memory_percent = system_metrics.get("memory", {}).get("percent", 0)
        disk_percent = system_metrics.get("disk", {}).get("percent", 0)
        
        # CPU alerts
        if cpu_percent > 90:
            alerts.append({
                "type": "cpu",
                "severity": "critical",
                "message": f"CPU usage is {cpu_percent:.1f}%",
                "threshold": 90
            })
        elif cpu_percent > 70:
            warnings.append({
                "type": "cpu",
                "severity": "warning",
                "message": f"CPU usage is {cpu_percent:.1f}%",
                "threshold": 70
            })
        
        # Memory alerts
        if memory_percent > 90:
            alerts.append({
                "type": "memory",
                "severity": "critical",
                "message": f"Memory usage is {memory_percent:.1f}%",
                "threshold": 90
            })
        elif memory_percent > 70:
            warnings.append({
                "type": "memory",
                "severity": "warning",
                "message": f"Memory usage is {memory_percent:.1f}%",
                "threshold": 70
            })
        
        # Disk alerts
        if disk_percent > 90:
            alerts.append({
                "type": "disk",
                "severity": "critical",
                "message": f"Disk usage is {disk_percent:.1f}%",
                "threshold": 90
            })
        elif disk_percent > 80:
            warnings.append({
                "type": "disk",
                "severity": "warning",
                "message": f"Disk usage is {disk_percent:.1f}%",
                "threshold": 80
            })
        
        return {
            "alerts": alerts,
            "warnings": warnings,
            "alert_count": len(alerts),
            "warning_count": len(warnings),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "error": f"Failed to get alerts: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }