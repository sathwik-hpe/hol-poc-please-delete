# Module 03: REST APIs with Go 🌐

## Build Production-Ready HTTP Services

**Duration:** 4-5 hours  
**Prerequisites:** Module 01 (Fundamentals), Module 02 (Concurrency)  
**Outcome:** Create scalable REST APIs with proper routing, middleware, and error handling

---

## 📚 Table of Contents

1. [REST API Fundamentals](#rest-api-fundamentals)
2. [net/http Package](#nethttp-package)
3. [Routing](#routing)
4. [HTTP Methods & Status Codes](#http-methods--status-codes)
5. [Request Handling](#request-handling)
6. [Response Handling](#response-handling)
7. [Middleware](#middleware)
8. [Error Handling](#error-handling)
9. [Request Validation](#request-validation)
10. [Popular Frameworks](#popular-frameworks)
11. [Best Practices](#best-practices)
12. [Interview Questions](#interview-questions)
13. [Hands-On Exercise](#hands-on-exercise)

---

## REST API Fundamentals

### What is REST?

**REST** (Representational State Transfer) is an architectural style for designing networked applications.

**Key Principles:**
1. **Stateless** - Each request contains all information needed
2. **Client-Server** - Separation of concerns
3. **Cacheable** - Responses can be cached
4. **Uniform Interface** - Consistent API design
5. **Layered System** - Architecture can have multiple layers

### HTTP Methods (CRUD)

| Method | Operation | Idempotent | Safe |
|--------|-----------|------------|------|
| GET | Read | ✅ | ✅ |
| POST | Create | ❌ | ❌ |
| PUT | Update/Replace | ✅ | ❌ |
| PATCH | Partial Update | ❌ | ❌ |
| DELETE | Delete | ✅ | ❌ |

### RESTful URL Design

```
✅ Good:
GET    /api/v1/users          # List users
GET    /api/v1/users/123      # Get user 123
POST   /api/v1/users          # Create user
PUT    /api/v1/users/123      # Update user 123
DELETE /api/v1/users/123      # Delete user 123

❌ Bad:
GET    /api/v1/getUsers
POST   /api/v1/createUser
GET    /api/v1/user?action=delete&id=123
```

---

## net/http Package

Go's standard library has everything you need for HTTP servers:

### Basic HTTP Server

```go
package main

import (
    "fmt"
    "log"
    "net/http"
)

func main() {
    // Handle route
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })
    
    // Start server
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Multiple Routes

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type Response struct {
    Message string `json:"message"`
    Status  int    `json:"status"`
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(Response{
        Message: "Welcome to the API",
        Status:  200,
    })
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(Response{
        Message: "Server is healthy",
        Status:  200,
    })
}

func main() {
    http.HandleFunc("/", homeHandler)
    http.HandleFunc("/health", healthHandler)
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Custom Server Configuration

```go
package main

import (
    "log"
    "net/http"
    "time"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", homeHandler)
    
    // Custom server with timeouts
    server := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }
    
    log.Println("Server starting on :8080")
    log.Fatal(server.ListenAndServe())
}
```

---

## Routing

### Using http.ServeMux (Standard Library)

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    mux := http.NewServeMux()
    
    // Exact match
    mux.HandleFunc("/users", usersHandler)
    
    // Prefix match (catches /api/*, /api/users/*, etc.)
    mux.HandleFunc("/api/", apiHandler)
    
    http.ListenAndServe(":8080", mux)
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Users endpoint")
}

func apiHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "API endpoint: %s", r.URL.Path)
}
```

**Limitations of ServeMux:**
- No URL parameters (e.g., `/users/:id`)
- No method-based routing
- Limited pattern matching

### Using gorilla/mux (Popular Router)

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    
    "github.com/gorilla/mux"
)

type User struct {
    ID   string `json:"id"`
    Name string `json:"name"`
}

func main() {
    r := mux.NewRouter()
    
    // Method-specific routing
    r.HandleFunc("/users", getUsers).Methods("GET")
    r.HandleFunc("/users", createUser).Methods("POST")
    
    // URL parameters
    r.HandleFunc("/users/{id}", getUser).Methods("GET")
    r.HandleFunc("/users/{id}", updateUser).Methods("PUT")
    r.HandleFunc("/users/{id}", deleteUser).Methods("DELETE")
    
    // Subrouters
    api := r.PathPrefix("/api/v1").Subrouter()
    api.HandleFunc("/products", getProducts).Methods("GET")
    
    log.Fatal(http.ListenAndServe(":8080", r))
}

func getUser(w http.ResponseWriter, r *http.Request) {
    // Extract URL parameter
    vars := mux.Vars(r)
    id := vars["id"]
    
    // Mock user
    user := User{ID: id, Name: "John Doe"}
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

func getUsers(w http.ResponseWriter, r *http.Request) {
    users := []User{
        {ID: "1", Name: "Alice"},
        {ID: "2", Name: "Bob"},
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func createUser(w http.ResponseWriter, r *http.Request) {
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(user)
}

func updateUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    user.ID = id
    json.NewEncoder(w).Encode(user)
}

func deleteUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    
    w.WriteHeader(http.StatusNoContent)
    // In real app, delete from database
}

func getProducts(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Products endpoint")
}
```

---

## HTTP Methods & Status Codes

### Common Status Codes

```go
// 2xx Success
http.StatusOK                  // 200
http.StatusCreated             // 201
http.StatusAccepted            // 202
http.StatusNoContent           // 204

// 3xx Redirection
http.StatusMovedPermanently    // 301
http.StatusFound               // 302
http.StatusNotModified         // 304

// 4xx Client Errors
http.StatusBadRequest          // 400
http.StatusUnauthorized        // 401
http.StatusForbidden           // 403
http.StatusNotFound            // 404
http.StatusConflict            // 409
http.StatusUnprocessableEntity // 422

// 5xx Server Errors
http.StatusInternalServerError // 500
http.StatusBadGateway          // 502
http.StatusServiceUnavailable  // 503
```

### Method-Based Routing

```go
func userHandler(w http.ResponseWriter, r *http.Request) {
    switch r.Method {
    case http.MethodGet:
        getUser(w, r)
    case http.MethodPost:
        createUser(w, r)
    case http.MethodPut:
        updateUser(w, r)
    case http.MethodDelete:
        deleteUser(w, r)
    default:
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
    }
}
```

---

## Request Handling

### Reading Query Parameters

```go
func searchHandler(w http.ResponseWriter, r *http.Request) {
    // Parse query parameters
    query := r.URL.Query()
    
    // Get single value
    name := query.Get("name")        // ?name=alice
    
    // Get multiple values
    tags := query["tag"]             // ?tag=go&tag=api
    
    // With defaults
    page := query.Get("page")
    if page == "" {
        page = "1"
    }
    
    fmt.Fprintf(w, "Search: name=%s, tags=%v, page=%s", name, tags, page)
}
```

### Reading Request Body (JSON)

```go
type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age"`
}

func createUser(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    
    // Decode JSON body
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }
    defer r.Body.Close()
    
    // Validate
    if req.Name == "" {
        http.Error(w, "Name is required", http.StatusBadRequest)
        return
    }
    
    // Process request...
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(req)
}
```

### Reading Headers

```go
func headerHandler(w http.ResponseWriter, r *http.Request) {
    // Get specific header
    userAgent := r.Header.Get("User-Agent")
    contentType := r.Header.Get("Content-Type")
    
    // Get authorization token
    authHeader := r.Header.Get("Authorization")
    
    // Check if header exists
    if _, ok := r.Header["X-Custom-Header"]; ok {
        // Header exists
    }
    
    fmt.Fprintf(w, "User-Agent: %s", userAgent)
}
```

### Reading Cookies

```go
func cookieHandler(w http.ResponseWriter, r *http.Request) {
    // Get specific cookie
    cookie, err := r.Cookie("session_id")
    if err != nil {
        if err == http.ErrNoCookie {
            http.Error(w, "No session cookie", http.StatusUnauthorized)
            return
        }
        http.Error(w, "Error reading cookie", http.StatusInternalServerError)
        return
    }
    
    fmt.Fprintf(w, "Session ID: %s", cookie.Value)
}
```

---

## Response Handling

### Writing JSON Response

```go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
    response, err := json.Marshal(payload)
    if err != nil {
        w.WriteHeader(http.StatusInternalServerError)
        w.Write([]byte(`{"success":false,"error":"Internal server error"}`))
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    w.Write(response)
}

func respondError(w http.ResponseWriter, status int, message string) {
    respondJSON(w, status, APIResponse{
        Success: false,
        Error:   message,
    })
}

func respondSuccess(w http.ResponseWriter, data interface{}) {
    respondJSON(w, http.StatusOK, APIResponse{
        Success: true,
        Data:    data,
    })
}

// Usage
func getUserHandler(w http.ResponseWriter, r *http.Request) {
    user := User{ID: "1", Name: "Alice"}
    respondSuccess(w, user)
}
```

### Setting Headers

```go
func apiHandler(w http.ResponseWriter, r *http.Request) {
    // Set content type
    w.Header().Set("Content-Type", "application/json")
    
    // Set custom headers
    w.Header().Set("X-API-Version", "v1")
    w.Header().Set("X-Request-ID", "abc123")
    
    // Set CORS headers
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
    
    // Set caching headers
    w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
    
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

### Setting Cookies

```go
func loginHandler(w http.ResponseWriter, r *http.Request) {
    // Create session cookie
    cookie := &http.Cookie{
        Name:     "session_id",
        Value:    "abc123xyz",
        Path:     "/",
        MaxAge:   3600,  // 1 hour
        HttpOnly: true,  // Not accessible via JavaScript
        Secure:   true,  // Only sent over HTTPS
        SameSite: http.SameSiteStrictMode,
    }
    
    http.SetCookie(w, cookie)
    
    respondSuccess(w, map[string]string{"message": "Logged in"})
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
    // Delete cookie by setting MaxAge to -1
    cookie := &http.Cookie{
        Name:   "session_id",
        Value:  "",
        Path:   "/",
        MaxAge: -1,
    }
    
    http.SetCookie(w, cookie)
    respondSuccess(w, map[string]string{"message": "Logged out"})
}
```

---

## Middleware

Middleware wraps handlers to add cross-cutting concerns:

### Basic Middleware Pattern

```go
// Middleware signature
type Middleware func(http.HandlerFunc) http.HandlerFunc

// Example: Logging middleware
func loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Call next handler
        next(w, r)
        
        // Log after handler completes
        log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(start))
    }
}

// Usage
http.HandleFunc("/users", loggingMiddleware(usersHandler))
```

### Common Middleware Examples

```go
// 1. Authentication Middleware
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        
        if token == "" {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        
        // Validate token (simplified)
        if !isValidToken(token) {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }
        
        next(w, r)
    }
}

// 2. CORS Middleware
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next(w, r)
    }
}

// 3. Rate Limiting Middleware
func rateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
    limiter := time.Tick(100 * time.Millisecond)  // 10 requests per second
    
    return func(w http.ResponseWriter, r *http.Request) {
        <-limiter  // Wait for rate limiter
        next(w, r)
    }
}

// 4. Request ID Middleware
func requestIDMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        requestID := uuid.New().String()
        w.Header().Set("X-Request-ID", requestID)
        
        // Add to context for use in handlers
        ctx := context.WithValue(r.Context(), "requestID", requestID)
        next(w, r.WithContext(ctx))
    }
}

// 5. Recovery Middleware (Panic Recovery)
func recoveryMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("Panic: %v", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        
        next(w, r)
    }
}
```

### Chain Multiple Middleware

```go
// Chain middleware together
func chain(f http.HandlerFunc, middlewares ...Middleware) http.HandlerFunc {
    for _, m := range middlewares {
        f = m(f)
    }
    return f
}

// Usage
func main() {
    http.HandleFunc("/api/users", chain(
        usersHandler,
        loggingMiddleware,
        authMiddleware,
        corsMiddleware,
    ))
    
    http.ListenAndServe(":8080", nil)
}
```

### Middleware with gorilla/mux

```go
func main() {
    r := mux.NewRouter()
    
    // Apply middleware to all routes
    r.Use(loggingMiddleware)
    r.Use(corsMiddleware)
    
    // Apply to specific subrouter
    api := r.PathPrefix("/api").Subrouter()
    api.Use(authMiddleware)
    
    api.HandleFunc("/users", usersHandler)
    
    http.ListenAndServe(":8080", r)
}
```

---

## Error Handling

### Custom Error Types

```go
type APIError struct {
    StatusCode int    `json:"-"`
    Message    string `json:"message"`
    Detail     string `json:"detail,omitempty"`
}

func (e *APIError) Error() string {
    return e.Message
}

// Predefined errors
var (
    ErrNotFound = &APIError{
        StatusCode: http.StatusNotFound,
        Message:    "Resource not found",
    }
    
    ErrUnauthorized = &APIError{
        StatusCode: http.StatusUnauthorized,
        Message:    "Unauthorized",
    }
    
    ErrBadRequest = &APIError{
        StatusCode: http.StatusBadRequest,
        Message:    "Bad request",
    }
)

// Error handler
func handleError(w http.ResponseWriter, err error) {
    if apiErr, ok := err.(*APIError); ok {
        respondError(w, apiErr.StatusCode, apiErr.Message)
        return
    }
    
    // Unknown error
    log.Printf("Internal error: %v", err)
    respondError(w, http.StatusInternalServerError, "Internal server error")
}

// Usage in handler
func getUserHandler(w http.ResponseWriter, r *http.Request) {
    user, err := getUserFromDB(id)
    if err != nil {
        if err == sql.ErrNoRows {
            handleError(w, ErrNotFound)
            return
        }
        handleError(w, err)
        return
    }
    
    respondSuccess(w, user)
}
```

---

## Request Validation

### Manual Validation

```go
type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
    Age   int    `json:"age"`
}

func (r *CreateUserRequest) Validate() error {
    if r.Name == "" {
        return &APIError{
            StatusCode: http.StatusBadRequest,
            Message:    "name is required",
        }
    }
    
    if len(r.Name) < 3 {
        return &APIError{
            StatusCode: http.StatusBadRequest,
            Message:    "name must be at least 3 characters",
        }
    }
    
    if r.Email == "" {
        return &APIError{
            StatusCode: http.StatusBadRequest,
            Message:    "email is required",
        }
    }
    
    // Simple email validation
    if !strings.Contains(r.Email, "@") {
        return &APIError{
            StatusCode: http.StatusBadRequest,
            Message:    "invalid email format",
        }
    }
    
    if r.Age < 18 || r.Age > 120 {
        return &APIError{
            StatusCode: http.StatusBadRequest,
            Message:    "age must be between 18 and 120",
        }
    }
    
    return nil
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        handleError(w, ErrBadRequest)
        return
    }
    
    if err := req.Validate(); err != nil {
        handleError(w, err)
        return
    }
    
    // Process valid request...
    respondSuccess(w, req)
}
```

### Using Validator Library

```go
import "github.com/go-playground/validator/v10"

type CreateUserRequest struct {
    Name  string `json:"name" validate:"required,min=3,max=50"`
    Email string `json:"email" validate:"required,email"`
    Age   int    `json:"age" validate:"required,gte=18,lte=120"`
}

var validate = validator.New()

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    var req CreateUserRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        handleError(w, ErrBadRequest)
        return
    }
    
    if err := validate.Struct(req); err != nil {
        respondError(w, http.StatusBadRequest, err.Error())
        return
    }
    
    respondSuccess(w, req)
}
```

---

## Popular Frameworks

### 1. Gin (Fast & Popular)

```go
import "github.com/gin-gonic/gin"

func main() {
    r := gin.Default()
    
    r.GET("/users", getUsers)
    r.GET("/users/:id", getUser)
    r.POST("/users", createUser)
    
    r.Run(":8080")
}

func getUser(c *gin.Context) {
    id := c.Param("id")
    c.JSON(200, gin.H{
        "id":   id,
        "name": "Alice",
    })
}
```

### 2. Echo (Minimalist)

```go
import "github.com/labstack/echo/v4"

func main() {
    e := echo.New()
    
    e.GET("/users/:id", getUser)
    e.Start(":8080")
}

func getUser(c echo.Context) error {
    id := c.Param("id")
    return c.JSON(200, map[string]string{
        "id":   id,
        "name": "Alice",
    })
}
```

### 3. Fiber (Express-like)

```go
import "github.com/gofiber/fiber/v2"

func main() {
    app := fiber.New()
    
    app.Get("/users/:id", getUser)
    app.Listen(":8080")
}

func getUser(c *fiber.Ctx) error {
    id := c.Params("id")
    return c.JSON(fiber.Map{
        "id":   id,
        "name": "Alice",
    })
}
```

---

## Best Practices

### 1. Use Proper HTTP Methods

```go
// ✅ RESTful design
GET    /users       // List users
POST   /users       // Create user
GET    /users/:id   // Get user
PUT    /users/:id   // Update user
DELETE /users/:id   // Delete user

// ❌ Non-RESTful
GET /getUsers
POST /createUser
```

### 2. Return Appropriate Status Codes

```go
// ✅ Correct
w.WriteHeader(http.StatusCreated)      // 201 for created
w.WriteHeader(http.StatusNoContent)    // 204 for successful delete
w.WriteHeader(http.StatusNotFound)     // 404 for not found

// ❌ Returning 200 for everything
```

### 3. Use Structured Logging

```go
import "go.uber.org/zap"

logger, _ := zap.NewProduction()
defer logger.Sync()

logger.Info("User created",
    zap.String("user_id", "123"),
    zap.String("method", "POST"),
)
```

### 4. Handle Timeouts

```go
ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
defer cancel()

// Use ctx in database calls, HTTP requests, etc.
```

### 5. Validate Input

```go
// Always validate and sanitize user input
if req.Email == "" || !isValidEmail(req.Email) {
    return ErrBadRequest
}
```

---

## Interview Questions

**Q1: What's the difference between PUT and PATCH?**

**Answer:** 
- **PUT** replaces the entire resource (all fields must be provided)
- **PATCH** partially updates the resource (only provided fields are updated)

**Q2: How do you handle CORS in Go?**

**Answer:** Set appropriate headers in middleware or handler:
```go
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
```

**Q3: What's the difference between http.Error and writing custom JSON errors?**

**Answer:** `http.Error` sends plain text. For APIs, custom JSON errors provide:
- Structured error format
- Error codes
- Additional context
- Better client parsing

**Q4: How do you implement middleware in Go?**

**Answer:** Wrap handlers with functions that take and return `http.HandlerFunc`:
```go
func middleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        // Before
        next(w, r)
        // After
    }
}
```

---

## Hands-On Exercise

### Task: Build a Complete REST API for a Todo Application

**Requirements:**
1. CRUD operations for todos
2. Proper error handling
3. Input validation
4. Middleware (logging, CORS, auth)
5. Structured JSON responses
6. In-memory storage (slice)

**API Endpoints:**
```
GET    /api/todos           # List all todos
GET    /api/todos/:id       # Get todo by ID
POST   /api/todos           # Create todo
PUT    /api/todos/:id       # Update todo
DELETE /api/todos/:id       # Delete todo
```

**Starter Code:**

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    
    "github.com/gorilla/mux"
)

type Todo struct {
    ID        string `json:"id"`
    Title     string `json:"title"`
    Completed bool   `json:"completed"`
}

type TodoStore struct {
    mu    sync.RWMutex
    todos map[string]Todo
}

var store = &TodoStore{
    todos: make(map[string]Todo),
}

// TODO: Implement handlers
func getTodos(w http.ResponseWriter, r *http.Request) {
    // Return all todos
}

func getTodo(w http.ResponseWriter, r *http.Request) {
    // Return single todo
}

func createTodo(w http.ResponseWriter, r *http.Request) {
    // Create new todo
}

func updateTodo(w http.ResponseWriter, r *http.Request) {
    // Update existing todo
}

func deleteTodo(w http.ResponseWriter, r *http.Request) {
    // Delete todo
}

// TODO: Implement middleware
func loggingMiddleware(next http.Handler) http.Handler {
    // Log requests
    return nil
}

func main() {
    r := mux.NewRouter()
    
    // TODO: Set up routes
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}
```

**Test with curl:**
```bash
# Create
curl -X POST http://localhost:8080/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Go","completed":false}'

# List
curl http://localhost:8080/api/todos

# Get one
curl http://localhost:8080/api/todos/1

# Update
curl -X PUT http://localhost:8080/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Go","completed":true}'

# Delete
curl -X DELETE http://localhost:8080/api/todos/1
```

---

## 📚 Additional Resources

- [Go net/http Documentation](https://pkg.go.dev/net/http)
- [Gorilla Mux](https://github.com/gorilla/mux)
- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)

---

## ✅ Module Checklist

Before moving to the next module, ensure you can:

- [ ] Build HTTP servers with net/http
- [ ] Implement RESTful routing
- [ ] Handle different HTTP methods
- [ ] Read requests (query params, body, headers)
- [ ] Write JSON responses
- [ ] Create and use middleware
- [ ] Implement proper error handling
- [ ] Validate input data
- [ ] Use popular routers (gorilla/mux)
- [ ] Complete the hands-on exercise

---

**Next Module:** [04_Go_Database_Integration.md](./04_Go_Database_Integration.md) - Connect to databases! 🗄️
