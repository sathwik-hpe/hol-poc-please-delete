# Module 15: Database Deep Dive 🗄️

## PostgreSQL, Elasticsearch, and MinIO - Production Database Systems

**Duration:** 6-7 hours  
**Prerequisites:** SQL basics, Module 04 (Go Database Integration)  
**Outcome:** Master three critical database technologies for modern applications

---

## 📚 Table of Contents

1. [PostgreSQL](#postgresql)
2. [Elasticsearch](#elasticsearch)
3. [MinIO](#minio)
4. [Database Selection Guide](#database-selection-guide)
5. [Best Practices](#best-practices)
6. [Interview Questions](#interview-questions)
7. [Hands-On Exercise](#hands-on-exercise)

---

## PostgreSQL

### What is PostgreSQL?

**Open-source relational database** - ACID compliant, supports complex queries, transactions, JSON, full-text search.

### Installation

```bash
# Ubuntu
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user
sudo -i -u postgres

# Access psql
psql

# macOS
brew install postgresql@15
brew services start postgresql@15
```

### Basic Administration

```sql
-- Create database
CREATE DATABASE myapp;

-- Create user
CREATE USER myapp_user WITH PASSWORD 'securepassword';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE myapp TO myapp_user;

-- Connect to database
\c myapp

-- List databases
\l

-- List tables
\dt

-- Describe table
\d users

-- Quit
\q
```

### Tables & Data Types

```sql
-- Create table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- GIN index for JSONB
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);

-- Full-text search index
CREATE INDEX idx_users_bio_fts ON users USING GIN(to_tsvector('english', bio));
```

### CRUD Operations

```sql
-- Insert
INSERT INTO users (username, email, password_hash, full_name)
VALUES ('john_doe', 'john@example.com', 'hash123', 'John Doe');

-- Insert with JSONB
INSERT INTO users (username, email, password_hash, metadata)
VALUES ('jane_doe', 'jane@example.com', 'hash456', 
        '{"preferences": {"theme": "dark", "language": "en"}, "badges": ["verified", "pro"]}');

-- Select
SELECT * FROM users WHERE email = 'john@example.com';

-- JSONB queries
SELECT * FROM users WHERE metadata->>'preferences'->>'theme' = 'dark';
SELECT * FROM users WHERE metadata->'badges' ? 'verified';

-- Update
UPDATE users SET bio = 'Software Engineer' WHERE username = 'john_doe';

-- Delete
DELETE FROM users WHERE id = 1;
```

### Relationships

```sql
-- Posts table (one-to-many with users)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_slug ON posts(slug);

-- Tags table (many-to-many)
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Join query
SELECT p.title, u.username, array_agg(t.name) as tags
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN post_tags pt ON p.id = pt.post_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id, u.username;
```

### Transactions

```sql
BEGIN;

UPDATE users SET bio = 'Updated bio' WHERE id = 1;
INSERT INTO posts (user_id, title, content, slug) 
VALUES (1, 'My Post', 'Content here', 'my-post');

COMMIT;  -- or ROLLBACK;

-- Savepoints
BEGIN;
UPDATE users SET bio = 'First update' WHERE id = 1;
SAVEPOINT sp1;
UPDATE users SET bio = 'Second update' WHERE id = 1;
ROLLBACK TO sp1;
COMMIT;
```

### Advanced Features

```sql
-- Views
CREATE VIEW active_users_with_posts AS
SELECT u.id, u.username, u.email, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.is_active = true
GROUP BY u.id;

SELECT * FROM active_users_with_posts;

-- Common Table Expressions (CTEs)
WITH user_stats AS (
    SELECT user_id, COUNT(*) as post_count
    FROM posts
    GROUP BY user_id
)
SELECT u.username, COALESCE(us.post_count, 0) as posts
FROM users u
LEFT JOIN user_stats us ON u.id = us.user_id;

-- Window Functions
SELECT 
    username,
    created_at,
    ROW_NUMBER() OVER (ORDER BY created_at) as user_number,
    RANK() OVER (ORDER BY created_at) as user_rank
FROM users;

-- Full-Text Search
SELECT * FROM users 
WHERE to_tsvector('english', bio) @@ to_tsquery('engineer & software');
```

### Replication

```bash
# Master configuration (postgresql.conf)
wal_level = replica
max_wal_senders = 3
wal_keep_size = 64

# pg_hba.conf
host replication replicator 192.168.1.0/24 md5

# Create replication user
CREATE USER replicator REPLICATION LOGIN PASSWORD 'password';

# Slave: Base backup
pg_basebackup -h master_ip -D /var/lib/postgresql/15/main -U replicator -P -v

# recovery.conf (or postgresql.auto.conf in PG 12+)
primary_conninfo = 'host=master_ip port=5432 user=replicator password=password'
hot_standby = on
```

### Go + PostgreSQL

```go
package main

import (
    "database/sql"
    "log"
    _ "github.com/lib/pq"
)

func main() {
    connStr := "postgres://myapp_user:securepassword@localhost/myapp?sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Connection pooling
    db.SetMaxOpenConns(25)
    db.SetMaxIdleConns(25)
    db.SetConnMaxLifetime(5 * time.Minute)

    // Insert
    var id int
    err = db.QueryRow(`
        INSERT INTO users (username, email, password_hash) 
        VALUES ($1, $2, $3) RETURNING id`,
        "john_doe", "john@example.com", "hash123",
    ).Scan(&id)
    if err != nil {
        log.Fatal(err)
    }
    
    // Query
    rows, err := db.Query("SELECT id, username, email FROM users")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var id int
        var username, email string
        if err := rows.Scan(&id, &username, &email); err != nil {
            log.Fatal(err)
        }
        log.Printf("User: %d, %s, %s\n", id, username, email)
    }
}
```

---

## Elasticsearch

### What is Elasticsearch?

**Distributed search and analytics engine** - built on Lucene, RESTful API, real-time search, log analytics.

### Installation

```bash
# Docker (easiest)
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.10.4

# Verify
curl http://localhost:9200

# Ubuntu
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install elasticsearch

sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch
```

### Basic Concepts

```
Index:      Database (collection of documents)
Document:   JSON record
Type:       (Deprecated in ES 7+)
Mapping:    Schema definition
Shard:      Horizontal partition
Replica:    Copy for fault tolerance
```

### Index Operations

```bash
# Create index
curl -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1
  }
}'

# Get index info
curl -X GET "localhost:9200/products"

# Delete index
curl -X DELETE "localhost:9200/products"

# List all indices
curl -X GET "localhost:9200/_cat/indices?v"
```

### Mappings (Schema)

```bash
# Define mapping
curl -X PUT "localhost:9200/products" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "fields": {
          "keyword": {
            "type": "keyword"
          }
        }
      },
      "description": {
        "type": "text"
      },
      "price": {
        "type": "float"
      },
      "quantity": {
        "type": "integer"
      },
      "category": {
        "type": "keyword"
      },
      "tags": {
        "type": "keyword"
      },
      "created_at": {
        "type": "date"
      },
      "location": {
        "type": "geo_point"
      }
    }
  }
}'
```

### CRUD Operations

```bash
# Index document (with ID)
curl -X PUT "localhost:9200/products/_doc/1" -H 'Content-Type: application/json' -d'
{
  "name": "Laptop",
  "description": "High-performance laptop for developers",
  "price": 1299.99,
  "quantity": 50,
  "category": "electronics",
  "tags": ["laptop", "computers", "tech"],
  "created_at": "2024-01-15T10:00:00Z"
}'

# Index without ID (auto-generated)
curl -X POST "localhost:9200/products/_doc" -H 'Content-Type: application/json' -d'
{
  "name": "Mouse",
  "price": 29.99,
  "category": "accessories"
}'

# Get document
curl -X GET "localhost:9200/products/_doc/1"

# Update document
curl -X POST "localhost:9200/products/_update/1" -H 'Content-Type: application/json' -d'
{
  "doc": {
    "price": 1199.99
  }
}'

# Delete document
curl -X DELETE "localhost:9200/products/_doc/1"
```

### Search Queries

```bash
# Match all
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  }
}'

# Match query
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "description": "laptop developers"
    }
  }
}'

# Multi-match
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "multi_match": {
      "query": "laptop",
      "fields": ["name", "description"]
    }
  }
}'

# Term query (exact match)
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "term": {
      "category": "electronics"
    }
  }
}'

# Range query
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "range": {
      "price": {
        "gte": 100,
        "lte": 1000
      }
    }
  }
}'

# Bool query (complex)
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        { "match": { "description": "laptop" } }
      ],
      "filter": [
        { "term": { "category": "electronics" } },
        { "range": { "price": { "lte": 1500 } } }
      ],
      "should": [
        { "term": { "tags": "gaming" } }
      ],
      "must_not": [
        { "term": { "quantity": 0 } }
      ]
    }
  }
}'
```

### Aggregations

```bash
# Average price
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "avg_price": {
      "avg": {
        "field": "price"
      }
    }
  }
}'

# Group by category
curl -X GET "localhost:9200/products/_search" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": {
        "field": "category"
      },
      "aggs": {
        "avg_price": {
          "avg": {
            "field": "price"
          }
        }
      }
    }
  }
}'
```

### Go + Elasticsearch

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "strings"

    "github.com/elastic/go-elasticsearch/v8"
)

type Product struct {
    Name        string   `json:"name"`
    Description string   `json:"description"`
    Price       float64  `json:"price"`
    Category    string   `json:"category"`
    Tags        []string `json:"tags"`
}

func main() {
    es, err := elasticsearch.NewDefaultClient()
    if err != nil {
        log.Fatal(err)
    }

    // Index document
    product := Product{
        Name:        "Laptop",
        Description: "High-performance laptop",
        Price:       1299.99,
        Category:    "electronics",
        Tags:        []string{"laptop", "tech"},
    }

    data, _ := json.Marshal(product)
    res, err := es.Index(
        "products",
        strings.NewReader(string(data)),
        es.Index.WithContext(context.Background()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer res.Body.Close()

    // Search
    query := map[string]interface{}{
        "query": map[string]interface{}{
            "match": map[string]interface{}{
                "description": "laptop",
            },
        },
    }

    queryData, _ := json.Marshal(query)
    res, err = es.Search(
        es.Search.WithContext(context.Background()),
        es.Search.WithIndex("products"),
        es.Search.WithBody(strings.NewReader(string(queryData))),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer res.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(res.Body).Decode(&result)
    log.Printf("Results: %v", result["hits"])
}
```

---

## MinIO

### What is MinIO?

**S3-compatible object storage** - high-performance, Kubernetes-native, distributed, open-source.

### Installation

```bash
# Docker
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  -v /data:/data \
  minio/minio server /data --console-address ":9001"

# Access: http://localhost:9001 (admin UI)

# Linux binary
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server /data --console-address ":9001"

# macOS
brew install minio/stable/minio
minio server /data
```

### MinIO Client (mc)

```bash
# Install mc
brew install minio/stable/mc  # macOS
# or
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure alias
mc alias set local http://localhost:9000 minioadmin minioadmin

# List buckets
mc ls local

# Create bucket
mc mb local/mybucket

# Upload file
mc cp file.txt local/mybucket/

# Download file
mc cp local/mybucket/file.txt ./

# Remove file
mc rm local/mybucket/file.txt

# Set bucket policy (public)
mc anonymous set download local/mybucket
```

### Bucket Operations

```bash
# Create bucket
mc mb local/images

# List objects
mc ls local/images

# Copy entire directory
mc cp --recursive ./photos/ local/images/

# Sync directory
mc mirror ./photos/ local/images/

# Get bucket info
mc stat local/images

# Remove bucket
mc rb local/images --force
```

### Access Policies

```json
// policy.json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::mybucket/*"
      ]
    }
  ]
}
```

```bash
# Apply policy
mc admin policy add local readonly policy.json
mc admin policy set local readonly user=myuser
```

### Go + MinIO

```go
package main

import (
    "context"
    "log"
    "os"

    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
    endpoint := "localhost:9000"
    accessKeyID := "minioadmin"
    secretAccessKey := "minioadmin"
    useSSL := false

    // Initialize client
    minioClient, err := minio.New(endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(accessKeyID, secretAccessKey, ""),
        Secure: useSSL,
    })
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()
    bucketName := "mybucket"
    location := "us-east-1"

    // Create bucket
    err = minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{Region: location})
    if err != nil {
        exists, errBucketExists := minioClient.BucketExists(ctx, bucketName)
        if errBucketExists == nil && exists {
            log.Printf("Bucket %s already exists\n", bucketName)
        } else {
            log.Fatal(err)
        }
    }

    // Upload file
    objectName := "test.txt"
    filePath := "/tmp/test.txt"
    contentType := "text/plain"

    info, err := minioClient.FPutObject(ctx, bucketName, objectName, filePath, minio.PutObjectOptions{
        ContentType: contentType,
    })
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Uploaded %s of size %d\n", objectName, info.Size)

    // Download file
    err = minioClient.FGetObject(ctx, bucketName, objectName, "/tmp/downloaded.txt", minio.GetObjectOptions{})
    if err != nil {
        log.Fatal(err)
    }

    // List objects
    for object := range minioClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{}) {
        if object.Err != nil {
            log.Fatal(object.Err)
        }
        log.Println(object.Key)
    }

    // Delete object
    err = minioClient.RemoveObject(ctx, bucketName, objectName, minio.RemoveObjectOptions{})
    if err != nil {
        log.Fatal(err)
    }
}
```

### Presigned URLs

```go
// Generate presigned URL (temporary access)
presignedURL, err := minioClient.PresignedGetObject(
    ctx,
    bucketName,
    objectName,
    time.Hour*24, // expires in 24 hours
    url.Values{},
)
if err != nil {
    log.Fatal(err)
}
log.Println("Presigned URL:", presignedURL)
```

---

## Database Selection Guide

### When to Use PostgreSQL

```
✅ Transactional data (banking, e-commerce)
✅ Complex relationships (foreign keys, joins)
✅ ACID compliance required
✅ Structured data with schema
✅ Strong consistency
✅ Full-text search (basic)

Examples: User accounts, orders, inventory
```

### When to Use Elasticsearch

```
✅ Full-text search
✅ Log analytics (ELK stack)
✅ Real-time analytics
✅ Unstructured/semi-structured data
✅ High read throughput
✅ Aggregations and analytics

Examples: Search engine, log analysis, monitoring
```

### When to Use MinIO

```
✅ Object storage (files, images, videos)
✅ Backup and archival
✅ S3-compatible API needed
✅ Large binary data
✅ CDN origin storage
✅ Kubernetes-native storage

Examples: User uploads, media files, backups
```

---

## Best Practices

### PostgreSQL

```sql
-- 1. Use indexes strategically
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- 2. Connection pooling
-- Use pgBouncer or app-level pooling

-- 3. Regular vacuuming
VACUUM ANALYZE;

-- 4. Monitor slow queries
CREATE EXTENSION pg_stat_statements;
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

-- 5. Partitioning for large tables
CREATE TABLE logs_2024_01 PARTITION OF logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Elasticsearch

```
✅ Use bulk API for indexing
✅ Set appropriate shard count (1-5 per index)
✅ Use aliases for zero-downtime reindex
✅ Monitor cluster health
✅ Use index lifecycle management (ILM)
✅ Optimize mappings (disable _source if not needed)
```

### MinIO

```
✅ Use bucket policies for access control
✅ Enable versioning for critical data
✅ Implement lifecycle policies (expire old data)
✅ Use erasure coding for durability
✅ Monitor disk usage
✅ Use presigned URLs for temporary access
```

---

## Interview Questions

**Q1: PostgreSQL vs MySQL - key differences?**

**Answer:** PostgreSQL: More standards-compliant, better for complex queries, supports JSON, full-text search, advanced indexing (GiST, GIN), extensible. MySQL: Simpler, faster for simple queries, better replication options, more popular. Both are reliable, choice depends on use case.

**Q2: How does Elasticsearch achieve fast search?**

**Answer:** Inverted index - maps terms to documents (reverse of document-to-terms). Lucene creates index of all unique terms, stores document IDs containing each term. When searching, directly looks up term in index (O(1)), returns matching documents instantly.

**Q3: What is eventual consistency in object storage?**

**Answer:** Updates propagate to all nodes eventually, not immediately. MinIO prioritizes availability and partition tolerance (AP in CAP theorem). Read might return stale data briefly after write. Acceptable for object storage where consistency isn't critical (vs transactional databases requiring strong consistency).

**Q4: Explain sharding in Elasticsearch.**

**Answer:** Horizontal partitioning - splits index across multiple nodes. Each shard is self-contained Lucene index. Benefits: Horizontal scaling, parallel operations, fault tolerance (with replicas). Default 1 shard per index, configurable at creation time.

**Q5: How do you handle file uploads in production?**

**Answer:**
1. Client uploads to app server
2. App validates file (size, type, virus scan)
3. Generate unique filename (UUID)
4. Upload to object storage (MinIO/S3)
5. Store metadata in database (filename, URL, user_id)
6. Return presigned URL or CDN URL to client
Never store files in database (performance), use object storage.

---

## Hands-On Exercise

### Task: Build Multi-Database Application

```go
// main.go - Integrate all three databases
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "strings"

    "github.com/elastic/go-elasticsearch/v8"
    _ "github.com/lib/pq"
    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"
)

type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
    AvatarURL string `json:"avatar_url"`
}

func main() {
    // PostgreSQL connection
    db, err := sql.Open("postgres", "postgres://user:pass@localhost/myapp?sslmode=disable")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Elasticsearch client
    es, err := elasticsearch.NewDefaultClient()
    if err != nil {
        log.Fatal(err)
    }

    // MinIO client
    minioClient, err := minio.New("localhost:9000", &minio.Options{
        Creds:  credentials.NewStaticV4("minioadmin", "minioadmin", ""),
        Secure: false,
    })
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    // 1. Create user in PostgreSQL
    var userID int
    err = db.QueryRow(`
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3) RETURNING id`,
        "john_doe", "john@example.com", "hash123",
    ).Scan(&userID)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Created user ID: %d\n", userID)

    // 2. Index user in Elasticsearch (for search)
    user := User{
        ID:       userID,
        Username: "john_doe",
        Email:    "john@example.com",
    }
    userData, _ := json.Marshal(user)
    _, err = es.Index(
        "users",
        strings.NewReader(string(userData)),
        es.Index.WithDocumentID(fmt.Sprintf("%d", userID)),
    )
    if err != nil {
        log.Fatal(err)
    }
    log.Println("Indexed user in Elasticsearch")

    // 3. Upload avatar to MinIO
    bucketName := "avatars"
    minioClient.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{})
    
    objectName := fmt.Sprintf("user_%d_avatar.jpg", userID)
    _, err = minioClient.FPutObject(ctx, bucketName, objectName, "/tmp/avatar.jpg", minio.PutObjectOptions{
        ContentType: "image/jpeg",
    })
    if err != nil {
        log.Fatal(err)
    }
    
    avatarURL := fmt.Sprintf("http://localhost:9000/%s/%s", bucketName, objectName)
    
    // 4. Update user with avatar URL in PostgreSQL
    _, err = db.Exec("UPDATE users SET avatar_url = $1 WHERE id = $2", avatarURL, userID)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Updated user avatar: %s\n", avatarURL)
}
```

### Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  elasticsearch:
    image: elasticsearch:8.10.4
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  es_data:
  minio_data:
```

```bash
# Start all databases
docker-compose up -d

# Run application
go run main.go
```

---

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [MinIO Documentation](https://min.io/docs/minio/linux/index.html)
- [Database Performance Best Practices](https://use-the-index-luke.com/)

---

## ✅ Module Checklist

- [ ] Set up PostgreSQL with replication
- [ ] Create indexes and optimize queries
- [ ] Index and search with Elasticsearch
- [ ] Use aggregations for analytics
- [ ] Upload and download files with MinIO
- [ ] Generate presigned URLs
- [ ] Integrate all three databases in Go application
- [ ] Complete multi-database exercise

---

**Next Module:** [Module 16: System Design Patterns](./16_System_Design_Patterns.md) - Design scalable systems! 🏗️
