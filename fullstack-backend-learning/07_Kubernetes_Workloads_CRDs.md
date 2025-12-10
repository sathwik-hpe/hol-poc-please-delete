# Module 07: Kubernetes Workloads & CRDs 🎯

## Master All Core Custom Resource Definitions

**Duration:** 5-6 hours  
**Prerequisites:** Module 06 (K8s Architecture)  
**Outcome:** Deep understanding of all 7 core workload types and when to use each

---

## 📚 Table of Contents

1. [Understanding CRDs](#understanding-crds)
2. [Pods - The Fundamental Unit](#pods---the-fundamental-unit)
3. [ReplicaSets - Replica Management](#replicasets---replica-management)
4. [Deployments - Declarative Updates](#deployments---declarative-updates)
5. [StatefulSets - Stateful Applications](#statefulsets---stateful-applications)
6. [DaemonSets - Node-Level Workloads](#daemonsets---node-level-workloads)
7. [Jobs - Run-to-Completion](#jobs---run-to-completion)
8. [CronJobs - Scheduled Tasks](#cronjobs---scheduled-tasks)
9. [Comparison & When to Use What](#comparison--when-to-use-what)
10. [Interview Questions](#interview-questions)
11. [Hands-On Exercise](#hands-on-exercise)

---

## Understanding CRDs

### What are Custom Resource Definitions?

**CRD (Custom Resource Definition)** extends Kubernetes API with custom objects.

```
Built-in Resources:        Custom Resources (via CRDs):
- Pods                     - PostgreSQL (operator)
- Services                 - Prometheus (operator)
- Deployments              - Certificate (cert-manager)
- ConfigMaps               - VirtualService (Istio)
```

### Core Workload CRDs

```yaml
# 7 Core Workload Types in Kubernetes

1. Pod              # Single instance, ephemeral
2. ReplicaSet       # Maintains replica count (rarely used directly)
3. Deployment       # Declarative updates, rollbacks (MOST COMMON)
4. StatefulSet      # Stateful apps (databases, Kafka)
5. DaemonSet        # One pod per node (logging, monitoring)
6. Job              # Run-to-completion tasks
7. CronJob          # Scheduled jobs
```

---

## Pods - The Fundamental Unit

### What is a Pod?

**Smallest deployable unit** in Kubernetes. Can contain one or more containers.

```
┌─────────────────────────────────┐
│           Pod                   │
│  ┌─────────────┐  ┌──────────┐ │
│  │  Container  │  │ Container│ │
│  │  (nginx)    │  │ (sidecar)│ │
│  └─────────────┘  └──────────┘ │
│  Shared:                        │
│  - Network namespace (localhost)│
│  - Storage volumes              │
│  - IPC namespace                │
└─────────────────────────────────┘
```

### Basic Pod

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-pod
  labels:
    app: nginx
    env: production
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    ports:
    - containerPort: 80
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"
```

```bash
# Create pod
kubectl apply -f pod.yaml

# Get pod details
kubectl get pod nginx-pod
kubectl describe pod nginx-pod

# Logs
kubectl logs nginx-pod

# Execute command
kubectl exec -it nginx-pod -- /bin/bash

# Delete pod
kubectl delete pod nginx-pod
```

### Multi-Container Pod (Sidecar Pattern)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-with-logger
spec:
  containers:
  # Main application
  - name: web-app
    image: nginx:1.21
    ports:
    - containerPort: 80
    volumeMounts:
    - name: shared-logs
      mountPath: /var/log/nginx
  
  # Sidecar: Log processor
  - name: log-processor
    image: busybox:1.35
    command: ["/bin/sh"]
    args: ["-c", "tail -f /logs/access.log"]
    volumeMounts:
    - name: shared-logs
      mountPath: /logs
  
  # Shared volume between containers
  volumes:
  - name: shared-logs
    emptyDir: {}
```

**Sidecar Use Cases:**
- Log forwarding (Fluentd, Filebeat)
- Service mesh proxy (Envoy, Istio)
- Configuration sync
- Monitoring agents

### Init Containers

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
spec:
  # Init containers run BEFORE main containers
  initContainers:
  - name: init-database
    image: busybox:1.35
    command: ['sh', '-c', 'until nslookup postgres-service; do echo waiting for postgres; sleep 2; done']
  
  - name: init-migrations
    image: myapp:1.0
    command: ['python', 'manage.py', 'migrate']
  
  # Main container starts only after init containers succeed
  containers:
  - name: myapp
    image: myapp:1.0
    ports:
    - containerPort: 8080
```

### Pod Lifecycle

```
┌──────────┐
│ Pending  │  Pod accepted, waiting for scheduling
└────┬─────┘
     │
     ▼
┌──────────┐
│ Running  │  All containers started successfully
└────┬─────┘
     │
     ├──────► ┌───────────┐
     │        │ Succeeded │  All containers exited with 0
     │        └───────────┘
     │
     └──────► ┌───────────┐
              │  Failed   │  Container exited with error
              └───────────┘

Other States:
- Unknown: Communication lost with node
- CrashLoopBackOff: Container keeps crashing
- ImagePullBackOff: Can't pull container image
```

### Pod Restart Policies

```yaml
spec:
  restartPolicy: Always    # Default: Always restart (for Deployments)
  # OR
  restartPolicy: OnFailure # Restart only if exits with error (for Jobs)
  # OR
  restartPolicy: Never     # Never restart (for one-off tasks)
```

### Health Checks

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    # Liveness Probe: Restart if fails
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
    
    # Readiness Probe: Remove from Service if fails
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
    
    # Startup Probe: For slow-starting containers
    startupProbe:
      httpGet:
        path: /startup
        port: 8080
      failureThreshold: 30
      periodSeconds: 10
```

**Probe Types:**
```yaml
# HTTP GET
livenessProbe:
  httpGet:
    path: /health
    port: 8080
    httpHeaders:
    - name: Custom-Header
      value: Awesome

# TCP Socket
livenessProbe:
  tcpSocket:
    port: 3306
  initialDelaySeconds: 15

# Command Execution
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
```

---

## ReplicaSets - Replica Management

### What is a ReplicaSet?

Ensures a specified number of pod replicas are running at all times.

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: nginx-replicaset
spec:
  replicas: 3  # Desired number of pods
  
  # Label selector: Which pods to manage
  selector:
    matchLabels:
      app: nginx
  
  # Pod template: How to create new pods
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
```

```bash
# Create ReplicaSet
kubectl apply -f replicaset.yaml

# Get ReplicaSets
kubectl get replicaset
kubectl get rs  # Short form

# Output:
# NAME               DESIRED   CURRENT   READY   AGE
# nginx-replicaset   3         3         3       1m

# Scale ReplicaSet
kubectl scale replicaset nginx-replicaset --replicas=5

# Delete ReplicaSet (and its pods)
kubectl delete replicaset nginx-replicaset
```

### How ReplicaSets Work

```
User: Create ReplicaSet with replicas=3

ReplicaSet Controller:
1. Watches API Server for ReplicaSet objects
2. Counts pods matching label selector (app=nginx)
3. Found 0 pods, need 3 → Create 3 pods
4. Continuously monitors:
   - If pod deleted → Create new one
   - If manual pod created → Delete extra pod
   - Always maintains exactly 3 replicas
```

### Label Selectors

```yaml
# Match Labels (equality-based)
selector:
  matchLabels:
    app: nginx
    tier: frontend

# Match Expressions (set-based)
selector:
  matchExpressions:
  - key: app
    operator: In
    values:
    - nginx
    - apache
  - key: tier
    operator: NotIn
    values:
    - database
  - key: environment
    operator: Exists  # Key must exist (any value)
```

### Why You Rarely Use ReplicaSets Directly

❌ **Don't use ReplicaSets directly** because:
- No rolling update mechanism
- No rollback capability
- No deployment history

✅ **Use Deployments instead** - they manage ReplicaSets for you with:
- Rolling updates
- Rollback support
- Update strategies
- Revision history

---

## Deployments - Declarative Updates

### What is a Deployment?

**Most common workload type** - manages ReplicaSets and provides declarative updates.

```
Deployment → Creates/Manages → ReplicaSet → Creates/Manages → Pods
```

### Basic Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  
  # Update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max pods above desired count during update
      maxUnavailable: 1  # Max pods unavailable during update
  
  # Pod template
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

```bash
# Create deployment
kubectl apply -f deployment.yaml

# Get deployments
kubectl get deployments
kubectl get deploy  # Short form

# Output:
# NAME               READY   UP-TO-DATE   AVAILABLE   AGE
# nginx-deployment   3/3     3            3           2m

# View ReplicaSets created by Deployment
kubectl get replicaset

# View Pods
kubectl get pods
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/nginx-deployment nginx=nginx:1.22

# Watch rollout status
kubectl rollout status deployment/nginx-deployment

# Output:
# Waiting for deployment "nginx-deployment" rollout to finish: 1 out of 3 new replicas have been updated...
# Waiting for deployment "nginx-deployment" rollout to finish: 2 out of 3 new replicas have been updated...
# Waiting for deployment "nginx-deployment" rollout to finish: 1 old replicas are pending termination...
# deployment "nginx-deployment" successfully rolled out
```

**Rolling Update Process:**

```
Initial State: 3 pods (v1.21)
┌─────┐ ┌─────┐ ┌─────┐
│ v1.21│ │v1.21│ │v1.21│
└─────┘ └─────┘ └─────┘

Step 1: Create new pod (v1.22)
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│v1.21│ │v1.21│ │v1.21│ │v1.22│  maxSurge=1 allows 4 pods
└─────┘ └─────┘ └─────┘ └─────┘

Step 2: Wait for new pod Ready, then delete old pod
┌─────┐ ┌─────┐ ┌─────┐
│v1.21│ │v1.21│ │v1.22│
└─────┘ └─────┘ └─────┘

Step 3: Repeat until all updated
┌─────┐ ┌─────┐ ┌─────┐
│v1.22│ │v1.22│ │v1.22│
└─────┘ └─────┘ └─────┘
```

### Rollback

```bash
# View rollout history
kubectl rollout history deployment/nginx-deployment

# Output:
# REVISION  CHANGE-CAUSE
# 1         <none>
# 2         Image updated to nginx:1.22

# Rollback to previous version
kubectl rollout undo deployment/nginx-deployment

# Rollback to specific revision
kubectl rollout undo deployment/nginx-deployment --to-revision=1

# Pause rollout (stop mid-update)
kubectl rollout pause deployment/nginx-deployment

# Resume rollout
kubectl rollout resume deployment/nginx-deployment
```

### Update Strategies

#### 1. RollingUpdate (Default)

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 25%         # Can be percentage or absolute number
    maxUnavailable: 25%   # Can be percentage or absolute number
```

**Example with 10 replicas:**
- `maxSurge: 3` → Can have up to 13 pods during update
- `maxUnavailable: 2` → Min 8 pods must be available

#### 2. Recreate

```yaml
strategy:
  type: Recreate  # Kill all old pods, then create new ones
```

**Use Cases:**
- When you can't run old and new versions simultaneously
- Database schema changes
- Resource constraints

### Scaling

```bash
# Imperative scaling
kubectl scale deployment nginx-deployment --replicas=5

# Declarative scaling (edit YAML)
kubectl edit deployment nginx-deployment
# Change replicas: 3 to replicas: 5

# Autoscaling (HPA - Horizontal Pod Autoscaler)
kubectl autoscale deployment nginx-deployment --min=3 --max=10 --cpu-percent=80
```

### Deployment Use Cases

✅ **Perfect for:**
- Stateless applications (web servers, APIs)
- Microservices
- Any app that can have multiple identical replicas
- Applications requiring rolling updates

❌ **Not suitable for:**
- Stateful apps requiring stable network identity (use StatefulSet)
- Node-level daemons (use DaemonSet)
- Batch jobs (use Job/CronJob)

---

## StatefulSets - Stateful Applications

### What is a StatefulSet?

For **stateful applications** that require:
- **Stable network identity** (predictable DNS names)
- **Stable persistent storage** (volumes tied to specific pods)
- **Ordered deployment and scaling**
- **Ordered rolling updates**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
spec:
  serviceName: "postgres"  # Headless service for stable network identity
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: mysecretpassword
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  
  # Volume Claim Template: Creates PVC for each pod
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 10Gi
```

### StatefulSet Pod Naming

```
Deployment:  nginx-deployment-abc123-xyz789  (random hash)
StatefulSet: postgresql-0, postgresql-1, postgresql-2  (predictable)

# DNS names (with headless service)
postgresql-0.postgres.default.svc.cluster.local
postgresql-1.postgres.default.svc.cluster.local
postgresql-2.postgres.default.svc.cluster.local
```

### Headless Service for StatefulSet

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None  # Headless service
  selector:
    app: postgres
  ports:
  - port: 5432
```

```bash
# With headless service, each pod gets DNS entry
nslookup postgresql-0.postgres.default.svc.cluster.local
# Returns: 10.244.1.5

# Normal service returns VIP, headless returns actual pod IPs
```

### Ordered Operations

```bash
# Creating Pods
kubectl apply -f statefulset.yaml

# Pods created sequentially:
1. postgresql-0 created → Wait until Running and Ready
2. postgresql-1 created → Wait until Running and Ready
3. postgresql-2 created → Done

# Deleting Pods (reverse order)
kubectl delete statefulset postgresql

# Pods deleted sequentially:
1. postgresql-2 deleted → Wait until terminated
2. postgresql-1 deleted → Wait until terminated
3. postgresql-0 deleted → Done
```

### Scaling StatefulSet

```bash
# Scale up (sequential)
kubectl scale statefulset postgresql --replicas=5
# Creates: postgresql-3, then postgresql-4

# Scale down (reverse sequential)
kubectl scale statefulset postgresql --replicas=2
# Deletes: postgresql-4, then postgresql-3
```

### Persistent Storage

```yaml
# Each pod gets its own PVC
kubectl get pvc

# NAME                         STATUS   VOLUME                                     
# postgres-storage-postgresql-0   Bound    pvc-abc123...
# postgres-storage-postgresql-1   Bound    pvc-def456...
# postgres-storage-postgresql-2   Bound    pvc-ghi789...

# If pod postgresql-1 is deleted and recreated,
# it gets the SAME PVC (postgres-storage-postgresql-1)
# Data persists across pod restarts!
```

### StatefulSet Update Strategy

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      partition: 0  # Only update pods with ordinal >= partition
```

```bash
# Update strategy examples

# 1. Update all pods (default)
kubectl set image statefulset/postgresql postgres=postgres:15

# Pods updated in reverse order:
# postgresql-2 → postgresql-1 → postgresql-0

# 2. Canary rollout (test on one pod first)
kubectl patch statefulset postgresql -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":2}}}}'
kubectl set image statefulset/postgresql postgres=postgres:15
# Only postgresql-2 updated (ordinal >= 2)

# If successful, update all
kubectl patch statefulset postgresql -p '{"spec":{"updateStrategy":{"rollingUpdate":{"partition":0}}}}'
```

### StatefulSet Use Cases

✅ **Perfect for:**
- Databases (PostgreSQL, MySQL, MongoDB)
- Distributed systems (Kafka, Elasticsearch, Redis cluster)
- Applications requiring stable identity
- Master-slave configurations

❌ **Not suitable for:**
- Stateless applications (use Deployment)
- Node-level daemons (use DaemonSet)

---

## DaemonSets - Node-Level Workloads

### What is a DaemonSet?

Ensures **one pod runs on every node** (or selected nodes).

```
Cluster with 5 nodes:
┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐
│Node 1│  │Node 2│  │Node 3│  │Node 4│  │Node 5│
└───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘
    │         │         │         │         │
┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
│ Pod   │ │ Pod   │ │ Pod   │ │ Pod   │ │ Pod   │
│(logger)│(logger)│(logger)│(logger)│(logger)│
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘

New node added? → Pod automatically scheduled
Node removed? → Pod automatically deleted
```

### Basic DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-logger
spec:
  selector:
    matchLabels:
      name: fluentd-logger
  
  template:
    metadata:
      labels:
        name: fluentd-logger
    spec:
      # Tolerations allow running on master nodes
      tolerations:
      - key: node-role.kubernetes.io/master
        effect: NoSchedule
      
      containers:
      - name: fluentd
        image: fluentd:v1.14
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      
      # Access host logs
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

```bash
# Create DaemonSet
kubectl apply -f daemonset.yaml

# View DaemonSet
kubectl get daemonset
kubectl get ds  # Short form

# Output:
# NAME              DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   
# fluentd-logger    5         5         5       5            5           

# Pods on each node
kubectl get pods -o wide
```

### Node Selection

```yaml
# Run on nodes with specific labels
spec:
  template:
    spec:
      nodeSelector:
        disktype: ssd  # Only nodes with label disktype=ssd

# OR use affinity (more flexible)
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: kubernetes.io/os
                operator: In
                values:
                - linux
```

### Update Strategy

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1  # Update one node at a time
```

```bash
# Update DaemonSet
kubectl set image daemonset/fluentd-logger fluentd=fluentd:v1.15

# Rollout status
kubectl rollout status daemonset/fluentd-logger
```

### DaemonSet Use Cases

✅ **Perfect for:**
- **Log collectors** (Fluentd, Filebeat, Logstash)
- **Monitoring agents** (Prometheus Node Exporter, Datadog agent)
- **Network plugins** (CNI like Calico, Weave)
- **Storage daemons** (Ceph, GlusterFS)
- **Security agents** (Falco, Sysdig)

---

## Jobs - Run-to-Completion

### What is a Job?

Runs pods until **successful completion** (exit code 0).

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-migration
spec:
  # Job completion settings
  completions: 5        # Run 5 successful pods
  parallelism: 2        # Max 2 pods running concurrently
  backoffLimit: 3       # Retry up to 3 times on failure
  activeDeadlineSeconds: 600  # Timeout after 10 minutes
  
  template:
    spec:
      restartPolicy: OnFailure  # Required for Jobs
      containers:
      - name: migration
        image: myapp:1.0
        command: ["python", "migrate.py"]
```

```bash
# Create job
kubectl apply -f job.yaml

# Watch job progress
kubectl get jobs -w

# Output:
# NAME             COMPLETIONS   DURATION   AGE
# data-migration   0/5           10s        10s
# data-migration   1/5           25s        25s
# data-migration   2/5           40s        40s
# data-migration   5/5           2m         2m

# View pods created by job
kubectl get pods --selector=job-name=data-migration
```

### Job Patterns

#### Pattern 1: Single Completion

```yaml
spec:
  completions: 1  # Default
  parallelism: 1
```

#### Pattern 2: Parallel Jobs with Fixed Completion Count

```yaml
spec:
  completions: 10   # Need 10 successful completions
  parallelism: 3    # Run 3 at a time
```

```
Progress:
[Pod1][Pod2][Pod3]           → 3 running
[Pod1✓][Pod2][Pod3✓]        → 2 complete, 1 running
[Pod4][Pod2][Pod5]           → 3 running
...continues until 10 complete
```

#### Pattern 3: Work Queue (Dynamic Completion)

```yaml
spec:
  completions: null  # Unset
  parallelism: 5     # 5 workers processing queue
```

```go
// Worker logic
for {
    task := queue.Dequeue()
    if task == nil {
        break  // Queue empty, exit successfully
    }
    process(task)
}
```

### Job Cleanup

```yaml
spec:
  ttlSecondsAfterFinished: 3600  # Delete job 1 hour after completion
```

```bash
# Manual cleanup
kubectl delete job data-migration

# This deletes the Job AND all its pods
```

### Job Use Cases

✅ **Perfect for:**
- Database migrations
- Batch processing
- Data imports/exports
- One-time administrative tasks
- Report generation

---

## CronJobs - Scheduled Tasks

### What is a CronJob?

Creates **Jobs on a schedule** (like Unix cron).

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-database
spec:
  schedule: "0 2 * * *"  # Every day at 2 AM (UTC)
  
  # Concurrency policy
  concurrencyPolicy: Forbid  # Don't run if previous job still running
  
  # Keep history
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  
  # Job template
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:14
            command:
            - /bin/sh
            - -c
            - pg_dump -h postgres -U admin mydb > /backup/backup-$(date +%Y%m%d).sql
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
```

### Cron Schedule Format

```
# ┌───────────── minute (0 - 59)
# │ ┌───────────── hour (0 - 23)
# │ │ ┌───────────── day of month (1 - 31)
# │ │ │ ┌───────────── month (1 - 12)
# │ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
# │ │ │ │ │
# * * * * *

Examples:
"0 * * * *"      # Every hour at minute 0
"*/5 * * * *"    # Every 5 minutes
"0 2 * * *"      # Every day at 2 AM
"0 0 * * 0"      # Every Sunday at midnight
"0 9 * * 1-5"    # Weekdays at 9 AM
"0 0 1 * *"      # First day of every month
"0 */6 * * *"    # Every 6 hours
```

### Concurrency Policies

```yaml
spec:
  concurrencyPolicy: Allow    # Allow concurrent jobs (default)
  # OR
  concurrencyPolicy: Forbid   # Skip new run if previous still running
  # OR
  concurrencyPolicy: Replace  # Cancel old job, start new one
```

**Example Scenarios:**

```
Schedule: "*/1 * * * *" (every minute)
Job duration: 90 seconds

Policy: Allow
├─ 10:00 - Job 1 starts
├─ 10:01 - Job 2 starts (Job 1 still running)
└─ 10:02 - Job 3 starts (Job 1 and 2 still running)

Policy: Forbid
├─ 10:00 - Job 1 starts
├─ 10:01 - Skipped (Job 1 still running)
└─ 10:02 - Job 2 starts (Job 1 finished)

Policy: Replace
├─ 10:00 - Job 1 starts
├─ 10:01 - Job 1 killed, Job 2 starts
└─ 10:02 - Job 2 killed, Job 3 starts
```

### Suspended CronJobs

```yaml
spec:
  suspend: true  # Temporarily disable cron job
```

```bash
# Suspend
kubectl patch cronjob backup-database -p '{"spec":{"suspend":true}}'

# Resume
kubectl patch cronjob backup-database -p '{"spec":{"suspend":false}}'
```

### CronJob Commands

```bash
# Create CronJob
kubectl apply -f cronjob.yaml

# List CronJobs
kubectl get cronjobs
kubectl get cj  # Short form

# View jobs created by CronJob
kubectl get jobs --selector=cronjob=backup-database

# Manually trigger job from CronJob
kubectl create job backup-manual --from=cronjob/backup-database

# View last schedule time
kubectl get cronjob backup-database -o yaml | grep lastScheduleTime
```

### CronJob Use Cases

✅ **Perfect for:**
- Database backups
- Report generation
- Data cleanup/archival
- Certificate renewal
- Health checks
- Periodic data synchronization

---

## Comparison & When to Use What

### Quick Reference Table

| Workload     | Use Case                          | Replicas      | Scaling | Updates | Stable Identity |
|--------------|-----------------------------------|---------------|---------|---------|-----------------|
| **Pod**      | Testing, debugging                | 1             | Manual  | None    | No              |
| **ReplicaSet** | Rarely used directly            | Multiple      | Manual  | None    | No              |
| **Deployment** | Stateless apps (most common)    | Multiple      | Manual/Auto | Rolling | No         |
| **StatefulSet** | Stateful apps (databases)      | Multiple      | Manual  | Ordered | Yes             |
| **DaemonSet** | Node-level agents                | 1 per node    | Auto    | Rolling | No              |
| **Job**      | One-off tasks                     | 1 or more     | N/A     | N/A     | No              |
| **CronJob**  | Scheduled tasks                   | 1 or more     | N/A     | N/A     | No              |

### Decision Tree

```
Need to run a workload?
│
├─ One pod per node? → DaemonSet
│
├─ One-time task?
│  ├─ Run once → Job
│  └─ Run on schedule → CronJob
│
└─ Long-running service?
   ├─ Stateless (web server, API)? → Deployment
   └─ Stateful (database, message queue)? → StatefulSet
```

### Real-World Examples

```yaml
# Web Application (Deployment)
- Frontend: React app → Deployment (3 replicas)
- Backend API: Go service → Deployment (5 replicas)

# Databases (StatefulSet)
- PostgreSQL cluster → StatefulSet (3 replicas)
- MongoDB replica set → StatefulSet (3 replicas)
- Kafka cluster → StatefulSet (3 brokers)

# Infrastructure (DaemonSet)
- Fluentd log collector → DaemonSet
- Prometheus Node Exporter → DaemonSet
- Calico network plugin → DaemonSet

# Batch Processing (Job)
- Database migration → Job
- Data import → Job

# Scheduled Tasks (CronJob)
- Daily backup → CronJob (schedule: "0 2 * * *")
- Hourly cleanup → CronJob (schedule: "0 * * * *")
```

---

## Interview Questions

**Q1: What's the difference between Deployment and StatefulSet?**

**Answer:**
- **Deployment**: Stateless apps, random pod names, no stable network identity, any pod can be replaced
- **StatefulSet**: Stateful apps, predictable pod names (name-0, name-1), stable network identity, ordered operations, persistent storage tied to specific pods

**Q2: When would you use a DaemonSet?**

**Answer:** When you need exactly one pod per node, typically for:
- Log collection (Fluentd)
- Monitoring (Prometheus Node Exporter)
- Network plugins (CNI)
- Storage daemons
Any infrastructure component that must run on every node.

**Q3: Explain the difference between Job completions and parallelism.**

**Answer:**
- `completions`: Total number of successful pod executions needed
- `parallelism`: Max number of pods running concurrently
Example: `completions=10, parallelism=3` runs 3 pods at a time until 10 total successes.

**Q4: What happens during a rolling update of a Deployment?**

**Answer:**
1. Creates new ReplicaSet with updated pod template
2. Gradually scales up new ReplicaSet (respecting maxSurge)
3. Gradually scales down old ReplicaSet (respecting maxUnavailable)
4. Process continues until all pods updated
5. Old ReplicaSet kept for rollback (scaled to 0)

**Q5: Why use StatefulSet volumeClaimTemplates instead of a single PVC?**

**Answer:** volumeClaimTemplates creates a unique PVC for each pod. If using a single PVC:
- All pods would share the same storage (data conflicts)
- Can't use ReadWriteOnce volumes (only one pod can mount)
- No data isolation between replicas
Each StatefulSet pod needs its own persistent storage.

---

## Hands-On Exercise

### Task: Deploy Complete Application Stack

**Deploy a realistic application with all workload types:**

```yaml
# 1. Deployment: Web Frontend
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80

---
# 2. StatefulSet: Database
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        env:
        - name: POSTGRES_PASSWORD
          value: password123
        ports:
        - containerPort: 5432

---
# 3. DaemonSet: Log Collector
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd
spec:
  selector:
    matchLabels:
      name: fluentd
  template:
    metadata:
      labels:
        name: fluentd
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.14
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log

---
# 4. CronJob: Database Backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup
spec:
  schedule: "*/5 * * * *"  # Every 5 minutes for testing
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: postgres:14
            command: ["/bin/sh", "-c", "echo 'Backup completed at $(date)'"]
```

**Tasks:**
1. Deploy all resources
2. Verify each workload type is running
3. Scale the Deployment to 5 replicas
4. Check CronJob creates Jobs every 5 minutes
5. Verify DaemonSet has one pod per node
6. Test StatefulSet pod has stable name after deletion

```bash
# Solution commands
kubectl apply -f stack.yaml
kubectl get all
kubectl scale deployment frontend --replicas=5
kubectl get cronjobs
kubectl get daemonsets
kubectl delete pod postgres-0 && kubectl get pods -w
```

---

## 📚 Additional Resources

- [Kubernetes Workloads](https://kubernetes.io/docs/concepts/workloads/)
- [Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [DaemonSets](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [CronJobs](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

---

## ✅ Module Checklist

- [ ] Understand all 7 core CRDs and their purposes
- [ ] Know when to use Deployment vs StatefulSet
- [ ] Configure health checks (liveness, readiness, startup)
- [ ] Implement rolling updates and rollbacks
- [ ] Deploy StatefulSet with persistent storage
- [ ] Create DaemonSet for node-level workloads
- [ ] Schedule tasks with CronJobs
- [ ] Complete multi-workload hands-on exercise

---

**Next Module:** [Module 08: Kubernetes Networking](./08_Kubernetes_Networking.md) - Master Services, Ingress, and NetworkPolicies! 🌐
