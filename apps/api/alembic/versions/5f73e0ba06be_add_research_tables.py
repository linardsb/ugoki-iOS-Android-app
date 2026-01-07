"""add_research_tables

Revision ID: 5f73e0ba06be
Revises: d9e2f3a4b5c6
Create Date: 2026-01-02 07:02:10.575198

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '5f73e0ba06be'
down_revision: Union[str, None] = 'd9e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Research papers table (enums are created inline by SQLAlchemy)
    op.create_table(
        'research_papers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('pmid', sa.String(20), nullable=True, unique=True),
        sa.Column('doi', sa.String(100), nullable=True, unique=True),
        sa.Column('title', sa.Text, nullable=False),
        sa.Column('authors', sa.JSON, nullable=True),
        sa.Column('journal', sa.String(500), nullable=True),
        sa.Column('publication_date', sa.Date, nullable=True),
        sa.Column('topic', sa.Enum('intermittent_fasting', 'hiit', 'nutrition', 'sleep', name='researchtopic'), nullable=False),
        sa.Column('abstract', sa.Text, nullable=True),
        sa.Column('external_url', sa.String(500), nullable=False),
        sa.Column('open_access', sa.Boolean, default=False, nullable=False),
        sa.Column('source', sa.Enum('pubmed', 'openalex', 'europepmc', name='researchsource'), nullable=False, server_default='pubmed'),
        # AI-generated digest
        sa.Column('one_liner', sa.Text, nullable=True),
        sa.Column('key_benefits', sa.JSON, nullable=True),
        sa.Column('who_benefits', sa.Text, nullable=True),
        sa.Column('tldr', sa.Text, nullable=True),
        sa.Column('ai_processed_at', sa.DateTime, nullable=True),
        # Timestamps
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_research_papers_topic', 'research_papers', ['topic'])
    op.create_index('ix_research_papers_pmid', 'research_papers', ['pmid'])
    op.create_index('ix_research_papers_doi', 'research_papers', ['doi'])
    op.create_index('ix_research_papers_date', 'research_papers', ['publication_date'])

    # User saved research table
    op.create_table(
        'user_saved_research',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('identity_id', sa.String(36), nullable=False),
        sa.Column('research_id', sa.String(36), sa.ForeignKey('research_papers.id'), nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('saved_at', sa.DateTime, nullable=False),
    )
    op.create_index('ix_user_saved_research_identity', 'user_saved_research', ['identity_id'])
    op.create_index('ix_user_saved_research_unique', 'user_saved_research', ['identity_id', 'research_id'], unique=True)

    # User search quotas table
    op.create_table(
        'user_search_quotas',
        sa.Column('identity_id', sa.String(36), primary_key=True),
        sa.Column('searches_today', sa.Integer, default=0, nullable=False),
        sa.Column('last_search_at', sa.DateTime, nullable=True),
        sa.Column('quota_resets_at', sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    op.drop_table('user_search_quotas')
    op.drop_index('ix_user_saved_research_unique', 'user_saved_research')
    op.drop_index('ix_user_saved_research_identity', 'user_saved_research')
    op.drop_table('user_saved_research')
    op.drop_index('ix_research_papers_date', 'research_papers')
    op.drop_index('ix_research_papers_doi', 'research_papers')
    op.drop_index('ix_research_papers_pmid', 'research_papers')
    op.drop_index('ix_research_papers_topic', 'research_papers')
    op.drop_table('research_papers')

    # Drop enum types (PostgreSQL)
    sa.Enum(name='researchsource').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='researchtopic').drop(op.get_bind(), checkfirst=True)
