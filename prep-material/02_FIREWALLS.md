# Firewalls

## Table of Contents
- [What is a Firewall?](#what-is-a-firewall)
- [Stateful vs Stateless Firewalls](#stateful-vs-stateless-firewalls)
- [Cloud Firewall Implementations](#cloud-firewall-implementations)
- [Web Application Firewall (WAF)](#web-application-firewall-waf)
- [Best Practices](#firewall-best-practices)
- [Common Misconfigurations](#common-firewall-misconfigurations)
- [Troubleshooting](#firewall-troubleshooting)

---

## What is a Firewall?

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

## Stateful vs Stateless Firewalls

### Stateless Firewalls

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

### Stateful Firewalls

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

## Cloud Firewall Implementations

### AWS Security Groups (Stateful)

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

### AWS Network ACLs (Stateless)

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

### Azure Network Security Groups (NSG)

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

### GCP Firewall Rules

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

## Web Application Firewall (WAF)

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

### AWS WAF

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

### Azure Web Application Firewall

**Deployment Options:**
- Azure Application Gateway WAF
- Azure Front Door WAF
- Azure CDN WAF

**Rule Sets:**
- OWASP ModSecurity CRS
- Microsoft Bot Manager rules
- Custom rules

### GCP Cloud Armor

**Definition:** GCP's DDoS protection and WAF service.

**Features:**
- Layer 3-7 DDoS protection
- Pre-configured WAF rules (OWASP Top 10)
- Custom rules with conditions
- Adaptive protection (ML-based)

## Firewall Best Practices

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

## Common Firewall Misconfigurations

### 1. Overly Permissive Rules

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

### 2. Forgotten Ephemeral Ports (NACLs)

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

### 3. Rule Ordering Issues (NACLs, Azure NSG)

**Problem:**
```hcl
# Rule 100: Allow all
# Rule 200: Deny specific IP
# Result: Specific IP is never denied (Rule 100 matches first)
```

**Solution:** Place more specific rules with lower numbers (higher priority).

## Firewall Troubleshooting

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

**Previous Module**: [01_IP_ROUTING.md](01_IP_ROUTING.md)  
**Next Module**: [03_LOAD_BALANCERS.md](03_LOAD_BALANCERS.md)
