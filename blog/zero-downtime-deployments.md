# Achieving Zero-Downtime Deployments in Kubernetes

**Published: January 2025 | Reading Time: 7 min**

Deploying applications without downtime is critical for modern businesses. This guide shows you how to achieve true zero-downtime deployments in Kubernetes.

## The Challenge

Traditional deployments often cause brief outages:
- Old pods terminate before new ones are ready
- Health checks aren't properly configured
- Database migrations cause downtime
- Load balancers remove backends prematurely

## Strategy 1: Rolling Updates with Proper Configuration

### Deployment Strategy
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0  # Critical: never go below desired replicas
      maxSurge: 1        # Create new pods before terminating old ones
  template:
    spec:
      containers:
      - name: app
        image: myapp:v2
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]  # Grace period for connections to drain
```

### Key Settings

**maxUnavailable: 0**
- Never reduce capacity during rollout
- Ensures minimum replicas always available

**maxSurge: 1**
- Creates new pod before terminating old one
- Temporarily exceeds desired replicas

**readinessProbe**
- Determines when pod is ready to receive traffic
- Service only routes to ready pods

**preStop Hook**
- Gives time for connections to drain
- Waits before SIGTERM

## Strategy 2: Blue-Green Deployment

Deploy new version alongside old, then switch traffic instantly:

```yaml
# Blue service (current production)
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue
  ports:
  - port: 80
    targetPort: 8080

---
# Deploy green (new version)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
      - name: app
        image: myapp:v2
```

**Cutover Process:**
1. Deploy green deployment
2. Verify green is healthy
3. Update service selector: `version: green`
4. Monitor for issues
5. Delete blue deployment if successful, or rollback by switching selector

**Advantages:**
- Instant cutover
- Easy rollback
- Test new version in production environment

**Disadvantages:**
- Requires 2x resources during deployment
- More complex to automate

## Strategy 3: Canary Deployment

Gradually shift traffic to new version:

```yaml
# Using Argo Rollouts
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 10    # 10% traffic to new version
      - pause: {duration: 2m}
      - setWeight: 25
      - pause: {duration: 2m}
      - setWeight: 50
      - pause: {duration: 2m}
      - setWeight: 100
      analysis:
        templates:
        - templateName: error-rate
        startingStep: 2
        args:
        - name: service-name
          value: myapp
```

**Analysis Template:**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate
spec:
  metrics:
  - name: error-rate
    interval: 1m
    successCondition: result < 0.05
    provider:
      prometheus:
        address: http://prometheus:9090
        query: |
          sum(rate(http_requests_total{service="{{args.service-name}}",status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total{service="{{args.service-name}}"}[5m]))
```

## Strategy 4: Database Migrations

Database changes are often the cause of downtime. Use backward-compatible migrations:

### Approach: Expand-Contract Pattern

**Phase 1: Expand (Additive Changes)**
```sql
-- Add new column (nullable initially)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT NULL;

-- Deploy application v2 that writes to both old and new schema
```

**Phase 2: Migrate Data**
```sql
-- Backfill data
UPDATE users SET email_verified = (verified_at IS NOT NULL) WHERE email_verified IS NULL;
```

**Phase 3: Contract (Remove Old)**
```sql
-- Make column non-nullable
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

-- Deploy application v3 that only uses new schema

-- Remove old column
ALTER TABLE users DROP COLUMN verified_at;
```

### Using Flyway/Liquibase
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  template:
    spec:
      initContainers:
      - name: migrate
        image: flyway/flyway
        command: ['flyway', 'migrate']
        env:
        - name: FLYWAY_URL
          value: jdbc:postgresql://db:5432/mydb
      containers:
      - name: app
        image: myapp:v2
      restartPolicy: Never
```

## Load Balancer Configuration

### Service Configuration
```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout: "60"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserves source IP, better for connection draining
  ports:
  - port: 80
    targetPort: 8080
```

## Handling Stateful Applications

### StatefulSet with PodManagementPolicy
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  podManagementPolicy: Parallel  # Update all pods simultaneously for faster rollout
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0  # Update pods from partition onwards
```

### Progressive Rollout
```bash
# Update one pod at a time
kubectl patch statefulset redis -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":2}}}}'
# Verify pod-2 is healthy
kubectl patch statefulset redis -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":1}}}}'
# Verify pod-1 is healthy
kubectl patch statefulset redis -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":0}}}}'
```

## Monitoring and Validation

### Key Metrics to Monitor
```promql
# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# Latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Pod restarts
rate(kube_pod_container_status_restarts_total[15m]) > 0
```

### Automated Rollback
```yaml
# Argo Rollouts automatic rollback
spec:
  strategy:
    canary:
      steps:
      - setWeight: 25
      - pause: {duration: 5m}
      analysis:
        templates:
        - templateName: error-rate
        args:
        - name: error-threshold
          value: "0.05"
      # Auto-rollback if analysis fails
      rollback:
        enabled: true
```

## Pre-Deployment Checklist

- [ ] Health checks configured (readiness + liveness)
- [ ] Resource requests and limits set
- [ ] PodDisruptionBudget created
- [ ] maxUnavailable set to 0
- [ ] preStop hook configured
- [ ] Database migrations are backward-compatible
- [ ] Monitoring alerts configured
- [ ] Rollback procedure documented
- [ ] Load testing completed in staging
- [ ] Gradual rollout strategy defined

## Conclusion

Zero-downtime deployments require careful planning and configuration. Key principles:

1. **Never reduce capacity**: `maxUnavailable: 0`
2. **Health checks are critical**: Readiness probes determine traffic routing
3. **Graceful shutdown**: preStop hooks and connection draining
4. **Backward-compatible changes**: Especially for databases
5. **Progressive rollout**: Canary or blue-green for risk mitigation
6. **Automated validation**: Metrics-driven rollback decisions

By following these strategies, you can achieve truly zero-downtime deployments and maintain high availability for your applications.

---

*Try these techniques in our [CI/CD Lab](../cicd-lab/index.html) at HPE Labs Hub.*
