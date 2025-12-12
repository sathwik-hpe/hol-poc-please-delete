# Networking Fundamentals 🌐

## Critical for Cloud Network Team
Target Company requires **"understanding of IP routing, firewalls, load balancers, DNS"**

---

## 1. OSI Model & TCP/IP Stack

```
OSI Model               TCP/IP Model        Examples
-----------            --------------      ----------
7. Application    ┐                       HTTP, DNS, SSH
6. Presentation   ├─ Application         TLS/SSL, JSON
5. Session        ┘                       NetBIOS, RPC

4. Transport      ─── Transport          TCP, UDP
                                         Port numbers

3. Network        ─── Internet           IP, ICMP, IGMP
                                         Routing

2. Data Link      ┐                      Ethernet, Wi-Fi
1. Physical       └── Network Access     Cables, NIC
```

**Interview Tip**: Remember "Please Do Not Throw Sausage Pizza Away"

---

## 2. IP Addressing & Subnetting

### IPv4 Structure

```
32-bit address: 192.168.1.10
Binary: 11000000.10101000.00000001.00001010

Classes (historical):
Class A: 0.0.0.0    - 127.255.255.255   (8-bit  network)
Class B: 128.0.0.0  - 191.255.255.255   (16-bit network)
Class C: 192.0.0.0  - 223.255.255.255   (24-bit network)

Private Ranges (RFC 1918):
10.0.0.0/8        - 10.255.255.255      (16 million IPs)
172.16.0.0/12     - 172.31.255.255      (1 million IPs)
192.168.0.0/16    - 192.168.255.255     (65K IPs)
```

### CIDR Notation

```
10.0.0.0/16
        └── 16 network bits, 16 host bits
           
Total IPs: 2^(32-16) = 65,536
Usable IPs: 65,536 - 2 = 65,534  (minus network & broadcast)

Common CIDR Blocks:
/32 = 1 IP       (host route)
/31 = 2 IPs      (point-to-point)
/30 = 4 IPs      (2 usable - common for router links)
/29 = 8 IPs      (6 usable)
/28 = 16 IPs     (14 usable)
/27 = 32 IPs     (30 usable)
/26 = 64 IPs     (62 usable)
/25 = 128 IPs    (126 usable)
/24 = 256 IPs    (254 usable - typical subnet)
/16 = 65,536 IPs (65,534 usable - typical VPC)
/8  = 16.7M IPs  (Class A)
```

### Subnetting Example

```python
# Network: 10.0.0.0/16 → Split into /24 subnets

10.0.0.0/24    - Web Tier (10.0.0.1 - 10.0.0.254)
10.0.1.0/24    - App Tier
10.0.2.0/24    - DB Tier
10.0.3.0/24    - Management
...
10.0.255.0/24  - Last /24 subnet

# Python to calculate subnets
import ipaddress

network = ipaddress.ip_network('10.0.0.0/16')
subnets = list(network.subnets(new_prefix=24))

print(f"Total /24 subnets: {len(subnets)}")  # 256
print(f"First subnet: {subnets[0]}")         # 10.0.0.0/24
print(f"Last subnet: {subnets[-1]}")         # 10.0.255.0/24
```

---

## 3. Routing

### Static vs Dynamic Routing

**Static Routing:**
```
Router configuration:
ip route 10.1.0.0/16 via 192.168.1.1

Pros:
✅ Simple, predictable
✅ Low overhead
✅ Full control

Cons:
❌ No automatic failover
❌ Manual updates required
❌ Doesn't scale
```

**Dynamic Routing (BGP, OSPF):**
```
BGP (Border Gateway Protocol):
- Path-vector protocol
- Used between autonomous systems (internet backbone)
- AWS uses BGP for Direct Connect, VPN

OSPF (Open Shortest Path First):
- Link-state protocol
- Used within an organization
- Calculates shortest path

Example: AWS Transit Gateway uses BGP
```

### Longest Prefix Match

```
Routing table:
Destination       Next Hop       Metric
10.0.1.0/24      Router-A       10
10.0.0.0/16      Router-B       20
0.0.0.0/0        Router-C       50  (default)

Packet to 10.0.1.50:
- Matches 10.0.1.0/24    (/24 = 24 bits)  ← WINS (most specific)
- Matches 10.0.0.0/16    (/16 = 16 bits)
- Matches 0.0.0.0/0      (/0  = 0 bits)
→ Routes via Router-A
```

---

## 4. Firewalls

### Stateful vs Stateless

**Stateful (AWS Security Group):**
```
Rule: Allow inbound HTTPS (443)
       
Connection established:
Client:50000 → Server:443  ✅ Allowed (matches rule)
Server:443 → Client:50000  ✅ Allowed (return traffic, stateful!)

Firewall remembers connection state
```

**Stateless (AWS NACL):**
```
Inbound Rules:
Rule 100: Allow TCP 443 from 0.0.0.0/0

Outbound Rules:
Rule 100: Allow TCP 1024-65535 to 0.0.0.0/0  ← MUST ADD THIS!

Connection:
Client:50000 → Server:443  ✅ Allowed (inbound rule 100)
Server:443 → Client:50000  ✅ Allowed (outbound rule 100, ephemeral port)

Firewall does NOT track state
```

### Firewall Zones

```
Internet (Untrusted)
       ↓
  DMZ (Public Zone) - Web servers
       ↓
Internal Zone - App servers
       ↓
  Secure Zone - Databases

Rules:
- Internet → DMZ: Allow 80, 443
- DMZ → Internal: Allow specific app ports
- Internal → Secure: Allow DB ports (3306, 5432)
- Secure → Internet: Deny all
```

---

## 5. Load Balancers

### Layer 4 (Transport Layer)

```
Client → Load Balancer → Backend Servers

Operates on: IP + Port
Protocol: TCP/UDP

Features:
✅ Extremely fast (no packet inspection)
✅ Supports any TCP/UDP protocol
✅ Preserves source IP
✅ Used for: Databases, gaming servers, non-HTTP

Example: AWS Network Load Balancer (NLB)

Client:12345 → LB:443 → Server:443
Source IP preserved: Client sees real client IP
```

### Layer 7 (Application Layer)

```
Client → Load Balancer → Backend Servers

Operates on: HTTP/HTTPS content
Protocol: HTTP/HTTPS

Features:
✅ Content-based routing
✅ SSL/TLS termination
✅ Cookie-based session persistence
✅ WAF integration

Example: AWS Application Load Balancer (ALB)

Routing rules:
api.example.com → API server pool
www.example.com → Web server pool
/images/*       → CDN/image servers
```

### Load Balancing Algorithms

```python
# Round Robin
servers = ['server1', 'server2', 'server3']
current = 0

def route_request():
    global current
    server = servers[current % len(servers)]
    current += 1
    return server

# Least Connections
servers_connections = {
    'server1': 10,
    'server2': 5,
    'server3': 8
}

def route_request():
    return min(servers_connections, key=servers_connections.get)

# Weighted Round Robin (based on capacity)
servers_weights = {
    'server1': 5,  # Large instance, more traffic
    'server2': 3,
    'server3': 2
}
```

---

## 6. DNS (Domain Name System)

### DNS Hierarchy

```
Root DNS Servers (.)
       ↓
TLD DNS Servers (.com, .org, .net)
       ↓
Authoritative DNS Servers (example.com)
       ↓
Record Types
```

### DNS Record Types

```
A Record:     example.com → 54.123.45.67 (IPv4)
AAAA Record:  example.com → 2001:0db8::1 (IPv6)
CNAME Record: www.example.com → example.com (alias)
MX Record:    example.com → mail.example.com (email)
TXT Record:   example.com → "v=spf1 include:_spf.google.com ~all"
NS Record:    example.com → ns1.aws.com (nameserver)

SOA Record:   Start of Authority (zone info)
PTR Record:   Reverse DNS (IP → domain name)
SRV Record:   Service discovery
```

### DNS Query Flow

```
1. User types "example.com" in browser
2. Check local DNS cache
3. Query recursive DNS resolver (8.8.8.8, 1.1.1.1)
4. Resolver queries root DNS → .com TLD DNS → example.com authoritative DNS
5. Get A record: 54.123.45.67
6. Cache result (TTL: 300 seconds)
7. Browser connects to 54.123.45.67:443
```

**Python DNS Lookup:**
```python
import socket
import dns.resolver

# Simple lookup
ip = socket.gethostbyname('example.com')
print(f"example.com → {ip}")

# Advanced lookup with dnspython
resolver = dns.resolver.Resolver()

# A record
answers = resolver.resolve('example.com', 'A')
for rdata in answers:
    print(f"A: {rdata}")

# MX record
mx_records = resolver.resolve('example.com', 'MX')
for mx in mx_records:
    print(f"MX: {mx.preference} {mx.exchange}")
```

---

## 7. NAT (Network Address Translation)

### Source NAT (SNAT)

```
Private network → Public IP translation

Internal: 10.0.1.50:12345 → NAT Gateway → Internet: 52.1.2.3:5000

NAT table:
Internal IP:Port       Public IP:Port
10.0.1.50:12345   →   52.1.2.3:5000
10.0.1.51:12346   →   52.1.2.3:5001

Return traffic:
52.1.2.3:5000 → Translates back to → 10.0.1.50:12345
```

### Destination NAT (DNAT)

```
Load balancer, port forwarding

Internet: 54.1.2.3:80 → Load Balancer → Internal: 10.0.1.50:8080

Public request to port 80 → Translated to backend port 8080
```

---

## 8. Interview Questions

**Q: Trace a packet from EC2 to internet**
```
1. Application generates packet (Layer 7)
2. TCP adds port numbers (Layer 4) - Source: 10.0.1.50:54321
3. IP adds addresses (Layer 3) - Dest: 8.8.8.8
4. Ethernet frame (Layer 2)
5. Security Group check (stateful firewall)
6. Route table lookup: 0.0.0.0/0 → IGW
7. NACL check (stateless)
8. Internet Gateway: NAT 10.0.1.50 → 52.1.2.3 (public IP)
9. Packet routed through internet
10. Response: 8.8.8.8 → 52.1.2.3
11. IGW reverse NAT: 52.1.2.3 → 10.0.1.50
12. Security Group allows return (stateful!)
13. Packet delivered to EC2
```

**Q: Why can't I SSH to EC2?**
```
Checklist:
1. ❌ Instance running?
2. ❌ Public IP assigned?
3. ❌ Security Group allows port 22?
4. ❌ NACL allows 22 inbound + ephemeral outbound?
5. ❌ Route table: 0.0.0.0/0 → IGW?
6. ❌ SSH key correct?
7. ❌ OS firewall (iptables) blocking?
```

---

## Key Takeaways

✅ **OSI Model**: 7 layers, remember PDNTSPA  
✅ **CIDR**: /16 = 65K IPs, /24 = 256 IPs  
✅ **Routing**: Longest prefix match wins  
✅ **Firewalls**: Stateful vs Stateless, ephemeral ports  
✅ **Load Balancers**: L4 (fast) vs L7 (smart)  
✅ **DNS**: A, CNAME, MX records  
✅ **NAT**: Many private IPs → One public IP  

**Next**: Container Networking (Docker & Kubernetes)
