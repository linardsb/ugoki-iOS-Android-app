"""add_social_engagement_sprint1

Adds Sprint 1 social engagement features:
- Duo Streaks (duo_streaks, duo_streak_daily)
- Activity Feed (feed_items, feed_cheers, feed_preferences)
- Challenge Templates (challenge_templates)

Revision ID: h6c7d8e9f0g1
Revises: g5b6c7d8e9f0
Create Date: 2026-01-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'h6c7d8e9f0g1'
down_revision: Union[str, None] = 'g5b6c7d8e9f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # DUO STREAKS
    # =========================================================================

    # Create duo_streaks table
    op.create_table(
        'duo_streaks',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('identity_id_a', sa.String(length=36), nullable=False),
        sa.Column('identity_id_b', sa.String(length=36), nullable=False),
        sa.Column('streak_type', sa.Enum('FASTING', 'WORKOUT', 'ANY_ACTIVITY', name='duostreaktype'), nullable=False),
        sa.Column('current_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('longest_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_mutual_date', sa.Date(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        # Ensure identity_id_a < identity_id_b for normalization (same pattern as friendships)
        sa.CheckConstraint('identity_id_a < identity_id_b', name='chk_duo_streak_order'),
    )

    # Duo streaks indexes
    op.create_index('ix_duo_streaks_a', 'duo_streaks', ['identity_id_a'])
    op.create_index('ix_duo_streaks_b', 'duo_streaks', ['identity_id_b'])
    op.create_index('ix_duo_streaks_pair', 'duo_streaks', ['identity_id_a', 'identity_id_b', 'streak_type'], unique=True)
    op.create_index('ix_duo_streaks_active', 'duo_streaks', ['ended_at'], postgresql_where=sa.text('ended_at IS NULL'))

    # Create duo_streak_daily table for tracking daily completions
    op.create_table(
        'duo_streak_daily',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('duo_streak_id', sa.String(length=36), nullable=False),
        sa.Column('activity_date', sa.Date(), nullable=False),
        sa.Column('identity_id_a_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('identity_id_b_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('both_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['duo_streak_id'], ['duo_streaks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Duo streak daily indexes
    op.create_index('ix_duo_streak_daily_lookup', 'duo_streak_daily', ['duo_streak_id', 'activity_date'], unique=True)
    op.create_index('ix_duo_streak_daily_date', 'duo_streak_daily', ['activity_date'])

    # Create duo_streak_invites table for pending invitations
    op.create_table(
        'duo_streak_invites',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('from_identity_id', sa.String(length=36), nullable=False),
        sa.Column('to_identity_id', sa.String(length=36), nullable=False),
        sa.Column('streak_type', sa.Enum('FASTING', 'WORKOUT', 'ANY_ACTIVITY', name='duostreaktype', create_type=False), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'DECLINED', name='duostreakinvitestatus'), nullable=False, server_default='PENDING'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # Duo streak invites indexes
    op.create_index('ix_duo_streak_invites_to', 'duo_streak_invites', ['to_identity_id'])
    op.create_index('ix_duo_streak_invites_from', 'duo_streak_invites', ['from_identity_id'])
    op.create_index('ix_duo_streak_invites_pending', 'duo_streak_invites', ['to_identity_id', 'status'])

    # =========================================================================
    # ACTIVITY FEED
    # =========================================================================

    # Create feed_items table
    op.create_table(
        'feed_items',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('subtitle', sa.String(length=500), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('cheer_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        # Denormalized user data for fast display (updated via triggers or service)
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # Feed items indexes
    op.create_index('ix_feed_items_identity', 'feed_items', ['identity_id'])
    op.create_index('ix_feed_items_created', 'feed_items', ['created_at'])
    op.create_index('ix_feed_items_type', 'feed_items', ['activity_type'])
    # Composite index for feed queries (get friends' items sorted by time)
    op.create_index('ix_feed_items_identity_created', 'feed_items', ['identity_id', 'created_at'])

    # Create feed_cheers table
    op.create_table(
        'feed_cheers',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('feed_item_id', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['feed_item_id'], ['feed_items.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Feed cheers indexes
    op.create_index('ix_feed_cheers_item', 'feed_cheers', ['feed_item_id'])
    op.create_index('ix_feed_cheers_identity', 'feed_cheers', ['identity_id'])
    op.create_index('ix_feed_cheers_unique', 'feed_cheers', ['feed_item_id', 'identity_id'], unique=True)

    # Create feed_preferences table
    op.create_table(
        'feed_preferences',
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('share_fasts', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('share_workouts', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('share_achievements', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('share_level_ups', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('share_streaks', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('share_duo_streaks', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('identity_id'),
    )

    # =========================================================================
    # CHALLENGE TEMPLATES
    # =========================================================================

    # Create challenge_templates table
    # Note: challengetype enum already exists from d9e2f3a4b5c6_add_social_tables migration
    op.create_table(
        'challenge_templates',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('challenge_type', sa.String(length=50), nullable=False),  # Use String instead of Enum to avoid recreation
        sa.Column('duration_days', sa.Integer(), nullable=False),
        sa.Column('goal_value', sa.Float(), nullable=False),
        sa.Column('goal_unit', sa.String(length=20), nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Challenge templates indexes
    op.create_index('ix_challenge_templates_active', 'challenge_templates', ['is_active', 'sort_order'])

    # Seed default challenge templates
    op.execute("""
        INSERT INTO challenge_templates (id, name, description, challenge_type, duration_days, goal_value, goal_unit, icon, is_active, sort_order, created_at)
        VALUES
        ('7_day_fast', '7-Day Fast Challenge', 'Complete a fast every day for a week. Build the habit together!', 'FASTING_STREAK', 7, 7, 'fasts', 'fire', true, 1, CURRENT_TIMESTAMP),
        ('workout_week', 'Workout Week', 'Complete 5 workouts in 7 days. No excuses!', 'WORKOUT_COUNT', 7, 5, 'workouts', 'barbell', true, 2, CURRENT_TIMESTAMP),
        ('xp_sprint', 'XP Sprint', 'Earn the most XP in a week. Every activity counts!', 'TOTAL_XP', 7, 1000, 'XP', 'lightning', true, 3, CURRENT_TIMESTAMP),
        ('30_day_consistency', '30-Day Consistency', 'Log activity on 25 of 30 days. Consistency is key!', 'CONSISTENCY', 30, 25, 'days', 'calendar-check', true, 4, CURRENT_TIMESTAMP),
        ('monthly_muscle', 'Monthly Muscle', 'Complete 20 workouts in a month. Transform your fitness!', 'WORKOUT_COUNT', 30, 20, 'workouts', 'muscle', true, 5, CURRENT_TIMESTAMP),
        ('fasting_february', 'Fasting February', 'Complete 20 fasts in 28 days. Master your metabolism!', 'FASTING_STREAK', 28, 20, 'fasts', 'timer', true, 6, CURRENT_TIMESTAMP)
    """)

    # =========================================================================
    # DUO STREAK MILESTONES (for tracking and rewarding milestones)
    # =========================================================================

    op.create_table(
        'duo_streak_milestones',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('duo_streak_id', sa.String(length=36), nullable=False),
        sa.Column('milestone_days', sa.Integer(), nullable=False),
        sa.Column('reached_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('xp_awarded_a', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('xp_awarded_b', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['duo_streak_id'], ['duo_streaks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Duo streak milestones indexes
    op.create_index('ix_duo_streak_milestones_streak', 'duo_streak_milestones', ['duo_streak_id'])
    op.create_index('ix_duo_streak_milestones_unique', 'duo_streak_milestones', ['duo_streak_id', 'milestone_days'], unique=True)


def downgrade() -> None:
    # =========================================================================
    # DUO STREAK MILESTONES
    # =========================================================================
    op.drop_index('ix_duo_streak_milestones_unique', table_name='duo_streak_milestones')
    op.drop_index('ix_duo_streak_milestones_streak', table_name='duo_streak_milestones')
    op.drop_table('duo_streak_milestones')

    # =========================================================================
    # CHALLENGE TEMPLATES
    # =========================================================================
    op.drop_index('ix_challenge_templates_active', table_name='challenge_templates')
    op.drop_table('challenge_templates')

    # =========================================================================
    # ACTIVITY FEED
    # =========================================================================
    op.drop_table('feed_preferences')

    op.drop_index('ix_feed_cheers_unique', table_name='feed_cheers')
    op.drop_index('ix_feed_cheers_identity', table_name='feed_cheers')
    op.drop_index('ix_feed_cheers_item', table_name='feed_cheers')
    op.drop_table('feed_cheers')

    op.drop_index('ix_feed_items_identity_created', table_name='feed_items')
    op.drop_index('ix_feed_items_type', table_name='feed_items')
    op.drop_index('ix_feed_items_created', table_name='feed_items')
    op.drop_index('ix_feed_items_identity', table_name='feed_items')
    op.drop_table('feed_items')

    # =========================================================================
    # DUO STREAKS
    # =========================================================================
    op.drop_index('ix_duo_streak_invites_pending', table_name='duo_streak_invites')
    op.drop_index('ix_duo_streak_invites_from', table_name='duo_streak_invites')
    op.drop_index('ix_duo_streak_invites_to', table_name='duo_streak_invites')
    op.drop_table('duo_streak_invites')

    op.drop_index('ix_duo_streak_daily_date', table_name='duo_streak_daily')
    op.drop_index('ix_duo_streak_daily_lookup', table_name='duo_streak_daily')
    op.drop_table('duo_streak_daily')

    op.drop_index('ix_duo_streaks_active', table_name='duo_streaks')
    op.drop_index('ix_duo_streaks_pair', table_name='duo_streaks')
    op.drop_index('ix_duo_streaks_b', table_name='duo_streaks')
    op.drop_index('ix_duo_streaks_a', table_name='duo_streaks')
    op.drop_table('duo_streaks')

    # Drop enum types
    sa.Enum('PENDING', 'ACCEPTED', 'DECLINED', name='duostreakinvitestatus').drop(op.get_bind())
    sa.Enum('FASTING', 'WORKOUT', 'ANY_ACTIVITY', name='duostreaktype').drop(op.get_bind())
