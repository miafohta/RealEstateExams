from __future__ import annotations

import random
from datetime import datetime, timezone
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import (
    Question,
    ExamAttempt,
    ExamAttemptQuestion,
    AttemptMode,
)


PASSING_PERCENT = 70
DEFAULT_QUESTION_COUNT = 150

# pick something reasonable; you can make it configurable
DEFAULT_TIMED_SECONDS = 150 * 60  # 150 minutes


def _compute_topic_quota(topic_counts: dict[str, int], total: int) -> dict[str, int]:
    """
    Proportional allocation with small balancing pass.
    """
    topics = list(topic_counts.keys())
    if not topics:
        return {}

    total_bank = sum(topic_counts.values())
    # initial proportional
    quota = {t: max(1, round(total * (topic_counts[t] / total_bank))) for t in topics}

    # fix sum drift
    diff = total - sum(quota.values())
    # distribute diff by largest counts first
    topics_sorted = sorted(topics, key=lambda t: topic_counts[t], reverse=True)

    i = 0
    while diff != 0 and topics_sorted:
        t = topics_sorted[i % len(topics_sorted)]
        if diff > 0:
            quota[t] += 1
            diff -= 1
        else:
            if quota[t] > 1:
                quota[t] -= 1
                diff += 1
        i += 1

    return quota


def _compute_subtopic_quota(
    subtopic_counts: dict[tuple[str | None, str | None], int],
    topic_quota: dict[str, int],
) -> dict[tuple[str | None, str | None], int]:
    """
    Allocate each topic's quota across its subtopics proportionally.
    Key is (topic, subtopic).
    """
    quota: dict[tuple[str | None, str | None], int] = {}

    # group subtopics by topic
    by_topic: dict[str, list[tuple[tuple[str | None, str | None], int]]] = {}
    for (topic, subtopic), cnt in subtopic_counts.items():
        if topic is None:
            continue
        by_topic.setdefault(topic, []).append(((topic, subtopic), cnt))

    for topic, t_quota in topic_quota.items():
        items = by_topic.get(topic, [])
        if not items:
            continue

        total_cnt = sum(cnt for _, cnt in items)
        # initial proportional per subtopic
        for key, cnt in items:
            quota[key] = max(1, round(t_quota * (cnt / total_cnt)))

        # fix drift inside this topic
        drift = t_quota - sum(quota[k] for k, _ in items)
        keys_sorted = sorted(items, key=lambda kv: kv[1], reverse=True)
        i = 0
        while drift != 0 and keys_sorted:
            key = keys_sorted[i % len(keys_sorted)][0]
            if drift > 0:
                quota[key] += 1
                drift -= 1
            else:
                if quota[key] > 1:
                    quota[key] -= 1
                    drift += 1
            i += 1

    return quota


def _pick_question_ids_for_bucket(db: Session, topic: str, subtopic: str | None, limit: int) -> list[int]:
    stmt = (
        select(Question.id)
        .where(Question.topic == topic)
        .where(Question.subtopic == subtopic)
        .order_by(func.random())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def create_attempt_with_balanced_questions(
    db: Session,
    *,
    mode: AttemptMode,
    exam_name: str | None,
    question_count: int = DEFAULT_QUESTION_COUNT,
    user_id: int,
    time_limit_seconds: int | None = None,
) -> ExamAttempt:
    """
    Creates attempt and locks a balanced randomized set in exam_attempt_questions.
    """
    if mode == AttemptMode.timed and time_limit_seconds is None:
        time_limit_seconds = DEFAULT_TIMED_SECONDS
    if mode == AttemptMode.practice:
        time_limit_seconds = None

    # 1) Get counts by topic (optionally filter by exam_name if you want separate banks)
    base = select(Question.topic, func.count(Question.id)).group_by(Question.topic)
    if exam_name:
        base = base.where(Question.exam_name == exam_name)

    topic_rows = db.execute(base).all()
    topic_counts = {t: c for (t, c) in topic_rows if t is not None}
    if not topic_counts:
        raise ValueError("No questions found for the selected exam_name/topic set")

    topic_quota = _compute_topic_quota(topic_counts, question_count)

    # 2) Counts by (topic, subtopic)
    sub_base = select(Question.topic, Question.subtopic, func.count(Question.id)).group_by(Question.topic, Question.subtopic)
    if exam_name:
        sub_base = sub_base.where(Question.exam_name == exam_name)

    sub_rows = db.execute(sub_base).all()
    sub_counts = {(t, s): c for (t, s, c) in sub_rows if t is not None}

    sub_quota = _compute_subtopic_quota(sub_counts, topic_quota)

    # 3) Pick IDs bucket by bucket
    picked_ids: list[int] = []
    for (topic, subtopic), q in sub_quota.items():
        if topic is None:
            continue
        ids = _pick_question_ids_for_bucket(db, topic, subtopic, q)
        picked_ids.extend(ids)

    # 4) De-dup and fill/trim to exact count
    picked_ids = list(dict.fromkeys(picked_ids))  # stable unique
    if len(picked_ids) < question_count:
        # Fill the remainder from anywhere (still within exam_name filter)
        remaining = question_count - len(picked_ids)
        filler_stmt = select(Question.id)
        if exam_name:
            filler_stmt = filler_stmt.where(Question.exam_name == exam_name)
        filler_stmt = filler_stmt.where(Question.id.not_in(picked_ids)).order_by(func.random()).limit(remaining)
        picked_ids.extend(list(db.execute(filler_stmt).scalars().all()))

    if len(picked_ids) > question_count:
        random.shuffle(picked_ids)
        picked_ids = picked_ids[:question_count]

    if len(picked_ids) != question_count:
        raise ValueError(f"Unable to assemble {question_count} questions (got {len(picked_ids)})")

    # 5) Create attempt
    attempt = ExamAttempt(
        user_id=user_id,
        mode=mode,
        exam_name=exam_name,
        question_count=question_count,
        time_limit_seconds=time_limit_seconds,
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.flush()  # to get attempt.id

    # 6) Fetch topic/subtopic for denormalization
    meta_stmt = select(Question.id, Question.topic, Question.subtopic).where(Question.id.in_(picked_ids))
    meta = {qid: (t, s) for (qid, t, s) in db.execute(meta_stmt).all()}

    random.shuffle(picked_ids)
    rows = []
    for i, qid in enumerate(picked_ids, start=1):
        t, s = meta.get(qid, (None, None))
        rows.append(
            ExamAttemptQuestion(
                attempt_id=attempt.id,
                question_id=qid,
                position=i,
                topic=t,
                subtopic=s,
            )
        )
    db.add_all(rows)
    db.commit()
    db.refresh(attempt)
    return attempt
