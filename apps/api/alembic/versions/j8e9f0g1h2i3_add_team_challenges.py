"""add_team_challenges

Adds Sprint 3 social engagement features:
- Team challenges: groups of 3-10 users compete together
- challenge_teams table for team management
- Extend challenges table with team challenge flags
- Add team_id to challenge_participants

Revision ID: j8e9f0g1h2i3
Revises: i7d8e9f0g1h2
Create Date: 2026-01-30 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'j8e9f0g1h2i3'
down_revision: Union[str, None] = 'i7d8e9f0g1h2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # EXTEND CHALLENGES TABLE FOR TEAM CHALLENGES
    # =========================================================================

    # Add team challenge columns to challenges table
    op.add_column('challenges', sa.Column('is_team_challenge', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('challenges', sa.Column('team_size_min', sa.Integer(), nullable=True))
    op.add_column('challenges', sa.Column('team_size_max', sa.Integer(), nullable=True))

    # =========================================================================
    # CHALLENGE TEAMS TABLE
    # =========================================================================

    # Create challenge_teams table
    op.create_table(
        'challenge_teams',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('challenge_id', sa.String(length=36), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_by', sa.String(length=36), nullable=False),
        sa.Column('join_code', sa.String(length=8), nullable=False),
        sa.Column('total_progress', sa.Float(), nullable=False, server_default='0'),
        sa.Column('member_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['challenge_id'], ['challenges.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # Challenge teams indexes
    op.create_index('ix_challenge_teams_challenge', 'challenge_teams', ['challenge_id'])
    op.create_index('ix_challenge_teams_join_code', 'challenge_teams', ['join_code'], unique=True)
    op.create_index('ix_challenge_teams_created_by', 'challenge_teams', ['created_by'])

    # =========================================================================
    # ADD TEAM_ID TO CHALLENGE PARTICIPANTS
    # =========================================================================

    # Add team_id column to challenge_participants
    op.add_column(
        'challenge_participants',
        sa.Column(
            'team_id',
            sa.String(length=36),
            sa.ForeignKey('challenge_teams.id', ondelete='SET NULL'),
            nullable=True
        )
    )
    op.create_index('ix_participants_team', 'challenge_participants', ['team_id'])


def downgrade() -> None:
    # =========================================================================
    # REMOVE TEAM_ID FROM CHALLENGE PARTICIPANTS
    # =========================================================================
    op.drop_index('ix_participants_team', table_name='challenge_participants')
    op.drop_column('challenge_participants', 'team_id')

    # =========================================================================
    # CHALLENGE TEAMS TABLE
    # =========================================================================
    op.drop_index('ix_challenge_teams_created_by', table_name='challenge_teams')
    op.drop_index('ix_challenge_teams_join_code', table_name='challenge_teams')
    op.drop_index('ix_challenge_teams_challenge', table_name='challenge_teams')
    op.drop_table('challenge_teams')

    # =========================================================================
    # REMOVE TEAM CHALLENGE COLUMNS FROM CHALLENGES
    # =========================================================================
    op.drop_column('challenges', 'team_size_max')
    op.drop_column('challenges', 'team_size_min')
    op.drop_column('challenges', 'is_team_challenge')
