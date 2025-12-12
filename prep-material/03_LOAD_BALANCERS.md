# Load Balancers

## Table of Contents
- [What is a Load Balancer?](#what-is-a-load-balancer)
- [Layer 4 vs Layer 7](#layer-4-vs-layer-7-load-balancers)
- [Load Balancing Algorithms](#load-balancing-algorithms)
- [Health Checks](#health-checks)
- [Cloud Load Balancers](#cloud-load-balancer-implementations)
- [Session Persistence](#session-persistence-sticky-sessions)
- [Best Practices](#load-balancer-best-practices)
- [Troubleshooting](#troubleshooting-load-balancers)

---

## What is a Load Balancer?

A **load balancer** distributes incoming network traffic across multiple servers to ensure:
- **High availability**: If one server fails, traffic goes to healthy servers
- **Scalability**: Add/remove servers based on load
- **Performance**: Distribute load to prevent server overload
- **Fault tolerance**: Automatic failover to healthy instances

```
                    Load Balancer
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    Server 1         Server 2         Server 3
    (Healthy)        (Healthy)        (Unhealthy)
                                          ❌
Traffic distributed only to healthy servers
```

## Layer 4 vs Layer 7 Load Balancers

### Layer 4 Load Balancer (Transport Layer)

**Definition:** Makes routing decisions based on IP address and TCP/UDP port.

**Characteristics:**
- **Fast**: Simple packet forwarding, low latency
- **Protocol-agnostic**: Works with any TCP/UDP traffic
- **No content inspection**: Cannot make decisions based on HTTP headers, URLs, etc.
- **Connection-based**: Maintains TCP connection state

**Decision Factors:**
- Source IP address
- Destination IP address
- Source port
- Destination port
- Protocol (TCP/UDP)

**Use Cases:**
- Non-HTTP protocols (databases, messaging)
- High-performance requirements (low latency)
- Simple load distribution
- TCP/UDP traffic

**Example Flow:**
```
Client ──▶ L4 LB (checks IP:Port) ──▶ Backend Server
           No HTTP inspection
           Just forwards packets
```

### Layer 7 Load Balancer (Application Layer)

**Definition:** Makes routing decisions based on application-layer data (HTTP headers, URLs, cookies).

**Characteristics:**
- **Intelligent routing**: Content-based decisions
- **HTTP/HTTPS aware**: Understands application protocols
- **SSL termination**: Can decrypt and inspect HTTPS traffic
- **Advanced features**: URL routing, host-based routing, header manipulation

**Decision Factors:**
- URL path (`/api/users` vs `/images`)
- HTTP headers (User-Agent, Authorization)
- Cookies (session affinity)
- Query parameters
- HTTP method (GET, POST, etc.)

**Use Cases:**
- Web applications
- Microservices architectures
- Content-based routing
- SSL offloading
- Web application firewall integration

**Example Flow:**
```
Client ──▶ L7 LB (inspects HTTP) ──▶ Route based on URL
           │
           ├─ /api/*      ──▶ API servers
           ├─ /images/*   ──▶ Image servers
           └─ /*          ──▶ Web servers
```

### Comparison Table

| Feature | Layer 4 | Layer 7 |
|---------|---------|---------|
| **OSI Layer** | Transport | Application |
| **Performance** | Very fast | Slower (content inspection) |
| **Routing** | IP:Port only | Content-based |
| **SSL Termination** | TCP passthrough | Yes, can decrypt |
| **Protocol Support** | Any TCP/UDP | HTTP/HTTPS/WebSocket |
| **Cost** | Lower | Higher |
| **Use Case** | Generic TCP/UDP | Web applications |

## Load Balancing Algorithms

### 1. Round Robin

**Description:** Distributes requests sequentially to each server in rotation.

**How it works:**
```
Request 1 → Server 1
Request 2 → Server 2
Request 3 → Server 3
Request 4 → Server 1  (back to first)
Request 5 → Server 2
...
```

**Pros:**
- Simple and fair distribution
- Easy to implement
- No complex calculations

**Cons:**
- Doesn't consider server load
- Assumes all servers have equal capacity
- Can overload slower servers

**Best For:**
- Servers with similar specifications
- Stateless applications
- Simple deployments

### 2. Weighted Round Robin

**Description:** Similar to round robin, but assigns weights based on server capacity.

**Example:**
```
Server 1: Weight 3 (high capacity)
Server 2: Weight 2 (medium capacity)
Server 3: Weight 1 (low capacity)

Distribution:
S1, S1, S1, S2, S2, S3, S1, S1, S1, S2, S2, S3...
```

**Use Case:** Servers with different specifications (CPU, memory).

### 3. Least Connections

**Description:** Sends requests to the server with fewest active connections.

**How it works:**
```
Server 1: 5 connections
Server 2: 3 connections  ← Next request goes here
Server 3: 7 connections

After routing:
Server 1: 5 connections
Server 2: 4 connections  ← Now has 4
Server 3: 7 connections
```

**Pros:**
- Considers current server load
- Better for long-lived connections
- Adapts to real-time load

**Cons:**
- More complex tracking
- Slightly higher overhead

**Best For:**
- Varying request processing times
- Database connections
- Persistent connections (WebSockets)

### 4. Weighted Least Connections

**Description:** Combines least connections with server capacity weights.

**Formula:**
```
Score = Active Connections / Server Weight
Route to server with lowest score
```

**Example:**
```
Server 1: 10 connections, weight 5 → Score: 10/5 = 2
Server 2: 6 connections, weight 2  → Score: 6/2 = 3
Server 3: 4 connections, weight 2  → Score: 4/2 = 2

Next request → Server 1 or Server 3 (both have score 2)
```

### 5. IP Hash (Source IP Affinity)

**Description:** Routes requests from same client IP to same server.

**How it works:**
```
hash(client_ip) % number_of_servers = server_index

Example:
Client 203.0.113.5  → hash → Server 2 (always)
Client 198.51.100.7 → hash → Server 1 (always)
```

**Pros:**
- Session persistence without cookies
- Predictable routing for same client

**Cons:**
- Uneven distribution if few clients
- Doesn't adapt to server failures well

**Best For:**
- Stateful applications requiring session persistence
- When cookies cannot be used

### 6. Least Response Time

**Description:** Routes to server with lowest response time and fewest connections.

**Formula:**
```
Score = (Average Response Time × Active Connections)
Route to server with lowest score
```

**Best For:**
- Performance-critical applications
- Heterogeneous server environments

### 7. Random

**Description:** Randomly selects a server for each request.

**Pros:**
- Simple implementation
- No state tracking needed

**Cons:**
- Unpredictable distribution
- May not balance evenly

**Use Case:** Simple deployments where any server can handle any request.

## Health Checks

**Definition:** Periodic checks to determine if backend servers are healthy and able to handle traffic.

### Types of Health Checks

#### 1. TCP Health Check
```
Load Balancer → Attempts TCP connection to server:port
If successful → Server is healthy
If fails → Server is unhealthy
```

**Use Case:** Simple availability check for any TCP service.

#### 2. HTTP/HTTPS Health Check
```
Load Balancer → Sends HTTP GET to /health
Expected response: HTTP 200 OK
Body check (optional): "healthy" or JSON response
```

**Use Case:** Web applications, APIs.

#### 3. Custom Health Check
```
Application-specific endpoint that checks:
- Database connectivity
- Cache availability
- Dependent service status
- Resource availability (disk, memory)
```

**Example Health Check Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "cache": "ok",
    "disk_space": "ok"
  },
  "uptime": 3600
}
```

### Health Check Parameters

- **Interval**: How often to check (e.g., 30 seconds)
- **Timeout**: Max time to wait for response (e.g., 5 seconds)
- **Healthy threshold**: Consecutive successes to mark healthy (e.g., 2)
- **Unhealthy threshold**: Consecutive failures to mark unhealthy (e.g., 3)

**Example:**
```
Check every 30s, timeout 5s
Healthy after 2 successes, unhealthy after 3 failures

Server starts: Unknown
Check 1: Success (1/2)
Check 2: Success (2/2) → Marked HEALTHY ✅
Check 3: Success (stays healthy)
Check 4: Timeout (1/3)
Check 5: Timeout (2/3)
Check 6: Timeout (3/3) → Marked UNHEALTHY ❌
```

## Cloud Load Balancer Implementations

### AWS Load Balancers

#### Application Load Balancer (ALB) - Layer 7

**Features:**
- HTTP/HTTPS/HTTP/2/WebSocket
- Content-based routing (path, host, headers)
- SSL termination
- Native integration with ECS, EKS, Lambda
- Target groups (instances, IPs, Lambda functions)

**Example Terraform:**
```hcl
resource "aws_lb" "main" {
  name               = "app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true

  tags = {
    Name = "app-alb"
  }
}

# Target group
resource "aws_lb_target_group" "api" {
  name     = "api-targets"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }

  tags = {
    Name = "api-targets"
  }
}

# Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# Path-based routing
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "static" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.static.arn
  }

  condition {
    path_pattern {
      values = ["/static/*", "/images/*"]
    }
  }
}
```

**ALB Advanced Features:**
- **Host-based routing**: Route `api.example.com` vs `www.example.com`
- **HTTP header routing**: Route based on custom headers
- **Query string routing**: Route based on URL parameters
- **Fixed responses**: Return static responses without backend
- **Redirects**: HTTP to HTTPS redirects
- **Authentication**: OIDC, SAML integration

#### Network Load Balancer (NLB) - Layer 4

**Features:**
- Ultra-low latency, high throughput
- TCP, UDP, TLS traffic
- Static IP addresses (Elastic IPs)
- Preserves source IP
- Millions of requests per second

**Use Cases:**
- Extreme performance requirements
- Non-HTTP protocols
- Static IP requirement
- PrivateLink endpoints

**Example:**
```hcl
resource "aws_lb" "network" {
  name               = "network-lb"
  internal           = false
  load_balancer_type = "network"
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection       = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "network-lb"
  }
}

resource "aws_lb_target_group" "tcp" {
  name     = "tcp-targets"
  port     = 3306
  protocol = "TCP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    protocol            = "TCP"
    port                = 3306
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_lb_listener" "tcp" {
  load_balancer_arn = aws_lb.network.arn
  port              = "3306"
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tcp.arn
  }
}
```

#### Gateway Load Balancer (GWLB) - Layer 3

**Purpose:** Deploy, scale, and manage third-party virtual appliances (firewalls, IDS/IPS).

**Use Cases:**
- Network security appliances
- Traffic inspection
- Deep packet inspection

#### AWS Load Balancer Comparison

| Feature | ALB | NLB | GWLB |
|---------|-----|-----|------|
| **Layer** | 7 | 4 | 3 |
| **Protocols** | HTTP/HTTPS | TCP/UDP/TLS | IP |
| **Performance** | Good | Extreme | High |
| **Latency** | Medium | Ultra-low | Low |
| **Static IP** | No | Yes | Yes |
| **Content Routing** | Yes | No | No |
| **WebSocket** | Yes | Yes | No |
| **Use Case** | Web apps | Performance | Security appliances |

### Azure Load Balancers

#### Azure Application Gateway - Layer 7

**Features:**
- WAF integration
- URL-based routing
- Multi-site hosting
- SSL termination
- Autoscaling

**Example (Azure CLI):**
```bash
# Create Application Gateway
az network application-gateway create \
  --name app-gateway \
  --resource-group myRG \
  --location eastus \
  --vnet-name myVNet \
  --subnet gateway-subnet \
  --capacity 2 \
  --sku WAF_v2 \
  --http-settings-cookie-based-affinity Disabled \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --public-ip-address gateway-ip
```

#### Azure Load Balancer - Layer 4

**Types:**
- **Public Load Balancer**: Distributes internet traffic
- **Internal Load Balancer**: Distributes traffic within VNet

**SKUs:**
- **Basic**: Free, limited features
- **Standard**: Advanced features, SLA, zone redundancy

#### Azure Traffic Manager - DNS-based

**Purpose:** Global load balancing and failover using DNS.

**Routing Methods:**
- Priority (failover)
- Weighted
- Performance (geo-based latency)
- Geographic
- Multivalue
- Subnet-based

### GCP Load Balancers

#### Global HTTP(S) Load Balancer - Layer 7

**Features:**
- Anycast IP (single global IP)
- Cross-region load balancing
- Cloud CDN integration
- URL-based routing
- SSL certificates managed by Google

**Architecture:**
```
Client (anywhere) → Anycast IP → Nearest Google PoP
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              Backend (US)         Backend (EU)        Backend (ASIA)
```

**Example (Terraform):**
```hcl
resource "google_compute_global_forwarding_rule" "default" {
  name       = "global-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

resource "google_compute_backend_service" "default" {
  name          = "backend-service"
  health_checks = [google_compute_health_check.default.id]
  
  backend {
    group           = google_compute_instance_group_manager.us.instance_group
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
  }

  backend {
    group           = google_compute_instance_group_manager.eu.instance_group
    balancing_mode  = "UTILIZATION"
    max_utilization = 0.8
  }

  load_balancing_scheme = "EXTERNAL"
}
```

#### Network Load Balancer - Layer 4

**Types:**
- **External TCP/UDP Load Balancer**: Regional, high performance
- **Internal TCP/UDP Load Balancer**: VPC-internal traffic

## Session Persistence (Sticky Sessions)

**Definition:** Ensures requests from same client go to same backend server.

### Methods

#### 1. Cookie-Based (Application Cookie)
```
Client first request → LB → Server A
Server A sets cookie: SERVERID=server_a
Subsequent requests with cookie → Always route to Server A
```

#### 2. Source IP Affinity
```
Hash client IP → Always route to same server
```

#### 3. Application-Managed Sessions
```
Store session data in shared storage:
- Redis/Memcached
- Database
- DynamoDB, etc.
Any server can handle request
```

**Pros of Sticky Sessions:**
- Simple session management
- No shared session storage needed

**Cons:**
- Uneven load distribution
- Server failure loses sessions
- Complicates autoscaling

**Best Practice:** Use shared session storage for cloud-native applications.

## Load Balancer Best Practices

1. **Use health checks**: Always configure meaningful health checks
2. **Enable access logs**: Monitor traffic patterns and troubleshoot issues
3. **SSL termination at LB**: Offload SSL processing from backends
4. **Multi-AZ deployment**: Deploy LB across availability zones
5. **Implement proper timeouts**: Connection timeout, idle timeout
6. **Use autoscaling with LBs**: Dynamic backend capacity
7. **Monitor metrics**: Request count, latency, error rates, target health
8. **Configure proper security groups**: Restrict LB to necessary ports
9. **Use Layer 7 for web apps**: Take advantage of advanced routing
10. **Plan for capacity**: Ensure LB can handle traffic spikes

## Troubleshooting Load Balancers

### Common Issues

#### 1. Unhealthy Targets
```bash
# AWS - Check target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:...

# Possible causes:
- Security group blocking health check
- Application not responding on health check path
- Health check path returns non-200 status
```

#### 2. High Latency
```
Check:
- Backend server performance
- Database query performance
- Network latency between LB and backends
- SSL handshake overhead
```

#### 3. 502/503/504 Errors
```
502 Bad Gateway: Backend returned invalid response
503 Service Unavailable: No healthy targets
504 Gateway Timeout: Backend didn't respond in time

Fix:
- Check backend health
- Increase timeout settings
- Check backend logs
```

#### 4. Uneven Load Distribution
```
Causes:
- Long-lived connections (use least connections algorithm)
- Sticky sessions (consider if necessary)
- Cross-zone load balancing disabled

Solution:
- Enable cross-zone load balancing
- Review algorithm choice
- Check target weights
```

### Monitoring Metrics

```
Key metrics:
- Request count
- Target response time
- HTTP error rates (4xx, 5xx)
- Active connections
- Healthy/unhealthy host count
- Request count per target
```

---

**Previous Module**: [02_FIREWALLS.md](02_FIREWALLS.md)  
**Next Module**: [04_WEB_PROXIES.md](04_WEB_PROXIES.md)
