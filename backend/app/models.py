from __future__ import annotations

import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    DateTime,
    func,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base

class AttemptMode(str, enum.Enum):
    practice = "practice"
    timed = "timed"


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    mode: Mapped[AttemptMode] = mapped_column(Enum(AttemptMode), nullable=False)
    exam_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=150)

    # Timed mode uses this; practice can be NULL
    time_limit_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    score_percent: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 0..100
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    attempt_questions: Mapped[list["ExamAttemptQuestion"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )
    answers: Mapped[list["ExamAnswer"]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    user: Mapped["User | None"] = relationship()



class ExamAttemptQuestion(Base):
    """
    Locks the randomized/balanced set at attempt start.
    """
    __tablename__ = "exam_attempt_questions"
    __table_args__ = (
        UniqueConstraint("attempt_id", "position", name="uq_attempt_position"),
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
        Index("ix_attempt_questions_attempt", "attempt_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    attempt_id: Mapped[int] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)

    position: Mapped[int] = mapped_column(Integer, nullable=False)  # 1..150

    # Denormalized for fast breakdown (optional but very handy)
    topic: Mapped[str | None] = mapped_column(String(150), nullable=True)
    subtopic: Mapped[str | None] = mapped_column(String(200), nullable=True)

    attempt: Mapped["ExamAttempt"] = relationship(back_populates="attempt_questions")
    question: Mapped["Question"] = relationship()


class ExamAnswer(Base):
    __tablename__ = "exam_answers"
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_answer_attempt_question"),
        Index("ix_answers_attempt", "attempt_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    attempt_id: Mapped[int] = mapped_column(ForeignKey("exam_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)

    selected_label: Mapped[str | None] = mapped_column(String(5), nullable=True)  # A/B/C/D
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    attempt: Mapped["ExamAttempt"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship()


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    topic: Mapped[str | None] = mapped_column(String(150), nullable=True)
    subtopic: Mapped[str | None] = mapped_column(String(200), nullable=True)
    exam_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    question_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
   

    choices: Mapped[list["Choice"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
    )

class Choice(Base):
    __tablename__ = "choices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(5), nullable=False)  # A/B/C/D
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)

    question: Mapped["Question"] = relationship(back_populates="choices")

class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("email", name="uq_users_email"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    nullable=False,
    default=lambda: datetime.now(timezone.utc),
)
