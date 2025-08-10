"""
Arketic AI/ML Backend - FastAPI Application
Enterprise-grade AI integration with comprehensive security and monitoring
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import logging
import uvicorn
from typing import Optional
import os
import json

# Import core modules
from core.config import settings, get_cors_config
from core.database import init_database, close_database
from core.redis import init_redis, close_redis
from core.monitoring import setup_monitoring, MetricsMiddleware
from core.security import SecurityManager
from core.dependencies import initialize_dependencies, get_current_user, get_current_user_dict

# Import routers
from routers import auth, users, health, organization, compliance, people, chat, monitoring, openai_settings, vector, knowledge, forms, assistants
from routers import settings as settings_router
from routers import embedding_tasks, embedding_websocket, embeddings, audit

# Import middleware
from middleware.security import SecurityMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.logging import LoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service instances
security_manager: Optional[SecurityManager] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    global security_manager
    
    logger.info("Starting Arketic AI Backend...")
    
    try:
        # Initialize core services
        logger.info("Initializing database...")
        await init_database()
        
        logger.info("Initializing Redis...")
        await init_redis()
        
        logger.info("Setting up monitoring...")
        setup_monitoring()
        
        # Initialize security
        logger.info("Initializing security manager...")
        security_manager = SecurityManager()
        await security_manager.initialize()
        
        # Initialize shared dependencies
        logger.info("Initializing shared dependencies...")
        initialize_dependencies(security_manager)
        
        # Initialize LangChain service client
        logger.info("Initializing LangChain service client...")
        from services.langchain_client import get_langchain_client
        langchain_client = get_langchain_client()
        logger.info("LangChain service client ready")
        
        logger.info("Arketic Backend initialization complete")
        
    except Exception as e:
        logger.error(f"Failed to initialize backend services: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("Shutting down Arketic Backend...")
    
    try:
        # Cleanup LangChain client
        logger.info("Cleaning up LangChain service client...")
        from services.langchain_client import cleanup_langchain_client
        await cleanup_langchain_client()
        
        if security_manager:
            await security_manager.cleanup()
        
        # Close connections
        await close_redis()
        await close_database()
        
        logger.info("Backend shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


# Create FastAPI application
app = FastAPI(
    title="Arketic AI/ML Backend",
    description="Enterprise AI integration platform with comprehensive security and monitoring",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT != "production" else None
)

# Add middleware
cors_config = get_cors_config()
app.add_middleware(
    CORSMiddleware,
    **cors_config
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityMiddleware)
app.add_middleware(MetricsMiddleware)

# Note: get_current_user is now defined in core.dependencies


# Include core routers
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    users.router,
    prefix="/api/v1/users",
    tags=["Users"],
    dependencies=[Depends(get_current_user)]
)

app.include_router(
    health.router,
    tags=["Health"]
)

# Include organization management routers (using token-only auth for now)
app.include_router(
    organization.router,
    prefix="/api/v1/organization",
    tags=["Organization"]
    # Dependencies handled in individual endpoints to avoid database issues
)

app.include_router(
    compliance.router,
    prefix="/api/v1/compliance",
    tags=["Compliance"]
    # Dependencies handled in individual endpoints to avoid database issues
)

app.include_router(
    people.router,
    prefix="/api/v1/organization/people",
    tags=["People Management"]
    # Dependencies handled in individual endpoints to avoid database issues
)

# Include chat router (AI-powered) - dependencies handled at endpoint level
app.include_router(
    chat.router,
    prefix="/api/v1/chat",
    tags=["Chat"]
    # Dependencies handled in individual endpoints to avoid database issues
)

# Include chat WebSocket router - without authentication dependency
app.include_router(
    chat.ws_router,
    prefix="/api/v1/chat",
    tags=["Chat WebSocket"]
)

# Include monitoring router (protected)
app.include_router(
    monitoring.router,
    prefix="/api/v1",
    tags=["Monitoring"],
    dependencies=[Depends(get_current_user)]
)

# OpenAI settings router provides specific endpoints for frontend compatibility
# This complements the general settings router for API key management

# Include settings router (protected)
app.include_router(
    settings_router.router,
    prefix="/api/v1/settings",
    tags=["Settings"],
    dependencies=[Depends(get_current_user)]
)

# Include OpenAI settings router (protected) 
app.include_router(
    openai_settings.router,
    prefix="/api/v1/openai-settings",
    tags=["OpenAI Settings"]
)

# Include vector store router (protected)
app.include_router(
    vector.router,
    prefix="/api/v1",
    tags=["Vector Store"],
    dependencies=[Depends(get_current_user)]
)

# Include knowledge management router (protected)
app.include_router(
    knowledge.router,
    tags=["Knowledge Management"]
    # Dependencies handled in individual endpoints
)

# Include forms router (protected)
app.include_router(
    forms.router,
    prefix="/api/v1",
    tags=["Forms"]
    # Dependencies handled in individual endpoints to avoid conflicts
)

# Include assistants router (protected)
app.include_router(
    assistants.router,
    prefix="/api/v1",
    tags=["AI Assistants"]
    # Dependencies handled in individual endpoints
)

# Include embedding tasks router (protected)
app.include_router(
    embedding_tasks.router,
    prefix="/api/v1",
    tags=["Embedding Tasks"]
    # Dependencies handled in individual endpoints
)

# Include embedding WebSocket router
app.include_router(
    embedding_websocket.router,
    prefix="/api/v1",
    tags=["Embedding WebSocket"]
)

# Include embeddings router (protected)
app.include_router(
    embeddings.router,
    prefix="/api/embeddings",
    tags=["Embeddings"]
    # Dependencies handled in individual endpoints
)

# Include audit router (protected)
app.include_router(
    audit.router,
    prefix="/api/audit",
    tags=["Audit"]
    # Dependencies handled in individual endpoints
)


# Basic health check endpoint (also available in health_router)
@app.get("/health")
async def health_check():
    """Basic health check endpoint with service status"""
    from core.database import check_database_health
    from core.redis import check_redis_health
    
    services_status = {}
    overall_status = "healthy"
    
    # Check database
    try:
        db_status = await check_database_health()
        services_status["database"] = db_status
        if db_status["status"] != "healthy":
            overall_status = "degraded"
    except Exception as e:
        services_status["database"] = {"status": "error", "message": str(e)}
        overall_status = "unhealthy"
    
    # Check Redis
    try:
        redis_status = await check_redis_health()
        services_status["redis"] = redis_status
        if redis_status["status"] != "healthy":
            overall_status = "degraded" if overall_status == "healthy" else "unhealthy"
    except Exception as e:
        services_status["redis"] = {"status": "error", "message": str(e)}
        overall_status = "unhealthy"
    
    # Check security manager
    if security_manager:
        try:
            security_status = await security_manager.health_check()
            services_status["security"] = security_status
        except Exception as e:
            services_status["security"] = {"status": "error", "message": str(e)}
    
    return {
        "status": overall_status,
        "services": services_status,
        "version": app.version,
        "environment": settings.ENVIRONMENT.value
    }


@app.get("/api/v1/status")
async def get_system_status(current_user = Depends(get_current_user_dict)):
    """Get comprehensive system status"""
    return {
        "status": "operational",
        "version": app.version,
        "environment": settings.ENVIRONMENT.value,
        "user": {
            "id": current_user["user_id"],
            "email": current_user["email"],
            "username": current_user.get("username", "N/A")
        },
        "features": [
            "Organization Management",
            "People Management", 
            "Compliance Tracking",
            "AI-Powered Chat",
            "Real-time WebSockets",
            "Document Processing",
            "Vector Search",
            "Cost Management"
        ],
        "endpoints": {
            "health": "/health",
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "organization": "/api/v1/organization",
            "compliance": "/api/v1/compliance",
            "people": "/api/v1/people",
            "chat": "/api/v1/chat"
        }
    }

@app.get("/api/v1/test-auth")
async def test_auth_endpoint(current_user = Depends(get_current_user_dict)):
    """Test authentication endpoint"""
    return {
        "message": "Authentication successful",
        "user": current_user,
        "timestamp": "2025-08-06T16:30:00Z"
    }


@app.post("/api/v1/test/create-admin")
async def create_test_admin():
    """Create test admin user (development only)"""
    try:
        logger.info(f"Creating admin user, environment: {settings.ENVIRONMENT}")
        
        if settings.ENVIRONMENT == "production":
            raise HTTPException(status_code=404, detail="Not found")
        
        from services.user_service import UserService
        from schemas.user import UserCreate
        from models.user import UserRole, UserStatus
        from core.database import get_db
        
        user_service = UserService()
    
        # Get async session
        async for session in get_db():
            try:
                logger.info("Checking for existing admin user...")
                # Check if admin already exists
                existing_admin = await user_service.get_user_by_email(session, "arketic@arketic.com")
                if existing_admin:
                    logger.info("Admin user already exists")
                    return {
                        "message": "Admin user already exists - use for testing",
                        "email": "arketic@arketic.com",
                        "username": "arketic", 
                        "password": "Arketic123!",
                        "role": "admin",
                        "user_id": str(existing_admin.id),
                        "is_verified": existing_admin.is_verified,
                        "is_active": existing_admin.is_active
                    }
            
                logger.info("Creating new admin user...")
                # Create admin user with specified credentials
                admin_data = UserCreate(
                    email="arketic@arketic.com",
                    password="Arketic123!",
                    first_name="Arketic",
                    last_name="Admin",
                    username="arketic",
                    role=UserRole.ADMIN
                )
            
                admin_user = await user_service.create_user(session, admin_data)
                logger.info(f"Admin user created with ID: {admin_user.id}")
                
                # Verify email and activate account automatically for test admin
                await user_service.verify_email(session, str(admin_user.id))
                logger.info("Admin user verified and activated")
            
                result = {
                    "message": "Default admin user created successfully",
                    "email": "arketic@arketic.com",
                    "username": "arketic",
                    "password": "Arketic123!",
                    "role": "admin",
                    "status": "active",
                    "user_id": str(admin_user.id)
                }
                logger.info(f"Returning result: {result}")
                return result
            except Exception as e:
                logger.error(f"Error creating admin user: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to create admin user: {str(e)}"
                )
            finally:
                break
    except Exception as e:
        logger.error(f"Outer exception in create_test_admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create admin user: {str(e)}"
        )
    


@app.get("/favicon.ico")
async def favicon():
    """Serve favicon to prevent 404 errors"""
    # Return a simple ICO response or 204 No Content
    return Response(
        content="",
        media_type="image/x-icon",
        status_code=204
    )


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Arketic AI/ML Backend",
        "version": "1.0.0",
        "status": "operational",
        "environment": settings.ENVIRONMENT.value,
        "docs": "/api/docs" if settings.ENVIRONMENT != "production" else "disabled",
        "description": "Enterprise AI integration platform with comprehensive security and monitoring"
    }


# WebSocket endpoint for real-time communication
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time communication"""
    await websocket.accept()
    
    try:
        # Send initial message
        await websocket.send_text(json.dumps({
            "type": "welcome",
            "message": "WebSocket connection established. Ready for real-time communication.",
            "client_id": client_id,
            "features": ["chat", "notifications", "live_updates"]
        }))
        
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Handle different message types
            if message_data.get("type") == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": message_data.get("timestamp")
                }))
            else:
                # Echo back other messages
                await websocket.send_text(json.dumps({
                    "type": "echo",
                    "message": "Message received",
                    "received_data": message_data,
                    "client_id": client_id
                }))
                
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        await websocket.close(code=1000)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level="info"
    )