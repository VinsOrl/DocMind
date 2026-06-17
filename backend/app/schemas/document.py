from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    original_name: str
    page_count: int
    chunk_count: int
    status: str
    file_size: Optional[int] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    session_count: int = 0

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
