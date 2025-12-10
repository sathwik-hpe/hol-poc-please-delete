# Module 28: EFK Stack - Centralized Logging

## Table of Contents
- [Introduction to EFK](#introduction)
- [Elasticsearch Fundamentals](#elasticsearch)
- [Fluentd Log Collection](#fluentd)
- [Kibana Visualization](#kibana)
- [Kubernetes Integration](#kubernetes)
- [Log Parsing and Enrichment](#parsing)
- [Search and Analysis](#search)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)
- [Hands-On Exercise](#exercise)

---

## Introduction to EFK {#introduction}

EFK Stack is a centralized logging solution for aggregating, processing, and visualizing logs.

### Stack Components

```
┌──────────────┐
│ Applications │ Generate logs
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Fluentd    │ Collect & parse logs
└──────┬───────┘
       │
       ▼
┌──────────────┐
│Elasticsearch │ Store & index logs
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Kibana    │ Visualize & search
└──────────────┘
```

**Elasticsearch**: Search and analytics engine (storage)
**Fluentd**: Log collector and forwarder (collection)
**Kibana**: Visualization and UI (analysis)

### Why Centralized Logging?

✅ **Troubleshooting**: Search across all services in one place
✅ **Monitoring**: Track error rates, patterns, anomalies
✅ **Compliance**: Audit trails, security events
✅ **Performance**: Identify slow queries, bottlenecks
✅ **Correlation**: Link logs across microservices

### EFK vs ELK

| Component | EFK | ELK |
|-----------|-----|-----|
| Collector | Fluentd | Logstash |
| Language | C/Ruby | Java |
| Memory | Lower (~40MB) | Higher (~500MB) |
| Plugins | 500+ | 200+ |
| K8s Native | Yes | No |

---

## Elasticsearch Fundamentals {#elasticsearch}

### Architecture

```
Cluster
├── Node 1 (Master, Data)
├── Node 2 (Data)
└── Node 3 (Data)
    ├── Index: logs-2024.12.10
    │   ├── Shard 0 (Primary)
    │   ├── Shard 0 (Replica)
    │   ├── Shard 1 (Primary)
    │   └── Shard 1 (Replica)
    └── Index: logs-2024.12.11
```

**Cluster**: Collection of nodes
**Node**: Single Elasticsearch instance
**Index**: Collection of documents (like database)
**Shard**: Subset of index data
**Replica**: Copy of shard for redundancy

### Installation (Docker)

```yaml
# docker-compose.yml
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - es-data:/usr/share/elasticsearch/data
    networks:
      - efk

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - efk

  fluentd:
    build: ./fluentd
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    volumes:
      - ./fluentd/conf:/fluentd/etc
    depends_on:
      - elasticsearch
    networks:
      - efk

volumes:
  es-data:

networks:
  efk:
```

```bash
docker-compose up -d

# Verify Elasticsearch
curl http://localhost:9200
# {
#   "cluster_name" : "docker-cluster",
#   "cluster_uuid" : "...",
#   "version" : { "number" : "8.11.0" }
# }

# Verify Kibana
open http://localhost:5601
```

### Index Management

```bash
# Create index
curl -X PUT "localhost:9200/logs-2024.12.10" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "number_of_shards": 2,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "timestamp": {"type": "date"},
      "level": {"type": "keyword"},
      "service": {"type": "keyword"},
      "message": {"type": "text"},
      "user_id": {"type": "keyword"},
      "request_id": {"type": "keyword"},
      "duration_ms": {"type": "integer"}
    }
  }
}
'

# List indices
curl "localhost:9200/_cat/indices?v"

# Delete index
curl -X DELETE "localhost:9200/logs-2024.12.10"
```

### Index Templates

```bash
# Create template for daily indices
curl -X PUT "localhost:9200/_index_template/logs-template" -H 'Content-Type: application/json' -d'
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy",
      "index.lifecycle.rollover_alias": "logs"
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "level": {"type": "keyword"},
        "service": {"type": "keyword"},
        "namespace": {"type": "keyword"},
        "pod": {"type": "keyword"},
        "container": {"type": "keyword"},
        "message": {"type": "text"},
        "stack_trace": {"type": "text"}
      }
    }
  }
}
'
```

### Index Lifecycle Management (ILM)

```bash
# Create lifecycle policy
curl -X PUT "localhost:9200/_ilm/policy/logs-policy" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
'
```

### CRUD Operations

```bash
# Index document (create)
curl -X POST "localhost:9200/logs-2024.12.10/_doc" -H 'Content-Type: application/json' -d'
{
  "timestamp": "2024-12-10T10:30:00Z",
  "level": "ERROR",
  "service": "api-gateway",
  "message": "Database connection timeout",
  "duration_ms": 5000
}
'

# Get document
curl "localhost:9200/logs-2024.12.10/_doc/DOCUMENT_ID"

# Update document
curl -X POST "localhost:9200/logs-2024.12.10/_update/DOCUMENT_ID" -H 'Content-Type: application/json' -d'
{
  "doc": {
    "resolved": true
  }
}
'

# Delete document
curl -X DELETE "localhost:9200/logs-2024.12.10/_doc/DOCUMENT_ID"
```

### Search Queries

```bash
# Match all
curl "localhost:9200/logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match_all": {}
  }
}
'

# Match specific field
curl "localhost:9200/logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "level": "ERROR"
    }
  }
}
'

# Boolean query (AND, OR, NOT)
curl "localhost:9200/logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "ERROR"}},
        {"range": {"duration_ms": {"gte": 1000}}}
      ],
      "filter": [
        {"term": {"service": "api-gateway"}}
      ]
    }
  }
}
'

# Aggregations
curl "localhost:9200/logs-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "size": 0,
  "aggs": {
    "errors_by_service": {
      "terms": {
        "field": "service",
        "size": 10
      }
    },
    "avg_duration": {
      "avg": {
        "field": "duration_ms"
      }
    }
  }
}
'
```

---

## Fluentd Log Collection {#fluentd}

### Fluentd Architecture

```
Input → Parser → Filter → Output
  ↓        ↓        ↓        ↓
tail    regexp   record   elasticsearch
http    json     add_tag  s3
syslog  multiline geoip   kafka
```

### Dockerfile for Fluentd

```dockerfile
# fluentd/Dockerfile
FROM fluent/fluentd:v1.16-1

USER root

# Install plugins
RUN gem install fluent-plugin-elasticsearch \
    && gem install fluent-plugin-rewrite-tag-filter \
    && gem install fluent-plugin-parser \
    && gem install fluent-plugin-concat

USER fluent
```

### Fluentd Configuration

```ruby
# fluentd/conf/fluent.conf

# Input: Collect from Docker containers
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Input: Tail log files
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/td-agent/app.log.pos
  tag app.logs
  <parse>
    @type json
    time_key timestamp
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

# Filter: Add hostname
<filter **>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    tag ${tag}
  </record>
</filter>

# Filter: Parse JSON logs
<filter app.**>
  @type parser
  key_name log
  <parse>
    @type json
  </parse>
</filter>

# Output: Send to Elasticsearch
<match **>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix logs
  logstash_dateformat %Y.%m.%d
  include_tag_key true
  type_name _doc
  tag_key @log_name
  <buffer>
    @type file
    path /var/log/td-agent/buffer/es
    flush_interval 5s
    retry_max_interval 30s
    retry_forever true
  </buffer>
</match>
```

### Go Application Logging (JSON Format)

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "time"
)

type LogEntry struct {
    Timestamp   string                 `json:"@timestamp"`
    Level       string                 `json:"level"`
    Service     string                 `json:"service"`
    Message     string                 `json:"message"`
    RequestID   string                 `json:"request_id,omitempty"`
    UserID      string                 `json:"user_id,omitempty"`
    DurationMs  int64                  `json:"duration_ms,omitempty"`
    Error       string                 `json:"error,omitempty"`
    StackTrace  string                 `json:"stack_trace,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type Logger struct {
    service string
    output  *json.Encoder
}

func NewLogger(service string) *Logger {
    return &Logger{
        service: service,
        output:  json.NewEncoder(os.Stdout),
    }
}

func (l *Logger) log(level, message string, fields map[string]interface{}) {
    entry := LogEntry{
        Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
        Level:     level,
        Service:   l.service,
        Message:   message,
        Metadata:  fields,
    }
    
    if requestID, ok := fields["request_id"].(string); ok {
        entry.RequestID = requestID
    }
    if userID, ok := fields["user_id"].(string); ok {
        entry.UserID = userID
    }
    if duration, ok := fields["duration_ms"].(int64); ok {
        entry.DurationMs = duration
    }
    if err, ok := fields["error"].(string); ok {
        entry.Error = err
    }
    
    l.output.Encode(entry)
}

func (l *Logger) Info(message string, fields map[string]interface{}) {
    l.log("INFO", message, fields)
}

func (l *Logger) Error(message string, fields map[string]interface{}) {
    l.log("ERROR", message, fields)
}

func (l *Logger) Warn(message string, fields map[string]interface{}) {
    l.log("WARN", message, fields)
}

func (l *Logger) Debug(message string, fields map[string]interface{}) {
    l.log("DEBUG", message, fields)
}

// Usage example
func main() {
    logger := NewLogger("api-gateway")
    
    logger.Info("Server started", map[string]interface{}{
        "port": 8080,
    })
    
    logger.Error("Database connection failed", map[string]interface{}{
        "error":    "connection timeout",
        "host":     "db.example.com",
        "duration_ms": 5000,
    })
    
    logger.Warn("High memory usage", map[string]interface{}{
        "memory_mb": 1024,
        "threshold": 800,
    })
}
```

### Multiline Log Parsing

```ruby
# Parse Java stack traces
<filter app.**>
  @type concat
  key log
  multiline_start_regexp /^[^\s]/
  flush_interval 5s
  timeout_label @NORMAL
</filter>

<filter app.**>
  @type parser
  key_name log
  <parse>
    @type multiline
    format_firstline /\d{4}-\d{2}-\d{2}/
    format1 /^(?<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[(?<level>\w+)\] (?<message>.*)/
  </parse>
</filter>
```

---

## Kibana Visualization {#kibana}

### Initial Setup

1. **Access Kibana**: http://localhost:5601
2. **Create Index Pattern**:
   - Management → Index Patterns → Create
   - Pattern: `logs-*`
   - Time field: `@timestamp`
   - Click "Create"

### Discover Tab

Search and explore logs in real-time.

```
# KQL (Kibana Query Language) examples

# Simple search
level: ERROR

# AND condition
level: ERROR AND service: "api-gateway"

# OR condition
level: ERROR OR level: WARN

# Range query
duration_ms >= 1000 AND duration_ms < 5000

# Wildcard
message: *timeout*

# Exists
_exists_: error

# Not exists
NOT _exists_: user_id
```

### Creating Visualizations

**1. Line Chart - Error Rate Over Time**

```json
{
  "type": "line",
  "metrics": [
    {
      "type": "count",
      "schema": "metric"
    }
  ],
  "buckets": [
    {
      "type": "date_histogram",
      "schema": "segment",
      "params": {
        "field": "@timestamp",
        "interval": "1m"
      }
    },
    {
      "type": "filters",
      "schema": "group",
      "params": {
        "filters": [
          {"input": {"query": "level: ERROR"}, "label": "Errors"},
          {"input": {"query": "level: WARN"}, "label": "Warnings"}
        ]
      }
    }
  ]
}
```

**2. Pie Chart - Logs by Service**

```json
{
  "type": "pie",
  "metrics": [
    {"type": "count"}
  ],
  "buckets": [
    {
      "type": "terms",
      "schema": "segment",
      "params": {
        "field": "service.keyword",
        "size": 10,
        "order": "desc",
        "orderBy": "_count"
      }
    }
  ]
}
```

**3. Data Table - Top Errors**

```json
{
  "type": "table",
  "metrics": [
    {"type": "count", "schema": "metric"}
  ],
  "buckets": [
    {
      "type": "terms",
      "schema": "bucket",
      "params": {
        "field": "message.keyword",
        "size": 20,
        "order": "desc",
        "orderBy": "_count"
      }
    },
    {
      "type": "terms",
      "schema": "bucket",
      "params": {
        "field": "service.keyword",
        "size": 5
      }
    }
  ]
}
```

**4. Heatmap - Response Time Distribution**

```json
{
  "type": "heatmap",
  "metrics": [
    {"type": "avg", "field": "duration_ms"}
  ],
  "buckets": [
    {
      "type": "date_histogram",
      "field": "@timestamp",
      "interval": "5m"
    },
    {
      "type": "histogram",
      "field": "duration_ms",
      "interval": 100
    }
  ]
}
```

### Creating Dashboards

```
Dashboard: Application Monitoring
├── Row 1: Overview
│   ├── Total Logs (Metric)
│   ├── Error Count (Metric)
│   └── Avg Response Time (Metric)
├── Row 2: Trends
│   ├── Log Volume Over Time (Line)
│   └── Errors by Service (Bar)
└── Row 3: Details
    ├── Top Errors (Table)
    └── Slow Requests (Table)
```

### Saved Searches

```
Search: Critical Errors
Query: level: ERROR AND duration_ms > 5000
Fields: @timestamp, service, message, duration_ms, request_id

Search: User Login Events
Query: message: "user login" OR message: "authentication"
Fields: @timestamp, user_id, ip_address, status
```

---

## Kubernetes Integration {#kubernetes}

### Fluentd DaemonSet

```yaml
# fluentd-daemonset.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluentd
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluentd
rules:
- apiGroups:
  - ""
  resources:
  - pods
  - namespaces
  verbs:
  - get
  - list
  - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluentd
roleRef:
  kind: ClusterRole
  name: fluentd
  apiGroup: rbac.authorization.k8s.io
subjects:
- kind: ServiceAccount
  name: fluentd
  namespace: kube-system
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
  namespace: kube-system
  labels:
    app: fluentd
spec:
  selector:
    matchLabels:
      app: fluentd
  template:
    metadata:
      labels:
        app: fluentd
    spec:
      serviceAccountName: fluentd
      containers:
      - name: fluentd
        image: fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch
        env:
        - name: FLUENT_ELASTICSEARCH_HOST
          value: "elasticsearch.logging.svc.cluster.local"
        - name: FLUENT_ELASTICSEARCH_PORT
          value: "9200"
        - name: FLUENT_ELASTICSEARCH_SCHEME
          value: "http"
        - name: FLUENT_ELASTICSEARCH_LOGSTASH_PREFIX
          value: "k8s-logs"
        - name: FLUENT_ELASTICSEARCH_LOGSTASH_FORMAT
          value: "true"
        resources:
          limits:
            memory: 200Mi
          requests:
            cpu: 100m
            memory: 200Mi
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: config
          mountPath: /fluentd/etc/fluent.conf
          subPath: fluent.conf
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: config
        configMap:
          name: fluentd-config
```

### Fluentd ConfigMap for Kubernetes

```yaml
# fluentd-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: kube-system
data:
  fluent.conf: |
    # Input: Kubernetes logs
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type json
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    # Filter: Kubernetes metadata
    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      kubernetes_url "#{ENV['FLUENT_FILTER_KUBERNETES_URL'] || 'https://' + ENV.fetch('KUBERNETES_SERVICE_HOST') + ':' + ENV.fetch('KUBERNETES_SERVICE_PORT') + '/api'}"
      verify_ssl "#{ENV['KUBERNETES_VERIFY_SSL'] || true}"
      ca_file "#{ENV['KUBERNETES_CA_FILE']}"
    </filter>

    # Filter: Add custom fields
    <filter kubernetes.**>
      @type record_transformer
      <record>
        cluster_name "#{ENV['CLUSTER_NAME'] || 'production'}"
        environment "#{ENV['ENVIRONMENT'] || 'prod'}"
      </record>
    </filter>

    # Filter: Exclude system namespaces
    <filter kubernetes.**>
      @type grep
      <exclude>
        key $.kubernetes.namespace_name
        pattern ^(kube-system|kube-public|kube-node-lease)$
      </exclude>
    </filter>

    # Output: Elasticsearch
    <match kubernetes.**>
      @type elasticsearch
      @id out_es
      host "#{ENV['FLUENT_ELASTICSEARCH_HOST']}"
      port "#{ENV['FLUENT_ELASTICSEARCH_PORT']}"
      scheme "#{ENV['FLUENT_ELASTICSEARCH_SCHEME'] || 'http'}"
      logstash_format true
      logstash_prefix "#{ENV['FLUENT_ELASTICSEARCH_LOGSTASH_PREFIX'] || 'k8s-logs'}"
      <buffer>
        @type file
        path /var/log/fluentd-buffers/kubernetes.system.buffer
        flush_mode interval
        retry_type exponential_backoff
        flush_interval 5s
        retry_forever
        retry_max_interval 30
        chunk_limit_size 2M
        queue_limit_length 8
        overflow_action block
      </buffer>
    </match>
```

### Deploy EFK Stack on Kubernetes

```bash
# Create namespace
kubectl create namespace logging

# Deploy Elasticsearch
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: logging
spec:
  serviceName: elasticsearch
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        env:
        - name: discovery.type
          value: single-node
        - name: ES_JAVA_OPTS
          value: "-Xms512m -Xmx512m"
        - name: xpack.security.enabled
          value: "false"
        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport
        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: logging
spec:
  selector:
    app: elasticsearch
  ports:
  - port: 9200
    name: http
  - port: 9300
    name: transport
EOF

# Deploy Kibana
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kibana
  namespace: logging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kibana
  template:
    metadata:
      labels:
        app: kibana
    spec:
      containers:
      - name: kibana
        image: docker.elastic.co/kibana/kibana:8.11.0
        env:
        - name: ELASTICSEARCH_HOSTS
          value: "http://elasticsearch:9200"
        ports:
        - containerPort: 5601
---
apiVersion: v1
kind: Service
metadata:
  name: kibana
  namespace: logging
spec:
  type: LoadBalancer
  selector:
    app: kibana
  ports:
  - port: 5601
    targetPort: 5601
EOF

# Deploy Fluentd
kubectl apply -f fluentd-configmap.yaml
kubectl apply -f fluentd-daemonset.yaml

# Verify
kubectl get pods -n logging
kubectl get pods -n kube-system -l app=fluentd
```

---

## Log Parsing and Enrichment {#parsing}

### Grok Patterns

```ruby
# Parse Apache access logs
<filter apache.**>
  @type parser
  key_name log
  <parse>
    @type grok
    grok_pattern %{COMBINEDAPACHELOG}
  </parse>
</filter>

# Parse custom format
<filter app.**>
  @type parser
  key_name log
  <parse>
    @type grok
    grok_pattern \[%{TIMESTAMP_ISO8601:timestamp}\] %{LOGLEVEL:level} %{GREEDYDATA:message}
  </parse>
</filter>
```

### GeoIP Enrichment

```ruby
<filter web.**>
  @type geoip
  geoip_lookup_keys client_ip
  <record>
    location ${city.names.en["client_ip"]} ${country.names.en["client_ip"]}
    latitude ${location.latitude["client_ip"]}
    longitude ${location.longitude["client_ip"]}
  </record>
</filter>
```

### Custom Fields

```ruby
<filter **>
  @type record_transformer
  enable_ruby true
  <record>
    environment ${tag_parts[0]}
    timestamp ${time.strftime('%Y-%m-%dT%H:%M:%S%z')}
    log_level ${record["level"] || "INFO"}
    day_of_week ${Time.now.strftime('%A')}
  </record>
</filter>
```

---

## Search and Analysis {#search}

### Lucene Query Syntax

```
# Exact match
service:"api-gateway"

# Wildcard
message:*timeout*
message:fail?

# Range
duration_ms:[100 TO 500]
@timestamp:[now-1h TO now]

# Boolean
level:ERROR AND service:"api-gateway"
level:ERROR OR level:WARN
level:ERROR NOT service:"payment"

# Grouping
(level:ERROR OR level:WARN) AND service:"api-gateway"

# Regular expression
message:/database.*error/
```

### Aggregations in Kibana

**Terms Aggregation**:
```json
{
  "aggs": {
    "services": {
      "terms": {
        "field": "service.keyword",
        "size": 10
      }
    }
  }
}
```

**Date Histogram**:
```json
{
  "aggs": {
    "logs_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "calendar_interval": "1h"
      }
    }
  }
}
```

**Nested Aggregation**:
```json
{
  "aggs": {
    "by_service": {
      "terms": {"field": "service.keyword"},
      "aggs": {
        "by_level": {
          "terms": {"field": "level.keyword"}
        },
        "avg_duration": {
          "avg": {"field": "duration_ms"}
        }
      }
    }
  }
}
```

---

## Best Practices {#best-practices}

### 1. Structured Logging

```go
// ✅ Good: Structured JSON
logger.Error("Payment failed", map[string]interface{}{
    "user_id": "12345",
    "order_id": "67890",
    "amount": 99.99,
    "error": "insufficient_funds",
})

// ❌ Bad: Unstructured string
log.Println("Payment failed for user 12345 order 67890 amount 99.99: insufficient funds")
```

### 2. Log Levels

```
DEBUG: Detailed diagnostic information
INFO: General informational messages
WARN: Warning messages (potential issues)
ERROR: Error events (application can continue)
FATAL: Critical errors (application cannot continue)
```

### 3. Correlation IDs

```go
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        ctx := context.WithValue(r.Context(), "request_id", requestID)
        
        logger.Info("Request started", map[string]interface{}{
            "request_id": requestID,
            "method": r.Method,
            "path": r.URL.Path,
        })
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

### 4. Sampling for High Volume

```ruby
# Sample 10% of INFO logs
<filter app.**>
  @type sampling_filter
  <rule>
    count 10
    sample 1
  </rule>
  <rule>
    level ERROR
    sample 100  # Keep all errors
  </rule>
</filter>
```

### 5. Security

```ruby
# Redact sensitive fields
<filter **>
  @type record_modifier
  <replace>
    key password
    expression /.*/
    replace [REDACTED]
  </replace>
  <replace>
    key credit_card
    expression /\d{4}-\d{4}-\d{4}-\d{4}/
    replace XXXX-XXXX-XXXX-XXXX
  </replace>
</filter>
```

---

## Interview Questions {#interview-questions}

**Q1: What is the difference between EFK and ELK stacks?**

**A:** 
- **EFK**: Elasticsearch, Fluentd, Kibana
- **ELK**: Elasticsearch, Logstash, Kibana
- **Key Differences**:
  - Fluentd: Lower memory (~40MB), C/Ruby, K8s-native
  - Logstash: Higher memory (~500MB), Java, more features
  - Fluentd better for containers/K8s, Logstash for complex pipelines

**Q2: How do you handle high log volumes in Elasticsearch?**

**A:**
1. **Index Lifecycle Management**: Roll over indices daily, delete old data
2. **Sharding**: Distribute data across multiple shards
3. **Sampling**: Sample non-critical logs (keep all errors)
4. **Buffer in Fluentd**: Prevent data loss during ES downtime
5. **Hot-Warm-Cold architecture**: Move old data to cheaper storage
6. **Compression**: Enable compression for indices

**Q3: Explain Fluentd buffering.**

**A:**
- **Memory buffer**: Fast, data loss if crash
- **File buffer**: Persistent, slower, survives restart
- **Chunk limit**: Max size per chunk (prevent OOM)
- **Queue limit**: Max chunks in queue
- **Retry**: Exponential backoff for failures

**Q4: How do you correlate logs across microservices?**

**A:**
1. **Request ID**: Generate unique ID at API gateway, pass in headers
2. **Trace ID**: Use distributed tracing (Jaeger) alongside logs
3. **User ID**: Include user context in all logs
4. **Session ID**: Track user sessions
5. **Kibana**: Search by request_id to see full request flow

**Q5: What is Index Lifecycle Management in Elasticsearch?**

**A:**
ILM automates index management:
- **Hot phase**: Active writes, fast storage (SSD)
- **Warm phase**: Read-only, slower storage (HDD), shrink shards
- **Cold phase**: Rarely accessed, searchable snapshots
- **Delete phase**: Remove old data after retention period

Example: Keep hot data for 1 day, warm for 7 days, delete after 30 days.

---

## Hands-On Exercise {#exercise}

### Build a Production EFK Stack

**Goal**: Deploy EFK on Kubernetes with structured logging from a Go application.

#### Step 1: Go Application with Structured Logging

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "math/rand"
    "net/http"
    "os"
    "time"
    
    "github.com/google/uuid"
)

type LogEntry struct {
    Timestamp  string                 `json:"@timestamp"`
    Level      string                 `json:"level"`
    Service    string                 `json:"service"`
    Namespace  string                 `json:"namespace"`
    Pod        string                 `json:"pod"`
    Message    string                 `json:"message"`
    RequestID  string                 `json:"request_id,omitempty"`
    UserID     string                 `json:"user_id,omitempty"`
    Method     string                 `json:"method,omitempty"`
    Path       string                 `json:"path,omitempty"`
    StatusCode int                    `json:"status_code,omitempty"`
    DurationMs int64                  `json:"duration_ms,omitempty"`
    Error      string                 `json:"error,omitempty"`
}

var (
    service   = getEnv("SERVICE_NAME", "shop-api")
    namespace = getEnv("NAMESPACE", "default")
    pod       = getEnv("HOSTNAME", "unknown")
)

func getEnv(key, fallback string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return fallback
}

func logJSON(entry LogEntry) {
    entry.Timestamp = time.Now().UTC().Format(time.RFC3339Nano)
    entry.Service = service
    entry.Namespace = namespace
    entry.Pod = pod
    json.NewEncoder(os.Stdout).Encode(entry)
}

func loggingMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        requestID := r.Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = uuid.New().String()
        }
        
        ctx := context.WithValue(r.Context(), "request_id", requestID)
        rw := &responseWriter{ResponseWriter: w, statusCode: 200}
        
        logJSON(LogEntry{
            Level:     "INFO",
            Message:   "Request started",
            RequestID: requestID,
            Method:    r.Method,
            Path:      r.URL.Path,
        })
        
        next(rw, r.WithContext(ctx))
        
        duration := time.Since(start).Milliseconds()
        level := "INFO"
        if rw.statusCode >= 500 {
            level = "ERROR"
        } else if rw.statusCode >= 400 {
            level = "WARN"
        }
        
        logJSON(LogEntry{
            Level:      level,
            Message:    "Request completed",
            RequestID:  requestID,
            Method:     r.Method,
            Path:       r.URL.Path,
            StatusCode: rw.statusCode,
            DurationMs: duration,
        })
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

func productsHandler(w http.ResponseWriter, r *http.Request) {
    requestID := r.Context().Value("request_id").(string)
    
    // Simulate some processing
    time.Sleep(time.Duration(rand.Intn(100)) * time.Millisecond)
    
    // Randomly generate errors
    if rand.Float32() < 0.1 {
        logJSON(LogEntry{
            Level:     "ERROR",
            Message:   "Database query failed",
            RequestID: requestID,
            Error:     "connection timeout",
        })
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }
    
    products := []map[string]interface{}{
        {"id": 1, "name": "Product 1", "price": 29.99},
        {"id": 2, "name": "Product 2", "price": 49.99},
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(products)
}

func ordersHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    
    requestID := r.Context().Value("request_id").(string)
    userID := fmt.Sprintf("user-%d", rand.Intn(1000))
    
    time.Sleep(time.Duration(rand.Intn(200)) * time.Millisecond)
    
    logJSON(LogEntry{
        Level:     "INFO",
        Message:   "Order created",
        RequestID: requestID,
        UserID:    userID,
    })
    
    response := map[string]interface{}{
        "order_id": uuid.New().String(),
        "status":   "created",
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("OK"))
}

func main() {
    http.HandleFunc("/health", healthHandler)
    http.HandleFunc("/api/products", loggingMiddleware(productsHandler))
    http.HandleFunc("/api/orders", loggingMiddleware(ordersHandler))
    
    logJSON(LogEntry{
        Level:   "INFO",
        Message: "Server starting",
    })
    
    if err := http.ListenAndServe(":8080", nil); err != nil {
        logJSON(LogEntry{
            Level:   "FATAL",
            Message: "Server failed to start",
            Error:   err.Error(),
        })
    }
}
```

#### Step 2: Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shop-api
  template:
    metadata:
      labels:
        app: shop-api
    spec:
      containers:
      - name: shop-api
        image: shop-api:latest
        env:
        - name: SERVICE_NAME
          value: "shop-api"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: shop-api
spec:
  selector:
    app: shop-api
  ports:
  - port: 80
    targetPort: 8080
```

#### Step 3: Generate Traffic and View Logs

```bash
# Generate traffic
while true; do
  curl http://shop-api/api/products
  curl -X POST http://shop-api/api/orders
  sleep 0.5
done

# View logs in Kibana
# 1. Go to Kibana → Discover
# 2. Select index pattern: logs-*
# 3. Search queries:
#    - level: ERROR
#    - service: "shop-api" AND level: ERROR
#    - duration_ms > 100
#    - request_id: "specific-id"

# Create visualization:
# - Error rate over time
# - Average response time by endpoint
# - Top errors by message
```

---

## Summary

You've learned:
- ✅ EFK stack architecture and components
- ✅ Elasticsearch indices, queries, and ILM
- ✅ Fluentd configuration and log parsing
- ✅ Kibana visualizations and dashboards
- ✅ Kubernetes integration with DaemonSet
- ✅ Structured logging in Go applications
- ✅ Log correlation with request IDs
- ✅ Best practices for production logging

**Next Module**: [Module 29: Distributed Tracing](29_Distributed_Tracing.md) - Learn end-to-end request tracing with Jaeger and OpenTelemetry.
