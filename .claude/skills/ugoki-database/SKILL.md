---
name: ugoki-database
description: >
  UGOKI database with SQLAlchemy 2.0 and Alembic. Load when: creating models,
  writing migrations, adding indexes, querying data, or debugging database
  issues. Keywords: ORM, SQLAlchemy, Alembic, migration, schema, table, column,
  index, query, database, PostgreSQL, SQLite, async, relationship.
---

# UGOKI Database Development

## Stack

```
ORM:        SQLAlchemy 2.0 (async, Mapped types)
Migrations: Alembic
Dev:        SQLite + aiosqlite
Prod:       PostgreSQL + asyncpg
```

---

## Pre-Flight Checklist

Before making database changes:

```
□ Is the dev server stopped? (avoid lock conflicts)
□ Backup test DB: cp ugoki.db ugoki.db.backup
□ Check existing indexes (avoid duplicates)
□ Check foreign key cascades
□ Generate migration BEFORE coding service
□ Test migration rollback works
```

---

## ORM Model Template

```python
from sqlalchemy import String, Float, Integer, Boolean, DateTime, Text
from sqlalchemy import ForeignKey, Index, JSON
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.db.database import Base
from datetime import datetime
from typing import Optional
import uuid
import enum


class ItemStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class ItemORM(Base):
    __tablename__ = "items"

    # Primary key - ALWAYS prefixed UUID
    id: Mapped[str] = mapped_column(
        String(50), 
        primary_key=True,
        default=lambda: f"item_{uuid.uuid4().hex[:12]}"
    )
    
    # Foreign key with CASCADE
    identity_id: Mapped[str] = mapped_column(
        String(50), 
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Required string
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Optional string
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Numbers
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Boolean
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Enum
    status: Mapped[ItemStatus] = mapped_column(
        SQLEnum(ItemStatus, name="item_status_enum"),
        nullable=False,
        default=ItemStatus.ACTIVE
    )
    
    # JSON (for flexible data)
    metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, 
        onupdate=datetime.utcnow,
        nullable=True
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, 
        nullable=True  # For soft delete
    )
    
    # Relationships
    identity = relationship("IdentityORM", back_populates="items")
    children = relationship("ChildORM", back_populates="parent", cascade="all, delete-orphan")
    
    # ⚠️ Indexes ONLY in __table_args__
    __table_args__ = (
        Index("ix_items_identity_id", "identity_id"),
        Index("ix_items_status", "status"),
        Index("ix_items_created_at", "created_at"),
        # Composite index for common queries
        Index("ix_items_identity_status", "identity_id", "status"),
    )
```

---

## Critical Gotchas

### 1. Duplicate Index Error

```python
# ❌ WRONG: Creates index twice → "index already exists"
name = Column(String, index=True)
__table_args__ = (Index("ix_items_name", "name"),)

# ✅ RIGHT: Pick ONE approach
name = Column(String)  # No index here
__table_args__ = (Index("ix_items_name", "name"),)  # Index here only
```

### 2. Async Session Pattern

```python
# ⚠️ MUST await commit AND refresh
async def create(self, data) -> ItemORM:
    item = ItemORM(**data)
    self.db.add(item)
    await self.db.commit()        # ← Required!
    await self.db.refresh(item)   # ← Required for generated fields!
    return item
```

### 3. Enum Naming

```python
# ❌ WRONG: Enum without name causes issues
status = Column(SQLEnum(ItemStatus))

# ✅ RIGHT: Always provide explicit name
status = Column(SQLEnum(ItemStatus, name="item_status_enum"))
```

---

## Async Query Patterns

### CRUD Operations

```python
from sqlalchemy import select, update, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

class ItemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # CREATE
    async def create(self, identity_id: str, **data) -> ItemORM:
        item = ItemORM(identity_id=identity_id, **data)
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    # READ single
    async def get_by_id(self, item_id: str) -> ItemORM | None:
        result = await self.db.execute(
            select(ItemORM).where(ItemORM.id == item_id)
        )
        return result.scalar_one_or_none()

    # READ list with filters
    async def list_active(
        self, 
        identity_id: str, 
        limit: int = 20
    ) -> list[ItemORM]:
        result = await self.db.execute(
            select(ItemORM)
            .where(
                ItemORM.identity_id == identity_id,
                ItemORM.deleted_at.is_(None),
                ItemORM.status == ItemStatus.ACTIVE
            )
            .order_by(ItemORM.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars())

    # UPDATE
    async def update(self, item_id: str, **data) -> ItemORM | None:
        result = await self.db.execute(
            select(ItemORM).where(ItemORM.id == item_id)
        )
        item = result.scalar_one_or_none()
        if not item:
            return None
        
        for key, value in data.items():
            setattr(item, key, value)
        
        await self.db.commit()
        await self.db.refresh(item)
        return item

    # SOFT DELETE
    async def soft_delete(self, item_id: str) -> bool:
        result = await self.db.execute(
            update(ItemORM)
            .where(ItemORM.id == item_id, ItemORM.deleted_at.is_(None))
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount > 0

    # HARD DELETE (rare)
    async def hard_delete(self, item_id: str) -> bool:
        result = await self.db.execute(
            delete(ItemORM).where(ItemORM.id == item_id)
        )
        await self.db.commit()
        return result.rowcount > 0
```

### Aggregations

```python
from sqlalchemy import func

# Count
async def count_active(self, identity_id: str) -> int:
    result = await self.db.execute(
        select(func.count(ItemORM.id)).where(
            ItemORM.identity_id == identity_id,
            ItemORM.status == ItemStatus.ACTIVE
        )
    )
    return result.scalar() or 0

# Sum with COALESCE
async def total_value(self, identity_id: str) -> float:
    result = await self.db.execute(
        select(func.coalesce(func.sum(ItemORM.value), 0.0)).where(
            ItemORM.identity_id == identity_id
        )
    )
    return result.scalar() or 0.0

# Average
async def average_value(self, identity_id: str) -> float | None:
    result = await self.db.execute(
        select(func.avg(ItemORM.value)).where(
            ItemORM.identity_id == identity_id
        )
    )
    return result.scalar()
```

### Joins and Relationships

```python
from sqlalchemy.orm import joinedload, selectinload

# Eager load single relationship
async def get_with_details(self, item_id: str) -> ItemORM | None:
    result = await self.db.execute(
        select(ItemORM)
        .options(joinedload(ItemORM.details))
        .where(ItemORM.id == item_id)
    )
    return result.scalar_one_or_none()

# Eager load collection
async def get_with_children(self, item_id: str) -> ItemORM | None:
    result = await self.db.execute(
        select(ItemORM)
        .options(selectinload(ItemORM.children))
        .where(ItemORM.id == item_id)
    )
    return result.unique().scalar_one_or_none()
```

---

## Alembic Migrations

### Commands

```bash
# Generate from model changes
uv run alembic revision --autogenerate -m "add items table"

# Apply all pending
uv run alembic upgrade head

# Rollback one
uv run alembic downgrade -1

# Rollback to specific
uv run alembic downgrade abc123

# Show current version
uv run alembic current

# Show history
uv run alembic history
```

### Migration Template

```python
"""add items table

Revision ID: abc123def456
Revises: previous_rev
Create Date: 2024-01-15 10:30:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'abc123def456'
down_revision = 'previous_rev'

def upgrade() -> None:
    op.create_table(
        'items',
        sa.Column('id', sa.String(50), nullable=False),
        sa.Column('identity_id', sa.String(50), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('value', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('status', sa.Enum('active', 'archived', name='item_status_enum'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['identity_id'], ['identities.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_items_identity_id', 'items', ['identity_id'])
    op.create_index('ix_items_status', 'items', ['status'])

def downgrade() -> None:
    op.drop_index('ix_items_status')
    op.drop_index('ix_items_identity_id')
    op.drop_table('items')
    # Don't forget to drop enum if not used elsewhere
    op.execute('DROP TYPE IF EXISTS item_status_enum')
```

---

## ID Conventions

| Entity | Prefix | Example |
|--------|--------|---------|
| Identity | `id_` | `id_abc123xyz` |
| Time Window | `win_` | `win_def456` |
| Event | `evt_` | `evt_ghi789` |
| Metric | `met_` | `met_jkl012` |
| Achievement | `ach_` | `ach_mno345` |
| Workout | `wkt_` | `wkt_pqr678` |
| Recipe | `rcp_` | `rcp_stu901` |
| Challenge | `chl_` | `chl_vwx234` |

---

## Debugging Database Issues

### Migration Failed

```bash
# 1. Check what went wrong
uv run alembic history --verbose

# 2. Rollback
uv run alembic downgrade -1

# 3. Fix the migration file

# 4. Re-run
uv run alembic upgrade head
```

### "No Such Table"

1. Did migration run? `uv run alembic upgrade head`
2. Check current version: `uv run alembic current`
3. Check if table exists: `sqlite3 ugoki.db ".tables"`

### Slow Queries

1. Add appropriate indexes
2. Use `EXPLAIN ANALYZE` (PostgreSQL) or `EXPLAIN QUERY PLAN` (SQLite)
3. Check for N+1 queries → use `selectinload`

---

## References

- `references/complex-queries.md` - CTEs, subqueries, window functions
- `references/indexes.md` - When and how to index
