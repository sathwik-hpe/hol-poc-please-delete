# Container Networking (Docker & Kubernetes) 🐳

## YOUR STRENGTH! (HPE Experience)
You have **900+ Kubernetes deployments** - This is your ADVANTAGE!

---

## 1. Docker Networking

### Network Drivers

```bash
# Bridge (default) - containers on same host
docker network create my-bridge-network
docker run --network my-bridge-network nginx

# Host - share host's network stack
docker run --network host nginx

# None - no networking
docker run --network none nginx

# Overlay - multi-host networking (Swarm)
docker network create --driver overlay my-overlay
```

### Bridge Network Deep Dive

```
Host Machine (10.0.1.50)
├── docker0 bridge (172.17.0.1)
│   ├── veth1 ←→ eth0 in Container1 (172.17.0.2)
│   ├── veth2 ←→ eth0 in Container2 (172.17.0.3)
│   └── veth3 ←→ eth0 in Container3 (172.17.0.4)

Traffic flow:
Container1:172.17.0.2 → Container2:172.17.0.3
- Stays on docker0 bridge (same network)

Container1:172.17.0.2 → Internet:8.8.8.8
- docker0 → Host (10.0.1.50) → NAT → Internet
```

**Inspect Docker Network:**
```bash
# Create custom bridge
docker network create --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  my-network

# Inspect
docker network inspect my-network

# Run container
docker run -d \
  --name web \
  --network my-network \
  --ip 172.20.0.10 \
  nginx

# Container can resolve other containers by name!
docker run --network my-network alpine ping web
```

---

## 2. Kubernetes Networking Model

### Fundamental Rules

```
Kubernetes Network Model requires:
1. All Pods can communicate with all other Pods (without NAT)
2. All Nodes can communicate with all Pods (without NAT)
3. Pod's IP is the same as others see it (no NAT)

No NAT = Simplifies networking, debugging
```

### Pod Networking

```
Node (10.0.1.50)
├── Pod CIDR: 10.244.0.0/24
│   ├── Pod1 (10.244.0.10)
│   │   └── Container1, Container2 (share network namespace)
│   ├── Pod2 (10.244.0.11)
│   └── Pod3 (10.244.0.12)

Different Node (10.0.1.51)
├── Pod CIDR: 10.244.1.0/24
│   ├── Pod4 (10.244.1.10)
│   ├── Pod5 (10.244.1.11)

Pod1 (10.244.0.10) → Pod4 (10.244.1.10)
- CNI plugin handles cross-node routing
```

---

## 3. CNI (Container Network Interface)

### Popular CNI Plugins

```yaml
# Calico - Network Policy + BGP routing
# Your HPE experience likely uses this!

# Features:
✅ NetworkPolicy enforcement
✅ BGP routing (scalable)
✅ IP-in-IP or VXLAN encapsulation
✅ eBPF dataplane option

# Flannel - Simple overlay
✅ Easy setup
✅ VXLAN overlay
❌ No NetworkPolicy

# Cilium - eBPF-based
✅ High performance (eBPF)
✅ L7 visibility
✅ Service Mesh features

# AWS VPC CNI
✅ Pods get real VPC IPs
✅ Security groups for pods
❌ IP address exhaustion risk
```

### How CNI Works

```bash
# When Pod starts:
1. kubelet calls CNI plugin
2. CNI creates network namespace
3. CNI creates veth pair (virtual ethernet)
4. CNI assigns IP from Pod CIDR
5. CNI sets up routes
6. CNI returns IP to kubelet

# Example CNI config
cat /etc/cni/net.d/10-calico.conf
{
  "name": "k8s-pod-network",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "calico",
      "ipam": {
        "type": "calico-ipam"
      }
    }
  ]
}
```

---

## 4. Kubernetes Services

### ClusterIP (Default)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: ClusterIP  # Internal only
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080

# Creates:
# Service IP: 10.96.0.100 (virtual IP)
# Endpoints: Pod IPs (10.244.0.10, 10.244.0.11, ...)

# Traffic flow:
Pod → web-service:80 
  → kube-proxy (iptables/IPVS rules)
  → Load balanced to backend Pods:8080
```

### NodePort

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080  # Exposed on every node

# Access from outside:
http://any-node-ip:30080 → Pods:8080
```

### LoadBalancer (Cloud)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080

# AWS creates ELB/NLB
# External IP: a1b2c3.us-east-1.elb.amazonaws.com
# Internet → ELB → NodePort:30080 → Pods:8080
```

### Service Discovery

```bash
# DNS-based service discovery (CoreDNS)
# Service: web-service in namespace: production

# From same namespace:
curl http://web-service

# From different namespace:
curl http://web-service.production.svc.cluster.local

# Full DNS name format:
<service-name>.<namespace>.svc.cluster.local
```

---

## 5. Network Policies

**YOUR HPE EXPERIENCE** - Security policies for 900+ services!

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
    - Ingress
    - Egress
  
  ingress:
    # Allow traffic from app tier
    - from:
        - podSelector:
            matchLabels:
              app: app-tier
      ports:
        - protocol: TCP
          port: 8080
    
    # Allow traffic from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  
  egress:
    # Allow DNS
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
        - podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    
    # Allow to database
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

**Default Deny All:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}  # Matches all pods
  policyTypes:
    - Ingress
    - Egress
  # No ingress/egress rules = deny all
```

---

## 6. Ingress (L7 Routing)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    # Host-based routing
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
    
    # Path-based routing
    - host: example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
          - path: /web
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
  
  # TLS configuration
  tls:
    - hosts:
        - api.example.com
        - example.com
      secretName: tls-secret

# Creates:
Internet → Ingress Controller (LoadBalancer)
         → Host/Path routing
         → Backend Services
         → Pods
```

---

## 7. Service Mesh (Istio)

**YOUR HPE EXPERIENCE** - Platform uses Istio!

```yaml
# VirtualService - L7 routing
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-route
spec:
  hosts:
    - reviews.production.svc.cluster.local
  http:
    # Canary deployment - 90% v1, 10% v2
    - match:
        - headers:
            user-agent:
              regex: ".*Chrome.*"
      route:
        - destination:
            host: reviews
            subset: v2
          weight: 10
        - destination:
            host: reviews
            subset: v1
          weight: 90

# DestinationRule - Load balancing, circuit breaking
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-destination
spec:
  host: reviews
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

---

## 8. Troubleshooting (Interview Scenarios)

### Scenario 1: Pod Can't Reach Service

```bash
# Step 1: Check Pod status
kubectl get pods -o wide

# Step 2: Check Service
kubectl get svc web-service
kubectl describe svc web-service  # Check Endpoints!

# Step 3: Test DNS resolution
kubectl run -it debug --image=busybox --rm -- sh
nslookup web-service
# Should return: 10.96.0.100

# Step 4: Check Network Policy
kubectl get networkpolicies
kubectl describe networkpolicy web-policy

# Step 5: Test connectivity
kubectl exec -it debug-pod -- wget -O- http://web-service

# Step 6: Check CNI
kubectl get pods -n kube-system | grep -i calico
kubectl logs -n kube-system calico-node-xxxx
```

### Scenario 2: External Traffic Not Reaching Pod

```bash
# Ingress → Service → Pod chain

# 1. Check Ingress
kubectl get ingress
kubectl describe ingress web-ingress

# 2. Check Ingress Controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx nginx-ingress-controller-xxx

# 3. Check Service
kubectl get svc web-service
kubectl get endpoints web-service  # Are Pod IPs listed?

# 4. Test from inside cluster
kubectl run -it test --image=busybox --rm
wget -O- http://web-service

# 5. Check LoadBalancer
kubectl get svc -o wide | grep LoadBalancer
# Verify External-IP exists
```

---

## 9. Interview Questions

**Q: Explain pod-to-pod communication across nodes**
```
Pod1 (Node1: 10.244.0.10) → Pod2 (Node2: 10.244.1.10)

1. Pod1 sends packet: src=10.244.0.10, dst=10.244.1.10
2. Node1 routing table: 10.244.1.0/24 → Node2
3. CNI encapsulates (VXLAN or IP-in-IP)
   - Outer header: src=Node1 IP, dst=Node2 IP
   - Inner packet: src=Pod1 IP, dst=Pod2 IP
4. Packet sent to Node2
5. Node2 decapsulates
6. Packet delivered to Pod2

No NAT! Pod IPs are consistent.
```

**Q: How does Kubernetes Service work?**
```
Service (ClusterIP: 10.96.0.100)
Endpoints: [10.244.0.10, 10.244.0.11, 10.244.0.12]

kube-proxy creates iptables rules:
-A KUBE-SERVICES -d 10.96.0.100/32 -p tcp -m tcp --dport 80 \
  -j KUBE-SVC-XXXXX

-A KUBE-SVC-XXXXX -m statistic --mode random --probability 0.33 \
  -j KUBE-SEP-1  # 10.244.0.10
-A KUBE-SVC-XXXXX -m statistic --mode random --probability 0.50 \
  -j KUBE-SEP-2  # 10.244.0.11
-A KUBE-SVC-XXXXX -j KUBE-SEP-3  # 10.244.0.12

Random load balancing via iptables!
```

---

## Key Takeaways

✅ **Docker Networks**: Bridge (default), Host, Overlay  
✅ **K8s Networking**: No NAT, every Pod can reach every Pod  
✅ **CNI**: Calico, Flannel, Cilium - handles Pod networking  
✅ **Services**: ClusterIP (internal), NodePort, LoadBalancer  
✅ **NetworkPolicy**: Firewall rules for Pods (YOUR STRENGTH!)  
✅ **Ingress**: L7 HTTP routing (host/path-based)  
✅ **Service Mesh**: Istio for advanced traffic management  

**YOUR HPE ADVANTAGE**: 
- 900+ Kubernetes deployments
- NetworkPolicy enforcement
- Istio service mesh
- Multi-cluster networking

**EMPHASIZE THIS IN INTERVIEW!**

---

**Next**: Comprehensive Interview Q&A Document
