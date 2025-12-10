# Module 08: Kubernetes Networking 🌐

## Master Service Discovery, Load Balancing & Network Security

**Duration:** 4-5 hours  
**Prerequisites:** Module 06-07 (K8s Architecture & Workloads)  
**Outcome:** Understand how pods communicate and expose services to external traffic

---

## 📚 Table of Contents

1. [Kubernetes Networking Model](#kubernetes-networking-model)
2. [Services - Service Discovery](#services---service-discovery)
3. [Service Types](#service-types)
4. [Ingress - HTTP Load Balancing](#ingress---http-load-balancing)
5. [NetworkPolicies - Security](#networkpolicies---security)
6. [DNS in Kubernetes](#dns-in-kubernetes)
7. [CNI - Container Network Interface](#cni---container-network-interface)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## Kubernetes Networking Model

### Core Requirements

Kubernetes networking has **4 fundamental rules:**

```yaml
1. Pod-to-Pod Communication:
   - Every pod can communicate with every other pod
   - Without NAT (pods see real source IP)
   - Across all nodes in the cluster

2. Pod-to-Service Communication:
   - Pods discover services via DNS or environment variables
   - Services load-balance traffic to pods

3. External-to-Service Communication:
   - External clients access services via NodePort, LoadBalancer, or Ingress

4. Network Policies (optional):
   - Control traffic between pods (firewall rules)
```

### Network Architecture

```
┌─────────────────────────────────────────────────────┐
│                  External Traffic                    │
│         (Internet, Corporate Network)                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│              Ingress Controller                       │
│         (nginx, traefik, HAProxy)                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                   Services                            │
│  (ClusterIP, NodePort, LoadBalancer)                 │
└────┬──────────────────────┬──────────────────────────┘
     │                      │
     ▼                      ▼
┌─────────┐            ┌─────────┐
│  Pod 1  │◄──────────►│  Pod 2  │
│ 10.1.1.2│            │ 10.1.1.3│
└─────────┘            └─────────┘
     │                      │
     └──────────┬───────────┘
                ▼
         ┌────────────┐
         │  Pod 3     │
         │ 10.1.2.1   │
         └────────────┘
```

---

## Services - Service Discovery

### Why Services?

**Problem:** Pods are ephemeral (can be deleted, rescheduled, scaled)
- Pod IPs change
- Need stable endpoint
- Need load balancing

**Solution:** Service provides:
- **Stable IP and DNS name**
- **Load balancing** across pod replicas
- **Service discovery**

### Service Basics

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  selector:
    app: web  # Select pods with this label
  ports:
  - protocol: TCP
    port: 80        # Service port
    targetPort: 8080  # Pod port
  type: ClusterIP   # Default type
```

```bash
# Create service
kubectl apply -f service.yaml

# Get services
kubectl get services
kubectl get svc  # Short form

# Output:
# NAME          TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
# web-service   ClusterIP   10.96.100.50   <none>        80/TCP    1m

# Describe service
kubectl describe service web-service
```

### How Services Work

```
User creates Service with selector: app=web
         ↓
API Server stores Service
         ↓
Endpoint Controller watches:
1. Finds all Pods with label app=web
2. Gets their IP addresses
3. Creates Endpoints object

Example Endpoints:
- 10.244.1.5:8080 (pod-1)
- 10.244.2.3:8080 (pod-2)
- 10.244.2.7:8080 (pod-3)
         ↓
kube-proxy on each node:
- Creates iptables/IPVS rules
- Load balances traffic to pod IPs
```

```bash
# View endpoints
kubectl get endpoints web-service

# NAME          ENDPOINTS                                AGE
# web-service   10.244.1.5:8080,10.244.2.3:8080...      1m
```

### Service Without Selector (External Service)

```yaml
# Service pointing to external database
apiVersion: v1
kind: Service
metadata:
  name: external-database
spec:
  ports:
  - protocol: TCP
    port: 5432
---
# Manually create endpoints
apiVersion: v1
kind: Endpoints
metadata:
  name: external-database
subsets:
- addresses:
  - ip: 192.168.1.100  # External DB IP
  ports:
  - port: 5432
```

---

## Service Types

### 1. ClusterIP (Default)

**Internal-only access** - Exposes service on cluster-internal IP.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8080
```

```
┌─────────────────────────────────┐
│         Kubernetes Cluster       │
│                                  │
│  ┌─────┐         ┌─────────┐   │
│  │ Pod │────────►│ Service │   │
│  │     │         │ClusterIP│   │
│  └─────┘         │10.96.x.x│   │
│                  └─────────┘    │
│                       │          │
│                       ▼          │
│              ┌─────┐ ┌─────┐    │
│              │Pod 1│ │Pod 2│    │
│              └─────┘ └─────┘    │
└─────────────────────────────────┘
   ❌ Not accessible from outside
```

**Use Cases:**
- Internal microservices
- Databases
- Cache servers
- Any service that shouldn't be exposed externally

### 2. NodePort

**Exposes service on each node's IP at a static port.**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-nodeport
spec:
  type: NodePort
  selector:
    app: web
  ports:
  - port: 80          # ClusterIP port
    targetPort: 8080  # Pod port
    nodePort: 30080   # External port (30000-32767)
```

```
External Traffic
      │
      ▼
┌─────────────────────────────────┐
│   Node IP: 192.168.1.10:30080   │
│   Node IP: 192.168.1.11:30080   │
│   Node IP: 192.168.1.12:30080   │
└──────────────┬──────────────────┘
               │
               ▼
         ┌─────────┐
         │ Service │
         │NodePort │
         └─────────┘
               │
               ▼
      ┌─────┐ ┌─────┐
      │Pod 1│ │Pod 2│
      └─────┘ └─────┘
```

```bash
# Access service
curl http://192.168.1.10:30080  # Any node IP
curl http://192.168.1.11:30080  # Works from any node
```

**Use Cases:**
- Development/testing
- Direct access to services
- When LoadBalancer is not available

**Limitations:**
- Only one service per port
- Port range limited (30000-32767)
- Must handle node failures manually

### 3. LoadBalancer

**Provisions external load balancer** (cloud provider).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-lb
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl get service web-lb

# NAME     TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)
# web-lb   LoadBalancer   10.96.100.50   203.0.113.42     80:31234/TCP
```

```
External Traffic
      │
      ▼
┌──────────────────────┐
│  Cloud Load Balancer │  ← Provisioned by cloud provider
│  (AWS ELB, GCP LB)   │
└──────────┬───────────┘
           │
           ▼
    ┌──────────┐
    │  Service │
    │   Type:  │
    │LoadBalan-│
    │   cer    │
    └──────────┘
           │
           ▼
    ┌─────┐ ┌─────┐
    │Pod 1│ │Pod 2│
    └─────┘ └─────┘
```

**Cloud Provider Examples:**

```yaml
# AWS - Network Load Balancer
apiVersion: v1
kind: Service
metadata:
  name: web
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 80

---
# GCP - Internal Load Balancer
apiVersion: v1
kind: Service
metadata:
  name: internal-app
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
spec:
  type: LoadBalancer
  selector:
    app: internal-app
  ports:
  - port: 80
```

**Use Cases:**
- Production applications
- Need external access with HA
- Cloud-managed load balancing

**Cost Consideration:**
- Each LoadBalancer service = One cloud load balancer
- Can be expensive (consider Ingress for multiple services)

### 4. ExternalName

**Maps service to DNS name** (CNAME record).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  type: ExternalName
  externalName: api.external-service.com
```

```bash
# Inside cluster, pods can access:
curl http://external-api.default.svc.cluster.local
# → Resolves to api.external-service.com
```

**Use Cases:**
- Accessing external services
- Service migration (gradual cutover)
- Multi-cluster communication

### Session Affinity

```yaml
# Stick client to same pod (session persistence)
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
```

---

## Ingress - HTTP Load Balancing

### Why Ingress?

**Problem:** LoadBalancer services are expensive (one per service).

**Solution:** Ingress provides:
- **HTTP/HTTPS routing** to multiple services
- **TLS termination**
- **Name-based virtual hosting**
- **Path-based routing**
- One load balancer for many services

### Ingress Architecture

```
External Traffic (HTTP/HTTPS)
        │
        ▼
┌────────────────────┐
│  Ingress Resource  │  ← Routing rules (YAML)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Ingress Controller │  ← Implementation (nginx, traefik, HAProxy)
└────────┬───────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Service1│ │Service2│
└────────┘ └────────┘
```

### Install Ingress Controller

```bash
# Install nginx ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get service -n ingress-nginx
```

### Basic Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

```bash
# Create ingress
kubectl apply -f ingress.yaml

# Get ingress
kubectl get ingress

# Output:
# NAME          CLASS    HOSTS               ADDRESS        PORTS   AGE
# web-ingress   <none>   myapp.example.com   203.0.113.42   80      1m

# Access application
curl http://myapp.example.com
```

### Path-Based Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-path-ingress
spec:
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 80
      
      - path: /products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 80
      
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 80
```

```
Requests:
api.example.com/users     → user-service
api.example.com/products  → product-service
api.example.com/orders    → order-service
```

### Host-Based Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
spec:
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-frontend
            port:
              number: 80
  
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-backend
            port:
              number: 80
```

### TLS/HTTPS

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: tls-secret
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tls-ingress
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: tls-secret
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

```bash
# Create TLS secret from files
kubectl create secret tls tls-secret \
  --cert=path/to/cert.crt \
  --key=path/to/key.key

# Access with HTTPS
curl https://myapp.example.com
```

### Ingress Annotations

```yaml
metadata:
  annotations:
    # Rewrite URL
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    
    # CORS
    nginx.ingress.kubernetes.io/enable-cors: "true"
    
    # Rate limiting
    nginx.ingress.kubernetes.io/limit-rps: "10"
    
    # Authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: basic-auth
    
    # Websocket support
    nginx.ingress.kubernetes.io/websocket-services: chat-service
```

---

## NetworkPolicies - Security

### What are NetworkPolicies?

**Firewall rules** for pods - control traffic flow.

```yaml
# Default behavior: All traffic allowed

# With NetworkPolicy: Deny by default, allow explicitly
```

### Default Deny All

```yaml
# Deny all ingress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  podSelector: {}  # Applies to all pods
  policyTypes:
  - Ingress

---
# Deny all egress traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
spec:
  podSelector: {}
  policyTypes:
  - Egress
```

### Allow Specific Traffic

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend  # Apply to backend pods
  
  policyTypes:
  - Ingress
  
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend  # Only from frontend pods
    ports:
    - protocol: TCP
      port: 8080
```

```
Before NetworkPolicy:
┌──────────┐     ┌──────────┐
│ Frontend │────►│ Backend  │  ✅ Allowed
└──────────┘     └──────────┘

┌──────────┐     ┌──────────┐
│   Pod X  │────►│ Backend  │  ✅ Allowed
└──────────┘     └──────────┘

After NetworkPolicy:
┌──────────┐     ┌──────────┐
│ Frontend │────►│ Backend  │  ✅ Allowed (explicitly)
└──────────┘     └──────────┘

┌──────────┐     ┌──────────┐
│   Pod X  │─────│ Backend  │  ❌ Denied
└──────────┘     └──────────┘
```

### Namespace Selector

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-production
spec:
  podSelector:
    matchLabels:
      app: database
  
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          env: production  # Only from production namespace
    ports:
    - protocol: TCP
      port: 5432
```

### IP Block (External Traffic)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-ips
spec:
  podSelector:
    matchLabels:
      app: web
  
  ingress:
  - from:
    - ipBlock:
        cidr: 203.0.113.0/24  # Allow from this IP range
        except:
        - 203.0.113.5/32      # Except this IP
```

### Egress Rules

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-backend-egress
spec:
  podSelector:
    matchLabels:
      app: backend
  
  policyTypes:
  - Egress
  
  egress:
  # Allow DNS
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
  
  # Allow database
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  
  # Allow external API
  - to:
    - ipBlock:
        cidr: 0.0.0.0/0
    ports:
    - protocol: TCP
      port: 443
```

### Three-Tier Application Policy

```yaml
# Frontend: Allow from internet, talk to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
spec:
  podSelector:
    matchLabels:
      tier: frontend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - ports:
    - protocol: TCP
      port: 80
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: backend

---
# Backend: Only from frontend, talk to database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          tier: database

---
# Database: Only from backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
spec:
  podSelector:
    matchLabels:
      tier: database
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: backend
    ports:
    - protocol: TCP
      port: 5432
```

---

## DNS in Kubernetes

### Service DNS

```bash
# Full DNS name format:
<service-name>.<namespace>.svc.<cluster-domain>

# Examples:
web-service.default.svc.cluster.local
postgres.production.svc.cluster.local
```

### DNS Resolution

```yaml
# Service in same namespace
curl http://web-service

# Service in different namespace
curl http://web-service.production

# Fully qualified (always works)
curl http://web-service.production.svc.cluster.local
```

### Pod DNS

```bash
# Pods get DNS name:
<pod-ip-with-dashes>.<namespace>.pod.<cluster-domain>

# Example: Pod with IP 10.244.1.5
10-244-1-5.default.pod.cluster.local
```

### Headless Service DNS

```yaml
# StatefulSet with headless service
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  clusterIP: None  # Headless
  selector:
    app: postgres
```

```bash
# Each pod gets DNS entry:
postgres-0.postgres.default.svc.cluster.local
postgres-1.postgres.default.svc.cluster.local
postgres-2.postgres.default.svc.cluster.local
```

### Custom DNS Configuration

```yaml
spec:
  dnsPolicy: ClusterFirst  # Default
  # OR
  dnsPolicy: Default       # Use node's DNS
  # OR
  dnsPolicy: None          # Custom DNS
  dnsConfig:
    nameservers:
    - 8.8.8.8
    - 8.8.4.4
    searches:
    - my.domain.com
    options:
    - name: ndots
      value: "2"
```

---

## CNI - Container Network Interface

### What is CNI?

**Pluggable networking layer** - provides IP addresses and routing for pods.

### Popular CNI Plugins

```yaml
1. Calico:
   - Network policies
   - BGP routing
   - Enterprise features

2. Flannel:
   - Simple overlay network
   - Easy to set up
   - Good for beginners

3. Weave Net:
   - Automatic mesh network
   - Encryption support
   - Multi-cloud

4. Cilium:
   - eBPF-based
   - High performance
   - Advanced security

5. AWS VPC CNI:
   - Native AWS networking
   - Pod gets VPC IP
   - Better integration
```

### CNI Installation Example

```bash
# Install Calico
kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

# Verify CNI
kubectl get pods -n kube-system | grep calico

# Check node network
kubectl get nodes -o wide
```

---

## Interview Questions

**Q1: What's the difference between ClusterIP, NodePort, and LoadBalancer?**

**Answer:**
- **ClusterIP**: Internal-only, cluster IP, default type
- **NodePort**: Exposes on each node's IP at static port (30000-32767), accessible externally
- **LoadBalancer**: Provisions cloud load balancer, full external access with HA

**Q2: Why use Ingress instead of multiple LoadBalancer services?**

**Answer:** Cost and efficiency. Each LoadBalancer service creates a cloud load balancer ($$$). Ingress uses one load balancer to route to multiple services based on hostname/path, significantly reducing costs.

**Q3: How do NetworkPolicies work?**

**Answer:** NetworkPolicies are namespace-scoped firewall rules. They use label selectors to define which pods rules apply to and which traffic is allowed (ingress/egress). By default, all traffic is allowed; NetworkPolicies deny by default and allow explicitly.

**Q4: Explain service discovery in Kubernetes.**

**Answer:** Services provide stable DNS names (<service>.<namespace>.svc.cluster.local). The Endpoint Controller watches pods matching service selectors and updates Endpoints. kube-proxy creates iptables/IPVS rules for load balancing. Pods can resolve service names via cluster DNS (CoreDNS).

**Q5: What is a headless service and when would you use it?**

**Answer:** Headless service (clusterIP: None) doesn't load balance. Instead, DNS returns all pod IPs. Used with StatefulSets for stable network identities, allowing direct pod-to-pod communication (e.g., database clusters, peer-to-peer systems).

---

## Hands-On Exercise

### Task: Deploy Multi-Tier App with Networking

```yaml
# 1. Deploy frontend
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
      tier: frontend
  template:
    metadata:
      labels:
        app: frontend
        tier: frontend
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80

---
# 2. Frontend Service (ClusterIP)
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  selector:
    app: frontend
  ports:
  - port: 80

---
# 3. Backend Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      tier: backend
  template:
    metadata:
      labels:
        app: backend
        tier: backend
    spec:
      containers:
      - name: api
        image: hashicorp/http-echo:0.2.3
        args:
        - "-text=Backend API v1.0"
        ports:
        - containerPort: 5678

---
# 4. Backend Service
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5678

---
# 5. Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
spec:
  rules:
  - host: myapp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 80

---
# 6. NetworkPolicy: Backend only from Frontend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          tier: frontend
    ports:
    - protocol: TCP
      port: 5678
```

**Tasks:**
1. Deploy all resources
2. Verify services are created
3. Test frontend can reach backend
4. Test external pod cannot reach backend
5. Access via Ingress

```bash
# Deploy
kubectl apply -f app.yaml

# Verify
kubectl get all
kubectl get ingress
kubectl get networkpolicies

# Test connectivity
kubectl exec -it <frontend-pod> -- curl http://backend
kubectl run test --image=busybox --rm -it -- wget -O- http://backend
# (should fail with NetworkPolicy)

# Add /etc/hosts entry
echo "127.0.0.1 myapp.local" | sudo tee -a /etc/hosts

# Access via Ingress
curl http://myapp.local
curl http://myapp.local/api
```

---

## 📚 Additional Resources

- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)

---

## ✅ Module Checklist

- [ ] Understand Kubernetes networking model
- [ ] Create Services (ClusterIP, NodePort, LoadBalancer)
- [ ] Configure Ingress for HTTP routing
- [ ] Implement NetworkPolicies for security
- [ ] Use DNS for service discovery
- [ ] Complete multi-tier networking exercise

---

**Next Module:** [Module 09: Kubernetes Storage](./09_Kubernetes_Storage.md) - Master PersistentVolumes, StorageClasses, and StatefulSet storage! 💾
