"""add biomarker metadata and bloodwork onboarding step

Revision ID: aa09363f0ae9
Revises: f14424e7a998
Create Date: 2025-12-28 11:17:37.720797

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aa09363f0ae9'
down_revision: Union[str, None] = 'f14424e7a998'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns to metrics table
    op.add_column('metrics', sa.Column('unit', sa.String(length=50), nullable=True))
    op.add_column('metrics', sa.Column('reference_low', sa.Float(), nullable=True))
    op.add_column('metrics', sa.Column('reference_high', sa.Float(), nullable=True))
    op.add_column('metrics', sa.Column('flag', sa.Enum('LOW', 'NORMAL', 'HIGH', 'ABNORMAL', name='biomarkerflag'), nullable=True))

    # Use batch mode for SQLite to alter column type
    with op.batch_alter_table('metrics', schema=None) as batch_op:
        batch_op.alter_column('metric_type',
                              existing_type=sa.VARCHAR(length=17),
                              type_=sa.String(length=100),
                              existing_nullable=False)

    # Create index on metric_type for prefix queries
    op.create_index('ix_metrics_type_prefix', 'metrics', ['metric_type'], unique=False)

    # Add bloodwork_uploaded to onboarding_status with default False
    # Use batch mode for SQLite to handle NOT NULL with default
    with op.batch_alter_table('onboarding_status', schema=None) as batch_op:
        batch_op.add_column(sa.Column('bloodwork_uploaded', sa.Boolean(), nullable=False, server_default=sa.text('0')))


def downgrade() -> None:
    with op.batch_alter_table('onboarding_status', schema=None) as batch_op:
        batch_op.drop_column('bloodwork_uploaded')

    op.drop_index('ix_metrics_type_prefix', table_name='metrics')

    with op.batch_alter_table('metrics', schema=None) as batch_op:
        batch_op.alter_column('metric_type',
                              existing_type=sa.String(length=100),
                              type_=sa.VARCHAR(length=17),
                              existing_nullable=False)

    op.drop_column('metrics', 'flag')
    op.drop_column('metrics', 'reference_high')
    op.drop_column('metrics', 'reference_low')
    op.drop_column('metrics', 'unit')
