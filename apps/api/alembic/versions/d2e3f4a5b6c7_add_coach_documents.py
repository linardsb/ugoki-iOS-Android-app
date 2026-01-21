"""add coach documents table with pgvector

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-01-21 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'd2e3f4a5b6c7'
down_revision: Union[str, None] = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable pgvector extension
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')

    # Create coach_documents table for RAG
    op.create_table(
        'coach_documents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata', sa.JSON(), server_default=sa.text("'{}'"), nullable=False),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('identity_id', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('idx_coach_docs_identity', 'coach_documents', ['identity_id'], unique=False)

    # Create HNSW index for efficient vector similarity search
    op.execute('''
        CREATE INDEX idx_coach_docs_embedding_hnsw
        ON coach_documents USING hnsw (embedding vector_cosine_ops)
    ''')


def downgrade() -> None:
    op.drop_index('idx_coach_docs_embedding_hnsw', table_name='coach_documents')
    op.drop_index('idx_coach_docs_identity', table_name='coach_documents')
    op.drop_table('coach_documents')
