# Module 29: Distributed Tracing

## Table of Contents
- [Introduction to Distributed Tracing](#introduction)
- [Tracing Concepts](#concepts)
- [Jaeger Architecture](#jaeger)
- [OpenTelemetry](#opentelemetry)
- [Go Instrumentation](#go-instrumentation)
- [Trace Context Propagation](#propagation)
- [Sampling Strategies](#sampling)
- [Integration with Logs and Metrics](#integration)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)
- [Hands-On Exercise](#exercise)

---

## Introduction to Distributed Tracing {#introduction}

Distributed tracing tracks requests as they flow through microservices, providing end-to-end visibility.

### Why Distributed Tracing?

```
User Request → API Gateway → Auth Service → User Service → Database
                     ↓
               Product Service → Cache → Database
```

**Problems without tracing:**
- Which service is slow?
- Where did the request fail?
- What's the dependency graph?

**With tracing:**
- ✅ See complete request path
- ✅ Identify bottlenecks
- ✅ Track errors across services
- ✅ Measure latency contributions

### Tracing vs Logging vs Metrics

| Aspect | Tracing | Logging | Metrics |
|--------|---------|---------|---------|
| **Purpose** | Request flow | Events | Aggregated data |
| **Granularity** | Per-request | Per-event | Over time |
| **Use Case** | Debug latency | Error investigation | Alerting |
| **Example** | "Request took 500ms in Service A" | "Database error at 10:30" | "P95 latency: 200ms" |

---

## Tracing Concepts {#concepts}

### Core Terminology

**Trace**: End-to-end journey of a request
**Span**: Single operation within a trace
**Trace ID**: Unique identifier for entire trace
**Span ID**: Unique identifier for span
**Parent Span ID**: Links child spans to parent

### Trace Structure

```
Trace ID: abc123 (Total: 850ms)
├── Span: API Gateway (200ms)
│   ├── Span: Auth Service (50ms)
│   └── Span: User Service (150ms)
│       ├── Span: Database Query (100ms)
│       └── Span: Cache Lookup (20ms)
└── Span: Product Service (450ms)
    ├── Span: Inventory Check (200ms)
    └── Span: Price Calculation (250ms)
```

### Span Attributes

```json
{
  "trace_id": "abc123def456",
  "span_id": "span789",
  "parent_span_id": "span456",
  "operation_name": "GET /api/users",
  "start_time": "2024-12-10T10:30:00Z",
  "duration_ms": 150,
  "tags": {
    "http.method": "GET",
    "http.url": "/api/users",
    "http.status_code": 200,
    "service.name": "user-service",
    "db.type": "postgres",
    "db.statement": "SELECT * FROM users WHERE id = ?"
  },
  "logs": [
    {
      "timestamp": "2024-12-10T10:30:00.050Z",
      "event": "cache_miss",
      "key": "user:123"
    }
  ]
}
```

---

## Jaeger Architecture {#jaeger}

### Components

```
┌─────────────┐
│ Application │ Sends spans
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Jaeger Agent │ Local daemon (UDP)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Jaeger Collector│ Receives, processes, validates
└──────┬───────┘
       │
       ├─────────► ┌──────────────┐
       │           │ Storage      │ Cassandra, Elasticsearch, Kafka
       │           └──────────────┘
       │
       └─────────► ┌──────────────┐
                   │ Jaeger Query │ API for retrieving traces
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ Jaeger UI    │ Web interface
                   └──────────────┘
```

### Installation (Docker)

```yaml
# docker-compose.yml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    environment:
      - COLLECTOR_ZIPKIN_HTTP_PORT=9411
    ports:
      - "5775:5775/udp"  # Agent zipkin.thrift compact
      - "6831:6831/udp"  # Agent jaeger.thrift compact
      - "6832:6832/udp"  # Agent jaeger.thrift binary
      - "5778:5778"      # Agent config
      - "16686:16686"    # UI
      - "14268:14268"    # Collector HTTP
      - "9411:9411"      # Collector Zipkin
    networks:
      - tracing

networks:
  tracing:
```

```bash
docker-compose up -d

# Access Jaeger UI
open http://localhost:16686
```

### Kubernetes Deployment

```bash
# Using Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.50.0/jaeger-operator.yaml -n observability

# Deploy Jaeger instance
kubectl apply -f - <<EOF
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger
  namespace: observability
spec:
  strategy: allInOne
  storage:
    type: memory
    options:
      memory:
        max-traces: 100000
  ingress:
    enabled: true
  ui:
    options:
      dependencies:
        menuEnabled: true
EOF

# Access UI
kubectl port-forward -n observability svc/jaeger-query 16686:16686
```

---

## OpenTelemetry {#opentelemetry}

OpenTelemetry is the industry standard for observability instrumentation.

### Architecture

```
Application
    │
    ├── OpenTelemetry SDK
    │   ├── Tracer
    │   ├── Meter (metrics)
    │   └── Logger
    │
    ├── Exporters
    │   ├── Jaeger
    │   ├── Zipkin
    │   ├── Prometheus
    │   └── OTLP (OpenTelemetry Protocol)
    │
    └── Collectors (optional)
        └── Process, batch, export
```

### Benefits

✅ **Vendor-neutral**: Switch backends without code changes
✅ **Auto-instrumentation**: Libraries, frameworks, databases
✅ **Context propagation**: W3C Trace Context standard
✅ **Unified API**: Traces, metrics, logs

---

## Go Instrumentation {#go-instrumentation}

### Setup OpenTelemetry

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/trace
go get go.opentelemetry.io/otel/exporters/jaeger
go get go.opentelemetry.io/otel/sdk/trace
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

### Initialize Tracer

```go
package main

import (
    "context"
    "log"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func initTracer(serviceName string) (*sdktrace.TracerProvider, error) {
    // Create Jaeger exporter
    exporter, err := jaeger.New(jaeger.WithCollectorEndpoint(
        jaeger.WithEndpoint("http://localhost:14268/api/traces"),
    ))
    if err != nil {
        return nil, err
    }
    
    // Create resource
    res, err := resource.New(
        context.Background(),
        resource.WithAttributes(
            semconv.ServiceNameKey.String(serviceName),
            semconv.ServiceVersionKey.String("1.0.0"),
            attribute.String("environment", "production"),
        ),
    )
    if err != nil {
        return nil, err
    }
    
    // Create tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )
    
    otel.SetTracerProvider(tp)
    return tp, nil
}

func main() {
    tp, err := initTracer("my-service")
    if err != nil {
        log.Fatal(err)
    }
    defer func() {
        if err := tp.Shutdown(context.Background()); err != nil {
            log.Printf("Error shutting down tracer provider: %v", err)
        }
    }()
    
    // Your application code
}
```

### Manual Spans

```go
package main

import (
    "context"
    "time"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

func processOrder(ctx context.Context, orderID string) error {
    tracer := otel.Tracer("order-service")
    
    // Start span
    ctx, span := tracer.Start(ctx, "processOrder")
    defer span.End()
    
    // Add attributes
    span.SetAttributes(
        attribute.String("order.id", orderID),
        attribute.String("order.status", "processing"),
    )
    
    // Validate order
    if err := validateOrder(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Order validation failed")
        return err
    }
    
    // Check inventory
    if err := checkInventory(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Inventory check failed")
        return err
    }
    
    // Process payment
    if err := processPayment(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Payment failed")
        return err
    }
    
    span.SetAttributes(attribute.String("order.status", "completed"))
    span.SetStatus(codes.Ok, "Order processed successfully")
    return nil
}

func validateOrder(ctx context.Context, orderID string) error {
    _, span := otel.Tracer("order-service").Start(ctx, "validateOrder")
    defer span.End()
    
    // Add event
    span.AddEvent("Validating order fields")
    
    time.Sleep(50 * time.Millisecond)
    return nil
}

func checkInventory(ctx context.Context, orderID string) error {
    _, span := otel.Tracer("order-service").Start(ctx, "checkInventory")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("inventory.warehouse", "warehouse-1"),
        attribute.Int("inventory.available", 100),
    )
    
    time.Sleep(100 * time.Millisecond)
    return nil
}

func processPayment(ctx context.Context, orderID string) error {
    _, span := otel.Tracer("order-service").Start(ctx, "processPayment")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("payment.method", "credit_card"),
        attribute.Float64("payment.amount", 99.99),
    )
    
    time.Sleep(150 * time.Millisecond)
    return nil
}
```

### HTTP Server Instrumentation

```go
package main

import (
    "log"
    "net/http"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    tp, _ := initTracer("api-gateway")
    defer tp.Shutdown(context.Background())
    
    // Wrap handlers with otelhttp
    http.Handle("/api/users", otelhttp.NewHandler(
        http.HandlerFunc(usersHandler),
        "GET /api/users",
    ))
    
    http.Handle("/api/orders", otelhttp.NewHandler(
        http.HandlerFunc(ordersHandler),
        "POST /api/orders",
    ))
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tracer := otel.Tracer("api-gateway")
    
    // Create child span
    ctx, span := tracer.Start(ctx, "fetchUsers")
    defer span.End()
    
    // Call downstream service
    users, err := fetchUsersFromService(ctx)
    if err != nil {
        span.RecordError(err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    json.NewEncoder(w).Encode(users)
}
```

### HTTP Client Instrumentation

```go
package main

import (
    "context"
    "net/http"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func fetchUsersFromService(ctx context.Context) ([]User, error) {
    // Create HTTP client with tracing
    client := http.Client{
        Transport: otelhttp.NewTransport(http.DefaultTransport),
    }
    
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://user-service/users", nil)
    
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var users []User
    json.NewDecoder(resp.Body).Decode(&users)
    return users, nil
}
```

### Database Tracing

```go
package main

import (
    "context"
    "database/sql"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
)

func getUserByID(ctx context.Context, db *sql.DB, userID string) (*User, error) {
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "getUserByID")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("db.system", "postgresql"),
        attribute.String("db.operation", "SELECT"),
        attribute.String("db.table", "users"),
    )
    
    query := "SELECT id, name, email FROM users WHERE id = $1"
    span.SetAttributes(attribute.String("db.statement", query))
    
    var user User
    err := db.QueryRowContext(ctx, query, userID).Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Database query failed")
        return nil, err
    }
    
    span.SetStatus(codes.Ok, "")
    return &user, nil
}
```

---

## Trace Context Propagation {#propagation}

### W3C Trace Context

Headers automatically propagated:
```
traceparent: 00-abc123def456-span789-01
tracestate: vendor1=value1,vendor2=value2
```

### Manual Propagation

```go
package main

import (
    "context"
    "net/http"
    
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func callDownstreamService(ctx context.Context) error {
    client := &http.Client{}
    req, _ := http.NewRequest("GET", "http://downstream-service/api", nil)
    
    // Inject trace context into headers
    propagator := otel.GetTextMapPropagator()
    propagator.Inject(ctx, propagation.HeaderCarrier(req.Header))
    
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    
    return nil
}

func downstreamHandler(w http.ResponseWriter, r *http.Request) {
    // Extract trace context from headers
    propagator := otel.GetTextMapPropagator()
    ctx := propagator.Extract(r.Context(), propagation.HeaderCarrier(r.Header))
    
    // Continue trace
    tracer := otel.Tracer("downstream-service")
    ctx, span := tracer.Start(ctx, "handleRequest")
    defer span.End()
    
    // Process request...
}
```

---

## Sampling Strategies {#sampling}

### Sampling Types

**Always Sample** (development):
```go
sdktrace.WithSampler(sdktrace.AlwaysSample())
```

**Never Sample** (testing):
```go
sdktrace.WithSampler(sdktrace.NeverSample())
```

**Probabilistic** (production):
```go
// Sample 10% of traces
sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1))
```

**Parent-based** (default):
```go
// If parent is sampled, sample child
sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1)))
```

### Custom Sampler

```go
type CustomSampler struct {
    highPrioritySampler sdktrace.Sampler
    defaultSampler      sdktrace.Sampler
}

func (s *CustomSampler) ShouldSample(params sdktrace.SamplingParameters) sdktrace.SamplingResult {
    // Always sample errors
    if params.Attributes != nil {
        for _, attr := range params.Attributes {
            if attr.Key == "error" && attr.Value.AsBool() {
                return s.highPrioritySampler.ShouldSample(params)
            }
        }
    }
    
    // Sample slow requests
    // (requires custom logic based on span duration)
    
    return s.defaultSampler.ShouldSample(params)
}

func NewCustomSampler() sdktrace.Sampler {
    return &CustomSampler{
        highPrioritySampler: sdktrace.AlwaysSample(),
        defaultSampler:      sdktrace.TraceIDRatioBased(0.01), // 1%
    }
}
```

---

## Integration with Logs and Metrics {#integration}

### Correlate Traces with Logs

```go
package main

import (
    "context"
    "encoding/json"
    "os"
    
    "go.opentelemetry.io/otel/trace"
)

type LogEntry struct {
    Timestamp string `json:"@timestamp"`
    Level     string `json:"level"`
    Message   string `json:"message"`
    TraceID   string `json:"trace_id,omitempty"`
    SpanID    string `json:"span_id,omitempty"`
}

func logWithTrace(ctx context.Context, level, message string) {
    entry := LogEntry{
        Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
        Level:     level,
        Message:   message,
    }
    
    // Extract trace context
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        entry.TraceID = span.SpanContext().TraceID().String()
        entry.SpanID = span.SpanContext().SpanID().String()
    }
    
    json.NewEncoder(os.Stdout).Encode(entry)
}

// Usage
func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    logWithTrace(ctx, "INFO", "Processing request")
    
    // In Kibana, search by trace_id to see all logs for this request
    // In Jaeger, see logs attached to span
}
```

### Add Trace Links to Metrics

```go
package main

import (
    "context"
    
    "github.com/prometheus/client_golang/prometheus"
    "go.opentelemetry.io/otel/trace"
)

var requestDuration = prometheus.NewHistogramVec(
    prometheus.HistogramOpts{
        Name: "http_request_duration_seconds",
        Help: "HTTP request duration",
    },
    []string{"method", "endpoint", "trace_id"},
)

func recordMetricWithTrace(ctx context.Context, method, endpoint string, duration float64) {
    traceID := ""
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        traceID = span.SpanContext().TraceID().String()
    }
    
    requestDuration.WithLabelValues(method, endpoint, traceID).Observe(duration)
}
```

---

## Best Practices {#best-practices}

### 1. Span Naming

```go
// ✅ Good: Clear operation names
"GET /api/users"
"processOrder"
"database.query"

// ❌ Bad: Generic names
"handler"
"method1"
"doWork"
```

### 2. Attributes

```go
// ✅ Good: Semantic conventions
span.SetAttributes(
    semconv.HTTPMethodKey.String("GET"),
    semconv.HTTPURLKey.String("/api/users"),
    semconv.HTTPStatusCodeKey.Int(200),
)

// ❌ Bad: Non-standard attributes
span.SetAttributes(
    attribute.String("method", "GET"),
    attribute.String("url", "/api/users"),
)
```

### 3. Error Handling

```go
// ✅ Good: Record errors with context
if err != nil {
    span.RecordError(err)
    span.SetStatus(codes.Error, "Database connection failed")
    span.SetAttributes(attribute.String("error.type", "connection_timeout"))
    return err
}

// ❌ Bad: Silent failure
if err != nil {
    return err
}
```

### 4. Sampling Strategy

```
Development: AlwaysSample()
Staging: TraceIDRatioBased(0.5)  // 50%
Production: TraceIDRatioBased(0.01)  // 1%
Critical paths: Always sample errors and slow requests
```

### 5. Span Lifecycle

```go
// ✅ Good: Defer span.End()
ctx, span := tracer.Start(ctx, "operation")
defer span.End()

// Do work...

// ❌ Bad: Manual span.End() (easy to forget)
ctx, span := tracer.Start(ctx, "operation")
// Do work...
span.End()
```

---

## Interview Questions {#interview-questions}

**Q1: What is the difference between a trace and a span?**

**A:**
- **Trace**: Complete journey of a request across all services
- **Span**: Single operation within a trace (e.g., database query, HTTP call)
- Relationship: Trace contains multiple spans organized hierarchically

**Q2: How does distributed tracing work across services?**

**A:**
1. Generate trace ID and span ID at entry point
2. Pass trace context via HTTP headers (W3C Trace Context)
3. Each service extracts context, creates child spans
4. All spans sent to collector with same trace ID
5. Collector stitches spans into complete trace

**Q3: What is sampling and why is it important?**

**A:**
Sampling reduces overhead by collecting subset of traces.
- **100% sampling**: High overhead, expensive storage
- **1% sampling**: Low overhead, might miss issues
- **Strategies**: Probabilistic, always sample errors, tail-based sampling

**Q4: How do you correlate traces with logs?**

**A:**
1. Extract trace ID and span ID from context
2. Include in log structured format
3. Search logs by trace ID in Kibana
4. Link from Jaeger UI to logs
5. See complete picture: trace + logs + metrics

**Q5: What are semantic conventions in OpenTelemetry?**

**A:**
Standard attribute names for common operations:
- `http.method`, `http.url`, `http.status_code`
- `db.system`, `db.operation`, `db.statement`
- `messaging.system`, `messaging.destination`

Benefits: Consistency, backend compatibility, automatic visualization

---

## Hands-On Exercise {#exercise}

### Build a Traced Microservices System

**Goal**: Implement distributed tracing across 3 services.

#### Architecture

```
API Gateway → User Service → Database
         ↓
    Product Service → Cache
```

#### Service 1: API Gateway

```go
// api-gateway/main.go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
)

func main() {
    tp, _ := initTracer("api-gateway")
    defer tp.Shutdown(context.Background())
    
    http.Handle("/api/dashboard", otelhttp.NewHandler(
        http.HandlerFunc(dashboardHandler),
        "GET /api/dashboard",
    ))
    
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func dashboardHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    tracer := otel.Tracer("api-gateway")
    
    ctx, span := tracer.Start(ctx, "fetchDashboard")
    defer span.End()
    
    // Parallel calls
    userCh := make(chan *User)
    productsCh := make(chan []Product)
    
    go func() {
        user, _ := fetchUser(ctx)
        userCh <- user
    }()
    
    go func() {
        products, _ := fetchProducts(ctx)
        productsCh <- products
    }()
    
    dashboard := Dashboard{
        User:     <-userCh,
        Products: <-productsCh,
    }
    
    json.NewEncoder(w).Encode(dashboard)
}

func fetchUser(ctx context.Context) (*User, error) {
    client := http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://user-service:8081/user", nil)
    
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var user User
    json.NewDecoder(resp.Body).Decode(&user)
    return &user, nil
}

func fetchProducts(ctx context.Context) ([]Product, error) {
    client := http.Client{Transport: otelhttp.NewTransport(http.DefaultTransport)}
    req, _ := http.NewRequestWithContext(ctx, "GET", "http://product-service:8082/products", nil)
    
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var products []Product
    json.NewDecoder(resp.Body).Decode(&products)
    return products, nil
}
```

#### Service 2: User Service

```go
// user-service/main.go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

var db *sql.DB

func main() {
    tp, _ := initTracer("user-service")
    defer tp.Shutdown(context.Background())
    
    db, _ = sql.Open("postgres", "postgres://user:pass@db:5432/mydb")
    
    http.Handle("/user", otelhttp.NewHandler(
        http.HandlerFunc(userHandler),
        "GET /user",
    ))
    
    log.Fatal(http.ListenAndServe(":8081", nil))
}

func userHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    user, err := getUserFromDB(ctx, "user123")
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    json.NewEncoder(w).Encode(user)
}

func getUserFromDB(ctx context.Context, userID string) (*User, error) {
    tracer := otel.Tracer("user-service")
    ctx, span := tracer.Start(ctx, "getUserFromDB")
    defer span.End()
    
    span.SetAttributes(
        attribute.String("db.system", "postgresql"),
        attribute.String("db.operation", "SELECT"),
    )
    
    var user User
    query := "SELECT id, name, email FROM users WHERE id = $1"
    err := db.QueryRowContext(ctx, query, userID).Scan(&user.ID, &user.Name, &user.Email)
    
    if err != nil {
        span.RecordError(err)
        return nil, err
    }
    
    return &user, nil
}
```

#### Service 3: Product Service

```go
// product-service/main.go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "time"
    
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
)

func main() {
    tp, _ := initTracer("product-service")
    defer tp.Shutdown(context.Background())
    
    http.Handle("/products", otelhttp.NewHandler(
        http.HandlerFunc(productsHandler),
        "GET /products",
    ))
    
    log.Fatal(http.ListenAndServe(":8082", nil))
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    
    // Check cache
    products, err := getFromCache(ctx)
    if err == nil {
        json.NewEncoder(w).Encode(products)
        return
    }
    
    // Cache miss, fetch from database
    products, _ = getFromDatabase(ctx)
    json.NewEncoder(w).Encode(products)
}

func getFromCache(ctx context.Context) ([]Product, error) {
    tracer := otel.Tracer("product-service")
    ctx, span := tracer.Start(ctx, "getFromCache")
    defer span.End()
    
    span.SetAttributes(attribute.String("cache.key", "products:all"))
    
    time.Sleep(10 * time.Millisecond)
    
    // Simulate cache miss
    span.AddEvent("cache_miss")
    return nil, errors.New("cache miss")
}

func getFromDatabase(ctx context.Context) ([]Product, error) {
    tracer := otel.Tracer("product-service")
    ctx, span := tracer.Start(ctx, "getFromDatabase")
    defer span.End()
    
    time.Sleep(100 * time.Millisecond)
    
    products := []Product{
        {ID: "1", Name: "Product 1", Price: 29.99},
        {ID: "2", Name: "Product 2", Price: 49.99},
    }
    
    return products, nil
}
```

#### Testing

```bash
# Generate traffic
for i in {1..100}; do
  curl http://localhost:8080/api/dashboard
  sleep 0.5
done

# View traces in Jaeger UI
open http://localhost:16686

# Search for:
# - Service: api-gateway
# - Operation: GET /api/dashboard
# - Click trace to see waterfall
# - See parallel user/product fetches
# - Identify slowest operations
```

---

## Summary

You've learned:
- ✅ Distributed tracing concepts (traces, spans, context)
- ✅ Jaeger architecture and deployment
- ✅ OpenTelemetry instrumentation in Go
- ✅ Trace context propagation across services
- ✅ Sampling strategies for production
- ✅ Integration with logs and metrics
- ✅ Best practices for span naming and attributes

**Next Module**: [Module 30: Production Best Practices](30_Production_Best_Practices.md) - Learn deployment strategies, security, and disaster recovery.
