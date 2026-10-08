import re
from pathlib import Path
from uuid import uuid4

import pymupdf
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.session import get_db
from app.models.notice import Document, Notice, StudentDocument
from app.models.user import User, UserRole
from app.schemas.document import DocumentResponse
from app.schemas.student_document import StudentDocumentResponse
from app.services.document_service import (
    extract_pdf_text,
    store_document_chunks,
    store_student_document_chunks,
)
from app.services.notice_service import is_notice_relevant_to_student

router = APIRouter(tags=["documents"])
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads"
MAX_UPLOAD_SIZE = 20 * 1024 * 1024


def _safe_filename(filename: str | None) -> str:
    name = Path(filename or "document.pdf").name
    name = re.sub(r"[^A-Za-z0-9._ -]", "_", name).strip(" .")
    return (name or "document.pdf")[:255]


def _get_accessible_document(
    db: Session,
    document_id: int,
    student_id: int,
) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    student = db.get(User, student_id)
    if student is None or student.role != UserRole.student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not is_notice_relevant_to_student(document.notice, student):
        raise HTTPException(status_code=404, detail="Document not found")
    if document.processing_status != "ready":
        raise HTTPException(status_code=409, detail="Document is not ready")
    return document


@router.post(
    "/notices/{notice_id}/document",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_notice_document(
    notice_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    notice = db.get(Notice, notice_id)
    if notice is None:
        raise HTTPException(status_code=404, detail="Notice not found")

    if current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can attach documents")
    if notice.created_by != current_user.id:
        raise HTTPException(status_code=404, detail="Notice not found")

    filename = _safe_filename(file.filename)
    if (
        file.content_type != "application/pdf"
        or not filename.lower().endswith(".pdf")
    ):
        raise HTTPException(status_code=415, detail="Upload a PDF file")

    content = file.file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="PDF must be 20 MB or smaller")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="Uploaded file is not a valid PDF")

    existing_document = db.scalar(
        select(Document).where(Document.notice_id == notice.id)
    )
    if existing_document is not None:
        raise HTTPException(
            status_code=409,
            detail="This notice already has an attached document",
        )

    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    storage_path = UPLOAD_DIRECTORY / f"{uuid4().hex}.pdf"
    storage_path.write_bytes(content)

    document = Document(
        filename=filename,
        notice_id=notice.id,
        uploaded_by=current_user.id,
        processing_status="processing",
        storage_path=str(storage_path),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        extracted_text = extract_pdf_text(storage_path)
    except (pymupdf.FileDataError, ValueError) as error:
        document.processing_status = "failed"
        db.commit()
        raise HTTPException(
            status_code=422,
            detail="PDF was saved but its text could not be extracted",
        ) from error

    store_document_chunks(db, document, extracted_text)
    return document


@router.get("/notices/{notice_id}/document")
def view_notice_document(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    notice = db.get(Notice, notice_id)
    if notice is None:
        raise HTTPException(status_code=404, detail="Notice not found")

    if current_user.role == UserRole.student:
        if not is_notice_relevant_to_student(notice, current_user):
            raise HTTPException(status_code=404, detail="Notice not found")
    elif current_user.role == UserRole.teacher:
        if notice.created_by != current_user.id:
            raise HTTPException(status_code=404, detail="Notice not found")
    else:
        raise HTTPException(status_code=403, detail="You cannot view this document")

    document = db.scalar(
        select(Document).where(
            Document.notice_id == notice.id,
            Document.processing_status == "ready",
        )
    )
    if document is None:
        raise HTTPException(status_code=404, detail="No processed document is attached")
    path = Path(document.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Document file not found")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=document.filename,
        content_disposition_type="inline",
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document_metadata(
    document_id: int,
    student_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Document:
    if current_user.role != UserRole.student or current_user.id != student_id:
        raise HTTPException(status_code=404, detail="Document not found")
    return _get_accessible_document(db, document_id, student_id)


@router.get("/documents/{document_id}/file")
def download_document(
    document_id: int,
    student_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    if current_user.role != UserRole.student or current_user.id != student_id:
        raise HTTPException(status_code=404, detail="Document not found")
    document = _get_accessible_document(db, document_id, student_id)
    path = Path(document.storage_path)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Document file not found")
    return FileResponse(path, media_type="application/pdf", filename=document.filename)


workspace_router = APIRouter(prefix="/workspace/documents", tags=["student workspace"])
WORKSPACE_UPLOAD_DIRECTORY = UPLOAD_DIRECTORY / "workspace"


@workspace_router.post(
    "",
    response_model=StudentDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_student_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    student: User = Depends(get_current_user),
) -> StudentDocument:
    if student.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can upload workspace documents")

    filename = _safe_filename(file.filename)
    if file.content_type != "application/pdf" or not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF file")

    content = file.file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail="PDF must be 20 MB or smaller")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="Uploaded file is not a valid PDF")

    student_directory = WORKSPACE_UPLOAD_DIRECTORY / str(student.id)
    student_directory.mkdir(parents=True, exist_ok=True)
    storage_path = student_directory / f"{uuid4().hex}.pdf"
    storage_path.write_bytes(content)

    document = StudentDocument(
        student_id=student.id,
        filename=filename,
        processing_status="processing",
        storage_path=str(storage_path),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    try:
        extracted_text = extract_pdf_text(storage_path)
    except (pymupdf.FileDataError, ValueError) as error:
        document.processing_status = "failed"
        db.commit()
        raise HTTPException(
            status_code=422,
            detail="PDF was saved but its text could not be extracted",
        ) from error

    store_student_document_chunks(db, document, extracted_text)
    return document


@workspace_router.get(
    "/{student_id}",
    response_model=list[StudentDocumentResponse],
)
def get_student_workspace_documents(
    student_id: int,
    db: Session = Depends(get_db),
    current_student: User = Depends(get_current_user),
) -> list[StudentDocument]:
    if current_student.role != UserRole.student or current_student.id != student_id:
        raise HTTPException(status_code=404, detail="Student documents not found")
    return list(
        db.scalars(
            select(StudentDocument)
            .where(StudentDocument.student_id == current_student.id)
            .order_by(StudentDocument.created_at.desc(), StudentDocument.id.desc())
        )
    )
