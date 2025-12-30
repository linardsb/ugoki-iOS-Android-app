"""add_activity_events_table

Revision ID: c8f1e2d3a4b5
Revises: 2a037d15a76b
Create Date: 2025-12-30 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8f1e2d3a4b5'
down_revision: Union[str, None] = '2a037d15a76b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create activity_events table
    op.create_table(
        'activity_events',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=20), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('related_id', sa.String(length=36), nullable=True),
        sa.Column('related_type', sa.String(length=30), nullable=True),
        sa.Column('source', sa.String(length=20), nullable=False, server_default='api'),
        sa.Column('event_metadata', sa.JSON(), nullable=False, server_default='{}'),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for common query patterns
    # Primary query: user's events ordered by time (activity feed)
    op.create_index(
        'ix_events_identity_timestamp',
        'activity_events',
        ['identity_id', 'timestamp']
    )

    # Filter by category (fasting events, workout events, etc.)
    op.create_index(
        'ix_events_identity_category',
        'activity_events',
        ['identity_id', 'category']
    )

    # Filter by event type (all fast_completed events)
    op.create_index(
        'ix_events_type',
        'activity_events',
        ['event_type']
    )

    # Find events related to a specific resource
    op.create_index(
        'ix_events_related',
        'activity_events',
        ['related_id']
    )

    # Analytics: events in a time range by category
    op.create_index(
        'ix_events_category_timestamp',
        'activity_events',
        ['category', 'timestamp']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_events_category_timestamp', table_name='activity_events')
    op.drop_index('ix_events_related', table_name='activity_events')
    op.drop_index('ix_events_type', table_name='activity_events')
    op.drop_index('ix_events_identity_category', table_name='activity_events')
    op.drop_index('ix_events_identity_timestamp', table_name='activity_events')

    # Drop table
    op.drop_table('activity_events')
