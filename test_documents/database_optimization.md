# Database Optimization Techniques

## Overview

Database performance is critical for application scalability. This guide covers essential optimization techniques for PostgreSQL and Supabase.

## Indexing Strategies

### B-tree Indexes
Standard indexes for equality and range queries:
```sql
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_date ON orders(created_at DESC);
```

### Partial Indexes
Index only a subset of rows to save space:
```sql
CREATE INDEX idx_active_users ON users(email)
WHERE status = 'active';
```

### Covering Indexes
Include additional columns to avoid table lookups:
```sql
CREATE INDEX idx_user_profile ON users(id)
INCLUDE (name, email, created_at);
```

### Vector Indexes (pgvector)
For similarity search on embeddings:
```sql
CREATE INDEX idx_document_embedding ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Query Optimization

### Use EXPLAIN ANALYZE
Always analyze query plans:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123
AND created_at > NOW() - INTERVAL '30 days';
```

### Avoid SELECT *
Only retrieve needed columns:
```sql
-- Bad
SELECT * FROM users WHERE id = 123;

-- Good
SELECT id, name, email FROM users WHERE id = 123;
```

### Batch Operations
Reduce round trips with bulk operations:
```sql
INSERT INTO users (name, email)
VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com'),
  ('Charlie', 'charlie@example.com');
```

## Connection Pooling

### Supabase Pooling Modes

**Transaction Mode** (Recommended for serverless):
- Connections shared between transactions
- Best for short-lived operations
- Default port: 6543

**Session Mode**:
- Dedicated connection per client
- Required for prepared statements
- Default port: 5432

Configuration:
```python
from supabase import create_client

# Transaction pooling
supabase = create_client(
    url="https://project.supabase.co:6543",
    key="your-anon-key"
)
```

## Monitoring and Maintenance

### Key Metrics
- Query execution time (P50, P95, P99)
- Index hit ratio (should be >99%)
- Cache hit ratio
- Active connections
- Deadlocks and lock wait time

### Regular Maintenance
```sql
-- Update statistics
ANALYZE users;

-- Reclaim space and update stats
VACUUM ANALYZE orders;

-- Rebuild indexes if fragmented
REINDEX INDEX idx_user_email;
```

## Supabase-Specific Optimizations

### Row Level Security (RLS)
Ensure RLS policies are efficient:
```sql
-- Add index on user_id for RLS checks
CREATE INDEX idx_documents_user
ON documents(user_id);

-- Efficient RLS policy
CREATE POLICY "Users see own documents"
ON documents FOR SELECT
USING (auth.uid() = user_id);
```

### Realtime Performance
Limit subscriptions and use filters:
```javascript
const subscription = supabase
  .channel('orders')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'orders',
    filter: 'user_id=eq.123'  // Server-side filtering
  }, handleNewOrder)
  .subscribe()
```

### Edge Functions
Keep functions lightweight:
- Minimize cold start time
- Use connection pooling
- Cache frequently accessed data
- Implement timeouts

## Common Anti-Patterns

### N+1 Queries
```sql
-- Bad: Separate query for each user
SELECT * FROM posts WHERE user_id = 1;
SELECT * FROM posts WHERE user_id = 2;
-- ... repeat for each user

-- Good: Single query with JOIN
SELECT u.name, p.title
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE u.id IN (1, 2, 3, ...);
```

### Missing WHERE Clauses
Always filter large tables:
```sql
-- Dangerous: Full table scan
SELECT * FROM logs ORDER BY created_at DESC LIMIT 10;

-- Better: Use time range
SELECT * FROM logs
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;
```

### Overusing JSON Columns
Structure data relationally when possible:
```sql
-- Less optimal
CREATE TABLE products (
  id INT,
  data JSONB  -- Contains everything
);

-- Better
CREATE TABLE products (
  id INT,
  name TEXT,
  price DECIMAL,
  metadata JSONB  -- Only for truly flexible data
);
```

## Performance Testing

### pg_stat_statements
Enable query statistics:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Load Testing
Use tools like:
- pgbench for PostgreSQL benchmarking
- Apache JMeter for application-level testing
- k6 for modern API load testing

## Conclusion

Database optimization is an iterative process. Monitor performance metrics, identify bottlenecks with EXPLAIN ANALYZE, and apply appropriate indexing and query strategies. Always test changes in staging before production.
