# Module 16: System Design Patterns 🏗️

## Design Scalable, Reliable, and Maintainable Systems

**Duration:** 6-7 hours  
**Prerequisites:** All previous modules, distributed systems basics  
**Outcome:** Master architectural patterns and system design principles for production systems

---

## 📚 Table of Contents

1. [System Design Fundamentals](#system-design-fundamentals)
2. [Scalability](#scalability)
3. [Reliability & Availability](#reliability--availability)
4. [Data Storage Patterns](#data-storage-patterns)
5. [Microservices Patterns](#microservices-patterns)
6. [Caching Strategies](#caching-strategies)
7. [Message Queues](#message-queues)
8. [Case Studies](#case-studies)
9. [Interview Questions](#interview-questions)
10. [Hands-On Exercise](#hands-on-exercise)

---

## System Design Fundamentals

### Design Principles

```
1. Scalability:    Handle increasing load
2. Reliability:    Function correctly despite failures
3. Availability:   System remains operational
4. Maintainability: Easy to update and debug
5. Performance:    Respond quickly under load
```

### CAP Theorem

```
Choose 2 of 3:

C (Consistency):    All nodes see same data
A (Availability):   System responds to requests
P (Partition Tol):  System works despite network splits

Examples:
- CP: PostgreSQL, MongoDB, HBase (consistency over availability)
- AP: Cassandra, Riak, DynamoDB (availability over consistency)
- CA: Not possible in distributed systems
```

### ACID vs BASE

```
ACID (Traditional Databases):
- Atomicity:       All-or-nothing transactions
- Consistency:     Valid state transitions
- Isolation:       Concurrent transactions don't interfere
- Durability:      Committed data persists

BASE (NoSQL):
- Basically Available:      System responds (may be stale)
- Soft state:               State may change without input
- Eventual consistency:     System becomes consistent over time
```

---

## Scalability

### Vertical vs Horizontal Scaling

```
Vertical (Scale Up):
✅ Simpler (no code changes)
✅ No data consistency issues
❌ Limited (hardware ceiling)
❌ Single point of failure
❌ Expensive

Horizontal (Scale Out):
✅ Unlimited scaling
✅ Fault tolerant
✅ Cost-effective
❌ Complex (load balancing, data distribution)
❌ Eventual consistency challenges
```

### Load Balancing

```
Layer 4 (Transport):
- Based on IP, port
- Fast (no content inspection)
- Examples: AWS NLB, HAProxy

Layer 7 (Application):
- Based on HTTP headers, URL, cookies
- Content-aware routing
- Examples: AWS ALB, Nginx, Envoy

Algorithms:
- Round Robin
- Least Connections
- IP Hash
- Weighted Round Robin
```

```nginx
# Nginx load balancer
upstream backend {
    least_conn;  # Algorithm
    server backend1.example.com weight=3;
    server backend2.example.com weight=2;
    server backend3.example.com;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Database Scaling

```
1. Replication (Read Scaling)
   Master-Slave: Master writes, slaves read
   Master-Master: Both read/write

2. Sharding (Write Scaling)
   Horizontal partitioning by key
   
   User Sharding:
   - Shard 1: user_id 0-999
   - Shard 2: user_id 1000-1999
   - Shard 3: user_id 2000-2999

3. Partitioning
   Range: By date, ID range
   Hash: Hash function distributes data
   List: Explicit mapping

4. Denormalization
   Duplicate data to avoid joins
   Trade consistency for read performance
```

---

## Reliability & Availability

### Availability Metrics

```
Uptime %     Downtime/Year    Downtime/Month
99%          3.65 days        7.2 hours
99.9%        8.76 hours       43.2 minutes
99.99%       52.56 minutes    4.32 minutes
99.999%      5.26 minutes     25.9 seconds
99.9999%     31.5 seconds     2.6 seconds
```

### Fault Tolerance Patterns

#### 1. Redundancy

```
Active-Active:
- Both instances handle traffic
- Load balanced
- Higher utilization

Active-Passive:
- Primary handles traffic
- Secondary on standby
- Failover on primary failure
```

#### 2. Circuit Breaker

```go
// Circuit Breaker Pattern
type CircuitBreaker struct {
    maxFailures  int
    timeout      time.Duration
    failures     int
    lastFailTime time.Time
    state        string // "closed", "open", "half-open"
    mu           sync.Mutex
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    // Open: Reject calls during timeout
    if cb.state == "open" {
        if time.Since(cb.lastFailTime) > cb.timeout {
            cb.state = "half-open"
            cb.failures = 0
        } else {
            return errors.New("circuit breaker is open")
        }
    }

    // Try call
    err := fn()
    
    if err != nil {
        cb.failures++
        cb.lastFailTime = time.Now()
        
        if cb.failures >= cb.maxFailures {
            cb.state = "open"
        }
        return err
    }

    // Success: Reset
    cb.failures = 0
    cb.state = "closed"
    return nil
}
```

#### 3. Retry with Exponential Backoff

```go
func RetryWithBackoff(fn func() error, maxRetries int) error {
    backoff := time.Second
    
    for i := 0; i < maxRetries; i++ {
        err := fn()
        if err == nil {
            return nil
        }
        
        if i < maxRetries-1 {
            time.Sleep(backoff)
            backoff *= 2 // Exponential backoff
        }
    }
    
    return errors.New("max retries exceeded")
}
```

#### 4. Health Checks

```go
// HTTP health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
    // Check database
    if err := db.Ping(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "unhealthy",
            "reason": "database unreachable",
        })
        return
    }
    
    // Check Redis
    if _, err := redis.Ping().Result(); err != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        json.NewEncoder(w).Encode(map[string]string{
            "status": "unhealthy",
            "reason": "redis unreachable",
        })
        return
    }
    
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}
```

---

## Data Storage Patterns

### Database Per Service

```
Microservice A → Database A
Microservice B → Database B
Microservice C → Database C

✅ Independent scaling
✅ Technology diversity
✅ Fault isolation
❌ No joins across services
❌ Eventual consistency
```

### Event Sourcing

```
Traditional:
Store current state (UPDATE users SET balance=100)

Event Sourcing:
Store sequence of events
- UserCreated(id=1, balance=0)
- DepositMade(id=1, amount=100)
- WithdrawalMade(id=1, amount=20)

Current state = replay all events

✅ Complete audit log
✅ Time travel (query past state)
✅ Easy debugging
❌ Complex queries
❌ More storage
```

### CQRS (Command Query Responsibility Segregation)

```
Command Model (Write):
- Optimized for writes
- Normalized schema
- Validates business rules

Query Model (Read):
- Optimized for reads
- Denormalized views
- Eventually consistent

Commands → Write DB → Events → Update Read DB → Queries
```

```go
// CQRS Example
type CommandHandler struct {
    writeDB *sql.DB
    eventBus *EventBus
}

func (h *CommandHandler) CreateOrder(cmd CreateOrderCommand) error {
    // Validate
    // Write to DB
    _, err := h.writeDB.Exec("INSERT INTO orders (...) VALUES (...)")
    if err != nil {
        return err
    }
    
    // Publish event
    h.eventBus.Publish(OrderCreatedEvent{
        OrderID: cmd.OrderID,
        UserID:  cmd.UserID,
        // ...
    })
    
    return nil
}

type QueryHandler struct {
    readDB *sql.DB
}

func (h *QueryHandler) GetOrder(id string) (*Order, error) {
    // Read from optimized read model
    return h.readDB.QueryRow("SELECT * FROM order_views WHERE id = ?", id)
}
```

---

## Microservices Patterns

### Service Discovery

```
Client-Side:
Client → Service Registry (Consul, etcd)
       → Get service addresses
       → Call service directly

Server-Side:
Client → Load Balancer → Service Registry
       → Routes to service
```

```go
// Service registration (Consul)
import "github.com/hashicorp/consul/api"

func registerService() {
    client, _ := api.NewClient(api.DefaultConfig())
    
    registration := &api.AgentServiceRegistration{
        ID:      "api-1",
        Name:    "api",
        Port:    8080,
        Address: "192.168.1.10",
        Check: &api.AgentServiceCheck{
            HTTP:     "http://192.168.1.10:8080/health",
            Interval: "10s",
            Timeout:  "2s",
        },
    }
    
    client.Agent().ServiceRegister(registration)
}
```

### API Gateway

```
Responsibilities:
- Routing
- Authentication
- Rate limiting
- Request/response transformation
- Aggregation (multiple services → single response)

Examples: Kong, AWS API Gateway, Traefik
```

### Saga Pattern (Distributed Transactions)

```
Problem: No ACID transactions across services

Choreography (Event-Driven):
Order Service → OrderCreated event
Payment Service → PaymentProcessed event
Inventory Service → InventoryReserved event

If Payment fails → PaymentFailed event
Inventory Service compensates → InventoryReleased event

Orchestration (Coordinator):
Saga Orchestrator coordinates:
1. CreateOrder
2. ProcessPayment
3. ReserveInventory
4. ShipOrder

If step fails, orchestrator triggers compensating actions
```

---

## Caching Strategies

### Cache Patterns

#### 1. Cache-Aside (Lazy Loading)

```go
func GetUser(id int) (*User, error) {
    // Check cache
    cacheKey := fmt.Sprintf("user:%d", id)
    cached, err := redis.Get(cacheKey).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // Cache miss: Query database
    user, err := db.GetUser(id)
    if err != nil {
        return nil, err
    }
    
    // Store in cache
    userData, _ := json.Marshal(user)
    redis.Set(cacheKey, userData, 1*time.Hour)
    
    return user, nil
}
```

#### 2. Write-Through

```go
func UpdateUser(user *User) error {
    // Write to database
    err := db.UpdateUser(user)
    if err != nil {
        return err
    }
    
    // Update cache
    cacheKey := fmt.Sprintf("user:%d", user.ID)
    userData, _ := json.Marshal(user)
    redis.Set(cacheKey, userData, 1*time.Hour)
    
    return nil
}
```

#### 3. Write-Behind (Write-Back)

```go
// Write to cache immediately, async write to DB
func UpdateUserAsync(user *User) error {
    // Update cache
    cacheKey := fmt.Sprintf("user:%d", user.ID)
    userData, _ := json.Marshal(user)
    redis.Set(cacheKey, userData, 1*time.Hour)
    
    // Queue for async DB write
    queue.Enqueue(DBWriteJob{
        Type: "user_update",
        Data: user,
    })
    
    return nil
}
```

### Cache Invalidation

```
1. TTL (Time To Live):
   Set expiration time (1 hour, 1 day)

2. Event-Based:
   On update/delete → invalidate cache

3. Cache Stampede Prevention:
   Multiple requests for expired key → single DB query
   Use mutex or probabilistic early expiration
```

```go
// Prevent cache stampede
var mu sync.Mutex

func GetUserSafe(id int) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", id)
    
    cached, err := redis.Get(cacheKey).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // Lock to prevent multiple DB queries
    mu.Lock()
    defer mu.Unlock()
    
    // Check again (another goroutine may have filled cache)
    cached, err = redis.Get(cacheKey).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // Query DB
    user, err := db.GetUser(id)
    if err != nil {
        return nil, err
    }
    
    userData, _ := json.Marshal(user)
    redis.Set(cacheKey, userData, 1*time.Hour)
    
    return user, nil
}
```

---

## Message Queues

### Use Cases

```
1. Async Processing: Email sending, image processing
2. Decoupling: Producer/consumer independent
3. Load Leveling: Smooth traffic spikes
4. Event Streaming: Real-time data pipelines
```

### RabbitMQ Example

```go
import "github.com/streadway/amqp"

// Producer
func publishMessage() {
    conn, _ := amqp.Dial("amqp://guest:guest@localhost:5672/")
    defer conn.Close()
    
    ch, _ := conn.Channel()
    defer ch.Close()
    
    q, _ := ch.QueueDeclare("tasks", false, false, false, false, nil)
    
    body := "Process image"
    ch.Publish("", q.Name, false, false, amqp.Publishing{
        ContentType: "text/plain",
        Body:        []byte(body),
    })
}

// Consumer
func consumeMessages() {
    conn, _ := amqp.Dial("amqp://guest:guest@localhost:5672/")
    defer conn.Close()
    
    ch, _ := conn.Channel()
    defer ch.Close()
    
    q, _ := ch.QueueDeclare("tasks", false, false, false, false, nil)
    msgs, _ := ch.Consume(q.Name, "", true, false, false, false, nil)
    
    for msg := range msgs {
        log.Printf("Received: %s", msg.Body)
        // Process task
    }
}
```

---

## Case Studies

### 1. URL Shortener (like bit.ly)

```
Requirements:
- Shorten long URLs
- Redirect to original URL
- 100M URLs/month
- Low latency (<100ms)

Design:
1. Generate short code (base62 encode ID)
2. Store: { short_code: original_url }
3. Cache popular URLs (Redis)
4. Database sharding by hash(short_code)

Schema:
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE,
    original_url TEXT,
    created_at TIMESTAMP,
    expires_at TIMESTAMP
);

API:
POST /shorten → { "short_url": "bit.ly/abc123" }
GET /abc123   → 301 Redirect to original URL

Components:
- API Gateway (rate limiting)
- App Servers (generate short code, write DB)
- PostgreSQL (sharded)
- Redis (cache popular URLs)
- CDN (serve redirects)
```

### 2. Twitter Timeline

```
Requirements:
- User follows other users
- View home timeline (posts from followees)
- 100M active users
- Read-heavy (100:1 read:write)

Design:
1. Fan-out on write (pre-compute timelines)
   When user posts → write to followers' timelines
   
2. Fan-out on read (query on demand)
   When user views → query posts from followees

Hybrid:
- Celebrities: Fan-out on read (millions of followers)
- Regular users: Fan-out on write

Schema:
users(id, username)
follows(follower_id, followee_id)
tweets(id, user_id, content, created_at)
timelines(user_id, tweet_id, created_at)  # Pre-computed

Cache:
Redis: timeline:{user_id} → List of tweet IDs (last 100)
```

### 3. Rate Limiter

```
Requirements:
- Limit API calls per user
- 100 requests/minute per user
- Distributed system

Algorithms:
1. Fixed Window:
   Count requests in current minute
   Reset at start of next minute
   Problem: Burst at window boundary

2. Sliding Window Log:
   Store timestamp of each request
   Count requests in last minute
   Memory intensive

3. Token Bucket:
   Bucket holds tokens (capacity = 100)
   Refill tokens at fixed rate (100/min)
   Request consumes token
   Reject if no tokens

Implementation (Redis):
```

```go
func isAllowed(userID string) bool {
    key := fmt.Sprintf("rate_limit:%s", userID)
    
    // Increment counter
    count, _ := redis.Incr(key).Result()
    
    // Set expiration on first request
    if count == 1 {
        redis.Expire(key, 1*time.Minute)
    }
    
    return count <= 100
}

// Token bucket (Redis Lua script)
script := `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])

local tokens = redis.call('GET', key)
if tokens == false then
    tokens = capacity
end
tokens = tonumber(tokens)

local now = redis.call('TIME')
local timestamp_key = key .. ':timestamp'
local last_refill = redis.call('GET', timestamp_key)

if last_refill then
    local elapsed = now[1] - last_refill
    tokens = math.min(capacity, tokens + elapsed * rate)
end

redis.call('SET', timestamp_key, now[1])

if tokens >= requested then
    tokens = tokens - requested
    redis.call('SET', key, tokens)
    return 1
else
    redis.call('SET', key, tokens)
    return 0
end
`
```

---

## Interview Questions

**Q1: How would you design a system to handle 1 million concurrent users?**

**Answer:**
1. **Horizontal scaling**: Load balancer → Multiple app servers
2. **Caching**: Redis for hot data (user sessions, frequently accessed)
3. **Database**: Read replicas (master-slave), sharding for writes
4. **Async processing**: Message queue for non-critical tasks
5. **CDN**: Static assets (images, CSS, JS)
6. **Auto-scaling**: Based on CPU/memory metrics
7. **Monitoring**: Track performance, errors, capacity

**Q2: Explain consistency vs availability tradeoff.**

**Answer:** CAP theorem - in distributed system with network partition, choose consistency OR availability:
- **Consistency**: All nodes return same data. Wait for all replicas to sync. May reject requests during partition.
- **Availability**: System always responds. May return stale data during partition.
Example: Banking (consistency), social media (availability).

**Q3: How do you handle database migrations with zero downtime?**

**Answer:**
1. **Backward compatible changes**: Add columns (nullable), create tables
2. **Deploy new code** (reads new/old schema)
3. **Run migration** (add column, backfill data)
4. **Deploy again** (remove old code)
5. **Blue-green deployment**: Migrate copy of DB, switch traffic

**Q4: Design a system to detect trending topics (like Twitter).**

**Answer:**
1. **Stream processing**: Kafka consumes tweets in real-time
2. **Windowing**: Count hashtags in sliding windows (1min, 5min, 15min)
3. **Anomaly detection**: Spike in frequency compared to historical baseline
4. **Ranking**: Score = frequency × growth rate × recency
5. **Cache**: Redis stores top 100 trending topics
6. **Update**: Every 30 seconds, recompute and update cache

**Q5: How would you debug a production outage?**

**Answer:**
1. **Check monitoring**: Dashboards (Grafana), alerts, error rates
2. **Logs**: Centralized logging (ELK), search for errors around incident time
3. **Tracing**: Distributed tracing (Jaeger) to identify slow service
4. **Metrics**: CPU, memory, disk, network - identify bottleneck
5. **Recent changes**: Check deployments, config changes
6. **Reproduce**: Try to reproduce in staging
7. **Rollback**: If recent deploy, rollback immediately
8. **Root cause**: After mitigation, deep dive and postmortem

---

## Hands-On Exercise

### Task: Design Scalable E-Commerce System

```
Requirements:
- 1M products
- 10M users
- 1000 orders/minute peak
- Product search
- Inventory management
- Payment processing

Components:
1. User Service (PostgreSQL)
2. Product Service (PostgreSQL + Elasticsearch)
3. Order Service (PostgreSQL + Kafka)
4. Inventory Service (PostgreSQL)
5. Payment Service (external API)
6. Notification Service (email/SMS)

Architecture:
```

```
┌─────────────┐
│   CDN       │  Static assets
└──────┬──────┘
       │
┌──────▼──────────────────────┐
│   Load Balancer (Nginx)     │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   API Gateway               │  Auth, rate limiting
└──┬──────────────────────────┘
   │
   ├─► User Service ─────► PostgreSQL
   │                         (user data)
   │
   ├─► Product Service ──► PostgreSQL + Elasticsearch
   │                         (products + search)
   │
   ├─► Order Service ────► PostgreSQL + Kafka
   │                         (orders + events)
   │
   ├─► Inventory Service ► PostgreSQL + Redis
   │                         (stock + cache)
   │
   └─► Payment Service ──► External API
                           (Stripe, PayPal)

Kafka Events:
- OrderCreated → Inventory Service (reserve stock)
- OrderCreated → Payment Service (charge card)
- PaymentSucceeded → Inventory Service (confirm)
- PaymentFailed → Inventory Service (release stock)
- OrderShipped → Notification Service (email)
```

### Implementation Outline

```go
// Order Service
func CreateOrder(order Order) error {
    // 1. Validate
    if err := validateOrder(order); err != nil {
        return err
    }
    
    // 2. Save to database
    tx, _ := db.Begin()
    _, err := tx.Exec("INSERT INTO orders (...) VALUES (...)")
    if err != nil {
        tx.Rollback()
        return err
    }
    tx.Commit()
    
    // 3. Publish event (async)
    kafka.Publish("order-created", OrderCreatedEvent{
        OrderID:   order.ID,
        UserID:    order.UserID,
        ProductID: order.ProductID,
        Quantity:  order.Quantity,
    })
    
    return nil
}

// Inventory Service (consumer)
func HandleOrderCreated(event OrderCreatedEvent) {
    // Reserve stock
    _, err := db.Exec(`
        UPDATE inventory 
        SET reserved = reserved + $1 
        WHERE product_id = $2 AND available >= $1
    `, event.Quantity, event.ProductID)
    
    if err != nil {
        // Insufficient stock
        kafka.Publish("inventory-insufficient", event)
        return
    }
    
    // Clear cache
    redis.Del(fmt.Sprintf("inventory:%d", event.ProductID))
    
    kafka.Publish("inventory-reserved", event)
}
```

---

## 📚 Additional Resources

- [System Design Primer (GitHub)](https://github.com/donnemartin/system-design-primer)
- [Designing Data-Intensive Applications](https://dataintensive.net/)
- [High Scalability Blog](http://highscalability.com/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)

---

## ✅ Module Checklist

- [ ] Understand CAP theorem and ACID vs BASE
- [ ] Design for horizontal scalability
- [ ] Implement circuit breaker and retry patterns
- [ ] Choose appropriate caching strategy
- [ ] Design microservices architecture
- [ ] Use message queues for async processing
- [ ] Complete system design case studies
- [ ] Design scalable e-commerce system

---

**🎉 Infrastructure Section Complete! (5/5 modules)**

Progress: **16/30 modules (53%)**

Ready to continue with **Part 4: Microservices Architecture**? 🚀

**Next Module:** [Module 17: Microservices Architecture](./17_Microservices_Architecture.md) - Build distributed systems! 🔄
