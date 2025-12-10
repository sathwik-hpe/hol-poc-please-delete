# Module 20: Frontend-Backend Integration 🌐

## Connect Your Backend APIs to Modern UIs

**Duration:** 5-6 hours  
**Prerequisites:** Module 03 (REST APIs), Module 17 (Microservices)  
**Outcome:** Master communication patterns between frontend and backend

---

## 📚 Table of Contents

1. [Communication Patterns](#communication-patterns)
2. [RESTful API Best Practices](#restful-api-best-practices)
3. [GraphQL](#graphql)
4. [WebSockets](#websockets)
5. [CORS](#cors)
6. [API Documentation](#api-documentation)
7. [Best Practices](#best-practices)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## Communication Patterns

### Overview

```
Frontend ←→ Backend Communication

1. REST (Representational State Transfer)
   - Request/response model
   - Stateless
   - HTTP methods (GET, POST, PUT, DELETE)

2. GraphQL
   - Query language
   - Request exactly what you need
   - Single endpoint

3. WebSockets
   - Bidirectional communication
   - Real-time updates
   - Persistent connection

4. Server-Sent Events (SSE)
   - One-way server → client
   - HTTP-based
   - Simpler than WebSockets
```

---

## RESTful API Best Practices

### 1. Resource Naming

```
Good API Design:

GET    /api/v1/users           # List all users
GET    /api/v1/users/123       # Get specific user
POST   /api/v1/users           # Create user
PUT    /api/v1/users/123       # Update user (full)
PATCH  /api/v1/users/123       # Update user (partial)
DELETE /api/v1/users/123       # Delete user

GET    /api/v1/users/123/orders  # User's orders (nested resource)

Bad Examples:
GET /api/v1/getAllUsers        ❌ Verb in URL
POST /api/v1/user/create       ❌ Use POST /users
GET /api/v1/users/delete/123   ❌ Use DELETE method
```

### 2. HTTP Status Codes

```go
// Proper status code usage
func CreateUser(w http.ResponseWriter, r *http.Request) {
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        // 400 Bad Request - client error
        http.Error(w, "Invalid request body", http.StatusBadRequest)
        return
    }

    if err := validateUser(&user); err != nil {
        // 422 Unprocessable Entity - validation failed
        w.WriteHeader(http.StatusUnprocessableEntity)
        json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
        return
    }

    if err := db.Create(&user).Error; err != nil {
        // 500 Internal Server Error
        http.Error(w, "Database error", http.StatusInternalServerError)
        return
    }

    // 201 Created - resource created successfully
    w.WriteHeader(http.StatusCreated)
    w.Header().Set("Location", fmt.Sprintf("/api/v1/users/%d", user.ID))
    json.NewEncoder(w).Encode(user)
}
```

### 3. Pagination

```go
type PaginatedResponse struct {
    Data       []User `json:"data"`
    Page       int    `json:"page"`
    PerPage    int    `json:"per_page"`
    Total      int64  `json:"total"`
    TotalPages int    `json:"total_pages"`
}

func ListUsers(w http.ResponseWriter, r *http.Request) {
    // Parse query params
    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    if page < 1 {
        page = 1
    }
    perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
    if perPage < 1 || perPage > 100 {
        perPage = 20
    }

    offset := (page - 1) * perPage

    var users []User
    var total int64

    db.Model(&User{}).Count(&total)
    db.Offset(offset).Limit(perPage).Find(&users)

    totalPages := int(math.Ceil(float64(total) / float64(perPage)))

    response := PaginatedResponse{
        Data:       users,
        Page:       page,
        PerPage:    perPage,
        Total:      total,
        TotalPages: totalPages,
    }

    json.NewEncoder(w).Encode(response)
}

/*
Request:
GET /api/v1/users?page=2&per_page=20

Response:
{
  "data": [...],
  "page": 2,
  "per_page": 20,
  "total": 150,
  "total_pages": 8
}
*/
```

### 4. Filtering & Sorting

```go
func ListProducts(w http.ResponseWriter, r *http.Request) {
    query := db.Model(&Product{})

    // Filtering
    if category := r.URL.Query().Get("category"); category != "" {
        query = query.Where("category = ?", category)
    }
    if minPrice := r.URL.Query().Get("min_price"); minPrice != "" {
        query = query.Where("price >= ?", minPrice)
    }
    if maxPrice := r.URL.Query().Get("max_price"); maxPrice != "" {
        query = query.Where("price <= ?", maxPrice)
    }

    // Sorting
    sortBy := r.URL.Query().Get("sort_by")
    if sortBy == "" {
        sortBy = "created_at"
    }
    order := r.URL.Query().Get("order")
    if order != "asc" && order != "desc" {
        order = "desc"
    }
    query = query.Order(fmt.Sprintf("%s %s", sortBy, order))

    // Execute query
    var products []Product
    query.Find(&products)

    json.NewEncoder(w).Encode(products)
}

/*
Examples:
GET /api/v1/products?category=electronics&min_price=100&sort_by=price&order=asc
GET /api/v1/products?category=books&max_price=50&sort_by=rating&order=desc
*/
```

### 5. API Versioning

```go
// Method 1: URL versioning (recommended)
r := mux.NewRouter()
v1 := r.PathPrefix("/api/v1").Subrouter()
v1.HandleFunc("/users", ListUsersV1).Methods("GET")

v2 := r.PathPrefix("/api/v2").Subrouter()
v2.HandleFunc("/users", ListUsersV2).Methods("GET") // Different response format

// Method 2: Header versioning
func VersionMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        version := r.Header.Get("API-Version")
        if version == "" {
            version = "1"
        }
        ctx := context.WithValue(r.Context(), "api_version", version)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Method 3: Content negotiation
// Accept: application/vnd.myapi.v1+json
// Accept: application/vnd.myapi.v2+json
```

### 6. HATEOAS (Hypermedia)

```go
type UserResponse struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
    Links struct {
        Self    string `json:"self"`
        Orders  string `json:"orders"`
        Profile string `json:"profile"`
    } `json:"_links"`
}

func GetUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]

    var user User
    db.First(&user, id)

    response := UserResponse{
        ID:    user.ID,
        Name:  user.Name,
        Email: user.Email,
    }
    response.Links.Self = fmt.Sprintf("/api/v1/users/%d", user.ID)
    response.Links.Orders = fmt.Sprintf("/api/v1/users/%d/orders", user.ID)
    response.Links.Profile = fmt.Sprintf("/api/v1/users/%d/profile", user.ID)

    json.NewEncoder(w).Encode(response)
}

/*
Response:
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "_links": {
    "self": "/api/v1/users/123",
    "orders": "/api/v1/users/123/orders",
    "profile": "/api/v1/users/123/profile"
  }
}
*/
```

---

## GraphQL

### What is GraphQL?

```
REST:
GET /users/123           → Full user object
GET /users/123/posts     → All posts
GET /posts/456/comments  → All comments
(Multiple requests, over-fetching/under-fetching)

GraphQL:
Single request, exact data needed:
{
  user(id: 123) {
    name
    email
    posts(limit: 5) {
      title
      comments(limit: 3) {
        text
        author { name }
      }
    }
  }
}
```

### GraphQL Server in Go

```go
// Install: go get github.com/graphql-go/graphql
package main

import (
    "encoding/json"
    "log"
    "net/http"

    "github.com/graphql-go/graphql"
)

// Define schema
var userType = graphql.NewObject(graphql.ObjectConfig{
    Name: "User",
    Fields: graphql.Fields{
        "id":    &graphql.Field{Type: graphql.Int},
        "name":  &graphql.Field{Type: graphql.String},
        "email": &graphql.Field{Type: graphql.String},
    },
})

var queryType = graphql.NewObject(graphql.ObjectConfig{
    Name: "Query",
    Fields: graphql.Fields{
        "user": &graphql.Field{
            Type: userType,
            Args: graphql.FieldConfigArgument{
                "id": &graphql.ArgumentConfig{
                    Type: graphql.Int,
                },
            },
            Resolve: func(p graphql.ResolveParams) (interface{}, error) {
                id, _ := p.Args["id"].(int)
                // Fetch from database
                return User{ID: id, Name: "John", Email: "john@example.com"}, nil
            },
        },
    },
})

var schema, _ = graphql.NewSchema(graphql.SchemaConfig{
    Query: queryType,
})

func graphqlHandler(w http.ResponseWriter, r *http.Request) {
    var params struct {
        Query string `json:"query"`
    }
    json.NewDecoder(r.Body).Decode(&params)

    result := graphql.Do(graphql.Params{
        Schema:        schema,
        RequestString: params.Query,
    })

    json.NewEncoder(w).Encode(result)
}

func main() {
    http.HandleFunc("/graphql", graphqlHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### GraphQL Mutations

```go
var mutationType = graphql.NewObject(graphql.ObjectConfig{
    Name: "Mutation",
    Fields: graphql.Fields{
        "createUser": &graphql.Field{
            Type: userType,
            Args: graphql.FieldConfigArgument{
                "name": &graphql.ArgumentConfig{
                    Type: graphql.NewNonNull(graphql.String),
                },
                "email": &graphql.ArgumentConfig{
                    Type: graphql.NewNonNull(graphql.String),
                },
            },
            Resolve: func(p graphql.ResolveParams) (interface{}, error) {
                name, _ := p.Args["name"].(string)
                email, _ := p.Args["email"].(string)

                user := User{Name: name, Email: email}
                db.Create(&user)

                return user, nil
            },
        },
    },
})

// Client request:
/*
mutation {
  createUser(name: "Jane Doe", email: "jane@example.com") {
    id
    name
    email
  }
}
*/
```

### GraphQL Subscriptions (Real-time)

```go
var subscriptionType = graphql.NewObject(graphql.ObjectConfig{
    Name: "Subscription",
    Fields: graphql.Fields{
        "messageAdded": &graphql.Field{
            Type: messageType,
            Resolve: func(p graphql.ResolveParams) (interface{}, error) {
                // Subscribe to message channel
                msgChan := make(chan Message)
                // Return channel
                return msgChan, nil
            },
        },
    },
})

// Client subscription:
/*
subscription {
  messageAdded {
    id
    text
    user { name }
  }
}
*/
```

---

## WebSockets

### WebSocket Server

```go
import (
    "log"
    "net/http"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow all origins (configure properly in production)
    },
}

type Client struct {
    conn *websocket.Conn
    send chan []byte
}

type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
}

func newHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        broadcast:  make(chan []byte),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}

func (c *Client) readPump(hub *Hub) {
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()

    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            break
        }
        hub.broadcast <- message
    }
}

func (c *Client) writePump() {
    defer c.conn.Close()

    for message := range c.send {
        if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
            break
        }
    }
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
        return
    }

    client := &Client{conn: conn, send: make(chan []byte, 256)}
    hub.register <- client

    go client.writePump()
    go client.readPump(hub)
}

func main() {
    hub := newHub()
    go hub.run()

    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWs(hub, w, r)
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### JavaScript Client

```javascript
// Frontend WebSocket client
const socket = new WebSocket('ws://localhost:8080/ws');

socket.onopen = () => {
    console.log('Connected to WebSocket');
    socket.send(JSON.stringify({ type: 'join', user: 'John' }));
};

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
    // Update UI
    displayMessage(message);
};

socket.onclose = () => {
    console.log('Disconnected');
    // Reconnect logic
    setTimeout(() => {
        socket = new WebSocket('ws://localhost:8080/ws');
    }, 3000);
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Send message
function sendMessage(text) {
    socket.send(JSON.stringify({
        type: 'message',
        text: text,
        timestamp: Date.now()
    }));
}
```

### Chat Application Example

```go
type Message struct {
    Type      string    `json:"type"`
    User      string    `json:"user"`
    Text      string    `json:"text"`
    Timestamp time.Time `json:"timestamp"`
}

func (c *Client) readPump(hub *Hub) {
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()

    for {
        var msg Message
        err := c.conn.ReadJSON(&msg)
        if err != nil {
            break
        }

        msg.Timestamp = time.Now()

        // Broadcast to all clients
        data, _ := json.Marshal(msg)
        hub.broadcast <- data

        // Save to database
        db.Create(&msg)
    }
}
```

---

## CORS

### What is CORS?

```
Cross-Origin Resource Sharing

Browser security: prevents websites from making requests to different domains

Example:
Frontend: http://localhost:3000 (React app)
Backend:  http://localhost:8080 (Go API)

Without CORS: ❌ Blocked by browser
With CORS:    ✅ Allowed
```

### CORS Middleware

```go
import "github.com/rs/cors"

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/api/users", GetUsers).Methods("GET")

    // CORS middleware
    c := cors.New(cors.Options{
        AllowedOrigins:   []string{"http://localhost:3000", "https://myapp.com"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Content-Type", "Authorization"},
        AllowCredentials: true,
        MaxAge:           300, // Cache preflight for 5 minutes
    })

    handler := c.Handler(r)
    http.ListenAndServe(":8080", handler)
}
```

### Manual CORS Headers

```go
func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

        // Handle preflight
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

### Preflight Requests

```
Browser sends OPTIONS request first:

OPTIONS /api/users
Origin: http://localhost:3000
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type

Server responds:
200 OK
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type

Then browser sends actual request:
POST /api/users
```

---

## API Documentation

### Swagger/OpenAPI

```go
// Install: go get -u github.com/swaggo/swag/cmd/swag
// Install: go get -u github.com/swaggo/http-swagger

// @title User API
// @version 1.0
// @description This is a sample API server
// @host localhost:8080
// @BasePath /api/v1

// @Summary Get all users
// @Description Get list of all users with pagination
// @Tags users
// @Accept json
// @Produce json
// @Param page query int false "Page number"
// @Param per_page query int false "Items per page"
// @Success 200 {array} User
// @Router /users [get]
func GetUsers(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

// @Summary Create user
// @Description Create a new user
// @Tags users
// @Accept json
// @Produce json
// @Param user body User true "User object"
// @Success 201 {object} User
// @Failure 400 {object} ErrorResponse
// @Router /users [post]
func CreateUser(w http.ResponseWriter, r *http.Request) {
    // Implementation
}

// Generate docs: swag init
// Serve: http://localhost:8080/swagger/index.html
```

### API Blueprint

```markdown
# User API

## Users Collection [/api/v1/users]

### List Users [GET]

+ Parameters
    + page: 1 (number, optional) - Page number
    + per_page: 20 (number, optional) - Items per page

+ Response 200 (application/json)
    
    + Body
    
            {
                "data": [
                    {
                        "id": 1,
                        "name": "John Doe",
                        "email": "john@example.com"
                    }
                ],
                "page": 1,
                "total": 100
            }

### Create User [POST]

+ Request (application/json)

        {
            "name": "Jane Doe",
            "email": "jane@example.com"
        }

+ Response 201 (application/json)

        {
            "id": 2,
            "name": "Jane Doe",
            "email": "jane@example.com"
        }
```

---

## Best Practices

### 1. Request/Response Wrapper

```go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type Meta struct {
    Page       int   `json:"page,omitempty"`
    PerPage    int   `json:"per_page,omitempty"`
    Total      int64 `json:"total,omitempty"`
    TotalPages int   `json:"total_pages,omitempty"`
}

func SuccessResponse(w http.ResponseWriter, data interface{}, meta *Meta) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Data:    data,
        Meta:    meta,
    })
}

func ErrorResponse(w http.ResponseWriter, message string, statusCode int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(APIResponse{
        Success: false,
        Error:   message,
    })
}
```

### 2. Rate Limiting

```go
import "golang.org/x/time/rate"

var limiter = rate.NewLimiter(10, 100) // 10 req/sec, burst 100

func RateLimitMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if !limiter.Allow() {
            http.Error(w, "Too many requests", http.StatusTooManyRequests)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### 3. Caching

```go
func CacheMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Cache GET requests for 5 minutes
        if r.Method == "GET" {
            w.Header().Set("Cache-Control", "public, max-age=300")
        } else {
            w.Header().Set("Cache-Control", "no-cache")
        }
        next.ServeHTTP(w, r)
    })
}
```

### 4. Request ID Tracking

```go
func RequestIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        w.Header().Set("X-Request-ID", requestID)
        
        ctx := context.WithValue(r.Context(), "request_id", requestID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Interview Questions

**Q1: REST vs GraphQL - when to use each?**

**Answer:**
- **REST**: Simple CRUD, caching important, public APIs, mobile apps (predictable data)
- **GraphQL**: Complex data relationships, multiple client types (web/mobile), over-fetching/under-fetching problems, rapid frontend development

**Q2: How do WebSockets differ from HTTP polling?**

**Answer:**
- **HTTP Polling**: Client repeatedly requests server (every N seconds). Inefficient, latency, server load.
- **WebSockets**: Persistent bidirectional connection. Real-time, efficient, lower latency. Use for chat, live updates, gaming.

**Q3: Explain CORS preflight requests.**

**Answer:** Browser sends OPTIONS request before actual request to check if cross-origin request allowed. Server responds with allowed methods/headers. Then browser sends real request. Only for "complex" requests (POST with JSON, custom headers).

**Q4: How do you handle API versioning?**

**Answer:** 
1. **URL versioning**: `/api/v1/users` (most common, clear)
2. **Header versioning**: `Accept: application/vnd.api.v2+json` (cleaner URLs)
3. **Query param**: `/api/users?version=2` (not recommended)

Choose based on: breaking changes frequency, client flexibility, documentation needs.

**Q5: Best practices for pagination?**

**Answer:**
- **Offset-based**: `?page=2&per_page=20` (simple, can skip pages)
- **Cursor-based**: `?cursor=abc123&limit=20` (better for real-time data, no skipped records)
- Include metadata: total count, total pages, next/prev cursors
- Limit max per_page (prevent abuse)
- Use indexes on sort columns

---

## Hands-On Exercise

### Task: Build Full-Stack API with Multiple Communication Patterns

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "sync"

    "github.com/gorilla/mux"
    "github.com/gorilla/websocket"
    "github.com/rs/cors"
)

// Models
type Product struct {
    ID          int     `json:"id"`
    Name        string  `json:"name"`
    Description string  `json:"description"`
    Price       float64 `json:"price"`
    Category    string  `json:"category"`
}

var (
    products   = make(map[int]Product)
    productsMu sync.RWMutex
    nextID     = 1
)

// REST: List products with pagination and filtering
func ListProducts(w http.ResponseWriter, r *http.Request) {
    productsMu.RLock()
    defer productsMu.RUnlock()

    // Filter by category
    category := r.URL.Query().Get("category")
    
    var filtered []Product
    for _, p := range products {
        if category == "" || p.Category == category {
            filtered = append(filtered, p)
        }
    }

    // Pagination
    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    if page < 1 {
        page = 1
    }
    perPage := 10
    start := (page - 1) * perPage
    end := start + perPage

    if start > len(filtered) {
        filtered = []Product{}
    } else if end > len(filtered) {
        filtered = filtered[start:]
    } else {
        filtered = filtered[start:end]
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "data":  filtered,
        "page":  page,
        "total": len(products),
    })
}

// REST: Create product
func CreateProduct(w http.ResponseWriter, r *http.Request) {
    var product Product
    if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    productsMu.Lock()
    product.ID = nextID
    nextID++
    products[product.ID] = product
    productsMu.Unlock()

    // Notify WebSocket clients
    hub.broadcast <- []byte(fmt.Sprintf("New product: %s", product.Name))

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(product)
}

// WebSocket Hub
type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
}

var hub = &Hub{
    clients:    make(map[*Client]bool),
    broadcast:  make(chan []byte),
    register:   make(chan *Client),
    unregister: make(chan *Client),
}

func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}

type Client struct {
    conn *websocket.Conn
    send chan []byte
}

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool { return true },
}

func ServeWs(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
        return
    }

    client := &Client{conn: conn, send: make(chan []byte, 256)}
    hub.register <- client

    go client.writePump()
    go client.readPump()
}

func (c *Client) readPump() {
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()
    for {
        _, _, err := c.conn.ReadMessage()
        if err != nil {
            break
        }
    }
}

func (c *Client) writePump() {
    defer c.conn.Close()
    for message := range c.send {
        c.conn.WriteMessage(websocket.TextMessage, message)
    }
}

func main() {
    // Initialize with sample data
    products[1] = Product{ID: 1, Name: "Laptop", Price: 999.99, Category: "electronics"}
    products[2] = Product{ID: 2, Name: "Book", Price: 19.99, Category: "books"}
    nextID = 3

    // Start WebSocket hub
    go hub.run()

    // Router
    r := mux.NewRouter()

    // REST endpoints
    r.HandleFunc("/api/v1/products", ListProducts).Methods("GET")
    r.HandleFunc("/api/v1/products", CreateProduct).Methods("POST")

    // WebSocket endpoint
    r.HandleFunc("/ws", ServeWs)

    // CORS
    c := cors.New(cors.Options{
        AllowedOrigins:   []string{"http://localhost:3000"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Content-Type"},
        AllowCredentials: true,
    })

    handler := c.Handler(r)
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", handler))
}
```

### Frontend (React Example)

```jsx
// App.js
import React, { useState, useEffect } from 'react';

function App() {
  const [products, setProducts] = useState([]);
  const [ws, setWs] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch products (REST)
  useEffect(() => {
    fetch('http://localhost:8080/api/v1/products')
      .then(res => res.json())
      .then(data => setProducts(data.data));
  }, []);

  // WebSocket connection
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080/ws');
    
    socket.onmessage = (event) => {
      setNotifications(prev => [...prev, event.data]);
    };

    setWs(socket);

    return () => socket.close();
  }, []);

  // Create product
  const createProduct = async () => {
    const newProduct = {
      name: 'New Item',
      description: 'Test product',
      price: 49.99,
      category: 'electronics'
    };

    const response = await fetch('http://localhost:8080/api/v1/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });

    const product = await response.json();
    setProducts([...products, product]);
  };

  return (
    <div>
      <h1>Products</h1>
      <button onClick={createProduct}>Add Product</button>
      
      <ul>
        {products.map(p => (
          <li key={p.id}>{p.name} - ${p.price}</li>
        ))}
      </ul>

      <h2>Live Notifications</h2>
      <ul>
        {notifications.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

---

## 📚 Additional Resources

- [REST API Design Best Practices](https://restfulapi.net/)
- [GraphQL Official Documentation](https://graphql.org/learn/)
- [WebSocket Protocol RFC 6455](https://datatracker.ietf.org/doc/html/rfc6455)
- [CORS MDN Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## ✅ Module Checklist

- [ ] Implement RESTful API with pagination and filtering
- [ ] Add API versioning (URL-based)
- [ ] Create GraphQL server with queries and mutations
- [ ] Build WebSocket chat application
- [ ] Configure CORS properly for production
- [ ] Add Swagger/OpenAPI documentation
- [ ] Implement rate limiting and caching
- [ ] Complete full-stack exercise with React frontend

---

**🎉 Congratulations!** You've completed Part 4: Microservices Architecture!

**Next Section:** [Module 21: AWS IAM & VPC](./21_AWS_IAM_VPC.md) - Deploy to the cloud! ☁️
