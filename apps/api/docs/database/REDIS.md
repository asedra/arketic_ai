# Redis Database Documentation

## Overview
Arketic AI uses Redis as a high-performance in-memory data store for caching, session management, rate limiting, and real-time features. Redis provides sub-millisecond latency for frequently accessed data and helps reduce database load.

## Configuration

### Connection Settings
- **URL**: Configured via `REDIS_URL` environment variable
- **Default**: `redis://localhost:6379/0`
- **Encoding**: UTF-8 with automatic response decoding
- **Max Connections**: 20 (connection pool)
- **Connection Management**: Async Redis with connection pooling

### Environment Variables
```bash
REDIS_URL=redis://localhost:6379/0
RESPONSE_CACHE_TTL=3600  # Default cache TTL in seconds
```

## Redis Usage Patterns

### 1. Cache Management (RedisCache)

The `RedisCache` class provides a comprehensive caching solution for application data.

#### Features
- **Default TTL**: 3600 seconds (1 hour), configurable
- **JSON Serialization**: Automatic serialization/deserialization
- **Pattern-based Operations**: Support for wildcard key operations
- **Atomic Operations**: Counter increments and key expiration

#### Key Operations

| Method | Description | Parameters | Return |
|--------|-------------|------------|--------|
| `get(key)` | Retrieve cached value | key: string | Any or None |
| `set(key, value, ttl)` | Store value in cache | key: string, value: Any, ttl: int (optional) | bool |
| `delete(key)` | Remove key from cache | key: string | bool |
| `exists(key)` | Check key existence | key: string | bool |
| `increment(key, amount)` | Increment counter | key: string, amount: int | int or None |
| `expire(key, ttl)` | Set key expiration | key: string, ttl: int | bool |
| `get_keys(pattern)` | Get matching keys | pattern: string | List[str] |
| `flush_pattern(pattern)` | Delete matching keys | pattern: string | int (deleted count) |
| `get_info()` | Get Redis statistics | None | Dict[str, Any] |

#### Common Cache Keys

**User-related Caching:**
```
user:{user_id}:profile          # User profile data
user:{user_id}:preferences      # User preferences
user:{user_id}:permissions      # User permissions cache
```

**Chat Caching:**
```
chat:{chat_id}:messages         # Recent chat messages
chat:{chat_id}:participants    # Chat participant list
chat:{chat_id}:metadata        # Chat metadata
```

**AI Response Caching:**
```
ai:response:{hash}              # Cached AI responses
ai:model:{model}:config         # Model configurations
ai:prompt:{hash}                # Cached prompt templates
```

**Knowledge Base Caching:**
```
kb:{kb_id}:documents           # Document list cache
kb:{kb_id}:search:{query_hash} # Search result cache
kb:embedding:{doc_id}:{chunk}  # Embedding cache
```

#### Cache Statistics
The `get_info()` method returns:
- `connected_clients`: Number of connected clients
- `used_memory_human`: Human-readable memory usage
- `used_memory`: Memory usage in bytes
- `total_commands_processed`: Total commands executed
- `keyspace_hits`: Cache hit count
- `keyspace_misses`: Cache miss count
- `uptime_in_seconds`: Redis uptime

---

### 2. Rate Limiting (RedisRateLimiter)

Implements sliding window rate limiting for API and feature access control.

#### Configuration
- **Window Size**: 60 seconds (default)
- **Sliding Window Algorithm**: Ensures accurate rate limiting
- **Automatic Cleanup**: Removes expired entries

#### Key Operations

| Method | Description | Parameters | Return |
|--------|-------------|------------|--------|
| `is_allowed(key, limit)` | Check if request is allowed | key: string, limit: int | tuple(is_allowed: bool, current_count: int, remaining: int) |

#### Rate Limit Keys

**API Endpoints:**
```
rate:api:{user_id}:{endpoint}    # Per-user, per-endpoint limiting
rate:api:global:{endpoint}       # Global endpoint limiting
rate:api:ip:{ip_address}         # IP-based rate limiting
```

**AI Operations:**
```
rate:ai:{user_id}:requests       # AI request limiting
rate:ai:{user_id}:tokens         # Token usage limiting
rate:ai:{org_id}:monthly         # Organization monthly limits
```

**File Operations:**
```
rate:upload:{user_id}            # File upload rate limiting
rate:download:{user_id}          # File download rate limiting
```

#### Implementation Details
- Uses Redis sorted sets (ZSET) for sliding window
- Automatic removal of expired entries
- Atomic operations for thread safety
- Graceful degradation on Redis errors (allows requests)

#### Example Usage
```python
limiter = RedisRateLimiter(window_size=60)
is_allowed, current, remaining = await limiter.is_allowed(
    key=f"rate:api:{user_id}:chat",
    limit=100  # 100 requests per minute
)
```

---

### 3. Session Management (RedisSessionManager)

Manages user sessions with automatic expiration and renewal.

#### Configuration
- **Session TTL**: 3600 seconds (1 hour) default
- **Key Prefix**: `session:`
- **JSON Storage**: Complex session data support

#### Key Operations

| Method | Description | Parameters | Return |
|--------|-------------|------------|--------|
| `create_session(session_id, data)` | Create new session | session_id: string, data: dict | bool |
| `get_session(session_id)` | Retrieve session data | session_id: string | dict or None |
| `update_session(session_id, data)` | Update session data | session_id: string, data: dict | bool |
| `delete_session(session_id)` | Delete session | session_id: string | bool |
| `extend_session(session_id)` | Extend session TTL | session_id: string | bool |

#### Session Data Structure
```python
{
    "user_id": "uuid",
    "email": "user@example.com",
    "role": "user",
    "login_time": "2024-01-01T00:00:00Z",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "last_activity": "2024-01-01T00:00:00Z",
    "metadata": {
        "device_type": "desktop",
        "browser": "chrome",
        "os": "windows"
    }
}
```

#### Session Keys
```
session:{session_id}              # User session data
session:user:{user_id}            # User's active sessions
session:refresh:{token_hash}      # Refresh token mapping
```

---

## Data Structures and Patterns

### 1. Key Naming Conventions

```
{namespace}:{entity}:{id}:{attribute}
```

Examples:
- `user:123:profile` - User profile
- `chat:456:messages` - Chat messages
- `cache:api:response:789` - API response cache

### 2. Data Types Usage

| Redis Type | Use Case | Example |
|------------|----------|---------|
| STRING | Simple caching, counters | User profiles, API responses |
| HASH | Object storage | User preferences, configurations |
| LIST | Message queues, activity logs | Chat messages, notifications |
| SET | Unique collections | User permissions, tags |
| ZSET | Sorted data, rate limiting | Leaderboards, sliding windows |
| STREAM | Event streaming | Real-time updates, audit logs |

### 3. TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| User Sessions | 1 hour | Security and resource management |
| API Responses | 5 minutes | Fresh data while reducing load |
| AI Responses | 1 hour | Expensive computations |
| Search Results | 15 minutes | Balance freshness and performance |
| Rate Limit Windows | 1 minute | Sliding window cleanup |
| Temporary Locks | 30 seconds | Prevent deadlocks |

---

## Performance Optimization

### 1. Connection Pooling
- **Pool Size**: 20 connections
- **Async Operations**: Non-blocking I/O
- **Connection Reuse**: Reduces overhead
- **Health Checks**: Automatic ping on connection

### 2. Batch Operations
```python
# Pipeline for multiple operations
async def batch_get_users(user_ids):
    redis = get_redis()
    pipe = redis.pipeline()
    for user_id in user_ids:
        pipe.get(f"user:{user_id}:profile")
    results = await pipe.execute()
    return results
```

### 3. Memory Management
- **Max Memory Policy**: allkeys-lru (recommended)
- **Key Expiration**: Automatic TTL management
- **Memory Monitoring**: via `get_info()` method

---

## Monitoring and Health Checks

### Health Check Function
```python
async def check_redis_health() -> Dict[str, Any]:
    """
    Returns:
    - status: "healthy" or "error"
    - message: Status message
    - info: Redis statistics (if healthy)
    """
```

### Monitored Metrics
1. **Connection Health**: Ping response
2. **Memory Usage**: Current memory consumption
3. **Performance**: Commands processed, hit/miss ratio
4. **Client Connections**: Active connections count

### Alert Thresholds
- Memory Usage > 80%: Warning
- Memory Usage > 90%: Critical
- Connection Failures: Immediate alert
- Hit Rate < 50%: Performance review

---

## Error Handling

### Connection Errors
- **Retry Logic**: Automatic reconnection attempts
- **Fallback**: Graceful degradation without cache
- **Logging**: Comprehensive error logging

### Operation Errors
- **Try-Catch**: All operations wrapped in error handlers
- **Default Values**: Return None/False on errors
- **Non-blocking**: Errors don't crash the application

---

## Security Considerations

### 1. Access Control
- **Authentication**: PASSWORD environment variable
- **Network**: Bind to localhost in production
- **Firewall**: Restrict Redis port access

### 2. Data Protection
- **Encryption**: TLS for remote connections
- **Sensitive Data**: Avoid storing unencrypted secrets
- **Key Patterns**: Avoid predictable key names for sensitive data

### 3. Resource Limits
- **Max Clients**: Configure based on load
- **Max Memory**: Set appropriate limits
- **Command Blacklist**: Disable dangerous commands (FLUSHDB, CONFIG)

---

## Backup and Recovery

### 1. Persistence Options
- **RDB**: Point-in-time snapshots
- **AOF**: Append-only file for durability
- **Hybrid**: RDB + AOF for best protection

### 2. Backup Strategy
- Regular RDB snapshots
- AOF for critical data
- External backups for disaster recovery

### 3. Recovery Procedures
1. Stop Redis service
2. Restore backup files
3. Verify data integrity
4. Restart service
5. Validate application functionality

---

## Common Use Cases

### 1. User Authentication
```python
# Store user session
await session_manager.create_session(
    session_id=token,
    data={
        "user_id": user.id,
        "email": user.email,
        "role": user.role
    }
)
```

### 2. AI Response Caching
```python
# Cache expensive AI responses
cache_key = f"ai:response:{prompt_hash}"
cached = await cache.get(cache_key)
if not cached:
    response = await generate_ai_response(prompt)
    await cache.set(cache_key, response, ttl=3600)
```

### 3. Rate Limiting
```python
# Implement API rate limiting
key = f"rate:api:{user_id}:{endpoint}"
allowed, count, remaining = await rate_limiter.is_allowed(key, limit=100)
if not allowed:
    raise HTTPException(429, "Rate limit exceeded")
```

### 4. Real-time Features
```python
# Publish chat message
await redis.publish(f"chat:{chat_id}", message_data)

# Subscribe to chat updates
pubsub = redis.pubsub()
await pubsub.subscribe(f"chat:{chat_id}")
```

---

## Maintenance Tasks

### Daily
- Monitor memory usage
- Check hit/miss ratios
- Review slow queries

### Weekly
- Analyze key patterns
- Clean up expired keys
- Review error logs

### Monthly
- Performance tuning
- Capacity planning
- Security audit

---

## Troubleshooting

### Common Issues

1. **High Memory Usage**
   - Review TTL settings
   - Implement key eviction
   - Increase memory limit

2. **Low Hit Rate**
   - Analyze cache patterns
   - Adjust TTL values
   - Review key naming

3. **Connection Timeouts**
   - Check network latency
   - Increase pool size
   - Review client timeout settings

4. **Performance Degradation**
   - Monitor slow commands
   - Optimize data structures
   - Consider clustering

---

## Best Practices

1. **Key Design**
   - Use descriptive namespaces
   - Include version in keys when needed
   - Keep keys reasonably short

2. **TTL Management**
   - Always set TTL for cache entries
   - Use appropriate TTL for data type
   - Monitor and adjust based on usage

3. **Error Handling**
   - Implement circuit breakers
   - Provide fallback mechanisms
   - Log errors comprehensively

4. **Performance**
   - Use pipelining for batch operations
   - Avoid large key operations
   - Monitor and optimize slow queries

5. **Security**
   - Rotate passwords regularly
   - Use TLS for remote connections
   - Implement access controls

---

## Integration Points

### FastAPI Application
- Initialized on startup via `init_redis()`
- Closed on shutdown via `close_redis()`
- Available as dependency injection

### Health Endpoints
- `/health` - Basic health check
- `/monitoring/redis` - Detailed Redis metrics

### Global Instances
```python
from core.redis import cache, rate_limiter, session_manager

# Available throughout the application
await cache.set("key", "value")
await rate_limiter.is_allowed("rate:key", 100)
await session_manager.create_session("session_id", data)
```