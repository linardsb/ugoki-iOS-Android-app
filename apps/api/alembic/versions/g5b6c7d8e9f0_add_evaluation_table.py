"""add ai_coach_evaluation table

Revision ID: g5b6c7d8e9f0
Revises: f4a5b6c7d8e9
Create Date: 2026-01-24 17:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g5b6c7d8e9f0'
down_revision: Union[str, None] = 'f4a5b6c7d8e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_coach_evaluation table for quality tracking
    op.create_table(
        'ai_coach_evaluation',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.String(100), nullable=False),
        sa.Column('evaluated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('helpfulness_score', sa.Float(), nullable=False),
        sa.Column('safety_score', sa.Float(), nullable=False),
        sa.Column('personalization_score', sa.Float(), nullable=False),
        sa.Column('accuracy_score', sa.Float(), nullable=True),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=False),
        sa.Column('judge_model', sa.String(50), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['message_id'], ['coach_messages.id'], ondelete='CASCADE'),
    )

    # Indexes for efficient querying
    op.create_index('idx_evaluation_session', 'ai_coach_evaluation', ['session_id'])
    op.create_index('idx_evaluation_date', 'ai_coach_evaluation', ['evaluated_at'])
    op.create_index('idx_evaluation_overall', 'ai_coach_evaluation', ['overall_score'])


def downgrade() -> None:
    op.drop_index('idx_evaluation_overall', table_name='ai_coach_evaluation')
    op.drop_index('idx_evaluation_date', table_name='ai_coach_evaluation')
    op.drop_index('idx_evaluation_session', table_name='ai_coach_evaluation')
    op.drop_table('ai_coach_evaluation')
