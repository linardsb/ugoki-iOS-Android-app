"""add ai_coach_user_memory table

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-01-24 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4a5b6c7d8e9'
down_revision: Union[str, None] = 'e3f4a5b6c7d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_coach_user_memory table for cross-session personalization
    op.create_table(
        'ai_coach_user_memory',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('identity_id', sa.String(36), nullable=False),
        sa.Column('memory_type', sa.String(20), nullable=False),  # fact, preference, goal, constraint
        sa.Column('category', sa.String(50), nullable=False),  # injury, schedule, equipment, etc.
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('confidence', sa.Float(), server_default='0.8', nullable=False),
        sa.Column('source_session_id', sa.String(100), nullable=True),
        sa.Column('extracted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('verified_by_user', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
    )

    # Indexes for efficient querying
    op.create_index('idx_user_memory_identity_category', 'ai_coach_user_memory', ['identity_id', 'category'])
    op.create_index('idx_user_memory_identity_type', 'ai_coach_user_memory', ['identity_id', 'memory_type'])
    op.create_index('idx_user_memory_identity_active', 'ai_coach_user_memory', ['identity_id', 'is_active'])


def downgrade() -> None:
    op.drop_index('idx_user_memory_identity_active', table_name='ai_coach_user_memory')
    op.drop_index('idx_user_memory_identity_type', table_name='ai_coach_user_memory')
    op.drop_index('idx_user_memory_identity_category', table_name='ai_coach_user_memory')
    op.drop_table('ai_coach_user_memory')
