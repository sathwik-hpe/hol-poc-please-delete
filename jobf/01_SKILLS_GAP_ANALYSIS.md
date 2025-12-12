# Fidelity Interview - Critical Skills Gap Analysis

## 🎯 Priority 1: MUST MASTER (Critical for Role)

### 1. **Advanced Python Development** ⭐⭐⭐⭐⭐
**Current Gap**: Likely focused on Go, need Python mastery

**What They Want**:
- Object-Oriented Design (not just scripting)
- API development (Flask/FastAPI)
- AWS Boto3 / Azure SDK
- Async programming
- Unit testing (pytest)
- Clean architecture patterns

**Study Plan** (20 hours):
```
Week 1 (10 hours):
- Python OOP design patterns (4 hours)
- Flask/FastAPI API development (4 hours)
- Boto3 for AWS automation (2 hours)

Week 2 (10 hours):
- Pytest and unit testing (3 hours)
- Async programming with asyncio (3 hours)
- Build: Network automation API with Flask + Boto3 (4 hours)
```

**Portfolio Project**:
```python
# Build: AWS Network Provisioning API
#Project: VPC creation API with subnet calculator
# - POST /vpc - Create VPC with CIDR
# - POST /subnet - Create subnet with auto-CIDR calculation
# - GET /available-ips - Check available IPs
# - Terraform backend for actual provisioning
```

---

### 2. **AWS/Azure Networking** ⭐⭐⭐⭐⭐
**Current Gap**: May have basic cloud knowledge, need deep networking

**AWS VPC Deep Dive** (15 hours):
```
Topics to Master:
✅ VPC design patterns (hub-spoke, multi-tier)
✅ Subnet design (/24, /28, public vs private)
✅ Route tables and routing
✅ Internet Gateway vs NAT Gateway
✅ Security Groups vs NACLs (stateful vs stateless)
✅ VPC Peering vs Transit Gateway
✅ VPC Endpoints (Gateway for S3, Interface for others)
✅ VPN Connection / Direct Connect
✅ Network ACLs best practices
✅ Flow Logs for troubleshooting

Hands-on Labs:
1. Create multi-tier VPC (web, app, db subnets)
2. Configure NAT Gateway for private subnet internet access
3. Set up VPC Peering between two VPCs
4. Create VPC Endpoint for S3 (no internet required)
5. Configure Security Groups for 3-tier app
```

**Azure Networking** (10 hours):
```
Topics:
✅ VNet design and subnetting
✅ Network Security Groups (NSG)
✅ Application Security Groups (ASG)
✅ User-Defined Routes (UDR)
✅ VNet Peering
✅ Service Endpoints vs Private Link
✅ Azure Firewall
✅ ExpressRoute

Hands-on:
1. Create VNet with multiple subnets
2. Configure NSG rules for web/app/db tiers
3. Set up VNet Peering
4. Configure Private Link for storage account
```

---

### 3. **Terraform for Network Automation** ⭐⭐⭐⭐⭐
**Current Gap**: May know basics, need advanced module development

**Master Terraform** (15 hours):
```
Week 1:
- Module development patterns (4 hours)
- State management and backends (2 hours)
- Workspaces for multi-environment (2 hours)

Week 2:
- AWS provider deep dive (3 hours)
- Network resources (VPC, subnets, route tables) (2 hours)
- Security group management patterns (2 hours)

Portfolio Project:
terraform-aws-network-module/
├── modules/
│   ├── vpc/           # VPC creation
│   ├── subnet/        # Subnet with CIDR calculator
│   ├── nat-gateway/   # NAT Gateway setup
│   ├── security-group/# SG management
│   └── endpoints/     # VPC Endpoints
├── examples/
│   └── 3-tier-app/    # Complete example
└── README.md
```

**Key Terraform Concepts**:
```hcl
# 1. Module Input Validation
variable "vpc_cidr" {
  type        = string
  description = "VPC CIDR block"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be valid IPv4 CIDR."
  }
}

# 2. Dynamic Security Group Rules
resource "aws_security_group_rule" "allow_inbound" {
  for_each = var.inbound_rules
  
  type              = "ingress"
  from_port         = each.value.from_port
  to_port           = each.value.to_port
  protocol          = each.value.protocol
  cidr_blocks       = each.value.cidr_blocks
  security_group_id = aws_security_group.this.id
}

# 3. Subnet CIDR Calculation
locals {
  subnet_cidrs = [
    for i in range(var.subnet_count) :
    cidrsubnet(var.vpc_cidr, 8, i)
  ]
}
```

---

### 4. **CI/CD with Jenkins** ⭐⭐⭐⭐
**Current Gap**: May have GitLab CI, need Jenkins expertise

**Jenkins Pipeline Development** (10 hours):
```
Topics:
- Declarative vs Scripted pipelines
- Shared libraries
- Terraform validation in Jenkins
- Policy-as-code checks (OPA, Sentinel)
- Multi-branch pipelines
- Artifact management

Example Pipeline:
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Terraform Validate') {
            steps {
                sh 'terraform init -backend=false'
                sh 'terraform validate'
                sh 'terraform fmt -check'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'tfsec .'
                sh 'checkov -d .'
            }
        }
        
        stage('Policy Check') {
            steps {
                sh 'opa test policies/'
            }
        }
        
        stage('Terraform Plan') {
            when {
                branch 'main'
            }
            steps {
                sh 'terraform plan -out=tfplan'
            }
        }
        
        stage('Approval') {
            when {
                branch 'main'
            }
            steps {
                input 'Apply changes?'
            }
        }
        
        stage('Terraform Apply') {
            when {
                branch 'main'
            }
            steps {
                sh 'terraform apply tfplan'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'tfplan', allowEmptyArchive: true
        }
        failure {
            emailext (
                subject: "Pipeline Failed: ${env.JOB_NAME}",
                body: "Build failed. Check logs."
            )
        }
    }
}
```

---

### 5. **Network Troubleshooting** ⭐⭐⭐⭐⭐
**Current Gap**: Need systematic cloud network debugging skills

**Troubleshooting Framework**:
```
Problem: "Cannot connect to RDS database from EC2"

Layer 1: Security Groups
✅ Check EC2 security group outbound rules (allow 3306 to RDS SG)
✅ Check RDS security group inbound rules (allow 3306 from EC2 SG)

Layer 2: Network ACLs
✅ Check subnet NACL outbound (allow 3306)
✅ Check RDS subnet NACL inbound (allow 3306)
✅ Check return traffic (ephemeral ports 1024-65535)

Layer 3: Route Tables
✅ EC2 subnet route table (local route exists)
✅ RDS subnet route table (local route exists)

Layer 4: DNS
✅ Resolve RDS endpoint: nslookup <rds-endpoint>
✅ Check VPC DNS settings (enableDnsHostnames, enableDnsSupport)

Layer 5: Application
✅ Telnet test: telnet <rds-endpoint> 3306
✅ MySQL client test
✅ Check credentials

Tools:
- VPC Flow Logs (see rejected traffic)
- Reachability Analyzer (AWS)
- Network Watcher (Azure)
- tcpdump / netstat
```

**Common Issues to Study**:
1. Security group misconfigurations
2. NACL blocking return traffic
3. Route table missing routes
4. VPC Peering route propagation
5. Transit Gateway routing
6. DNS resolution failures
7. MTU issues with VPN/Direct Connect

---

## 🎯 Priority 2: SHOULD KNOW (High Value)

### 6. **AWS CloudFormation**
- Alternative to Terraform
- YAML/JSON templates
- Stack management
- Change sets
- Nested stacks

**Time Investment**: 5 hours
- Basic concepts: 2 hours
- Network resources in CFN: 2 hours
- Compare with Terraform: 1 hour

---

### 7. **Docker & Kubernetes**
**Current Status**: You likely know this well!
- Quick review of networking in K8s
- CNI plugins (Calico, Cilium)
- Service mesh (Istio - mentioned in requirements)

**Time Investment**: 3 hours (refresh)

---

### 8. **DNS Management**
- Route53 (AWS)
- Azure DNS
- Private hosted zones
- Split-horizon DNS
- Health checks and failover

**Time Investment**: 4 hours

---

### 9. **Load Balancers**
**AWS**:
- Classic Load Balancer (deprecated)
- Application Load Balancer (Layer 7)
- Network Load Balancer (Layer 4)
- Gateway Load Balancer (Layer 3)

**Azure**:
- Azure Load Balancer
- Application Gateway
- Traffic Manager
- Front Door

**Time Investment**: 6 hours

---

## 🎯 Priority 3: NICE TO HAVE (Medium Value)

### 10. **Web Proxies**
- Forward proxy vs Reverse proxy
- Squid proxy configuration
- AWS HTTP/HTTPS proxy patterns
- Azure Application Gateway as reverse proxy

**Time Investment**: 3 hours

---

### 11. **Policy as Code**
- Open Policy Agent (OPA)
- HashiCorp Sentinel
- AWS Config Rules
- Azure Policy

**Time Investment**: 4 hours

---

### 12. **Financial Services Compliance**
- SOX compliance basics
- PCI-DSS for network security
- Change management processes
- Audit trails and logging

**Time Investment**: 2 hours (research)

---

## Total Time Investment Estimate

| Priority | Category | Hours | Cumulative |
|----------|----------|-------|------------|
| P1 | Python Advanced | 20 | 20 |
| P1 | AWS/Azure Networking | 25 | 45 |
| P1 | Terraform | 15 | 60 |
| P1 | Jenkins CI/CD | 10 | 70 |
| P1 | Network Troubleshooting | 10 | 80 |
| P2 | CloudFormation | 5 | 85 |
| P2 | Docker/K8s Review | 3 | 88 |
| P2 | DNS Management | 4 | 92 |
| P2 | Load Balancers | 6 | 98 |
| P3 | Web Proxies | 3 | 101 |
| P3 | Policy as Code | 4 | 105 |
| P3 | Compliance | 2 | 107 |

**Recommended Timeline**:
- **2 weeks prep**: Focus P1 only (80 hours = 6 hours/day)
- **4 weeks prep**: P1 + P2 (98 hours = 3.5 hours/day)
- **6 weeks prep**: All priorities (107 hours = 2.5 hours/day)

---

## Weekly Schedule (4-Week Plan)

### Week 1: Python & AWS Networking
- **Mon-Wed**: Advanced Python (OOP, Flask, Boto3) - 12 hours
- **Thu-Fri**: AWS VPC deep dive - 10 hours
- **Weekend**: AWS networking labs - 8 hours

### Week 2: Terraform & Azure
- **Mon-Wed**: Terraform module development - 12 hours
- **Thu**: Azure networking basics - 4 hours
- **Fri**: Azure hands-on labs - 4 hours
- **Weekend**: Build portfolio project (VPC module) - 10 hours

### Week 3: CI/CD & Troubleshooting
- **Mon-Wed**: Jenkins pipelines - 10 hours
- **Thu-Fri**: Network troubleshooting practice - 10 hours
- **Weekend**: CloudFormation & Load balancers - 10 hours

### Week 4: Integration & Interview Prep
- **Mon-Tue**: DNS, web proxies - 6 hours
- **Wed**: Policy as code - 4 hours
- **Thu-Fri**: Mock interviews & system design - 10 hours
- **Weekend**: Final review & portfolio polish - 10 hours

---

## Action Items for This Week

### Immediate (Today):
1. ✅ Review role analysis
2. ⏳ Self-assess current skill levels
3. ⏳ Set up AWS/Azure free tier accounts
4. ⏳ Install Terraform, Python, Docker

### This Weekend:
1. ⏳ Complete AWS VPC tutorial
2. ⏳ Build simple Python Flask API
3. ⏳ Write first Terraform module

### Next Week:
1. ⏳ Daily Python coding practice (1 hour)
2. ⏳ AWS networking labs (2 hours/day)
3. ⏳ Terraform module development (2 hours/day)

---

**Ready for the detailed technical study guides?** 🚀
