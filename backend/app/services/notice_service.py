import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pymupdf
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notice import Document, Notice, NoticeRead
from app.models.user import User, UserRole
from app.schemas.notice import NoticeCreate
from app.services.document_service import extract_pdf_text, store_document_chunks

SEED_DOCUMENT_DIRECTORY = Path(__file__).resolve().parents[2] / "sample_pdfs"


def create_notice(db: Session, notice_data: NoticeCreate) -> Notice:
    notice = Notice(**notice_data.model_dump())
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


def list_notices(db: Session) -> list[Notice]:
    return list(db.scalars(select(Notice).order_by(Notice.created_at.desc(), Notice.id.desc())))


def get_notice(db: Session, notice_id: int) -> Notice | None:
    return db.get(Notice, notice_id)


def _matches_category(target: str | int | None, student_value: str | int | None) -> bool:
    if target is None:
        return True
    if student_value is None:
        return False
    if isinstance(target, str) and target.strip().lower() == "all":
        return True
    return str(target).strip().casefold() == str(student_value).strip().casefold()


def is_notice_relevant_to_student(notice: Notice, student: User) -> bool:
    return (
        _matches_category(notice.department, student.department)
        and _matches_category(notice.year, student.year)
        and _matches_category(notice.section, student.section)
        and (
            notice.course is None
            or notice.course.strip().casefold() in {
                course.strip().casefold() for course in student.courses
            }
        )
    )


def list_student_notices(db: Session, student: User) -> list[Notice]:
    return [
        notice
        for notice in list_notices(db)
        if is_notice_relevant_to_student(notice, student)
    ]


def list_upcoming_deadlines(
    db: Session,
    student: User,
    today: date | None = None,
) -> list[Notice]:
    current_date = today or date.today()
    return sorted(
        (
            notice
            for notice in list_student_notices(db, student)
            if notice.deadline is not None and notice.deadline >= current_date
        ),
        key=lambda notice: (notice.deadline, notice.id),
    )


def list_recent_updates(
    db: Session,
    student: User,
    now: datetime | None = None,
) -> list[Notice]:
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    cutoff = current_time - timedelta(days=7)
    recent: list[Notice] = []
    for notice in list_student_notices(db, student):
        created_at = notice.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if cutoff <= created_at <= current_time:
            recent.append(notice)
    return sorted(recent, key=lambda notice: (notice.created_at, notice.id), reverse=True)


def list_unread_notices(db: Session, student: User) -> list[Notice]:
    relevant_notices = list_student_notices(db, student)
    if not relevant_notices:
        return []

    relevant_ids = {notice.id for notice in relevant_notices}
    read_ids = set(
        db.scalars(
            select(NoticeRead.notice_id).where(
                NoticeRead.student_id == student.id,
                NoticeRead.notice_id.in_(relevant_ids),
            )
        )
    )
    return [notice for notice in relevant_notices if notice.id not in read_ids]


def mark_notice_as_read(
    db: Session,
    student: User,
    notice: Notice,
) -> NoticeRead:
    read_status = db.scalar(
        select(NoticeRead).where(
            NoticeRead.student_id == student.id,
            NoticeRead.notice_id == notice.id,
        )
    )
    if read_status is None:
        read_status = NoticeRead(student_id=student.id, notice_id=notice.id)
        db.add(read_status)
        db.commit()
        db.refresh(read_status)
    return read_status


def seed_demo_notices(db: Session) -> None:
    seed_file = Path(__file__).resolve().parents[3] / "demo_notice_seed_data.json"
    demo_notices = json.loads(seed_file.read_text(encoding="utf-8"))

    for seed in demo_notices:
        teacher = db.scalar(
            select(User).where(
                User.email == seed["created_by_email"],
                User.role == UserRole.teacher,
            )
        )
        if teacher is None:
            continue

        seeded_notice = db.scalar(
            select(Notice).where(
                Notice.title == seed["title"],
                Notice.created_by == teacher.id,
            )
        )
        notice_data = {
            key: value
            for key, value in seed.items()
            if key not in {"created_by_email", "sample_pdf"}
        }
        notice_data["created_by"] = teacher.id
        notice_data["deadline"] = date.fromisoformat(seed["deadline"]) if seed.get("deadline") else None
        if isinstance(notice_data.get("year"), str) and notice_data["year"].strip().lower() == "all":
            notice_data["year"] = None
        for audience_field in ("department", "section", "course"):
            if (
                isinstance(notice_data.get(audience_field), str)
                and notice_data[audience_field].strip().lower() == "all"
            ):
                notice_data[audience_field] = None

        if seeded_notice is None:
            db.add(Notice(**notice_data))
        else:
            for audience_field in ("department", "year", "section", "course"):
                if getattr(seeded_notice, audience_field) == "all":
                    setattr(seeded_notice, audience_field, None)

    db.commit()


def _write_seed_pdf(path: Path, notice: Notice) -> None:
    audience = [
        value
        for value in (
            notice.department or "All departments",
            f"Year {notice.year}" if notice.year is not None else "All years",
            f"Section {notice.section}" if notice.section else "All sections",
        )
    ]
    lines = [
        notice.title,
        "EduPulse AI demonstration copy of this institutional notice.",
        f"Course: {notice.course or 'Not specified'}",
        f"Audience: {' / '.join(audience)}",
        f"Deadline: {notice.deadline.isoformat() if notice.deadline else 'Not specified'}",
        "",
        notice.description,
    ]
    content = "\n".join(lines)
    pdf = pymupdf.open()
    try:
        page = pdf.new_page()
        remaining = page.insert_textbox(
            pymupdf.Rect(54, 54, 540, 780),
            content,
            fontname="helv",
            fontsize=12,
            lineheight=1.5,
        )
        if remaining < 0:
            raise ValueError(f"Seed PDF content does not fit on one page: {path.name}")
        pdf.set_metadata({"title": notice.title, "author": "EduPulse AI demo"})
        pdf.save(path)
    finally:
        pdf.close()


def seed_demo_documents(db: Session) -> None:
    seed_file = Path(__file__).resolve().parents[3] / "demo_notice_seed_data.json"
    demo_notices = json.loads(seed_file.read_text(encoding="utf-8"))
    SEED_DOCUMENT_DIRECTORY.mkdir(parents=True, exist_ok=True)

    for seed in demo_notices:
        filename = seed.get("sample_pdf")
        if not filename:
            continue
        safe_filename = Path(filename).name
        if safe_filename != filename or not filename.lower().endswith(".pdf"):
            raise ValueError(f"Invalid sample PDF filename in seed data: {filename}")

        teacher = db.scalar(
            select(User).where(
                User.email == seed["created_by_email"],
                User.role == UserRole.teacher,
            )
        )
        if teacher is None:
            continue
        notice = db.scalar(
            select(Notice).where(
                Notice.title == seed["title"],
                Notice.created_by == teacher.id,
            )
        )
        if notice is None:
            continue
        existing = db.scalar(
            select(Document).where(Document.notice_id == notice.id)
        )
        if existing is not None:
            continue

        sample_path = SEED_DOCUMENT_DIRECTORY / filename
        if not sample_path.exists():
            _write_seed_pdf(sample_path, notice)
        with pymupdf.open(sample_path) as pdf:
            if not pdf.is_pdf or pdf.page_count == 0:
                raise ValueError(f"Seed document is not a valid PDF: {sample_path}")

        document = Document(
            filename=filename,
            notice_id=notice.id,
            uploaded_by=teacher.id,
            processing_status="processing",
            storage_path=str(sample_path),
        )
        db.add(document)
        db.flush()
        store_document_chunks(db, document, extract_pdf_text(sample_path))
