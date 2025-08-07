"""
Database types and utilities
"""

import uuid
from sqlalchemy import TypeDecorator, String, Text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID

# Database-agnostic UUID column type
class UUID(TypeDecorator):
    """UUID column type that works with both PostgreSQL and SQLite"""
    impl = String
    cache_ok = True
    
    def __init__(self, as_uuid=False):
        self.as_uuid = as_uuid
        super().__init__(length=36)
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            # Use PostgreSQL native UUID type
            return dialect.type_descriptor(PostgreSQLUUID(as_uuid=self.as_uuid))
        else:
            # Use String type for other databases
            return dialect.type_descriptor(String(36))
    
    def process_bind_param(self, value, dialect):
        if dialect.name == 'postgresql':
            # Let PostgreSQL native UUID handle this
            return value
        else:
            # For other databases, convert to string
            if value is None:
                return value
            elif isinstance(value, uuid.UUID):
                return str(value)
            elif isinstance(value, str):
                return value
            else:
                return str(value)
    
    def process_result_value(self, value, dialect):
        if dialect.name == 'postgresql':
            # PostgreSQL native UUID handles this
            return value
        else:
            # For other databases
            if value is None:
                return value
            elif self.as_uuid:
                try:
                    return uuid.UUID(value)
                except (ValueError, TypeError, AttributeError):
                    return str(value) if value else value
            else:
                return str(value) if value else value