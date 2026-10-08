from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    chunk_index: int
    text: str


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    notice_id: int
    uploaded_by: int
    created_at: datetime
    processing_status: str
    chunks: list[DocumentChunkResponse]
