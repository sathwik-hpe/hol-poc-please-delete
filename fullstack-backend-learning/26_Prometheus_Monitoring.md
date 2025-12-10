# Module 26: Prometheus Monitoring

## Table of Contents
- [Introduction to Prometheus](#introduction)
- [Prometheus Architecture](#architecture)
- [Metrics and Data Model](#metrics)
- [PromQL Query Language](#promql)
- [Exporters and Instrumentation](#exporters)
- [Service Discovery](#service-discovery)
- [Alerting Rules](#alerting)
- [Go Application Instrumentation](#go-instrumentation)
- [Kubernetes Monitoring](#kubernetes)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)
- [Hands-On Exercise](#exercise)

---

## Introduction to Prometheus {#introduction}

Prometheus is an open-source monitoring and alerting toolkit designed for reliability and scalability.

### Key Features

1. **Multi-dimensional data model** with time series data
2. **PromQL** - powerful query language
3. **Pull-based** metric collection
4. **Service discovery** for dynamic environments
5. **Built-in alerting** with Alertmanager integration

### Architecture Components

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Targets   │◄────│  Prometheus  │─────►│ Alertmanager│
│ (Exporters) │      │    Server    │      └─────────────┘
└─────────────┘      └──────┬───────┘
                            │
                            ▼
                     ┌─────────────┐
                     │   Grafana   │
                     │ (Visualization)
                     └─────────────┘
```

### When to Use Prometheus

✅ **Good For:**
- Microservices monitoring
- Kubernetes/container environments
- Time-series metrics (CPU, memory, request rates)
- Dynamic service discovery
- Alerting on metric thresholds

❌ **Not Ideal For:**
- Long-term data storage (>2 weeks)
- Event logging (use EFK/ELK instead)
- Distributed tracing (use Jaeger/Zipkin)
- High-cardinality data

---

## Prometheus Architecture {#architecture}

### Core Components

```yaml
# Prometheus ecosystem
prometheus-server:
  - Scrapes and stores metrics
  - Evaluates alerting rules
  - Provides PromQL query interface
  
exporters:
  - node_exporter: System metrics (CPU, disk, network)
  - blackbox_exporter: Probe endpoints (HTTP, TCP, ICMP)
  - custom_exporters: Application-specific metrics
  
pushgateway:
  - For short-lived jobs that can't be scraped
  
alertmanager:
  - Handles alerts from Prometheus
  - Deduplication, grouping, routing
  - Sends notifications (email, Slack, PagerDuty)
```

### Scraping Model

Prometheus pulls metrics from targets (HTTP endpoints):

```
┌─────────────┐
│ Application │ :9090/metrics
└──────▲──────┘
       │ HTTP GET (scrape)
       │
┌──────┴──────┐
│ Prometheus  │
│   Server    │
└─────────────┘
```

### Installation (Docker)

```bash
# docker-compose.yml
version: '3'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
    
  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

volumes:
  prometheus-data:
```

### Basic Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s      # How often to scrape targets
  evaluation_interval: 15s  # How often to evaluate rules

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# Load rules once and periodically evaluate them
rule_files:
  - "alerts/*.yml"

# Scrape configurations
scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  
  # Node exporter
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
  
  # Go application
  - job_name: 'myapp'
    static_configs:
      - targets: ['myapp:8080']
```

---

## Metrics and Data Model {#metrics}

### Metric Types

1. **Counter**: Monotonically increasing value (requests, errors)
2. **Gauge**: Can go up and down (temperature, memory usage)
3. **Histogram**: Samples observations (request durations, response sizes)
4. **Summary**: Similar to histogram with quantiles

### Time Series Structure

```
metric_name{label1="value1", label2="value2"} value timestamp
```

Example:
```
http_requests_total{method="GET", endpoint="/api/users", status="200"} 1234 1638360000
```

### Metric Naming Conventions

```
# Format: <namespace>_<subsystem>_<name>_<unit>

# Counters (always end with _total)
http_requests_total
api_errors_total
db_queries_total

# Gauges
memory_usage_bytes
cpu_usage_percent
active_connections

# Histograms (with _bucket, _sum, _count)
http_request_duration_seconds
response_size_bytes
```

### Labels Best Practices

```yaml
# Good labels (low cardinality)
http_requests_total{
  method: "GET",           # Limited values: GET, POST, PUT, DELETE
  endpoint: "/api/users",  # Group by route pattern, not individual IDs
  status: "200"            # HTTP status codes
}

# Bad labels (high cardinality - AVOID)
http_requests_total{
  user_id: "12345",        # Millions of unique values
  request_id: "abc-123",   # Every request is unique
  timestamp: "1638360000"  # Already tracked by Prometheus
}
```

---

## PromQL Query Language {#promql}

### Basic Queries

```promql
# Instant vector - current values
http_requests_total

# Filter by labels
http_requests_total{method="GET"}

# Multiple label filters
http_requests_total{method="GET", status="200"}

# Regex matching
http_requests_total{endpoint=~"/api/.*"}

# Negative matching
http_requests_total{status!="200"}
```

### Range Vectors

```promql
# Last 5 minutes of data
http_requests_total[5m]

# Time ranges
http_requests_total[1h]
http_requests_total[1d]
```

### Aggregation Operators

```promql
# Sum across all instances
sum(http_requests_total)

# Average
avg(cpu_usage_percent)

# Min/Max
min(memory_usage_bytes)
max(response_time_seconds)

# Count
count(up == 0)  # Count down instances

# Group by labels
sum(http_requests_total) by (method)
sum(http_requests_total) by (method, status)

# Without specific labels
sum(http_requests_total) without (instance)
```

### Rate and Increase

```promql
# Requests per second (for counters)
rate(http_requests_total[5m])

# Total increase over time range
increase(http_requests_total[1h])

# Per-second rate for gauges
irate(cpu_usage_percent[5m])  # Instant rate
```

### Arithmetic Operations

```promql
# Calculate error rate percentage
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100

# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) 
/ node_memory_MemTotal_bytes * 100

# Request duration 95th percentile
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Useful Query Examples

```promql
# Top 5 endpoints by request count
topk(5, sum(rate(http_requests_total[5m])) by (endpoint))

# Services down for more than 5 minutes
up == 0

# High CPU usage
cpu_usage_percent > 80

# Predict disk full time (linear regression)
predict_linear(node_filesystem_free_bytes[1h], 4 * 3600) < 0

# Request rate increase
delta(http_requests_total[5m]) > 1000
```

---

## Exporters and Instrumentation {#exporters}

### Node Exporter (System Metrics)

```bash
# Install node_exporter
docker run -d \
  --name=node-exporter \
  --net="host" \
  --pid="host" \
  -v "/:/host:ro,rslave" \
  prom/node-exporter \
  --path.rootfs=/host

# Metrics exposed at :9100/metrics
curl localhost:9100/metrics
```

**Key Metrics:**
- `node_cpu_seconds_total` - CPU usage
- `node_memory_MemAvailable_bytes` - Available memory
- `node_disk_io_time_seconds_total` - Disk I/O
- `node_network_receive_bytes_total` - Network traffic
- `node_filesystem_avail_bytes` - Disk space

### Blackbox Exporter (Endpoint Probing)

```yaml
# blackbox.yml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      method: GET
  
  tcp_connect:
    prober: tcp
    timeout: 5s
  
  icmp:
    prober: icmp
    timeout: 5s
```

```yaml
# prometheus.yml - scrape config
scrape_configs:
  - job_name: 'blackbox'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://example.com
          - https://api.example.com/health
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

---

## Go Application Instrumentation {#go-instrumentation}

### Setup Prometheus Client

```go
// go.mod
module myapp

require github.com/prometheus/client_golang v1.17.0
```

### Basic HTTP Server with Metrics

```go
package main

import (
    "log"
    "net/http"
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    // Counter: Total HTTP requests
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    // Histogram: Request duration
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets, // Default: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10
        },
        []string{"method", "endpoint"},
    )
    
    // Gauge: Active connections
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
)

func init() {
    // Register metrics with Prometheus
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(activeConnections)
}

func main() {
    // Metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    
    // Application endpoints with instrumentation
    http.HandleFunc("/api/users", instrumentHandler(usersHandler))
    http.HandleFunc("/api/products", instrumentHandler(productsHandler))
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

// Middleware to instrument HTTP handlers
func instrumentHandler(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // Increment active connections
        activeConnections.Inc()
        defer activeConnections.Dec()
        
        // Wrap response writer to capture status code
        wrappedWriter := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        
        // Call the actual handler
        next(wrappedWriter, r)
        
        // Record metrics
        duration := time.Since(start).Seconds()
        httpRequestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
        httpRequestsTotal.WithLabelValues(r.Method, r.URL.Path, 
            http.StatusText(wrappedWriter.statusCode)).Inc()
    }
}

// Response writer wrapper to capture status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    // Simulate work
    time.Sleep(50 * time.Millisecond)
    w.Write([]byte(`{"users": []}`))
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
    time.Sleep(30 * time.Millisecond)
    w.Write([]byte(`{"products": []}`))
}
```

### Custom Business Metrics

```go
package metrics

import "github.com/prometheus/client_golang/prometheus"

var (
    // Database connection pool
    dbConnectionsActive = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "db_connections_active",
            Help: "Number of active database connections",
        },
    )
    
    dbConnectionsIdle = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "db_connections_idle",
            Help: "Number of idle database connections",
        },
    )
    
    // Database queries
    dbQueriesTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "db_queries_total",
            Help: "Total number of database queries",
        },
        []string{"operation", "table"},
    )
    
    dbQueryDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "db_query_duration_seconds",
            Help: "Database query duration",
            Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1},
        },
        []string{"operation", "table"},
    )
    
    // Cache
    cacheHitsTotal = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "cache_hits_total",
            Help: "Total cache hits",
        },
    )
    
    cacheMissesTotal = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "cache_misses_total",
            Help: "Total cache misses",
        },
    )
    
    // Business metrics
    ordersCreatedTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "orders_created_total",
            Help: "Total orders created",
        },
        []string{"status"},
    )
    
    orderValue = prometheus.NewHistogram(
        prometheus.HistogramOpts{
            Name: "order_value_dollars",
            Help: "Order value in dollars",
            Buckets: []float64{10, 50, 100, 250, 500, 1000, 2500, 5000},
        },
    )
)

func init() {
    prometheus.MustRegister(dbConnectionsActive, dbConnectionsIdle)
    prometheus.MustRegister(dbQueriesTotal, dbQueryDuration)
    prometheus.MustRegister(cacheHitsTotal, cacheMissesTotal)
    prometheus.MustRegister(ordersCreatedTotal, orderValue)
}

// Usage examples
func RecordDBQuery(operation, table string, duration float64) {
    dbQueriesTotal.WithLabelValues(operation, table).Inc()
    dbQueryDuration.WithLabelValues(operation, table).Observe(duration)
}

func RecordCacheHit() {
    cacheHitsTotal.Inc()
}

func RecordCacheMiss() {
    cacheMissesTotal.Inc()
}

func RecordOrder(status string, value float64) {
    ordersCreatedTotal.WithLabelValues(status).Inc()
    orderValue.Observe(value)
}
```

### Database Instrumentation Example

```go
package database

import (
    "database/sql"
    "time"
    
    "myapp/metrics"
)

type DB struct {
    *sql.DB
}

func (db *DB) QueryUsers() ([]User, error) {
    start := time.Now()
    defer func() {
        metrics.RecordDBQuery("select", "users", time.Since(start).Seconds())
    }()
    
    rows, err := db.Query("SELECT id, name, email FROM users")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
            return nil, err
        }
        users = append(users, u)
    }
    
    return users, rows.Err()
}

func (db *DB) CreateUser(u User) error {
    start := time.Now()
    defer func() {
        metrics.RecordDBQuery("insert", "users", time.Since(start).Seconds())
    }()
    
    _, err := db.Exec("INSERT INTO users (name, email) VALUES (?, ?)", u.Name, u.Email)
    return err
}
```

---

## Service Discovery {#service-discovery}

### Kubernetes Service Discovery

```yaml
# prometheus.yml for Kubernetes
scrape_configs:
  # Kubernetes pods
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      # Only scrape pods with annotation prometheus.io/scrape: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      
      # Use custom port if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        target_label: __address__
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
      
      # Use custom path if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      
      # Add namespace label
      - source_labels: [__meta_kubernetes_namespace]
        target_label: kubernetes_namespace
      
      # Add pod name label
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: kubernetes_pod_name
```

### Deployment with Prometheus Annotations

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        ports:
        - containerPort: 8080
          name: metrics
```

### Consul Service Discovery

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'consul-services'
    consul_sd_configs:
      - server: 'consul:8500'
        services: []  # Empty list = all services
    relabel_configs:
      - source_labels: [__meta_consul_service]
        target_label: service
      - source_labels: [__meta_consul_tags]
        target_label: tags
```

---

## Alerting Rules {#alerting}

### Alert Rule Structure

```yaml
# alerts/api_alerts.yml
groups:
  - name: api_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m]))
            /
            sum(rate(http_requests_total[5m]))
          ) * 100 > 5
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate on {{ $labels.instance }}"
          description: "Error rate is {{ $value }}% (threshold: 5%)"
      
      # Slow response time
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Slow API responses on {{ $labels.instance }}"
          description: "95th percentile response time is {{ $value }}s"
      
      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
          team: sre
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Instance {{ $labels.instance }} has been down for 2 minutes"
```

### Infrastructure Alerts

```yaml
# alerts/infrastructure.yml
groups:
  - name: infrastructure
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value }}%"
      
      # Disk space low
      - alert: DiskSpaceLow
        expr: |
          (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
          description: "Disk {{ $labels.mountpoint }} is {{ $value }}% full"
      
      # Disk will fill in 4 hours
      - alert: DiskWillFillSoon
        expr: |
          predict_linear(node_filesystem_avail_bytes[1h], 4 * 3600) < 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk will fill soon on {{ $labels.instance }}"
          description: "Disk {{ $labels.mountpoint }} will fill in <4 hours"
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'password'

route:
  # Default receiver
  receiver: 'team-email'
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  # Route based on labels
  routes:
    # Critical alerts to PagerDuty
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true  # Also send to other receivers
    
    # Team-specific routing
    - match:
        team: backend
      receiver: 'backend-slack'
    
    - match:
        team: sre
      receiver: 'sre-slack'

receivers:
  - name: 'team-email'
    email_configs:
      - to: 'team@example.com'
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '<pagerduty-key>'
  
  - name: 'backend-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXX'
        channel: '#backend-alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
  
  - name: 'sre-slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YYY'
        channel: '#sre-alerts'

inhibit_rules:
  # Inhibit warning if critical is firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

---

## Kubernetes Monitoring {#kubernetes}

### Prometheus Operator

```bash
# Install Prometheus Operator with Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

### ServiceMonitor for Custom App

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: myapp
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: myapp
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Key Kubernetes Metrics

```promql
# Pod CPU usage
sum(rate(container_cpu_usage_seconds_total{pod=~"myapp-.*"}[5m])) by (pod)

# Pod memory usage
sum(container_memory_usage_bytes{pod=~"myapp-.*"}) by (pod)

# Pod restart count
kube_pod_container_status_restarts_total{pod=~"myapp-.*"}

# Deployment replica status
kube_deployment_status_replicas_available{deployment="myapp"}

# Node status
kube_node_status_condition{condition="Ready", status="true"}

# Persistent volume usage
kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes * 100
```

---

## Best Practices {#best-practices}

### 1. Metric Design

```go
// ✅ Good: Low cardinality labels
httpRequestsTotal.WithLabelValues("GET", "/api/users", "200").Inc()

// ❌ Bad: High cardinality (user IDs change frequently)
httpRequestsTotal.WithLabelValues("GET", "/api/users", userID, "200").Inc()

// ✅ Good: Use histograms for latency
httpDuration.Observe(duration)

// ❌ Bad: Don't create gauges for every percentile
p50Gauge.Set(calculateP50())
p95Gauge.Set(calculateP95())
p99Gauge.Set(calculateP99())
```

### 2. Query Optimization

```promql
# ✅ Good: Use recording rules for expensive queries
# recording_rules.yml
groups:
  - name: aggregations
    interval: 30s
    rules:
      - record: job:http_requests:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)

# ❌ Bad: Complex query in dashboard (slow)
sum(rate(http_requests_total[5m])) by (job, instance, method, status)
```

### 3. Retention and Storage

```bash
# Configure retention
--storage.tsdb.retention.time=15d   # Keep 15 days
--storage.tsdb.retention.size=50GB  # Or max 50GB

# For long-term storage, use remote write
# prometheus.yml
remote_write:
  - url: "http://thanos:9090/api/v1/receive"
```

### 4. Security

```yaml
# Enable basic auth
basic_auth_users:
  admin: $2y$10$... # bcrypt hash

# Use TLS
tls_server_config:
  cert_file: /path/to/cert.pem
  key_file: /path/to/key.pem
```

---

## Interview Questions {#interview-questions}

### Basic Questions

**Q1: What is Prometheus and how does it differ from other monitoring tools?**

**A:** Prometheus is a pull-based monitoring system with a multi-dimensional data model. Unlike push-based systems (Graphite, InfluxDB), Prometheus scrapes metrics from targets. It's designed for dynamic environments with built-in service discovery.

**Q2: Explain the four metric types in Prometheus.**

**A:**
- **Counter**: Cumulative value that only increases (e.g., total requests)
- **Gauge**: Value that can go up/down (e.g., memory usage, temperature)
- **Histogram**: Samples observations in configurable buckets (e.g., request duration)
- **Summary**: Like histogram but calculates quantiles on client side

**Q3: What is the difference between rate() and irate()?**

**A:**
- `rate()`: Average rate over time range, smooths spikes
- `irate()`: Instant rate using last two samples, more sensitive to changes
- Use `rate()` for alerts and long-term trends, `irate()` for graphs showing rapid changes

### Advanced Questions

**Q4: How do you calculate 95th percentile request latency?**

```promql
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)
```

**Q5: Design an alerting strategy for a microservices architecture.**

**A:**
1. **Multi-level alerts**: Critical (PagerDuty), Warning (Slack), Info (Email)
2. **Symptom-based**: Alert on user-facing issues (high error rate, slow responses)
3. **Cause-based**: Secondary alerts for root causes (high CPU, memory)
4. **Inhibition rules**: Suppress noise (don't alert on warnings if critical fires)
5. **Runbooks**: Include links to resolution steps in annotations

**Q6: How do you handle high-cardinality metrics?**

**A:**
- Avoid user IDs, request IDs, timestamps as labels
- Use aggregation and drop unnecessary labels
- Use recording rules to pre-aggregate
- Consider using logs/traces for high-cardinality data
- Set limits: `--query.max-samples` to prevent OOM

---

## Hands-On Exercise {#exercise}

### Build a Monitored Microservice

**Goal**: Create a Go service with comprehensive Prometheus monitoring.

#### Requirements

1. HTTP API with multiple endpoints
2. Database connection pool monitoring
3. Cache hit/miss metrics
4. Business metrics (orders, revenue)
5. Custom histograms for latency
6. Kubernetes deployment with ServiceMonitor
7. Alert rules for errors and latency

#### Solution

```go
// main.go
package main

import (
    "database/sql"
    "encoding/json"
    "log"
    "math/rand"
    "net/http"
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    _ "github.com/lib/pq"
)

var (
    // HTTP metrics
    httpRequests = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "shop_http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "shop_http_duration_seconds",
            Help:    "HTTP request duration",
            Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5},
        },
        []string{"method", "endpoint"},
    )
    
    // Database metrics
    dbConnections = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "shop_db_connections",
            Help: "Database connections",
        },
        []string{"state"}, // active, idle
    )
    
    dbQueries = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "shop_db_queries_total",
            Help: "Total database queries",
        },
        []string{"operation"},
    )
    
    // Cache metrics
    cacheOperations = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "shop_cache_operations_total",
            Help: "Cache operations",
        },
        []string{"operation", "result"}, // get/set, hit/miss
    )
    
    // Business metrics
    ordersCreated = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "shop_orders_created_total",
            Help: "Total orders created",
        },
    )
    
    revenue = prometheus.NewCounter(
        prometheus.CounterOpts{
            Name: "shop_revenue_total",
            Help: "Total revenue",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequests, httpDuration)
    prometheus.MustRegister(dbConnections, dbQueries)
    prometheus.MustRegister(cacheOperations)
    prometheus.MustRegister(ordersCreated, revenue)
}

func main() {
    // Simulate database connection pool
    go monitorDBConnections()
    
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/api/products", instrument(productsHandler))
    http.HandleFunc("/api/orders", instrument(ordersHandler))
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func instrument(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        rw := &responseWriter{ResponseWriter: w, statusCode: 200}
        
        next(rw, r)
        
        duration := time.Since(start).Seconds()
        httpDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
        httpRequests.WithLabelValues(r.Method, r.URL.Path, 
            http.StatusText(rw.statusCode)).Inc()
    }
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func productsHandler(w http.ResponseWriter, r *http.Request) {
    // Simulate cache check
    if rand.Float32() < 0.8 { // 80% cache hit rate
        cacheOperations.WithLabelValues("get", "hit").Inc()
        time.Sleep(5 * time.Millisecond)
    } else {
        cacheOperations.WithLabelValues("get", "miss").Inc()
        dbQueries.WithLabelValues("select").Inc()
        time.Sleep(50 * time.Millisecond)
    }
    
    products := []map[string]interface{}{
        {"id": 1, "name": "Product 1", "price": 29.99},
        {"id": 2, "name": "Product 2", "price": 49.99},
    }
    
    json.NewEncoder(w).Encode(products)
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        w.WriteHeader(http.StatusMethodNotAllowed)
        return
    }
    
    // Simulate order creation
    dbQueries.WithLabelValues("insert").Inc()
    time.Sleep(100 * time.Millisecond)
    
    orderValue := 50.0 + rand.Float64()*100.0
    ordersCreated.Inc()
    revenue.Add(orderValue)
    
    response := map[string]interface{}{
        "order_id": rand.Intn(10000),
        "total":    orderValue,
        "status":   "created",
    }
    
    json.NewEncoder(w).Encode(response)
}

func monitorDBConnections() {
    ticker := time.NewTicker(10 * time.Second)
    for range ticker.C {
        // Simulate varying connection pool
        active := float64(5 + rand.Intn(10))
        idle := float64(15 - int(active))
        
        dbConnections.WithLabelValues("active").Set(active)
        dbConnections.WithLabelValues("idle").Set(idle)
    }
}
```

#### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop-api
  template:
    metadata:
      labels:
        app: shop-api
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: shop-api
        image: shop-api:latest
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: shop-api
  labels:
    app: shop-api
spec:
  selector:
    app: shop-api
  ports:
  - port: 80
    targetPort: 8080
    name: http
```

#### Alert Rules

```yaml
# alerts.yml
groups:
  - name: shop_api
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(shop_http_requests_total{status=~"5.."}[5m]))
            / sum(rate(shop_http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate in shop API"
          description: "Error rate: {{ $value | humanizePercentage }}"
      
      - alert: SlowResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(shop_http_duration_seconds_bucket[5m])
          ) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time in shop API"
          description: "P95 latency: {{ $value }}s"
      
      - alert: LowCacheHitRate
        expr: |
          (
            sum(rate(shop_cache_operations_total{result="hit"}[5m]))
            / sum(rate(shop_cache_operations_total{operation="get"}[5m]))
          ) < 0.6
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate: {{ $value | humanizePercentage }}"
```

#### Testing

```bash
# Generate traffic
while true; do
  curl http://localhost:8080/api/products
  curl -X POST http://localhost:8080/api/orders
  sleep 0.1
done

# View metrics
curl http://localhost:8080/metrics | grep shop_

# Query Prometheus
# Error rate
(sum(rate(shop_http_requests_total{status=~"5.."}[5m])) / sum(rate(shop_http_requests_total[5m]))) * 100

# P95 latency
histogram_quantile(0.95, rate(shop_http_duration_seconds_bucket[5m]))

# Cache hit rate
(sum(rate(shop_cache_operations_total{result="hit"}[5m])) / sum(rate(shop_cache_operations_total{operation="get"}[5m]))) * 100
```

---

## Summary

You've learned:
- ✅ Prometheus architecture and scraping model
- ✅ Four metric types and data model
- ✅ PromQL for powerful queries and aggregations
- ✅ Exporters (node, blackbox) for infrastructure monitoring
- ✅ Go instrumentation with client library
- ✅ Service discovery for dynamic environments
- ✅ Alert rules and Alertmanager configuration
- ✅ Kubernetes monitoring with ServiceMonitor

**Next Module**: [Module 27: Grafana Dashboards](27_Grafana_Dashboards.md) - Learn visualization and dashboard creation.
