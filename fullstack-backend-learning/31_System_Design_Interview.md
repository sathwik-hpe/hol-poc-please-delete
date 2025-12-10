# Module 31: System Design Interview

## Table of Contents
- [Interview Framework](#framework)
- [Design Fundamentals](#fundamentals)
- [Case Study: URL Shortener](#url-shortener)
- [Case Study: Rate Limiter](#rate-limiter)
- [Case Study: Chat System](#chat-system)
- [Case Study: News Feed](#news-feed)
- [Case Study: Video Streaming](#video-streaming)
- [Common Patterns](#patterns)
- [Evaluation Criteria](#evaluation)

---

## Interview Framework {#framework}

### 4-Step Process

**1. Understand Requirements (5-10 min)**
- Functional requirements (features)
- Non-functional requirements (scale, performance)
- Constraints and assumptions

**2. High-Level Design (10-15 min)**
- API design
- Database schema
- System architecture diagram

**3. Deep Dive (15-20 min)**
- Bottlenecks and scaling
- Data partitioning
- Caching strategy
- Trade-offs

**4. Wrap-Up (5 min)**
- Monitoring and metrics
- Next steps and improvements

### Key Questions to Ask

```
Functional:
- What features are critical? (MVP vs nice-to-have)
- Who are the users? (internal, external, global)
- What's the user flow?

Scale:
- How many users? (DAU, MAU)
- Read/write ratio?
- Data size and growth rate?

Performance:
- Latency requirements? (real-time, near-real-time, eventual)
- Availability requirements? (99.9%, 99.99%)
- Consistency vs availability trade-off?
```

---

## Design Fundamentals {#fundamentals}

### Capacity Estimation

```
Example: Twitter-like system
------------------------------
Users: 300M MAU (Monthly Active Users)
DAU: 100M (33% of MAU)
Tweets per user per day: 2
Total tweets per day: 200M

Write QPS: 200M / 86400 = 2,300 writes/sec
Read QPS: Assume 10x reads = 23,000 reads/sec

Peak QPS (3x average): 7,000 writes/sec, 70,000 reads/sec

Storage:
- Tweet size: 280 chars × 2 bytes = 560 bytes
- Media: 20% have media, avg 1MB
- Daily storage: 200M × 560 bytes + 40M × 1MB = 40TB/day
- Annual: 40TB × 365 = 14.6PB/year
```

### Database Choices

| Type | Use Case | Examples |
|------|----------|----------|
| **Relational** | ACID, complex queries | PostgreSQL, MySQL |
| **Document** | Flexible schema, nested data | MongoDB, DynamoDB |
| **Key-Value** | Simple lookups, caching | Redis, Memcached |
| **Column** | Analytics, time-series | Cassandra, HBase |
| **Graph** | Social networks, relationships | Neo4j |
| **Search** | Full-text search | Elasticsearch |

### CAP Theorem

```
Consistency: All nodes see same data
Availability: Every request gets response
Partition Tolerance: System works despite network failures

Pick 2:
- CP: Consistent + Partition-tolerant (MongoDB, HBase)
- AP: Available + Partition-tolerant (Cassandra, DynamoDB)
- CA: Impossible in distributed systems
```

---

## Case Study: URL Shortener {#url-shortener}

### Requirements

**Functional:**
- Shorten URL: `https://example.com/very/long/url` → `https://short.ly/abc123`
- Redirect: GET `https://short.ly/abc123` → redirect to original
- Custom aliases (optional)
- Expiration (optional)

**Non-Functional:**
- 100M URLs shortened/month
- Read-heavy (100:1 read:write ratio)
- Low latency (<50ms)
- 99.9% availability

### API Design

```
POST /api/shorten
Request:  {"url": "https://example.com/long"}
Response: {"short_url": "https://short.ly/abc123"}

GET /{shortCode}
Response: 302 Redirect to original URL

GET /api/stats/{shortCode}
Response: {"clicks": 1234, "created": "2024-12-10"}
```

### Database Schema

```sql
CREATE TABLE urls (
  id BIGSERIAL PRIMARY KEY,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  user_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  clicks BIGINT DEFAULT 0
);

CREATE INDEX idx_short_code ON urls(short_code);
CREATE INDEX idx_user_id ON urls(user_id);
```

### URL Encoding

```go
// Base62 encoding (62 chars: a-z, A-Z, 0-9)
const base62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func encode(num uint64) string {
    if num == 0 {
        return string(base62[0])
    }
    
    var encoded strings.Builder
    for num > 0 {
        encoded.WriteByte(base62[num%62])
        num /= 62
    }
    
    // Reverse string
    runes := []rune(encoded.String())
    for i, j := 0, len(runes)-1; i < j; i, j = i+1, j-1 {
        runes[i], runes[j] = runes[j], runes[i]
    }
    
    return string(runes)
}

// Example: ID 125 → "b9" (7 chars = 62^7 = 3.5 trillion URLs)
```

### Architecture

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     ▼
┌─────────────┐
│ Load Balancer│
└──────┬──────┘
       │
       ├──────► ┌──────────┐      ┌──────────┐
       │        │ App Server├─────►│ Database │
       │        └──────────┘      │ (Primary)│
       │                          └──────────┘
       │
       └──────► ┌──────────┐      ┌──────────┐
                │  Redis   │◄────►│ Database │
                │  Cache   │      │ (Replica)│
                └──────────┘      └──────────┘
```

### Scaling

**Sharding:**
```
Shard by short_code hash:
- Shard 0: a-m
- Shard 1: n-z

Or range-based:
- Shard 0: ID 0-1B
- Shard 1: ID 1B-2B
```

**Caching:**
```
Cache popular URLs (80/20 rule)
- TTL: 24 hours
- Eviction: LRU
- Cache size: 1M URLs × 1KB = 1GB
```

---

## Case Study: Rate Limiter {#rate-limiter}

### Requirements

**Functional:**
- Limit requests per user/IP
- Configurable rules (10 req/sec, 100 req/min)
- Return HTTP 429 when exceeded

**Non-Functional:**
- Low latency (<1ms)
- Distributed (multiple servers)
- Accurate (no over-counting)

### Algorithms

**1. Token Bucket**
```go
type TokenBucket struct {
    capacity int
    tokens   int
    refillRate int  // tokens per second
    lastRefill time.Time
}

func (tb *TokenBucket) Allow() bool {
    tb.refill()
    if tb.tokens > 0 {
        tb.tokens--
        return true
    }
    return false
}

func (tb *TokenBucket) refill() {
    now := time.Now()
    elapsed := now.Sub(tb.lastRefill).Seconds()
    tokensToAdd := int(elapsed * float64(tb.refillRate))
    tb.tokens = min(tb.capacity, tb.tokens + tokensToAdd)
    tb.lastRefill = now
}
```

**2. Sliding Window (Redis)**
```lua
-- Redis Lua script
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return 1
else
    return 0
end
```

```go
func isAllowed(userID string) bool {
    script := `... (Lua script above)`
    result := redisClient.Eval(ctx, script, []string{"ratelimit:" + userID}, 10, 60, time.Now().Unix())
    return result.Val().(int64) == 1
}
```

### Architecture

```
┌────────┐     ┌───────────┐     ┌─────────┐
│ Client │────►│API Gateway│────►│ Service │
└────────┘     └─────┬─────┘     └─────────┘
                     │
                     ▼
              ┌─────────────┐
              │Rate Limiter │
              │   (Redis)   │
              └─────────────┘
```

---

## Case Study: Chat System {#chat-system}

### Requirements

**Functional:**
- 1-on-1 chat
- Group chat
- Online status
- Message history
- Read receipts

**Non-Functional:**
- 50M DAU
- Real-time delivery (<100ms)
- Message persistence

### Architecture

```
┌────────┐  WebSocket  ┌─────────────┐
│ Client │◄───────────►│ Chat Server │
└────────┘             └──────┬──────┘
                              │
                      ┌───────┴───────┐
                      │               │
                ┌─────▼────┐   ┌──────▼─────┐
                │  Redis   │   │  Kafka     │
                │ (Presence)   │ (Messages) │
                └──────────┘   └─────┬──────┘
                                     │
                              ┌──────▼─────┐
                              │ PostgreSQL │
                              │ (History)  │
                              └────────────┘
```

### Database Schema

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  created_at TIMESTAMP
);

CREATE TABLE conversations (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(10), -- 'direct' or 'group'
  created_at TIMESTAMP
);

CREATE TABLE participants (
  conversation_id BIGINT REFERENCES conversations(id),
  user_id BIGINT REFERENCES users(id),
  joined_at TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT REFERENCES conversations(id),
  sender_id BIGINT REFERENCES users(id),
  content TEXT,
  created_at TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

### WebSocket Connection Management

```go
type ChatServer struct {
    clients map[string]*Client  // userID -> Client
    mu      sync.RWMutex
}

func (s *ChatServer) HandleConnection(userID string, conn *websocket.Conn) {
    client := &Client{UserID: userID, Conn: conn}
    
    s.mu.Lock()
    s.clients[userID] = client
    s.mu.Unlock()
    
    // Mark online in Redis
    redisClient.Set(ctx, "online:"+userID, "1", 5*time.Minute)
    
    // Listen for messages
    for {
        var msg Message
        if err := conn.ReadJSON(&msg); err != nil {
            break
        }
        s.handleMessage(client, msg)
    }
    
    // Cleanup
    s.mu.Lock()
    delete(s.clients, userID)
    s.mu.Unlock()
    redisClient.Del(ctx, "online:"+userID)
}

func (s *ChatServer) sendMessage(recipientID string, msg Message) {
    s.mu.RLock()
    client, online := s.clients[recipientID]
    s.mu.RUnlock()
    
    if online {
        client.Conn.WriteJSON(msg)
    } else {
        // Store for later delivery
        kafka.Produce("pending_messages", msg)
    }
}
```

---

## Case Study: News Feed {#news-feed}

### Requirements

**Functional:**
- User posts (text, images)
- Follow users
- Home feed (posts from followed users)
- Ranking algorithm

**Non-Functional:**
- 500M users, 100M DAU
- Feed load <500ms
- Post delivery <5 sec

### Feed Generation Strategies

**1. Fanout on Write (Push)**
```
User posts → Write to all followers' feeds

Pros: Fast read
Cons: Slow write for celebrities (1M followers)
```

**2. Fanout on Read (Pull)**
```
User opens feed → Fetch from all followed users

Pros: Fast write
Cons: Slow read (N queries)
```

**3. Hybrid**
```
Normal users: Fanout on write
Celebrities: Fanout on read
Cache recent posts
```

### Database Schema

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50)
);

CREATE TABLE follows (
  follower_id BIGINT REFERENCES users(id),
  followee_id BIGINT REFERENCES users(id),
  created_at TIMESTAMP,
  PRIMARY KEY (follower_id, followee_id)
);

CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  content TEXT,
  created_at TIMESTAMP
);

-- Feed cache (fanout on write)
CREATE TABLE feeds (
  user_id BIGINT,
  post_id BIGINT,
  created_at TIMESTAMP,
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_feeds_user_time ON feeds(user_id, created_at DESC);
```

### Feed Generation

```go
// Fanout on write
func createPost(userID int64, content string) {
    // Save post
    postID := db.Insert("posts", Post{UserID: userID, Content: content})
    
    // Get followers
    followers := db.Query("SELECT follower_id FROM follows WHERE followee_id = ?", userID)
    
    // Write to each follower's feed (async)
    for _, followerID := range followers {
        kafkaProducer.Send("feed_updates", FeedUpdate{
            UserID: followerID,
            PostID: postID,
        })
    }
}

// Fanout on read
func getFeed(userID int64) []Post {
    // Get followed users
    followees := db.Query("SELECT followee_id FROM follows WHERE follower_id = ?", userID)
    
    // Fetch recent posts
    posts := []Post{}
    for _, followeeID := range followees {
        posts = append(posts, db.Query("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", followeeID)...)
    }
    
    // Sort by timestamp
    sort.Slice(posts, func(i, j int) bool {
        return posts[i].CreatedAt.After(posts[j].CreatedAt)
    })
    
    return posts[:20]
}
```

---

## Case Study: Video Streaming {#video-streaming}

### Requirements

**Functional:**
- Upload videos
- Transcode to multiple resolutions
- Adaptive bitrate streaming
- Recommendations

**Non-Functional:**
- 1B videos
- 10M concurrent viewers
- 99.99% availability

### Architecture

```
┌────────┐   Upload   ┌───────────┐   Store   ┌──────┐
│ Client │───────────►│API Server │──────────►│  S3  │
└────────┘            └─────┬─────┘           └──────┘
                            │
                      Trigger│
                            ▼
                    ┌────────────┐
                    │ Transcode  │ FFmpeg
                    │   Queue    │ (Lambda)
                    └──────┬─────┘
                           │
                      Store│
                           ▼
                    ┌─────────────┐
                    │     CDN     │
                    │ (CloudFront)│
                    └──────┬──────┘
                           │
                     Stream│
                           ▼
                    ┌────────────┐
                    │   Client   │
                    └────────────┘
```

### Transcoding

```yaml
# Resolutions
- 4K: 3840x2160, 15 Mbps
- 1080p: 1920x1080, 5 Mbps
- 720p: 1280x720, 2.5 Mbps
- 480p: 854x480, 1 Mbps
- 360p: 640x360, 0.5 Mbps

# HLS (HTTP Live Streaming)
video.m3u8 (playlist)
├── video_4k.m3u8
├── video_1080p.m3u8
├── video_720p.m3u8
└── video_480p.m3u8
```

### CDN Caching

```
Origin (S3) → Edge Locations (CloudFront) → Users

Cache-Control: max-age=31536000 (1 year for videos)
Cache hit ratio: >90%
```

---

## Common Patterns {#patterns}

### Caching Strategy

```
Cache-Aside:
1. Check cache
2. If miss, query DB
3. Write to cache
4. Return data

Write-Through:
1. Write to cache
2. Write to DB
3. Return success

Write-Behind:
1. Write to cache
2. Async write to DB
3. Return success (faster)
```

### Database Sharding

```
Hash-based: shard = hash(userID) % num_shards
Range-based: shard = userID / 1000000
Geography-based: shard = user.country
```

### Load Balancing

```
Round Robin: Distribute evenly
Least Connections: Send to least busy
IP Hash: Consistent routing
Weighted: Based on capacity
```

---

## Evaluation Criteria {#evaluation}

Interviewers assess:

✅ **Problem Solving**: Clarify requirements, ask questions
✅ **Communication**: Explain decisions clearly
✅ **System Thinking**: Consider trade-offs
✅ **Scalability**: Handle growth
✅ **Practical Knowledge**: Real-world technologies
✅ **Trade-offs**: No perfect solution, justify choices

**Common Mistakes:**
❌ Jump to solution without clarifying
❌ Over-engineer for small scale
❌ Ignore non-functional requirements
❌ Not considering failures
❌ Vague hand-waving

---

## Summary

You've learned:
- ✅ 4-step interview framework
- ✅ Capacity estimation and scaling math
- ✅ 5 detailed case studies with solutions
- ✅ Common design patterns
- ✅ Evaluation criteria and mistakes to avoid

**Next Module**: [Module 32: Backend Interview Prep](32_Backend_Interview_Prep.md) - Technical coding and conceptual questions.
