# IP Routing

## Table of Contents
- [What is IP Routing?](#what-is-ip-routing)
- [Routing Tables](#routing-tables)
- [Static vs Dynamic Routing](#static-vs-dynamic-routing)
- [Routing Protocols](#routing-protocols)
- [Cloud Routing Concepts](#cloud-routing-concepts)
- [Best Practices](#routing-best-practices)
- [Troubleshooting](#common-routing-issues--troubleshooting)

---

## What is IP Routing?

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

## Routing Tables

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

## Static vs Dynamic Routing

### Static Routing

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

### Dynamic Routing

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

## Routing Protocols

### 1. BGP (Border Gateway Protocol)

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

### 2. OSPF (Open Shortest Path First)

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

### 3. EIGRP (Enhanced Interior Gateway Routing Protocol)

**Type:** Interior Gateway Protocol, Hybrid (Distance Vector + Link State)

**Key Characteristics:**
- Cisco proprietary (open standard since 2013)
- Fast convergence with DUAL algorithm
- Supports unequal cost load balancing

**Not commonly used in modern cloud environments** - included for completeness.

## Cloud Routing Concepts

### VPC Peering (AWS Example)

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

### Transit Gateway (AWS)

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

### Azure VNet Peering & VPN Gateway

**VNet Peering:**
- Similar to AWS VPC peering
- Low latency, high bandwidth
- Global VNet peering across regions

**Azure Virtual WAN:**
- Azure's equivalent to AWS Transit Gateway
- Hub-and-spoke architecture
- Integrated with ExpressRoute and VPN

### GCP VPC Network & Shared VPC

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

## Routing Best Practices

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

## Common Routing Issues & Troubleshooting

### Issue 1: Asymmetric Routing

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

### Issue 2: Route Propagation Delays

**Problem:** BGP routes not updating quickly enough.

**Diagnosis:**
```bash
# AWS CLI - Check Transit Gateway route tables
aws ec2 describe-transit-gateway-route-tables

# Check BGP neighbor status
show ip bgp summary  # Cisco
show bgp neighbor    # View BGP session details
```

### Issue 3: Overlapping CIDR Blocks

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

## Routing Performance Metrics

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

**Next Module**: [02_FIREWALLS.md](02_FIREWALLS.md)
