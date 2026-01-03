"""add_audience_tags_to_research_papers

Revision ID: 381d1817ac05
Revises: 5f73e0ba06be
Create Date: 2026-01-03 08:32:40.484910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '381d1817ac05'
down_revision: Union[str, None] = '5f73e0ba06be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add audience_tags column to research_papers table
    op.add_column('research_papers', sa.Column('audience_tags', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove audience_tags column
    op.drop_column('research_papers', 'audience_tags')
