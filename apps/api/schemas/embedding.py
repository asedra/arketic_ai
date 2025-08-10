"""Pydantic schemas for embedding task management"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field

from services.embedding_task_service import TaskStatus, TaskPriority


class EmbeddingTaskRequest(BaseModel):
    """Request schema for creating an embedding task"""
    document_id: UUID = Field(..., description="ID of the document to process")
    knowledge_base_id: UUID = Field(..., description="ID of the knowledge base")
    content: str = Field(..., description="Document content to process")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    priority: Optional[TaskPriority] = Field(
        TaskPriority.NORMAL,
        description="Task priority level"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "knowledge_base_id": "456e7890-e89b-12d3-a456-426614174000",
                "content": "This is the document content to be processed...",
                "metadata": {"source": "pdf", "author": "John Doe"},
                "priority": "normal"
            }
        }


class EmbeddingTaskResponse(BaseModel):
    """Response schema for embedding task creation"""
    task_id: str = Field(..., description="Unique task identifier")
    document_id: UUID = Field(..., description="Document ID being processed")
    status: TaskStatus = Field(..., description="Current task status")
    message: str = Field(..., description="Status message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc123-def456-ghi789",
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "pending",
                "message": "Task queued successfully"
            }
        }


class TaskProgressResponse(BaseModel):
    """Response schema for task progress information"""
    task_id: str = Field(..., description="Unique task identifier")
    status: TaskStatus = Field(..., description="Current task status")
    progress: int = Field(..., description="Progress percentage (0-100)")
    processed_chunks: int = Field(0, description="Number of chunks processed")
    total_chunks: int = Field(0, description="Total number of chunks")
    eta: Optional[str] = Field(None, description="Estimated time of completion (ISO format)")
    created_at: Optional[str] = Field(None, description="Task creation time (ISO format)")
    started_at: Optional[str] = Field(None, description="Task start time (ISO format)")
    completed_at: Optional[str] = Field(None, description="Task completion time (ISO format)")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    retry_count: int = Field(0, description="Number of retry attempts")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc123-def456-ghi789",
                "status": "processing",
                "progress": 45,
                "processed_chunks": 45,
                "total_chunks": 100,
                "eta": "2024-01-01T12:30:00Z",
                "created_at": "2024-01-01T12:00:00Z",
                "started_at": "2024-01-01T12:01:00Z",
                "completed_at": None,
                "error_message": None,
                "retry_count": 0
            }
        }


class QueueStatusResponse(BaseModel):
    """Response schema for queue status information"""
    queue_size: int = Field(..., description="Number of tasks in queue")
    status_counts: Dict[str, int] = Field(
        ...,
        description="Count of tasks by status"
    )
    max_concurrent_tasks: int = Field(..., description="Maximum concurrent tasks allowed")
    active_tasks: int = Field(..., description="Number of currently active tasks")
    
    class Config:
        json_schema_extra = {
            "example": {
                "queue_size": 5,
                "status_counts": {
                    "pending": 3,
                    "processing": 2,
                    "completed": 10,
                    "failed": 1,
                    "cancelled": 0
                },
                "max_concurrent_tasks": 5,
                "active_tasks": 2
            }
        }