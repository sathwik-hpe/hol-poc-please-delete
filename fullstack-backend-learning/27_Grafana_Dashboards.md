# Module 27: Grafana Dashboards & Visualization

## Table of Contents
- [Introduction to Grafana](#introduction)
- [Installation and Setup](#installation)
- [Data Sources](#data-sources)
- [Dashboard Basics](#dashboards)
- [Panel Types and Visualizations](#panels)
- [Variables and Templating](#variables)
- [Alerting in Grafana](#alerting)
- [Best Practices](#best-practices)
- [Advanced Features](#advanced)
- [Interview Questions](#interview-questions)
- [Hands-On Exercise](#exercise)

---

## Introduction to Grafana {#introduction}

Grafana is an open-source analytics and monitoring platform that visualizes time-series data from multiple sources.

### Key Features

- **Multi-source support**: Prometheus, InfluxDB, Elasticsearch, MySQL, PostgreSQL, CloudWatch
- **Rich visualizations**: Graphs, heatmaps, gauges, tables, alerts
- **Templating**: Dynamic dashboards with variables
- **Alerting**: Built-in alerting with multiple notification channels
- **Plugins**: Extensible with community panels and data sources

### Use Cases

✅ **Infrastructure monitoring** - CPU, memory, disk, network
✅ **Application performance** - Request rates, latency, errors
✅ **Business metrics** - Orders, revenue, user signups
✅ **Log analysis** - Error trends, log volumes
✅ **IoT dashboards** - Sensor data, device status

---

## Installation and Setup {#installation}

### Docker Installation

```bash
# docker-compose.yml
version: '3'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus

volumes:
  grafana-data:
  prometheus-data:
```

```bash
docker-compose up -d

# Access Grafana
# http://localhost:3000
# Default credentials: admin/admin
```

### Kubernetes Installation (Helm)

```bash
# Add Grafana Helm repo
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install with Prometheus Operator stack
helm install grafana prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Get admin password
kubectl get secret -n monitoring grafana -o jsonpath="{.data.admin-password}" | base64 --decode

# Port forward
kubectl port-forward -n monitoring svc/grafana 3000:80
```

### Configuration Provisioning

```yaml
# grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

```yaml
# grafana/provisioning/dashboards/default.yml
apiVersion: 1

providers:
  - name: 'Default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

---

## Data Sources {#data-sources}

### Adding Prometheus Data Source

**UI Method:**
1. Go to Configuration → Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Set URL: `http://prometheus:9090`
5. Click "Save & Test"

**Provisioning Method:**

```yaml
# datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    jsonData:
      timeInterval: "15s"
      httpMethod: POST
    editable: false
  
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      maxLines: 1000
  
  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "logstash-*"
    jsonData:
      interval: Daily
      timeField: "@timestamp"
```

### Data Source Query Examples

**Prometheus:**
```promql
rate(http_requests_total[5m])
```

**Elasticsearch:**
```json
{
  "query": {
    "bool": {
      "filter": [
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}
```

**MySQL:**
```sql
SELECT
  UNIX_TIMESTAMP(timestamp) as time_sec,
  value
FROM metrics
WHERE $__timeFilter(timestamp)
ORDER BY timestamp
```

---

## Dashboard Basics {#dashboards}

### Creating a Dashboard

```json
// dashboard.json
{
  "dashboard": {
    "id": null,
    "uid": "shop-api",
    "title": "Shop API Monitoring",
    "tags": ["api", "microservice"],
    "timezone": "browser",
    "schemaVersion": 27,
    "version": 0,
    "refresh": "10s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": []
  }
}
```

### Dashboard Structure

```
Dashboard
├── Rows (organize panels)
│   ├── Panel 1 (Graph)
│   ├── Panel 2 (Stat)
│   └── Panel 3 (Table)
├── Variables (dynamic filtering)
└── Annotations (events)
```

### Row Organization

```json
{
  "panels": [
    {
      "type": "row",
      "title": "HTTP Metrics",
      "collapsed": false,
      "panels": []
    },
    {
      "type": "graph",
      "title": "Request Rate",
      "gridPos": {"h": 8, "w": 12, "x": 0, "y": 1},
      "targets": [
        {
          "expr": "sum(rate(http_requests_total[5m])) by (method)",
          "legendFormat": "{{method}}"
        }
      ]
    }
  ]
}
```

---

## Panel Types and Visualizations {#panels}

### 1. Time Series (Graph)

Perfect for trends over time.

```json
{
  "type": "timeseries",
  "title": "Request Rate by Method",
  "targets": [
    {
      "expr": "sum(rate(http_requests_total[5m])) by (method)",
      "legendFormat": "{{method}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "reqps",
      "custom": {
        "lineInterpolation": "smooth",
        "fillOpacity": 10
      }
    }
  }
}
```

**Common PromQL Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate percentage
(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### 2. Stat Panel (Single Value)

Show current value with thresholds.

```json
{
  "type": "stat",
  "title": "Current Error Rate",
  "targets": [
    {
      "expr": "(sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))) * 100"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "percent",
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"value": 0, "color": "green"},
          {"value": 1, "color": "yellow"},
          {"value": 5, "color": "red"}
        ]
      }
    }
  },
  "options": {
    "graphMode": "area",
    "colorMode": "background"
  }
}
```

### 3. Gauge

Visual representation of a metric with min/max.

```json
{
  "type": "gauge",
  "title": "CPU Usage",
  "targets": [
    {
      "expr": "100 - (avg(rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100)"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "min": 0,
      "max": 100,
      "unit": "percent",
      "thresholds": {
        "steps": [
          {"value": 0, "color": "green"},
          {"value": 60, "color": "yellow"},
          {"value": 80, "color": "red"}
        ]
      }
    }
  }
}
```

### 4. Heatmap

Show distribution of values over time.

```json
{
  "type": "heatmap",
  "title": "Request Duration Distribution",
  "targets": [
    {
      "expr": "sum(increase(http_request_duration_seconds_bucket[1m])) by (le)",
      "format": "heatmap",
      "legendFormat": "{{le}}"
    }
  ],
  "options": {
    "calculate": false,
    "yAxis": {
      "format": "s",
      "logBase": 1
    }
  }
}
```

### 5. Table

Display metrics in tabular format.

```json
{
  "type": "table",
  "title": "Top Endpoints by Request Count",
  "targets": [
    {
      "expr": "topk(10, sum(rate(http_requests_total[5m])) by (endpoint))",
      "format": "table",
      "instant": true
    }
  ],
  "options": {
    "sortBy": [
      {"displayName": "Value", "desc": true}
    ]
  }
}
```

### 6. Bar Gauge

Horizontal bars for comparison.

```json
{
  "type": "bargauge",
  "title": "Requests by Status Code",
  "targets": [
    {
      "expr": "sum(rate(http_requests_total[5m])) by (status)"
    }
  ],
  "options": {
    "orientation": "horizontal",
    "displayMode": "gradient"
  }
}
```

---

## Variables and Templating {#variables}

### Query Variable (Prometheus)

```json
{
  "templating": {
    "list": [
      {
        "name": "instance",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(up, instance)",
        "refresh": 1,
        "multi": true,
        "includeAll": true
      },
      {
        "name": "job",
        "type": "query",
        "datasource": "Prometheus",
        "query": "label_values(up, job)",
        "refresh": 1
      },
      {
        "name": "interval",
        "type": "interval",
        "query": "1m,5m,10m,30m,1h",
        "auto": true,
        "auto_count": 30,
        "auto_min": "10s"
      }
    ]
  }
}
```

### Using Variables in Queries

```promql
# Use $instance variable
rate(http_requests_total{instance=~"$instance"}[$interval])

# Use $job variable
up{job="$job"}

# Multiple selection with regex
node_cpu_seconds_total{instance=~"$instance"}
```

### Advanced Variable Queries

```promql
# Chained variables (job depends on namespace)
label_values(kube_pod_info{namespace="$namespace"}, job)

# Label values from specific metric
label_values(http_requests_total, endpoint)

# Custom query
query_result(sum(rate(http_requests_total[5m])) by (service))
```

### Variable in Panel Title

```json
{
  "title": "Request Rate - $instance",
  "targets": [
    {
      "expr": "rate(http_requests_total{instance=~\"$instance\"}[5m])"
    }
  ]
}
```

---

## Alerting in Grafana {#alerting}

### Alert Rule Configuration

```json
{
  "type": "graph",
  "title": "High Error Rate",
  "alert": {
    "name": "High Error Rate Alert",
    "message": "Error rate is above 5%",
    "conditions": [
      {
        "type": "query",
        "query": {
          "params": ["A", "5m", "now"]
        },
        "reducer": {
          "type": "avg"
        },
        "evaluator": {
          "type": "gt",
          "params": [5]
        }
      }
    ],
    "frequency": "1m",
    "for": "5m",
    "noDataState": "no_data",
    "executionErrorState": "alerting"
  },
  "targets": [
    {
      "refId": "A",
      "expr": "(sum(rate(http_requests_total{status=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))) * 100"
    }
  ]
}
```

### Notification Channels

**Slack:**
```json
{
  "name": "Slack Alerts",
  "type": "slack",
  "settings": {
    "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ",
    "recipient": "#alerts",
    "username": "Grafana",
    "mentionChannel": "here"
  }
}
```

**Email:**
```json
{
  "name": "Email Alerts",
  "type": "email",
  "settings": {
    "addresses": "team@example.com;ops@example.com",
    "singleEmail": true
  }
}
```

**PagerDuty:**
```json
{
  "name": "PagerDuty",
  "type": "pagerduty",
  "settings": {
    "integrationKey": "xxx",
    "severity": "critical",
    "autoResolve": true
  }
}
```

### Alert Testing

```bash
# Test notification channel
POST /api/alert-notifications/test
{
  "name": "Slack Alerts",
  "type": "slack",
  "settings": {...}
}
```

---

## Best Practices {#best-practices}

### 1. Dashboard Organization

```
📁 Dashboards
├── 📊 Overview (high-level metrics)
├── 📂 Services
│   ├── API Gateway
│   ├── User Service
│   └── Order Service
├── 📂 Infrastructure
│   ├── Kubernetes Cluster
│   ├── Database Servers
│   └── Load Balancers
└── 📂 Business Metrics
    ├── Revenue
    └── User Analytics
```

### 2. Panel Naming

```
✅ Good:
- "Request Rate (last 5m)"
- "P95 Latency by Endpoint"
- "Error Rate %"

❌ Bad:
- "Graph 1"
- "Panel"
- "Metric"
```

### 3. Color Schemes

```json
{
  "fieldConfig": {
    "overrides": [
      {
        "matcher": {"id": "byName", "options": "GET"},
        "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "green"}}]
      },
      {
        "matcher": {"id": "byName", "options": "POST"},
        "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "blue"}}]
      },
      {
        "matcher": {"id": "byName", "options": "DELETE"},
        "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": "red"}}]
      }
    ]
  }
}
```

### 4. Performance Optimization

```promql
# ✅ Good: Use recording rules for expensive queries
job:http_requests:rate5m

# ❌ Bad: Complex query in every panel
sum(rate(http_requests_total[5m])) by (job, instance, method, endpoint, status)

# ✅ Good: Limit time range for high-cardinality metrics
http_requests_total[1h]

# ❌ Bad: Querying weeks of high-resolution data
http_requests_total[30d]
```

### 5. Templating Best Practices

```json
{
  "templating": {
    "list": [
      // ✅ Use "All" option for filtering
      {
        "name": "namespace",
        "includeAll": true,
        "allValue": ".*"
      },
      
      // ✅ Set reasonable refresh intervals
      {
        "name": "pod",
        "refresh": 2,  // On time range change and dashboard load
        "regex": "/^(prod|staging)-.*/",  // Filter options
        "sort": 1  // Alphabetical sort
      }
    ]
  }
}
```

---

## Advanced Features {#advanced}

### Annotations

Display events on graphs.

```json
{
  "annotations": {
    "list": [
      {
        "name": "Deployments",
        "datasource": "Prometheus",
        "expr": "changes(kube_deployment_status_observed_generation[5m]) > 0",
        "titleFormat": "Deployment",
        "textFormat": "{{deployment}}",
        "iconColor": "blue"
      }
    ]
  }
}
```

### Transformations

Modify query results before visualization.

**Join by Field:**
```json
{
  "transformations": [
    {
      "id": "merge",
      "options": {}
    },
    {
      "id": "organize",
      "options": {
        "excludeByName": {"Time": true},
        "renameByName": {"Value": "Requests"}
      }
    }
  ]
}
```

**Calculate Field:**
```json
{
  "transformations": [
    {
      "id": "calculateField",
      "options": {
        "mode": "binary",
        "reduce": {
          "reducer": "sum"
        },
        "binary": {
          "left": "errors",
          "operator": "/",
          "right": "total"
        },
        "alias": "error_rate"
      }
    }
  ]
}
```

### Plugins

**Install Panel Plugin:**
```bash
grafana-cli plugins install grafana-piechart-panel
docker restart grafana
```

**Popular Plugins:**
- `grafana-worldmap-panel` - Geographic data
- `grafana-piechart-panel` - Pie charts
- `grafana-polystat-panel` - Hexagon/polygon stats
- `grafana-clock-panel` - Clock widget

---

## Interview Questions {#interview-questions}

**Q1: How do you create dynamic dashboards in Grafana?**

**A:** Use templating variables:
1. Create query variables from label values
2. Reference variables in queries: `{instance=~"$instance"}`
3. Enable multi-select and "All" options
4. Chain variables (e.g., namespace → pod → container)
5. Use variables in panel titles and queries

**Q2: What's the difference between Grafana alerts and Prometheus alerts?**

**A:**
- **Prometheus**: Rule evaluation engine, flexible PromQL, Alertmanager integration
- **Grafana**: Dashboard-based alerts, multi-datasource support, built-in notification channels
- **Best Practice**: Use Prometheus for metric-based alerts, Grafana for visualization and dashboard annotations

**Q3: How do you optimize dashboard performance?**

**A:**
1. Use recording rules for expensive queries
2. Limit time ranges (avoid querying months of data)
3. Use variables to filter data dynamically
4. Set appropriate refresh intervals
5. Reduce cardinality in queries
6. Cache datasource queries
7. Use instant queries for current values

**Q4: Explain Grafana's transformation feature.**

**A:** Transformations process query results before visualization:
- **Merge**: Combine multiple queries
- **Filter**: Remove rows/columns
- **Organize**: Rename/reorder fields
- **Calculate**: Add computed fields
- **Join by field**: Combine by common column

Example: Merge CPU/Memory metrics, calculate percentage, filter by threshold.

---

## Hands-On Exercise {#exercise}

### Build a Comprehensive Microservices Dashboard

**Goal**: Create a production-ready dashboard with multiple panels, variables, and alerts.

#### Requirements

1. **Variables**: namespace, service, instance, interval
2. **Overview Row**: Request rate, error rate, latency, active connections
3. **HTTP Metrics Row**: Requests by method, status code distribution, endpoint breakdown
4. **Infrastructure Row**: CPU, memory, network, disk
5. **Business Metrics Row**: Orders, revenue, cache hit rate
6. **Alerts**: High error rate, slow response time

#### Complete Dashboard JSON

```json
{
  "dashboard": {
    "uid": "microservices-overview",
    "title": "Microservices Monitoring",
    "tags": ["microservices", "api"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "templating": {
      "list": [
        {
          "name": "datasource",
          "type": "datasource",
          "query": "prometheus"
        },
        {
          "name": "namespace",
          "type": "query",
          "datasource": "$datasource",
          "query": "label_values(kube_pod_info, namespace)",
          "refresh": 1,
          "includeAll": false
        },
        {
          "name": "service",
          "type": "query",
          "datasource": "$datasource",
          "query": "label_values(http_requests_total{namespace=\"$namespace\"}, service)",
          "refresh": 1,
          "includeAll": true,
          "multi": true
        },
        {
          "name": "interval",
          "type": "interval",
          "query": "1m,5m,10m,30m,1h",
          "auto": true,
          "auto_count": 30
        }
      ]
    },
    "panels": [
      {
        "type": "row",
        "title": "Overview",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 0}
      },
      {
        "type": "stat",
        "title": "Request Rate",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 1},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{namespace=\"$namespace\", service=~\"$service\"}[$interval]))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "decimals": 2,
            "color": {"mode": "thresholds"},
            "thresholds": {
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 100, "color": "yellow"},
                {"value": 500, "color": "red"}
              ]
            }
          }
        },
        "options": {
          "graphMode": "area",
          "colorMode": "value"
        }
      },
      {
        "type": "stat",
        "title": "Error Rate %",
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 1},
        "targets": [
          {
            "expr": "(sum(rate(http_requests_total{namespace=\"$namespace\", service=~\"$service\", status=~\"5..\"}[$interval])) / sum(rate(http_requests_total{namespace=\"$namespace\", service=~\"$service\"}[$interval]))) * 100"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "decimals": 2,
            "thresholds": {
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 1, "color": "yellow"},
                {"value": 5, "color": "red"}
              ]
            }
          }
        },
        "options": {
          "graphMode": "area",
          "colorMode": "background"
        }
      },
      {
        "type": "gauge",
        "title": "P95 Latency",
        "gridPos": {"h": 4, "w": 6, "x": 12, "y": 1},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace=\"$namespace\", service=~\"$service\"}[$interval])) by (le))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "min": 0,
            "max": 2,
            "thresholds": {
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 0.5, "color": "yellow"},
                {"value": 1, "color": "red"}
              ]
            }
          }
        }
      },
      {
        "type": "stat",
        "title": "Active Connections",
        "gridPos": {"h": 4, "w": 6, "x": 18, "y": 1},
        "targets": [
          {
            "expr": "sum(active_connections{namespace=\"$namespace\", service=~\"$service\"})"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "color": {"mode": "palette-classic"}
          }
        },
        "options": {
          "graphMode": "area"
        }
      },
      {
        "type": "row",
        "title": "HTTP Metrics",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 5}
      },
      {
        "type": "timeseries",
        "title": "Requests by Method",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 6},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{namespace=\"$namespace\", service=~\"$service\"}[$interval])) by (method)",
            "legendFormat": "{{method}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "custom": {
              "lineInterpolation": "smooth",
              "fillOpacity": 20
            }
          }
        }
      },
      {
        "type": "piechart",
        "title": "Status Code Distribution",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 6},
        "targets": [
          {
            "expr": "sum(increase(http_requests_total{namespace=\"$namespace\", service=~\"$service\"}[1h])) by (status)"
          }
        ],
        "options": {
          "legend": {
            "displayMode": "table",
            "values": ["value", "percent"]
          }
        }
      },
      {
        "type": "row",
        "title": "Infrastructure",
        "gridPos": {"h": 1, "w": 24, "x": 0, "y": 14}
      },
      {
        "type": "timeseries",
        "title": "CPU Usage %",
        "gridPos": {"h": 8, "w": 6, "x": 0, "y": 15},
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", pod=~\"$service-.*\"}[$interval])) by (pod) * 100",
            "legendFormat": "{{pod}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percent",
            "max": 100
          }
        }
      },
      {
        "type": "timeseries",
        "title": "Memory Usage",
        "gridPos": {"h": 8, "w": 6, "x": 6, "y": 15},
        "targets": [
          {
            "expr": "sum(container_memory_usage_bytes{namespace=\"$namespace\", pod=~\"$service-.*\"}) by (pod)",
            "legendFormat": "{{pod}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "bytes"
          }
        }
      },
      {
        "type": "timeseries",
        "title": "Network I/O",
        "gridPos": {"h": 8, "w": 6, "x": 12, "y": 15},
        "targets": [
          {
            "expr": "sum(rate(container_network_receive_bytes_total{namespace=\"$namespace\", pod=~\"$service-.*\"}[$interval])) by (pod)",
            "legendFormat": "RX {{pod}}"
          },
          {
            "expr": "sum(rate(container_network_transmit_bytes_total{namespace=\"$namespace\", pod=~\"$service-.*\"}[$interval])) by (pod)",
            "legendFormat": "TX {{pod}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "Bps"
          }
        }
      },
      {
        "type": "timeseries",
        "title": "Disk I/O",
        "gridPos": {"h": 8, "w": 6, "x": 18, "y": 15},
        "targets": [
          {
            "expr": "sum(rate(container_fs_reads_bytes_total{namespace=\"$namespace\", pod=~\"$service-.*\"}[$interval])) by (pod)",
            "legendFormat": "Read {{pod}}"
          },
          {
            "expr": "sum(rate(container_fs_writes_bytes_total{namespace=\"$namespace\", pod=~\"$service-.*\"}[$interval])) by (pod)",
            "legendFormat": "Write {{pod}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "Bps"
          }
        }
      }
    ]
  }
}
```

#### Import Dashboard

```bash
# Save dashboard JSON to file
cat > dashboard.json << 'EOF'
{... dashboard JSON ...}
EOF

# Import via API
curl -X POST -H "Content-Type: application/json" \
  -d @dashboard.json \
  http://admin:admin@localhost:3000/api/dashboards/db

# Or import via UI: Dashboards → Import → Upload JSON
```

#### Test Dashboard

```bash
# Generate metrics
for i in {1..1000}; do
  curl http://api:8080/api/products
  curl -X POST http://api:8080/api/orders
  sleep 0.1
done

# Verify variables populate
# Verify panels show data
# Test alert conditions by causing errors
```

---

## Summary

You've learned:
- ✅ Grafana installation and data source configuration
- ✅ Creating dashboards with multiple panel types
- ✅ Variables and templating for dynamic dashboards
- ✅ Alerting with notification channels
- ✅ Best practices for organization and performance
- ✅ Advanced features: annotations, transformations, plugins

**Next Module**: [Module 28: EFK Stack](28_EFK_Stack.md) - Learn centralized logging with Elasticsearch, Fluentd, and Kibana.
