# Module 17: Microservices Architecture 🔄

## Build Scalable Distributed Systems with Microservices

**Duration:** 6-7 hours  
**Prerequisites:** Module 16 (System Design), Go REST APIs, Docker basics  
**Outcome:** Design, build, and deploy production-ready microservices

---

## 📚 Table of Contents

1. [Microservices Overview](#microservices-overview)
2. [Service Design Principles](#service-design-principles)
3. [Service Communication](#service-communication)
4. [API Gateway](#api-gateway)
5. [Service Discovery](#service-discovery)
6. [Circuit Breaker](#circuit-breaker)
7. [Service Mesh](#service-mesh)
8. [Data Management](#data-management)
9. [Best Practices](#best-practices)
10. [Interview Questions](#interview-questions)
11. [Hands-On Exercise](#hands-on-exercise)

---

## Microservices Overview

### Monolith vs Microservices

```
MONOLITH:
┌─────────────────────────────┐
│      Single Application     │
│  ┌──────┬──────┬──────┐    │
│  │ Auth │Orders│Users │    │
│  └──────┴──────┴──────┘    │
│          ↓                  │
│    Single Database          │
└─────────────────────────────┘

✅ Simple deployment
✅ Easy local development
❌ Tight coupling
❌ Hard to scale specific features
❌ Technology stack locked

MICROSERVICES:
┌──────────┐  ┌──────────┐  ┌──────────┐
│Auth Svc  │  │Order Svc │  │User Svc  │
│   ↓      │  │   ↓      │  │   ↓      │
│Auth DB   │  │Order DB  │  │User DB   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     └──────────┬──────────────────┘
           API Gateway

✅ Independent deployment
✅ Technology diversity
✅ Scalable per service
❌ Complex operations
❌ Distributed system challenges
```

### When to Use Microservices

```
✅ Large team (>50 developers)
✅ Need independent scaling
✅ Different technology requirements
✅ Frequent deployments
✅ Complex domain (bounded contexts)

❌ Small team (<10 developers)
❌ Simple application
❌ Tight coupling between features
❌ Limited DevOps expertise
```

---

## Service Design Principles

### 1. Single Responsibility

```
Each service owns one business capability:

✅ User Service: User management
✅ Order Service: Order processing
✅ Payment Service: Payment handling
✅ Notification Service: Email/SMS

❌ UserOrderPayment Service (too much)
```

### 2. Bounded Context (DDD)

```
Define clear boundaries:

User Context:
- User registration
- User profiles
- Authentication

Order Context:
- Order creation
- Order tracking
- Order history

Each context = separate service
```

### 3. Service Structure

```
user-service/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── handlers/             # HTTP handlers
│   │   └── user_handler.go
│   ├── service/              # Business logic
│   │   └── user_service.go
│   ├── repository/           # Data access
│   │   └── user_repository.go
│   └── models/               # Domain models
│       └── user.go
├── pkg/                      # Shared packages
│   ├── config/
│   ├── logger/
│   └── middleware/
├── api/                      # API definitions
│   └── openapi.yaml
├── Dockerfile
├── docker-compose.yml
└── go.mod
```

---

## Service Communication

### Synchronous (HTTP/gRPC)

#### REST API

```go
// user-service/internal/handlers/user_handler.go
package handlers

import (
    "encoding/json"
    "net/http"
    "github.com/gorilla/mux"
)

type UserHandler struct {
    service UserService
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    userID := vars["id"]
    
    user, err := h.service.GetUser(userID)
    if err != nil {
        http.Error(w, err.Error(), http.StatusNotFound)
        return
    }
    
    json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
    var user User
    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    created, err := h.service.CreateUser(&user)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(created)
}

// Register routes
func (h *UserHandler) RegisterRoutes(r *mux.Router) {
    r.HandleFunc("/users/{id}", h.GetUser).Methods("GET")
    r.HandleFunc("/users", h.CreateUser).Methods("POST")
}
```

#### gRPC (High Performance)

```protobuf
// api/user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (UserResponse);
  rpc CreateUser(CreateUserRequest) returns (UserResponse);
}

message GetUserRequest {
  string id = 1;
}

message CreateUserRequest {
  string username = 1;
  string email = 2;
}

message UserResponse {
  string id = 1;
  string username = 2;
  string email = 3;
  string created_at = 4;
}
```

```go
// Generate code: protoc --go_out=. --go-grpc_out=. api/user.proto

// Server implementation
type server struct {
    pb.UnimplementedUserServiceServer
    userService UserService
}

func (s *server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.UserResponse, error) {
    user, err := s.userService.GetUser(req.Id)
    if err != nil {
        return nil, err
    }
    
    return &pb.UserResponse{
        Id:        user.ID,
        Username:  user.Username,
        Email:     user.Email,
        CreatedAt: user.CreatedAt.String(),
    }, nil
}

// Start gRPC server
func main() {
    lis, _ := net.Listen("tcp", ":50051")
    grpcServer := grpc.NewServer()
    pb.RegisterUserServiceServer(grpcServer, &server{})
    grpcServer.Serve(lis)
}
```

### Asynchronous (Message Queue)

```go
// Order service publishes event
import "github.com/streadway/amqp"

func PublishOrderCreated(orderID string) error {
    conn, _ := amqp.Dial("amqp://guest:guest@rabbitmq:5672/")
    defer conn.Close()
    
    ch, _ := conn.Channel()
    defer ch.Close()
    
    event := OrderCreatedEvent{
        OrderID:   orderID,
        UserID:    "user123",
        Timestamp: time.Now(),
    }
    
    body, _ := json.Marshal(event)
    
    return ch.Publish(
        "orders",           // exchange
        "order.created",    // routing key
        false,
        false,
        amqp.Publishing{
            ContentType: "application/json",
            Body:        body,
        },
    )
}

// Notification service consumes event
func ConsumeOrderEvents() {
    conn, _ := amqp.Dial("amqp://guest:guest@rabbitmq:5672/")
    defer conn.Close()
    
    ch, _ := conn.Channel()
    defer ch.Close()
    
    msgs, _ := ch.Consume(
        "order-notifications", // queue
        "",                    // consumer
        true,                  // auto-ack
        false,
        false,
        false,
        nil,
    )
    
    for msg := range msgs {
        var event OrderCreatedEvent
        json.Unmarshal(msg.Body, &event)
        
        // Send notification
        sendEmail(event.UserID, "Order created: "+event.OrderID)
    }
}
```

---

## API Gateway

### What is API Gateway?

**Single entry point** for all client requests. Routes to appropriate microservices.

### Responsibilities

```
1. Routing:           Client → Gateway → Service
2. Authentication:    Verify JWT tokens
3. Rate Limiting:     Prevent abuse
4. Load Balancing:    Distribute requests
5. Request/Response:  Transform data
6. Caching:           Cache responses
7. Logging:           Centralized logging
```

### Implementation with Gin

```go
// api-gateway/main.go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
    "net/http/httputil"
    "net/url"
)

type Gateway struct {
    userServiceURL    *url.URL
    orderServiceURL   *url.URL
    productServiceURL *url.URL
}

func NewGateway() *Gateway {
    userURL, _ := url.Parse("http://user-service:8080")
    orderURL, _ := url.Parse("http://order-service:8080")
    productURL, _ := url.Parse("http://product-service:8080")
    
    return &Gateway{
        userServiceURL:    userURL,
        orderServiceURL:   orderURL,
        productServiceURL: productURL,
    }
}

func (g *Gateway) proxyTo(target *url.URL) gin.HandlerFunc {
    return func(c *gin.Context) {
        proxy := httputil.NewSingleHostReverseProxy(target)
        proxy.Director = func(req *http.Request) {
            req.Header = c.Request.Header
            req.Host = target.Host
            req.URL.Scheme = target.Scheme
            req.URL.Host = target.Host
            req.URL.Path = c.Request.URL.Path
        }
        
        proxy.ServeHTTP(c.Writer, c.Request)
    }
}

// Authentication middleware
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        if token == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "No token"})
            c.Abort()
            return
        }
        
        // Validate JWT (simplified)
        if !validateToken(token) {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}

// Rate limiting middleware
func RateLimitMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Implement rate limiting logic
        c.Next()
    }
}

func main() {
    gateway := NewGateway()
    r := gin.Default()
    
    // Global middlewares
    r.Use(RateLimitMiddleware())
    
    // Public routes
    r.POST("/auth/login", gateway.proxyTo(gateway.userServiceURL))
    r.POST("/auth/register", gateway.proxyTo(gateway.userServiceURL))
    
    // Protected routes
    protected := r.Group("/")
    protected.Use(AuthMiddleware())
    {
        // User service
        protected.GET("/users/:id", gateway.proxyTo(gateway.userServiceURL))
        protected.PUT("/users/:id", gateway.proxyTo(gateway.userServiceURL))
        
        // Order service
        protected.GET("/orders", gateway.proxyTo(gateway.orderServiceURL))
        protected.POST("/orders", gateway.proxyTo(gateway.orderServiceURL))
        
        // Product service
        protected.GET("/products", gateway.proxyTo(gateway.productServiceURL))
        protected.GET("/products/:id", gateway.proxyTo(gateway.productServiceURL))
    }
    
    r.Run(":8000")
}
```

---

## Service Discovery

### What is Service Discovery?

**Automatic detection** of service instances. Services register themselves, clients discover them.

### Consul Example

```go
// Register service with Consul
import "github.com/hashicorp/consul/api"

func RegisterService() error {
    config := api.DefaultConfig()
    config.Address = "consul:8500"
    
    client, err := api.NewClient(config)
    if err != nil {
        return err
    }
    
    registration := &api.AgentServiceRegistration{
        ID:      "user-service-1",
        Name:    "user-service",
        Port:    8080,
        Address: "192.168.1.10",
        Tags:    []string{"v1", "production"},
        Check: &api.AgentServiceCheck{
            HTTP:     "http://192.168.1.10:8080/health",
            Interval: "10s",
            Timeout:  "2s",
        },
    }
    
    return client.Agent().ServiceRegister(registration)
}

// Discover service
func DiscoverService(serviceName string) (string, error) {
    config := api.DefaultConfig()
    client, _ := api.NewClient(config)
    
    services, _, err := client.Health().Service(serviceName, "", true, nil)
    if err != nil {
        return "", err
    }
    
    if len(services) == 0 {
        return "", errors.New("no healthy instances")
    }
    
    // Simple round-robin (use real LB in production)
    service := services[0]
    address := fmt.Sprintf("http://%s:%d", service.Service.Address, service.Service.Port)
    
    return address, nil
}

// Usage
func CallUserService() {
    serviceURL, _ := DiscoverService("user-service")
    resp, _ := http.Get(serviceURL + "/users/123")
    // ...
}
```

---

## Circuit Breaker

### Why Circuit Breaker?

**Prevent cascading failures**. If service is down, fail fast instead of waiting for timeout.

### States

```
CLOSED (Normal):
- Requests pass through
- Failures counted
- If failures > threshold → OPEN

OPEN (Failing):
- Requests immediately rejected
- After timeout → HALF_OPEN

HALF_OPEN (Testing):
- Limited requests allowed
- If success → CLOSED
- If failure → OPEN
```

### Implementation

```go
package circuitbreaker

import (
    "errors"
    "sync"
    "time"
)

type State int

const (
    StateClosed State = iota
    StateOpen
    StateHalfOpen
)

type CircuitBreaker struct {
    maxFailures  int
    timeout      time.Duration
    state        State
    failures     int
    lastFailTime time.Time
    mu           sync.Mutex
}

func New(maxFailures int, timeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        maxFailures: maxFailures,
        timeout:     timeout,
        state:       StateClosed,
    }
}

func (cb *CircuitBreaker) Call(fn func() error) error {
    cb.mu.Lock()
    
    // Check if we should transition from OPEN to HALF_OPEN
    if cb.state == StateOpen {
        if time.Since(cb.lastFailTime) > cb.timeout {
            cb.state = StateHalfOpen
            cb.failures = 0
        } else {
            cb.mu.Unlock()
            return errors.New("circuit breaker is open")
        }
    }
    
    cb.mu.Unlock()
    
    // Try the call
    err := fn()
    
    cb.mu.Lock()
    defer cb.mu.Unlock()
    
    if err != nil {
        cb.failures++
        cb.lastFailTime = time.Now()
        
        if cb.failures >= cb.maxFailures {
            cb.state = StateOpen
        }
        return err
    }
    
    // Success - reset to CLOSED
    cb.state = StateClosed
    cb.failures = 0
    
    return nil
}

// Usage
var userServiceCB = circuitbreaker.New(5, 30*time.Second)

func GetUser(id string) (*User, error) {
    var user *User
    
    err := userServiceCB.Call(func() error {
        resp, err := http.Get("http://user-service/users/" + id)
        if err != nil {
            return err
        }
        defer resp.Body.Close()
        
        if resp.StatusCode != 200 {
            return errors.New("user service error")
        }
        
        return json.NewDecoder(resp.Body).Decode(&user)
    })
    
    return user, err
}
```

---

## Service Mesh

### What is Service Mesh?

**Infrastructure layer** for service-to-service communication. Handles networking, security, observability.

### Istio Architecture

```
Application Pod:
┌─────────────────────────┐
│  App Container          │
│  (user-service:8080)    │
└───────────┬─────────────┘
            │
┌───────────▼─────────────┐
│  Envoy Sidecar Proxy    │  ← Injected by Istio
│  (intercepts traffic)   │
└─────────────────────────┘

Control Plane (Istiod):
- Traffic Management
- Security (mTLS)
- Observability
```

### Deploy with Istio

```yaml
# user-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  selector:
    app: user-service
  ports:
    - port: 8080

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: user-service:1.0
          ports:
            - containerPort: 8080
```

### Traffic Splitting (Canary)

```yaml
# VirtualService for canary deployment
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
    - user-service
  http:
    - match:
        - headers:
            user-agent:
              regex: ".*Mobile.*"
      route:
        - destination:
            host: user-service
            subset: v2
          weight: 100
    - route:
        - destination:
            host: user-service
            subset: v1
          weight: 90
        - destination:
            host: user-service
            subset: v2
          weight: 10  # 10% traffic to v2

---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

### Circuit Breaking (Istio)

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

---

## Data Management

### Database Per Service

```
user-service → user_db (PostgreSQL)
order-service → order_db (PostgreSQL)
product-service → product_db (MongoDB)
```

### Handling Distributed Transactions

#### Saga Pattern

```go
// Order creation saga
type OrderSaga struct {
    orderService    OrderService
    paymentService  PaymentService
    inventoryService InventoryService
}

func (s *OrderSaga) CreateOrder(order *Order) error {
    // Step 1: Create order
    orderID, err := s.orderService.Create(order)
    if err != nil {
        return err
    }
    
    // Step 2: Process payment
    err = s.paymentService.Charge(order.UserID, order.Total)
    if err != nil {
        // Compensate: Cancel order
        s.orderService.Cancel(orderID)
        return err
    }
    
    // Step 3: Reserve inventory
    err = s.inventoryService.Reserve(order.ProductID, order.Quantity)
    if err != nil {
        // Compensate: Refund payment
        s.paymentService.Refund(order.UserID, order.Total)
        // Compensate: Cancel order
        s.orderService.Cancel(orderID)
        return err
    }
    
    // Success - confirm order
    s.orderService.Confirm(orderID)
    return nil
}
```

### Event Sourcing

```go
// Store events instead of current state
type Event struct {
    AggregateID string
    Type        string
    Data        json.RawMessage
    Timestamp   time.Time
}

type OrderEvents struct {
    OrderCreated  Event
    PaymentCharged Event
    OrderShipped  Event
}

// Rebuild state from events
func ReconstructOrder(orderID string) (*Order, error) {
    events, _ := eventStore.GetEvents(orderID)
    
    order := &Order{ID: orderID}
    
    for _, event := range events {
        switch event.Type {
        case "OrderCreated":
            var data OrderCreatedData
            json.Unmarshal(event.Data, &data)
            order.UserID = data.UserID
            order.Total = data.Total
            
        case "PaymentCharged":
            order.Status = "paid"
            
        case "OrderShipped":
            order.Status = "shipped"
        }
    }
    
    return order, nil
}
```

---

## Best Practices

### 1. Service Independence

```
✅ Each service has own database
✅ No shared libraries (except contracts)
✅ Independent deployment
✅ Backward compatible APIs

❌ Shared database
❌ Tight coupling
❌ Synchronous dependencies
```

### 2. API Versioning

```go
// URL versioning
r.HandleFunc("/v1/users/{id}", GetUserV1)
r.HandleFunc("/v2/users/{id}", GetUserV2)

// Header versioning
if r.Header.Get("API-Version") == "2" {
    GetUserV2(w, r)
} else {
    GetUserV1(w, r)
}
```

### 3. Health Checks

```go
func HealthCheck(w http.ResponseWriter, r *http.Request) {
    health := map[string]string{
        "status": "healthy",
        "timestamp": time.Now().String(),
    }
    
    // Check dependencies
    if err := db.Ping(); err != nil {
        health["status"] = "unhealthy"
        health["database"] = "unreachable"
        w.WriteHeader(http.StatusServiceUnavailable)
    }
    
    json.NewEncoder(w).Encode(health)
}
```

### 4. Structured Logging

```go
import "github.com/sirupsen/logrus"

log := logrus.WithFields(logrus.Fields{
    "service": "user-service",
    "request_id": requestID,
    "user_id": userID,
})

log.Info("User created successfully")
log.WithError(err).Error("Failed to create user")
```

### 5. Distributed Tracing

```go
import "go.opentelemetry.io/otel"

func GetUser(ctx context.Context, id string) (*User, error) {
    ctx, span := otel.Tracer("user-service").Start(ctx, "GetUser")
    defer span.End()
    
    span.SetAttributes(attribute.String("user.id", id))
    
    // Database call
    user, err := db.GetUser(ctx, id)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }
    
    return user, nil
}
```

---

## Interview Questions

**Q1: Microservices vs Monolith - when to use each?**

**Answer:**
- **Monolith**: Small team, simple domain, tight coupling acceptable, startup phase
- **Microservices**: Large team, complex domain, independent scaling needed, polyglot persistence

Monolith is simpler initially, microservices scale better organizationally.

**Q2: How do you handle transactions across microservices?**

**Answer:** Use Saga pattern:
- **Choreography**: Services emit events, others react (decentralized)
- **Orchestration**: Central coordinator (more control, easier debugging)
Implement compensating transactions for rollback. Avoid distributed transactions (2PC) - performance penalty.

**Q3: What is API Gateway and why use it?**

**Answer:** Single entry point for clients. Benefits:
- Authentication/authorization in one place
- Rate limiting
- Request routing to services
- Response aggregation (multiple services → one response)
- Protocol translation (HTTP → gRPC)
Examples: Kong, AWS API Gateway, custom (Nginx/Envoy).

**Q4: Explain service mesh.**

**Answer:** Infrastructure layer for service communication. Sidecar proxy (Envoy) intercepts all traffic. Provides:
- mTLS encryption
- Traffic management (canary, blue-green)
- Circuit breaking, retries
- Observability (metrics, traces)
Examples: Istio, Linkerd, Consul Connect.

**Q5: How do you test microservices?**

**Answer:**
1. **Unit tests**: Individual functions
2. **Integration tests**: Service + database
3. **Contract tests**: API contracts (Pact)
4. **E2E tests**: Full flow across services
5. **Chaos testing**: Random service failures (Chaos Monkey)

Use test doubles (mocks) for dependencies in integration tests.

---

## Hands-On Exercise

### Task: Build E-Commerce Microservices

```
Services:
1. User Service (8081)
2. Product Service (8082)
3. Order Service (8083)
4. API Gateway (8000)
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  user-service:
    build: ./user-service
    ports:
      - "8081:8080"
    environment:
      DB_URL: postgres://user:pass@user-db:5432/users
    depends_on:
      - user-db

  product-service:
    build: ./product-service
    ports:
      - "8082:8080"
    environment:
      DB_URL: postgres://user:pass@product-db:5432/products
    depends_on:
      - product-db

  order-service:
    build: ./order-service
    ports:
      - "8083:8080"
    environment:
      DB_URL: postgres://user:pass@order-db:5432/orders
      USER_SERVICE_URL: http://user-service:8080
      PRODUCT_SERVICE_URL: http://product-service:8080
    depends_on:
      - order-db

  api-gateway:
    build: ./api-gateway
    ports:
      - "8000:8000"
    environment:
      USER_SERVICE_URL: http://user-service:8080
      PRODUCT_SERVICE_URL: http://product-service:8080
      ORDER_SERVICE_URL: http://order-service:8080

  user-db:
    image: postgres:15
    environment:
      POSTGRES_DB: users
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass

  product-db:
    image: postgres:15
    environment:
      POSTGRES_DB: products
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass

  order-db:
    image: postgres:15
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass

  consul:
    image: consul:latest
    ports:
      - "8500:8500"
```

### Test

```bash
# Start all services
docker-compose up -d

# Create user
curl -X POST http://localhost:8000/users \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@example.com"}'

# Create product
curl -X POST http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":1299.99,"stock":10}'

# Create order
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"user_id":"1","product_id":"1","quantity":1}'

# Check order
curl http://localhost:8000/orders/1 \
  -H "Authorization: Bearer <token>"
```

---

## 📚 Additional Resources

- [Microservices Patterns (Chris Richardson)](https://microservices.io/patterns/)
- [Building Microservices (Sam Newman)](https://samnewman.io/books/building_microservices/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [gRPC Documentation](https://grpc.io/docs/)

---

## ✅ Module Checklist

- [ ] Understand microservices principles
- [ ] Design bounded contexts
- [ ] Implement service-to-service communication (REST, gRPC)
- [ ] Build API Gateway
- [ ] Configure service discovery (Consul)
- [ ] Implement circuit breaker
- [ ] Deploy with service mesh (Istio)
- [ ] Handle distributed transactions (Saga)
- [ ] Complete e-commerce microservices exercise

---

**Next Module:** [Module 18: Authentication & Authorization](./18_Authentication_Authorization.md) - Secure your services! 🔐
