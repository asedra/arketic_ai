"""
Custom exception classes for the API
"""

from typing import Optional, Dict, Any


class BaseAPIException(Exception):
    """Base exception class for API errors"""
    
    def __init__(self, message: str, error_code: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(BaseAPIException):
    """Raised when validation fails"""
    
    def __init__(self, message: str, field: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="VALIDATION_ERROR", **kwargs)
        self.field = field


class NotFoundError(BaseAPIException):
    """Raised when a resource is not found"""
    
    def __init__(self, message: str = "Resource not found", resource_type: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="NOT_FOUND", **kwargs)
        self.resource_type = resource_type


class ConflictError(BaseAPIException):
    """Raised when there's a conflict (duplicate, constraint violation, etc.)"""
    
    def __init__(self, message: str, conflict_type: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="CONFLICT", **kwargs)
        self.conflict_type = conflict_type


class PermissionDeniedError(BaseAPIException):
    """Raised when user doesn't have required permissions"""
    
    def __init__(self, message: str = "Permission denied", required_permission: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="PERMISSION_DENIED", **kwargs)
        self.required_permission = required_permission


class AuthenticationError(BaseAPIException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Authentication failed", **kwargs):
        super().__init__(message, error_code="AUTHENTICATION_ERROR", **kwargs)


class RateLimitError(BaseAPIException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None, **kwargs):
        super().__init__(message, error_code="RATE_LIMIT_EXCEEDED", **kwargs)
        self.retry_after = retry_after


class ExternalServiceError(BaseAPIException):
    """Raised when external service call fails"""
    
    def __init__(self, message: str, service_name: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="EXTERNAL_SERVICE_ERROR", **kwargs)
        self.service_name = service_name


class DatabaseError(BaseAPIException):
    """Raised when database operation fails"""
    
    def __init__(self, message: str, operation: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="DATABASE_ERROR", **kwargs)
        self.operation = operation


class BusinessLogicError(BaseAPIException):
    """Raised when business logic validation fails"""
    
    def __init__(self, message: str, business_rule: Optional[str] = None, **kwargs):
        super().__init__(message, error_code="BUSINESS_LOGIC_ERROR", **kwargs)
        self.business_rule = business_rule