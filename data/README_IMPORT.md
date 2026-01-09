# Fixed CSV bundle (choices preserved across page breaks)

## What's included
- One *_question_bank.csv per PDF
- needs_review.csv: low-confidence predicted correct answers
- import_questions.py: importer for Postgres (SQLAlchemy models)
- This bundle DOES NOT include: correct_best_score, correct_margin, source_page

## Model changes recommended
Your PDFs include metadata that is useful for filtering:
- topic (String)
- subtopic (String)
- exam_name (String)
- question_number (Integer)

Add these to your `Question` model + run an Alembic migration.

## Import
From `backend/` (venv active):
  python ../data/import_questions.py ../data/*_question_bank.csv

Then spot-check `../data/needs_review.csv`.
