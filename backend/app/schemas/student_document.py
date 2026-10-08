from datetime import datetime

from pydantic import BaseModel, ConfigDict


class StudentDocumentChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_document_id: int
    chunk_index: int
    text: str


class StudentDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    filename: str
    created_at: datetime
    processing_status: str
    chunks: list[StudentDocumentChunkResponse]
