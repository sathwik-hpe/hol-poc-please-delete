# AWS Networking Deep Dive 🌐

## Critical for Fidelity Cloud Network Team

This is **YOUR CORE RESPONSIBILITY** at Fidelity. Master these concepts!

---

## 1. VPC Architecture

### CIDR Planning

```
VPC: 10.0.0.0/16 (65,536 IPs)
├── Public Subnets (DMZ)
│   ├── 10.0.1.0/24 (us-east-1a) - 251 usable IPs
│   ├── 10.0.2.0/24 (us-east-1b)
│   └── 10.0.3.0/24 (us-east-1c)
└── Private Subnets (Internal)
    ├── 10.0.11.0/24 (us-east-1a)
    ├── 10.0.12.0/24 (us-east-1b)
    └── 10.0.13.0/24 (us-east-1c)

AWS reserves 5 IPs per subnet:
- .0: Network address
- .1: VPC router
- .2: DNS server
- .3: Future use
- .255: Broadcast (not used in VPC but reserved)
```

---

## 2. Routing Deep Dive

### Route Table Priority (Longest Prefix Match)

```
Route Table:
Priority | Destination    | Target      | Explanation
---------|----------------|-------------|------------------
1st      | 10.0.1.50/32  | eni-123     | Most specific (/32)
2nd      | 10.0.1.0/24   | local       | Subnet route
3rd      | 10.0.0.0/16   | local       | VPC route
4th      | 0.0.0.0/0     | igw-456     | Default route

Packet to 10.0.1.50 → Matches /32 first (wins!)
Packet to 10.0.1.100 → Matches /24 (local)
Packet to 8.8.8.8 → Matches 0.0.0.0/0 (internet)
```

### Public vs Private Routing

**Public Subnet Route Table:**
```
Destination       Target
10.0.0.0/16      local      # VPC internal
0.0.0.0/0        igw-xxx    # Internet via IGW
```

**Private Subnet Route Table:**
```
Destination       Target
10.0.0.0/16      local      # VPC internal
0.0.0.0/0        nat-xxx    # Internet via NAT Gateway
```

---

## 3. Security Groups vs NACLs

### Security Groups (Stateful Firewall)

```python
# Example: Web server security group
{
    "Ingress": [
        {
            "Protocol": "tcp",
            "Port": 443,
            "Source": "0.0.0.0/0",  # HTTPS from anywhere
            "Description": "Allow HTTPS traffic"
        },
        {
            "Protocol": "tcp",
            "Port": 80,
            "Source": "0.0.0.0/0",  # HTTP from anywhere
            "Description": "Allow HTTP traffic"
        },
        {
            "Protocol": "tcp",
            "Port": 22,
            "Source": "sg-bastion-123",  # SSH from bastion only
            "Description": "SSH from bastion host"
        }
    ],
    "Egress": [
        {
            "Protocol": "-1",  # All protocols
            "Destination": "0.0.0.0/0",  # Allow all outbound (default)
            "Description": "Allow all outbound traffic"
        }
    ]
}

# Stateful: Return traffic automatically allowed!
# If inbound HTTPS (443) is allowed, response goes out automatically
```

### NACLs (Stateless Firewall)

```python
# Network ACL (stateless - must allow both directions)
{
    "Inbound Rules": [
        {
            "Rule": 100,
            "Protocol": "tcp",
            "Port": 443,
            "Source": "0.0.0.0/0",
            "Action": "ALLOW"
        },
        {
            "Rule": 110,
            "Protocol": "tcp",
            "Port": 1024-65535,  # Ephemeral ports for return traffic!
            "Source": "0.0.0.0/0",
            "Action": "ALLOW"
        },
        {
            "Rule": "*",  # Default deny
            "Action": "DENY"
        }
    ],
    "Outbound Rules": [
        {
            "Rule": 100,
            "Protocol": "tcp",
            "Port": 1024-65535,  # Response goes back on ephemeral port
            "Destination": "0.0.0.0/0",
            "Action": "ALLOW"
        },
        {
            "Rule": "*",
            "Action": "DENY"
        }
    ]
}
```

**Interview Tip**: NACLs are stateless! Must explicitly allow return traffic on ephemeral ports (1024-65535).

---

## 4. VPC Connectivity

### VPC Peering

```
VPC-A (10.0.0.0/16) <---Peering---> VPC-B (10.1.0.0/16)

Route Table in VPC-A:
Destination       Target
10.0.0.0/16      local
10.1.0.0/16      pcx-123456   # Peering connection
```

**Limitations**:
- Non-transitive (A→B→C doesn't work, need A→C peering)
- No overlapping CIDRs
- DNS resolution requires enabling settings

### Transit Gateway (Solves Transitive Routing)

```
         Transit Gateway
              /|\
             / | \
            /  |  \
         VPC-A VPC-B VPC-C

All VPCs route to TGW (acts as hub)
Transitive routing works!
```

---

## 5. Load Balancers

### Application Load Balancer (Layer 7)

```
Internet → ALB → Target Group (EC2 instances)

Features:
- HTTP/HTTPS routing
- Host-based routing (api.example.com → API servers)
- Path-based routing (/api/* → API, /images/* → CDN)
- SSL/TLS termination
- WebSocket support
```

**Python Example: Health Check**
```python
# Register targets with ALB
response = elbv2_client.register_targets(
    TargetGroupArn='arn:aws:elasticloadbalancing:...',
    Targets=[
        {'Id': 'i-1234567890abcdef0', 'Port': 80},
        {'Id': 'i-abcdef1234567890', 'Port': 80}
    ]
)

# Configure health check
elbv2_client.modify_target_group(
    TargetGroupArn='arn:...',
    HealthCheckProtocol='HTTP',
    HealthCheckPath='/health',
    HealthCheckIntervalSeconds=30,
    HealthyThresholdCount=2,
    UnhealthyThresholdCount=2
)
```

### Network Load Balancer (Layer 4)

```
Features:
- TCP/UDP/TLS
- Ultra-high performance (millions of requests/sec)
- Static IP support
- Preserves source IP
```

---

## 6. Route 53 (DNS)

### Routing Policies

```python
# 1. Simple Routing: Single resource
example.com → 54.123.45.67

# 2. Weighted Routing: Traffic distribution
example.com → 70% to ALB-1, 30% to ALB-2

# 3. Latency-based: Route to lowest latency region
example.com → 
  - User in US → us-east-1
  - User in EU → eu-west-1

# 4. Failover: Primary/Secondary
example.com → 
  - Primary: us-east-1 ALB (healthy)
  - Secondary: us-west-2 ALB (standby)

# 5. Geolocation: Based on user location
example.com → 
  - North America → us-east-1
  - Europe → eu-west-1
  - Asia → ap-southeast-1
```

---

## 7. VPN and Direct Connect

### Site-to-Site VPN

```
On-Premises Network ←--IPsec VPN--→ AWS VPC
(Corporate DC)                      (Virtual Private Gateway)

Bandwidth: Up to 1.25 Gbps per tunnel
Latency: Internet-dependent
Cost: Low (data transfer charges only)
Setup: Minutes to hours
```

### Direct Connect

```
On-Premises ←--Dedicated Fiber--→ AWS Direct Connect Location → AWS VPC

Bandwidth: 1 Gbps to 100 Gbps
Latency: Consistent, low latency
Cost: Higher (port hours + data transfer)
Setup: Weeks to months
Use case: High bandwidth, predictable performance
```

---

## 8. Troubleshooting Scenarios (Interview!)

### Scenario 1: EC2 Can't Access Internet

**Checklist**:
1. ✅ Instance in public subnet?
2. ✅ Public IP or Elastic IP attached?
3. ✅ Route table has 0.0.0.0/0 → IGW?
4. ✅ Security group allows outbound?
5. ✅ NACL allows outbound + return traffic (ephemeral ports)?

### Scenario 2: Can't SSH to EC2

```python
# Debug with boto3
def debug_ssh_access(instance_id):
    """
    Check why SSH isn't working
    """
    ec2 = boto3.client('ec2')
    
    # Get instance details
    response = ec2.describe_instances(InstanceIds=[instance_id])
    instance = response['Reservations'][0]['Instances'][0]
    
    checks = []
    
    # Check 1: Instance running?
    if instance['State']['Name'] != 'running':
        checks.append(f"❌ Instance not running: {instance['State']['Name']}")
    else:
        checks.append("✅ Instance is running")
    
    # Check 2: Has public IP?
    if 'PublicIpAddress' not in instance:
        checks.append("❌ No public IP address")
    else:
        checks.append(f"✅ Public IP: {instance['PublicIpAddress']}")
    
    # Check 3: Security group allows SSH (port 22)?
    sg_ids = [sg['GroupId'] for sg in instance['SecurityGroups']]
    sgs = ec2.describe_security_groups(GroupIds=sg_ids)
    
    ssh_allowed = False
    for sg in sgs['SecurityGroups']:
        for rule in sg['IpPermissions']:
            if rule.get('FromPort') == 22 and rule.get('ToPort') == 22:
                ssh_allowed = True
                break
    
    if ssh_allowed:
        checks.append("✅ Security group allows SSH")
    else:
        checks.append("❌ Security group blocks SSH (port 22)")
    
    # Check 4: Key pair configured?
    if 'KeyName' not in instance:
        checks.append("❌ No key pair configured")
    else:
        checks.append(f"✅ Key pair: {instance['KeyName']}")
    
    return "\n".join(checks)

# Usage
print(debug_ssh_access('i-1234567890abcdef0'))
```

---

## 9. Interview Questions

**Q: Explain the packet flow from EC2 to internet**
```
1. EC2 instance (10.0.1.50) sends packet to 8.8.8.8
2. Checks security group (outbound allowed?)
3. Checks subnet route table: 0.0.0.0/0 → IGW
4. Packet goes to Internet Gateway
5. IGW performs NAT: 10.0.1.50 → Public IP (52.1.2.3)
6. Packet routed to 8.8.8.8
7. Response comes back: 8.8.8.8 → 52.1.2.3
8. IGW translates: 52.1.2.3 → 10.0.1.50
9. Security group allows response (stateful!)
10. Packet delivered to EC2
```

**Q: How does NAT Gateway differ from Internet Gateway?**
```
Internet Gateway (IGW):
- Bidirectional (inbound + outbound)
- 1:1 NAT (public IP mapped to private IP)
- No cost
- For public subnets

NAT Gateway:
- Outbound only (private → internet)
- Many:1 NAT (many private IPs → 1 Elastic IP)
- $0.045/hour + data charges
- For private subnets
- Stateful (allows return traffic)
```

---

## Key Takeaways

✅ **Routing**: Longest prefix match wins  
✅ **Security Groups**: Stateful (return traffic automatic)  
✅ **NACLs**: Stateless (must allow ephemeral ports)  
✅ **HA Design**: Multi-AZ (3 AZs, NAT Gateway per AZ)  
✅ **Troubleshooting**: Systematic checklist (instance → SG → route table → NACL → IGW)  

**Your HPE Advantage**: Platform infrastructure, VPC experience - connect this!

**Next**: Azure Networking Fundamentals
