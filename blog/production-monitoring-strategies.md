# Production Monitoring Strategies for Kubernetes

**Published: January 2025 | Reading Time: 9 min**

Effective monitoring is the foundation of reliable Kubernetes operations. This guide covers comprehensive monitoring strategies from metrics to distributed tracing.

## The Monitoring Stack

### Core Components

1. **Metrics**: Prometheus
2. **Visualization**: Grafana
3. **Logging**: Loki or ELK Stack
4. **Tracing**: Jaeger or Tempo
5. **Alerting**: Alertmanager

## Metrics Collection Strategy

### The Four Golden Signals

**Latency**: How long requests take
```promql
# P95 latency
histogram_quantile(0.95, 
  rate(http_request_duration_seconds_bucket[5m])
)

# Per endpoint
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
)
```

**Traffic**: Request rate
```promql
# Requests per second
sum(rate(http_requests_total[5m]))

# By status code
sum(rate(http_requests_total[5m])) by (status)
```

**Errors**: Error rate
```promql
# Error percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) * 100
```

**Saturation**: Resource utilization
```promql
# CPU saturation
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod) 
/ 
sum(container_spec_cpu_quota/container_spec_cpu_period) by (pod) * 100

# Memory saturation
sum(container_memory_working_set_bytes) by (pod) 
/ 
sum(container_spec_memory_limit_bytes) by (pod) * 100
```

### USE Method (Resources)

**Utilization**: Average time resource was busy
```promql
# Node CPU utilization
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) by (instance) * 100)

# Disk utilization
100 - ((node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100)
```

**Saturation**: Degree of queued work
```promql
# CPU throttling (containers being throttled)
rate(container_cpu_cfs_throttled_seconds_total[5m])

# Memory pressure
rate(container_memory_failures_total[5m])
```

**Errors**: Count of error events
```promql
# OOM kills
rate(container_oom_events_total[5m])

# Disk errors
rate(node_disk_io_errors_total[5m])
```

### RED Method (Services)

**Rate**: Requests per second
```promql
sum(rate(http_requests_total[5m])) by (service)
```

**Errors**: Failed requests per second
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
```

**Duration**: Distribution of request latency
```promql
histogram_quantile(0.99, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)
```

## Kubernetes-Specific Metrics

### Cluster Health
```promql
# Node status
kube_node_status_condition{condition="Ready",status="true"}

# API server availability
up{job="kubernetes-apiservers"}

# Control plane components
up{job=~"kube-scheduler|kube-controller-manager|etcd"}
```

### Pod Health
```promql
# Pods not running
count(kube_pod_status_phase{phase!="Running"}) by (namespace)

# Pod restarts (crash loops)
rate(kube_pod_container_status_restarts_total[15m]) > 0

# Pods pending too long
kube_pod_status_phase{phase="Pending"} 
  * on(pod,namespace) 
  (time() - kube_pod_created) > 300
```

### Resource Capacity
```promql
# CPU capacity vs usage
sum(kube_node_status_allocatable{resource="cpu"}) 
- 
sum(kube_pod_container_resource_requests{resource="cpu"})

# Memory capacity
sum(kube_node_status_allocatable{resource="memory"}) 
- 
sum(kube_pod_container_resource_requests{resource="memory"})

# Disk pressure
100 - 
(kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes) * 100
```

## Logging Strategy

### Structured Logging

```go
// Go example with zap
logger.Info("User login",
    zap.String("user_id", "12345"),
    zap.String("ip", "192.168.1.1"),
    zap.Duration("duration", elapsed),
)

// Output (JSON)
{
  "level": "info",
  "msg": "User login",
  "user_id": "12345",
  "ip": "192.168.1.1",
  "duration": 125.5,
  "timestamp": "2025-01-05T10:30:00Z"
}
```

### Log Levels
- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning messages (potential issues)
- **ERROR**: Error messages (failures)
- **FATAL**: Critical errors (application crash)

### Loki Query Language (LogQL)

```logql
# Find errors in last hour
{namespace="production"} |= "error" | json

# Count errors by service
sum(count_over_time({namespace="production"} |= "error" [1h])) by (service)

# Find slow requests
{app="api"} | json | duration > 1s

# Pattern matching
{namespace="production"} |~ "timeout|connection refused"

# Extract and aggregate
sum by (status) (
  rate({app="nginx"} | json | __error__="" [5m])
)
```

## Distributed Tracing

### OpenTelemetry Instrumentation

```go
// Go example
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/trace"
)

func processRequest(ctx context.Context) {
    tracer := otel.Tracer("myapp")
    ctx, span := tracer.Start(ctx, "processRequest")
    defer span.End()
    
    // Add attributes
    span.SetAttributes(
        attribute.String("user.id", "12345"),
        attribute.Int64("item.count", 10),
    )
    
    // Call downstream service
    result := callDatabase(ctx)
    
    if err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, err.Error())
    }
}
```

### Jaeger Queries

```bash
# Find slow traces
service=myapp AND duration>1s

# Find errors
service=myapp AND error=true

# Specific operation
service=myapp AND operation=processPayment

# By tag
service=myapp AND http.status_code=500
```

## Alerting Best Practices

### Alert Design

```yaml
groups:
- name: SLO-based-alerts
  rules:
  # Error budget burn rate
  - alert: ErrorBudgetBurnRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[1h])) 
      / 
      sum(rate(http_requests_total[1h])) > 0.001
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate depleting error budget"
      description: "Error rate is {{ $value | humanizePercentage }}"
      runbook_url: "https://wiki.company.com/runbooks/error-budget"

  # Latency SLO violation
  - alert: HighLatency
    expr: |
      histogram_quantile(0.95, 
        sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
      ) > 0.5
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "P95 latency above SLO"
      description: "P95 latency is {{ $value }}s (SLO: 0.5s)"

  # Resource exhaustion
  - alert: PodMemoryExhaustion
    expr: |
      (sum(container_memory_working_set_bytes) by (pod,namespace) 
      / 
      sum(container_spec_memory_limit_bytes) by (pod,namespace)) > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} high memory"
      description: "Memory usage at {{ $value | humanizePercentage }}"
```

### Alert Routing

```yaml
# alertmanager.yml
route:
  receiver: 'default'
  group_by: ['alertname', 'cluster']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  
  routes:
  # Critical alerts to PagerDuty
  - match:
      severity: critical
    receiver: 'pagerduty'
    continue: true  # Also send to Slack
  
  # Critical alerts to Slack
  - match:
      severity: critical
    receiver: 'slack-critical'
  
  # Warnings to Slack only
  - match:
      severity: warning
    receiver: 'slack-warnings'
  
  # Database alerts to DBA team
  - match_re:
      alertname: ^Database.*
    receiver: 'dba-team'

receivers:
- name: 'pagerduty'
  pagerduty_configs:
  - service_key: '<pagerduty-key>'

- name: 'slack-critical'
  slack_configs:
  - api_url: '<webhook-url>'
    channel: '#critical-alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

- name: 'slack-warnings'
  slack_configs:
  - api_url: '<webhook-url>'
    channel: '#warnings'
```

## Dashboard Design

### Essential Dashboards

**1. Cluster Overview**
- Node status and resource utilization
- Pod distribution
- Network traffic
- Storage usage

**2. Application Dashboard**
- Request rate (RED)
- Error rate
- Latency (P50, P95, P99)
- Resource usage

**3. Infrastructure Dashboard**
- Node metrics (USE)
- Disk I/O
- Network I/O
- Control plane health

### Grafana Best Practices

```json
{
  "dashboard": {
    "title": "Service Overview",
    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "query": "label_values(kube_pod_info, namespace)"
        },
        {
          "name": "service",
          "type": "query",
          "query": "label_values(kube_service_info{namespace=\"$namespace\"}, service)"
        }
      ]
    },
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{namespace=\"$namespace\",service=\"$service\"}[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{namespace=\"$namespace\",service=\"$service\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{namespace=\"$namespace\",service=\"$service\"}[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Service Level Objectives (SLOs)

### Defining SLOs

```yaml
# SLO: 99.9% availability
# Error budget: 0.1% = 43.2 minutes/month

# SLI: Availability
availability = 
  (total_requests - error_requests) / total_requests

# SLI: Latency
latency_sli = 
  requests_under_threshold / total_requests

# Example: 95% of requests < 500ms
```

### Monitoring Error Budget

```promql
# Error budget remaining (30 days)
1 - (
  sum(increase(http_requests_total{status=~"5.."}[30d])) 
  / 
  sum(increase(http_requests_total[30d]))
) / 0.001  # SLO: 99.9%

# Days until error budget exhausted
(error_budget_remaining * 30) / current_error_rate
```

## Cost Optimization

### Monitor Unused Resources

```promql
# PVCs with low utilization
(kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes) < 0.2

# Oversized pods
container_memory_working_set_bytes 
/ 
container_spec_memory_limit_bytes < 0.5
```

### Right-Sizing Recommendations

```bash
# Use metrics-server and VPA recommender
kubectl top pods --all-namespaces
kubectl get vpa --all-namespaces
```

## Monitoring Checklist

- [ ] Prometheus scraping all targets
- [ ] Grafana dashboards for all critical services
- [ ] Alerts configured for SLO violations
- [ ] Runbooks linked in alert annotations
- [ ] Log aggregation (Loki/ELK) deployed
- [ ] Distributed tracing (Jaeger/Tempo) configured
- [ ] Alertmanager routing configured
- [ ] SLOs defined and tracked
- [ ] Error budgets monitored
- [ ] Cost optimization dashboards

## Conclusion

Effective monitoring requires:

1. **Comprehensive Coverage**: Metrics, logs, traces
2. **Actionable Alerts**: Based on SLOs, not symptoms
3. **Clear Dashboards**: Focus on what matters
4. **Fast Response**: Automated remediation where possible
5. **Continuous Improvement**: Regular review and optimization

Remember: Monitor what matters, alert on what's actionable.

---

*Learn hands-on monitoring in our [Prometheus & Grafana Lab](../prometheus-lab/index.html) at HPE Labs Hub.*
