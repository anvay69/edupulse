import unittest
from datetime import date
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.dependencies import get_current_user
from app.database.session import Base, get_db
from app.main import app
from app.models.notice import (
    ChatConversation,
    ChatMessage,
    Document,
    DocumentChunk,
    Notice,
    StudentDocument,
    StudentDocumentChunk,
)
from app.models.user import User, UserRole
from app.services.chat_service import answer_student_question, retrieve_relevant_chunks


class ChatRetrievalPermissionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

        teacher = User(
            name="Dr. Sharma",
            email="teacher@tests.invalid",
            password_hash="unused",
            role=UserRole.teacher,
        )
        self.student_a = User(
            name="Ananya",
            email="student.a@tests.invalid",
            password_hash="unused",
            role=UserRole.student,
            department="CSE",
            year=3,
            section="A",
            courses=["DBMS"],
        )
        self.student_b = User(
            name="Rahul",
            email="student.b@tests.invalid",
            password_hash="unused",
            role=UserRole.student,
            department="CSE",
            year=3,
            section="B",
            courses=["DBMS"],
        )
        self.db.add_all([teacher, self.student_a, self.student_b])
        self.db.flush()

        self.notice_a = Notice(
            title="DBMS Assignment 3",
            description="Complete the normalization assignment. The due date is October 14.",
            created_by=teacher.id,
            deadline=date(2026, 10, 14),
            department="CSE",
            year=3,
            section="A",
            course="DBMS",
            tags=["assignment"],
        )
        self.notice_b = Notice(
            title="Section B Lab Guide",
            description="The lab guide covers row-level locking.",
            created_by=teacher.id,
            department="CSE",
            year=3,
            section="B",
            course="DBMS",
            tags=["lab"],
        )
        self.db.add_all([self.notice_a, self.notice_b])
        self.db.flush()

        self.institutional_a = Document(
            filename="dbms-assignment.pdf",
            notice_id=self.notice_a.id,
            uploaded_by=teacher.id,
            processing_status="ready",
            storage_path="/unused/dbms-assignment.pdf",
        )
        self.institutional_b = Document(
            filename="section-b-locking-guide.pdf",
            notice_id=self.notice_b.id,
            uploaded_by=teacher.id,
            processing_status="ready",
            storage_path="/unused/section-b-locking-guide.pdf",
        )
        self.private_a = StudentDocument(
            student_id=self.student_a.id,
            filename="ananya-transaction-notes.pdf",
            processing_status="ready",
            storage_path="/unused/ananya-transaction-notes.pdf",
        )
        self.db.add_all([self.institutional_a, self.institutional_b, self.private_a])
        self.db.flush()
        self.db.add_all(
            [
                DocumentChunk(
                    document_id=self.institutional_a.id,
                    chunk_index=0,
                    text="Submit the normalization exercise. The due date is October 14.",
                ),
                DocumentChunk(
                    document_id=self.institutional_b.id,
                    chunk_index=0,
                    text="Section B lab guide explains row-level locking.",
                ),
                StudentDocumentChunk(
                    student_document_id=self.private_a.id,
                    chunk_index=0,
                    text="Transaction isolation levels prevent dirty reads.",
                ),
            ]
        )
        self.db.commit()

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.db.close()
        self.engine.dispose()

    @staticmethod
    def source_keys(chunks):
        return {
            (chunk.source.document_type, chunk.source.document_id)
            for chunk in chunks
        }

    def test_student_a_retrieves_authorized_institutional_notice_and_pdf(self) -> None:
        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_a,
            "When is DBMS Assignment 3 due?",
        )
        source_keys = self.source_keys(chunks)
        self.assertIn(("institutional_notice", self.notice_a.id), source_keys)
        self.assertIn(("institutional_document", self.institutional_a.id), source_keys)
        self.assertNotIn(("institutional_document", self.institutional_b.id), source_keys)

    def test_student_a_retrieves_private_workspace_document(self) -> None:
        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_a,
            "What do my notes say about transaction isolation?",
        )
        self.assertIn(("student_document", self.private_a.id), self.source_keys(chunks))

    def test_short_submit_question_retrieves_assignment_instead_of_unrelated_notice(self) -> None:
        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_a,
            "What do I need to submit?",
        )
        source_keys = self.source_keys(chunks)
        self.assertIn(("institutional_notice", self.notice_a.id), source_keys)
        self.assertIn(("institutional_document", self.institutional_a.id), source_keys)
        self.assertNotIn(("institutional_notice", self.notice_b.id), source_keys)

    def test_generic_summary_uses_only_current_students_private_document(self) -> None:
        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_a,
            "Summarize this document.",
        )

        self.assertTrue(chunks)
        self.assertEqual(
            self.source_keys(chunks),
            {("student_document", self.private_a.id)},
        )
        self.assertTrue(all("Transaction isolation" in chunk.text for chunk in chunks))

    def test_course_targeting_filters_notices_before_retrieval(self) -> None:
        other_course_notice = Notice(
            title="Operating Systems Project",
            description="Submit the Operating Systems project report.",
            created_by=self.notice_a.created_by,
            department="CSE",
            year=3,
            section="A",
            course="Operating Systems",
            tags=["project"],
        )
        self.db.add(other_course_notice)
        self.db.commit()

        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_a,
            "When is my Operating Systems project due?",
        )

        self.assertNotIn(
            ("institutional_notice", other_course_notice.id),
            self.source_keys(chunks),
        )

    def test_student_b_retrieves_authorized_section_b_document(self) -> None:
        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_b,
            "What does the Section B lab guide say about row-level locking?",
        )
        source_keys = self.source_keys(chunks)
        self.assertIn(("institutional_notice", self.notice_b.id), source_keys)
        self.assertIn(("institutional_document", self.institutional_b.id), source_keys)

    def test_deadline_query_matches_due_date_language_and_context_stays_authorized(self) -> None:
        with patch(
            "app.services.chat_service.generate_gemini_answer",
            return_value="October 14.",
        ) as generate:
            answer, sources = answer_student_question(
                self.db,
                self.student_a,
                "What is the deadline for DBMS Assignment 3?",
            )

        self.assertEqual(answer, "October 14.")
        self.assertIn(
            ("institutional_document", self.institutional_a.id),
            {(source.document_type, source.document_id) for source in sources},
        )
        self.assertIn(
            ("institutional_notice", self.notice_a.id),
            {(source.document_type, source.document_id) for source in sources},
        )
        context = generate.call_args.args[1]
        self.assertIn("Institutional notice: DBMS Assignment 3", context)
        self.assertIn("due date is October 14", context)
        self.assertNotIn("row-level locking", context)

    def test_section_b_answer_context_excludes_section_a_and_private_documents(self) -> None:
        with patch(
            "app.services.chat_service.generate_gemini_answer",
            return_value="The Section B guide covers row-level locking.",
        ) as generate:
            answer, sources = answer_student_question(
                self.db,
                self.student_b,
                "What does the Section B lab guide say about row-level locking?",
            )

        self.assertIn("Section B guide", answer)
        self.assertTrue(sources)
        context = generate.call_args.args[1]
        self.assertIn("row-level locking", context)
        self.assertNotIn("October 14", context)
        self.assertNotIn("Transaction isolation", context)

    def test_student_b_cannot_retrieve_student_a_private_document(self) -> None:
        chunks = retrieve_relevant_chunks(
            self.db,
            self.student_b,
            "What do Ananya's private transaction notes say about isolation?",
        )
        self.assertNotIn(("student_document", self.private_a.id), self.source_keys(chunks))

    def test_student_b_cannot_retrieve_section_a_notice_or_send_it_to_gemini(self) -> None:
        with patch("app.services.chat_service.generate_gemini_answer") as generate:
            answer, sources = answer_student_question(
                self.db,
                self.student_b,
                "When is DBMS Assignment 3 due in Section A?",
            )

        self.assertEqual(sources, [])
        self.assertIn("could not find", answer.lower())
        generate.assert_not_called()

    def test_api_rejects_other_student_workspace_id_and_chat_identity(self) -> None:
        def override_db():
            yield self.db

        def override_current_user():
            return self.student_b

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = override_current_user
        client = TestClient(app)

        private_response = client.get(
            f"/api/workspace/documents/{self.student_a.id}",
        )
        chat_response = client.post(
            "/api/chat",
            json={
                "student_id": self.student_a.id,
                "message": "What is in the private document?",
            },
        )

        self.assertEqual(private_response.status_code, 404)
        self.assertEqual(chat_response.status_code, 403)

    def test_chat_response_api_returns_answer_and_retrieved_sources(self) -> None:
        def override_db():
            yield self.db

        def override_current_user():
            return self.student_a

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = override_current_user

        with patch(
            "app.services.chat_service.generate_gemini_answer",
            return_value="Submit the normalization assignment by October 14.",
        ) as generate:
            response = TestClient(app).post(
                "/api/chat",
                json={
                    "student_id": self.student_a.id,
                    "message": "What do I need to submit?",
                },
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("Submit the normalization assignment", body["answer"])
        self.assertTrue(body["sources"])
        context = generate.call_args.args[1]
        self.assertIn("Submit the normalization exercise", context)
        self.assertNotIn("row-level locking", context)

    def test_conversations_persist_and_continue_with_owned_history(self) -> None:
        def override_db():
            yield self.db

        def current_student_a():
            return self.student_a

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = current_student_a
        client = TestClient(app)

        with patch(
            "app.services.chat_service.generate_gemini_answer",
            side_effect=["The deadline is October 14.", "Submit a single PDF."],
        ) as generate:
            created = client.post("/api/chat/conversations")
            self.assertEqual(created.status_code, 201)
            conversation_id = created.json()["id"]

            first_answer = client.post(
                "/api/chat",
                json={
                    "student_id": self.student_a.id,
                    "conversation_id": conversation_id,
                    "message": "When is DBMS Assignment 3 due?",
                },
            )
            second_answer = client.post(
                "/api/chat",
                json={
                    "student_id": self.student_a.id,
                    "conversation_id": conversation_id,
                    "message": "What do I need to submit?",
                },
            )

        self.assertEqual(created.json()["title"], "New chat")
        self.assertEqual(first_answer.status_code, 200)
        self.assertEqual(second_answer.status_code, 200)
        self.assertEqual(second_answer.json()["conversation_id"], conversation_id)
        self.assertEqual(generate.call_count, 2)
        second_history = generate.call_args.kwargs["conversation_history"]
        self.assertEqual(
            [item["role"] for item in second_history],
            ["student", "assistant"],
        )
        self.assertIn("When is DBMS Assignment 3 due?", second_history[0]["content"])
        self.assertIn("October 14", second_history[1]["content"])

        app.dependency_overrides[get_current_user] = current_student_a
        saved_messages = client.get(
            f"/api/chat/conversations/{conversation_id}/messages"
        )
        self.assertEqual(saved_messages.status_code, 200)
        self.assertEqual(
            [message["role"] for message in saved_messages.json()],
            ["student", "assistant", "student", "assistant"],
        )
        conversation_list = client.get("/api/chat/conversations")
        self.assertEqual(conversation_list.status_code, 200)
        self.assertEqual(conversation_list.json()[0]["id"], conversation_id)
        self.assertEqual(conversation_list.json()[0]["title"], "When is DBMS Assignment 3 due?")

        app.dependency_overrides[get_current_user] = lambda: self.student_b
        other_student_messages = client.get(
            f"/api/chat/conversations/{conversation_id}/messages"
        )
        self.assertEqual(other_student_messages.status_code, 404)
        self.assertEqual(client.get("/api/chat/conversations").json(), [])


if __name__ == "__main__":
    unittest.main()
