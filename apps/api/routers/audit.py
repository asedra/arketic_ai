"""
Audit router for system activity logging and monitoring
Provides endpoints for querying audit logs and statistics
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.dependencies import get_current_user_dict, require_admin
from services.audit_service import audit_service, AuditEventType, AuditSeverity

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models
class AuditLogResponse(BaseModel):
    """Response model for audit log entries"""
    id: str
    event_type: str
    severity: str
    user_id: Optional[str]
    resource_id: Optional[str]
    resource_type: Optional[str]
    details: Dict[str, Any]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: str


class AuditStatisticsResponse(BaseModel):
    """Response model for audit statistics"""
    period: Dict[str, str]
    event_counts: Dict[str, int]
    severity_counts: Dict[str, int]
    top_users: List[Dict[str, Any]]
    total_events: int


# API Endpoints
@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_date: Optional[datetime] = Query(None, description="Start date for logs"),
    end_date: Optional[datetime] = Query(None, description="End date for logs"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Get audit logs for the current user"""
    
    try:
        user_id = current_user["user_id"]
        
        # Parse event type if provided
        event_type_enum = None
        if event_type:
            try:
                event_type_enum = AuditEventType(event_type)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid event type: {event_type}"
                )
        
        # Parse severity if provided
        severity_enum = None
        if severity:
            try:
                severity_enum = AuditSeverity(severity)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid severity: {severity}"
                )
        
        # Query audit logs
        logs = await audit_service.query_events(
            user_id=user_id,
            event_type=event_type_enum,
            severity=severity_enum,
            start_time=start_date,
            end_time=end_date,
            resource_type=resource_type,
            limit=limit
        )
        
        return [AuditLogResponse(**log) for log in logs]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit logs"
        )


@router.get("/logs/all", response_model=List[AuditLogResponse])
async def get_all_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    start_date: Optional[datetime] = Query(None, description="Start date for logs"),
    end_date: Optional[datetime] = Query(None, description="End date for logs"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    current_user: Dict[str, Any] = Depends(require_admin),  # Admin only
    session: AsyncSession = Depends(get_db)
):
    """Get all audit logs (admin only)"""
    
    try:
        # Parse event type if provided
        event_type_enum = None
        if event_type:
            try:
                event_type_enum = AuditEventType(event_type)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid event type: {event_type}"
                )
        
        # Parse severity if provided
        severity_enum = None
        if severity:
            try:
                severity_enum = AuditSeverity(severity)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid severity: {severity}"
                )
        
        # Query audit logs
        logs = await audit_service.query_events(
            user_id=user_id,
            event_type=event_type_enum,
            severity=severity_enum,
            start_time=start_date,
            end_time=end_date,
            resource_type=resource_type,
            limit=limit
        )
        
        return [AuditLogResponse(**log) for log in logs]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get all audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit logs"
        )


@router.get("/statistics", response_model=AuditStatisticsResponse)
async def get_audit_statistics(
    days: int = Query(30, ge=1, le=365, description="Number of days for statistics"),
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Get audit statistics for the current user"""
    
    try:
        user_id = current_user["user_id"]
        
        # Get statistics
        stats = await audit_service.get_statistics(
            user_id=user_id,
            days=days
        )
        
        return AuditStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get audit statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit statistics"
        )


@router.get("/statistics/all", response_model=AuditStatisticsResponse)
async def get_all_audit_statistics(
    days: int = Query(30, ge=1, le=365, description="Number of days for statistics"),
    current_user: Dict[str, Any] = Depends(require_admin),  # Admin only
    session: AsyncSession = Depends(get_db)
):
    """Get system-wide audit statistics (admin only)"""
    
    try:
        # Get statistics for all users
        stats = await audit_service.get_statistics(
            user_id=None,  # None means all users
            days=days
        )
        
        return AuditStatisticsResponse(**stats)
        
    except Exception as e:
        logger.error(f"Failed to get all audit statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve audit statistics"
        )


@router.post("/cleanup")
async def cleanup_old_audit_logs(
    retention_days: int = Query(180, ge=30, le=365, description="Days to retain audit logs"),
    current_user: Dict[str, Any] = Depends(require_admin),  # Admin only
    session: AsyncSession = Depends(get_db)
):
    """Clean up old audit logs (admin only)"""
    
    try:
        deleted_count = await audit_service.cleanup_old_events(retention_days)
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Deleted {deleted_count} audit log entries older than {retention_days} days"
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup audit logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup audit logs"
        )


@router.get("/event-types")
async def get_audit_event_types(
    current_user: Dict[str, Any] = Depends(get_current_user_dict),
    session: AsyncSession = Depends(get_db)
):
    """Get list of available audit event types"""
    
    try:
        event_types = [
            {
                "value": event_type.value,
                "description": event_type.value.replace("_", " ").title()
            }
            for event_type in AuditEventType
        ]
        
        severities = [
            {
                "value": severity.value,
                "description": severity.value.title()
            }
            for severity in AuditSeverity
        ]
        
        return {
            "event_types": event_types,
            "severities": severities
        }
        
    except Exception as e:
        logger.error(f"Failed to get event types: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve event types"
        )