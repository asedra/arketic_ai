#!/usr/bin/env python3
"""
Docker Environment Validation Script
Validates that all required services are properly configured and accessible
"""

import asyncio
import sys
import os
import aioredis
import asyncpg
import requests
from typing import Dict, Any
import json
import time


async def check_database(database_url: str) -> Dict[str, Any]:
    """Check database connectivity"""
    print("🔍 Checking database connectivity...")
    
    try:
        if "sqlite" in database_url.lower():
            return {
                "status": "healthy",
                "type": "sqlite",
                "message": "SQLite database (development mode)"
            }
        
        # Parse PostgreSQL connection
        if database_url.startswith('postgresql+asyncpg://'):
            db_url = database_url.replace('postgresql+asyncpg://', 'postgresql://', 1)
        else:
            db_url = database_url
            
        conn = await asyncpg.connect(db_url)
        
        # Test basic query
        result = await conn.fetchval('SELECT version()')
        await conn.close()
        
        print("✅ Database connection successful")
        return {
            "status": "healthy",
            "type": "postgresql",
            "version": result,
            "message": "PostgreSQL connection OK"
        }
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Database connection failed"
        }


async def check_redis(redis_url: str) -> Dict[str, Any]:
    """Check Redis connectivity"""
    print("🔍 Checking Redis connectivity...")
    
    try:
        redis = aioredis.from_url(redis_url, decode_responses=True)
        
        # Test basic operations
        await redis.ping()
        
        # Test set/get
        test_key = "health_check_validation"
        await redis.set(test_key, "ok", ex=10)
        value = await redis.get(test_key)
        await redis.delete(test_key)
        
        # Get Redis info
        info = await redis.info()
        redis_version = info.get('redis_version', 'unknown')
        used_memory = info.get('used_memory_human', 'unknown')
        
        await redis.close()
        
        print("✅ Redis connection successful")
        return {
            "status": "healthy",
            "version": redis_version,
            "used_memory": used_memory,
            "test_passed": value == "ok",
            "message": "Redis connection OK"
        }
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Redis connection failed"
        }


def check_api(api_url: str, timeout: int = 30) -> Dict[str, Any]:
    """Check API accessibility"""
    print("🔍 Checking API accessibility...")
    
    max_attempts = 6
    for attempt in range(max_attempts):
        try:
            response = requests.get(
                f"{api_url}/health",
                timeout=10,
                headers={"User-Agent": "DockerValidation/1.0"}
            )
            
            if response.status_code == 200:
                health_data = response.json()
                print("✅ API is accessible and healthy")
                return {
                    "status": "healthy",
                    "response_time": response.elapsed.total_seconds(),
                    "health_data": health_data,
                    "message": "API connection OK"
                }
            else:
                print(f"⚠️  API returned status {response.status_code}")
                return {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}",
                    "message": "API returned error status"
                }
                
        except requests.exceptions.ConnectionError:
            if attempt < max_attempts - 1:
                wait_time = (attempt + 1) * 5
                print(f"⏳ API not ready, waiting {wait_time}s (attempt {attempt + 1}/{max_attempts})...")
                time.sleep(wait_time)
            else:
                print("❌ API connection failed after all attempts")
                return {
                    "status": "unhealthy",
                    "error": "Connection refused",
                    "message": "API is not accessible"
                }
        except Exception as e:
            print(f"❌ API check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "message": "API check failed"
            }
    
    return {
        "status": "unhealthy",
        "error": "Max attempts exceeded",
        "message": "API validation failed"
    }


async def main():
    """Main validation function"""
    print("🚀 Starting Docker environment validation...\n")
    
    # Get environment variables
    database_url = os.getenv('DATABASE_URL', 'postgresql://arketic:arketic_dev_password@postgres:5432/arketic_dev')
    redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
    api_url = os.getenv('API_URL', 'http://api:8000')
    
    print(f"Database URL: {database_url.split('@')[-1] if '@' in database_url else database_url}")
    print(f"Redis URL: {redis_url}")
    print(f"API URL: {api_url}\n")
    
    results = {
        "timestamp": time.time(),
        "environment": os.getenv('ENVIRONMENT', 'development'),
        "services": {}
    }
    
    # Check database
    db_result = await check_database(database_url)
    results["services"]["database"] = db_result
    print()
    
    # Check Redis
    redis_result = await check_redis(redis_url)
    results["services"]["redis"] = redis_result
    print()
    
    # Check API (this should be last as it depends on other services)
    api_result = check_api(api_url)
    results["services"]["api"] = api_result
    print()
    
    # Determine overall status
    unhealthy_services = [
        service for service, status in results["services"].items()
        if status["status"] != "healthy"
    ]
    
    if not unhealthy_services:
        results["overall_status"] = "healthy"
        print("🎉 All services are healthy!")
        print("\n✅ Docker environment validation PASSED")
        exit_code = 0
    else:
        results["overall_status"] = "unhealthy"
        print(f"⚠️  Unhealthy services: {', '.join(unhealthy_services)}")
        print("\n❌ Docker environment validation FAILED")
        exit_code = 1
    
    # Print summary
    print(f"\n📊 Validation Summary:")
    for service, status in results["services"].items():
        status_icon = "✅" if status["status"] == "healthy" else "❌"
        print(f"  {status_icon} {service}: {status['status']}")
    
    # Save results to file if requested
    if os.getenv('SAVE_VALIDATION_RESULTS'):
        results_file = '/tmp/validation_results.json'
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"\n📝 Results saved to {results_file}")
    
    sys.exit(exit_code)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Validation failed with error: {e}")
        sys.exit(1)