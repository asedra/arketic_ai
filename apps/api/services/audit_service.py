"""Audit Service for Embedding Operations

This service provides comprehensive audit logging for:
- API key usage
- Embedding generation
- Provider fallbacks
- Security events
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from enum import Enum
import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import async_session_maker, get_db
from core.redis import get_redis

logger = logging.getLogger(__name__)


class AuditEventType(str, Enum):
    """Types of audit events"""
    API_KEY_CREATED = "api_key_created"
    API_KEY_UPDATED = "api_key_updated"
    API_KEY_DELETED = "api_key_deleted"
    API_KEY_USED = "api_key_used"
    API_KEY_FAILED = "api_key_failed"
    API_KEY_ROTATED = "api_key_rotated"
    
    EMBEDDING_REQUESTED = "embedding_requested"
    EMBEDDING_GENERATED = "embedding_generated"
    EMBEDDING_FAILED = "embedding_failed"
    
    PROVIDER_FALLBACK = "provider_fallback"
    RATE_LIMIT_HIT = "rate_limit_hit"
    QUOTA_EXCEEDED = "quota_exceeded"
    
    SECURITY_ALERT = "security_alert"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ACCESS_DENIED = "access_denied"


class AuditSeverity(str, Enum):
    """Severity levels for audit events"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AuditService:
    """Service for comprehensive audit logging"""
    
    def __init__(self):
        """Initialize the audit service"""
        self.buffer = []
        self.buffer_size = 100
        self.flush_interval = 10  # seconds
        self.last_flush = datetime.utcnow()
        
    async def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """Log an audit event"""
        
        event_id = str(uuid4())
        event_data = {
            "id": event_id,
            "type": event_type,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "resource_id": resource_id,
            "resource_type": resource_type,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        
        # Add to buffer
        self.buffer.append(event_data)
        
        # Store critical events immediately
        if severity in [AuditSeverity.ERROR, AuditSeverity.CRITICAL]:
            await self._store_event(event_data)
            
            # Send alert for critical events
            if severity == AuditSeverity.CRITICAL:
                await self._send_alert(event_data)
        
        # Flush buffer if needed
        if len(self.buffer) >= self.buffer_size or \
           (datetime.utcnow() - self.last_flush).seconds >= self.flush_interval:
            await self.flush_buffer()
        
        # Log to application logger
        log_message = f"Audit: {event_type} - User: {user_id} - Resource: {resource_id}"
        if severity == AuditSeverity.ERROR:
            logger.error(log_message)
        elif severity == AuditSeverity.WARNING:
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        return event_id
    
    async def log_api_key_usage(
        self,
        user_id: str,
        provider: str,
        api_key_id: str,
        success: bool,
        error_message: Optional[str] = None,
        tokens_used: Optional[int] = None,
        cost: Optional[float] = None,
        ip_address: Optional[str] = None
    ):
        """Log API key usage event"""
        
        event_type = AuditEventType.API_KEY_USED if success else AuditEventType.API_KEY_FAILED
        severity = AuditSeverity.INFO if success else AuditSeverity.WARNING
        
        details = {
            "provider": provider,
            "api_key_id": api_key_id,
            "success": success,
            "tokens_used": tokens_used,
            "cost": cost
        }
        
        if error_message:
            details["error"] = error_message
        
        await self.log_event(
            event_type=event_type,
            user_id=user_id,
            resource_id=api_key_id,
            resource_type="api_key",
            details=details,
            severity=severity,
            ip_address=ip_address
        )
    
    async def log_embedding_operation(
        self,
        user_id: Optional[str],
        provider: str,
        model: str,
        text_count: int,
        token_count: int,
        success: bool,
        latency_ms: float,
        error_message: Optional[str] = None,
        fallback_reason: Optional[str] = None
    ):
        """Log embedding generation operation"""
        
        event_type = AuditEventType.EMBEDDING_GENERATED if success else AuditEventType.EMBEDDING_FAILED
        severity = AuditSeverity.INFO if success else AuditSeverity.ERROR
        
        details = {
            "provider": provider,
            "model": model,
            "text_count": text_count,
            "token_count": token_count,
            "success": success,
            "latency_ms": latency_ms
        }
        
        if error_message:
            details["error"] = error_message
        
        if fallback_reason:
            details["fallback_reason"] = fallback_reason
        
        await self.log_event(
            event_type=event_type,
            user_id=user_id,
            resource_type="embedding",
            details=details,
            severity=severity
        )
    
    async def log_provider_fallback(
        self,
        user_id: Optional[str],
        from_provider: str,
        to_provider: str,
        reason: str,
        error_message: Optional[str] = None
    ):
        """Log provider fallback event"""
        
        await self.log_event(
            event_type=AuditEventType.PROVIDER_FALLBACK,
            user_id=user_id,
            details={
                "from_provider": from_provider,
                "to_provider": to_provider,
                "reason": reason,
                "error": error_message
            },
            severity=AuditSeverity.WARNING
        )
    
    async def log_rate_limit(
        self,
        user_id: str,
        provider: str,
        limit_type: str,  # "requests" or "tokens"
        limit: int,
        current: int,
        ip_address: Optional[str] = None
    ):
        """Log rate limit hit"""
        
        await self.log_event(
            event_type=AuditEventType.RATE_LIMIT_HIT,
            user_id=user_id,
            details={
                "provider": provider,
                "limit_type": limit_type,
                "limit": limit,
                "current": current
            },
            severity=AuditSeverity.WARNING,
            ip_address=ip_address
        )
    
    async def log_security_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[str],
        details: Dict[str, Any],
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log security-related event"""
        
        severity = AuditSeverity.CRITICAL if event_type == AuditEventType.SUSPICIOUS_ACTIVITY \
                  else AuditSeverity.ERROR
        
        await self.log_event(
            event_type=event_type,
            user_id=user_id,
            details=details,
            severity=severity,
            ip_address=ip_address,
            user_agent=user_agent
        )
    
    async def flush_buffer(self):
        """Flush buffered events to database"""
        
        if not self.buffer:
            return
        
        events_to_store = self.buffer.copy()
        self.buffer.clear()
        self.last_flush = datetime.utcnow()
        
        try:
            async with async_session_maker() as session:
                for event in events_to_store:
                    await self._store_event_in_db(session, event)
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to flush audit buffer: {e}")
            # Re-add events to buffer on failure
            self.buffer.extend(events_to_store)
    
    async def _store_event(self, event_data: Dict[str, Any]):
        """Store a single event immediately"""
        
        try:
            async with async_session_maker() as session:
                await self._store_event_in_db(session, event_data)
                await session.commit()
        except Exception as e:
            logger.error(f"Failed to store audit event: {e}")
            
            # Fallback to Redis for critical events
            await self._store_in_redis(event_data)
    
    async def _store_event_in_db(self, session: AsyncSession, event_data: Dict[str, Any]):
        """Store event in database"""
        
        await session.execute(
            text("""
                INSERT INTO audit_logs
                (id, event_type, severity, user_id, resource_id, resource_type,
                 details, ip_address, user_agent, created_at)
                VALUES
                (:id, :type, :severity, :user_id, :resource_id, :resource_type,
                 :details, :ip_address, :user_agent, :timestamp)
            """),
            {
                "id": UUID(event_data["id"]),
                "type": event_data["type"],
                "severity": event_data["severity"],
                "user_id": UUID(event_data["user_id"]) if event_data.get("user_id") else None,
                "resource_id": event_data.get("resource_id"),
                "resource_type": event_data.get("resource_type"),
                "details": json.dumps(event_data.get("details", {})),
                "ip_address": event_data.get("ip_address"),
                "user_agent": event_data.get("user_agent"),
                "timestamp": datetime.fromisoformat(event_data["timestamp"])
            }
        )
    
    async def _store_in_redis(self, event_data: Dict[str, Any]):
        """Store event in Redis as fallback"""
        
        redis = get_redis()
        key = f"audit:fallback:{event_data['id']}"
        await redis.setex(
            key,
            7 * 24 * 3600,  # 7 days TTL
            json.dumps(event_data)
        )
        
        # Add to fallback list
        await redis.lpush("audit:fallback:list", event_data['id'])
    
    async def _send_alert(self, event_data: Dict[str, Any]):
        """Send alert for critical events"""
        
        alert_data = {
            "event_id": event_data["id"],
            "type": event_data["type"],
            "severity": event_data["severity"],
            "timestamp": event_data["timestamp"],
            "user_id": event_data.get("user_id"),
            "details": event_data.get("details", {})
        }
        
        # Queue alert for sending
        redis = get_redis()
        await redis.lpush(
            "alerts:queue",
            json.dumps(alert_data)
        )
        
        logger.critical(f"Critical audit event: {event_data['type']} - {event_data.get('details', {})}")
    
    async def query_events(
        self,
        user_id: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        severity: Optional[AuditSeverity] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        resource_type: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Query audit events"""
        
        conditions = []
        params = {"limit": limit}
        
        if user_id:
            conditions.append("user_id = :user_id")
            params["user_id"] = UUID(user_id)
        
        if event_type:
            conditions.append("event_type = :event_type")
            params["event_type"] = event_type
        
        if severity:
            conditions.append("severity = :severity")
            params["severity"] = severity
        
        if resource_type:
            conditions.append("resource_type = :resource_type")
            params["resource_type"] = resource_type
        
        if start_time:
            conditions.append("created_at >= :start_time")
            params["start_time"] = start_time
        
        if end_time:
            conditions.append("created_at <= :end_time")
            params["end_time"] = end_time
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        try:
            async with async_session_maker() as session:
                result = await session.execute(
                    text(f"""
                        SELECT id, event_type, severity, user_id, resource_id,
                               resource_type, details, ip_address, user_agent, created_at
                        FROM audit_logs
                        WHERE {where_clause}
                        ORDER BY created_at DESC
                        LIMIT :limit
                    """),
                    params
                )
                
                events = []
                for row in result.fetchall():
                    events.append({
                        "id": str(row[0]),
                        "event_type": row[1],
                        "severity": row[2],
                        "user_id": str(row[3]) if row[3] else None,
                        "resource_id": row[4],
                        "resource_type": row[5],
                        "details": json.loads(row[6]) if row[6] else {},
                        "ip_address": row[7],
                        "user_agent": row[8],
                        "created_at": row[9].isoformat() if row[9] else None
                    })
                
                return events
                
        except Exception as e:
            logger.error(f"Failed to query audit events: {e}")
            return []
    
    async def get_statistics(
        self,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get audit statistics"""
        
        start_time = datetime.utcnow() - timedelta(days=days)
        
        try:
            async with async_session_maker() as session:
                # Base condition
                base_condition = "created_at >= :start_time"
                params = {"start_time": start_time}
                
                if user_id:
                    base_condition += " AND user_id = :user_id"
                    params["user_id"] = UUID(user_id)
                
                # Get event counts by type
                result = await session.execute(
                    text(f"""
                        SELECT event_type, COUNT(*) as count
                        FROM audit_logs
                        WHERE {base_condition}
                        GROUP BY event_type
                    """),
                    params
                )
                
                event_counts = {row[0]: row[1] for row in result.fetchall()}
                
                # Get event counts by severity
                result = await session.execute(
                    text(f"""
                        SELECT severity, COUNT(*) as count
                        FROM audit_logs
                        WHERE {base_condition}
                        GROUP BY severity
                    """),
                    params
                )
                
                severity_counts = {row[0]: row[1] for row in result.fetchall()}
                
                # Get top users
                result = await session.execute(
                    text(f"""
                        SELECT user_id, COUNT(*) as count
                        FROM audit_logs
                        WHERE {base_condition}
                        GROUP BY user_id
                        ORDER BY count DESC
                        LIMIT 10
                    """),
                    params
                )
                
                top_users = [
                    {"user_id": str(row[0]) if row[0] else None, "count": row[1]}
                    for row in result.fetchall()
                ]
                
                return {
                    "period": {
                        "start": start_time.isoformat(),
                        "end": datetime.utcnow().isoformat(),
                        "days": days
                    },
                    "event_counts": event_counts,
                    "severity_counts": severity_counts,
                    "top_users": top_users,
                    "total_events": sum(event_counts.values())
                }
                
        except Exception as e:
            logger.error(f"Failed to get audit statistics: {e}")
            return {}
    
    async def cleanup_old_events(self, retention_days: int = 180):
        """Clean up old audit events"""
        
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        try:
            async with async_session_maker() as session:
                result = await session.execute(
                    text("""
                        DELETE FROM audit_logs
                        WHERE created_at < :cutoff_date
                        RETURNING id
                    """),
                    {"cutoff_date": cutoff_date}
                )
                
                deleted_count = len(result.fetchall())
                await session.commit()
                
                logger.info(f"Cleaned up {deleted_count} old audit events")
                return deleted_count
                
        except Exception as e:
            logger.error(f"Failed to cleanup old audit events: {e}")
            return 0


# Singleton instance
audit_service = AuditService()