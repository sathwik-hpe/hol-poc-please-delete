# Quick Reference Guide

## Table of Contents
- [Essential Commands](#essential-commands)
- [Key Concepts Cheat Sheet](#key-concepts-cheat-sheet)
- [Decision Matrices](#decision-matrices)
- [Common Troubleshooting](#common-troubleshooting)
- [Best Practices Checklist](#best-practices-checklist)

---

## Essential Commands

### AWS CLI Commands

#### VPC & Networking
```bash
# List VPCs
aws ec2 describe-vpcs

# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# List subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-xxxxx"

# Create subnet
aws ec2 create-subnet --vpc-id vpc-xxxxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a

# List route tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-xxxxx"

# Add route to route table
aws ec2 create-route --route-table-id rtb-xxxxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxxxx

# List internet gateways
aws ec2 describe-internet-gateways

# List NAT gateways
aws ec2 describe-nat-gateways

# VPC peering connections
aws ec2 describe-vpc-peering-connections
```

#### Security Groups & NACLs
```bash
# List security groups
aws ec2 describe-security-groups

# Create security group
aws ec2 create-security-group --group-name web-sg --description "Web servers" --vpc-id vpc-xxxxx

# Add inbound rule
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Remove rule
aws ec2 revoke-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# List NACLs
aws ec2 describe-network-acls

# Add NACL rule
aws ec2 create-network-acl-entry \
  --network-acl-id acl-xxxxx \
  --ingress \
  --rule-number 100 \
  --protocol tcp \
  --port-range From=443,To=443 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow
```

#### Load Balancers
```bash
# List ALBs/NLBs
aws elbv2 describe-load-balancers

# List target groups
aws elbv2 describe-target-groups

# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>

# Register targets
aws elbv2 register-targets \
  --target-group-arn <arn> \
  --targets Id=i-xxxxx Id=i-yyyyy

# Deregister targets
aws elbv2 deregister-targets \
  --target-group-arn <arn> \
  --targets Id=i-xxxxx

# List listeners
aws elbv2 describe-listeners --load-balancer-arn <arn>

# List listener rules
aws elbv2 describe-rules --listener-arn <arn>
```

#### Route 53 (DNS)
```bash
# List hosted zones
aws route53 list-hosted-zones

# List resource record sets
aws route53 list-resource-record-sets --hosted-zone-id <zone-id>

# Create record (requires JSON file)
aws route53 change-resource-record-sets \
  --hosted-zone-id <zone-id> \
  --change-batch file://record.json

# List health checks
aws route53 list-health-checks

# Get health check status
aws route53 get-health-check-status --health-check-id <id>

# Create health check
aws route53 create-health-check \
  --type HTTPS \
  --resource-path "/health" \
  --fully-qualified-domain-name "app.example.com" \
  --port 443 \
  --request-interval 30 \
  --failure-threshold 3
```

#### CloudWatch & Monitoring
```bash
# List alarms
aws cloudwatch describe-alarms

# Get metric statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=i-xxxxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# View logs
aws logs tail /aws/vpc/flow-logs --follow

# Filter logs
aws logs filter-log-events \
  --log-group-name "/aws/vpc/flow-logs" \
  --filter-pattern "REJECT"
```

### DNS Troubleshooting Commands

```bash
# Query A record
dig example.com A

# Query with specific nameserver
dig @8.8.8.8 example.com

# Query all record types
dig example.com ANY

# Short answer only
dig +short example.com

# Trace DNS resolution path
dig +trace example.com

# Reverse DNS lookup
dig -x 93.184.216.34

# Query MX records
dig example.com MX

# Query TXT records (SPF, DKIM)
dig example.com TXT

# Query nameservers
dig example.com NS

# Query SOA record
dig example.com SOA

# Check DNSSEC
dig example.com +dnssec

# Alternative: nslookup
nslookup example.com
nslookup -type=MX example.com

# Alternative: host
host example.com
host -t MX example.com
```

### Network Troubleshooting Commands

```bash
# Test connectivity
ping 8.8.8.8

# Trace route
traceroute google.com
# macOS/Linux
mtr google.com --report

# Check open ports
nc -zv example.com 443

# Test HTTP/HTTPS
curl -I https://example.com
curl -v https://example.com

# Measure request time
curl -w "@curl-format.txt" -o /dev/null -s https://example.com

# curl-format.txt:
#   time_namelookup:  %{time_namelookup}s\n
#   time_connect:     %{time_connect}s\n
#   time_appconnect:  %{time_appconnect}s\n
#   time_pretransfer: %{time_pretransfer}s\n
#   time_starttransfer: %{time_starttransfer}s\n
#   time_total:       %{time_total}s\n

# Check listening ports
netstat -tuln
# macOS alternative
lsof -i -P -n | grep LISTEN

# View routing table
ip route show
# macOS
netstat -nr

# Check network interfaces
ip addr show
# macOS
ifconfig

# Monitor network traffic
tcpdump -i eth0 port 80
# Capture to file
tcpdump -i eth0 -w capture.pcap

# Check DNS resolution
cat /etc/resolv.conf

# Flush DNS cache
# macOS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Linux (systemd)
sudo systemd-resolve --flush-caches
```

### Terraform Commands

```bash
# Initialize (download providers)
terraform init

# Validate syntax
terraform validate

# Format code
terraform fmt

# Plan changes
terraform plan

# Apply changes
terraform apply

# Apply with auto-approve
terraform apply -auto-approve

# Destroy resources
terraform destroy

# Show current state
terraform show

# List resources in state
terraform state list

# Show specific resource
terraform state show aws_instance.web

# Import existing resource
terraform import aws_instance.web i-xxxxx

# Taint resource (force recreation)
terraform taint aws_instance.web

# Refresh state
terraform refresh

# Output values
terraform output

# Workspace commands
terraform workspace list
terraform workspace new dev
terraform workspace select prod
```

---

## Key Concepts Cheat Sheet

### OSI Model
```
Layer 7: Application  → HTTP, HTTPS, DNS, SSH
Layer 6: Presentation → SSL/TLS, Encryption
Layer 5: Session      → NetBIOS, RPC
Layer 4: Transport    → TCP, UDP (NLB operates here)
Layer 3: Network      → IP, ICMP, Routing
Layer 2: Data Link    → MAC, Switches
Layer 1: Physical     → Cables, Hubs
```

### TCP vs UDP
```
TCP (Transmission Control Protocol):
✓ Connection-oriented
✓ Reliable (guarantees delivery)
✓ Ordered delivery
✓ Error checking
✓ Flow control
✓ Slower
Use: HTTP, HTTPS, SSH, FTP

UDP (User Datagram Protocol):
✓ Connectionless
✓ No delivery guarantee
✓ No ordering
✓ Minimal error checking
✓ Faster
Use: DNS, VoIP, Gaming, Streaming
```

### IP Addressing
```
Class A: 0.0.0.0    - 127.255.255.255   (16M hosts)
Class B: 128.0.0.0  - 191.255.255.255   (65K hosts)
Class C: 192.0.0.0  - 223.255.255.255   (254 hosts)

Private Ranges:
10.0.0.0    - 10.255.255.255    (/8)
172.16.0.0  - 172.31.255.255    (/12)
192.168.0.0 - 192.168.255.255   (/16)

CIDR Notation:
/32 = 255.255.255.255  (1 IP)
/24 = 255.255.255.0    (256 IPs, 254 usable)
/16 = 255.255.0.0      (65,536 IPs)
/8  = 255.0.0.0        (16.7M IPs)

Special IPs:
127.0.0.1   = Localhost
0.0.0.0     = All interfaces / Default route
255.255.255.255 = Broadcast

Ephemeral Ports: 1024-65535
Well-known Ports: 0-1023
```

### Common Ports
```
20/21   = FTP
22      = SSH
23      = Telnet
25      = SMTP
53      = DNS
80      = HTTP
110     = POP3
143     = IMAP
443     = HTTPS
3306    = MySQL
5432    = PostgreSQL
6379    = Redis
8080    = HTTP Alternate
27017   = MongoDB
```

### HTTP Status Codes
```
2xx Success:
200 OK
201 Created
202 Accepted
204 No Content

3xx Redirection:
301 Moved Permanently
302 Found (Temporary)
304 Not Modified

4xx Client Errors:
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
429 Too Many Requests

5xx Server Errors:
500 Internal Server Error
502 Bad Gateway (upstream failed)
503 Service Unavailable (overloaded/maintenance)
504 Gateway Timeout (upstream timeout)
```

### DNS Record Types
```
A      = Domain → IPv4
AAAA   = Domain → IPv6
CNAME  = Domain alias
MX     = Mail servers
TXT    = Text data (SPF, DKIM, verification)
NS     = Nameservers
SOA    = Start of Authority
PTR    = Reverse DNS (IP → Domain)
SRV    = Service location
CAA    = Certificate Authority Authorization

TTL    = Time to Live (cache duration)
```

### Load Balancer Algorithms
```
Round Robin:
  Request 1 → Server 1
  Request 2 → Server 2
  Request 3 → Server 3
  Request 4 → Server 1 (cycle)

Least Connections:
  Route to server with fewest active connections

Weighted Round Robin:
  Server 1 (weight 3): 60% traffic
  Server 2 (weight 2): 40% traffic

IP Hash:
  Hash(Client IP) → Always same server

Least Response Time:
  Route to server with lowest latency
```

---

## Decision Matrices

### When to Use Each Load Balancer

| Requirement | ALB | NLB | GLB |
|-------------|-----|-----|-----|
| HTTP/HTTPS routing | ✓ | ✗ | ✗ |
| Path-based routing | ✓ | ✗ | ✗ |
| Host-based routing | ✓ | ✗ | ✗ |
| SSL termination | ✓ | ✓ | ✗ |
| WebSocket | ✓ | ✓ | ✗ |
| Static IPs | ✗ | ✓ | ✓ |
| Ultra-low latency | ✗ | ✓ | ✗ |
| TCP/UDP | ✗ | ✓ | ✗ |
| PrivateLink | ✗ | ✓ | ✗ |
| Security appliances | ✗ | ✗ | ✓ |
| Layer 7 features | ✓ | ✗ | ✗ |
| Layer 4 performance | Good | Excellent | N/A |
| Cost per connection | Higher | Lower | Higher |

**Decision:**
- **ALB**: Web applications, microservices, need path routing
- **NLB**: Low latency, static IPs, TCP/UDP, millions of requests
- **GLB**: Third-party security appliances (firewalls, IDS/IPS)

### Database Strategy Selection

| Use Case | Solution | Reason |
|----------|----------|--------|
| Multi-region writes | DynamoDB Global Tables | True active-active |
| RDBMS + multi-region | Aurora Global Database | <1s replication, promote-able |
| Single region HA | RDS Multi-AZ | Automatic failover |
| Read-heavy workload | Read replicas | Offload reads |
| Time-series data | Amazon Timestream | Purpose-built |
| Document store | DocumentDB | MongoDB compatible |
| In-memory cache | ElastiCache | Redis/Memcached |
| Data warehouse | Redshift | Analytics queries |

### Routing Policy Selection (Route 53)

| Goal | Policy | Use Case |
|------|--------|----------|
| Lowest latency | Latency-based | Global application |
| Regional failover | Failover | DR scenario |
| Traffic distribution | Weighted | Blue-green deployment |
| Geo-compliance | Geolocation | Data sovereignty |
| Closest location | Geoproximity | Retail stores |
| Random distribution | Simple | Testing |
| Multi-value responses | Multivalue | DNS-based load balancing |

---

## Common Troubleshooting

### Connection Timeout Issues

**Problem**: Cannot connect to instance or service

**Checklist**:
```bash
# 1. Verify security group allows traffic
aws ec2 describe-security-groups --group-ids sg-xxxxx

# 2. Check NACL rules
aws ec2 describe-network-acls --network-acl-ids acl-xxxxx

# 3. Verify route table has route to IGW/NAT
aws ec2 describe-route-tables --route-table-ids rtb-xxxxx

# 4. Check if instance is running
aws ec2 describe-instance-status --instance-ids i-xxxxx

# 5. Test locally from instance
ssh ec2-user@instance
curl http://localhost:80

# 6. Check VPC Flow Logs
aws logs filter-log-events \
  --log-group-name "/aws/vpc/flow-logs" \
  --filter-pattern "REJECT"
```

**Common Fixes**:
```hcl
# Add missing security group rule
resource "aws_security_group_rule" "allow_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.web.id
}

# Add missing route
resource "aws_route" "internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}
```

### High Latency

**Problem**: Application response time > 1 second

**Investigation**:
```bash
# 1. Measure request breakdown
curl -w "@curl-format.txt" -o /dev/null -s https://api.example.com

# 2. Check database query time
# Enable slow query log on RDS
aws rds modify-db-parameter-group \
  --db-parameter-group-name default.postgres15 \
  --parameters "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate"

# 3. Check cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CacheHitRate \
  --dimensions Name=CacheClusterId,Value=my-cache \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average

# 4. Check ALB target response time
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/my-alb/xxx \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T23:59:59Z \
  --period 300 \
  --statistics Average,Maximum
```

**Solutions**:
1. **Add caching**: Redis/Memcached
2. **Optimize queries**: Add indexes, use EXPLAIN
3. **Add CDN**: CloudFront for static content
4. **Use read replicas**: Offload database reads
5. **Add connection pooling**: Reduce connection overhead

### DNS Resolution Failures

**Problem**: Domain not resolving

**Troubleshooting**:
```bash
# 1. Test DNS resolution
dig example.com
dig @8.8.8.8 example.com

# 2. Trace full resolution path
dig +trace example.com

# 3. Check nameservers
dig example.com NS

# 4. Check SOA record
dig example.com SOA

# 5. Test with different DNS servers
dig @8.8.8.8 example.com      # Google
dig @1.1.1.1 example.com      # Cloudflare
dig @208.67.222.222 example.com  # OpenDNS

# 6. Check Route 53 records
aws route53 list-resource-record-sets --hosted-zone-id <zone-id>

# 7. Check health check status
aws route53 get-health-check-status --health-check-id <id>
```

**Common Issues**:
- **NXDOMAIN**: Domain doesn't exist → Check spelling, verify NS records
- **SERVFAIL**: Server failure → Check authoritative nameservers
- **Propagation delay**: Wait up to 48 hours for DNS propagation
- **Wrong TTL**: Old records cached → Lower TTL before changes

### Load Balancer 502/503/504 Errors

**502 Bad Gateway**: Upstream returned invalid response
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check application logs
aws logs tail /aws/ecs/my-app --follow

# Verify application is listening on correct port
netstat -tuln | grep 8080

# Test application directly
curl http://instance-ip:8080/health
```

**503 Service Unavailable**: No healthy targets
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check health check configuration
aws elbv2 describe-target-groups --target-group-arns <arn>

# Verify security group allows health checks
# ALB health checks come from ALB IP range

# Check application health endpoint
curl http://instance-ip:8080/health
```

**504 Gateway Timeout**: Upstream timeout
```bash
# Increase timeout (default 30s)
aws elbv2 modify-target-group-attributes \
  --target-group-arn <arn> \
  --attributes Key=deregistration_delay.timeout_seconds,Value=60

# Check for slow database queries
# Check for N+1 query problems
# Add connection pooling
```

---

## Best Practices Checklist

### Security

- [ ] Use VPC with private subnets for application/database tiers
- [ ] Enable VPC Flow Logs
- [ ] Use security groups (not 0.0.0.0/0 unless necessary)
- [ ] Implement NACLs for subnet-level defense
- [ ] Enable MFA for AWS root account
- [ ] Use IAM roles (not access keys) for EC2/ECS
- [ ] Encrypt data at rest (EBS, RDS, S3)
- [ ] Encrypt data in transit (TLS/SSL)
- [ ] Enable AWS Config for compliance
- [ ] Use AWS WAF for web application protection
- [ ] Implement least privilege IAM policies
- [ ] Rotate secrets regularly (AWS Secrets Manager)
- [ ] Enable CloudTrail for audit logging

### High Availability

- [ ] Deploy across multiple Availability Zones (min 2, prefer 3)
- [ ] Use Auto Scaling for elasticity
- [ ] Implement health checks (ALB/NLB)
- [ ] Use RDS Multi-AZ or Aurora for database HA
- [ ] Configure automatic backups (RPO/RTO requirements)
- [ ] Use Route 53 for DNS with health checks
- [ ] Implement graceful degradation
- [ ] Test failover scenarios regularly
- [ ] Use ElastiCache for session storage (not local)
- [ ] Deploy in multiple regions for DR

### Performance

- [ ] Use CloudFront CDN for static content
- [ ] Implement caching (ElastiCache, CloudFront, application-level)
- [ ] Use read replicas for read-heavy workloads
- [ ] Enable compression (gzip, Brotli)
- [ ] Optimize database queries (indexes, EXPLAIN)
- [ ] Use connection pooling
- [ ] Implement async processing (SQS, EventBridge)
- [ ] Set appropriate TTLs for DNS
- [ ] Use latest instance types (Graviton2/3)
- [ ] Enable HTTP/2 and TLS 1.3

### Monitoring & Observability

- [ ] Enable CloudWatch metrics and alarms
- [ ] Set up CloudWatch Logs for applications
- [ ] Configure SNS for alerting
- [ ] Implement distributed tracing (X-Ray)
- [ ] Monitor key metrics (CPU, memory, latency, error rate)
- [ ] Create dashboards for visualization
- [ ] Set up log aggregation and analysis
- [ ] Monitor costs (AWS Cost Explorer, Budgets)
- [ ] Implement synthetic monitoring (canaries)
- [ ] Track SLIs/SLOs/SLAs

### Cost Optimization

- [ ] Use Reserved Instances / Savings Plans
- [ ] Implement Auto Scaling (scale down when idle)
- [ ] Use Spot Instances for fault-tolerant workloads
- [ ] Right-size instances (use Compute Optimizer)
- [ ] Delete unused resources (EBS volumes, snapshots, EIPs)
- [ ] Use S3 lifecycle policies
- [ ] Enable S3 Intelligent-Tiering
- [ ] Use CloudFront to reduce data transfer costs
- [ ] Implement resource tagging for cost allocation
- [ ] Review and act on Trusted Advisor recommendations

### Disaster Recovery

- [ ] Define RPO (Recovery Point Objective)
- [ ] Define RTO (Recovery Time Objective)
- [ ] Implement automated backups
- [ ] Test restore procedures regularly
- [ ] Use cross-region replication (S3, DynamoDB)
- [ ] Document runbooks for common failures
- [ ] Implement Infrastructure as Code (Terraform, CloudFormation)
- [ ] Version control all configuration
- [ ] Use immutable infrastructure
- [ ] Practice chaos engineering

---

## Quick Command Reference Card

### Most Used Commands
```bash
# Check what's running
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PrivateIpAddress]' --output table

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx --query 'SecurityGroups[*].IpPermissions'

# Check target health
aws elbv2 describe-target-health --target-group-arn <arn> --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' --output table

# DNS lookup
dig +short example.com

# Test HTTPS
curl -I https://example.com

# Check logs
aws logs tail /aws/lambda/my-function --follow

# Terraform workflow
terraform init && terraform plan && terraform apply
```

---

**Previous Module**: [07_HANDS_ON_EXERCISES.md](07_HANDS_ON_EXERCISES.md)  
**Back to Overview**: [00_OVERVIEW.md](00_OVERVIEW.md)
