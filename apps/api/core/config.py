"""
Configuration management for Arketic AI Backend
Environment-based configuration with validation and security
"""

import os
from typing import List, Optional, Dict, Any
from pydantic_settings import BaseSettings
from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Application
    APP_NAME: str = "Arketic AI Backend"
    VERSION: str = "1.0.0"
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = False
    LOG_LEVEL: LogLevel = LogLevel.INFO
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    WORKERS: int = 1
    
    # Security
    SECRET_KEY: str = "arketic-dev-secret-key-change-in-production-32-chars-minimum"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    ALLOWED_ORIGINS: str = "http://localhost:3000,https://arketic.com"
    ALLOWED_HOSTS: str = "localhost,127.0.0.1,0.0.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql://arketic:arketic_dev_password@postgres:5432/arketic_dev"
    REDIS_URL: str = "redis://redis:6379/0"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 0
    
    # AI Service APIs
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    
    # Vector Databases
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_ENVIRONMENT: str = "us-east1-gcp"
    CHROMA_HOST: Optional[str] = None
    CHROMA_PORT: Optional[int] = None
    CHROMA_PERSIST_PATH: str = "/tmp/chroma"
    WEAVIATE_URL: Optional[str] = None
    WEAVIATE_API_KEY: Optional[str] = None
    QDRANT_URL: Optional[str] = None
    QDRANT_API_KEY: Optional[str] = None
    
    # Local AI Models
    OLLAMA_BASE_URL: Optional[str] = None
    LOCAL_MODEL_PATH: str = "/models"
    ENABLE_LOCAL_MODELS: bool = False
    
    # File Storage
    UPLOAD_DIR: str = "/tmp/uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_FILE_TYPES: str = "pdf,docx,doc,txt,md,html,xlsx,xls,csv,json,xml,png,jpg,jpeg,gif,bmp,tiff,mp3,wav,flac,m4a,mp4,avi,mov,wmv,eml,msg"
    
    # Cost Management
    DEFAULT_COST_BUDGET: float = 100.0
    COST_ALERT_THRESHOLDS: str = "0.5,0.8,0.9,1.0"
    ENABLE_COST_TRACKING: bool = True
    
    # Security Settings
    ENABLE_PROMPT_INJECTION_DETECTION: bool = True
    ENABLE_PII_DETECTION: bool = True
    ENABLE_CONTENT_FILTERING: bool = True
    MAX_PROMPT_LENGTH: int = 10000
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 60
    RATE_LIMIT_TOKENS_PER_MINUTE: int = 50000
    
    # Streaming
    WEBSOCKET_TIMEOUT: int = 300
    MAX_CONCURRENT_STREAMS: int = 100
    STREAM_CHUNK_SIZE: int = 50
    
    # Workflow Automation
    MAX_WORKFLOW_EXECUTION_TIME: int = 3600  # 1 hour
    MAX_CONCURRENT_WORKFLOWS: int = 50
    WORKFLOW_RETRY_ATTEMPTS: int = 3
    
    # Monitoring
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    HEALTH_CHECK_INTERVAL: int = 30
    
    # Performance
    RESPONSE_CACHE_TTL: int = 3600  # 1 hour
    EMBEDDING_CACHE_SIZE: int = 10000
    PROMPT_CACHE_SIZE: int = 1000
    
    # Email (for notifications)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: Optional[str] = None
    
    # Webhooks
    WEBHOOK_SECRET: Optional[str] = None
    WEBHOOK_TIMEOUT: int = 30
    
    # External Integrations
    SLACK_WEBHOOK_URL: Optional[str] = None
    DISCORD_WEBHOOK_URL: Optional[str] = None
    
    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == Environment.DEVELOPMENT
    
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Get allowed origins as a list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    @property
    def allowed_hosts_list(self) -> List[str]:
        """Get allowed hosts as a list"""
        return [host.strip() for host in self.ALLOWED_HOSTS.split(",") if host.strip()]
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        """Get allowed file types as a list"""
        return [ext.strip().lower() for ext in self.ALLOWED_FILE_TYPES.split(",") if ext.strip()]
    
    @property
    def cost_alert_thresholds_list(self) -> List[float]:
        """Get cost alert thresholds as a list"""
        return [float(x.strip()) for x in self.COST_ALERT_THRESHOLDS.split(",") if x.strip()]
    
    @property
    def database_config(self) -> Dict[str, Any]:
        """Get database configuration"""
        return {
            "url": self.DATABASE_URL,
            "pool_size": self.DB_POOL_SIZE,
            "max_overflow": self.DB_MAX_OVERFLOW,
            "echo": self.is_development,
        }
    
    @property
    def redis_config(self) -> Dict[str, Any]:
        """Get Redis configuration"""
        return {
            "url": self.REDIS_URL,
            "encoding": "utf-8",
            "decode_responses": True,
        }
    
    @property
    def ai_providers_config(self) -> Dict[str, Dict[str, Any]]:
        """Get AI providers configuration"""
        config = {}
        
        if self.OPENAI_API_KEY:
            config["openai"] = {
                "api_key": self.OPENAI_API_KEY,
                "models": ["gpt-4-turbo", "gpt-4o", "gpt-3.5-turbo"],
                "embedding_models": ["text-embedding-3-small", "text-embedding-3-large"]
            }
        
        if self.ANTHROPIC_API_KEY:
            config["anthropic"] = {
                "api_key": self.ANTHROPIC_API_KEY,
                "models": ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]
            }
        
        if self.GROQ_API_KEY:
            config["groq"] = {
                "api_key": self.GROQ_API_KEY,
                "models": ["llama3-70b-8192", "mixtral-8x7b-32768"]
            }
        
        if self.OLLAMA_BASE_URL and self.ENABLE_LOCAL_MODELS:
            config["ollama"] = {
                "base_url": self.OLLAMA_BASE_URL,
                "models": ["llama3:8b", "codellama:13b", "mistral:7b"]
            }
        
        return config
    
    @property
    def vector_stores_config(self) -> Dict[str, Dict[str, Any]]:
        """Get vector stores configuration"""
        config = {}
        
        if self.PINECONE_API_KEY:
            config["pinecone"] = {
                "api_key": self.PINECONE_API_KEY,
                "environment": self.PINECONE_ENVIRONMENT
            }
        
        if self.CHROMA_HOST and self.CHROMA_PORT:
            config["chroma"] = {
                "host": self.CHROMA_HOST,
                "port": self.CHROMA_PORT
            }
        else:
            config["chroma"] = {
                "persist_path": self.CHROMA_PERSIST_PATH
            }
        
        if self.WEAVIATE_URL:
            config["weaviate"] = {
                "url": self.WEAVIATE_URL,
                "api_key": self.WEAVIATE_API_KEY
            }
        
        if self.QDRANT_URL:
            config["qdrant"] = {
                "url": self.QDRANT_URL,
                "api_key": self.QDRANT_API_KEY
            }
        
        return config
    
    @property
    def security_config(self) -> Dict[str, Any]:
        """Get security configuration"""
        return {
            "prompt_injection_detection": self.ENABLE_PROMPT_INJECTION_DETECTION,
            "pii_detection": self.ENABLE_PII_DETECTION,
            "content_filtering": self.ENABLE_CONTENT_FILTERING,
            "max_prompt_length": self.MAX_PROMPT_LENGTH,
            "rate_limits": {
                "requests_per_minute": self.RATE_LIMIT_REQUESTS_PER_MINUTE,
                "tokens_per_minute": self.RATE_LIMIT_TOKENS_PER_MINUTE
            }
        }
    
    def get_model_config(self, provider: str) -> Optional[Dict[str, Any]]:
        """Get configuration for specific AI provider"""
        return self.ai_providers_config.get(provider)
    
    def get_vector_store_config(self, store_type: str) -> Optional[Dict[str, Any]]:
        """Get configuration for specific vector store"""
        return self.vector_stores_config.get(store_type)
    
    class Config:
        env_file = [".env.local", ".env"]
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = 'ignore'  # Allow extra environment variables


# Global settings instance
settings = Settings()


# Environment-specific configurations
def get_cors_config():
    """Get CORS configuration based on environment with WebSocket support"""
    if settings.is_production:
        return {
            "allow_origins": settings.allowed_origins_list,
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
        }
    else:
        return {
            "allow_origins": ["*"],
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
        }


def get_logging_config():
    """Get logging configuration"""
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
            "structured": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(message)s",
            },
        },
        "handlers": {
            "default": {
                "formatter": "structured" if settings.is_development else "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": settings.LOG_LEVEL.value,
            "handlers": ["default"],
        },
        "loggers": {
            "uvicorn": {
                "level": "INFO",
                "handlers": ["default"],
                "propagate": False,
            },
            "sqlalchemy.engine": {
                "level": "WARNING" if settings.is_production else "INFO",
                "handlers": ["default"],
                "propagate": False,
            },
        },
    }


# Validation functions
def validate_configuration():
    """Validate critical configuration settings"""
    errors = []
    
    # Check file upload directory
    upload_dir = settings.UPLOAD_DIR
    if not os.path.exists(upload_dir):
        try:
            os.makedirs(upload_dir, exist_ok=True)
        except Exception as e:
            errors.append(f"Cannot create upload directory {upload_dir}: {e}")
    
    # Check production-specific settings
    if settings.is_production:
        if "dev-secret-key" in settings.SECRET_KEY:
            errors.append("SECRET_KEY must be changed in production")
        
        if settings.DEBUG:
            errors.append("DEBUG should be False in production")
        
        if "*" in settings.ALLOWED_ORIGINS:
            errors.append("ALLOWED_ORIGINS should not include '*' in production")
    
    if errors:
        raise ValueError(f"Configuration validation failed:\n" + "\n".join(f"- {error}" for error in errors))


# Initialize and validate configuration
try:
    validate_configuration()
except ValueError as e:
    if settings.is_production:
        raise e
    else:
        print(f"Configuration warning: {e}")


# Legacy support for get_settings()
def get_settings():
    """Get settings instance for backward compatibility"""
    return settings


# Export commonly used settings
__all__ = [
    "settings",
    "Environment",
    "LogLevel",
    "get_cors_config",
    "get_logging_config",
    "validate_configuration",
    "get_settings"
]