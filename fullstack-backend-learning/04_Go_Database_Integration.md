# Module 04: Database Integration with Go 🗄️

## Connect Go Applications to Databases

**Duration:** 4-5 hours  
**Prerequisites:** Module 01-03 (Fundamentals, Concurrency, REST APIs)  
**Outcome:** Build database-backed applications with proper connection management

---

## 📚 Table of Contents

1. [Database Basics](#database-basics)
2. [database/sql Package](#databasesql-package)
3. [PostgreSQL Integration](#postgresql-integration)
4. [GORM (ORM Framework)](#gorm-orm-framework)
5. [Connection Pooling](#connection-pooling)
6. [Transactions](#transactions)
7. [Migrations](#migrations)
8. [Redis Integration](#redis-integration)
9. [MongoDB Integration](#mongodb-integration)
10. [Best Practices](#best-practices)
11. [Interview Questions](#interview-questions)
12. [Hands-On Exercise](#hands-on-exercise)

---

## Database Basics

### SQL vs NoSQL

| Feature | SQL | NoSQL |
|---------|-----|-------|
| Schema | Fixed | Flexible |
| Scaling | Vertical | Horizontal |
| Examples | PostgreSQL, MySQL | MongoDB, Redis |
| Best For | Structured data, ACID | Unstructured, high throughput |

### Popular Go Database Drivers

```bash
# PostgreSQL
go get github.com/lib/pq

# MySQL
go get github.com/go-sql-driver/mysql

# SQLite
go get github.com/mattn/go-sqlite3

# MongoDB
go get go.mongodb.org/mongo-driver/mongo

# Redis
go get github.com/go-redis/redis/v8
```

---

## database/sql Package

Go's standard library provides a generic interface for SQL databases:

### Basic Connection

```go
package main

import (
    "database/sql"
    "fmt"
    "log"
    
    _ "github.com/lib/pq"  // PostgreSQL driver
)

func main() {
    // Connection string
    connStr := "host=localhost port=5432 user=postgres password=secret dbname=mydb sslmode=disable"
    
    // Open connection
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    
    // Test connection
    if err := db.Ping(); err != nil {
        log.Fatal(err)
    }
    
    fmt.Println("Successfully connected to database!")
}
```

### Query Single Row

```go
type User struct {
    ID    int
    Name  string
    Email string
    Age   int
}

func getUserByID(db *sql.DB, id int) (*User, error) {
    user := &User{}
    
    query := `SELECT id, name, email, age FROM users WHERE id = $1`
    
    err := db.QueryRow(query, id).Scan(&user.ID, &user.Name, &user.Email, &user.Age)
    if err != nil {
        if err == sql.ErrNoRows {
            return nil, fmt.Errorf("user not found")
        }
        return nil, err
    }
    
    return user, nil
}

// Usage
user, err := getUserByID(db, 1)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("User: %+v\n", user)
```

### Query Multiple Rows

```go
func getAllUsers(db *sql.DB) ([]User, error) {
    query := `SELECT id, name, email, age FROM users ORDER BY id`
    
    rows, err := db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()  // Important!
    
    var users []User
    for rows.Next() {
        var user User
        if err := rows.Scan(&user.ID, &user.Name, &user.Email, &user.Age); err != nil {
            return nil, err
        }
        users = append(users, user)
    }
    
    // Check for errors during iteration
    if err := rows.Err(); err != nil {
        return nil, err
    }
    
    return users, nil
}
```

### Insert Data

```go
func createUser(db *sql.DB, name, email string, age int) (int, error) {
    query := `
        INSERT INTO users (name, email, age) 
        VALUES ($1, $2, $3) 
        RETURNING id
    `
    
    var id int
    err := db.QueryRow(query, name, email, age).Scan(&id)
    if err != nil {
        return 0, err
    }
    
    return id, nil
}

// Usage
userID, err := createUser(db, "Alice", "alice@example.com", 30)
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Created user with ID: %d\n", userID)
```

### Update Data

```go
func updateUser(db *sql.DB, id int, name, email string, age int) error {
    query := `
        UPDATE users 
        SET name = $1, email = $2, age = $3 
        WHERE id = $4
    `
    
    result, err := db.Exec(query, name, email, age, id)
    if err != nil {
        return err
    }
    
    // Check how many rows were affected
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }
    
    if rowsAffected == 0 {
        return fmt.Errorf("user not found")
    }
    
    return nil
}
```

### Delete Data

```go
func deleteUser(db *sql.DB, id int) error {
    query := `DELETE FROM users WHERE id = $1`
    
    result, err := db.Exec(query, id)
    if err != nil {
        return err
    }
    
    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return err
    }
    
    if rowsAffected == 0 {
        return fmt.Errorf("user not found")
    }
    
    return nil
}
```

---

## PostgreSQL Integration

### Complete CRUD Example

```go
package main

import (
    "database/sql"
    "fmt"
    "log"
    "time"
    
    _ "github.com/lib/pq"
)

type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    Age       int       `json:"age"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

type UserStore struct {
    db *sql.DB
}

func NewUserStore(db *sql.DB) *UserStore {
    return &UserStore{db: db}
}

// Create
func (s *UserStore) Create(user *User) error {
    query := `
        INSERT INTO users (name, email, age, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
    `
    
    now := time.Now()
    err := s.db.QueryRow(
        query,
        user.Name,
        user.Email,
        user.Age,
        now,
        now,
    ).Scan(&user.ID)
    
    if err != nil {
        return fmt.Errorf("failed to create user: %w", err)
    }
    
    user.CreatedAt = now
    user.UpdatedAt = now
    return nil
}

// Read
func (s *UserStore) GetByID(id int) (*User, error) {
    user := &User{}
    query := `
        SELECT id, name, email, age, created_at, updated_at
        FROM users
        WHERE id = $1
    `
    
    err := s.db.QueryRow(query, id).Scan(
        &user.ID,
        &user.Name,
        &user.Email,
        &user.Age,
        &user.CreatedAt,
        &user.UpdatedAt,
    )
    
    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("user not found")
    }
    if err != nil {
        return nil, fmt.Errorf("failed to get user: %w", err)
    }
    
    return user, nil
}

// List with pagination
func (s *UserStore) List(limit, offset int) ([]User, error) {
    query := `
        SELECT id, name, email, age, created_at, updated_at
        FROM users
        ORDER BY id
        LIMIT $1 OFFSET $2
    `
    
    rows, err := s.db.Query(query, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to list users: %w", err)
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        var user User
        if err := rows.Scan(
            &user.ID,
            &user.Name,
            &user.Email,
            &user.Age,
            &user.CreatedAt,
            &user.UpdatedAt,
        ); err != nil {
            return nil, fmt.Errorf("failed to scan user: %w", err)
        }
        users = append(users, user)
    }
    
    return users, rows.Err()
}

// Update
func (s *UserStore) Update(user *User) error {
    query := `
        UPDATE users
        SET name = $1, email = $2, age = $3, updated_at = $4
        WHERE id = $5
    `
    
    user.UpdatedAt = time.Now()
    result, err := s.db.Exec(
        query,
        user.Name,
        user.Email,
        user.Age,
        user.UpdatedAt,
        user.ID,
    )
    
    if err != nil {
        return fmt.Errorf("failed to update user: %w", err)
    }
    
    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }
    if rows == 0 {
        return fmt.Errorf("user not found")
    }
    
    return nil
}

// Delete
func (s *UserStore) Delete(id int) error {
    query := `DELETE FROM users WHERE id = $1`
    
    result, err := s.db.Exec(query, id)
    if err != nil {
        return fmt.Errorf("failed to delete user: %w", err)
    }
    
    rows, err := result.RowsAffected()
    if err != nil {
        return err
    }
    if rows == 0 {
        return fmt.Errorf("user not found")
    }
    
    return nil
}

func main() {
    // Connect to database
    connStr := "host=localhost port=5432 user=postgres password=secret dbname=mydb sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
    
    // Create store
    store := NewUserStore(db)
    
    // Create user
    user := &User{
        Name:  "Alice",
        Email: "alice@example.com",
        Age:   30,
    }
    
    if err := store.Create(user); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Created user: %+v\n", user)
    
    // Get user
    retrieved, err := store.GetByID(user.ID)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Retrieved user: %+v\n", retrieved)
    
    // Update user
    user.Age = 31
    if err := store.Update(user); err != nil {
        log.Fatal(err)
    }
    fmt.Println("Updated user")
    
    // List users
    users, err := store.List(10, 0)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found %d users\n", len(users))
}
```

---

## GORM (ORM Framework)

GORM is the most popular Go ORM, providing a higher-level abstraction:

### Installation

```bash
go get -u gorm.io/gorm
go get -u gorm.io/driver/postgres
```

### Basic Usage

```go
package main

import (
    "fmt"
    "log"
    "time"
    
    "gorm.io/driver/postgres"
    "gorm.io/gorm"
)

type User struct {
    ID        uint           `gorm:"primaryKey"`
    Name      string         `gorm:"size:100;not null"`
    Email     string         `gorm:"size:100;uniqueIndex;not null"`
    Age       int            `gorm:"not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
    DeletedAt gorm.DeletedAt `gorm:"index"`  // Soft delete
}

func main() {
    // Connect
    dsn := "host=localhost user=postgres password=secret dbname=mydb port=5432 sslmode=disable"
    db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
    if err != nil {
        log.Fatal(err)
    }
    
    // Auto-migrate schema
    db.AutoMigrate(&User{})
    
    // Create
    user := User{Name: "Alice", Email: "alice@example.com", Age: 30}
    result := db.Create(&user)
    if result.Error != nil {
        log.Fatal(result.Error)
    }
    fmt.Printf("Created user with ID: %d\n", user.ID)
    
    // Read
    var foundUser User
    db.First(&foundUser, user.ID)  // Find by primary key
    fmt.Printf("Found user: %+v\n", foundUser)
    
    // Update
    db.Model(&foundUser).Update("Age", 31)
    // Or update multiple fields
    db.Model(&foundUser).Updates(User{Name: "Alice Smith", Age: 32})
    
    // Delete (soft delete if DeletedAt field exists)
    db.Delete(&foundUser)
    
    // Permanently delete
    db.Unscoped().Delete(&foundUser)
}
```

### Advanced GORM Queries

```go
// Find with conditions
var users []User
db.Where("age > ?", 25).Find(&users)
db.Where("name LIKE ?", "A%").Find(&users)

// First, Last, Take
var user User
db.First(&user)  // ORDER BY id ASC LIMIT 1
db.Last(&user)   // ORDER BY id DESC LIMIT 1
db.Take(&user)   // No ordering

// Select specific fields
db.Select("name", "age").Find(&users)

// Order and limit
db.Order("age desc").Limit(10).Find(&users)

// Count
var count int64
db.Model(&User{}).Where("age > ?", 25).Count(&count)

// Group and Having
type Result struct {
    Age   int
    Count int
}
var results []Result
db.Model(&User{}).Select("age, count(*)").Group("age").Having("count(*) > ?", 1).Scan(&results)

// Pagination
var users []User
page := 1
pageSize := 10
offset := (page - 1) * pageSize
db.Offset(offset).Limit(pageSize).Find(&users)

// Raw SQL
var users []User
db.Raw("SELECT * FROM users WHERE age > ?", 25).Scan(&users)

// Exec raw SQL
db.Exec("UPDATE users SET age = age + 1 WHERE id = ?", 1)
```

### Associations

```go
// One-to-Many
type User struct {
    gorm.Model
    Name  string
    Posts []Post
}

type Post struct {
    gorm.Model
    Title  string
    UserID uint
    User   User
}

// Create with association
user := User{
    Name: "Alice",
    Posts: []Post{
        {Title: "First Post"},
        {Title: "Second Post"},
    },
}
db.Create(&user)

// Preload associations
var users []User
db.Preload("Posts").Find(&users)

// Many-to-Many
type User struct {
    gorm.Model
    Name  string
    Roles []Role `gorm:"many2many:user_roles;"`
}

type Role struct {
    gorm.Model
    Name  string
    Users []User `gorm:"many2many:user_roles;"`
}
```

---

## Connection Pooling

### Configure Connection Pool

```go
import "time"

func setupDB() (*sql.DB, error) {
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        return nil, err
    }
    
    // Set maximum number of open connections
    db.SetMaxOpenConns(25)
    
    // Set maximum number of idle connections
    db.SetMaxIdleConns(25)
    
    // Set maximum lifetime of a connection
    db.SetConnMaxLifetime(5 * time.Minute)
    
    // Set maximum idle time
    db.SetConnMaxIdleTime(5 * time.Minute)
    
    // Test connection
    if err := db.Ping(); err != nil {
        return nil, err
    }
    
    return db, nil
}
```

### Connection Pool Stats

```go
stats := db.Stats()
fmt.Printf("Open connections: %d\n", stats.OpenConnections)
fmt.Printf("In use: %d\n", stats.InUse)
fmt.Printf("Idle: %d\n", stats.Idle)
fmt.Printf("Wait count: %d\n", stats.WaitCount)
fmt.Printf("Wait duration: %v\n", stats.WaitDuration)
```

---

## Transactions

### Basic Transaction

```go
func transferMoney(db *sql.DB, fromID, toID int, amount float64) error {
    // Begin transaction
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    
    // Defer rollback (no-op if commit succeeds)
    defer tx.Rollback()
    
    // Deduct from sender
    _, err = tx.Exec("UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, fromID)
    if err != nil {
        return err
    }
    
    // Add to receiver
    _, err = tx.Exec("UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, toID)
    if err != nil {
        return err
    }
    
    // Commit transaction
    if err = tx.Commit(); err != nil {
        return err
    }
    
    return nil
}
```

### Transaction with Context

```go
func transferMoneyWithContext(ctx context.Context, db *sql.DB, fromID, toID int, amount float64) error {
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // Check context cancellation
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
    }
    
    // Perform operations...
    
    return tx.Commit()
}
```

### GORM Transactions

```go
// Automatic transaction
err := db.Transaction(func(tx *gorm.DB) error {
    // Create user
    if err := tx.Create(&user).Error; err != nil {
        return err  // Rollback
    }
    
    // Create profile
    if err := tx.Create(&profile).Error; err != nil {
        return err  // Rollback
    }
    
    return nil  // Commit
})

// Manual transaction
tx := db.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback()
    }
}()

if err := tx.Create(&user).Error; err != nil {
    tx.Rollback()
    return err
}

if err := tx.Create(&profile).Error; err != nil {
    tx.Rollback()
    return err
}

tx.Commit()
```

---

## Migrations

### Using golang-migrate

```bash
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

```bash
# Create migration
migrate create -ext sql -dir db/migrations -seq create_users_table

# This creates:
# db/migrations/000001_create_users_table.up.sql
# db/migrations/000001_create_users_table.down.sql
```

**Up migration (000001_create_users_table.up.sql):**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    age INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**Down migration (000001_create_users_table.down.sql):**
```sql
DROP TABLE IF EXISTS users;
```

```bash
# Run migrations
migrate -path db/migrations -database "postgres://user:pass@localhost:5432/mydb?sslmode=disable" up

# Rollback
migrate -path db/migrations -database "postgres://..." down

# Migrate to specific version
migrate -path db/migrations -database "postgres://..." goto 2
```

### GORM Auto-Migration

```go
// Auto-migrate (development only!)
db.AutoMigrate(&User{}, &Post{}, &Comment{})

// Check if table exists
if !db.Migrator().HasTable(&User{}) {
    db.Migrator().CreateTable(&User{})
}

// Add column
db.Migrator().AddColumn(&User{}, "active")

// Drop column
db.Migrator().DropColumn(&User{}, "age")
```

---

## Redis Integration

```go
package main

import (
    "context"
    "fmt"
    "time"
    
    "github.com/go-redis/redis/v8"
)

var ctx = context.Background()

func main() {
    // Connect to Redis
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })
    
    // Ping
    pong, err := rdb.Ping(ctx).Result()
    fmt.Println(pong, err)
    
    // Set key
    err = rdb.Set(ctx, "key", "value", 0).Err()
    if err != nil {
        panic(err)
    }
    
    // Get key
    val, err := rdb.Get(ctx, "key").Result()
    if err != nil {
        panic(err)
    }
    fmt.Println("key:", val)
    
    // Set with expiration
    err = rdb.Set(ctx, "session:123", "user_data", 10*time.Minute).Err()
    
    // Check if key exists
    exists, err := rdb.Exists(ctx, "key").Result()
    fmt.Println("exists:", exists)
    
    // Delete key
    err = rdb.Del(ctx, "key").Err()
    
    // Hash operations
    err = rdb.HSet(ctx, "user:1", "name", "Alice", "age", 30).Err()
    name, err := rdb.HGet(ctx, "user:1", "name").Result()
    all, err := rdb.HGetAll(ctx, "user:1").Result()
    
    // List operations
    err = rdb.LPush(ctx, "queue", "task1", "task2").Err()
    task, err := rdb.RPop(ctx, "queue").Result()
    
    // Set operations
    err = rdb.SAdd(ctx, "tags", "go", "redis", "database").Err()
    members, err := rdb.SMembers(ctx, "tags").Result()
    
    // Sorted set
    err = rdb.ZAdd(ctx, "leaderboard", &redis.Z{Score: 100, Member: "player1"}).Err()
    top, err := rdb.ZRevRange(ctx, "leaderboard", 0, 9).Result()
}
```

---

## MongoDB Integration

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"
    
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/bson/primitive"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

type User struct {
    ID        primitive.ObjectID `bson:"_id,omitempty"`
    Name      string             `bson:"name"`
    Email     string             `bson:"email"`
    Age       int                `bson:"age"`
    CreatedAt time.Time          `bson:"created_at"`
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    
    // Connect
    client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect(ctx)
    
    // Get collection
    collection := client.Database("mydb").Collection("users")
    
    // Insert one
    user := User{
        Name:      "Alice",
        Email:     "alice@example.com",
        Age:       30,
        CreatedAt: time.Now(),
    }
    result, err := collection.InsertOne(ctx, user)
    fmt.Printf("Inserted ID: %v\n", result.InsertedID)
    
    // Find one
    var foundUser User
    err = collection.FindOne(ctx, bson.M{"email": "alice@example.com"}).Decode(&foundUser)
    fmt.Printf("Found: %+v\n", foundUser)
    
    // Find many
    cursor, err := collection.Find(ctx, bson.M{"age": bson.M{"$gt": 25}})
    defer cursor.Close(ctx)
    
    var users []User
    if err = cursor.All(ctx, &users); err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Found %d users\n", len(users))
    
    // Update
    update := bson.M{"$set": bson.M{"age": 31}}
    _, err = collection.UpdateOne(ctx, bson.M{"email": "alice@example.com"}, update)
    
    // Delete
    _, err = collection.DeleteOne(ctx, bson.M{"email": "alice@example.com"})
}
```

---

## Best Practices

### 1. Always Use Context

```go
// ✅ With timeout
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

rows, err := db.QueryContext(ctx, query)
```

### 2. Close Resources

```go
// ✅ Always defer Close()
rows, err := db.Query(query)
if err != nil {
    return err
}
defer rows.Close()  // Important!

for rows.Next() {
    // Process rows
}
```

### 3. Handle sql.ErrNoRows

```go
// ✅ Check for no rows
err := db.QueryRow(query, id).Scan(&user)
if err == sql.ErrNoRows {
    return nil, fmt.Errorf("user not found")
}
if err != nil {
    return nil, err
}
```

### 4. Use Prepared Statements

```go
// ✅ For repeated queries
stmt, err := db.Prepare("SELECT * FROM users WHERE id = $1")
defer stmt.Close()

for _, id := range userIDs {
    var user User
    err = stmt.QueryRow(id).Scan(&user.ID, &user.Name)
}
```

### 5. Separate Data Layer

```go
// ✅ Repository pattern
type UserRepository interface {
    Create(user *User) error
    GetByID(id int) (*User, error)
    Update(user *User) error
    Delete(id int) error
}

type PostgresUserRepository struct {
    db *sql.DB
}

func (r *PostgresUserRepository) Create(user *User) error {
    // Implementation
}
```

---

## Interview Questions

**Q1: What's the difference between Query and Exec?**

**Answer:**
- `Query/QueryRow`: For SELECT statements, returns rows
- `Exec`: For INSERT/UPDATE/DELETE, returns affected rows count

**Q2: Why use connection pooling?**

**Answer:** Reusing connections improves performance by avoiding the overhead of creating new connections for each request. Also limits max connections to prevent overwhelming the database.

**Q3: What's the difference between sql.DB and sql.Tx?**

**Answer:**
- `sql.DB`: Connection pool, thread-safe, use for regular queries
- `sql.Tx`: Transaction, not thread-safe, use for atomic operations

**Q4: GORM vs database/sql?**

**Answer:**
- **GORM**: Higher-level, faster development, auto-migrations, associations
- **database/sql**: Lower-level, more control, better performance, no magic

**Q5: How to handle NULL values?**

**Answer:** Use sql.Null types:
```go
var name sql.NullString
err := db.QueryRow("SELECT name FROM users WHERE id = $1", id).Scan(&name)
if name.Valid {
    fmt.Println(name.String)
}
```

---

## Hands-On Exercise

### Task: Build a Blog API with PostgreSQL

**Requirements:**
1. Users table with authentication
2. Posts table (belongs to user)
3. Comments table (belongs to post and user)
4. CRUD operations for all tables
5. Transaction for creating post with tags
6. Pagination and filtering

**Schema:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Implement:**
- User registration and login
- Create/Read/Update/Delete posts
- Add comments to posts
- List posts with author information
- Search posts by title

---

## 📚 Additional Resources

- [Go database/sql Tutorial](https://go.dev/doc/database/sql-tutorial)
- [GORM Documentation](https://gorm.io/)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- [sqlx Package](https://github.com/jmoiron/sqlx)

---

## ✅ Module Checklist

- [ ] Connect to PostgreSQL with database/sql
- [ ] Perform CRUD operations
- [ ] Use GORM for ORM operations
- [ ] Configure connection pooling
- [ ] Implement transactions
- [ ] Run database migrations
- [ ] Integrate Redis for caching
- [ ] Work with MongoDB
- [ ] Complete the hands-on exercise

---

**Next Module:** [05_Go_Testing_Best_Practices.md](./05_Go_Testing_Best_Practices.md) - Write bulletproof tests! ✅
