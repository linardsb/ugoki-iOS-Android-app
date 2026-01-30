---
name: ugoki-module-creator
description: >
  Step-by-step guide for creating a new UGOKI module from scratch. Load when:
  adding a new backend module, scaffolding a new feature, or creating both
  backend and mobile for a new capability. Keywords: new module, create,
  scaffold, feature, checklist.
---

# Create New UGOKI Module

Complete checklist for creating a new module end-to-end with mobile integration.

---

## Phase 0: Planning (Don't Skip!)

Answer these questions FIRST:

| Question | Your Answer |
|----------|-------------|
| Module name (singular, lowercase)? | `{module_name}` |
| What primitive(s) does it own? | IDENTITY / TIME_WINDOW / EVENT / METRIC / PROGRESSION |
| Purpose in one sentence? | |
| Which existing modules does it depend on? | |
| Any external APIs needed? | |
| Estimated number of endpoints? | |

---

## Phase 1: Backend - Create Files

### 1.1 Create Directory Structure

```bash
cd apps/api

# Create module directory
mkdir -p src/modules/{module_name}

# Create all files
touch src/modules/{module_name}/__init__.py
touch src/modules/{module_name}/interface.py
touch src/modules/{module_name}/models.py
touch src/modules/{module_name}/orm.py
touch src/modules/{module_name}/service.py
touch src/modules/{module_name}/routes.py
```

### 1.2 Create Files In Order

**Order matters!** Create in this sequence:

#### 1. `models.py` (Pydantic)

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class {Item}Status(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Create{Item}Request(BaseModel):
    """Request to create a new {item}."""
    name: str = Field(..., min_length=1, max_length=100)
    # Add more fields...


class Update{Item}Request(BaseModel):
    """Request to update a {item}."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[{Item}Status] = None


class {Item}Response(BaseModel):
    """Response containing {item} data."""
    id: str
    name: str
    status: {Item}Status
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class {Item}ListResponse(BaseModel):
    """Paginated list of {items}."""
    items: list[{Item}Response]
    total: int
    has_more: bool
```

#### 2. `orm.py` (SQLAlchemy)

```python
from sqlalchemy import String, DateTime, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.db.database import Base
from datetime import datetime
from typing import Optional
import uuid


class {Item}ORM(Base):
    __tablename__ = "{table_name}"

    id: Mapped[str] = mapped_column(
        String(50), 
        primary_key=True,
        default=lambda: f"{prefix}_{uuid.uuid4().hex[:12]}"
    )
    
    identity_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("identities.id", ondelete="CASCADE"),
        nullable=False
    )
    
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    status: Mapped[str] = mapped_column(
        SQLEnum("active", "completed", "archived", name="{item}_status_enum"),
        nullable=False,
        default="active"
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, onupdate=datetime.utcnow)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    identity = relationship("IdentityORM")

    __table_args__ = (
        Index("ix_{table_name}_identity_id", "identity_id"),
        Index("ix_{table_name}_status", "status"),
    )
```

#### 3. `service.py` (Business Logic)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime
from typing import Optional

from .models import (
    Create{Item}Request, 
    Update{Item}Request,
    {Item}Response,
    {Item}ListResponse
)
from .orm import {Item}ORM


class {Module}Service:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self, 
        identity_id: str, 
        data: Create{Item}Request
    ) -> {Item}Response:
        item = {Item}ORM(identity_id=identity_id, **data.model_dump())
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return {Item}Response.model_validate(item)

    async def get_by_id(self, {item}_id: str) -> Optional[{Item}Response]:
        result = await self.db.execute(
            select({Item}ORM).where(
                {Item}ORM.id == {item}_id,
                {Item}ORM.deleted_at.is_(None)
            )
        )
        item = result.scalar_one_or_none()
        return {Item}Response.model_validate(item) if item else None

    async def list_for_user(
        self,
        identity_id: str,
        status: Optional[str] = None,
        limit: int = 20
    ) -> {Item}ListResponse:
        query = select({Item}ORM).where(
            {Item}ORM.identity_id == identity_id,
            {Item}ORM.deleted_at.is_(None)
        )
        
        if status:
            query = query.where({Item}ORM.status == status)
        
        query = query.order_by({Item}ORM.created_at.desc()).limit(limit + 1)
        
        result = await self.db.execute(query)
        items = list(result.scalars())
        
        has_more = len(items) > limit
        
        return {Item}ListResponse(
            items=[{Item}Response.model_validate(i) for i in items[:limit]],
            total=len(items[:limit]),
            has_more=has_more
        )

    async def update(
        self,
        {item}_id: str,
        data: Update{Item}Request
    ) -> Optional[{Item}Response]:
        result = await self.db.execute(
            select({Item}ORM).where({Item}ORM.id == {item}_id)
        )
        item = result.scalar_one_or_none()
        
        if not item:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(item, key, value)
        
        await self.db.commit()
        await self.db.refresh(item)
        return {Item}Response.model_validate(item)

    async def delete(self, {item}_id: str) -> bool:
        result = await self.db.execute(
            update({Item}ORM)
            .where({Item}ORM.id == {item}_id)
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount > 0
```

#### 4. `routes.py` (FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.db.database import get_db
from src.core.auth import get_current_identity
from .models import (
    Create{Item}Request,
    Update{Item}Request,
    {Item}Response,
    {Item}ListResponse
)
from .service import {Module}Service


router = APIRouter(prefix="/{module-name}", tags=["{module-name}"])


def get_service(db: AsyncSession = Depends(get_db)) -> {Module}Service:
    return {Module}Service(db)


@router.post("", response_model={Item}Response, status_code=201)
async def create_{item}(
    data: Create{Item}Request,
    identity: str = Depends(get_current_identity),
    service: {Module}Service = Depends(get_service)
):
    """Create a new {item}."""
    return await service.create(identity, data)


@router.get("", response_model={Item}ListResponse)
async def list_{items}(
    identity: str = Depends(get_current_identity),
    service: {Module}Service = Depends(get_service),
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
):
    """List user's {items}."""
    return await service.list_for_user(identity, status, limit)


@router.get("/{{item}_id}", response_model={Item}Response)
async def get_{item}(
    {item}_id: str = Path(...),
    identity: str = Depends(get_current_identity),
    service: {Module}Service = Depends(get_service)
):
    """Get a {item} by ID."""
    item = await service.get_by_id({item}_id)
    if not item:
        raise HTTPException(404, detail="{Item} not found")
    return item


@router.patch("/{{item}_id}", response_model={Item}Response)
async def update_{item}(
    data: Update{Item}Request,
    {item}_id: str = Path(...),
    identity: str = Depends(get_current_identity),
    service: {Module}Service = Depends(get_service)
):
    """Update a {item}."""
    item = await service.update({item}_id, data)
    if not item:
        raise HTTPException(404, detail="{Item} not found")
    return item


@router.delete("/{{item}_id}", status_code=204)
async def delete_{item}(
    {item}_id: str = Path(...),
    identity: str = Depends(get_current_identity),
    service: {Module}Service = Depends(get_service)
):
    """Delete a {item}."""
    if not await service.delete({item}_id):
        raise HTTPException(404, detail="{Item} not found")
```

#### 5. `__init__.py` (Exports)

```python
from .service import {Module}Service
from .routes import router

__all__ = ["{Module}Service", "router"]
```

---

## Phase 2: Database Migration

```bash
# Generate migration
uv run alembic revision --autogenerate -m "add {module_name} tables"

# REVIEW the generated file in alembic/versions/
# Check: table name, columns, indexes, foreign keys, enums

# Apply migration
uv run alembic upgrade head

# Test rollback works
uv run alembic downgrade -1
uv run alembic upgrade head
```

---

## Phase 3: Register Module

### In `src/main.py`:

```python
from src.modules.{module_name}.routes import router as {module_name}_router

# Add with other routers
app.include_router({module_name}_router)
```

---

## Phase 4: Write Tests

### Create test file:

```bash
touch tests/test_{module_name}.py
```

### Write basic tests:

```python
import pytest
from src.modules.{module_name}.service import {Module}Service
from src.modules.{module_name}.models import Create{Item}Request


@pytest.mark.asyncio
async def test_create_{item}(db_session, identity):
    service = {Module}Service(db_session)
    request = Create{Item}Request(name="Test")
    
    result = await service.create(identity.id, request)
    
    assert result.id.startswith("{prefix}_")
    assert result.name == "Test"


@pytest.mark.asyncio
async def test_list_{items}_empty(db_session, identity):
    service = {Module}Service(db_session)
    
    result = await service.list_for_user(identity.id)
    
    assert result.items == []
    assert result.total == 0
```

### Run tests:

```bash
uv run pytest tests/test_{module_name}.py -v
```

---

## Phase 5: Mobile Integration

### 5.1 Create Feature Module

```bash
cd apps/mobile
mkdir -p features/{module_name}/{hooks,components}
touch features/{module_name}/index.ts
touch features/{module_name}/types.ts
touch features/{module_name}/hooks/index.ts
touch features/{module_name}/hooks/use{Module}.ts
```

### 5.2 Types (`types.ts`)

```typescript
export type {Item}Status = 'active' | 'completed' | 'archived';

export interface {Item} {
  id: string;
  name: string;
  status: {Item}Status;
  created_at: string;
  updated_at: string | null;
}

export interface Create{Item}Request {
  name: string;
}

export interface Update{Item}Request {
  name?: string;
  status?: {Item}Status;
}

export interface {Item}ListResponse {
  items: {Item}[];
  total: number;
  has_more: boolean;
}
```

### 5.3 Hooks (`hooks/use{Module}.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import { {Item}, Create{Item}Request, {Item}ListResponse } from '../types';

export const {module}Keys = {
  all: ['{module}'] as const,
  lists: () => [...{module}Keys.all, 'list'] as const,
  list: (status?: string) => [...{module}Keys.lists(), status] as const,
  details: () => [...{module}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{module}Keys.details(), id] as const,
};

export function use{Module}List(status?: string) {
  return useQuery({
    queryKey: {module}Keys.list(status),
    queryFn: async () => {
      const { data } = await api.get<{Item}ListResponse>('/{module-name}', {
        params: { status },
      });
      return data;
    },
  });
}

export function use{Item}(id: string) {
  return useQuery({
    queryKey: {module}Keys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<{Item}>(`/{module-name}/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreate{Item}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Create{Item}Request) => {
      const { data: item } = await api.post<{Item}>('/{module-name}', data);
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {module}Keys.lists() });
    },
  });
}

export function useDelete{Item}() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/{module-name}/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.removeQueries({ queryKey: {module}Keys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: {module}Keys.lists() });
    },
  });
}
```

### 5.4 Add Navigation

Update `app/(modals)/_layout.tsx` or create screens as needed.

---

## Phase 6: Documentation & Testing

```
□ Update scripts/test_api.py with new endpoints
□ Update docs/CHANGELOG.md
□ Test all endpoints manually
□ Run full test suite: uv run pytest
□ Run API test: uv run python scripts/test_api.py
```

---

## Final Checklist

### Backend
```
□ models.py created
□ orm.py created  
□ service.py created
□ routes.py created
□ __init__.py exports correctly
□ Migration generated
□ Migration reviewed (indexes, FKs)
□ Migration applied
□ Routes registered in main.py
□ Unit tests written
□ Tests passing
```

### Mobile
```
□ types.ts created (matches backend)
□ hooks created (query keys, queries, mutations)
□ Screens created
□ Navigation updated
```

### Documentation
```
□ CHANGELOG.md updated
□ test_api.py updated
□ Manual testing complete
```
