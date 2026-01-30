"""add_team_messaging

Adds Sprint 4 team messaging features:
- team_messages table for message storage with soft delete
- team_message_reactions table for emoji reactions
- team_message_reads table for read tracking
- team_message_mentions table for @mention records

Revision ID: l0g1h2i3j4k5
Revises: j8e9f0g1h2i3
Create Date: 2026-01-30 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l0g1h2i3j4k5'
down_revision: Union[str, None] = 'j8e9f0g1h2i3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # TEAM MESSAGES TABLE
    # =========================================================================

    op.create_table(
        'team_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=False),
        sa.Column('sender_id', sa.String(length=36), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('edited_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['challenge_teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Team messages indexes
    op.create_index('ix_team_messages_team', 'team_messages', ['team_id'])
    op.create_index('ix_team_messages_sender', 'team_messages', ['sender_id'])
    op.create_index('ix_team_messages_team_created', 'team_messages', ['team_id', 'created_at'])
    # Index for fetching non-deleted messages efficiently
    op.create_index(
        'ix_team_messages_team_active',
        'team_messages',
        ['team_id', 'created_at'],
        postgresql_where=sa.text('deleted_at IS NULL')
    )

    # =========================================================================
    # TEAM MESSAGE REACTIONS TABLE
    # =========================================================================

    op.create_table(
        'team_message_reactions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('message_id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('emoji', sa.String(length=10), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['team_messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Reaction indexes
    op.create_index('ix_team_message_reactions_message', 'team_message_reactions', ['message_id'])
    op.create_index('ix_team_message_reactions_identity', 'team_message_reactions', ['identity_id'])
    # Unique constraint: one reaction per emoji per user per message
    op.create_index(
        'ix_team_message_reactions_unique',
        'team_message_reactions',
        ['message_id', 'identity_id', 'emoji'],
        unique=True
    )

    # =========================================================================
    # TEAM MESSAGE READS TABLE
    # =========================================================================

    op.create_table(
        'team_message_reads',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('team_id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_read_message_id', sa.String(length=36), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['challenge_teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['last_read_message_id'], ['team_messages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Read tracking indexes
    op.create_index('ix_team_message_reads_team', 'team_message_reads', ['team_id'])
    op.create_index('ix_team_message_reads_identity', 'team_message_reads', ['identity_id'])
    # Unique constraint: one read record per user per team
    op.create_index(
        'ix_team_message_reads_unique',
        'team_message_reads',
        ['team_id', 'identity_id'],
        unique=True
    )

    # =========================================================================
    # TEAM MESSAGE MENTIONS TABLE
    # =========================================================================

    op.create_table(
        'team_message_mentions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('message_id', sa.String(length=36), nullable=False),
        sa.Column('mentioned_id', sa.String(length=36), nullable=False),
        sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['message_id'], ['team_messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Mention indexes
    op.create_index('ix_team_message_mentions_message', 'team_message_mentions', ['message_id'])
    op.create_index('ix_team_message_mentions_mentioned', 'team_message_mentions', ['mentioned_id'])
    # Index for finding unread mentions
    op.create_index(
        'ix_team_message_mentions_unread',
        'team_message_mentions',
        ['mentioned_id', 'read_at'],
        postgresql_where=sa.text('read_at IS NULL')
    )


def downgrade() -> None:
    # =========================================================================
    # TEAM MESSAGE MENTIONS TABLE
    # =========================================================================
    op.drop_index('ix_team_message_mentions_unread', table_name='team_message_mentions')
    op.drop_index('ix_team_message_mentions_mentioned', table_name='team_message_mentions')
    op.drop_index('ix_team_message_mentions_message', table_name='team_message_mentions')
    op.drop_table('team_message_mentions')

    # =========================================================================
    # TEAM MESSAGE READS TABLE
    # =========================================================================
    op.drop_index('ix_team_message_reads_unique', table_name='team_message_reads')
    op.drop_index('ix_team_message_reads_identity', table_name='team_message_reads')
    op.drop_index('ix_team_message_reads_team', table_name='team_message_reads')
    op.drop_table('team_message_reads')

    # =========================================================================
    # TEAM MESSAGE REACTIONS TABLE
    # =========================================================================
    op.drop_index('ix_team_message_reactions_unique', table_name='team_message_reactions')
    op.drop_index('ix_team_message_reactions_identity', table_name='team_message_reactions')
    op.drop_index('ix_team_message_reactions_message', table_name='team_message_reactions')
    op.drop_table('team_message_reactions')

    # =========================================================================
    # TEAM MESSAGES TABLE
    # =========================================================================
    op.drop_index('ix_team_messages_team_active', table_name='team_messages')
    op.drop_index('ix_team_messages_team_created', table_name='team_messages')
    op.drop_index('ix_team_messages_sender', table_name='team_messages')
    op.drop_index('ix_team_messages_team', table_name='team_messages')
    op.drop_table('team_messages')
