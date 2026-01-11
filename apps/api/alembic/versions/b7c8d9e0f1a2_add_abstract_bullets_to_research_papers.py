"""add abstract_bullets to research_papers

Revision ID: b7c8d9e0f1a2
Revises: aa09363f0ae9
Create Date: 2026-01-11 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add abstract_bullets column for storing AI-generated bullet point summaries
    op.add_column('research_papers', sa.Column('abstract_bullets', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('research_papers', 'abstract_bullets')
