"""add_revoked_tokens_table

Revision ID: 7a8b9c0d1e2f
Revises: 506cdfe5c0bc
Create Date: 2026-01-10 22:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, None] = '506cdfe5c0bc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add revoked_tokens table for JWT token revocation."""
    op.create_table(
        'revoked_tokens',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('identity_id', sa.String(length=36), nullable=False),
        sa.Column('token_type', sa.String(length=20), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    # Index on JTI for fast lookup during token validation
    op.create_index(op.f('ix_revoked_tokens_jti'), 'revoked_tokens', ['jti'], unique=True)
    # Index on identity_id for user-specific queries
    op.create_index(op.f('ix_revoked_tokens_identity_id'), 'revoked_tokens', ['identity_id'], unique=False)
    # Index on expires_at for cleanup of expired entries
    op.create_index(op.f('ix_revoked_tokens_expires_at'), 'revoked_tokens', ['expires_at'], unique=False)


def downgrade() -> None:
    """Remove revoked_tokens table."""
    op.drop_index(op.f('ix_revoked_tokens_expires_at'), table_name='revoked_tokens')
    op.drop_index(op.f('ix_revoked_tokens_identity_id'), table_name='revoked_tokens')
    op.drop_index(op.f('ix_revoked_tokens_jti'), table_name='revoked_tokens')
    op.drop_table('revoked_tokens')
