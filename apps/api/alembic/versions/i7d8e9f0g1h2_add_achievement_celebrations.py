"""add_achievement_celebrations

Adds Sprint 2 social engagement features:
- Achievement Celebrations table for celebrating friends' achievements with XP rewards

Revision ID: i7d8e9f0g1h2
Revises: h6c7d8e9f0g1
Create Date: 2026-01-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'i7d8e9f0g1h2'
down_revision: Union[str, None] = 'h6c7d8e9f0g1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # ACHIEVEMENT CELEBRATIONS
    # =========================================================================

    # Create achievement_celebrations table
    op.create_table(
        'achievement_celebrations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_achievement_id', sa.String(length=36), nullable=False),
        sa.Column('celebrator_identity_id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('xp_awarded_achiever', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('xp_awarded_celebrator', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['user_achievement_id'], ['user_achievements.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Achievement celebrations indexes
    op.create_index('ix_achievement_celebrations_achievement', 'achievement_celebrations', ['user_achievement_id'])
    op.create_index('ix_achievement_celebrations_celebrator', 'achievement_celebrations', ['celebrator_identity_id'])
    op.create_index(
        'ix_achievement_celebrations_unique',
        'achievement_celebrations',
        ['user_achievement_id', 'celebrator_identity_id'],
        unique=True
    )


def downgrade() -> None:
    # =========================================================================
    # ACHIEVEMENT CELEBRATIONS
    # =========================================================================
    op.drop_index('ix_achievement_celebrations_unique', table_name='achievement_celebrations')
    op.drop_index('ix_achievement_celebrations_celebrator', table_name='achievement_celebrations')
    op.drop_index('ix_achievement_celebrations_achievement', table_name='achievement_celebrations')
    op.drop_table('achievement_celebrations')
