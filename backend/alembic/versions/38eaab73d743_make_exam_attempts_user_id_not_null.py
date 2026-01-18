"""make exam_attempts.user_id not null

Revision ID: 38eaab73d743
Revises: 7dc77c38601c
Create Date: 2026-01-15 11:12:52.265355

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '38eaab73d743'
down_revision: Union[str, Sequence[str], None] = '7dc77c38601c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade():
    # Safety: ensure no NULLs remain BEFORE running this migration.
    # (You can delete/backfill in a prior migration or manually.)
    op.alter_column(
        "exam_attempts",
        "user_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade():
    op.alter_column(
        "exam_attempts",
        "user_id",
        existing_type=sa.Integer(),
        nullable=True,
    )



