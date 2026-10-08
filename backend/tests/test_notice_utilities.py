import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import pymupdf
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_current_user
from app.database.session import Base, get_db
from app.main import app
from app.models.notice import Document, DocumentChunk, Notice, NoticeRead
from app.models.user import User, UserRole
from app.services.notice_service import seed_demo_documents, seed_demo_notices


class StudentNoticeUtilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.teacher = User(
            name="Dr. Sharma",
            email="teacher@utilities.invalid",
            password_hash="unused",
            role=UserRole.teacher,
        )
        self.student_a = User(
            name="Ananya",
            email="student.a@utilities.invalid",
            password_hash="unused",
            role=UserRole.student,
            department="CSE",
            year=3,
            section="A",
            courses=["DBMS"],
        )
        self.student_b = User(
            name="Rahul",
            email="student.b@utilities.invalid",
            password_hash="unused",
            role=UserRole.student,
            department="CSE",
            year=3,
            section="B",
            courses=["DBMS"],
        )
        self.db.add_all([self.teacher, self.student_a, self.student_b])
        self.db.flush()

        now = datetime.now(timezone.utc)
        self.near_deadline = self._notice(
            self.teacher.id,
            "Section A DBMS due soon",
            section="A",
            deadline=date.today() + timedelta(days=1),
            created_at=now - timedelta(days=1),
        )
        self.later_deadline = self._notice(
            self.teacher.id,
            "Section A DBMS later",
            section="A",
            deadline=date.today() + timedelta(days=5),
            created_at=now - timedelta(days=2),
        )
        self.section_b_notice = self._notice(
            self.teacher.id,
            "Section B DBMS announcement",
            section="B",
            deadline=date.today() + timedelta(days=2),
            created_at=now - timedelta(days=1),
        )
        self.old_notice = self._notice(
            self.teacher.id,
            "Old Section A update",
            section="A",
            deadline=None,
            created_at=now - timedelta(days=8),
        )
        self.department_notice = self._notice(
            self.teacher.id,
            "CSE-wide update",
            section=None,
            deadline=None,
            created_at=now,
        )
        self.db.add_all([
            self.near_deadline,
            self.later_deadline,
            self.section_b_notice,
            self.old_notice,
            self.department_notice,
        ])
        self.db.commit()

    def _notice(self, teacher_id, title, section, deadline, created_at):
        return Notice(
            title=title,
            description=f"Details for {title}",
            created_by=teacher_id,
            section=section,
            department="CSE",
            year=3,
            course="DBMS",
            deadline=deadline,
            created_at=created_at,
            tags=[],
        )

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    def _client_as(self, user):
        def override_db():
            yield self.db

        def override_current_user():
            return user

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = override_current_user
        return TestClient(app)

    def test_upcoming_deadlines_are_sorted_and_audience_filtered(self) -> None:
        response = self._client_as(self.student_a).get(
            f"/api/notices/student/{self.student_a.id}/upcoming-deadlines"
        )

        self.assertEqual(response.status_code, 200)
        notices = response.json()
        self.assertEqual(
            [notice["id"] for notice in notices],
            [self.near_deadline.id, self.later_deadline.id],
        )
        self.assertNotIn(self.section_b_notice.id, {notice["id"] for notice in notices})

    def test_recent_updates_cover_last_seven_days_and_are_audience_filtered(self) -> None:
        response = self._client_as(self.student_a).get(
            f"/api/notices/student/{self.student_a.id}/recent-updates"
        )

        self.assertEqual(response.status_code, 200)
        notice_ids = {notice["id"] for notice in response.json()}
        self.assertIn(self.near_deadline.id, notice_ids)
        self.assertIn(self.department_notice.id, notice_ids)
        self.assertNotIn(self.old_notice.id, notice_ids)
        self.assertNotIn(self.section_b_notice.id, notice_ids)

    def test_unread_updates_and_mark_read_are_student_specific(self) -> None:
        client_a = self._client_as(self.student_a)
        unread_response = client_a.get(
            f"/api/notices/student/{self.student_a.id}/unread-updates"
        )
        self.assertEqual(unread_response.status_code, 200)
        initially_unread = {notice["id"] for notice in unread_response.json()}
        self.assertIn(self.near_deadline.id, initially_unread)
        self.assertNotIn(self.section_b_notice.id, initially_unread)

        mark_response = client_a.post(f"/api/notices/{self.near_deadline.id}/read")
        self.assertEqual(mark_response.status_code, 200)
        self.assertEqual(mark_response.json(), {"notice_id": self.near_deadline.id, "status": "read"})
        client_a.post(f"/api/notices/{self.near_deadline.id}/read")

        remaining = client_a.get(
            f"/api/notices/student/{self.student_a.id}/unread-updates"
        )
        remaining_ids = {notice["id"] for notice in remaining.json()}
        self.assertNotIn(self.near_deadline.id, remaining_ids)
        self.assertEqual(
            len(
                list(
                    self.db.scalars(
                        select(NoticeRead).where(
                            NoticeRead.student_id == self.student_a.id,
                            NoticeRead.notice_id == self.near_deadline.id,
                        )
                    )
                )
            ),
            1,
        )

        student_b_unread = self._client_as(self.student_b).get(
            f"/api/notices/student/{self.student_b.id}/unread-updates"
        )
        self.assertIn(
            self.department_notice.id,
            {notice["id"] for notice in student_b_unread.json()},
        )

    def test_student_cannot_request_or_mark_another_students_notice(self) -> None:
        client_a = self._client_as(self.student_a)
        wrong_student_id = client_a.get(
            f"/api/notices/student/{self.student_b.id}/upcoming-deadlines"
        )
        self.assertEqual(wrong_student_id.status_code, 403)

        client_b = self._client_as(self.student_b)
        cannot_mark = client_b.post(f"/api/notices/{self.near_deadline.id}/read")
        self.assertEqual(cannot_mark.status_code, 404)
        self.assertEqual(
            self.db.scalar(
                select(NoticeRead).where(
                    NoticeRead.student_id == self.student_b.id,
                    NoticeRead.notice_id == self.near_deadline.id,
                )
            ),
            None,
        )

    def test_student_feed_and_publication_list_require_the_matching_role(self) -> None:
        student_client = self._client_as(self.student_a)
        own_feed = student_client.get(f"/api/notices/student/{self.student_a.id}")
        other_feed = student_client.get(f"/api/notices/student/{self.student_b.id}")
        publication_list = student_client.get("/api/notices")

        self.assertEqual(own_feed.status_code, 200)
        self.assertEqual(other_feed.status_code, 403)
        self.assertEqual(publication_list.status_code, 403)

        teacher_client = self._client_as(self.teacher)
        self.assertEqual(teacher_client.get("/api/notices").status_code, 200)

    def test_notice_access_respects_audience_and_teacher_ownership(self) -> None:
        student_client = self._client_as(self.student_b)
        hidden_notice = student_client.get(f"/api/notices/{self.near_deadline.id}")
        self.assertEqual(hidden_notice.status_code, 404)

        teacher_client = self._client_as(self.teacher)
        forged_creator = teacher_client.post(
            "/api/notices",
            json={
                "title": "Forged notice",
                "description": "This should not be published.",
                "created_by": self.student_a.id,
                "department": "CSE",
            },
        )
        self.assertEqual(forged_creator.status_code, 403)

    def test_institutional_document_access_cannot_be_impersonated(self) -> None:
        document = Document(
            filename="assignment.pdf",
            notice_id=self.near_deadline.id,
            uploaded_by=self.teacher.id,
            processing_status="ready",
            storage_path="/tmp/assignment.pdf",
        )
        self.db.add(document)
        self.db.commit()

        student_a_client = self._client_as(self.student_a)
        own_document = student_a_client.get(
            f"/api/documents/{document.id}",
            params={"student_id": self.student_a.id},
        )
        self.assertEqual(own_document.status_code, 200)

        student_b_client = self._client_as(self.student_b)
        forged_student_id = student_b_client.get(
            f"/api/documents/{document.id}",
            params={"student_id": self.student_a.id},
        )
        hidden_audience_document = student_b_client.get(
            f"/api/documents/{document.id}",
            params={"student_id": self.student_b.id},
        )
        self.assertEqual(forged_student_id.status_code, 404)
        self.assertEqual(hidden_audience_document.status_code, 404)

    def test_notice_document_preview_is_inline_and_audience_protected(self) -> None:
        with TemporaryDirectory() as directory:
            pdf_path = Path(directory) / "assignment.pdf"
            pdf = pymupdf.open()
            page = pdf.new_page()
            page.insert_text((72, 72), "Official assignment instructions")
            pdf.save(pdf_path)
            pdf.close()

            document = Document(
                filename="assignment.pdf",
                notice_id=self.near_deadline.id,
                uploaded_by=self.teacher.id,
                processing_status="ready",
                storage_path=str(pdf_path),
            )
            self.db.add(document)
            self.db.commit()

            student_a_response = self._client_as(self.student_a).get(
                f"/api/notices/{self.near_deadline.id}/document"
            )
            student_b_response = self._client_as(self.student_b).get(
                f"/api/notices/{self.near_deadline.id}/document"
            )

        self.assertEqual(student_a_response.status_code, 200)
        self.assertEqual(student_a_response.headers["content-type"], "application/pdf")
        self.assertIn("inline", student_a_response.headers["content-disposition"])
        self.assertTrue(student_a_response.content.startswith(b"%PDF-"))
        self.assertEqual(student_b_response.status_code, 404)

    def test_seeded_notice_pdfs_are_created_once_and_chunked(self) -> None:
        demo_teacher = User(
            name="Demo Teacher",
            email="teacher@edupulse.demo",
            password_hash="unused",
            role=UserRole.teacher,
        )
        self.db.add(demo_teacher)
        self.db.commit()

        with TemporaryDirectory() as directory:
            with patch(
                "app.services.notice_service.SEED_DOCUMENT_DIRECTORY",
                Path(directory),
            ):
                seed_demo_notices(self.db)
                seed_demo_documents(self.db)
                first_documents = list(self.db.scalars(select(Document)))
                first_chunk_count = self.db.query(DocumentChunk).count()
                seed_demo_documents(self.db)
                second_documents = list(self.db.scalars(select(Document)))

                self.assertEqual(len(first_documents), 3)
                self.assertEqual(len(second_documents), 3)
                self.assertGreater(first_chunk_count, 0)
                for document in first_documents:
                    self.assertEqual(document.processing_status, "ready")
                    self.assertTrue(Path(document.storage_path).is_file())
                    with pymupdf.open(document.storage_path) as pdf:
                        self.assertGreater(pdf.page_count, 0)
                    self.assertTrue(document.chunks)


if __name__ == "__main__":
    unittest.main()
