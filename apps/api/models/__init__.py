"""
Database models for Arketic AI Backend
SQLAlchemy models for users, organizations, chat, and more
"""

from .user import User, UserProfile, UserPreferences, UserApiKey, UserRole, UserStatus
from .organization import Organization, OrganizationMember, OrganizationRole, OrganizationStatus, SubscriptionTier, Person, PersonRole, PersonStatus
from .chat import Chat, ChatMessage, ChatParticipant, ChatType, MessageType, MessageStatus, ParticipantRole

# Import the Base class for external usage
from core.database import Base

__all__ = [
    # Base class
    "Base",
    
    # User models
    "User",
    "UserProfile", 
    "UserPreferences",
    "UserApiKey",
    "UserRole",
    "UserStatus",
    
    # Organization models
    "Organization",
    "OrganizationMember",
    "OrganizationRole",
    "OrganizationStatus",
    "SubscriptionTier",
    
    # People models
    "Person",
    "PersonRole",
    "PersonStatus",
    
    # Chat models
    "Chat",
    "ChatMessage",
    "ChatParticipant",
    "ChatType",
    "MessageType",
    "MessageStatus",
    "ParticipantRole",
]