# Module 05: Go Testing & Best Practices ✅

## Write Bulletproof, Production-Ready Tests

**Duration:** 3-4 hours  
**Prerequisites:** Module 01-04 (All Go fundamentals)  
**Outcome:** Master Go's testing framework and write comprehensive test suites

---

## 📚 Table of Contents

1. [Testing Fundamentals](#testing-fundamentals)
2. [Writing Unit Tests](#writing-unit-tests)
3. [Table-Driven Tests](#table-driven-tests)
4. [Test Coverage](#test-coverage)
5. [Mocking & Interfaces](#mocking--interfaces)
6. [HTTP Testing](#http-testing)
7. [Database Testing](#database-testing)
8. [Benchmarking](#benchmarking)
9. [Testing Best Practices](#testing-best-practices)
10. [Interview Questions](#interview-questions)
11. [Hands-On Exercise](#hands-on-exercise)

---

## Testing Fundamentals

### Why Test?

✅ **Benefits:**
- Catch bugs early
- Enable refactoring with confidence
- Document behavior
- Improve code design
- Reduce debugging time

### Test File Naming

```bash
# Source file
calculator.go

# Test file (must end with _test.go)
calculator_test.go
```

### Running Tests

```bash
# Run all tests
go test

# Run tests with verbose output
go test -v

# Run specific test
go test -run TestAdd

# Run tests in all subdirectories
go test ./...

# Run with coverage
go test -cover

# Generate coverage report
go test -coverprofile=coverage.out
go tool cover -html=coverage.out
```

---

## Writing Unit Tests

### Basic Test

```go
// calculator.go
package calculator

func Add(a, b int) int {
    return a + b
}

func Subtract(a, b int) int {
    return a - b
}

func Multiply(a, b int) int {
    return a * b
}

func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, fmt.Errorf("division by zero")
    }
    return a / b, nil
}
```

```go
// calculator_test.go
package calculator

import "testing"

func TestAdd(t *testing.T) {
    result := Add(2, 3)
    expected := 5
    
    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}

func TestSubtract(t *testing.T) {
    result := Subtract(5, 3)
    expected := 2
    
    if result != expected {
        t.Errorf("Subtract(5, 3) = %d; want %d", result, expected)
    }
}

func TestDivide(t *testing.T) {
    // Test successful division
    result, err := Divide(10, 2)
    if err != nil {
        t.Fatalf("Divide(10, 2) unexpected error: %v", err)
    }
    if result != 5 {
        t.Errorf("Divide(10, 2) = %d; want 5", result)
    }
    
    // Test division by zero
    _, err = Divide(10, 0)
    if err == nil {
        t.Error("Divide(10, 0) expected error, got nil")
    }
}
```

### Test Helper Functions

```go
// Helper function
func assertEqual(t *testing.T, got, want int) {
    t.Helper()  // Marks this as helper, shows correct line number in errors
    if got != want {
        t.Errorf("got %d, want %d", got, want)
    }
}

func TestWithHelper(t *testing.T) {
    result := Add(2, 3)
    assertEqual(t, result, 5)
}
```

### Subtests

```go
func TestMath(t *testing.T) {
    t.Run("Addition", func(t *testing.T) {
        if Add(2, 3) != 5 {
            t.Error("Addition failed")
        }
    })
    
    t.Run("Subtraction", func(t *testing.T) {
        if Subtract(5, 3) != 2 {
            t.Error("Subtraction failed")
        }
    })
    
    t.Run("Division by zero", func(t *testing.T) {
        _, err := Divide(10, 0)
        if err == nil {
            t.Error("Expected error for division by zero")
        }
    })
}
```

---

## Table-Driven Tests

Best practice for testing multiple cases:

### Basic Table-Driven Test

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed signs", -2, 3, 1},
        {"with zero", 0, 5, 5},
        {"both zero", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", 
                    tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### Advanced Table-Driven Test

```go
func TestDivide(t *testing.T) {
    tests := []struct {
        name      string
        a, b      int
        want      int
        wantError bool
    }{
        {
            name:      "normal division",
            a:         10,
            b:         2,
            want:      5,
            wantError: false,
        },
        {
            name:      "division by zero",
            a:         10,
            b:         0,
            want:      0,
            wantError: true,
        },
        {
            name:      "negative numbers",
            a:         -10,
            b:         2,
            want:      -5,
            wantError: false,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Divide(tt.a, tt.b)
            
            if (err != nil) != tt.wantError {
                t.Errorf("Divide() error = %v, wantError %v", err, tt.wantError)
                return
            }
            
            if !tt.wantError && got != tt.want {
                t.Errorf("Divide() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

---

## Test Coverage

### Generate Coverage Report

```bash
# Run tests with coverage
go test -cover

# Output: coverage: 85.7% of statements

# Generate detailed coverage profile
go test -coverprofile=coverage.out

# View coverage in browser
go tool cover -html=coverage.out

# Coverage by function
go tool cover -func=coverage.out
```

### Coverage Example

```go
// user.go
package user

type User struct {
    Name  string
    Email string
    Age   int
}

func (u *User) IsAdult() bool {
    return u.Age >= 18
}

func (u *User) IsValid() bool {
    return u.Name != "" && u.Email != "" && u.Age > 0
}

// user_test.go
func TestUser(t *testing.T) {
    t.Run("IsAdult", func(t *testing.T) {
        tests := []struct {
            name string
            age  int
            want bool
        }{
            {"adult", 25, true},
            {"minor", 15, false},
            {"exactly 18", 18, true},
        }
        
        for _, tt := range tests {
            t.Run(tt.name, func(t *testing.T) {
                user := &User{Age: tt.age}
                if got := user.IsAdult(); got != tt.want {
                    t.Errorf("IsAdult() = %v, want %v", got, tt.want)
                }
            })
        }
    })
    
    t.Run("IsValid", func(t *testing.T) {
        tests := []struct {
            name string
            user User
            want bool
        }{
            {"valid user", User{"Alice", "alice@test.com", 25}, true},
            {"no name", User{"", "alice@test.com", 25}, false},
            {"no email", User{"Alice", "", 25}, false},
            {"zero age", User{"Alice", "alice@test.com", 0}, false},
        }
        
        for _, tt := range tests {
            t.Run(tt.name, func(t *testing.T) {
                if got := tt.user.IsValid(); got != tt.want {
                    t.Errorf("IsValid() = %v, want %v", got, tt.want)
                }
            })
        }
    })
}
```

---

## Mocking & Interfaces

### Interface-Based Mocking

```go
// storage.go
package storage

type UserStore interface {
    GetUser(id int) (*User, error)
    SaveUser(user *User) error
}

type User struct {
    ID   int
    Name string
}

// Real implementation
type PostgresStore struct {
    db *sql.DB
}

func (s *PostgresStore) GetUser(id int) (*User, error) {
    // Real database query
    var user User
    err := s.db.QueryRow("SELECT id, name FROM users WHERE id = $1", id).
        Scan(&user.ID, &user.Name)
    return &user, err
}

func (s *PostgresStore) SaveUser(user *User) error {
    // Real database insert
    _, err := s.db.Exec("INSERT INTO users (name) VALUES ($1)", user.Name)
    return err
}
```

```go
// storage_test.go
package storage

import (
    "errors"
    "testing"
)

// Mock implementation
type MockUserStore struct {
    users map[int]*User
    err   error
}

func (m *MockUserStore) GetUser(id int) (*User, error) {
    if m.err != nil {
        return nil, m.err
    }
    user, ok := m.users[id]
    if !ok {
        return nil, errors.New("user not found")
    }
    return user, nil
}

func (m *MockUserStore) SaveUser(user *User) error {
    if m.err != nil {
        return m.err
    }
    m.users[user.ID] = user
    return nil
}

// Service using the interface
type UserService struct {
    store UserStore
}

func (s *UserService) GetUserName(id int) (string, error) {
    user, err := s.store.GetUser(id)
    if err != nil {
        return "", err
    }
    return user.Name, nil
}

// Test with mock
func TestUserService_GetUserName(t *testing.T) {
    // Setup mock
    mock := &MockUserStore{
        users: map[int]*User{
            1: {ID: 1, Name: "Alice"},
            2: {ID: 2, Name: "Bob"},
        },
    }
    
    service := &UserService{store: mock}
    
    tests := []struct {
        name    string
        userID  int
        want    string
        wantErr bool
    }{
        {"existing user", 1, "Alice", false},
        {"another user", 2, "Bob", false},
        {"non-existent user", 999, "", true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := service.GetUserName(tt.userID)
            if (err != nil) != tt.wantErr {
                t.Errorf("GetUserName() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            if got != tt.want {
                t.Errorf("GetUserName() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### Using testify/mock

```go
import (
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/assert"
)

// Mock with testify
type MockUserStore struct {
    mock.Mock
}

func (m *MockUserStore) GetUser(id int) (*User, error) {
    args := m.Called(id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

func TestWithTestify(t *testing.T) {
    // Setup mock
    mockStore := new(MockUserStore)
    mockStore.On("GetUser", 1).Return(&User{ID: 1, Name: "Alice"}, nil)
    
    service := &UserService{store: mockStore}
    
    // Test
    name, err := service.GetUserName(1)
    
    // Assertions
    assert.NoError(t, err)
    assert.Equal(t, "Alice", name)
    mockStore.AssertExpectations(t)
}
```

---

## HTTP Testing

### Testing HTTP Handlers

```go
// handlers.go
package api

import (
    "encoding/json"
    "net/http"
)

type Response struct {
    Message string `json:"message"`
    Status  int    `json:"status"`
}

func HealthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(Response{
        Message: "OK",
        Status:  200,
    })
}

func GetUserHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    user := map[string]interface{}{
        "id":   1,
        "name": "Alice",
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}
```

```go
// handlers_test.go
package api

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHealthHandler(t *testing.T) {
    // Create request
    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    
    // Create response recorder
    rr := httptest.NewRecorder()
    
    // Call handler
    HealthHandler(rr, req)
    
    // Check status code
    if status := rr.Code; status != http.StatusOK {
        t.Errorf("handler returned wrong status code: got %v want %v",
            status, http.StatusOK)
    }
    
    // Check response body
    var response Response
    if err := json.NewDecoder(rr.Body).Decode(&response); err != nil {
        t.Fatalf("couldn't decode response: %v", err)
    }
    
    if response.Message != "OK" {
        t.Errorf("unexpected message: got %v want OK", response.Message)
    }
}

func TestGetUserHandler(t *testing.T) {
    tests := []struct {
        name       string
        method     string
        wantStatus int
    }{
        {"GET request", http.MethodGet, http.StatusOK},
        {"POST request", http.MethodPost, http.StatusMethodNotAllowed},
        {"PUT request", http.MethodPut, http.StatusMethodNotAllowed},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(tt.method, "/users/1", nil)
            rr := httptest.NewRecorder()
            
            GetUserHandler(rr, req)
            
            if rr.Code != tt.wantStatus {
                t.Errorf("handler returned wrong status: got %v want %v",
                    rr.Code, tt.wantStatus)
            }
        })
    }
}
```

### Testing HTTP Server

```go
func TestServer(t *testing.T) {
    // Create test server
    ts := httptest.NewServer(http.HandlerFunc(HealthHandler))
    defer ts.Close()
    
    // Make request
    resp, err := http.Get(ts.URL + "/health")
    if err != nil {
        t.Fatalf("couldn't make request: %v", err)
    }
    defer resp.Body.Close()
    
    // Check response
    if resp.StatusCode != http.StatusOK {
        t.Errorf("expected status OK, got %v", resp.Status)
    }
}
```

---

## Database Testing

### Using In-Memory SQLite

```go
import (
    "database/sql"
    "testing"
    _ "github.com/mattn/go-sqlite3"
)

func setupTestDB(t *testing.T) *sql.DB {
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil {
        t.Fatalf("couldn't open test database: %v", err)
    }
    
    // Create schema
    schema := `
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        );
    `
    
    if _, err := db.Exec(schema); err != nil {
        t.Fatalf("couldn't create schema: %v", err)
    }
    
    return db
}

func TestUserStore_Create(t *testing.T) {
    db := setupTestDB(t)
    defer db.Close()
    
    store := NewUserStore(db)
    
    user := &User{
        Name:  "Alice",
        Email: "alice@test.com",
    }
    
    err := store.Create(user)
    if err != nil {
        t.Fatalf("couldn't create user: %v", err)
    }
    
    if user.ID == 0 {
        t.Error("user ID not set")
    }
    
    // Verify user was created
    retrieved, err := store.GetByID(user.ID)
    if err != nil {
        t.Fatalf("couldn't retrieve user: %v", err)
    }
    
    if retrieved.Name != user.Name {
        t.Errorf("name mismatch: got %v want %v", retrieved.Name, user.Name)
    }
}
```

### Using Test Containers

```go
import (
    "context"
    "testing"
    "github.com/testcontainers/testcontainers-go"
    "github.com/testcontainers/testcontainers-go/wait"
)

func setupPostgresContainer(t *testing.T) *sql.DB {
    ctx := context.Background()
    
    req := testcontainers.ContainerRequest{
        Image:        "postgres:14",
        ExposedPorts: []string{"5432/tcp"},
        Env: map[string]string{
            "POSTGRES_PASSWORD": "password",
            "POSTGRES_DB":       "testdb",
        },
        WaitingFor: wait.ForLog("database system is ready to accept connections"),
    }
    
    container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
        ContainerRequest: req,
        Started:          true,
    })
    if err != nil {
        t.Fatalf("couldn't start container: %v", err)
    }
    
    t.Cleanup(func() {
        container.Terminate(ctx)
    })
    
    // Get connection details and connect to database
    // ... (implementation)
    
    return db
}
```

---

## Benchmarking

### Basic Benchmark

```go
// Benchmark function must start with Benchmark
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}

func BenchmarkStringConcat(b *testing.B) {
    for i := 0; i < b.N; i++ {
        _ = "hello" + " " + "world"
    }
}

func BenchmarkStringBuilderConcat(b *testing.B) {
    for i := 0; i < b.N; i++ {
        var sb strings.Builder
        sb.WriteString("hello")
        sb.WriteString(" ")
        sb.WriteString("world")
        _ = sb.String()
    }
}
```

```bash
# Run benchmarks
go test -bench=.

# Output:
# BenchmarkAdd-8                  1000000000    0.25 ns/op
# BenchmarkStringConcat-8         50000000      30.5 ns/op
# BenchmarkStringBuilderConcat-8  100000000     10.2 ns/op
```

### Benchmark with Setup

```go
func BenchmarkLargeSlice(b *testing.B) {
    // Setup (not timed)
    data := make([]int, 1000000)
    for i := range data {
        data[i] = i
    }
    
    // Reset timer to exclude setup time
    b.ResetTimer()
    
    // Benchmark loop
    for i := 0; i < b.N; i++ {
        sum := 0
        for _, v := range data {
            sum += v
        }
    }
}
```

### Memory Benchmarks

```go
func BenchmarkAllocation(b *testing.B) {
    b.ReportAllocs()  // Report memory allocations
    
    for i := 0; i < b.N; i++ {
        _ = make([]int, 1000)
    }
}
```

```bash
# Run with memory stats
go test -bench=. -benchmem

# Output:
# BenchmarkAllocation-8    500000    3000 ns/op    8192 B/op    1 allocs/op
```

---

## Testing Best Practices

### 1. Test One Thing Per Test

```go
// ❌ Bad: Testing multiple things
func TestUser(t *testing.T) {
    user := &User{Name: "Alice", Age: 25}
    if !user.IsValid() {
        t.Error("user should be valid")
    }
    if !user.IsAdult() {
        t.Error("user should be adult")
    }
}

// ✅ Good: Separate tests
func TestUser_IsValid(t *testing.T) {
    user := &User{Name: "Alice", Age: 25}
    if !user.IsValid() {
        t.Error("user should be valid")
    }
}

func TestUser_IsAdult(t *testing.T) {
    user := &User{Name: "Alice", Age: 25}
    if !user.IsAdult() {
        t.Error("user should be adult")
    }
}
```

### 2. Use Table-Driven Tests

```go
// ✅ Good: Table-driven for multiple cases
func TestAdd(t *testing.T) {
    tests := []struct {
        name string
        a, b int
        want int
    }{
        {"positive", 2, 3, 5},
        {"negative", -2, -3, -5},
        {"zero", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if got := Add(tt.a, tt.b); got != tt.want {
                t.Errorf("got %d, want %d", got, tt.want)
            }
        })
    }
}
```

### 3. Use t.Helper() for Test Helpers

```go
// ✅ Mark helper functions
func assertEqual(t *testing.T, got, want interface{}) {
    t.Helper()  // Shows actual test line in error
    if got != want {
        t.Errorf("got %v, want %v", got, want)
    }
}
```

### 4. Clean Up Resources

```go
func TestWithCleanup(t *testing.T) {
    // Setup
    file, err := os.CreateTemp("", "test")
    if err != nil {
        t.Fatal(err)
    }
    
    // Cleanup (always runs, even if test fails)
    t.Cleanup(func() {
        os.Remove(file.Name())
    })
    
    // Test code...
}
```

### 5. Use Parallel Tests When Possible

```go
func TestParallel(t *testing.T) {
    tests := []struct {
        name string
        // ...
    }{
        // test cases
    }
    
    for _, tt := range tests {
        tt := tt  // Capture range variable
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()  // Run tests in parallel
            // Test code...
        })
    }
}
```

---

## Interview Questions

**Q1: What's the difference between t.Error and t.Fatal?**

**Answer:**
- `t.Error`: Reports error but continues test
- `t.Fatal`: Reports error and stops test immediately

**Q2: How do you test unexported functions?**

**Answer:** Test files in the same package can access unexported functions. For external testing, create a test package with `_test` suffix or export the function.

**Q3: What is table-driven testing?**

**Answer:** A pattern where test cases are defined in a slice of structs, then iterated over. Benefits: less code duplication, easier to add cases, clearer test structure.

**Q4: How do you measure test coverage?**

**Answer:** `go test -cover` or `go test -coverprofile=coverage.out` followed by `go tool cover -html=coverage.out`

**Q5: What's the purpose of benchmarking?**

**Answer:** Measure performance (execution time, memory allocations) to identify bottlenecks and compare implementations.

---

## Hands-On Exercise

### Task: Test a User Management System

**Given this code:**

```go
package user

type User struct {
    ID       int
    Username string
    Email    string
    Age      int
}

type UserService struct {
    store UserStore
}

type UserStore interface {
    Create(user *User) error
    GetByID(id int) (*User, error)
    GetByUsername(username string) (*User, error)
    Update(user *User) error
    Delete(id int) error
}

func (s *UserService) Register(username, email string, age int) (*User, error) {
    // Validate
    if username == "" || email == "" {
        return nil, errors.New("username and email required")
    }
    if age < 18 {
        return nil, errors.New("must be 18 or older")
    }
    
    // Check if username exists
    existing, _ := s.store.GetByUsername(username)
    if existing != nil {
        return nil, errors.New("username already exists")
    }
    
    // Create user
    user := &User{
        Username: username,
        Email:    email,
        Age:      age,
    }
    
    if err := s.store.Create(user); err != nil {
        return nil, err
    }
    
    return user, nil
}
```

**Requirements:**
1. Write table-driven tests for validation
2. Create mock UserStore
3. Test all success and error cases
4. Achieve >90% coverage
5. Add benchmarks for Register function

---

## 📚 Additional Resources

- [Go Testing Documentation](https://pkg.go.dev/testing)
- [Table Driven Tests](https://dave.cheney.net/2013/06/09/writing-table-driven-tests-in-go)
- [testify Package](https://github.com/stretchr/testify)
- [gomock](https://github.com/golang/mock)

---

## ✅ Module Checklist

- [ ] Write basic unit tests
- [ ] Implement table-driven tests
- [ ] Generate and analyze test coverage
- [ ] Create mocks using interfaces
- [ ] Test HTTP handlers
- [ ] Test database operations
- [ ] Write benchmarks
- [ ] Follow testing best practices
- [ ] Complete the hands-on exercise

---

## 🎉 Congratulations!

You've completed the **Go Programming** section! You now have a solid foundation in:
- Go fundamentals and syntax
- Concurrent programming with goroutines
- Building REST APIs
- Database integration
- Writing comprehensive tests

**Next Section:** [Module 06: Kubernetes Architecture](./06_Kubernetes_Architecture.md) - Master container orchestration! ☸️
