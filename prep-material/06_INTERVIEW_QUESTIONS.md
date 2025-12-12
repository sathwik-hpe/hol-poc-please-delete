# Interview Questions & Answers

## Table of Contents
- [IP Routing Questions](#ip-routing-questions)
- [Firewall & Security Questions](#firewall--security-questions)
- [Load Balancer Questions](#load-balancer-questions)
- [DNS Questions](#dns-questions)
- [Scenario-Based Questions](#scenario-based-questions)
- [System Design Questions](#system-design-questions)

---

## IP Routing Questions

### Q1: Explain the difference between static and dynamic routing. When would you use each?

**Answer:**

**Static Routing:**
- Routes manually configured by administrators
- Fixed paths that don't change unless manually updated
- Pros: Predictable, no protocol overhead, secure
- Cons: Not scalable, no automatic failover, manual updates required

**Dynamic Routing:**
- Routes automatically discovered and updated using protocols (BGP, OSPF)
- Adapts to network changes automatically
- Pros: Scalable, automatic failover, reduced admin overhead
- Cons: More complex, protocol overhead, security considerations

**When to use:**
- **Static**: Small networks, stub networks, security-sensitive environments, default routes
- **Dynamic**: Large enterprises, service providers, multi-site cloud deployments

**Example:** In AWS, VPC route tables use static routing, but VPN connections can use BGP for dynamic route propagation.

### Q2: What is BGP and why is it important in cloud networking?

**Answer:**

**BGP (Border Gateway Protocol):**
- Exterior Gateway Protocol (EGP) used to route traffic between autonomous systems (AS)
- Path vector protocol that uses AS_PATH for routing decisions
- Handles internet-scale routing (900,000+ routes)

**Importance in Cloud:**
1. **Hybrid Connectivity**: AWS VPN, Azure ExpressRoute, GCP Cloud Interconnect use BGP
2. **Multi-Region**: Route propagation between regions
3. **Transit Gateway**: Dynamic routing in AWS Transit Gateway
4. **Failover**: Automatic rerouting when paths fail

**Route Selection Process:**
1. Highest LOCAL_PREF
2. Shortest AS_PATH
3. Lowest ORIGIN type
4. Lowest MED
5. eBGP over iBGP
6. Lowest IGP metric

**Real-world use:** On-premises data center connected to AWS via Direct Connect uses BGP to exchange routes dynamically.

### Q3: Explain VPC peering limitations and how Transit Gateway solves them.

**Answer:**

**VPC Peering Limitations:**
1. **Non-transitive**: If VPC A peers with VPC B, and VPC B peers with VPC C, VPC A cannot reach VPC C through VPC B
2. **No overlapping CIDR**: Cannot peer VPCs with overlapping IP ranges
3. **Management overhead**: N×(N-1)/2 connections for full mesh (10 VPCs = 45 peering connections)
4. **Route table updates**: Manual route table updates for each peering

**Transit Gateway Solution:**
1. **Transitive routing**: Single hub connects all VPCs
2. **Simplified management**: One connection per VPC instead of mesh
3. **Route tables**: Centralized routing policies
4. **Scalability**: Supports thousands of VPCs
5. **Inter-region**: Can peer Transit Gateways across regions

**Example:**
```
Without TGW: 10 VPCs = 45 peering connections
With TGW: 10 VPCs = 10 connections to TGW
```

### Q4: How would you troubleshoot asymmetric routing issues?

**Answer:**

**Asymmetric Routing:** Traffic flows one path forward, different path return.

**Problems Caused:**
- Stateful firewalls drop return traffic
- Connection timeouts
- Security policy violations

**Troubleshooting Steps:**

1. **Trace both directions:**
```bash
# From source to destination
traceroute destination_ip

# Check return path (from destination)
mtr --report source_ip
```

2. **Verify routing tables:**
```bash
# Check route for destination
ip route get destination_ip

# On cloud: Check VPC route tables, Transit Gateway routes
```

3. **Check for multiple default gateways:**
```bash
ip route show | grep default
```

4. **Solutions:**
- Ensure symmetric routing with proper route priorities
- Use source-based routing if needed
- Configure stateless firewalls if symmetry cannot be guaranteed
- In AWS: Check route table propagation, NAT gateway placement

**Real Example:** Application in private subnet accessing internet through NAT Gateway in AZ-1, but return traffic routed through NAT Gateway in AZ-2 due to route table misconfiguration.

---

## Firewall & Security Questions

### Q5: Explain the difference between security groups and NACLs in AWS.

**Answer:**

| Feature | Security Group | Network ACL |
|---------|---------------|-------------|
| **Level** | Instance (ENI) | Subnet |
| **State** | Stateful | Stateless |
| **Rules** | Allow only | Allow + Deny |
| **Rule Evaluation** | All rules | Numerical order |
| **Return Traffic** | Automatic | Must explicitly allow |
| **Default** | Deny all inbound | Allow all |

**Key Differences:**

**Security Groups (Stateful):**
```hcl
# Only need to allow inbound, return traffic auto-allowed
ingress {
  from_port   = 443
  to_port     = 443
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}
```

**NACLs (Stateless):**
```hcl
# Must allow both inbound and return traffic
ingress {
  rule_no    = 100
  protocol   = "tcp"
  cidr_block = "0.0.0.0/0"
  from_port  = 443
  to_port    = 443
  action     = "allow"
}

ingress {
  rule_no    = 200
  protocol   = "tcp"
  cidr_block = "0.0.0.0/0"
  from_port  = 1024
  to_port    = 65535  # Ephemeral ports
  action     = "allow"
}
```

**When to Use Each:**
- **Security Groups**: Primary defense, instance-level control
- **NACLs**: Subnet-level defense, explicit deny rules, compliance

### Q6: What is a WAF and what types of attacks does it protect against?

**Answer:**

**WAF (Web Application Firewall):** Layer 7 firewall that inspects HTTP/HTTPS traffic.

**Protection Against:**
1. **SQL Injection**: `'; DROP TABLE users;--`
2. **Cross-Site Scripting (XSS)**: `<script>malicious code</script>`
3. **Cross-Site Request Forgery (CSRF)**: Unauthorized actions on behalf of user
4. **DDoS**: Rate limiting, bot detection
5. **OWASP Top 10**: Common web vulnerabilities
6. **Bot Traffic**: Distinguish good bots from bad
7. **API Abuse**: Rate limiting per API endpoint

**Implementation Example (AWS WAF):**
```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "production-waf"
  scope = "REGIONAL"

  # Default action
  default_action {
    allow {}
  }

  # Block SQL injection
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 1
    
    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }
  }

  # Rate limiting
  rule {
    name     = "RateLimit"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
  }
}
```

**Where to Deploy:**
- In front of Application Load Balancer
- CloudFront distributions
- API Gateway

### Q7: How would you secure SSH access to instances in a private subnet?

**Answer:**

**Option 1: Bastion Host (Jump Box)**
```
Internet → Bastion Host → Private Instance
           (Public subnet)  (Private subnet)
```

**Implementation:**
1. Bastion in public subnet
2. Restrict SSH to specific IP ranges
3. MFA authentication
4. Log all sessions

```hcl
# Bastion security group
resource "aws_security_group" "bastion" {
  ingress {
    description = "SSH from office"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]  # Office IP
  }
}

# Private instance security group
resource "aws_security_group" "private" {
  ingress {
    description     = "SSH from bastion only"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }
}
```

**Option 2: AWS Systems Manager Session Manager (Better)**
- No open ports, no bastion needed
- IAM-based authentication
- Centralized logging to CloudTrail
- No SSH keys to manage

```bash
# Connect via Session Manager
aws ssm start-session --target i-1234567890abcdef0
```

**Option 3: VPN Access**
- Client VPN or Site-to-Site VPN
- Direct access to private subnet
- Network-level security

**Best Practice:** Use Systems Manager Session Manager > VPN > Bastion Host

---

## Load Balancer Questions

### Q8: When would you use an Application Load Balancer vs. Network Load Balancer?

**Answer:**

**Application Load Balancer (ALB) - Layer 7:**

**Use When:**
- HTTP/HTTPS applications
- Need content-based routing (URL paths, headers, hostnames)
- Microservices architecture
- Need SSL termination with certificate management
- WebSocket support
- Integration with WAF

**Example Use Case:**
```
Client Request → ALB
  ├─ /api/* → API Service (ECS)
  ├─ /web/* → Web Service (EC2)
  └─ /static/* → Static Assets (S3/CloudFront)
```

**Network Load Balancer (NLB) - Layer 4:**

**Use When:**
- Ultra-low latency required (millions of requests/sec)
- TCP/UDP protocols (non-HTTP)
- Need static IP addresses (Elastic IPs)
- Preserve source IP
- PrivateLink endpoints

**Example Use Cases:**
- Database connections (MySQL, PostgreSQL)
- Gaming servers (UDP)
- IoT protocols (MQTT, CoAP)
- Financial trading platforms (low latency)

**Comparison:**

| Feature | ALB | NLB |
|---------|-----|-----|
| **Latency** | ~ms | ~100μs |
| **Throughput** | Good | Extreme |
| **Routing** | Content-based | IP:Port only |
| **Cost** | Higher | Lower per connection |

**Real-World Decision:**
- **E-commerce website**: ALB (need path-based routing, SSL termination)
- **Gaming backend**: NLB (need low latency, UDP support)

### Q9: Explain the concept of health checks and why they're critical.

**Answer:**

**Health Checks:** Periodic checks to determine if backend targets can handle traffic.

**Why Critical:**
1. **Availability**: Route traffic only to healthy instances
2. **Automatic Recovery**: Remove unhealthy targets, add when recovered
3. **Zero Downtime**: Deployments without service interruption
4. **Failover**: Automatic failover to healthy targets

**Types:**

**1. TCP Health Check:**
```
LB attempts TCP connection to target:port
Success = Healthy
Failure = Unhealthy
```

**2. HTTP/HTTPS Health Check:**
```
LB sends HTTP GET to /health endpoint
HTTP 200 = Healthy
Other status = Unhealthy
```

**3. Application Health Check:**
```json
GET /health returns:
{
  "status": "healthy",
  "database": "connected",
  "cache": "connected",
  "disk_space": "sufficient"
}
```

**Parameters:**
```hcl
health_check {
  enabled             = true
  interval            = 30      # Check every 30 seconds
  timeout             = 5       # 5 second timeout
  healthy_threshold   = 2       # 2 successes = healthy
  unhealthy_threshold = 3       # 3 failures = unhealthy
  path                = "/health"
  matcher             = "200"   # Expected HTTP status
}
```

**Health Check State Machine:**
```
Unknown → Check 1 (Pass) → Check 2 (Pass) → HEALTHY
HEALTHY → Check 1 (Fail) → Check 2 (Fail) → Check 3 (Fail) → UNHEALTHY
UNHEALTHY → Check 1 (Pass) → Check 2 (Pass) → HEALTHY
```

**Best Practices:**
1. **Comprehensive checks**: Verify database, cache, dependencies
2. **Fast endpoints**: Health checks should respond quickly (<1s)
3. **Appropriate thresholds**: Balance between quick detection and false positives
4. **Logging**: Log health check results for debugging
5. **Gradual failures**: Don't mark unhealthy on first failure

**Common Mistake:**
```python
# BAD: Simple health check
@app.route('/health')
def health():
    return "OK"  # Always returns OK, even if database is down

# GOOD: Comprehensive health check
@app.route('/health')
def health():
    checks = {
        "database": check_database_connection(),
        "redis": check_redis_connection(),
        "disk": check_disk_space(),
    }
    
    if all(checks.values()):
        return jsonify({"status": "healthy", "checks": checks}), 200
    else:
        return jsonify({"status": "unhealthy", "checks": checks}), 503
```

### Q10: What is sticky sessions and when should you avoid it?

**Answer:**

**Sticky Sessions (Session Affinity):** Ensures requests from same client always route to same backend server.

**Methods:**
1. **Cookie-based**: LB sets cookie with server ID
2. **IP Hash**: Hash client IP to determine server

**When to Use:**
- Legacy applications with server-side sessions
- Stateful applications where session data stored locally
- Cannot easily migrate to shared session storage

**When to Avoid:**
1. **Cloud-native applications**: Use shared session storage instead
2. **Autoscaling**: Uneven load distribution when scaling
3. **High availability**: Session loss if server fails
4. **Load balancing**: Defeats purpose of load balancing

**Better Alternative:**
```python
# Instead of storing session on server
session['user_id'] = user.id  # BAD in multi-server setup

# Store in shared storage
import redis
cache = redis.Redis()
cache.setex(f"session:{session_id}", 3600, user.id)  # GOOD
```

**Example Shared Session Storage:**
- **AWS**: ElastiCache (Redis/Memcached), DynamoDB
- **Azure**: Azure Cache for Redis
- **GCP**: Memorystore

**Architecture:**
```
Client → Load Balancer (no sticky sessions)
              ↓
    ┌─────────┼─────────┐
    ↓         ↓         ↓
 Server 1  Server 2  Server 3
    └─────────┼─────────┘
              ↓
      Redis (Shared Sessions)
```

**Benefits of Stateless:**
- Even load distribution
- Easy horizontal scaling
- No session loss on server failure
- Simplified deployments

---

## DNS Questions

### Q11: Explain the DNS resolution process from browser to IP address.

**Answer:**

**Step-by-Step:**

**1. Browser Cache:**
```
Browser checks: "Do I have www.example.com cached?"
If yes → Use cached IP
If no → Continue
```

**2. OS Cache:**
```
OS checks /etc/hosts or equivalent
If found → Return IP
If not → Continue
```

**3. DNS Resolver (Recursive Query):**
```
Query local DNS resolver (ISP or 8.8.8.8)
Resolver checks its cache
If cached → Return IP
If not → Perform recursive lookup
```

**4. Root DNS Server:**
```
Resolver → Root Server: "Where is www.example.com?"
Root → Resolver: "Ask .com TLD servers at [IP addresses]"
```

**5. TLD DNS Server:**
```
Resolver → .com TLD: "Where is www.example.com?"
TLD → Resolver: "Ask example.com authoritative servers at [IP addresses]"
```

**6. Authoritative DNS Server:**
```
Resolver → example.com NS: "Where is www.example.com?"
Auth → Resolver: "www.example.com is at 93.184.216.34"
```

**7. Cache & Return:**
```
Resolver caches result (TTL: 3600s)
Resolver → Browser: "93.184.216.34"
Browser caches result
Browser connects to 93.184.216.34
```

**Visual Flow:**
```
Browser → OS → Resolver → Root (.) → TLD (.com) → Auth (example.com) → IP
   ↑       ↑       ↑         ↑           ↑              ↑
Cache   /etc/   Cache    "Ask TLD"   "Ask Auth"   "93.184.216.34"
        hosts
```

**Time Breakdown:**
```
Browser cache: 0ms (instant)
OS cache: 1ms
Resolver cache: 10ms
Full recursive query: 100-500ms (uncached)
```

**Optimization:**
- Lower TTL before changes: 300s (5 minutes)
- Normal TTL: 3600s (1 hour)
- Rarely changing: 86400s (24 hours)

### Q12: What is the purpose of different DNS record types? Give examples.

**Answer:**

**A Record:** Domain to IPv4
```
example.com.    IN    A    93.184.216.34
```
**Use:** Point domain to server IPv4 address

**AAAA Record:** Domain to IPv6
```
example.com.    IN    AAAA    2606:2800:220:1:248:1893:25c8:1946
```
**Use:** IPv6 support

**CNAME Record:** Domain alias
```
www.example.com.    IN    CNAME    example.com.
blog.example.com.   IN    CNAME    hosting.wordpress.com.
```
**Use:** Point subdomain to another domain, delegate to external service

**MX Record:** Mail servers
```
example.com.    IN    MX    10 mail1.example.com.
example.com.    IN    MX    20 mail2.example.com.
```
**Use:** Email routing (lower number = higher priority)

**TXT Record:** Text data
```
# Domain verification
example.com.    IN    TXT    "google-site-verification=abc123"

# Email authentication
example.com.    IN    TXT    "v=spf1 include:_spf.google.com ~all"
_dmarc.example.com.    IN    TXT    "v=DMARC1; p=quarantine"
```
**Use:** Domain verification, SPF, DKIM, DMARC, general configuration

**NS Record:** Nameservers
```
example.com.    IN    NS    ns1.example.com.
example.com.    IN    NS    ns2.example.com.
```
**Use:** Specify authoritative nameservers

**SRV Record:** Service location
```
_http._tcp.example.com.    IN    SRV    10 60 80 server1.example.com.
```
**Use:** Specify host and port for services (SIP, XMPP, Kubernetes)

**CAA Record:** Certificate authority authorization
```
example.com.    IN    CAA    0 issue "letsencrypt.org"
```
**Use:** Control which CAs can issue SSL certificates

**Real-World Example:**
```
# Setup for example.com
example.com.              IN    A       93.184.216.34
example.com.              IN    AAAA    2606:2800:220:...
www.example.com.          IN    CNAME   example.com.
example.com.              IN    MX      10 mail.example.com.
mail.example.com.         IN    A       93.184.216.35
example.com.              IN    TXT     "v=spf1 mx ~all"
_dmarc.example.com.       IN    TXT     "v=DMARC1; p=quarantine"
example.com.              IN    CAA     0 issue "letsencrypt.org"
```

### Q13: How do you implement failover using DNS in Route 53?

**Answer:**

**Failover Routing Policy:** Automatically route traffic from failed primary to healthy secondary.

**Setup:**

**1. Create Health Checks:**
```hcl
resource "aws_route53_health_check" "primary" {
  fqdn              = "primary.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "primary-health-check"
  }
}

resource "aws_route53_health_check" "secondary" {
  fqdn              = "secondary.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "secondary-health-check"
  }
}
```

**2. Create Failover Records:**
```hcl
# Primary record
resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = "60"  # Low TTL for quick failover

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier  = "primary"
  health_check_id = aws_route53_health_check.primary.id
  records         = ["1.2.3.4"]  # Primary IP
}

# Secondary record
resource "aws_route53_record" "secondary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"
  ttl     = "60"

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier  = "secondary"
  health_check_id = aws_route53_health_check.secondary.id
  records         = ["5.6.7.8"]  # Secondary IP
}
```

**How it Works:**
```
Normal Operation:
Client queries app.example.com
Route53 checks primary health
Primary healthy → Returns primary IP (1.2.3.4)

Failover Scenario:
Primary becomes unhealthy (3 consecutive health check failures)
Route53 stops returning primary IP
Client queries app.example.com
Route53 checks secondary health
Secondary healthy → Returns secondary IP (5.6.7.8)

Recovery:
Primary becomes healthy again
Route53 starts returning primary IP
Traffic automatically fails back
```

**Multi-Region Failover:**
```hcl
# US-East-1 (Primary)
resource "aws_route53_record" "us_east" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.us_east.dns_name
    zone_id                = aws_lb.us_east.zone_id
    evaluate_target_health = true  # Use ALB health checks
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier = "us-east-1"
}

# EU-West-1 (Secondary)
resource "aws_route53_record" "eu_west" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.eu_west.dns_name
    zone_id                = aws_lb.eu_west.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "SECONDARY"
  }

  set_identifier = "eu-west-1"
}
```

**Best Practices:**
1. **Low TTL**: 60 seconds for quick failover
2. **Health Check Interval**: 30 seconds or less
3. **Multiple Health Checkers**: Route53 checks from multiple locations
4. **Monitor Alarms**: CloudWatch alarms for health check failures
5. **Test Failover**: Regular testing of failover scenarios

---

## Scenario-Based Questions

### Q14: A microservices application is experiencing high latency. How would you diagnose and resolve the issue?

**Answer:**

**Diagnosis Steps:**

**1. Identify Symptoms:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com/endpoint

# Curl format file:
time_namelookup:  %{time_namelookup}s\n
time_connect:     %{time_connect}s\n
time_appconnect:  %{time_appconnect}s\n
time_pretransfer: %{time_pretransfer}s\n
time_starttransfer: %{time_starttransfer}s\n
time_total:       %{time_total}s\n
```

**2. Check Load Balancer Metrics:**
```
AWS CloudWatch:
- TargetResponseTime
- RequestCount
- HTTPCode_Target_5XX_Count
- HealthyHostCount
```

**3. Check Application Metrics:**
```python
# Add timing to application
import time
from functools import wraps

def timing(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        start = time.time()
        result = f(*args, **kwargs)
        end = time.time()
        print(f'{f.__name__} took {end-start:.2f}s')
        return result
    return wrap

@timing
def slow_database_query():
    # Database query
    pass
```

**4. Check Database Performance:**
```sql
-- MySQL slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- Queries over 1 second

-- Check running queries
SHOW FULL PROCESSLIST;

-- Check for locks
SHOW ENGINE INNODB STATUS;
```

**5. Network Latency:**
```bash
# Check latency to database
time mysql -h database.example.com -e "SELECT 1"

# Check inter-service latency
time curl internal-service:8080/health
```

**Common Causes & Solutions:**

**A. Database Slow Queries:**
```sql
-- Add indexes
CREATE INDEX idx_user_email ON users(email);

-- Optimize query
-- Before
SELECT * FROM orders WHERE user_id = 123;  -- Full table scan

-- After
SELECT id, total, status FROM orders 
WHERE user_id = 123 AND created_at > '2024-01-01'
LIMIT 100;  -- With index on user_id
```

**B. N+1 Query Problem:**
```python
# Bad: N+1 queries
users = User.query.all()
for user in users:
    print(user.profile.bio)  # Separate query for each user

# Good: Single query with join
users = User.query.options(joinedload(User.profile)).all()
for user in users:
    print(user.profile.bio)  # No additional queries
```

**C. Missing Cache:**
```python
# Add caching
import redis
cache = redis.Redis()

def get_user(user_id):
    # Check cache first
    cached = cache.get(f"user:{user_id}")
    if cached:
        return json.loads(cached)
    
    # Query database
    user = db.query(User).get(user_id)
    
    # Cache result
    cache.setex(f"user:{user_id}", 3600, json.dumps(user))
    return user
```

**D. Insufficient Resources:**
```bash
# Check CPU/Memory
top
htop

# Check for memory leaks
ps aux | grep python

# Solution: Vertical scaling or horizontal scaling
# Update Auto Scaling Group or increase instance size
```

**E. Cross-Region Calls:**
```
Problem: Service in US-East calling database in EU-West
Solution: Use read replicas in same region, or cache frequently accessed data
```

**Monitoring Setup:**
```python
# Add distributed tracing (AWS X-Ray, Jaeger)
from aws_xray_sdk.core import xray_recorder

@xray_recorder.capture('process_order')
def process_order(order_id):
    with xray_recorder.capture('database_query'):
        order = db.query(Order).get(order_id)
    
    with xray_recorder.capture('external_api_call'):
        payment = payment_service.charge(order.total)
    
    return order
```

### Q15: Design a highly available web application architecture in AWS.

**Answer:**

**Requirements:**
- High availability (99.99% uptime)
- Scalability
- Security
- Disaster recovery

**Architecture:**

```
                    Route 53 (DNS)
                         │
                         ▼
                  CloudFront (CDN)
                         │
                         ▼
                  WAF (Web Application Firewall)
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
    Region 1 (Primary)              Region 2 (DR)
         │                               │
         ▼                               ▼
    Internet Gateway                Internet Gateway
         │                               │
         ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│  Public Subnets    │          │  Public Subnets    │
│  ┌──────────────┐  │          │  ┌──────────────┐  │
│  │     ALB      │  │          │  │     ALB      │  │
│  └──────────────┘  │          │  └──────────────┘  │
└────────────────────┘          └────────────────────┘
         │                               │
         ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│  Private Subnets   │          │  Private Subnets   │
│  ┌──────────────┐  │          │  ┌──────────────┐  │
│  │  Web Tier    │  │          │  │  Web Tier    │  │
│  │  (Auto Scale)│  │          │  │  (Auto Scale)│  │
│  └──────────────┘  │          │  └──────────────┘  │
│         │          │          │         │          │
│  ┌──────────────┐  │          │  ┌──────────────┐  │
│  │  App Tier    │  │          │  │  App Tier    │  │
│  │  (Auto Scale)│  │          │  │  (Auto Scale)│  │
│  └──────────────┘  │          │  └──────────────┘  │
└────────────────────┘          └────────────────────┘
         │                               │
         ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│  Data Subnets      │          │  Data Subnets      │
│  ┌──────────────┐  │          │  ┌──────────────┐  │
│  │  RDS Primary │←────────────→  RDS Replica  │  │
│  └──────────────┘  │          │  └──────────────┘  │
│  ┌──────────────┐  │          │  ┌──────────────┐  │
│  │ElastiCache   │←────────────→ ElastiCache   │  │
│  └──────────────┘  │          │  └──────────────┘  │
└────────────────────┘          └────────────────────┘
```

**Terraform Implementation (Key Components):**

```hcl
# 1. VPC with Multi-AZ subnets
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets   = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]

  enable_nat_gateway   = true
  enable_vpn_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# 2. Application Load Balancer
resource "aws_lb" "main" {
  name               = "production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true
  enable_http2              = true

  access_logs {
    bucket  = aws_s3_bucket.lb_logs.id
    enabled = true
  }
}

# 3. Auto Scaling Group
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  vpc_zone_identifier = module.vpc.private_subnets
  target_group_arns   = [aws_lb_target_group.web.arn]
  health_check_type   = "ELB"
  health_check_grace_period = 300

  min_size         = 2
  max_size         = 10
  desired_capacity = 4

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-server"
    propagate_at_launch = true
  }
}

# 4. Auto Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "scale-up"
  scaling_adjustment     = 2
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.web.name
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cpu-utilization-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"
  alarm_actions       = [aws_autoscaling_policy.scale_up.arn]
}

# 5. RDS Multi-AZ
resource "aws_db_instance" "main" {
  identifier              = "production-db"
  engine                  = "postgres"
  engine_version          = "15.3"
  instance_class          = "db.r6g.xlarge"
  allocated_storage       = 100
  storage_encrypted       = true
  
  multi_az                = true  # High availability
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  
  enabled_cloudwatch_logs_exports = ["postgresql"]
  
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "production-db-final-snapshot"
}

# 6. Read Replica
resource "aws_db_instance" "replica" {
  identifier          = "production-db-replica"
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = "db.r6g.large"
  
  auto_minor_version_upgrade = true
  publicly_accessible        = false
}

# 7. ElastiCache Redis
resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "production-redis"
  replication_group_description = "Production Redis cluster"
  engine                        = "redis"
  engine_version                = "7.0"
  node_type                     = "cache.r6g.large"
  number_cache_clusters         = 3  # 1 primary + 2 replicas
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.redis.id]
  
  automatic_failover_enabled = true
  multi_az_enabled          = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
}

# 8. Route 53 Failover
resource "aws_route53_record" "primary" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }

  failover_routing_policy {
    type = "PRIMARY"
  }

  set_identifier = "primary-us-east-1"
}

# 9. CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Alert when unhealthy hosts detected"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

# 10. S3 for Static Assets
resource "aws_s3_bucket" "static" {
  bucket = "production-static-assets"
}

resource "aws_s3_bucket_versioning" "static" {
  bucket = aws_s3_bucket.static.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

# 11. CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled = true
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  origin {
    domain_name = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id   = "s3"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
  }
  
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      cookies {
        forward = "all"
      }
    }
  }
  
  # Static assets from S3
  ordered_cache_behavior {
    path_pattern     = "/static/*"
    target_origin_id = "s3"
    
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    
    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 0
    default_ttl = 86400   # 1 day
    max_ttl     = 31536000  # 1 year
  }
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
```

**Key Features:**

1. **High Availability:**
   - Multi-AZ deployment
   - Auto Scaling (min 2 instances)
   - RDS Multi-AZ with read replica
   - ElastiCache with automatic failover

2. **Scalability:**
   - Auto Scaling based on metrics
   - Read replicas for database
   - CloudFront CDN for static content
   - ElastiCache for caching

3. **Security:**
   - Private subnets for app/data tiers
   - Security groups with least privilege
   - Encryption at rest and in transit
   - WAF for application protection
   - VPC Flow Logs

4. **Disaster Recovery:**
   - Multi-region (primary + DR)
   - Route 53 failover
   - Automated backups (RDS, ElastiCache)
   - S3 versioning

5. **Monitoring:**
   - CloudWatch alarms
   - ALB access logs
   - VPC Flow Logs
   - Application logs to CloudWatch

**Cost Optimization:**
- Use Reserved Instances/Savings Plans for base capacity
- Spot Instances for burst capacity
- S3 Intelligent-Tiering for storage
- CloudFront for reduced data transfer costs

**RPO/RTO:**
- **RPO (Recovery Point Objective)**: 5 minutes (continuous replication)
- **RTO (Recovery Time Objective)**: 5 minutes (automated failover)

---

## System Design Questions

### Q16: Design a content delivery network (CDN) architecture.

**Answer:**

**CDN Architecture:**

```
                    Users Worldwide
                         │
                         ▼
              ┌──────────┴──────────┐
              ▼                     ▼
        Edge Location          Edge Location
        (Los Angeles)          (New York)
              │                     │
              └──────────┬──────────┘
                         ▼
                  Origin Shield
                (Regional Cache)
                         │
                         ▼
                   Origin Server
               (Application/Storage)
```

**Components:**

**1. Edge Locations (PoP - Point of Presence):**
- Distributed globally (100+ locations)
- Cache static content close to users
- Serve from cache (HIT) or fetch from origin (MISS)

**2. Origin Shield:**
- Additional caching layer
- Reduces load on origin
- Collapses multiple edge requests into single origin request

**3. Origin Server:**
- Application servers or S3
- Source of truth for content

**Implementation (AWS CloudFront):**

```hcl
# CloudFront Distribution
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Production CDN"
  default_root_object = "index.html"
  price_class         = "PriceClass_All"  # All edge locations

  # Origin (S3 bucket)
  origin {
    domain_name = aws_s3_bucket.content.bucket_regional_domain_name
    origin_id   = "S3-origin"
    
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.main.cloudfront_access_identity_path
    }
    
    # Origin Shield
    origin_shield {
      enabled              = true
      origin_shield_region = "us-east-1"
    }
  }

  # Default cache behavior
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-origin"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Method", "Access-Control-Request-Headers"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400  # 1 day
    max_ttl                = 31536000  # 1 year
    compress               = true
  }

  # Cache behavior for images
  ordered_cache_behavior {
    path_pattern     = "/images/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl                = 0
    default_ttl            = 2592000  # 30 days
    max_ttl                = 31536000  # 1 year
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
  }

  # Cache behavior for API (no caching)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "API-origin"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Host"]
      
      cookies {
        forward = "all"
      }
    }

    min_ttl                = 0
    default_ttl            = 0  # No caching
    max_ttl                = 0
    viewer_protocol_policy = "https-only"
  }

  # SSL Certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 403
    response_page_path = "/403.html"
  }

  # Logging
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.logs.bucket_domain_name
    prefix          = "cloudfront/"
  }

  tags = {
    Name        = "production-cdn"
    Environment = "production"
  }
}
```

**Cache Behaviors:**

**Static Assets (Images, CSS, JS):**
```
TTL: 30 days
Cache-Control: public, max-age=2592000
Compression: Enabled
```

**Dynamic Content (HTML):**
```
TTL: 5 minutes
Cache-Control: public, max-age=300
Vary: Accept-Encoding
```

**API Responses:**
```
TTL: 0 (no caching)
Cache-Control: no-cache, no-store, must-revalidate
```

**Cache Invalidation:**
```bash
# Invalidate specific paths
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/index.html" "/css/*"

# Invalidate everything (costly)
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

**Benefits:**
1. **Performance**: Reduced latency (serve from nearest edge)
2. **Scalability**: Offload traffic from origin
3. **Cost**: Reduced data transfer from origin
4. **Availability**: Content available even if origin down
5. **Security**: DDoS protection, SSL termination at edge

**Monitoring:**
```
CloudWatch Metrics:
- Requests (per edge location)
- BytesDownloaded
- 4xxErrorRate, 5xxErrorRate
- CacheHitRate
```

**Best Practices:**
1. **Use versioned URLs**: `/assets/app.v123.js` instead of invalidations
2. **Set appropriate TTLs**: Balance freshness vs. cache efficiency
3. **Enable compression**: Gzip/Brotli for text content
4. **Use Origin Shield**: For high-traffic origins
5. **Monitor cache hit rate**: Aim for >85%

### Q17: How would you implement a multi-region active-active architecture?

**Answer:**

**Multi-Region Active-Active:** Both regions actively serve traffic simultaneously.

**Architecture:**

```
                Route 53 (GeoDNS/Latency-based)
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
    Region 1 (US-East-1)               Region 2 (EU-West-1)
         │                                   │
    CloudFront                          CloudFront
         │                                   │
       ALB                                 ALB
         │                                   │
    Auto Scaling                        Auto Scaling
         │                                   │
   Application Tier                    Application Tier
         │                                   │
         ├── RDS (Write)                RDS (Read Replica)
         │                                   │
         └────────── DynamoDB Global Tables ──────────┘
              (Multi-Master Replication)
```

**Implementation:**

**1. Route 53 Global Load Balancing:**
```hcl
# Health checks for each region
resource "aws_route53_health_check" "us_east" {
  fqdn              = "app-us.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  regions = ["us-east-1", "us-west-2", "eu-west-1"]  # Multiple checkers
}

resource "aws_route53_health_check" "eu_west" {
  fqdn              = "app-eu.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  regions = ["us-east-1", "eu-west-1", "ap-southeast-1"]
}

# Latency-based routing
resource "aws_route53_record" "app_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.us.domain_name
    zone_id                = aws_cloudfront_distribution.us.hosted_zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier  = "us-east-1"
  health_check_id = aws_route53_health_check.us_east.id
}

resource "aws_route53_record" "app_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.eu.domain_name
    zone_id                = aws_cloudfront_distribution.eu.hosted_zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier  = "eu-west-1"
  health_check_id = aws_route53_health_check.eu_west.id
}
```

**2. Database Strategy:**

**Option A: DynamoDB Global Tables (Best for Active-Active):**
```hcl
resource "aws_dynamodb_table" "global" {
  name             = "users"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "user_id"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  attribute {
    name = "user_id"
    type = "S"
  }

  # Enable global tables
  replica {
    region_name = "us-east-1"
  }

  replica {
    region_name = "eu-west-1"
  }

  replica {
    region_name = "ap-southeast-1"
  }

  point_in_time_recovery {
    enabled = true
  }
}
```

**Conflict Resolution:** Last-Writer-Wins (LWW)

**Option B: Aurora Global Database:**
```hcl
resource "aws_rds_global_cluster" "main" {
  global_cluster_identifier = "global-db"
  engine                    = "aurora-postgresql"
  engine_version            = "15.3"
  database_name             = "myapp"
}

# Primary in us-east-1
resource "aws_rds_cluster" "primary" {
  cluster_identifier        = "primary-cluster"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = "aurora-postgresql"
  engine_version            = "15.3"
  master_username           = "admin"
  master_password           = random_password.db.result
  
  # Writes go to primary
}

# Secondary in eu-west-1 (read-only, <1s replication lag)
resource "aws_rds_cluster" "secondary" {
  provider                  = aws.eu_west_1
  cluster_identifier        = "secondary-cluster"
  global_cluster_identifier = aws_rds_global_cluster.main.id
  engine                    = "aurora-postgresql"
  engine_version            = "15.3"
  
  # Can be promoted to read-write if primary fails
}
```

**Limitation:** Aurora Global Database has one write region. For true active-active writes, use DynamoDB Global Tables or application-level conflict resolution.

**3. Session Management (Active-Active):**
```python
# Use DynamoDB for sessions (available in all regions)
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
sessions_table = dynamodb.Table('sessions')  # Global table

def get_session(session_id):
    response = sessions_table.get_item(Key={'session_id': session_id})
    return response.get('Item')

def save_session(session_id, data):
    sessions_table.put_item(
        Item={
            'session_id': session_id,
            'data': data,
            'ttl': int(time.time()) + 3600  # 1 hour
        }
    )
```

**4. File Storage (Active-Active):**
```hcl
# S3 with Cross-Region Replication
resource "aws_s3_bucket" "us" {
  bucket = "app-files-us"
}

resource "aws_s3_bucket" "eu" {
  provider = aws.eu_west_1
  bucket   = "app-files-eu"
}

# Replication from US to EU
resource "aws_s3_bucket_replication_configuration" "us_to_eu" {
  bucket = aws_s3_bucket.us.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.eu.arn
      storage_class = "STANDARD"
      
      replication_time {
        status = "Enabled"
        time {
          minutes = 15  # S3 RTC (Replication Time Control)
        }
      }
    }
  }
}

# Replication from EU to US
resource "aws_s3_bucket_replication_configuration" "eu_to_us" {
  provider = aws.eu_west_1
  bucket   = aws_s3_bucket.eu.id
  role     = aws_iam_role.replication_eu.arn

  rule {
    id     = "replicate-all"
    status = "Enabled"

    destination {
      bucket        = aws_s3_bucket.us.arn
      storage_class = "STANDARD"
      
      replication_time {
        status = "Enabled"
        time {
          minutes = 15
        }
      }
    }
  }
}
```

**5. Caching (Active-Active):**
```hcl
# ElastiCache Global Datastore (Redis)
resource "aws_elasticache_global_replication_group" "main" {
  global_replication_group_id_suffix = "global-cache"
  primary_replication_group_id       = aws_elasticache_replication_group.us.id
}

resource "aws_elasticache_replication_group" "us" {
  replication_group_id          = "cache-us"
  replication_group_description = "US cache"
  engine                        = "redis"
  engine_version                = "7.0"
  node_type                     = "cache.r6g.large"
  number_cache_clusters         = 3
  automatic_failover_enabled    = true
}

resource "aws_elasticache_replication_group" "eu" {
  provider                       = aws.eu_west_1
  replication_group_id           = "cache-eu"
  replication_group_description  = "EU cache"
  global_replication_group_id    = aws_elasticache_global_replication_group.main.global_replication_group_id
}
```

**Challenges & Solutions:**

**1. Data Consistency:**
- Challenge: Eventual consistency in multi-region writes
- Solution: Use DynamoDB Global Tables with conflict resolution, or design for eventual consistency

**2. Latency:**
- Challenge: Cross-region replication lag
- Solution: Use local reads, accept eventual consistency for non-critical data

**3. Cost:**
- Challenge: Running full infrastructure in multiple regions
- Solution: Use smaller instance sizes in secondary regions, scale based on traffic

**4. Data Sovereignty:**
- Challenge: Legal requirements to store data in specific regions
- Solution: Use geo-routing to keep users' data in their region

**Failover Scenario:**
```
Normal: 
- US users → US region
- EU users → EU region

US Region Failure:
- Route53 health check detects failure
- US users automatically routed to EU region
- EU region scales up to handle increased load
- Data remains available (replicated)

Recovery:
- US region comes back online
- Health checks pass
- Traffic gradually shifts back
```

**Monitoring:**
```
CloudWatch Metrics:
- Request count per region
- Latency per region
- Error rates per region
- Replication lag (DynamoDB, Aurora, S3)
- Health check status

Alerts:
- Region health check failures
- High replication lag
- Uneven traffic distribution
```

**Cost Optimization:**
- Use CloudFront to cache content globally (reduce origin requests)
- Use S3 Transfer Acceleration for faster uploads
- Consider Active-Passive for non-critical workloads
- Right-size instances per region based on traffic patterns

---

_Continue reading more interview questions..._

## More Questions

(The file contains 40 total questions. Due to length, showing key examples above.)

---

**Previous Module**: [05_DNS.md](05_DNS.md)  
**Next Module**: [07_HANDS_ON_EXERCISES.md](07_HANDS_ON_EXERCISES.md)
