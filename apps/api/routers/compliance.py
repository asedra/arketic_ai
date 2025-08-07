"""Compliance management endpoints"""

from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from core.dependencies import get_current_user_dict

router = APIRouter()

@router.get("/")
async def get_compliance_data(current_user: dict = Depends(get_current_user_dict)):
    """Get compliance data"""
    return {
        "overview": {
            "total_frameworks": 3,
            "compliance_score": 85,
            "last_audit": "2024-01-15T00:00:00Z",
            "next_audit": "2024-04-15T00:00:00Z"
        },
        "frameworks": [
            {
                "id": "iso-27001",
                "name": "ISO 27001",
                "status": "compliant",
                "score": 90,
                "requirements_met": 95,
                "total_requirements": 114
            },
            {
                "id": "gdpr",
                "name": "GDPR",
                "status": "compliant", 
                "score": 88,
                "requirements_met": 22,
                "total_requirements": 25
            },
            {
                "id": "soc2",
                "name": "SOC 2",
                "status": "in_progress",
                "score": 75,
                "requirements_met": 18,
                "total_requirements": 24
            }
        ]
    }

@router.get("/frameworks")
async def get_compliance_frameworks(current_user: dict = Depends(get_current_user_dict)) -> List[Dict[str, Any]]:
    """Get compliance frameworks"""
    return [
        {
            "id": "iso-27001",
            "name": "ISO 27001",
            "description": "Information security management system standard",
            "status": "compliant",
            "score": 90,
            "requirements": [
                {
                    "id": "4.1",
                    "title": "Understanding the organization and its context",
                    "status": "met",
                    "evidence": "Context analysis documented and reviewed"
                },
                {
                    "id": "4.2", 
                    "title": "Understanding the needs and expectations of interested parties",
                    "status": "met",
                    "evidence": "Stakeholder analysis completed"
                }
            ],
            "last_review": "2024-01-15T00:00:00Z",
            "next_review": "2024-04-15T00:00:00Z"
        },
        {
            "id": "gdpr",
            "name": "General Data Protection Regulation",
            "description": "EU data protection and privacy regulation",
            "status": "compliant",
            "score": 88,
            "requirements": [
                {
                    "id": "art-6",
                    "title": "Lawfulness of processing",
                    "status": "met",
                    "evidence": "Legal basis documented for all data processing"
                },
                {
                    "id": "art-13",
                    "title": "Information to be provided where personal data are collected",
                    "status": "met",
                    "evidence": "Privacy policy implemented and accessible"
                }
            ],
            "last_review": "2024-01-10T00:00:00Z", 
            "next_review": "2024-04-10T00:00:00Z"
        }
    ]