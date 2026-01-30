---
name: ugoki-api-module
description: >
  UGOKI backend development with FastAPI, Pydantic, SQLAlchemy. Load when:
  creating/modifying API endpoints, writing services, working with Pydantic
  models, FastAPI routes, dependency injection, or any backend Python code.
  Keywords: endpoint, route, FastAPI, Pydantic, service, API, backend, POST,
  GET, PATCH, DELETE, request, response, module, async, Depends.
---

# UGOKI API Development

## Module Structure

```
src/modules/{module_name}/
├── __init__.py          # Exports: Service, router
├── interface.py         # Abstract interface (ABC) - optional but good
├── models.py            # Pydantic request/response models
├── orm.py               # SQLAlchemy ORM models
├── service.py           # Business logic
└── routes.py            # FastAPI endpoints
```

---

## Complete Patterns

### 1. Pydantic Models (`models.py`)

```python
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional
from enum import Enum

# Enums (match backend logic)
class ItemStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class MetricSource(str, Enum):
    USER_INPUT = "user_input"      # ⚠️ NOT "manual"!
    CALCULATED = "calculated"
    DEVICE_SYNC = "device_sync"

# Request model with validation
class CreateItemRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    value: float = Field(..., ge=0, le=10000)
    status: ItemStatus = ItemStatus.ACTIVE
    
    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip()

# Response model (from_attributes for ORM)
class ItemResponse(BaseModel):
    id: str
    name: str
    value: float
    status: ItemStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # Required for ORM → Pydantic

# List response with pagination
class ItemListResponse(BaseModel):
    items: list[ItemResponse]
    total: int
    has_more: bool
```

### 2. SQLAlchemy ORM (`orm.py`)

```python
from sqlalchemy import String, Float, DateTime, ForeignKey, Index, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.db.database import Base
from datetime import datetime
import uuid

class ItemORM(Base):
    __tablename__ = "items"

    # Primary key - ALWAYS prefixed UUID
    id: Mapped[str] = mapped_column(
        String(50), 
        primary_key=True,
        default=lambda: f"item_{uuid.uuid4().hex[:12]}"
    )
    
    # Foreign key with cascade delete
    identity_id: Mapped[str] = mapped_column(
        String(50), 
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Fields
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "archived", name="item_status_enum"),
        nullable=False,
        default="active"
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
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
        nullable=True
    )
    
    # Relationship
    identity = relationship("IdentityORM", back_populates="items")
    
    # ⚠️ Indexes ONLY here, NOT on column definitions
    __table_args__ = (
        Index("ix_items_identity_id", "identity_id"),
        Index("ix_items_status", "status"),
        Index("ix_items_identity_status", "identity_id", "status"),
        Index("ix_items_created_at", "created_at"),
    )
```

### 3. Service Layer (`service.py`)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.orm import selectinload
from datetime import datetime
from typing import Optional

from .models import CreateItemRequest, UpdateItemRequest, ItemResponse, ItemListResponse
from .orm import ItemORM

class ItemService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # CREATE
    async def create(
        self, 
        identity_id: str, 
        data: CreateItemRequest
    ) -> ItemResponse:
        item = ItemORM(
            identity_id=identity_id,
            **data.model_dump()
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)  # ⚠️ Required for generated fields!
        return ItemResponse.model_validate(item)

    # READ - single
    async def get_by_id(self, item_id: str) -> Optional[ItemResponse]:
        result = await self.db.execute(
            select(ItemORM).where(
                ItemORM.id == item_id,
                ItemORM.deleted_at.is_(None)
            )
        )
        item = result.scalar_one_or_none()
        return ItemResponse.model_validate(item) if item else None

    # READ - list with filters and pagination
    async def list_for_user(
        self,
        identity_id: str,
        status: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> ItemListResponse:
        query = select(ItemORM).where(
            ItemORM.identity_id == identity_id,
            ItemORM.deleted_at.is_(None)
        )
        
        if status:
            query = query.where(ItemORM.status == status)
        
        if cursor:
            # Cursor-based pagination (by created_at)
            cursor_item = await self.get_by_id(cursor)
            if cursor_item:
                query = query.where(ItemORM.created_at < cursor_item.created_at)
        
        query = query.order_by(ItemORM.created_at.desc()).limit(limit + 1)
        
        result = await self.db.execute(query)
        items = list(result.scalars())
        
        has_more = len(items) > limit
        items = items[:limit]
        
        return ItemListResponse(
            items=[ItemResponse.model_validate(i) for i in items],
            total=len(items),
            has_more=has_more
        )

    # UPDATE
    async def update(
        self, 
        item_id: str, 
        data: UpdateItemRequest
    ) -> Optional[ItemResponse]:
        result = await self.db.execute(
            select(ItemORM).where(
                ItemORM.id == item_id,
                ItemORM.deleted_at.is_(None)
            )
        )
        item = result.scalar_one_or_none()
        
        if not item:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(item, key, value)
        
        await self.db.commit()
        await self.db.refresh(item)
        return ItemResponse.model_validate(item)

    # SOFT DELETE
    async def delete(self, item_id: str) -> bool:
        result = await self.db.execute(
            update(ItemORM)
            .where(ItemORM.id == item_id, ItemORM.deleted_at.is_(None))
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount > 0

    # AGGREGATIONS
    async def count_active(self, identity_id: str) -> int:
        result = await self.db.execute(
            select(func.count(ItemORM.id)).where(
                ItemORM.identity_id == identity_id,
                ItemORM.status == "active",
                ItemORM.deleted_at.is_(None)
            )
        )
        return result.scalar() or 0
```

### 4. FastAPI Routes (`routes.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.core.auth import get_current_identity
from .models import (
    CreateItemRequest, UpdateItemRequest, 
    ItemResponse, ItemListResponse
)
from .service import ItemService

router = APIRouter(prefix="/items", tags=["items"])

# Dependency
def get_service(db: AsyncSession = Depends(get_db)) -> ItemService:
    return ItemService(db)


@router.post("", response_model=ItemResponse, status_code=201)
async def create_item(
    data: CreateItemRequest,
    identity: str = Depends(get_current_identity),  # ⚠️ Depends() FIRST
    service: ItemService = Depends(get_service)
):
    """Create a new item."""
    return await service.create(identity, data)


@router.get("", response_model=ItemListResponse)
async def list_items(
    identity: str = Depends(get_current_identity),
    service: ItemService = Depends(get_service),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    cursor: Optional[str] = Query(None, description="Pagination cursor")
):
    """List user's items with optional filters."""
    return await service.list_for_user(identity, status, limit, cursor)


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(
    item_id: str = Path(..., description="Item ID"),
    identity: str = Depends(get_current_identity),
    service: ItemService = Depends(get_service)
):
    """Get single item by ID."""
    item = await service.get_by_id(item_id)
    if not item:
        raise HTTPException(404, detail="Item not found")
    return item


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(
    data: UpdateItemRequest,
    item_id: str = Path(...),
    identity: str = Depends(get_current_identity),
    service: ItemService = Depends(get_service)
):
    """Update an item."""
    item = await service.update(item_id, data)
    if not item:
        raise HTTPException(404, detail="Item not found")
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_item(
    item_id: str = Path(...),
    identity: str = Depends(get_current_identity),
    service: ItemService = Depends(get_service)
):
    """Soft delete an item."""
    if not await service.delete(item_id):
        raise HTTPException(404, detail="Item not found")
```

### 5. Register in `main.py`

```python
from src.modules.items.routes import router as items_router

app.include_router(items_router)
```

---

## Common Gotchas & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| `index already exists` | Both `index=True` and `Index()` | Use `Index()` in `__table_args__` only |
| 422 Validation Error | Param order wrong | `Depends()` before `Query()` with defaults |
| Missing generated fields | Forgot `refresh()` | `await self.db.refresh(item)` after commit |
| `source: 'manual'` crashes | Invalid enum | Use `user_input`, `calculated`, `device_sync` |
| Can't convert ORM → Pydantic | Missing config | Add `from_attributes = True` to model Config |

---

## Debugging Guide

### API Returns 500

1. Check uvicorn terminal for stack trace
2. Look for: missing imports, type errors, DB errors
3. Common: forgot `await`, wrong column type, missing migration

### API Returns 422

1. Request body doesn't match Pydantic model
2. Check: field names, types, required vs optional
3. Look at error detail for specific field

### API Returns 404

1. Item actually doesn't exist, OR
2. Soft-deleted (`deleted_at` is set), OR
3. Wrong identity (user doesn't own it)

### Changes Not Persisting

```python
# Missing commit:
self.db.add(item)
await self.db.commit()      # ← Required!
await self.db.refresh(item) # ← Required for generated fields!
```

---

## Cross-Module Communication

```python
# In AI_COACH routes, inject other module services
from src.modules.time_keeper.service import TimeKeeperService
from src.modules.metrics.service import MetricsService

def get_time_keeper(db: AsyncSession = Depends(get_db)) -> TimeKeeperService:
    return TimeKeeperService(db)

@router.post("/chat")
async def chat(
    message: str,
    identity: str = Depends(get_current_identity),
    time_keeper: TimeKeeperService = Depends(get_time_keeper),
    metrics: MetricsService = Depends(get_metrics),
):
    # AI can now check fasting status, get metrics, etc.
    active_fast = await time_keeper.get_active_window(identity, "fasting")
```

---

## References

- `references/error-handling.md` - Standard error responses
- `references/pagination.md` - Cursor vs offset pagination
- `references/file-uploads.md` - Handling file uploads
