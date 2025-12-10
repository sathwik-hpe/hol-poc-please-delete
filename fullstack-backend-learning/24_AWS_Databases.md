# Module 24: AWS Databases - RDS, DynamoDB, Aurora 🗄️

## Master AWS Database Services for Scalable Data Storage

**Duration:** 5-6 hours  
**Prerequisites:** Module 04 (Database Integration), SQL basics  
**Outcome:** Deploy and manage AWS databases effectively

---

## 📚 Table of Contents

1. [Database Services Overview](#database-services-overview)
2. [RDS (Relational Database Service)](#rds)
3. [DynamoDB (NoSQL)](#dynamodb)
4. [Aurora (MySQL/PostgreSQL Compatible)](#aurora)
5. [ElastiCache (Redis/Memcached)](#elasticache)
6. [Database Migration](#database-migration)
7. [Best Practices](#best-practices)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## Database Services Overview

### Choosing the Right Database

```
RDS (Relational):
✅ Structured data
✅ ACID transactions
✅ Complex queries (JOINs)
✅ Traditional apps
❌ Horizontal scaling limited

DynamoDB (NoSQL):
✅ Key-value/document
✅ Unlimited scaling
✅ Single-digit millisecond latency
✅ Serverless option
❌ No complex queries

Aurora (High-Performance Relational):
✅ MySQL/PostgreSQL compatible
✅ 5x MySQL, 3x PostgreSQL performance
✅ Auto-scaling storage
✅ Global databases
❌ More expensive than RDS

ElastiCache (In-Memory):
✅ Microsecond latency
✅ Session store, caching
✅ Redis or Memcached
❌ Not persistent (use with backup DB)
```

---

## RDS (Relational Database Service)

### Supported Engines

```
- PostgreSQL
- MySQL
- MariaDB
- Oracle
- SQL Server
- Aurora (AWS proprietary)
```

### Create RDS Instance

```bash
# Create PostgreSQL database
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password MyPassword123! \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-12345678 \
  --db-subnet-group-name my-db-subnet-group \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --multi-az \
  --publicly-accessible false

# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier mydb \
  --query 'DBInstances[0].Endpoint.Address'
```

### Connect from Go

```go
package main

import (
    "database/sql"
    "fmt"
    "log"

    _ "github.com/lib/pq"
)

func main() {
    // RDS endpoint
    host := "mydb.abc123.us-east-1.rds.amazonaws.com"
    port := 5432
    user := "admin"
    password := "MyPassword123!"
    dbname := "postgres"

    connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
        host, port, user, password, dbname)

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Test connection
    err = db.Ping()
    if err != nil {
        log.Fatal(err)
    }

    fmt.Println("Connected to RDS!")

    // Query
    rows, _ := db.Query("SELECT version()")
    defer rows.Close()

    var version string
    rows.Next()
    rows.Scan(&version)
    fmt.Println("PostgreSQL version:", version)
}
```

### RDS Multi-AZ

```
Multi-AZ Deployment:
- Primary instance in AZ-A
- Standby instance in AZ-B
- Synchronous replication
- Automatic failover (30-60 seconds)
- No downtime for maintenance

Use: Production databases requiring high availability
```

### Read Replicas

```
Read Replicas:
- Asynchronous replication
- Scale read traffic
- Up to 5 replicas
- Can promote to standalone DB
- Cross-region replicas

Use: Read-heavy workloads, reporting, analytics
```

```bash
# Create read replica
aws rds create-db-instance-read-replica \
  --db-instance-identifier mydb-replica \
  --source-db-instance-identifier mydb \
  --db-instance-class db.t3.micro

# Promote replica to standalone
aws rds promote-read-replica \
  --db-instance-identifier mydb-replica
```

### Terraform - RDS with Multi-AZ

```hcl
# rds.tf
resource "aws_db_subnet_group" "main" {
  name       = "my-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name = "My DB subnet group"
  }
}

resource "aws_security_group" "db" {
  name        = "rds-sg"
  description = "Security group for RDS"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_db_instance" "postgres" {
  identifier = "mydb"

  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 100  # Auto-scaling
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "myapp"
  username = "admin"
  password = var.db_password  # Use Secrets Manager in production

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  multi_az               = true
  publicly_accessible    = false
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "mydb-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = {
    Name = "Production Database"
  }
}

# Read replica
resource "aws_db_instance" "replica" {
  identifier             = "mydb-replica"
  replicate_source_db    = aws_db_instance.postgres.identifier
  instance_class         = "db.t3.micro"
  publicly_accessible    = false
  skip_final_snapshot    = true

  tags = {
    Name = "Read Replica"
  }
}

output "db_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "replica_endpoint" {
  value = aws_db_instance.replica.endpoint
}
```

---

## DynamoDB (NoSQL)

### DynamoDB Basics

```
Table Structure:
- Partition Key (required)
- Sort Key (optional)
- Attributes (schema-less)

Example Table: Users
Partition Key: user_id
Sort Key:      timestamp
Attributes:    name, email, status (any JSON)
```

### Create Table

```bash
# Create table
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions \
    AttributeName=user_id,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=user_id,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

# List tables
aws dynamodb list-tables

# Describe table
aws dynamodb describe-table --table-name Users
```

### Go SDK - DynamoDB Operations

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb"
    "github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
    "github.com/aws/aws-sdk-go/aws"
)

type User struct {
    UserID    string `dynamodbav:"user_id"`
    Name      string `dynamodbav:"name"`
    Email     string `dynamodbav:"email"`
    Timestamp int64  `dynamodbav:"timestamp"`
}

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := dynamodb.NewFromConfig(cfg)

    // Put item
    putItem(client, User{
        UserID:    "user-123",
        Name:      "John Doe",
        Email:     "john@example.com",
        Timestamp: 1699564800,
    })

    // Get item
    user := getItem(client, "user-123", 1699564800)
    fmt.Printf("Retrieved: %+v\n", user)

    // Query items
    users := queryByUserID(client, "user-123")
    fmt.Printf("Found %d items\n", len(users))

    // Scan table
    allUsers := scanTable(client)
    fmt.Printf("Total users: %d\n", len(allUsers))

    // Update item
    updateItem(client, "user-123", 1699564800, "jane@example.com")

    // Delete item
    deleteItem(client, "user-123", 1699564800)
}

func putItem(client *dynamodb.Client, user User) {
    item, _ := attributevalue.MarshalMap(user)

    _, err := client.PutItem(context.TODO(), &dynamodb.PutItemInput{
        TableName: aws.String("Users"),
        Item:      item,
    })

    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Item added")
}

func getItem(client *dynamodb.Client, userID string, timestamp int64) User {
    result, _ := client.GetItem(context.TODO(), &dynamodb.GetItemInput{
        TableName: aws.String("Users"),
        Key: map[string]types.AttributeValue{
            "user_id":   &types.AttributeValueMemberS{Value: userID},
            "timestamp": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", timestamp)},
        },
    })

    var user User
    attributevalue.UnmarshalMap(result.Item, &user)
    return user
}

func queryByUserID(client *dynamodb.Client, userID string) []User {
    result, _ := client.Query(context.TODO(), &dynamodb.QueryInput{
        TableName:              aws.String("Users"),
        KeyConditionExpression: aws.String("user_id = :uid"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":uid": &types.AttributeValueMemberS{Value: userID},
        },
    })

    var users []User
    attributevalue.UnmarshalListOfMaps(result.Items, &users)
    return users
}

func scanTable(client *dynamodb.Client) []User {
    result, _ := client.Scan(context.TODO(), &dynamodb.ScanInput{
        TableName: aws.String("Users"),
    })

    var users []User
    attributevalue.UnmarshalListOfMaps(result.Items, &users)
    return users
}

func updateItem(client *dynamodb.Client, userID string, timestamp int64, newEmail string) {
    _, err := client.UpdateItem(context.TODO(), &dynamodb.UpdateItemInput{
        TableName: aws.String("Users"),
        Key: map[string]types.AttributeValue{
            "user_id":   &types.AttributeValueMemberS{Value: userID},
            "timestamp": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", timestamp)},
        },
        UpdateExpression: aws.String("SET email = :email"),
        ExpressionAttributeValues: map[string]types.AttributeValue{
            ":email": &types.AttributeValueMemberS{Value: newEmail},
        },
    })

    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Item updated")
}

func deleteItem(client *dynamodb.Client, userID string, timestamp int64) {
    _, err := client.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
        TableName: aws.String("Users"),
        Key: map[string]types.AttributeValue{
            "user_id":   &types.AttributeValueMemberS{Value: userID},
            "timestamp": &types.AttributeValueMemberN{Value: fmt.Sprintf("%d", timestamp)},
        },
    })

    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("Item deleted")
}
```

### Global Secondary Index (GSI)

```
GSI: Query by non-key attributes

Example:
Primary Index: user_id (partition), timestamp (sort)
GSI: email (partition)

Now you can query by email!
```

```bash
# Add GSI
aws dynamodb update-table \
  --table-name Users \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --global-secondary-index-updates '[
    {
      "Create": {
        "IndexName": "EmailIndex",
        "KeySchema": [{"AttributeName": "email", "KeyType": "HASH"}],
        "Projection": {"ProjectionType": "ALL"},
        "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
      }
    }
  ]'
```

### DynamoDB Streams

```
Streams: Capture changes (insert, update, delete)

Use cases:
- Trigger Lambda on changes
- Replicate to another table
- Analytics pipeline
```

```go
// Enable streams in Terraform
resource "aws_dynamodb_table" "users" {
  name           = "Users"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "timestamp"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  tags = {
    Name = "Users table"
  }
}
```

---

## Aurora (MySQL/PostgreSQL Compatible)

### Aurora Features

```
Performance:
- 5x faster than MySQL
- 3x faster than PostgreSQL
- Up to 128 TB storage (auto-scaling)
- Up to 15 read replicas

Availability:
- 6 copies across 3 AZs
- Self-healing storage
- Automatic failover (<30 seconds)

Serverless:
- Auto-scaling compute
- Pay per second
- Good for intermittent workloads
```

### Create Aurora Cluster

```bash
# Create Aurora cluster
aws rds create-db-cluster \
  --db-cluster-identifier my-aurora-cluster \
  --engine aurora-postgresql \
  --engine-version 15.3 \
  --master-username admin \
  --master-user-password MyPassword123! \
  --db-subnet-group-name my-db-subnet-group \
  --vpc-security-group-ids sg-12345678

# Create instances
aws rds create-db-instance \
  --db-instance-identifier my-aurora-instance-1 \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql \
  --db-cluster-identifier my-aurora-cluster
```

### Aurora Serverless

```hcl
resource "aws_rds_cluster" "aurora_serverless" {
  cluster_identifier      = "aurora-cluster"
  engine                  = "aurora-postgresql"
  engine_mode             = "serverless"
  database_name           = "mydb"
  master_username         = "admin"
  master_password         = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]

  scaling_configuration {
    auto_pause               = true
    min_capacity             = 2
    max_capacity             = 16
    seconds_until_auto_pause = 300
  }

  skip_final_snapshot = true
}
```

---

## ElastiCache (Redis/Memcached)

### Redis vs Memcached

```
Redis:
✅ Persistence
✅ Data structures (lists, sets, sorted sets)
✅ Pub/Sub
✅ Replication
✅ Transactions
Use: Session store, leaderboards, real-time analytics

Memcached:
✅ Simple key-value
✅ Multi-threaded
✅ Slightly faster for simple ops
❌ No persistence
Use: Simple caching
```

### Create Redis Cluster

```bash
# Create subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name my-cache-subnet \
  --cache-subnet-group-description "Subnet group for cache" \
  --subnet-ids subnet-12345 subnet-67890

# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id my-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --cache-subnet-group-name my-cache-subnet \
  --security-group-ids sg-12345678
```

### Go - Connect to Redis

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/go-redis/redis/v8"
)

func main() {
    // ElastiCache Redis endpoint
    rdb := redis.NewClient(&redis.Options{
        Addr:     "my-redis.abc123.0001.use1.cache.amazonaws.com:6379",
        Password: "", // No password for ElastiCache by default
        DB:       0,
    })

    ctx := context.Background()

    // Set value with expiration
    err := rdb.Set(ctx, "session:user123", "session-data", 1*time.Hour).Err()
    if err != nil {
        panic(err)
    }

    // Get value
    val, err := rdb.Get(ctx, "session:user123").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("Value:", val)

    // Increment counter
    rdb.Incr(ctx, "page_views")

    // List operations
    rdb.LPush(ctx, "queue", "task1", "task2", "task3")
    task, _ := rdb.RPop(ctx, "queue").Result()
    fmt.Println("Popped task:", task)

    // Hash operations
    rdb.HSet(ctx, "user:123", "name", "John", "email", "john@example.com")
    name, _ := rdb.HGet(ctx, "user:123", "name").Result()
    fmt.Println("User name:", name)

    // Set operations
    rdb.SAdd(ctx, "online_users", "user1", "user2", "user3")
    count, _ := rdb.SCard(ctx, "online_users").Result()
    fmt.Println("Online users:", count)
}
```

### Terraform - ElastiCache Redis

```hcl
resource "aws_elasticache_subnet_group" "redis" {
  name       = "redis-subnet-group"
  subnet_ids = var.private_subnet_ids
}

resource "aws_security_group" "redis" {
  name   = "redis-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "my-redis-cluster"
  replication_group_description = "Redis cluster for caching"

  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 2

  automatic_failover_enabled = true
  multi_az_enabled          = true

  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  snapshot_retention_limit = 5
  snapshot_window          = "03:00-05:00"

  tags = {
    Name = "Production Redis"
  }
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.redis.configuration_endpoint_address
}
```

---

## Best Practices

### RDS Best Practices

```
1. High Availability
   ✅ Use Multi-AZ for production
   ✅ Enable automated backups
   ✅ Test failover procedures

2. Performance
   ✅ Use read replicas for read-heavy workloads
   ✅ Enable Performance Insights
   ✅ Right-size instance type

3. Security
   ✅ Encrypt at rest and in transit
   ✅ Use IAM database authentication
   ✅ Store credentials in Secrets Manager
   ✅ Private subnets only

4. Maintenance
   ✅ Enable auto minor version upgrades
   ✅ Schedule maintenance windows
   ✅ Monitor with CloudWatch
```

### DynamoDB Best Practices

```
1. Schema Design
   ✅ Design for access patterns
   ✅ Use composite keys
   ✅ Avoid hot partitions

2. Performance
   ✅ Use on-demand billing for unpredictable workloads
   ✅ Enable auto-scaling for provisioned mode
   ✅ Use DAX for microsecond latency

3. Cost Optimization
   ✅ Use sparse indexes
   ✅ Set TTL for automatic deletions
   ✅ Archive old data to S3

4. Availability
   ✅ Use global tables for multi-region
   ✅ Enable point-in-time recovery
   ✅ Enable streams for change capture
```

---

## Interview Questions

**Q1: RDS Multi-AZ vs Read Replicas?**

**Answer:**
- **Multi-AZ**: High availability, synchronous replication, automatic failover, same region, cannot read from standby
- **Read Replicas**: Scale reads, asynchronous replication, can be cross-region, can read from replica, manual promotion

**Q2: When to use DynamoDB vs RDS?**

**Answer:**
- **DynamoDB**: Key-value access, unlimited scale, simple queries, serverless, variable traffic
- **RDS**: Complex queries (JOINs), ACID transactions, existing SQL apps, structured data with relationships

**Q3: Explain DynamoDB partition key design.**

**Answer:** Partition key determines data distribution. Bad: Sequential IDs (hot partition). Good: Random/hashed values (even distribution). Use composite key (partition + sort) for related items. Example: `user_id` (partition) + `timestamp` (sort) for user events.

**Q4: What is Aurora Global Database?**

**Answer:** Multi-region Aurora deployment. One primary region (writes), up to 5 secondary regions (reads). Sub-second replication lag. Disaster recovery: promote secondary in <1 minute. Use: Global applications, disaster recovery.

**Q5: How does ElastiCache improve performance?**

**Answer:** In-memory cache (microsecond latency) sits in front of database. Cache frequently accessed data. Reduces database load. Patterns: cache-aside (lazy load), write-through (update cache on write). Use: Session store, API responses, database query results.

---

## Hands-On Exercise

### Task: Multi-Tier Application with RDS + ElastiCache

```go
// Complete application with caching layer
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/go-redis/redis/v8"
    _ "github.com/lib/pq"
)

var (
    db    *sql.DB
    cache *redis.Client
    ctx   = context.Background()
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func init() {
    // Connect to RDS
    var err error
    db, err = sql.Open("postgres", "postgres://admin:password@mydb.rds.amazonaws.com:5432/myapp?sslmode=require")
    if err != nil {
        log.Fatal(err)
    }

    // Connect to ElastiCache
    cache = redis.NewClient(&redis.Options{
        Addr: "my-redis.cache.amazonaws.com:6379",
    })
}

func getUser(c *gin.Context) {
    userID := c.Param("id")
    cacheKey := fmt.Sprintf("user:%s", userID)

    // Try cache first
    cached, err := cache.Get(ctx, cacheKey).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        c.JSON(http.StatusOK, gin.H{
            "user":   user,
            "source": "cache",
        })
        return
    }

    // Cache miss - query database
    var user User
    err = db.QueryRow("SELECT id, name, email FROM users WHERE id = $1", userID).
        Scan(&user.ID, &user.Name, &user.Email)

    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    // Store in cache (15 minutes)
    userData, _ := json.Marshal(user)
    cache.Set(ctx, cacheKey, userData, 15*time.Minute)

    c.JSON(http.StatusOK, gin.H{
        "user":   user,
        "source": "database",
    })
}

func createUser(c *gin.Context) {
    var user User
    if err := c.ShouldBindJSON(&user); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Insert into database
    err := db.QueryRow("INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
        user.Name, user.Email).Scan(&user.ID)

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    // Invalidate cache
    cache.Del(ctx, fmt.Sprintf("user:%d", user.ID))

    c.JSON(http.StatusCreated, user)
}

func main() {
    r := gin.Default()

    r.GET("/users/:id", getUser)
    r.POST("/users", createUser)

    r.Run(":8080")
}
```

---

## 📚 Additional Resources

- [RDS User Guide](https://docs.aws.amazon.com/rds/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [Aurora User Guide](https://docs.aws.amazon.com/aurora/)
- [ElastiCache User Guide](https://docs.aws.amazon.com/elasticache/)

---

## ✅ Module Checklist

- [ ] Create RDS PostgreSQL instance with Multi-AZ
- [ ] Set up read replicas
- [ ] Create DynamoDB table with GSI
- [ ] Implement CRUD operations with DynamoDB
- [ ] Deploy Aurora Serverless cluster
- [ ] Set up ElastiCache Redis cluster
- [ ] Build caching layer with Redis
- [ ] Complete multi-tier app with RDS + ElastiCache

---

**Next Module:** [Module 25: AWS DevOps & CI/CD](./25_AWS_DevOps_CICD.md) - CodePipeline, CloudWatch, X-Ray! 🚀
