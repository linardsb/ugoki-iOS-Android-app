"""add_exercise_metadata

Revision ID: 506cdfe5c0bc
Revises: 381d1817ac05
Create Date: 2026-01-10 18:31:25.001481

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '506cdfe5c0bc'
down_revision: Union[str, None] = '381d1817ac05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create body_focus enum type (uppercase to match SQLAlchemy behavior)
    body_focus_enum = sa.Enum(
        'UPPER_BODY', 'LOWER_BODY', 'FULL_BODY', 'CORE',
        name='bodyfocus'
    )
    body_focus_enum.create(op.get_bind(), checkfirst=True)

    # Add new columns to exercises table
    op.add_column('exercises', sa.Column(
        'body_focus',
        sa.Enum('UPPER_BODY', 'LOWER_BODY', 'FULL_BODY', 'CORE', name='bodyfocus'),
        nullable=True
    ))
    op.add_column('exercises', sa.Column(
        'difficulty',
        sa.Enum('beginner', 'intermediate', 'advanced', name='difficultylevel'),
        nullable=True
    ))
    op.add_column('exercises', sa.Column(
        'equipment_required',
        sa.Boolean(),
        server_default='false',
        nullable=False
    ))

    # Create indexes for filtering
    op.create_index('ix_exercises_body_focus', 'exercises', ['body_focus'])
    op.create_index('ix_exercises_difficulty', 'exercises', ['difficulty'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_exercises_difficulty', table_name='exercises')
    op.drop_index('ix_exercises_body_focus', table_name='exercises')

    # Drop columns
    op.drop_column('exercises', 'equipment_required')
    op.drop_column('exercises', 'difficulty')
    op.drop_column('exercises', 'body_focus')

    # Drop enum type
    body_focus_enum = sa.Enum(name='bodyfocus')
    body_focus_enum.drop(op.get_bind(), checkfirst=True)
