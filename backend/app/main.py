from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from datetime import datetime, timezone

from .db import SessionLocal, get_db
from .models import Question, Choice, User
from .auth import require_user, require_admin
from app.routers.me import get_current_user

# NEW models
from .models import ExamAttempt, ExamAttemptQuestion, ExamAnswer, AttemptMode

# NEW schemas
from .schemas import (
    QuestionCreate, QuestionOut,
    AttemptStartIn, AttemptStartOut,   
    QuestionForAttemptOut, ChoiceOutSimple,
    AnswerIn, SubmitOut, ReviewItemOut,
    AttemptSummaryOut
)

# NEW service
from .services.exam_flow import create_attempt_with_balanced_questions, PASSING_PERCENT

import os

IS_PROD = os.getenv("ENV", "dev").lower() in {"prod", "production"}

app = FastAPI(
    title="Real Estate Quiz API",
    docs_url=None if IS_PROD else "/docs",
    redoc_url=None if IS_PROD else "/redoc",
    openapi_url=None if IS_PROD else "/openapi.json",
)
# Allow Next.js dev server to call API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3001").split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from .routers import me, auth_routers
app.include_router(me.router)
app.include_router(auth_routers.router)


@app.get("/health")
def health():
    return {"ok": True}

@app.post("/questions", response_model=QuestionOut)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    q = Question(text=payload.text, explanation=payload.explanation)
    q.choices = [Choice(**c.model_dump()) for c in payload.choices]
    db.add(q)
    db.commit()
    db.refresh(q)
    return q

@app.get("/questions", response_model=list[QuestionOut])
def list_questions(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    stmt = (
        select(Question)
        .options(selectinload(Question.choices))
        .order_by(Question.id.desc())
        .limit(50)
    )
    return db.scalars(stmt).all()

# ----------------------------
# NEW: Exam attempt flow
# ----------------------------

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

##def _get_attempt_or_404(db: Session, attempt_id: int, user: User | None = None) -> ExamAttempt:
    attempt = db.get(ExamAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.user_id is not None:
        if not user or attempt.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return attempt##

def _get_attempt_or_404(
    db: Session,
    attempt_id: int,
    user: User,
) -> ExamAttempt:
    attempt = db.get(ExamAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return attempt


def _ensure_not_expired(attempt: ExamAttempt):
    if attempt.mode != AttemptMode.timed:
        return
    if attempt.submitted_at is not None:
        return
    if attempt.time_limit_seconds is None:
        return
    # compare timestamps safely (attempt.started_at stored as utc naive by default in your service)
    started = attempt.started_at

    # Make started timezone-aware in UTC if DB returned naive
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)

    now = _utcnow()
    elapsed = (now - started).total_seconds()

    #elapsed = (_utcnow().replace(tzinfo=None) - started).total_seconds()
    if elapsed > attempt.time_limit_seconds:
        raise HTTPException(status_code=403, detail="Time limit exceeded. Please submit the attempt.")


def _ensure_attempt_active(attempt: ExamAttempt) -> None:
    if attempt.submitted_at is not None:
        raise HTTPException(status_code=409, detail="Attempt already submitted")


@app.post("/attempts/start", response_model=AttemptStartOut)
def start_attempt(
    payload: AttemptStartIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),   #require auth
):
    try:
        mode_enum = AttemptMode(payload.mode)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid mode")

    try:
        attempt = create_attempt_with_balanced_questions(
            db,
            mode=mode_enum,
            exam_name=payload.exam_name,
            question_count=payload.question_count,
            user_id=user.id,  # always present
            time_limit_seconds=payload.time_limit_seconds,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return AttemptStartOut(
        attempt_id=attempt.id,
        mode=attempt.mode.value,
        exam_name=attempt.exam_name,
        question_count=attempt.question_count,
        time_limit_seconds=attempt.time_limit_seconds,
        started_at=attempt.started_at,
    )

@app.get("/attempts/{attempt_id}/questions/{position}", response_model=QuestionForAttemptOut)
def get_attempt_question(attempt_id: int, position: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    attempt = _get_attempt_or_404(db, attempt_id, user)
    _ensure_not_expired(attempt)

    aq_stmt = (
        select(ExamAttemptQuestion)
        .where(ExamAttemptQuestion.attempt_id == attempt_id)
        .where(ExamAttemptQuestion.position == position)
    )
    aq = db.scalars(aq_stmt).first()
    if not aq:
        raise HTTPException(status_code=404, detail="Question position not found")

    q_stmt = (
        select(Question)
        .where(Question.id == aq.question_id)
        .options(selectinload(Question.choices))
    )
    q = db.scalars(q_stmt).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Get saved answer if any
    ans_stmt = (
        select(ExamAnswer.selected_label)
        .where(ExamAnswer.attempt_id == attempt_id)
        .where(ExamAnswer.question_id == q.id)
    )
    selected = db.execute(ans_stmt).scalar_one_or_none()

    # Explanation visibility rule
    allow_expl = (attempt.mode == AttemptMode.practice) or (attempt.submitted_at is not None)
    explanation = q.explanation if allow_expl else None

    return QuestionForAttemptOut(
        attempt_id=attempt_id,
        position=position,
        question_id=q.id,
        text=q.text,
        topic=aq.topic,
        subtopic=aq.subtopic,
        choices=[ChoiceOutSimple(label=c.label, text=c.text) for c in q.choices],
        explanation=explanation,
        selected_label=selected,
    )


@app.post("/attempts/{attempt_id}/answer")
def answer_question(attempt_id: int, payload: AnswerIn, db: Session = Depends(get_db),  user: User = Depends(get_current_user)):
    attempt = _get_attempt_or_404(db, attempt_id, user)
    _ensure_attempt_active(attempt)
    _ensure_not_expired(attempt)
    if attempt.submitted_at is not None:
        raise HTTPException(status_code=400, detail="Attempt already submitted")

    # Ensure question belongs to this attempt
    exists_stmt = (
        select(func.count())
        .select_from(ExamAttemptQuestion)
        .where(ExamAttemptQuestion.attempt_id == attempt_id)
        .where(ExamAttemptQuestion.question_id == payload.question_id)
    )
    if db.execute(exists_stmt).scalar_one() == 0:
        raise HTTPException(status_code=400, detail="Question does not belong to this attempt")

    # Upsert answer
    ans_stmt = (
        select(ExamAnswer)
        .where(ExamAnswer.attempt_id == attempt_id)
        .where(ExamAnswer.question_id == payload.question_id)
    )
    ans = db.scalars(ans_stmt).first()
    if ans:
        ans.selected_label = payload.selected_label
        ans.answered_at = datetime.now(timezone.utc)

    else:
        ans = ExamAnswer(
            attempt_id=attempt_id,
            question_id=payload.question_id,
            selected_label=payload.selected_label,
            answered_at=datetime.utcnow(),
        )
        db.add(ans)

    db.commit()
    return {"ok": True}

from datetime import datetime, timezone
from sqlalchemy import select, func
from fastapi import HTTPException

@app.post("/attempts/{attempt_id}/submit", response_model=SubmitOut)
def submit_attempt(attempt_id: int, db: Session = Depends(get_db),  user: User = Depends(get_current_user)):
    attempt = _get_attempt_or_404(db, attempt_id, user)
    _ensure_attempt_active(attempt)

    # Get all question ids in this attempt + topic for breakdown
    qrows = db.execute(
        select(ExamAttemptQuestion.question_id, ExamAttemptQuestion.topic)
        .where(ExamAttemptQuestion.attempt_id == attempt_id)
    ).all()

    qids = [qid for (qid, _topic) in qrows]
    if not qids:
        raise HTTPException(status_code=400, detail="Attempt has no questions")

    topic_by_qid = {qid: (topic or "Unknown") for (qid, topic) in qrows}

    # correct label per question (from choices where is_correct = true)
    correct_map = dict(
        db.execute(
            select(Choice.question_id, Choice.label)
            .where(Choice.question_id.in_(qids))
            .where(Choice.is_correct == True)  # noqa: E712
        ).all()
    )

    # user answers
    ans_map = dict(
        db.execute(
            select(ExamAnswer.question_id, ExamAnswer.selected_label)
            .where(ExamAnswer.attempt_id == attempt_id)
        ).all()
    )

    total = len(qids)
    correct = 0
    breakdown: dict[str, dict[str, int]] = {}

    for qid in qids:
        topic = topic_by_qid.get(qid, "Unknown")
        breakdown.setdefault(topic, {"correct": 0, "total": 0})
        breakdown[topic]["total"] += 1

        if ans_map.get(qid) is not None and ans_map.get(qid) == correct_map.get(qid):
            correct += 1
            breakdown[topic]["correct"] += 1

    score_percent = int(round((correct / total) * 100)) if total else 0
    passed = score_percent >= PASSING_PERCENT

    #Always set submitted_at BEFORE returning
    submitted_at = datetime.now(timezone.utc)
    attempt.score_percent = score_percent
    attempt.passed = passed
    attempt.submitted_at = submitted_at

    db.commit()
    db.refresh(attempt)

    #Use submitted_at variable so response is never None
    return SubmitOut(
        attempt_id=attempt.id,
        score_percent=score_percent,
        passed=passed,
        total_questions=total,
        correct=correct,
        breakdown_by_topic=breakdown,
        submitted_at=submitted_at,
    )

@app.get("/attempts/{attempt_id}/result", response_model=SubmitOut)
def get_attempt_result(
    attempt_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    attempt = _get_attempt_or_404(db, attempt_id, user)

    if attempt.submitted_at is None:
        raise HTTPException(status_code=409, detail="Attempt not submitted yet")

    # --- recompute totals/breakdown read-only (same as submit) ---
    qrows = db.execute(
        select(ExamAttemptQuestion.question_id, ExamAttemptQuestion.topic)
        .where(ExamAttemptQuestion.attempt_id == attempt_id)
    ).all()

    qids = [qid for (qid, _topic) in qrows]
    if not qids:
        raise HTTPException(status_code=400, detail="Attempt has no questions")

    topic_by_qid = {qid: (topic or "Unknown") for (qid, topic) in qrows}

    correct_map = dict(
        db.execute(
            select(Choice.question_id, Choice.label)
            .where(Choice.question_id.in_(qids))
            .where(Choice.is_correct == True)  # noqa: E712
        ).all()
    )

    ans_map = dict(
        db.execute(
            select(ExamAnswer.question_id, ExamAnswer.selected_label)
            .where(ExamAnswer.attempt_id == attempt_id)
        ).all()
    )

    total = len(qids)
    correct = 0
    breakdown: dict[str, dict[str, int]] = {}

    for qid in qids:
        topic = topic_by_qid.get(qid, "Unknown")
        breakdown.setdefault(topic, {"correct": 0, "total": 0})
        breakdown[topic]["total"] += 1

        if ans_map.get(qid) is not None and ans_map.get(qid) == correct_map.get(qid):
            correct += 1
            breakdown[topic]["correct"] += 1

    return SubmitOut(
        attempt_id=attempt.id,
        score_percent=attempt.score_percent,
        passed=attempt.passed,
        total_questions=total,
        correct=correct,
        breakdown_by_topic=breakdown,
        submitted_at=attempt.submitted_at,
    )

@app.get("/attempts/{attempt_id}/review", response_model=list[ReviewItemOut])
def review_attempt(attempt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    attempt = _get_attempt_or_404(db, attempt_id, user)

    # rule: in timed/exam mode, only after submit; in practice, always ok
    if attempt.mode == AttemptMode.timed and attempt.submitted_at is None:
        raise HTTPException(status_code=403, detail="Review available after submission")

    # Get attempt questions ordered
    aq_stmt = (
        select(ExamAttemptQuestion)
        .where(ExamAttemptQuestion.attempt_id == attempt_id)
        .order_by(ExamAttemptQuestion.position.asc())
    )
    aqs = db.scalars(aq_stmt).all()
    qids = [aq.question_id for aq in aqs]

    # Questions + choices
    q_stmt = (
        select(Question)
        .options(selectinload(Question.choices))
        .where(Question.id.in_(qids))
    )
    q_map = {q.id: q for q in db.scalars(q_stmt).all()}

    # correct labels
    c_stmt = (
        select(Choice.question_id, Choice.label)
        .where(Choice.question_id.in_(qids))
        .where(Choice.is_correct == True)  # noqa: E712
    )
    correct_map = {qid: label for (qid, label) in db.execute(c_stmt).all()}

    # answers
    a_stmt = (
        select(ExamAnswer.question_id, ExamAnswer.selected_label)
        .where(ExamAnswer.attempt_id == attempt_id)
    )
    ans_map = {qid: sel for (qid, sel) in db.execute(a_stmt).all()}

    out: list[ReviewItemOut] = []
    for aq in aqs:
        q = q_map.get(aq.question_id)
        if not q:
            continue
        #ensure consistent A/B/C/D order
        sorted_choices = sorted(q.choices, key=lambda c: c.label)

        out.append(
            ReviewItemOut(
                position=aq.position,
                question_id=q.id,
                text=q.text,
                topic=aq.topic,
                subtopic=aq.subtopic,
                choices=[{"label":c.label, "text":c.text} for c in sorted_choices],
                selected_label=ans_map.get(q.id),
                correct_label=correct_map.get(q.id),
                explanation=q.explanation,
            )
        )
    return out


@app.get("/me/attempts", response_model=list[AttemptSummaryOut])
def my_attempts(user: User = Depends(require_user), db: Session = Depends(get_db)):
    stmt = (
        select(ExamAttempt)
        .where(ExamAttempt.user_id == user.id)
        .order_by(ExamAttempt.id.desc())
        .limit(50)
    )
    return [
      {
        "attempt_id": a.id,
        "mode": a.mode.value if hasattr(a.mode, "value") else a.mode,
        "exam_name": a.exam_name,
        "question_count": a.question_count,
        "time_limit_seconds": a.time_limit_seconds,
        "started_at": a.started_at,
        "submitted_at": a.submitted_at,
        "score_percent": a.score_percent,
        "passed": a.passed,
      }
      for a in db.scalars(stmt).all()
    ]

@app.get("/attempts/{attempt_id}")
def get_attempt_meta(attempt_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    attempt = _get_attempt_or_404(db, attempt_id, user)
    return {
        "attempt_id": attempt.id,
        "mode": attempt.mode.value if hasattr(attempt.mode, "value") else attempt.mode,
        "exam_name": attempt.exam_name,
        "question_count": attempt.question_count,
        "time_limit_seconds": attempt.time_limit_seconds,
        "started_at": attempt.started_at,
        "submitted_at": attempt.submitted_at,
        "is_submitted": attempt.submitted_at is not None,
        "score_percent": attempt.score_percent,
        "passed": attempt.passed,
    }

