# Module 06: Kubernetes Architecture ☸️

## Master Container Orchestration at Scale

**Duration:** 4-5 hours  
**Prerequisites:** Basic Docker knowledge, Module 01-05 (Go fundamentals)  
**Outcome:** Understand Kubernetes architecture and how all components work together

---

## 📚 Table of Contents

1. [What is Kubernetes?](#what-is-kubernetes)
2. [Kubernetes Architecture Overview](#kubernetes-architecture-overview)
3. [Control Plane Components](#control-plane-components)
4. [Node Components](#node-components)
5. [Kubernetes Objects](#kubernetes-objects)
6. [How Everything Works Together](#how-everything-works-together)
7. [Installation Options](#installation-options)
8. [kubectl Basics](#kubectl-basics)
9. [Best Practices](#best-practices)
10. [Interview Questions](#interview-questions)
11. [Hands-On Exercise](#hands-on-exercise)

---

## What is Kubernetes?

### Definition

**Kubernetes (K8s)** is an open-source container orchestration platform that automates:
- **Deployment** of containerized applications
- **Scaling** (horizontal and vertical)
- **Management** (health checks, updates, rollbacks)
- **Networking** (service discovery, load balancing)
- **Storage** (persistent volumes)

### Why Kubernetes?

✅ **Benefits:**
- **Auto-healing**: Automatically restarts failed containers
- **Horizontal scaling**: Scale applications up/down based on load
- **Service discovery**: Automatic DNS and load balancing
- **Rolling updates**: Zero-downtime deployments
- **Secret management**: Secure handling of credentials
- **Resource optimization**: Efficient bin-packing of containers

### Who Uses Kubernetes?

🏢 **Production Users:**
- Google (created K8s, runs billions of containers)
- Spotify (manages 300+ microservices)
- Airbnb (runs 1000s of services across clusters)
- Pinterest (migrated from EC2 to K8s)
- Netflix, Uber, Twitter, and thousands more

---

## Kubernetes Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CONTROL PLANE                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │   etcd   │  │ API      │  │Scheduler │  │ Control│ │
│  │ (DB)     │  │ Server   │  │          │  │Manager │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          │ API calls
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    WORKER NODES                          │
│  ┌────────────────────┐  ┌────────────────────┐        │
│  │   Node 1           │  │   Node 2           │        │
│  │  ┌──────────────┐  │  │  ┌──────────────┐  │        │
│  │  │   kubelet    │  │  │  │   kubelet    │  │        │
│  │  │   kube-proxy │  │  │  │   kube-proxy │  │        │
│  │  │   Container  │  │  │  │   Container  │  │        │
│  │  │   Runtime    │  │  │  │   Runtime    │  │        │
│  │  └──────────────┘  │  │  └──────────────┘  │        │
│  │  ┌──────┐ ┌──────┐│  │  ┌──────┐ ┌──────┐│        │
│  │  │ Pod  │ │ Pod  ││  │  │ Pod  │ │ Pod  ││        │
│  │  └──────┘ └──────┘│  │  └──────┘ └──────┘│        │
│  └────────────────────┘  └────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Two Main Parts

1. **Control Plane** (Master)
   - Brain of the cluster
   - Makes scheduling decisions
   - Detects and responds to events
   - Usually runs on dedicated master nodes

2. **Worker Nodes**
   - Run application workloads (Pods)
   - Execute instructions from control plane
   - Report status back to control plane

---

## Control Plane Components

### 1. API Server (`kube-apiserver`)

**The front door to Kubernetes**

```bash
# All kubectl commands go through API server
kubectl get pods
# → HTTP GET /api/v1/namespaces/default/pods

kubectl create deployment nginx --image=nginx
# → HTTP POST /apis/apps/v1/namespaces/default/deployments
```

**Responsibilities:**
- Exposes Kubernetes API (REST)
- Authentication and authorization
- Validates and processes API requests
- Updates etcd with cluster state
- Only component that talks to etcd

**Key Features:**
```yaml
# API server supports:
- RESTful API (GET, POST, PUT, DELETE)
- Watch mechanism (streaming updates)
- Admission controllers (validation, mutation)
- API versioning (v1, v1beta1, etc.)
```

### 2. etcd

**Distributed key-value store - the cluster's database**

```bash
# etcd stores everything:
/registry/pods/default/nginx-abc123
/registry/services/default/my-service
/registry/deployments/default/web-app
/registry/secrets/default/db-password
```

**Characteristics:**
- **Consistency**: Uses Raft consensus algorithm
- **Reliability**: Distributed (typically 3-5 nodes)
- **Performance**: Fast reads, consistent writes
- **Watch API**: Notifies on changes

**What's Stored:**
```
✅ Pods
✅ Services
✅ ConfigMaps
✅ Secrets
✅ Deployments
✅ Namespaces
✅ All cluster state
```

**Critical Note:** 🔴
```bash
# etcd is CRITICAL - if etcd dies, cluster is dead
# Always backup etcd!
etcdctl snapshot save backup.db
```

### 3. Scheduler (`kube-scheduler`)

**Decides which node runs each Pod**

```
User creates Pod → API Server → Scheduler watches for unscheduled Pods
                                      ↓
                        Finds best node using:
                        - Resource requirements (CPU, memory)
                        - Node affinity rules
                        - Taints and tolerations
                        - Data locality
                        - Inter-pod affinity
                                      ↓
                        Binds Pod to selected Node
```

**Scheduling Algorithm:**
```go
// Simplified scheduling logic
func SchedulePod(pod *Pod, nodes []Node) Node {
    // 1. Filtering (Predicate) - Remove invalid nodes
    feasibleNodes := filter(nodes, func(n Node) bool {
        return n.HasEnoughResources(pod) &&
               n.MatchesNodeSelector(pod) &&
               !n.HasConflictingTaint(pod)
    })
    
    // 2. Scoring (Priority) - Rank remaining nodes
    scores := scoreNodes(feasibleNodes, pod)
    
    // 3. Select highest scoring node
    return selectBestNode(scores)
}
```

**Example: Pod Scheduling**
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx
    resources:
      requests:
        cpu: "500m"      # Scheduler needs 0.5 CPU available
        memory: "256Mi"  # and 256MB memory
      limits:
        cpu: "1"
        memory: "512Mi"
  nodeSelector:
    disktype: ssd      # Only nodes with SSD
```

### 4. Controller Manager (`kube-controller-manager`)

**Runs multiple controllers that watch and reconcile cluster state**

**Key Controllers:**

```yaml
1. Node Controller:
   - Monitors node health
   - Evicts pods from unhealthy nodes
   
2. Replication Controller:
   - Ensures correct number of pod replicas
   
3. Deployment Controller:
   - Manages Deployments (rolling updates, rollbacks)
   
4. Service Controller:
   - Creates cloud load balancers for Services
   
5. Endpoint Controller:
   - Populates Endpoints (joins Services and Pods)
   
6. Job Controller:
   - Runs one-off tasks
   
7. CronJob Controller:
   - Schedules recurring jobs
```

**Reconciliation Loop:**
```go
// All controllers follow this pattern
for {
    desiredState := getDesiredStateFromAPI()
    currentState := getActualStateFromCluster()
    
    if currentState != desiredState {
        takeActionToReconcile()
    }
    
    sleep(reconciliationInterval)
}
```

**Example: Deployment Controller**
```yaml
# Desired state: 3 replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3  # ← Desired state
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
```

```
Controller sees: 2 pods running (Current state)
Desired state: 3 replicas
Action: Create 1 more pod

Controller sees: 4 pods running
Desired state: 3 replicas  
Action: Delete 1 pod
```

### 5. Cloud Controller Manager

**Integrates with cloud providers (AWS, GCP, Azure)**

```yaml
Responsibilities:
- Node Controller: Check cloud provider if node deleted
- Route Controller: Set up routes in cloud network
- Service Controller: Create cloud load balancers
- Volume Controller: Create/attach/mount cloud volumes

# Example: AWS Load Balancer
apiVersion: v1
kind: Service
metadata:
  name: web
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer  # Cloud controller creates AWS NLB
  selector:
    app: web
  ports:
  - port: 80
```

---

## Node Components

### 1. kubelet

**Node agent - ensures containers are running**

```
┌─────────────────────────────────────┐
│            kubelet                  │
│  ┌──────────────────────────────┐   │
│  │ 1. Watches API Server        │   │
│  │    for Pods assigned to node │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 2. Talks to Container        │   │
│  │    Runtime (Docker/containerd)│  │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 3. Reports Pod status back   │   │
│  │    to API Server             │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │ 4. Monitors Pod health       │   │
│  │    (liveness/readiness)      │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Key Responsibilities:**
```bash
✅ Pod lifecycle management
✅ Mount volumes to pods
✅ Download secrets
✅ Execute container health checks
✅ Report metrics (CPU, memory usage)
✅ Execute pod lifecycle hooks
```

**Example: kubelet in action**
```yaml
# API Server assigns this Pod to node-1
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx
    livenessProbe:     # kubelet runs this check
      httpGet:
        path: /
        port: 80
      initialDelaySeconds: 3
      periodSeconds: 3
```

```bash
# kubelet on node-1:
1. Sees new Pod assignment
2. Pulls nginx image
3. Creates container
4. Starts liveness probe (HTTP GET / every 3s)
5. Reports "Running" status to API Server
```

### 2. kube-proxy

**Manages network rules for Pod communication**

```
Service: web (ClusterIP: 10.96.1.100)
         ↓
kube-proxy creates iptables rules:
         ↓
Traffic to 10.96.1.100:80
         ↓
Load balanced to:
  - Pod 1: 192.168.1.10:8080
  - Pod 2: 192.168.1.11:8080
  - Pod 3: 192.168.1.12:8080
```

**Modes:**

1. **iptables mode** (default):
```bash
# kube-proxy creates iptables rules
sudo iptables-save | grep "my-service"
# -A KUBE-SVC-XXX -m statistic --mode random --probability 0.33 -j KUBE-SEP-POD1
# -A KUBE-SVC-XXX -m statistic --mode random --probability 0.50 -j KUBE-SEP-POD2
# -A KUBE-SVC-XXX -j KUBE-SEP-POD3
```

2. **IPVS mode** (higher performance):
```bash
# Better for clusters with many services
ipvsadm -Ln
# TCP  10.96.1.100:80 rr
#   -> 192.168.1.10:8080  Masq    1      0          0
#   -> 192.168.1.11:8080  Masq    1      0          0
```

### 3. Container Runtime

**Actually runs containers (Docker, containerd, CRI-O)**

```bash
# Kubernetes doesn't run containers directly
# It uses Container Runtime Interface (CRI)

kubelet → CRI → containerd → runc → Container

# Most common runtimes:
1. containerd (Docker's core, now standalone)
2. CRI-O (RedHat's lightweight runtime)  
3. Docker (deprecated in K8s 1.24+, use containerd)
```

**Container Runtime Interface:**
```go
// CRI defines standard interface
type RuntimeService interface {
    // Pod operations
    RunPodSandbox(config *PodSandboxConfig) (string, error)
    StopPodSandbox(podSandboxID string) error
    
    // Container operations
    CreateContainer(podSandboxID string, config *ContainerConfig) (string, error)
    StartContainer(containerID string) error
    StopContainer(containerID string, timeout int64) error
    RemoveContainer(containerID string) error
}
```

---

## Kubernetes Objects

### Core Objects

```yaml
# 1. Pod - Smallest deployable unit
apiVersion: v1
kind: Pod
metadata:
  name: nginx
spec:
  containers:
  - name: nginx
    image: nginx:1.21

---
# 2. Service - Exposes Pods to network
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 8080

---
# 3. Deployment - Manages Pod replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21

---
# 4. ConfigMap - Configuration data
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgres://db:5432/myapp"
  log_level: "info"

---
# 5. Secret - Sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  password: cGFzc3dvcmQxMjM=  # base64 encoded

---
# 6. Namespace - Virtual cluster
apiVersion: v1
kind: Namespace
metadata:
  name: production
```

### Object Metadata

```yaml
# All objects have metadata
metadata:
  name: my-app              # Required: object name
  namespace: production     # Optional: namespace (default: "default")
  labels:                   # Key-value pairs for selection
    app: web
    env: production
    version: v1.2.0
  annotations:              # Non-identifying metadata
    description: "Main web application"
    owner: "platform-team"
    prometheus.io/scrape: "true"
```

---

## How Everything Works Together

### Scenario: User Creates a Deployment

```bash
kubectl create deployment nginx --image=nginx --replicas=3
```

**Step-by-Step Flow:**

```
1. kubectl → API Server
   - POST /apis/apps/v1/namespaces/default/deployments
   - Authentication & Authorization
   
2. API Server → etcd
   - Stores Deployment object
   - Returns success to kubectl
   
3. Deployment Controller (watching API Server)
   - Sees new Deployment
   - Creates ReplicaSet object
   - API Server → etcd (stores ReplicaSet)
   
4. ReplicaSet Controller (watching API Server)
   - Sees new ReplicaSet with replicas=3
   - Creates 3 Pod objects
   - API Server → etcd (stores Pods)
   
5. Scheduler (watching for unscheduled Pods)
   - Sees 3 unscheduled Pods
   - Selects best nodes for each Pod
   - Binds Pods to nodes (updates etcd)
   
6. kubelet on each selected node (watching API Server)
   - Sees Pod assigned to its node
   - Tells container runtime to pull nginx image
   - Starts container
   - Reports status to API Server
   
7. kube-proxy on each node
   - Updates network rules if Service exists
   - Enables load balancing to Pods
```

### Visual Flow

```
┌──────────┐
│  kubectl │
└────┬─────┘
     │ 1. Create Deployment
     ▼
┌────────────┐      2. Store      ┌──────┐
│ API Server │◄──────────────────►│ etcd │
└─────┬──────┘                    └──────┘
      │
      │ 3. Watch
      ▼
┌──────────────────┐
│ Deployment Ctrl  │
└────┬─────────────┘
     │ 4. Create ReplicaSet
     ▼
┌──────────────────┐
│ ReplicaSet Ctrl  │
└────┬─────────────┘
     │ 5. Create 3 Pods
     ▼
┌──────────────────┐
│    Scheduler     │
└────┬─────────────┘
     │ 6. Bind to Nodes
     ▼
┌──────────────────┐    7. Start Containers    ┌────────────┐
│     kubelet      │───────────────────────────►│ Container  │
└──────────────────┘                            │  Runtime   │
                                                └────────────┘
```

---

## Installation Options

### 1. Local Development

```bash
# Minikube (single-node cluster)
brew install minikube
minikube start
minikube status

# Kind (Kubernetes in Docker)
brew install kind
kind create cluster
kind get clusters

# Docker Desktop (built-in K8s)
# Enable in Docker Desktop → Preferences → Kubernetes
```

### 2. MicroK8s (Lightweight K8s)

```bash
# Ubuntu/Linux
sudo snap install microk8s --classic

# Start MicroK8s
microk8s start

# Enable addons
microk8s enable dns storage ingress

# Use kubectl
microk8s kubectl get nodes
```

### 3. Production Clusters

```bash
# Managed Kubernetes
- AWS EKS (Elastic Kubernetes Service)
- Google GKE (Google Kubernetes Engine)
- Azure AKS (Azure Kubernetes Service)
- DigitalOcean DOKS

# Self-Managed
- kubeadm (official K8s installer)
- Rancher (management platform)
- OpenShift (RedHat's K8s distribution)
```

---

## kubectl Basics

### Installation

```bash
# macOS
brew install kubectl

# Linux
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

### Essential Commands

```bash
# Cluster info
kubectl cluster-info
kubectl get nodes
kubectl get all --all-namespaces

# Create resources
kubectl create deployment nginx --image=nginx
kubectl create service clusterip nginx --tcp=80:80

# Get resources
kubectl get pods
kubectl get pods -o wide    # More details
kubectl get pods -w         # Watch for changes

# Describe (detailed info)
kubectl describe pod nginx-abc123
kubectl describe node node-1

# Logs
kubectl logs pod-name
kubectl logs pod-name -f              # Follow logs
kubectl logs pod-name -c container    # Multi-container pod

# Execute commands
kubectl exec -it pod-name -- /bin/bash
kubectl exec pod-name -- ls /app

# Apply YAML
kubectl apply -f deployment.yaml
kubectl apply -f ./configs/          # Apply directory

# Delete resources
kubectl delete pod nginx
kubectl delete deployment nginx
kubectl delete -f deployment.yaml

# Edit resources
kubectl edit deployment nginx

# Scale
kubectl scale deployment nginx --replicas=5

# Port forwarding
kubectl port-forward pod/nginx 8080:80
# Access at http://localhost:8080
```

### Kubectl Context & Namespaces

```bash
# View contexts (clusters)
kubectl config get-contexts

# Switch context
kubectl config use-context minikube

# View current context
kubectl config current-context

# Set default namespace
kubectl config set-context --current --namespace=production

# List namespaces
kubectl get namespaces

# Create namespace
kubectl create namespace staging
```

---

## Best Practices

### 1. Resource Requests & Limits

```yaml
# Always set resource requests and limits
spec:
  containers:
  - name: app
    resources:
      requests:
        cpu: "100m"      # Guaranteed
        memory: "128Mi"
      limits:
        cpu: "500m"      # Maximum
        memory: "512Mi"
```

### 2. Health Checks

```yaml
# Use liveness and readiness probes
spec:
  containers:
  - name: app
    livenessProbe:      # Restart if fails
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
    readinessProbe:     # Remove from Service if fails
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 3
```

### 3. Use Namespaces

```yaml
# Separate environments/teams
kubectl create namespace dev
kubectl create namespace staging
kubectl create namespace production

# Set resource quotas per namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    limits.cpu: "200"
    limits.memory: "400Gi"
```

### 4. Labels & Selectors

```yaml
# Use consistent labeling
metadata:
  labels:
    app: web
    tier: frontend
    env: production
    version: v1.2.0
```

### 5. Don't Use Latest Tag

```yaml
# ❌ Bad
spec:
  containers:
  - name: app
    image: nginx:latest

# ✅ Good
spec:
  containers:
  - name: app
    image: nginx:1.21.6
```

---

## Interview Questions

**Q1: Explain the role of etcd in Kubernetes.**

**Answer:** etcd is the distributed key-value store that serves as Kubernetes' database. It stores all cluster state including Pods, Services, Secrets, and ConfigMaps. Only the API Server communicates with etcd. If etcd fails, the entire cluster becomes read-only and cannot process updates.

**Q2: What's the difference between kubectl and kubelet?**

**Answer:**
- **kubectl**: Command-line tool for users to interact with the Kubernetes API
- **kubelet**: Node agent that runs on every worker node and manages pod lifecycle

**Q3: How does the scheduler decide which node to place a Pod on?**

**Answer:** The scheduler uses a two-phase process:
1. **Filtering**: Eliminates nodes that don't meet requirements (resources, node selectors, taints)
2. **Scoring**: Ranks remaining nodes based on priorities (resource balance, affinity rules, etc.)
The Pod is placed on the highest-scoring node.

**Q4: What happens if the control plane goes down?**

**Answer:** Existing Pods continue running (kubelet is autonomous), but you cannot:
- Create new Pods
- Update existing resources
- Schedule new workloads
- Scale deployments
The cluster becomes read-only until the control plane recovers.

**Q5: Explain the reconciliation loop pattern.**

**Answer:** Controllers continuously compare desired state (from etcd via API Server) with actual state (from cluster). When they differ, the controller takes action to reconcile, bringing actual state to match desired state. This loop runs continuously, making K8s self-healing.

---

## Hands-On Exercise

### Task: Deploy a Multi-Tier Application

**Objective:** Deploy a web app with:
- Frontend (nginx)
- Backend (API server)
- Database (PostgreSQL)

**Steps:**

```bash
# 1. Create namespace
kubectl create namespace webapp

# 2. Deploy PostgreSQL
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: webapp
spec:
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
          value: mysecretpassword
        ports:
        - containerPort: 5432
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: webapp
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
EOF

# 3. Verify deployment
kubectl get pods -n webapp
kubectl get services -n webapp

# 4. Check logs
kubectl logs -n webapp deployment/postgres

# 5. Test connectivity
kubectl run -it --rm debug --image=postgres:14 --restart=Never -n webapp -- psql -h postgres -U postgres
```

**Verification:**
1. All components running
2. Services accessible
3. Understand how scheduler placed Pods
4. View architecture with `kubectl get all -n webapp`

---

## 📚 Additional Resources

- [Official Kubernetes Docs](https://kubernetes.io/docs/)
- [Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Kubernetes The Hard Way](https://github.com/kelseyhightower/kubernetes-the-hard-way)

---

## ✅ Module Checklist

- [ ] Understand Kubernetes architecture (control plane + nodes)
- [ ] Know what each component does (API Server, etcd, scheduler, etc.)
- [ ] Explain the reconciliation loop pattern
- [ ] Install a local Kubernetes cluster
- [ ] Master essential kubectl commands
- [ ] Understand how Pods are scheduled
- [ ] Deploy a multi-tier application
- [ ] Complete the hands-on exercise

---

**Next Module:** [Module 07: Kubernetes Core CRDs](./07_Kubernetes_Workloads_CRDs.md) - Master Pods, Deployments, StatefulSets, and more! 🚀
