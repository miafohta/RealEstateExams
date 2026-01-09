"""add question metadata

Revision ID: dbc9c57b2e19
Revises: cb9ec924b13c
Create Date: 2026-01-02 20:54:43.830934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dbc9c57b2e19'
down_revision: Union[str, Sequence[str], None] = 'cb9ec924b13c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
