"""
Routers package for Arketic AI Backend
API route handlers for different feature areas
"""

from . import auth, users, health, organization, compliance, people, chat, settings

__all__ = [
    "auth",
    "users", 
    "health",
    "organization",
    "compliance",
    "people",
    "chat",
    "settings"
]