# Module 32: Backend Interview Preparation

## Table of Contents
- [Go Programming Questions](#go-questions)
- [Databases & SQL](#database-questions)
- [System Design Quickfire](#system-design)
- [Kubernetes & DevOps](#kubernetes-questions)
- [Microservices & Architecture](#architecture-questions)
- [Behavioral Questions](#behavioral)
- [Coding Challenges](#coding)
- [Interview Tips](#tips)

---

## Go Programming Questions {#go-questions}

### Q1: What is the difference between a goroutine and a thread?

**A:** 
- **Goroutines**: Lightweight (2KB stack), managed by Go runtime, multiplexed onto OS threads
- **Threads**: Heavyweight (1MB+ stack), managed by OS, 1:1 with OS threads
- **M:N model**: M goroutines run on N OS threads via scheduler

### Q2: Explain channels and when to use buffered vs unbuffered.

**A:**
```go
// Unbuffered: Synchronous, sender blocks until receiver ready
ch := make(chan int)
ch <- 42  // Blocks until someone receives

// Buffered: Asynchronous up to capacity
ch := make(chan int, 3)
ch <- 1  // Doesn't block
ch <- 2  // Doesn't block
ch <- 3  // Doesn't block
ch <- 4  // Blocks (buffer full)
```

**Use unbuffered** for synchronization, **buffered** for throughput.

### Q3: How does defer work?

**A:**
```go
func example() {
    defer fmt.Println("3")  // Last in, first out (LIFO)
    defer fmt.Println("2")
    fmt.Println("1")
}
// Output: 1, 2, 3

// Common use: cleanup
func readFile() error {
    f, err := os.Open("file.txt")
    if err != nil {
        return err
    }
    defer f.Close()  // Guaranteed to run
    
    // Use file...
    return nil
}
```

### Q4: What are interfaces and how do they enable polymorphism?

**A:**
```go
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Any type with Read() satisfies Reader (implicit implementation)
type File struct {}
func (f File) Read(p []byte) (int, error) { ... }

type Network struct {}
func (n Network) Read(p []byte) (int, error) { ... }

// Polymorphic function
func processData(r Reader) {
    r.Read(...)  // Works with File, Network, or any Reader
}
```

### Q5: Explain context.Context and its use cases.

**A:**
```go
// Cancellation
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

resp, err := http.Get Ctx(ctx, "https://api.example.com")
// Request canceled after 5 seconds

// Passing request-scoped values
ctx = context.WithValue(ctx, "userID", "12345")
userID := ctx.Value("userID").(string)

// Propagation across goroutines
go processRequest(ctx)  // Inherits cancellation
```

**Use cases**: Timeouts, cancellation, request-scoped data (trace IDs, auth)

### Q6: What causes goroutine leaks and how to prevent them?

**A:**
```go
// ❌ Leak: goroutine blocked forever
func leak() {
    ch := make(chan int)
    go func() {
        val := <-ch  // Blocks forever, no sender
        fmt.Println(val)
    }()
}

// ✅ Fix: Use context for cancellation
func fixed() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    ch := make(chan int)
    go func() {
        select {
        case val := <-ch:
            fmt.Println(val)
        case <-ctx.Done():
            return  // Exit on timeout
        }
    }()
}
```

---

## Databases & SQL {#database-questions}

### Q7: Explain ACID properties.

**A:**
- **Atomicity**: All or nothing (transaction succeeds or rolls back)
- **Consistency**: Data satisfies constraints (foreign keys, unique)
- **Isolation**: Transactions don't interfere (serializable levels)
- **Durability**: Committed data persists (survives crashes)

### Q8: What are isolation levels and their trade-offs?

**A:**
```sql
-- Read Uncommitted: Dirty reads possible
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- Read Committed: No dirty reads, but non-repeatable reads
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read: Consistent reads, but phantom reads
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Serializable: Full isolation, slowest
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

| Level | Dirty Read | Non-Repeatable | Phantom | Performance |
|-------|------------|----------------|---------|-------------|
| Read Uncommitted | Yes | Yes | Yes | Fastest |
| Read Committed | No | Yes | Yes | Fast |
| Repeatable Read | No | No | Yes | Slow |
| Serializable | No | No | No | Slowest |

### Q9: How do indexes work and when to use them?

**A:**
```sql
-- B-Tree index (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- Composite index (order matters)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
-- Good for: WHERE user_id = ? AND created_at > ?
-- Bad for: WHERE created_at > ? (doesn't use index)

-- Partial index
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- When to use:
-- ✅ Columns in WHERE, JOIN, ORDER BY
-- ✅ Foreign keys
-- ❌ Small tables (<1000 rows)
-- ❌ Frequently updated columns (index maintenance overhead)
```

### Q10: Explain database normalization.

**A:**
```
1NF: Atomic values, no repeating groups
2NF: 1NF + no partial dependencies
3NF: 2NF + no transitive dependencies

Example:
❌ Denormalized:
orders: id, user_name, user_email, product_name, quantity
(user data repeated for each order)

✅ Normalized:
users: id, name, email
products: id, name
orders: id, user_id, product_id, quantity
```

**Trade-off**: Normalized = less redundancy, slower reads. Denormalized = faster reads, more storage.

### Q11: How do you optimize slow queries?

**A:**
1. **EXPLAIN ANALYZE**: Identify bottleneck
```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123;
-- Look for: Seq Scan (bad), Index Scan (good)
```

2. **Add indexes**: On WHERE/JOIN columns
3. **Avoid SELECT \***: Fetch only needed columns
4. **Limit results**: Use LIMIT and pagination
5. **Denormalize**: For read-heavy workloads
6. **Use caching**: Redis for frequent queries
7. **Connection pooling**: Reuse connections

---

## System Design Quickfire {#system-design}

### Q12: How would you design a URL shortener?

**A:**
```
API: POST /shorten → short URL, GET /{code} → redirect
Database: short_code (indexed), original_url, created_at
Encoding: Base62 of auto-incrementing ID
Scaling: Read replicas, Redis cache for popular URLs
Sharding: Hash(short_code) % num_shards
```

### Q13: How do you handle millions of concurrent WebSocket connections?

**A:**
```
Architecture:
- Multiple WebSocket servers (horizontal scaling)
- Redis Pub/Sub for cross-server messaging
- Consistent hashing for user→server routing
- Load balancer with sticky sessions
- Connection pooling to database

Scaling:
- 1 server ≈ 10K connections (1GB RAM)
- 100 servers = 1M connections
- Use C10K problem solutions (epoll, kqueue)
```

### Q14: How would you implement rate limiting?

**A:**
```
Algorithm: Token bucket or sliding window
Storage: Redis (fast, distributed)
Key: user_id or IP address
Lua script for atomic operations

Rate limit headers:
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1638360000
```

### Q15: How do you ensure idempotency in distributed systems?

**A:**
```go
// Idempotency key in request
type PaymentRequest struct {
    IdempotencyKey string  // UUID
    Amount         float64
}

func processPayment(req PaymentRequest) error {
    // Check if already processed
    if result := redis.Get("payment:" + req.IdempotencyKey); result != nil {
        return result  // Return cached result
    }
    
    // Process payment
    result := chargeCard(req.Amount)
    
    // Cache result (24 hours)
    redis.Set("payment:" + req.IdempotencyKey, result, 24*time.Hour)
    
    return result
}
```

---

## Kubernetes & DevOps {#kubernetes-questions}

### Q16: Explain Kubernetes architecture.

**A:**
```
Control Plane:
- API Server: Entry point for all operations
- etcd: Distributed key-value store (cluster state)
- Scheduler: Assigns pods to nodes
- Controller Manager: Maintains desired state

Node:
- Kubelet: Runs containers, reports to API server
- Kube-proxy: Network routing, load balancing
- Container Runtime: Docker, containerd
```

### Q17: What's the difference between Deployment, StatefulSet, and DaemonSet?

**A:**
```
Deployment: Stateless apps, rolling updates, scaling
- Example: Web servers, API services

StatefulSet: Stateful apps, stable network IDs, persistent storage
- Example: Databases (Postgres, MongoDB), Kafka

DaemonSet: One pod per node
- Example: Log collectors (Fluentd), monitoring agents
```

### Q18: How do you troubleshoot a crashing pod?

**A:**
```bash
# 1. Check pod status
kubectl get pods
kubectl describe pod myapp-pod

# 2. Check logs
kubectl logs myapp-pod
kubectl logs myapp-pod --previous  # Previous crashed container

# 3. Check events
kubectl get events --sort-by='.lastTimestamp'

# 4. Exec into pod (if running)
kubectl exec -it myapp-pod -- /bin/sh

# Common issues:
# - OOMKilled: Increase memory limits
# - CrashLoopBackOff: Application bug, check logs
# - ImagePullBackOff: Wrong image name/tag
# - Pending: Insufficient resources
```

---

## Microservices & Architecture {#architecture-questions}

### Q19: What are the trade-offs of microservices vs monolith?

**A:**
```
Microservices Pros:
✅ Independent deployment
✅ Technology flexibility
✅ Team autonomy
✅ Better fault isolation

Microservices Cons:
❌ Complexity (distributed systems)
❌ Network latency
❌ Data consistency challenges
❌ Higher operational overhead

When to use:
- Microservices: Large teams, different tech stacks, need scalability
- Monolith: Small teams, early stage, simple domain
```

### Q20: Explain the Saga pattern for distributed transactions.

**A:**
```
Problem: No ACID transactions across microservices

Solution: Saga (sequence of local transactions + compensating actions)

Example: Order processing
1. Reserve inventory → Success
2. Charge payment → Success
3. Create shipment → Failure
4. Compensate: Refund payment
5. Compensate: Release inventory

Implementation:
- Choreography: Event-driven (OrderCreated → InventoryReserved → PaymentCharged)
- Orchestration: Central coordinator manages steps
```

### Q21: How do you handle service discovery?

**A:**
```
Client-side: Client queries service registry (Consul, etcd)
- Pros: No single point of failure
- Cons: Logic in client

Server-side: Load balancer queries registry
- Pros: Simple clients
- Cons: Extra hop

Kubernetes: DNS-based (service.namespace.svc.cluster.local)
- Automatic service discovery via CoreDNS
```

---

## Behavioral Questions {#behavioral}

### Q22: Tell me about a time you debugged a production issue.

**Framework: STAR (Situation, Task, Action, Result)**

**Example:**
```
Situation: Production API latency spiked to 5 seconds

Task: Identify root cause and fix within 1 hour (SLA)

Action:
1. Checked monitoring (Grafana): Database query time increased
2. Analyzed slow query logs: Missing index on orders.user_id
3. Created index: CREATE INDEX idx_orders_user ON orders(user_id)
4. Latency dropped to <100ms

Result: 
- Resolved in 45 minutes
- Added automated query performance tests
- Documented indexing strategy for team
```

### Q23: Describe a time you improved system performance.

**Example:**
```
Situation: Dashboard loading 10 seconds with 10K users

Action:
1. Profiled API: 90% time in database queries
2. Added Redis cache (TTL: 5 minutes)
3. Implemented pagination (limit 20)
4. Added database read replicas
5. Used connection pooling

Result:
- Load time: 10s → 500ms (20x improvement)
- Cache hit ratio: 85%
- Handled 100K users without degradation
```

---

## Coding Challenges {#coding}

### Q24: Implement LRU Cache

```go
type LRUCache struct {
    capacity int
    cache    map[int]*Node
    head     *Node
    tail     *Node
}

type Node struct {
    key, value int
    prev, next *Node
}

func Constructor(capacity int) LRUCache {
    cache := LRUCache{
        capacity: capacity,
        cache:    make(map[int]*Node),
        head:     &Node{},
        tail:     &Node{},
    }
    cache.head.next = cache.tail
    cache.tail.prev = cache.head
    return cache
}

func (c *LRUCache) Get(key int) int {
    if node, exists := c.cache[key]; exists {
        c.moveToHead(node)
        return node.value
    }
    return -1
}

func (c *LRUCache) Put(key, value int) {
    if node, exists := c.cache[key]; exists {
        node.value = value
        c.moveToHead(node)
    } else {
        node := &Node{key: key, value: value}
        c.cache[key] = node
        c.addToHead(node)
        
        if len(c.cache) > c.capacity {
            removed := c.removeTail()
            delete(c.cache, removed.key)
        }
    }
}

func (c *LRUCache) moveToHead(node *Node) {
    c.removeNode(node)
    c.addToHead(node)
}

func (c *LRUCache) removeNode(node *Node) {
    node.prev.next = node.next
    node.next.prev = node.prev
}

func (c *LRUCache) addToHead(node *Node) {
    node.next = c.head.next
    node.prev = c.head
    c.head.next.prev = node
    c.head.next = node
}

func (c *LRUCache) removeTail() *Node {
    node := c.tail.prev
    c.removeNode(node)
    return node
}
```

### Q25: Implement API Rate Limiter

```go
type RateLimiter struct {
    requests map[string][]time.Time
    mu       sync.Mutex
    limit    int
    window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

func (rl *RateLimiter) Allow(userID string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    
    now := time.Now()
    windowStart := now.Add(-rl.window)
    
    // Get user's requests
    timestamps := rl.requests[userID]
    
    // Remove old requests outside window
    valid := []time.Time{}
    for _, t := range timestamps {
        if t.After(windowStart) {
            valid = append(valid, t)
        }
    }
    
    // Check limit
    if len(valid) >= rl.limit {
        return false
    }
    
    // Add current request
    valid = append(valid, now)
    rl.requests[userID] = valid
    
    return true
}

// Usage
limiter := NewRateLimiter(10, 1*time.Minute)  // 10 requests/minute
if limiter.Allow("user123") {
    // Process request
} else {
    // Return 429 Too Many Requests
}
```

### Q26: Find Top K Frequent Elements

```go
func topKFrequent(nums []int, k int) []int {
    // Count frequencies
    freq := make(map[int]int)
    for _, num := range nums {
        freq[num]++
    }
    
    // Min heap of size k
    h := &MinHeap{}
    heap.Init(h)
    
    for num, count := range freq {
        heap.Push(h, Element{num, count})
        if h.Len() > k {
            heap.Pop(h)
        }
    }
    
    // Extract results
    result := make([]int, k)
    for i := k - 1; i >= 0; i-- {
        result[i] = heap.Pop(h).(Element).value
    }
    
    return result
}

type Element struct {
    value int
    freq  int
}

type MinHeap []Element

func (h MinHeap) Len() int           { return len(h) }
func (h MinHeap) Less(i, j int) bool { return h[i].freq < h[j].freq }
func (h MinHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }
func (h *MinHeap) Push(x interface{}) { *h = append(*h, x.(Element)) }
func (h *MinHeap) Pop() interface{} {
    old := *h
    n := len(old)
    x := old[n-1]
    *h = old[0 : n-1]
    return x
}
```

---

## Interview Tips {#tips}

### Before the Interview

✅ **Review fundamentals**: Go, SQL, Kubernetes, system design
✅ **Practice coding**: LeetCode medium problems (20-30)
✅ **Study the company**: Tech stack, products, challenges
✅ **Prepare questions**: Ask about team, projects, culture

### During the Interview

✅ **Clarify requirements**: Don't assume, ask questions
✅ **Think aloud**: Explain your reasoning
✅ **Start simple**: Basic solution first, then optimize
✅ **Consider edge cases**: Empty input, large scale, failures
✅ **Discuss trade-offs**: No perfect solution, explain choices

### Common Mistakes

❌ **Jumping to code**: Plan first (5 min thinking > 30 min debugging)
❌ **Ignoring hints**: Interviewer is helping, listen carefully
❌ **Not testing**: Walk through examples, edge cases
❌ **Over-engineering**: Start with simple, working solution
❌ **Giving up**: Stuck? Ask for hints, think aloud

### Sample Questions to Ask

```
Technical:
- "What's your tech stack and why did you choose it?"
- "How do you handle deployments and rollbacks?"
- "What's your approach to monitoring and incident response?"

Team:
- "What does a typical day look like?"
- "How is the team structured? (Backend, frontend, full-stack?)"
- "How do you handle technical debt?"

Growth:
- "What opportunities are there for learning and growth?"
- "How do you support career development?"
- "What are the biggest challenges the team is facing?"
```

---

## Summary

You've completed the comprehensive backend learning path! 🎉

**32 Modules Covered:**
- ✅ Go Programming (5 modules)
- ✅ Kubernetes (6 modules)
- ✅ Infrastructure as Code (5 modules)
- ✅ Microservices & Integration (4 modules)
- ✅ AWS & Cloud Services (5 modules)
- ✅ Observability (3 modules: Prometheus, Grafana, EFK)
- ✅ Distributed Tracing (1 module)
- ✅ Production Best Practices (1 module)
- ✅ Interview Preparation (2 modules)

**Next Steps:**
1. Build projects using learned technologies
2. Contribute to open-source Go/Kubernetes projects
3. Practice system design problems weekly
4. Set up a complete observability stack
5. Apply for backend engineering roles!

**Resources:**
- LeetCode: Practice coding challenges
- System Design Primer: github.com/donnemartin/system-design-primer
- Go by Example: gobyexample.com
- Kubernetes Docs: kubernetes.io/docs
- AWS Well-Architected: aws.amazon.com/architecture

Good luck with your interviews! 🚀
