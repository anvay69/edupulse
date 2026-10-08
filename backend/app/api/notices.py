from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.database.session import get_db
from app.models.notice import Notice
from app.models.user import User, UserRole
from app.schemas.notice import NoticeCreate, NoticeReadResponse, NoticeResponse
from app.services.notice_service import (
    create_notice,
    get_notice,
    is_notice_relevant_to_student,
    list_recent_updates,
    list_notices,
    list_student_notices,
    list_unread_notices,
    list_upcoming_deadlines,
    mark_notice_as_read,
)

router = APIRouter(prefix="/notices", tags=["notices"])


@router.post("", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
def publish_notice(
    payload: NoticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoticeResponse:
    if current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can publish notices")
    if payload.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="A teacher can only publish notices as themselves")
    return create_notice(db, payload)


@router.get("", response_model=list[NoticeResponse])
def get_notices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notice]:
    if current_user.role != UserRole.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can view the publication list")
    return list_notices(db)


@router.get("/student/{student_id}", response_model=list[NoticeResponse])
def get_student_notices(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notice]:
    student = _get_authenticated_student(student_id, current_user)
    return list_student_notices(db, student)


def _get_authenticated_student(student_id: int, current_user: User) -> User:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can access student updates")
    if current_user.id != student_id:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own student updates",
        )
    return current_user


@router.get(
    "/student/{student_id}/upcoming-deadlines",
    response_model=list[NoticeResponse],
)
def get_upcoming_student_deadlines(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notice]:
    student = _get_authenticated_student(student_id, current_user)
    return list_upcoming_deadlines(db, student)


@router.get(
    "/student/{student_id}/recent-updates",
    response_model=list[NoticeResponse],
)
def get_recent_student_updates(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notice]:
    student = _get_authenticated_student(student_id, current_user)
    return list_recent_updates(db, student)


@router.get(
    "/student/{student_id}/unread-updates",
    response_model=list[NoticeResponse],
)
def get_unread_student_updates(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Notice]:
    student = _get_authenticated_student(student_id, current_user)
    return list_unread_notices(db, student)


@router.post(
    "/{notice_id}/read",
    response_model=NoticeReadResponse,
)
def mark_student_notice_read(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoticeReadResponse:
    if current_user.role != UserRole.student:
        raise HTTPException(status_code=403, detail="Only students can mark notices as read")
    notice = get_notice(db, notice_id)
    if notice is None or not is_notice_relevant_to_student(notice, current_user):
        raise HTTPException(status_code=404, detail="Notice not found")

    mark_notice_as_read(db, current_user, notice)
    return NoticeReadResponse(notice_id=notice.id)


@router.get("/{notice_id}", response_model=NoticeResponse)
def get_notice_by_id(
    notice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NoticeResponse:
    notice = get_notice(db, notice_id)
    if notice is None or (
        current_user.role == UserRole.student
        and not is_notice_relevant_to_student(notice, current_user)
    ) or (
        current_user.role == UserRole.teacher
        and notice.created_by != current_user.id
    ):
        raise HTTPException(status_code=404, detail="Notice not found")
    return notice
