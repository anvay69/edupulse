import re
from pathlib import Path

import pymupdf
from sqlalchemy.orm import Session

from app.models.notice import Document, DocumentChunk, StudentDocument, StudentDocumentChunk

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def extract_pdf_text(path: Path) -> str:
    with pymupdf.open(path) as pdf:
        return "\n".join(page.get_text() for page in pdf).strip()


def split_text_into_chunks(text: str) -> list[str]:
    normalized_text = re.sub(r"\s+", " ", text).strip()
    if not normalized_text:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(normalized_text):
        end = min(start + CHUNK_SIZE, len(normalized_text))
        if end < len(normalized_text):
            boundary = normalized_text.rfind(" ", start, end)
            if boundary > start:
                end = boundary

        chunk = normalized_text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end >= len(normalized_text):
            break
        start = max(end - CHUNK_OVERLAP, start + 1)

    return chunks


def store_document_chunks(db: Session, document: Document, text: str) -> None:
    document.chunks = [
        DocumentChunk(chunk_index=index, text=chunk)
        for index, chunk in enumerate(split_text_into_chunks(text))
    ]
    document.processing_status = "ready"
    db.commit()
    db.refresh(document)


def store_student_document_chunks(
    db: Session,
    document: StudentDocument,
    text: str,
) -> None:
    document.chunks = [
        StudentDocumentChunk(chunk_index=index, text=chunk)
        for index, chunk in enumerate(split_text_into_chunks(text))
    ]
    document.processing_status = "ready"
    db.commit()
    db.refresh(document)
