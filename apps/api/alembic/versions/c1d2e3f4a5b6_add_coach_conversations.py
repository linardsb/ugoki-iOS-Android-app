"""add coach conversations tables

Revision ID: c1d2e3f4a5b6
Revises: b7c8d9e0f1a2
Create Date: 2026-01-20 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # coach_conversations: stores conversation sessions
    op.create_table(
        'coach_conversations',
        sa.Column('session_id', sa.String(length=100), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_archived', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('metadata', sa.JSON(), server_default=sa.text("'{}'"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('session_id'),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_coach_conv_identity', 'coach_conversations', ['identity_id'], unique=False)
    op.create_index('idx_coach_conv_last_message', 'coach_conversations', ['last_message_at'], unique=False)

    # coach_messages: stores individual messages
    op.create_table(
        'coach_messages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('session_id', sa.String(length=100), nullable=False),
        sa.Column('message', sa.JSON(), nullable=False),  # {type: 'human'|'ai', content, files?}
        sa.Column('message_data', sa.Text(), nullable=True),  # Pydantic AI message format for history
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['coach_conversations.session_id'], ondelete='CASCADE'),
    )
    op.create_index('idx_coach_msg_session', 'coach_messages', ['session_id'], unique=False)
    op.create_index('idx_coach_msg_created', 'coach_messages', ['created_at'], unique=False)

    # coach_requests: rate limiting and usage tracking
    op.create_table(
        'coach_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('user_query', sa.Text(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
    )
    op.create_index('idx_coach_req_identity', 'coach_requests', ['identity_id'], unique=False)
    op.create_index('idx_coach_req_timestamp', 'coach_requests', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_coach_req_timestamp', table_name='coach_requests')
    op.drop_index('idx_coach_req_identity', table_name='coach_requests')
    op.drop_table('coach_requests')

    op.drop_index('idx_coach_msg_created', table_name='coach_messages')
    op.drop_index('idx_coach_msg_session', table_name='coach_messages')
    op.drop_table('coach_messages')

    op.drop_index('idx_coach_conv_last_message', table_name='coach_conversations')
    op.drop_index('idx_coach_conv_identity', table_name='coach_conversations')
    op.drop_table('coach_conversations')
