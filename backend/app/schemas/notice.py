from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NoticeDocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    processing_status: str


def _all_to_none(value: str | None) -> str | None:
    if isinstance(value, str) and value.strip().lower() == "all":
        return None
    return value


class NoticeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    created_by: int
    deadline: date | None = None
    department: str | None = None
    year: int | Literal["all"] | None = None
    section: str | None = None
    course: str | None = None
    attachment_url: str | None = Field(default=None, max_length=500)
    tags: list[str] = Field(default_factory=list)

    @field_validator("department", "section", "course", mode="before")
    @classmethod
    def normalize_all_strings(cls, value: str | None) -> str | None:
        return _all_to_none(value)

    @field_validator("year", mode="before")
    @classmethod
    def normalize_all_years(cls, value: int | str | None) -> int | None:
        if isinstance(value, str):
            if value.strip().lower() == "all":
                return None
            try:
                return int(value)
            except ValueError as error:
                raise ValueError("year must be an integer or 'all'") from error
        return value


class NoticeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    created_by: int
    created_at: datetime
    deadline: date | None
    department: str | None
    year: int | None
    section: str | None
    course: str | None
    attachment_url: str | None
    tags: list[str]
    documents: list[NoticeDocumentSummary] = Field(default_factory=list)


class NoticeReadResponse(BaseModel):
    notice_id: int
    status: Literal["read"] = "read"
