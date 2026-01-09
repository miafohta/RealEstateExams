import csv
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Question, Choice

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg://app:app@localhost:5432/quiz")

def main(paths):
    engine = create_engine(DATABASE_URL, future=True)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    total = 0
    with SessionLocal() as db:
        for path in paths:
            if path.endswith("needs_review.csv"):
                continue
            with open(path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                required = {"exam_name","question_number","topic","subtopic","question_text","A","B","C","D","correct_label","explanation"}
                missing = required - set(reader.fieldnames or [])
                if missing:
                    raise SystemExit(f"{path}: missing columns: {sorted(missing)}")

                for row in reader:
                    qtext = (row.get("question_text") or "").strip()
                    if not qtext:
                        continue

                    correct = (row.get("correct_label") or "").strip().upper()
                    if correct not in {"A","B","C","D"}:
                        correct = ""  # still import; you can fix later

                    q = Question(
                        text=qtext,
                        explanation=(row.get("explanation") or "").strip() or None,
                        topic=(row.get("topic") or "").strip() or None,
                        subtopic=(row.get("subtopic") or "").strip() or None,
                        exam_name=(row.get("exam_name") or "").strip() or None,
                        question_number=int(row.get("question_number") or 0) or None,
                    )

                    q.choices = []
                    for label in ["A","B","C","D"]:
                        ctext = (row.get(label) or "").strip()
                        if not ctext:
                            raise SystemExit(f"{path}: Q{row.get('question_number')}: missing choice {label}")
                        q.choices.append(Choice(label=label, text=ctext, is_correct=(label == correct)))

                    db.add(q)
                    total += 1

        db.commit()

    print(f"Imported {total} questions.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python import_questions.py data/*_question_bank.csv")
    main(sys.argv[1:])
