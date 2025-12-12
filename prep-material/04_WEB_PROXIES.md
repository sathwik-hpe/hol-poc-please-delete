# Web Proxies

## Table of Contents
- [What is a Proxy?](#what-is-a-proxy)
- [Forward Proxy](#forward-proxy)
- [Reverse Proxy](#reverse-proxy)
- [Proxy Use Cases](#proxy-use-cases)
- [Popular Proxy Tools](#popular-proxy-tools)
- [Best Practices](#best-practices)

---

## What is a Proxy?

A **proxy server** acts as an intermediary between clients and servers, forwarding requests and responses.

**Key Functions:**
- Request forwarding
- Response caching
- SSL termination
- Load balancing
- Security filtering
- Anonymity

## Forward Proxy

**Definition:** A proxy that sits between clients and the internet, acting on behalf of clients.

**Architecture:**
```
Client → Forward Proxy → Internet → Server
         (Hides client)
```

**Use Cases:**
1. **Content Filtering**: Block access to certain websites
2. **Anonymity**: Hide client IP address
3. **Caching**: Cache frequently accessed content
4. **Access Control**: Authenticate users before internet access
5. **Bandwidth Control**: Limit bandwidth per user

**Example - Squid Forward Proxy:**
```conf
# /etc/squid/squid.conf

# Define ACLs
acl localnet src 10.0.0.0/8
acl SSL_ports port 443
acl Safe_ports port 80          # http
acl Safe_ports port 443         # https
acl CONNECT method CONNECT

# Access rules
http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localnet
http_access deny all

# Proxy port
http_port 3128

# Cache settings
cache_dir ufs /var/spool/squid 100 16 256
cache_mem 256 MB
maximum_object_size 4 MB
```

**Corporate Use Case:**
```
Employee Laptop → Corporate Proxy → Internet
                       │
                       ├─ Blocks social media
                       ├─ Logs all requests
                       ├─ Caches software updates
                       └─ Enforces security policies
```

## Reverse Proxy

**Definition:** A proxy that sits in front of servers, acting on behalf of servers.

**Architecture:**
```
Client → Internet → Reverse Proxy → Backend Servers
                    (Hides servers)
```

**Use Cases:**
1. **Load Balancing**: Distribute requests across multiple servers
2. **SSL Termination**: Handle SSL/TLS encryption
3. **Caching**: Cache static content
4. **Compression**: Compress responses
5. **Security**: Hide backend server details, WAF integration
6. **Rate Limiting**: Limit requests per client

**Example - Nginx Reverse Proxy:**
```nginx
# /etc/nginx/nginx.conf

http {
    upstream backend {
        least_conn;  # Load balancing algorithm
        server backend1.example.com:8080;
        server backend2.example.com:8080;
        server backend3.example.com:8080;
    }

    # Cache configuration
    proxy_cache_path /var/cache/nginx levels=1:2 
                     keys_zone=my_cache:10m 
                     max_size=1g inactive=60m;

    server {
        listen 80;
        server_name example.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name example.com;

        # SSL configuration
        ssl_certificate /etc/ssl/certs/example.com.crt;
        ssl_certificate_key /etc/ssl/private/example.com.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        # Proxy settings
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Caching
            proxy_cache my_cache;
            proxy_cache_valid 200 60m;
            proxy_cache_use_stale error timeout updating;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # Static files
        location /static/ {
            proxy_pass http://backend;
            proxy_cache my_cache;
            proxy_cache_valid 200 1d;
            expires 30d;
        }

        # API endpoints (no caching)
        location /api/ {
            proxy_pass http://backend;
            proxy_cache off;
        }
    }
}
```

**Comparison:**

| Feature | Forward Proxy | Reverse Proxy |
|---------|---------------|---------------|
| **Position** | Client-side | Server-side |
| **Hides** | Client identity | Server identity |
| **Typical Use** | Corporate networks | Web applications |
| **Benefits Client** | Anonymity, filtering | Faster responses (cache) |
| **Benefits Server** | N/A | Load balancing, security |
| **Examples** | Squid, Corporate proxy | Nginx, HAProxy, Traefik |

## Proxy Use Cases

### 1. Caching

**Purpose:** Store frequently accessed content to reduce backend load and improve response times.

**How it works:**
```
First request:  Client → Proxy (MISS) → Backend → Response → Cache
Second request: Client → Proxy (HIT) → Cached Response (fast!)
```

**Cache Control Headers:**
```http
Cache-Control: public, max-age=3600
Cache-Control: private, no-cache
Cache-Control: no-store
Expires: Wed, 21 Oct 2025 07:28:00 GMT
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

**Example Nginx Caching:**
```nginx
location / {
    proxy_pass http://backend;
    
    # Cache configuration
    proxy_cache my_cache;
    proxy_cache_valid 200 302 10m;
    proxy_cache_valid 404 1m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    
    # Bypass cache for certain conditions
    proxy_cache_bypass $cookie_nocache $arg_nocache;
    
    # Add cache status header
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 2. SSL/TLS Termination

**Purpose:** Handle SSL encryption at the proxy, reducing backend server load.

**Architecture:**
```
Client ──HTTPS──▶ Proxy ──HTTP──▶ Backend Servers
         (encrypted)      (unencrypted, trusted network)
```

**Benefits:**
- Reduced CPU load on backend servers
- Centralized certificate management
- Easier certificate rotation
- Can inspect and modify traffic

**Security Consideration:**
- Ensure proxy-to-backend communication is on a trusted network
- Or use end-to-end encryption (proxy re-encrypts)

**Example HAProxy SSL Termination:**
```haproxy
frontend https_frontend
    bind *:443 ssl crt /etc/ssl/certs/example.com.pem
    mode http
    
    # Force HTTPS
    redirect scheme https code 301 if !{ ssl_fc }
    
    # Security headers
    http-response set-header Strict-Transport-Security "max-age=31536000"
    http-response set-header X-Frame-Options "SAMEORIGIN"
    
    default_backend web_servers

backend web_servers
    mode http
    balance roundrobin
    option httpchk GET /health
    
    server web1 10.0.1.10:80 check
    server web2 10.0.1.11:80 check
    server web3 10.0.1.12:80 check
```

### 3. Rate Limiting

**Purpose:** Protect backend servers from abuse and DDoS attacks.

**Example Nginx Rate Limiting:**
```nginx
http {
    # Define rate limit zones
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    
    server {
        listen 80;
        
        # General pages - 10 requests per second
        location / {
            limit_req zone=general burst=20 nodelay;
            proxy_pass http://backend;
        }
        
        # API - 100 requests per second
        location /api/ {
            limit_req zone=api burst=200 nodelay;
            limit_req_status 429;
            proxy_pass http://backend;
        }
    }
}
```

### 4. Request/Response Transformation

**Purpose:** Modify requests and responses (headers, body, compression).

**Example - Compression:**
```nginx
http {
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
    
    server {
        location / {
            proxy_pass http://backend;
            
            # Add custom headers
            proxy_set_header X-Custom-Header "value";
            
            # Remove sensitive headers
            proxy_hide_header X-Powered-By;
        }
    }
}
```

### 5. API Gateway Pattern

**Purpose:** Single entry point for microservices, handling authentication, routing, rate limiting.

**Architecture:**
```
Client → API Gateway (Reverse Proxy) → Route to services
                │
                ├─ /users/*     → User Service
                ├─ /orders/*    → Order Service
                ├─ /products/*  → Product Service
                └─ /payments/*  → Payment Service
```

**Example - Kong API Gateway (Nginx-based):**
```bash
# Add service
curl -i -X POST http://localhost:8001/services/ \
  --data 'name=user-service' \
  --data 'url=http://user-service:8080'

# Add route
curl -i -X POST http://localhost:8001/services/user-service/routes \
  --data 'paths[]=/users'

# Add authentication plugin
curl -i -X POST http://localhost:8001/services/user-service/plugins \
  --data 'name=jwt'

# Add rate limiting
curl -i -X POST http://localhost:8001/services/user-service/plugins \
  --data 'name=rate-limiting' \
  --data 'config.minute=100'
```

## Popular Proxy Tools

### 1. Nginx

**Type:** Reverse proxy, web server, load balancer

**Strengths:**
- High performance
- Low memory footprint
- HTTP/2 and gRPC support
- Excellent documentation
- Large ecosystem

**Use Cases:**
- Web application reverse proxy
- API gateway
- Static content serving
- SSL termination

**Basic Installation:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Start service
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. HAProxy

**Type:** Load balancer and reverse proxy

**Strengths:**
- Very high performance
- TCP and HTTP load balancing
- Advanced health checking
- Detailed statistics dashboard
- Layer 4 and Layer 7 support

**Use Cases:**
- High-traffic load balancing
- TCP proxying (databases, etc.)
- Blue-green deployments
- A/B testing

**Example Configuration:**
```haproxy
global
    log /dev/log local0
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms

frontend http_front
    bind *:80
    stats uri /haproxy?stats
    default_backend http_back

backend http_back
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    
    server server1 10.0.1.10:80 check
    server server2 10.0.1.11:80 check
    server server3 10.0.1.12:80 check backup
```

### 3. Squid

**Type:** Forward proxy and caching server

**Strengths:**
- Mature and stable
- Excellent caching capabilities
- Access control lists (ACLs)
- Authentication support
- Bandwidth management

**Use Cases:**
- Corporate forward proxy
- Content caching
- Access control
- Bandwidth optimization

### 4. Traefik

**Type:** Modern cloud-native reverse proxy

**Strengths:**
- Dynamic configuration (no restarts)
- Native Docker/Kubernetes integration
- Automatic SSL with Let's Encrypt
- Built-in dashboard
- Middleware support

**Use Cases:**
- Microservices architectures
- Container orchestration
- Dynamic environments
- Cloud-native applications

**Example Docker Compose:**
```yaml
version: '3'

services:
  traefik:
    image: traefik:v2.10
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
  
  whoami:
    image: traefik/whoami
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.whoami.rule=Host(`whoami.example.com`)"
      - "traefik.http.routers.whoami.entrypoints=websecure"
      - "traefik.http.routers.whoami.tls=true"
```

### 5. Envoy

**Type:** Modern service proxy

**Strengths:**
- Built for microservices
- gRPC and HTTP/2 first-class support
- Advanced load balancing
- Service mesh integration (Istio)
- Observability features

**Use Cases:**
- Service mesh data plane
- API gateway
- Edge proxy
- Sidecar proxy in Kubernetes

## Best Practices

### 1. Security
- Always use HTTPS for public-facing proxies
- Implement proper authentication and authorization
- Hide backend server details (Server header)
- Use security headers (HSTS, CSP, etc.)
- Rate limit to prevent abuse
- Keep proxy software updated

### 2. Performance
- Enable caching for static content
- Use HTTP/2 when possible
- Configure proper buffer sizes
- Enable gzip/brotli compression
- Set appropriate timeouts
- Use connection pooling to backends

### 3. Monitoring
- Log all requests (access logs)
- Monitor error rates (4xx, 5xx)
- Track response times
- Monitor backend health
- Set up alerting for failures
- Use metrics exporters (Prometheus, etc.)

### 4. High Availability
- Deploy multiple proxy instances
- Use load balancer in front of proxies
- Implement health checks
- Have automated failover
- Keep configurations in version control
- Test disaster recovery procedures

### 5. Configuration Management
- Use Infrastructure as Code (Terraform, Ansible)
- Version control all configurations
- Test changes in staging first
- Implement blue-green deployment
- Document all custom configurations
- Use configuration templates

---

**Previous Module**: [03_LOAD_BALANCERS.md](03_LOAD_BALANCERS.md)  
**Next Module**: [05_DNS.md](05_DNS.md)
