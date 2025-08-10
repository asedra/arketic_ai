"""API endpoints for async embedding task management"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, status
from fastapi.responses import JSONResponse

from services.embedding_task_service import (
    embedding_task_service,
    TaskPriority,
    TaskStatus
)
from core.dependencies import get_current_user_dict
from schemas.embedding import (
    EmbeddingTaskRequest,
    EmbeddingTaskResponse,
    TaskProgressResponse,
    QueueStatusResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/embedding-tasks",
    tags=["Embedding Tasks"],
    responses={404: {"description": "Not found"}},
)


@router.post("/", response_model=EmbeddingTaskResponse)
async def create_embedding_task(
    request: EmbeddingTaskRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user_dict)
) -> EmbeddingTaskResponse:
    """
    Queue a document for async embedding generation.
    
    This endpoint creates a background task to process document embeddings
    asynchronously, allowing for handling of large documents without blocking.
    """
    try:
        task_id = await embedding_task_service.queue_embedding_task(
            document_id=request.document_id,
            knowledge_base_id=request.knowledge_base_id,
            content=request.content,
            metadata=request.metadata,
            priority=request.priority or TaskPriority.NORMAL,
            user_id=UUID(current_user["user_id"]),
            background_tasks=background_tasks
        )
        
        return EmbeddingTaskResponse(
            task_id=task_id,
            document_id=request.document_id,
            status=TaskStatus.PENDING,
            message="Task queued successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to create embedding task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create embedding task: {str(e)}"
        )


@router.get("/{task_id}", response_model=TaskProgressResponse)
async def get_task_progress(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict)
) -> TaskProgressResponse:
    """
    Get the progress and status of an embedding task.
    
    Returns detailed information about task progress including:
    - Current status (pending, processing, completed, failed)
    - Progress percentage
    - Number of chunks processed
    - Estimated time to completion
    - Any error messages
    """
    progress = await embedding_task_service.get_task_progress(task_id)
    
    if progress.get('status') == 'not_found':
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    
    return TaskProgressResponse(**progress)


@router.get("/{task_id}/status")
async def get_task_status(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict)
) -> Dict[str, Any]:
    """
    Get the full status data for an embedding task.
    
    Returns complete task information including internal metadata.
    """
    task_data = await embedding_task_service.get_task_status(task_id)
    
    if not task_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    
    return task_data


@router.post("/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user_dict)
) -> JSONResponse:
    """
    Cancel a pending or processing embedding task.
    
    Only tasks in PENDING or PROCESSING status can be cancelled.
    """
    success = await embedding_task_service.cancel_task(task_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task cannot be cancelled (not found or already completed)"
        )
    
    return JSONResponse(
        content={
            "message": f"Task {task_id} cancelled successfully",
            "task_id": task_id
        }
    )


@router.get("/queue/status", response_model=QueueStatusResponse)
async def get_queue_status(
    current_user: Dict[str, Any] = Depends(get_current_user_dict)
) -> QueueStatusResponse:
    """
    Get the overall status of the embedding task queue.
    
    Returns:
    - Queue size
    - Task counts by status
    - System capacity information
    """
    status = await embedding_task_service.get_queue_status()
    return QueueStatusResponse(**status)


@router.post("/batch")
async def create_batch_embedding_tasks(
    requests: list[EmbeddingTaskRequest],
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user_dict)
) -> Dict[str, Any]:
    """
    Queue multiple documents for async embedding generation.
    
    This endpoint allows batch submission of multiple documents for processing.
    Each document will be processed as a separate task.
    """
    task_ids = []
    
    for request in requests:
        try:
            task_id = await embedding_task_service.queue_embedding_task(
                document_id=request.document_id,
                knowledge_base_id=request.knowledge_base_id,
                content=request.content,
                metadata=request.metadata,
                priority=request.priority or TaskPriority.NORMAL,
                user_id=UUID(current_user["user_id"]),
                background_tasks=background_tasks
            )
            task_ids.append({
                "document_id": str(request.document_id),
                "task_id": task_id,
                "status": "queued"
            })
        except Exception as e:
            task_ids.append({
                "document_id": str(request.document_id),
                "error": str(e),
                "status": "failed"
            })
    
    return {
        "total": len(requests),
        "queued": len([t for t in task_ids if t.get("status") == "queued"]),
        "failed": len([t for t in task_ids if t.get("status") == "failed"]),
        "tasks": task_ids
    }