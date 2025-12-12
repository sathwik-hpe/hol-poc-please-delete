# DNS (Domain Name System)

## Table of Contents
- [What is DNS?](#what-is-dns)
- [DNS Hierarchy](#dns-hierarchy)
- [DNS Record Types](#dns-record-types)
- [DNS Resolution Process](#dns-resolution-process)
- [Cloud DNS Services](#cloud-dns-services)
- [DNS Security](#dns-security)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting-dns)

---

## What is DNS?

**DNS (Domain Name System)** is the internet's phone book - it translates human-readable domain names (like `example.com`) into IP addresses (like `93.184.216.34`) that computers use to communicate.

**Why DNS is needed:**
- Humans remember names better than numbers
- IP addresses can change, domain names stay the same
- Enables load balancing and failover
- Supports multiple services on same IP (virtual hosting)

**Basic Example:**
```
User types: www.example.com
DNS returns: 93.184.216.34
Browser connects to that IP address
```

## DNS Hierarchy

DNS is organized in a hierarchical tree structure:

```
                        . (Root)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
       .com             .org             .net
        │                │                │
    ┌───┴───┐        ┌───┴───┐       ┌───┴───┐
example    google   wikipedia  ietf  cloudflare amazon
    │        │
  ┌─┴─┐    ┌─┴─┐
www  mail api  drive
```

**Levels:**
1. **Root Level (`.`)**: Top of hierarchy, operated by 13 root server operators
2. **Top-Level Domain (TLD)**: `.com`, `.org`, `.net`, `.io`, country codes (`.uk`, `.de`)
3. **Second-Level Domain**: `example` in `example.com`
4. **Subdomain**: `www` in `www.example.com`, `api` in `api.example.com`

**Fully Qualified Domain Name (FQDN):**
```
www.example.com.
└┬┘ └──┬───┘ └┬┘ │
 │     │      │  └─ Root (implicit trailing dot)
 │     │      └─ TLD
 │     └─ Second-Level Domain
 └─ Subdomain
```

## DNS Record Types

### A Record (Address Record)

**Purpose:** Maps domain name to IPv4 address.

**Example:**
```
example.com.    3600    IN    A    93.184.216.34
```

**Breakdown:**
- `example.com.`: Domain name
- `3600`: TTL (Time To Live) in seconds
- `IN`: Internet class
- `A`: Record type
- `93.184.216.34`: IPv4 address

**Use Case:** Point domain to a server's IPv4 address.

### AAAA Record

**Purpose:** Maps domain name to IPv6 address.

**Example:**
```
example.com.    3600    IN    AAAA    2606:2800:220:1:248:1893:25c8:1946
```

**Use Case:** Support IPv6 connectivity.

### CNAME Record (Canonical Name)

**Purpose:** Creates an alias from one domain name to another.

**Example:**
```
www.example.com.    3600    IN    CNAME    example.com.
blog.example.com.   3600    IN    CNAME    hosting.wordpress.com.
```

**Use Case:**
- Point multiple subdomains to same location
- Delegate subdomain to external service
- Avoid updating multiple A records

**Important:** CNAME cannot coexist with other record types at the same name (except DNSSEC records).

### MX Record (Mail Exchange)

**Purpose:** Specifies mail servers for the domain.

**Example:**
```
example.com.    3600    IN    MX    10 mail1.example.com.
example.com.    3600    IN    MX    20 mail2.example.com.
```

**Priority:** Lower number = higher priority (10 is tried before 20).

**Use Case:** Email delivery routing.

### TXT Record (Text)

**Purpose:** Stores arbitrary text, often used for verification and configuration.

**Examples:**
```
# Domain verification
example.com.    3600    IN    TXT    "google-site-verification=abc123"

# SPF (Sender Policy Framework) for email
example.com.    3600    IN    TXT    "v=spf1 include:_spf.google.com ~all"

# DKIM (DomainKeys Identified Mail)
selector._domainkey.example.com.    IN    TXT    "v=DKIM1; k=rsa; p=MIGfMA0..."

# DMARC (Domain-based Message Authentication)
_dmarc.example.com.    IN    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"
```

**Use Cases:**
- Domain ownership verification
- Email authentication (SPF, DKIM, DMARC)
- Site verification (Google, Microsoft)
- Configuration data

### NS Record (Name Server)

**Purpose:** Delegates subdomain to specific name servers.

**Example:**
```
example.com.        3600    IN    NS    ns1.example.com.
example.com.        3600    IN    NS    ns2.example.com.
subdomain.example.com.    IN    NS    ns1.cloudprovider.com.
```

**Use Case:** Specify authoritative name servers for domain or subdomain.

### SOA Record (Start of Authority)

**Purpose:** Stores information about the DNS zone.

**Example:**
```
example.com.    IN    SOA    ns1.example.com. admin.example.com. (
                              2023121201  ; Serial
                              7200        ; Refresh
                              3600        ; Retry
                              1209600     ; Expire
                              3600 )      ; Minimum TTL
```

**Fields:**
- **Primary NS**: Primary name server
- **Admin email**: `admin.example.com.` = admin@example.com
- **Serial**: Zone version, increment on changes
- **Refresh**: Secondary NS refresh interval
- **Retry**: Retry interval if refresh fails
- **Expire**: When secondary NS stops responding
- **Minimum TTL**: Default TTL for records

### PTR Record (Pointer)

**Purpose:** Reverse DNS lookup (IP to domain name).

**Example:**
```
34.216.184.93.in-addr.arpa.    IN    PTR    example.com.
```

**Use Case:** Email server reputation, logging, security.

### SRV Record (Service)

**Purpose:** Specifies location of services (host and port).

**Format:**
```
_service._proto.name.    TTL    IN    SRV    priority weight port target
```

**Example:**
```
_http._tcp.example.com.    IN    SRV    10 60 80 server1.example.com.
_http._tcp.example.com.    IN    SRV    10 40 80 server2.example.com.
```

**Use Cases:** SIP, XMPP, Kubernetes service discovery.

### CAA Record (Certification Authority Authorization)

**Purpose:** Specifies which CAs can issue certificates for domain.

**Example:**
```
example.com.    IN    CAA    0 issue "letsencrypt.org"
example.com.    IN    CAA    0 issuewild ";"
```

**Use Case:** Prevent unauthorized SSL certificate issuance.

## DNS Resolution Process

### Step-by-Step Resolution

**Query: `www.example.com`**

```
1. Browser checks local cache
   └─ Not found → Continue

2. Operating system checks /etc/hosts (or equivalent)
   └─ Not found → Continue

3. Query local DNS resolver (usually ISP or 8.8.8.8)
   └─ Resolver checks its cache
      └─ Not found → Recursive query starts

4. Resolver queries Root DNS server
   Root: "I don't know www.example.com, ask .com TLD servers"
   Returns: NS records for .com TLD servers

5. Resolver queries .com TLD server
   TLD: "I don't know www.example.com, ask example.com servers"
   Returns: NS records for example.com

6. Resolver queries example.com authoritative server
   Auth: "www.example.com is 93.184.216.34"
   Returns: A record with IP address

7. Resolver caches the response (TTL: 3600s)

8. Resolver returns IP to client

9. Browser caches the response

10. Browser connects to 93.184.216.34
```

**Visual Flow:**
```
Browser → OS Cache → Local Resolver → Root → TLD → Authoritative → Response
   ↓         ↓            ↓            ↓      ↓         ↓
 Cache    /etc/hosts   ISP DNS     (.)   (.com)  (example.com NS)
```

### Recursive vs Iterative Queries

**Recursive Query:**
```
Client → Resolver: "Give me www.example.com"
Resolver does all the work, returns final answer
Client ← Resolver: "Here's the IP: 93.184.216.34"
```

**Iterative Query:**
```
Client → Server1: "Where is www.example.com?"
Client ← Server1: "Ask Server2"
Client → Server2: "Where is www.example.com?"
Client ← Server2: "Ask Server3"
Client → Server3: "Where is www.example.com?"
Client ← Server3: "Here's the IP: 93.184.216.34"
```

**Typical Setup:** Clients use recursive queries to resolvers; resolvers use iterative queries to authoritative servers.

## Cloud DNS Services

### AWS Route 53

**Features:**
- Authoritative DNS service
- Domain registration
- Health checks and failover
- Traffic policies (routing)
- DNSSEC support
- Integration with AWS services

**Routing Policies:**

1. **Simple**: Single resource
2. **Weighted**: Distribute traffic by percentages
3. **Latency-based**: Route to lowest latency region
4. **Failover**: Active-passive failover
5. **Geolocation**: Route based on user location
6. **Geoproximity**: Route based on resource and user location
7. **Multivalue**: Return multiple IPs with health checks

**Example Terraform:**
```hcl
resource "aws_route53_zone" "main" {
  name = "example.com"
}

# Simple A record
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"
  ttl     = "300"
  records = ["93.184.216.34"]
}

# Weighted routing
resource "aws_route53_record" "www_weighted_1" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"
  ttl     = "60"

  weighted_routing_policy {
    weight = 70
  }

  set_identifier = "server-1"
  records        = ["1.2.3.4"]
}

resource "aws_route53_record" "www_weighted_2" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"
  ttl     = "60"

  weighted_routing_policy {
    weight = 30
  }

  set_identifier = "server-2"
  records        = ["5.6.7.8"]
}

# Alias record (AWS-specific)
resource "aws_route53_record" "alias" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
```

**Route 53 Health Checks:**
```hcl
resource "aws_route53_health_check" "main" {
  fqdn              = "www.example.com"
  port              = 443
  type              = "HTTPS"
  resource_path     = "/health"
  failure_threshold = "3"
  request_interval  = "30"

  tags = {
    Name = "www-health-check"
  }
}
```

### Azure DNS

**Features:**
- Anycast DNS network
- Private DNS zones (for VNets)
- Alias records (similar to Route 53)
- RBAC integration
- Activity logging

**Example (Azure CLI):**
```bash
# Create DNS zone
az network dns zone create \
  --resource-group myRG \
  --name example.com

# Add A record
az network dns record-set a add-record \
  --resource-group myRG \
  --zone-name example.com \
  --record-set-name www \
  --ipv4-address 93.184.216.34

# Add CNAME record
az network dns record-set cname set-record \
  --resource-group myRG \
  --zone-name example.com \
  --record-set-name blog \
  --cname hosting.wordpress.com

# Create alias record to Load Balancer
az network dns record-set a create \
  --resource-group myRG \
  --zone-name example.com \
  --name www \
  --target-resource /subscriptions/.../loadBalancers/myLB
```

### GCP Cloud DNS

**Features:**
- Global anycast network
- Private managed zones
- DNSSEC support
- DNS forwarding and peering
- Automatic scaling

**Example (gcloud):**
```bash
# Create DNS zone
gcloud dns managed-zones create example-zone \
  --dns-name="example.com." \
  --description="Example domain"

# Add A record
gcloud dns record-sets transaction start \
  --zone=example-zone

gcloud dns record-sets transaction add \
  --zone=example-zone \
  --name="www.example.com." \
  --ttl=300 \
  --type=A \
  "93.184.216.34"

gcloud dns record-sets transaction execute \
  --zone=example-zone
```

## DNS Security

### DNSSEC (DNS Security Extensions)

**Purpose:** Authenticate DNS responses using digital signatures.

**Problem it solves:** DNS cache poisoning and spoofing.

**How it works:**
1. Zone owner signs DNS records with private key
2. Public key published in DNS (DNSKEY record)
3. Resolver validates signatures using public key
4. Chain of trust from root to domain

**DNSSEC Record Types:**
- **RRSIG**: Signature for a record set
- **DNSKEY**: Public key
- **DS**: Delegation Signer (links child zone to parent)
- **NSEC/NSEC3**: Prove non-existence of records

**Enable DNSSEC in Route 53:**
```bash
aws route53 enable-hosted-zone-dnssec \
  --hosted-zone-id Z1234567890ABC
```

### DNS over HTTPS (DoH) and DNS over TLS (DoT)

**Purpose:** Encrypt DNS queries to prevent eavesdropping.

**DNS over HTTPS (DoH):**
- Encrypts DNS queries in HTTPS
- Uses port 443 (looks like regular HTTPS traffic)
- Supported by browsers (Chrome, Firefox)

**DNS over TLS (DoT):**
- Encrypts DNS queries in TLS
- Uses dedicated port 853
- Supported by Android, iOS

**Public DoH/DoT Providers:**
- Cloudflare: `1.1.1.1`
- Google: `8.8.8.8`
- Quad9: `9.9.9.9`

### DNS Filtering

**Purpose:** Block malicious domains, phishing, malware.

**Solutions:**
- OpenDNS / Cisco Umbrella
- Cloudflare for Teams
- Quad9
- Pi-hole (self-hosted)

## Best Practices

### 1. TTL Management
```
# Short TTLs during migrations
example.com.    60    IN    A    93.184.216.34

# Normal TTLs for stable records
example.com.    3600  IN    A    93.184.216.34

# Long TTLs for rarely changing records
example.com.    86400 IN    MX   10 mail.example.com.
```

**Guidelines:**
- Lower TTL before planned changes (24-48 hours ahead)
- Increase TTL after changes stabilize
- Balance between DNS query load and change flexibility

### 2. Use Multiple Name Servers
```
example.com.    IN    NS    ns1.example.com.
example.com.    IN    NS    ns2.example.com.
example.com.    IN    NS    ns3.example.com.
```

- Minimum: 2 name servers
- Recommended: 3-4 name servers
- Geographically distributed
- Different networks (avoid single point of failure)

### 3. Implement Health Checks
- Monitor DNS record endpoints
- Automatic failover to healthy resources
- Alerts for health check failures

### 4. Use Alias Records (Cloud-Specific)
```
# AWS Route 53 Alias (no charge for queries)
example.com.    IN    A    ALIAS    d111111abcdef8.cloudfront.net.

# Standard CNAME (charges apply)
www.example.com.    IN    CNAME    d111111abcdef8.cloudfront.net.
```

### 5. Security
- Enable DNSSEC
- Use CAA records
- Restrict zone transfers (AXFR)
- Enable query logging
- Implement access controls

### 6. Monitoring
- Monitor query rates
- Track query types
- Alert on anomalies
- Check DNS propagation
- Test from multiple locations

## Troubleshooting DNS

### Common Tools

```bash
# Query DNS records
dig example.com
dig example.com A
dig example.com MX
dig @8.8.8.8 example.com  # Specific nameserver

# Trace DNS resolution
dig +trace example.com

# Reverse DNS lookup
dig -x 93.184.216.34

# nslookup (alternative)
nslookup example.com
nslookup example.com 8.8.8.8

# host (simple queries)
host example.com
host -t MX example.com

# Check DNS propagation
dig example.com @8.8.8.8        # Google
dig example.com @1.1.1.1        # Cloudflare
dig example.com @208.67.222.222 # OpenDNS

# Flush DNS cache
# macOS
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Linux (systemd-resolved)
sudo systemd-resolve --flush-caches

# Windows
ipconfig /flushdns
```

### Common Issues

#### 1. DNS Not Propagating

**Cause:** Changes haven't reached all DNS servers yet.

**Solution:**
- Wait for TTL to expire
- Check at authoritative name server: `dig @ns1.example.com example.com`
- Use online tools: whatsmydns.net

#### 2. NXDOMAIN (Non-Existent Domain)

**Cause:** Domain or subdomain doesn't exist.

**Solution:**
```bash
# Check if domain is registered
whois example.com

# Check nameservers
dig example.com NS

# Check at authoritative nameserver
dig @ns1.example.com subdomain.example.com
```

#### 3. SERVFAIL

**Cause:** DNS server encountered an error.

**Possible reasons:**
- DNSSEC validation failure
- Nameserver misconfiguration
- Network issues

**Solution:**
```bash
# Test with different resolver
dig @8.8.8.8 example.com
dig @1.1.1.1 example.com

# Check DNSSEC
dig +dnssec example.com
```

#### 4. Slow DNS Resolution

**Causes:**
- High TTLs
- Distant nameservers
- Resolver issues

**Solution:**
- Use faster public DNS (1.1.1.1, 8.8.8.8)
- Check resolver performance: `time dig example.com`
- Consider DNS caching locally

---

**Previous Module**: [04_WEB_PROXIES.md](04_WEB_PROXIES.md)  
**Next Module**: [06_INTERVIEW_QUESTIONS.md](06_INTERVIEW_QUESTIONS.md)
