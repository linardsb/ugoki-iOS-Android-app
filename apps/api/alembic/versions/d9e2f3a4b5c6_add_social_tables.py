"""add_social_tables

Revision ID: d9e2f3a4b5c6
Revises: c8f1e2d3a4b5
Create Date: 2025-12-31 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9e2f3a4b5c6'
down_revision: Union[str, None] = 'c8f1e2d3a4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create friendships table
    op.create_table(
        'friendships',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('identity_id_a', sa.String(length=36), nullable=False),
        sa.Column('identity_id_b', sa.String(length=36), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'BLOCKED', name='friendshipstatus'), nullable=False),
        sa.Column('requested_by', sa.String(length=36), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        # Ensure identity_id_a < identity_id_b for normalization
        sa.CheckConstraint('identity_id_a < identity_id_b', name='chk_friendship_order'),
    )

    # Friendships indexes
    op.create_index('ix_friendships_a', 'friendships', ['identity_id_a'])
    op.create_index('ix_friendships_b', 'friendships', ['identity_id_b'])
    op.create_index('ix_friendships_a_status', 'friendships', ['identity_id_a', 'status'])
    op.create_index('ix_friendships_b_status', 'friendships', ['identity_id_b', 'status'])
    op.create_index('ix_friendships_pair', 'friendships', ['identity_id_a', 'identity_id_b'], unique=True)

    # Create follows table
    op.create_table(
        'follows',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('follower_id', sa.String(length=36), nullable=False),
        sa.Column('following_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Follows indexes
    op.create_index('ix_follows_follower', 'follows', ['follower_id'])
    op.create_index('ix_follows_following', 'follows', ['following_id'])
    op.create_index('ix_follows_pair', 'follows', ['follower_id', 'following_id'], unique=True)

    # Create challenges table
    op.create_table(
        'challenges',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('challenge_type', sa.Enum('FASTING_STREAK', 'WORKOUT_COUNT', 'TOTAL_XP', 'CONSISTENCY', name='challengetype'), nullable=False),
        sa.Column('goal_value', sa.Float(), nullable=False),
        sa.Column('goal_unit', sa.String(length=20), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=False),
        sa.Column('join_code', sa.String(length=8), nullable=False),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('max_participants', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Challenges indexes
    op.create_index('ix_challenges_created_by', 'challenges', ['created_by'])
    op.create_index('ix_challenges_join_code', 'challenges', ['join_code'], unique=True)
    op.create_index('ix_challenges_dates', 'challenges', ['start_date', 'end_date'])
    op.create_index('ix_challenges_type', 'challenges', ['challenge_type'])
    op.create_index('ix_challenges_public', 'challenges', ['is_public'])

    # Create challenge_participants table
    op.create_table(
        'challenge_participants',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('challenge_id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_progress', sa.Float(), nullable=False, server_default='0'),
        sa.Column('completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Challenge participants indexes
    op.create_index('ix_participants_challenge', 'challenge_participants', ['challenge_id'])
    op.create_index('ix_participants_identity', 'challenge_participants', ['identity_id'])
    op.create_index('ix_participants_challenge_identity', 'challenge_participants', ['challenge_id', 'identity_id'], unique=True)
    op.create_index('ix_participants_progress', 'challenge_participants', ['challenge_id', 'current_progress'])


def downgrade() -> None:
    # Drop challenge_participants table and indexes
    op.drop_index('ix_participants_progress', table_name='challenge_participants')
    op.drop_index('ix_participants_challenge_identity', table_name='challenge_participants')
    op.drop_index('ix_participants_identity', table_name='challenge_participants')
    op.drop_index('ix_participants_challenge', table_name='challenge_participants')
    op.drop_table('challenge_participants')

    # Drop challenges table and indexes
    op.drop_index('ix_challenges_public', table_name='challenges')
    op.drop_index('ix_challenges_type', table_name='challenges')
    op.drop_index('ix_challenges_dates', table_name='challenges')
    op.drop_index('ix_challenges_join_code', table_name='challenges')
    op.drop_index('ix_challenges_created_by', table_name='challenges')
    op.drop_table('challenges')

    # Drop follows table and indexes
    op.drop_index('ix_follows_pair', table_name='follows')
    op.drop_index('ix_follows_following', table_name='follows')
    op.drop_index('ix_follows_follower', table_name='follows')
    op.drop_table('follows')

    # Drop friendships table and indexes
    op.drop_index('ix_friendships_pair', table_name='friendships')
    op.drop_index('ix_friendships_b_status', table_name='friendships')
    op.drop_index('ix_friendships_a_status', table_name='friendships')
    op.drop_index('ix_friendships_b', table_name='friendships')
    op.drop_index('ix_friendships_a', table_name='friendships')
    op.drop_table('friendships')

    # Drop enum types
    sa.Enum('FASTING_STREAK', 'WORKOUT_COUNT', 'TOTAL_XP', 'CONSISTENCY', name='challengetype').drop(op.get_bind())
    sa.Enum('PENDING', 'ACCEPTED', 'BLOCKED', name='friendshipstatus').drop(op.get_bind())
