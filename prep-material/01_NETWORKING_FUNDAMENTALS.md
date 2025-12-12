# Networking Fundamentals for Cloud Developers

## 📋 Table of Contents

1. [Overview](#overview)
2. [IP Routing](#ip-routing)
3. [Firewalls](#firewalls)
4. [Load Balancers](#load-balancers)
5. [Web Proxies](#web-proxies)
6. [DNS (Domain Name System)](#dns-domain-name-system)
7. [Interview Questions & Answers](#interview-questions--answers)
8. [Hands-On Exercises](#hands-on-exercises)
9. [Quick Reference](#quick-reference)

---

## Overview

This guide covers essential networking fundamentals for **Senior Cloud Developer** roles, with focus on cloud networking, SDN, and modern infrastructure patterns.

### Learning Objectives
- Master core networking concepts: routing, firewalls, load balancing, proxies, DNS
- Understand cloud-native networking implementations (AWS, Azure, GCP)
- Apply networking knowledge to software-defined networking (SDN)
- Troubleshoot network issues in cloud environments
- Design scalable, secure network architectures

### Prerequisites
- Basic understanding of OSI model
- Familiarity with TCP/IP
- Basic Linux networking commands

---

## IP Routing

### What is IP Routing?

**IP Routing** is the process of moving packets from source to destination across networks. Routers examine destination IP addresses and decide the best path based on routing tables.

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │────────▶│   Router    │────────▶│   Server    │
│ 10.0.1.10   │         │  (Gateway)  │         │ 192.168.1.5 │
└─────────────┘         └─────────────┘         └─────────────┘
                             ▲
                             │
                     Routing Decision
                     Based on Routing Table
```

### Routing Tables

A **routing table** contains rules that determine where packets should be forwarded.

**Example Routing Table:**
```
Destination     Gateway         Genmask         Flags   Interface
0.0.0.0         10.0.1.1        0.0.0.0         UG      eth0      (Default route)
10.0.1.0        0.0.0.0         255.255.255.0   U       eth0      (Local network)
192.168.1.0     10.0.1.254      255.255.255.0   UG      eth0      (Remote network)
```

**Key Components:**
- **Destination**: Target network or host
- **Gateway**: Next hop router (0.0.0.0 means directly connected)
- **Genmask**: Subnet mask defining network size
- **Interface**: Network interface to use

**View routing table:**
```bash
# Linux
ip route show
route -n

# macOS
netstat -rn

# Windows
route print
```

### Static vs Dynamic Routing

#### Static Routing

**Definition:** Routes manually configured by network administrators.

**Pros:**
- Predictable and secure
- No routing protocol overhead
- Simple for small networks

**Cons:**
- Not scalable for large networks
- Manual updates required for topology changes
- No automatic failover

**Use Cases:**
- Small office networks
- Stub networks (networks with single exit point)
- Security-sensitive environments

**Example Configuration:**
```bash
# Linux - Add static route
ip route add 192.168.2.0/24 via 10.0.1.254

# AWS VPC Route Table (static)
Destination     Target
10.0.0.0/16     local
0.0.0.0/0       igw-xxxxx (Internet Gateway)
192.168.1.0/24  vgw-xxxxx (VPN Gateway)
```

#### Dynamic Routing

**Definition:** Routes automatically discovered and updated using routing protocols.

**Pros:**
- Automatically adapts to network changes
- Scalable for large networks
- Automatic failover and load balancing
- Reduced administrative overhead

**Cons:**
- More complex configuration
- Requires routing protocol overhead (bandwidth, CPU)
- Potential security risks if not properly secured

**Use Cases:**
- Large enterprise networks
- Service provider networks
- Multi-site cloud deployments

### Routing Protocols

#### 1. BGP (Border Gateway Protocol)

**Type:** Exterior Gateway Protocol (EGP), Path Vector Protocol

**Purpose:** Route traffic between autonomous systems (AS) on the internet.

**Key Characteristics:**
- **Policy-based routing**: Allows fine-grained control over routing decisions
- **Scalability**: Handles internet-scale routing (900,000+ routes)
- **Path attributes**: Uses AS_PATH, LOCAL_PREF, MED for path selection

**How BGP Works:**
```
AS 65001 (ISP-1)          AS 65002 (ISP-2)
     │                         │
     │   BGP Peering          │
     └─────────────────────────┘
              │
         BGP Session
    (Exchanges routing updates)
```

**BGP Route Selection Process:**
1. Highest LOCAL_PREF (prefer routes from specific peers)
2. Shortest AS_PATH (fewest hops between AS)
3. Lowest ORIGIN type (IGP > EGP > Incomplete)
4. Lowest MED (Multi-Exit Discriminator)
5. eBGP over iBGP
6. Lowest IGP metric to BGP next hop

**Cloud Usage:**
- **AWS**: VPN connections use BGP for route propagation
- **Azure**: ExpressRoute uses BGP for hybrid connectivity
- **GCP**: Cloud Router uses BGP for dynamic routing

**Example - AWS Transit Gateway with BGP:**
```hcl
# Terraform example
resource "aws_ec2_transit_gateway" "main" {
  amazon_side_asn = 64512
  
  tags = {
    Name = "main-tgw"
  }
}

resource "aws_customer_gateway" "on_prem" {
  bgp_asn    = 65000
  ip_address = "203.0.113.5"
  type       = "ipsec.1"
}
```

#### 2. OSPF (Open Shortest Path First)

**Type:** Interior Gateway Protocol (IGP), Link-State Protocol

**Purpose:** Route traffic within an autonomous system.

**Key Characteristics:**
- **Fast convergence**: Quickly adapts to topology changes
- **Area hierarchy**: Divides network into areas for scalability
- **Cost-based routing**: Uses link cost (bandwidth) for path selection

**OSPF Areas:**
```
         ┌─────────────────────────┐
         │   Backbone Area 0       │
         │   (All ABRs connect)    │
         └────┬─────────────┬──────┘
              │             │
    ┌─────────▼───┐   ┌────▼──────────┐
    │  Area 1     │   │  Area 2       │
    │  (Regular)  │   │  (Regular)    │
    └─────────────┘   └───────────────┘
```

**OSPF Metrics:**
- **Cost**: 100 Mbps / interface bandwidth
- Example: 100 Mbps interface = cost 1, 10 Mbps = cost 10

**OSPF Packet Types:**
1. **Hello**: Discovers neighbors, maintains adjacencies
2. **DBD (Database Description)**: Summarizes LSDB
3. **LSR (Link-State Request)**: Requests specific LSAs
4. **LSU (Link-State Update)**: Contains LSAs
5. **LSAck**: Acknowledges LSUs

**Cloud Usage:**
- Less common in public clouds (BGP preferred)
- Used in enterprise on-premises networks
- Some SD-WAN solutions support OSPF

#### 3. EIGRP (Enhanced Interior Gateway Routing Protocol)

**Type:** Interior Gateway Protocol, Hybrid (Distance Vector + Link State)

**Key Characteristics:**
- Cisco proprietary (open standard since 2013)
- Fast convergence with DUAL algorithm
- Supports unequal cost load balancing

**Not commonly used in modern cloud environments** - included for completeness.

### Cloud Routing Concepts

#### VPC Peering (AWS Example)

**Definition:** Direct network connection between two VPCs.

**Characteristics:**
- **Non-transitive**: If VPC A peers with VPC B, and VPC B peers with VPC C, VPC A cannot reach VPC C through VPC B
- **Same or different AWS accounts**
- **Same or different regions** (inter-region peering)

```
     VPC A                  VPC B
  10.0.0.0/16    ←→      10.1.0.0/16
       │                     │
       └───── Peering ───────┘
     
Route Tables:
VPC A: 10.1.0.0/16 → pcx-xxxxx
VPC B: 10.0.0.0/16 → pcx-xxxxx
```

**Terraform Example:**
```hcl
resource "aws_vpc_peering_connection" "peer" {
  vpc_id        = aws_vpc.main.id
  peer_vpc_id   = aws_vpc.secondary.id
  auto_accept   = true

  tags = {
    Name = "VPC Peering between main and secondary"
  }
}

resource "aws_route" "main_to_secondary" {
  route_table_id            = aws_route_table.main.id
  destination_cidr_block    = "10.1.0.0/16"
  vpc_peering_connection_id = aws_vpc_peering_connection.peer.id
}
```

#### Transit Gateway (AWS)

**Definition:** Regional network hub that connects VPCs, VPNs, and Direct Connect.

**Benefits:**
- **Transitive routing**: Simplifies network topology
- **Centralized management**: Single point of control
- **Scalability**: Supports thousands of VPCs
- **Inter-region peering**: Connect transit gateways across regions

```
              Transit Gateway
                    │
        ┌───────────┼───────────┬──────────┐
        │           │           │          │
      VPC A       VPC B       VPC C     VPN Gateway
    10.0.0.0/16  10.1.0.0/16  10.2.0.0/16  (On-Prem)
```

**Key Features:**
- Route tables per attachment
- Multicast support
- VPN ECMP (Equal Cost Multi-Path)
- Network segmentation via route tables

**Use Case - Hub and Spoke:**
```
On-Premises Network
        │
        │ VPN/Direct Connect
        ▼
  Transit Gateway ──────┐
        │               │
    ┌───┴────┬──────────┼──────────┐
    │        │          │          │
  VPC A    VPC B      VPC C      VPC D
(Shared  (Prod)    (Dev)      (Test)
Services)
```

#### Azure VNet Peering & VPN Gateway

**VNet Peering:**
- Similar to AWS VPC peering
- Low latency, high bandwidth
- Global VNet peering across regions

**Azure Virtual WAN:**
- Azure's equivalent to AWS Transit Gateway
- Hub-and-spoke architecture
- Integrated with ExpressRoute and VPN

#### GCP VPC Network & Shared VPC

**GCP VPC:**
- **Global by default**: Subnets are regional, but VPC spans all regions
- **No VPC peering needed** within same VPC across regions
- **Shared VPC**: Central IT manages VPC, projects use subnets

```
        GCP VPC (Global)
              │
    ┌─────────┼─────────┬─────────┐
    │         │         │         │
Subnet-US  Subnet-EU Subnet-ASIA Subnet-AUS
us-west1   europe-w1  asia-se1   aus-se1
```

### Routing Best Practices

1. **Use CIDR notation properly**: Avoid overlapping IP ranges
2. **Implement route aggregation**: Reduce routing table size
3. **Document route tables**: Maintain clear documentation
4. **Use tags/labels**: Organize cloud routes with metadata
5. **Monitor route propagation**: Ensure BGP routes are learned correctly
6. **Implement route filtering**: Prevent route leaks and loops
7. **Plan for growth**: Reserve IP space for future expansion
8. **Use Transit Gateway/Virtual WAN**: For complex topologies
9. **Test failover scenarios**: Ensure redundant paths work
10. **Automate with IaC**: Use Terraform/CloudFormation for consistency

### Common Routing Issues & Troubleshooting

#### Issue 1: Asymmetric Routing

**Problem:** Traffic flows one path forward, different path return.

**Symptoms:**
- Connection timeouts
- Firewall drops packets (stateful firewalls expect symmetry)

**Solution:**
```bash
# Verify traffic paths
traceroute destination_ip
mtr destination_ip  # Better than traceroute

# Check routing table
ip route get destination_ip
```

#### Issue 2: Route Propagation Delays

**Problem:** BGP routes not updating quickly enough.

**Diagnosis:**
```bash
# AWS CLI - Check Transit Gateway route tables
aws ec2 describe-transit-gateway-route-tables

# Check BGP neighbor status
show ip bgp summary  # Cisco
show bgp neighbor    # View BGP session details
```

#### Issue 3: Overlapping CIDR Blocks

**Problem:** Cannot peer VPCs with overlapping IPs.

**Prevention:**
- Plan IP addressing scheme upfront
- Use RFC 1918 ranges strategically:
  - 10.0.0.0/8 (largest)
  - 172.16.0.0/12
  - 192.168.0.0/16

**Example Scheme:**
```
AWS Account 1:
  Dev VPCs:     10.0.0.0/16, 10.1.0.0/16, ...
  Prod VPCs:    10.100.0.0/16, 10.101.0.0/16, ...

Azure Subscription:
  VNets:        172.16.0.0/16, 172.17.0.0/16, ...

GCP Project:
  VPC:          192.168.0.0/16 (subnets carved out)
```

### Routing Performance Metrics

**Key Metrics to Monitor:**
- **Latency**: Round-trip time between endpoints
- **Packet loss**: Percentage of dropped packets
- **Throughput**: Data transfer rate
- **Route convergence time**: Time to adapt to topology changes

**Tools:**
```bash
# Measure latency
ping -c 10 destination_ip

# Measure throughput
iperf3 -c destination_ip

# Monitor packet loss
mtr --report destination_ip

# AWS CloudWatch metrics
- BytesIn/BytesOut on Transit Gateway
- VPN tunnel status
```

---

## Firewalls

### What is a Firewall?

A **firewall** is a network security device/software that monitors and controls incoming and outgoing network traffic based on predefined security rules.

**Purpose:**
- Block unauthorized access
- Allow legitimate traffic
- Log security events
- Prevent attacks (DDoS, port scanning, etc.)

```
Internet                 Firewall                Internal Network
   │                        │                          │
   │──── Request ──────────▶│                          │
   │                        │◄── Rules Check           │
   │                        │    Allow/Deny            │
   │                        │─── Allowed Request ─────▶│
   │                        │                          │
   │◄─── Response ──────────│◄─── Response ────────────│
```

### Stateful vs Stateless Firewalls

#### Stateless Firewalls

**Definition:** Examines each packet independently without considering connection state.

**Characteristics:**
- **Fast**: No state tracking overhead
- **Simple**: Rule-based filtering only
- **No context**: Each packet judged in isolation

**How it works:**
```
Packet arrives → Check rules → Allow/Deny
(No memory of previous packets)
```

**Example Rules:**
```
Rule 1: Allow TCP from 10.0.0.0/16 to any port 80
Rule 2: Allow TCP from any to 10.0.0.0/16 port 1024-65535
Rule 3: Deny all other traffic
```

**Problem:** Must explicitly allow return traffic (Rule 2 above).

**Use Cases:**
- High-speed packet filtering
- Border routers
- Simple traffic filtering

#### Stateful Firewalls

**Definition:** Tracks the state of network connections and makes decisions based on connection context.

**Characteristics:**
- **Intelligent**: Understands connection state
- **Automatic return traffic**: Allows responses to outbound connections
- **More secure**: Prevents many attacks

**Connection States:**
1. **NEW**: First packet of new connection
2. **ESTABLISHED**: Part of existing connection
3. **RELATED**: New connection related to existing (e.g., FTP data channel)
4. **INVALID**: Packet doesn't match any known connection

**How it works:**
```
Outbound packet → Track connection → Add to state table
Inbound packet  → Check state table → Auto-allow if related
```

**Example Rule (simpler):**
```
Rule 1: Allow outbound TCP from 10.0.0.0/16 to any port 80
(Return traffic automatically allowed)
```

**State Table Example:**
```
Source IP:Port    Dest IP:Port      State        Protocol
10.0.1.5:51234 ──▶ 1.2.3.4:443     ESTABLISHED   TCP
10.0.1.5:51235 ──▶ 8.8.8.8:53      ESTABLISHED   UDP
10.0.1.6:51236 ──▶ 93.184.216.34:80 NEW        TCP
```

**Use Cases:**
- Enterprise firewalls
- Cloud security groups (AWS, Azure)
- Next-generation firewalls (NGFW)

### Cloud Firewall Implementations

#### AWS Security Groups (Stateful)

**Definition:** Virtual firewall for EC2 instances and other AWS resources.

**Key Characteristics:**
- **Stateful**: Return traffic automatically allowed
- **Allow rules only**: Cannot create deny rules
- **Instance-level**: Applied to ENI (Elastic Network Interface)
- **All rules evaluated**: No rule order

**Example Security Group:**
```hcl
resource "aws_security_group" "web_server" {
  name        = "web-server-sg"
  description = "Allow HTTP/HTTPS inbound, all outbound"
  vpc_id      = aws_vpc.main.id

  # Inbound rules
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description     = "SSH from bastion only"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  # Outbound rules
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"  # All protocols
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-server-sg"
  }
}
```

**Best Practices:**
- Use descriptive names and descriptions
- Reference other security groups instead of IPs when possible
- Limit 0.0.0.0/0 access to necessary ports only
- Use separate security groups for different tiers (web, app, db)

#### AWS Network ACLs (Stateless)

**Definition:** Subnet-level firewall in AWS VPC.

**Key Characteristics:**
- **Stateless**: Must explicitly allow return traffic
- **Allow and deny rules**: Can create explicit deny rules
- **Subnet-level**: Applied to entire subnet
- **Rule order matters**: Evaluated in numerical order
- **Default NACL**: Allows all traffic

**NACL vs Security Group:**

| Feature | Security Group | Network ACL |
|---------|---------------|-------------|
| Level | Instance (ENI) | Subnet |
| State | Stateful | Stateless |
| Rules | Allow only | Allow + Deny |
| Order | All evaluated | Numerical order |
| Default | Deny all inbound | Allow all |

**Example NACL:**
```hcl
resource "aws_network_acl" "main" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = [aws_subnet.public.id]

  # Allow inbound HTTP
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow inbound HTTPS
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow return traffic (ephemeral ports)
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Deny specific IP
  ingress {
    protocol   = "-1"
    rule_no    = 50
    action     = "deny"
    cidr_block = "198.51.100.0/24"
    from_port  = 0
    to_port    = 0
  }

  # Allow all outbound
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "main-nacl"
  }
}
```

**Use Cases for NACLs:**
- Block specific IP addresses (blacklisting)
- Additional subnet-level security
- Explicit deny rules
- Compliance requirements

#### Azure Network Security Groups (NSG)

**Definition:** Similar to AWS Security Groups, controls traffic to Azure resources.

**Key Features:**
- **Stateful**: Return traffic handled automatically
- **Priority-based**: Rules have priority (100-4096, lower = higher priority)
- **Default rules**: Cannot be deleted, lowest priority
- **Service tags**: Use Azure service names instead of IPs

**Example NSG (Azure CLI):**
```bash
# Create NSG
az network nsg create \
  --resource-group myRG \
  --name web-nsg

# Add rule for HTTP
az network nsg rule create \
  --resource-group myRG \
  --nsg-name web-nsg \
  --name allow-http \
  --priority 100 \
  --source-address-prefixes '*' \
  --source-port-ranges '*' \
  --destination-address-prefixes '*' \
  --destination-port-ranges 80 \
  --access Allow \
  --protocol Tcp \
  --direction Inbound

# Add rule using service tag
az network nsg rule create \
  --resource-group myRG \
  --nsg-name web-nsg \
  --name allow-from-lb \
  --priority 110 \
  --source-address-prefixes 'AzureLoadBalancer' \
  --destination-port-ranges 80 443 \
  --access Allow \
  --protocol Tcp \
  --direction Inbound
```

**Azure Service Tags:**
- `VirtualNetwork`: All VNet address spaces
- `AzureLoadBalancer`: Azure Load Balancer IPs
- `Internet`: Public internet
- `Storage`: Azure Storage service IPs
- `Sql`: Azure SQL Database IPs

#### GCP Firewall Rules

**Definition:** VPC firewall rules control traffic to/from VM instances.

**Key Features:**
- **Stateful**: Connection tracking enabled
- **Implied rules**: Default deny ingress, allow egress
- **Priority-based**: 0-65535 (lower = higher priority)
- **Target selection**: By tags, service accounts, or all instances

**Example GCP Firewall (Terraform):**
```hcl
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
  
  priority = 1000
}

resource "google_compute_firewall" "allow_ssh_from_iap" {
  name    = "allow-ssh-iap"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Identity-Aware Proxy IP range
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["allow-iap-ssh"]
  
  priority = 1000
}
```

**GCP Firewall Hierarchy:**
```
Organization Firewall Policies (highest priority)
         │
Folder Firewall Policies
         │
VPC Firewall Rules
         │
Implied deny ingress / allow egress (lowest priority)
```

### Web Application Firewall (WAF)

**Definition:** Layer 7 firewall that inspects HTTP/HTTPS traffic for web-specific attacks.

**Protection Against:**
- SQL injection
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- DDoS attacks
- Bot traffic
- OWASP Top 10 vulnerabilities

**WAF Architecture:**
```
Client ──▶ WAF ──▶ Load Balancer ──▶ Web Servers
            │
            └─ Inspects HTTP requests
               - Headers, cookies, query strings
               - Request body (POST data)
               - Applies rules/signatures
```

#### AWS WAF

**Key Features:**
- Integrates with CloudFront, ALB, API Gateway
- Managed rule groups (AWS + third-party)
- Custom rules with conditions
- Rate limiting
- IP reputation lists

**Example AWS WAF (Terraform):**
```hcl
resource "aws_wafv2_web_acl" "main" {
  name  = "web-acl"
  scope = "REGIONAL"  # or "CLOUDFRONT"

  default_action {
    allow {}
  }

  # AWS Managed Rules - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000  # requests per 5 minutes
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # Block specific geo locations
  rule {
    name     = "GeoBlockRule"
    priority = 3

    action {
      block {}
    }

    statement {
      geo_match_statement {
        country_codes = ["KP", "IR"]  # North Korea, Iran
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlockRule"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "WebACL"
    sampled_requests_enabled   = true
  }
}

# Associate with ALB
resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
```

#### Azure Web Application Firewall

**Deployment Options:**
- Azure Application Gateway WAF
- Azure Front Door WAF
- Azure CDN WAF

**Rule Sets:**
- OWASP ModSecurity CRS
- Microsoft Bot Manager rules
- Custom rules

#### GCP Cloud Armor

**Definition:** GCP's DDoS protection and WAF service.

**Features:**
- Layer 3-7 DDoS protection
- Pre-configured WAF rules (OWASP Top 10)
- Custom rules with conditions
- Adaptive protection (ML-based)

### Firewall Best Practices

1. **Principle of Least Privilege**: Only allow necessary traffic
2. **Defense in Depth**: Use multiple firewall layers (NACL + SG, WAF + SG)
3. **Document rules**: Add descriptions to all firewall rules
4. **Regular audits**: Review rules quarterly, remove unused rules
5. **Use tags/labels**: Organize rules for easy management
6. **Avoid 0.0.0.0/0**: Restrict source IPs when possible
7. **Monitor logs**: Enable logging and set up alerts
8. **Test changes**: Use staging environment before production
9. **Automate with IaC**: Version control firewall configurations
10. **Implement WAF**: Protect web applications from Layer 7 attacks

### Common Firewall Misconfigurations

#### 1. Overly Permissive Rules

**Problem:**
```hcl
# BAD: Allows SSH from anywhere
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]  # ❌ Security risk
}
```

**Solution:**
```hcl
# GOOD: Restrict SSH to specific IPs
ingress {
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["203.0.113.0/24"]  # ✅ Office IP range
}

# BETTER: Use bastion host
ingress {
  from_port       = 22
  to_port         = 22
  protocol        = "tcp"
  security_groups = [aws_security_group.bastion.id]  # ✅ Reference SG
}
```

#### 2. Forgotten Ephemeral Ports (NACLs)

**Problem:**
```hcl
# Allows outbound but forgets return traffic on ephemeral ports
# Result: Connections fail
egress {
  rule_no    = 100
  protocol   = "tcp"
  cidr_block = "0.0.0.0/0"
  from_port  = 443
  to_port    = 443
  action     = "allow"
}
# Missing: Ingress rule for ports 1024-65535
```

**Solution:**
```hcl
# Allow return traffic on ephemeral ports
ingress {
  rule_no    = 100
  protocol   = "tcp"
  cidr_block = "0.0.0.0/0"
  from_port  = 1024
  to_port    = 65535
  action     = "allow"
}
```

#### 3. Rule Ordering Issues (NACLs, Azure NSG)

**Problem:**
```hcl
# Rule 100: Allow all
# Rule 200: Deny specific IP
# Result: Specific IP is never denied (Rule 100 matches first)
```

**Solution:** Place more specific rules with lower numbers (higher priority).

### Firewall Troubleshooting

**Common Tools:**
```bash
# Test connectivity
telnet host port
nc -zv host port
curl -v https://host

# Trace route
traceroute host
mtr host

# Check firewall logs (Linux)
sudo iptables -L -v -n
sudo tail -f /var/log/ufw.log

# AWS - Check flow logs
aws ec2 describe-flow-logs
# Enable VPC Flow Logs for traffic analysis

# Azure - NSG flow logs
az network watcher flow-log show \
  --resource-group myRG \
  --nsg myNSG
```

**Troubleshooting Steps:**
1. **Verify route**: Ensure route exists to destination
2. **Check security groups**: Verify allow rules exist
3. **Check NACLs**: Verify subnet-level rules (if applicable)
4. **Check local firewall**: iptables/firewalld on instance
5. **Check application**: Ensure service is listening
6. **Review logs**: Check VPC flow logs, WAF logs

---

## Load Balancers

### What is a Load Balancer?

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

### Layer 4 vs Layer 7 Load Balancers

#### Layer 4 Load Balancer (Transport Layer)

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

#### Layer 7 Load Balancer (Application Layer)

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

**Comparison Table:**

| Feature | Layer 4 | Layer 7 |
|---------|---------|---------|
| **OSI Layer** | Transport | Application |
| **Performance** | Very fast | Slower (content inspection) |
| **Routing** | IP:Port only | Content-based |
| **SSL Termination** | TCP passthrough | Yes, can decrypt |
| **Protocol Support** | Any TCP/UDP | HTTP/HTTPS/WebSocket |
| **Cost** | Lower | Higher |
| **Use Case** | Generic TCP/UDP | Web applications |

### Load Balancing Algorithms

#### 1. Round Robin

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

#### 2. Weighted Round Robin

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

#### 3. Least Connections

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

#### 4. Weighted Least Connections

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

#### 5. IP Hash (Source IP Affinity)

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

#### 6. Least Response Time

**Description:** Routes to server with lowest response time and fewest connections.

**Formula:**
```
Score = (Average Response Time × Active Connections)
Route to server with lowest score
```

**Best For:**
- Performance-critical applications
- Heterogeneous server environments

#### 7. Random

**Description:** Randomly selects a server for each request.

**Pros:**
- Simple implementation
- No state tracking needed

**Cons:**
- Unpredictable distribution
- May not balance evenly

**Use Case:** Simple deployments where any server can handle any request.

### Health Checks

**Definition:** Periodic checks to determine if backend servers are healthy and able to handle traffic.

**Types of Health Checks:**

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

**Health Check Parameters:**
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

### Cloud Load Balancer Implementations

#### AWS Load Balancers

##### Application Load Balancer (ALB) - Layer 7

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

##### Network Load Balancer (NLB) - Layer 4

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

##### Gateway Load Balancer (GWLB) - Layer 3

**Purpose:** Deploy, scale, and manage third-party virtual appliances (firewalls, IDS/IPS).

**Use Cases:**
- Network security appliances
- Traffic inspection
- Deep packet inspection

##### Classic Load Balancer (CLB) - Legacy

**Status:** Previous generation, not recommended for new applications.

**AWS Load Balancer Comparison:**

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

#### Azure Load Balancers

##### Azure Application Gateway - Layer 7

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

##### Azure Load Balancer - Layer 4

**Types:**
- **Public Load Balancer**: Distributes internet traffic
- **Internal Load Balancer**: Distributes traffic within VNet

**SKUs:**
- **Basic**: Free, limited features
- **Standard**: Advanced features, SLA, zone redundancy

##### Azure Traffic Manager - DNS-based

**Purpose:** Global load balancing and failover using DNS.

**Routing Methods:**
- Priority (failover)
- Weighted
- Performance (geo-based latency)
- Geographic
- Multivalue
- Subnet-based

#### GCP Load Balancers

##### Global HTTP(S) Load Balancer - Layer 7

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

##### Network Load Balancer - Layer 4

**Types:**
- **External TCP/UDP Load Balancer**: Regional, high performance
- **Internal TCP/UDP Load Balancer**: VPC-internal traffic

### Session Persistence (Sticky Sessions)

**Definition:** Ensures requests from same client go to same backend server.

**Methods:**

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

### Load Balancer Best Practices

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

### Troubleshooting Load Balancers

**Common Issues:**

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

**Monitoring Metrics:**
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

