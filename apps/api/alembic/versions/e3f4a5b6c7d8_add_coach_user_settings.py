"""add coach_user_settings table and conversation summary

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2026-01-21 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f4a5b6c7d8'
down_revision: Union[str, None] = 'd2e3f4a5b6c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create coach_user_settings table for personality persistence
    op.create_table(
        'coach_user_settings',
        sa.Column('identity_id', sa.String(36), nullable=False),
        sa.Column('personality', sa.String(20), server_default='motivational', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('identity_id'),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
    )

    # Add summary and message_count columns to coach_conversations for token management
    op.add_column('coach_conversations', sa.Column('summary', sa.Text(), nullable=True))
    op.add_column('coach_conversations', sa.Column('message_count', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    op.drop_column('coach_conversations', 'message_count')
    op.drop_column('coach_conversations', 'summary')
    op.drop_table('coach_user_settings')
