# Module 30: Production Best Practices

## Table of Contents
- [Deployment Strategies](#deployment)
- [High Availability](#high-availability)
- [Security Hardening](#security)
- [Disaster Recovery](#disaster-recovery)
- [Performance Optimization](#performance)
- [Monitoring and Alerting](#monitoring)
- [Cost Optimization](#cost)
- [Interview Questions](#interview-questions)

---

## Deployment Strategies {#deployment}

### Blue-Green Deployment

Switch traffic between two identical environments.

```
Blue (Current: v1.0)  ──┐
                        ├──► Load Balancer ──► Users
Green (New: v1.1)    ───┘
```

**Kubernetes Implementation:**

```yaml
# blue-deployment.yaml (v1.0)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
      - name: myapp
        image: myapp:1.0
---
# green-deployment.yaml (v1.1)
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
      - name: myapp
        image: myapp:1.1
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
    version: blue  # Switch to 'green' to cut over
  ports:
  - port: 80
    targetPort: 8080
```

**Deployment Steps:**
```bash
# 1. Deploy green
kubectl apply -f green-deployment.yaml

# 2. Test green
kubectl port-forward deployment/myapp-green 8080:8080
curl localhost:8080/health

# 3. Switch traffic
kubectl patch service myapp -p '{"spec":{"selector":{"version":"green"}}}'

# 4. Monitor, rollback if needed
kubectl patch service myapp -p '{"spec":{"selector":{"version":"blue"}}}'

# 5. Delete old blue deployment
kubectl delete deployment myapp-blue
```

### Canary Deployment

Gradually shift traffic to new version.

```yaml
# Using Istio VirtualService
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: myapp
        subset: v2
  - route:
    - destination:
        host: myapp
        subset: v1
      weight: 90  # 90% to v1
    - destination:
        host: myapp
        subset: v2
      weight: 10  # 10% to v2
```

**Gradual Rollout:**
```bash
# Week 1: 10% canary
# Monitor error rates, latency

# Week 2: 50% canary
kubectl edit virtualservice myapp
# Update weights: v1=50, v2=50

# Week 3: 100% canary
# Update weights: v1=0, v2=100
```

### Rolling Update

Default Kubernetes strategy.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2        # Max 2 extra pods during update
      maxUnavailable: 1  # Max 1 pod down at a time
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:1.1
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

---

## High Availability {#high-availability}

### Multi-AZ Deployment

```yaml
# Spread pods across zones
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 6
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - myapp
            topologyKey: topology.kubernetes.io/zone
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: myapp
```

### Pod Disruption Budget

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2  # Or maxUnavailable: 1
  selector:
    matchLabels:
      app: myapp
```

### Health Checks

```go
// Liveness: Is the app alive?
http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
})

// Readiness: Is the app ready for traffic?
http.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
    if db.Ping() != nil {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
})
```

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Security Hardening {#security}

### Secrets Management

```bash
# Sealed Secrets (encrypted in Git)
kubectl create secret generic db-creds \
  --from-literal=username=admin \
  --from-literal=password=secret \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# External Secrets Operator (fetch from Vault/AWS)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-creds
spec:
  secretStoreRef:
    name: vault-backend
  target:
    name: db-creds
  data:
  - secretKey: password
    remoteRef:
      key: secret/db
      property: password
```

### RBAC

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
---
# Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-role
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-binding
subjects:
- kind: ServiceAccount
  name: myapp-sa
roleRef:
  kind: Role
  name: myapp-role
  apiGroup: rbac.authorization.k8s.io
```

### Network Policies

```yaml
# Deny all by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
---
# Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: myapp-policy
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: database
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: myapp
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
```

---

## Disaster Recovery {#disaster-recovery}

### Backup Strategy

**Velero Setup:**
```bash
# Install Velero
velero install \
  --provider aws \
  --bucket my-backup-bucket \
  --secret-file ./credentials-velero \
  --backup-location-config region=us-east-1

# Backup schedule
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production

# Restore
velero restore create --from-backup daily-backup-20241210
```

### Database Backups

```yaml
# CronJob for PostgreSQL backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:15
            command:
            - /bin/sh
            - -c
            - |
              pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
              gzip > /backup/db-$(date +%Y%m%d).sql.gz
              aws s3 cp /backup/db-$(date +%Y%m%d).sql.gz s3://backups/
            env:
            - name: DB_HOST
              valueFrom:
                secretKeyRef:
                  name: db-creds
                  key: host
          restartPolicy: OnFailure
```

### RTO/RPO

**Recovery Time Objective (RTO):** Max downtime
**Recovery Point Objective (RPO):** Max data loss

```
Strategy        RTO        RPO        Cost
------------------------------------------
Hot Standby     Minutes    Seconds    High
Warm Standby    Hours      Minutes    Medium
Cold Backup     Days       Hours      Low
```

---

## Performance Optimization {#performance}

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Resource Limits

```yaml
containers:
- name: myapp
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### Caching

```go
// Redis caching layer
func GetUser(ctx context.Context, userID string) (*User, error) {
    // Check cache
    cached, err := redisClient.Get(ctx, "user:"+userID).Result()
    if err == nil {
        var user User
        json.Unmarshal([]byte(cached), &user)
        return &user, nil
    }
    
    // Cache miss, query database
    user, err := db.QueryUser(userID)
    if err != nil {
        return nil, err
    }
    
    // Store in cache (TTL: 5 minutes)
    data, _ := json.Marshal(user)
    redisClient.Set(ctx, "user:"+userID, data, 5*time.Minute)
    
    return user, nil
}
```

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Use connection pooling
db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)

-- Read replicas for scaling
SELECT * FROM users WHERE id = ? -- Read replica
INSERT INTO users VALUES (...)   -- Primary
```

---

## Monitoring and Alerting {#monitoring}

### SLIs, SLOs, SLAs

**SLI (Service Level Indicator):** Metric
- Request latency: P95 < 200ms
- Error rate: < 0.1%
- Availability: 99.9%

**SLO (Service Level Objective):** Target
- 95% of requests < 200ms
- 99.9% uptime (43 min downtime/month)

**SLA (Service Level Agreement):** Contract
- 99.9% uptime or refund

### Error Budget

```
Monthly error budget = (1 - SLO) × Total requests
If SLO = 99.9%, budget = 0.1% = 1000 errors per 1M requests

Current: 500 errors → 50% budget consumed
Remaining: 500 errors before breaching SLO
```

### Alerting Rules

```yaml
# Prometheus alerts
groups:
- name: production
  rules:
  - alert: HighErrorRate
    expr: |
      (sum(rate(http_requests_total{status=~"5.."}[5m])) / 
       sum(rate(http_requests_total[5m]))) > 0.01
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Error rate > 1%"
  
  - alert: HighLatency
    expr: |
      histogram_quantile(0.95,
        rate(http_request_duration_seconds_bucket[5m])
      ) > 0.2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "P95 latency > 200ms"
```

---

## Cost Optimization {#cost}

### Right-Sizing

```bash
# Analyze resource usage
kubectl top pods -n production

# Identify over-provisioned pods
requests > 2x actual usage → reduce

# Use VPA (Vertical Pod Autoscaler)
kubectl apply -f vpa.yaml
```

### Spot Instances

```yaml
# EKS Node Group with Spot
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
nodeGroups:
  - name: spot-workers
    instancesDistribution:
      instanceTypes:
      - t3.medium
      - t3a.medium
      onDemandBaseCapacity: 2
      onDemandPercentageAboveBaseCapacity: 0
      spotInstancePools: 2
```

### Storage Optimization

```bash
# Delete unused PVCs
kubectl delete pvc unused-pvc

# Use storage classes with reclaim policy
kind: StorageClass
reclaimPolicy: Delete  # Auto-delete when PVC deleted
```

---

## Interview Questions {#interview-questions}

**Q1: Explain blue-green vs canary deployment.**

**A:**
- **Blue-Green**: Two identical environments, instant switch, easy rollback
  - Good for: Major releases, database migrations
  - Downside: 2x infrastructure cost during deployment
  
- **Canary**: Gradual traffic shift (10% → 50% → 100%)
  - Good for: Incremental risk, A/B testing
  - Downside: Longer deployment time, complex rollback

**Q2: How do you achieve zero-downtime deployment?**

**A:**
1. Rolling update with `maxUnavailable: 0`
2. Readiness probes (don't send traffic until ready)
3. Graceful shutdown (handle SIGTERM)
4. PodDisruptionBudget (min available pods)
5. Health checks (liveness + readiness)

**Q3: What is an error budget?**

**A:** Acceptable amount of downtime/errors before breaching SLO.
- SLO = 99.9% → 0.1% error budget
- Consumed by: outages, bugs, deployments
- When depleted: freeze releases, focus on reliability

**Q4: How do you secure secrets in Kubernetes?**

**A:**
1. **Never in Git**: Use external secret managers (Vault, AWS Secrets Manager)
2. **Encrypt at rest**: Enable encryption in etcd
3. **RBAC**: Limit access to secrets
4. **Rotation**: Regularly rotate credentials
5. **Tools**: Sealed Secrets, External Secrets Operator

**Q5: What's the difference between horizontal and vertical scaling?**

**A:**
- **Horizontal**: Add more pods (HPA) - preferred for stateless apps
- **Vertical**: Increase pod resources (VPA) - for stateful/legacy apps
- **Cluster**: Add more nodes (Cluster Autoscaler)

---

## Summary

You've learned:
- ✅ Deployment strategies: blue-green, canary, rolling
- ✅ High availability with multi-AZ and PDBs
- ✅ Security: RBAC, network policies, pod security
- ✅ Disaster recovery: backups, RTO/RPO
- ✅ Performance: HPA, caching, database optimization
- ✅ Monitoring: SLIs/SLOs/SLAs, error budgets
- ✅ Cost optimization: right-sizing, spot instances

**Next Module**: [Module 31: System Design Interview](31_System_Design_Interview.md) - Master system design problems for interviews.
