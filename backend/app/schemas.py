from __future__ import annotations
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional

from datetime import datetime
from pydantic import BaseModel, Field
from typing import Literal


AttemptMode = Literal["practice", "timed"]


class AttemptStartIn(BaseModel):
    mode: AttemptMode
    exam_name: str | None = None
    question_count: int = Field(default=150, ge=1, le=300)
    # Only used for timed mode; if omitted, backend default will apply
    time_limit_seconds: int | None = Field(default=None, ge=60)


class AttemptStartOut(BaseModel):
    attempt_id: int
    mode: AttemptMode
    exam_name: str | None
    question_count: int
    time_limit_seconds: int | None
    started_at: datetime


class ChoiceOutSimple(BaseModel):
    label: str
    text: str


class QuestionForAttemptOut(BaseModel):
    attempt_id: int
    position: int
    question_id: int
    text: str
    topic: str | None
    subtopic: str | None
    choices: list[ChoiceOutSimple]
    # Only present when allowed (practice OR submitted)
    explanation: str | None = None
    # current saved answer if any
    selected_label: str | None = None


class AnswerIn(BaseModel):
    question_id: int
    selected_label: Literal["A", "B", "C", "D"]


class SubmitOut(BaseModel):
    attempt_id: int
    score_percent: int
    passed: bool
    total_questions: int
    correct: int
    breakdown_by_topic: dict[str, dict[str, int]]  # {topic: {correct, total}}
    submitted_at: datetime


class ReviewItemOut(BaseModel):
    position: int
    question_id: int
    text: str
    topic: str | None
    subtopic: str | None
    selected_label: str | None
    correct_label: str | None
    explanation: str | None


class ChoiceIn(BaseModel):
    label: str
    text: str
    is_correct: bool = False

class QuestionCreate(BaseModel):
    text: str
    explanation: Optional[str] = None
    choices: List[ChoiceIn] = Field(min_length=2)

class ChoiceOut(BaseModel):
    id: int
    label: str
    text: str
    class Config:
        from_attributes = True

class QuestionOut(BaseModel):
    id: int
    text: str
    explanation: Optional[str]
    choices: List[ChoiceOut]
    class Config:
        from_attributes = True

class ReviewChoiceOut(BaseModel):
    label: str
    text: str

class ReviewItemOut(BaseModel):
    position: int
    question_id: int
    text: str
    topic: str | None = None
    subtopic: str | None = None
    choices: list[ReviewChoiceOut]
    selected_label: str | None = None
    correct_label: str | None = None
    explanation: str | None = None

class SignupIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr