# Fidelity Senior Cloud Developer - Role Analysis

## Position Overview
**Company**: Fidelity Investments  
**Team**: Cloud Network DevOps (FAE Organization)  
**Location**: Westlake, TX (Primary) or Merrimack, NH  
**Role**: Senior Cloud Developer - Cloud Network Team  

---

## Key Responsibilities Breakdown

### 1. **Cross-Team Collaboration** ⭐
- Collaborate across FAE tribes and business units
- Refine requirements and deliver impactful solutions
- **Skill Focus**: Communication, requirements gathering, stakeholder management

### 2. **Network & Security in Public Cloud** 🔒
- Design and implement network technologies (AWS/Azure)
- Design and implement security technologies (AWS/Azure)
- **Skill Focus**: Virtual networking, security groups, NACLs, VPC design, Azure VNets

### 3. **API Development** 🚀
- Develop APIs for self-service capabilities
- Enable network and security layer automation
- **Skill Focus**: Python REST APIs, Flask/FastAPI, AWS/Azure SDKs

### 4. **CI/CD & Policy Compliance** ⚙️
- Build CI environments to validate changes
- Ensure policy compliance
- **Skill Focus**: Jenkins, GitLab CI, policy-as-code (OPA, Sentinel)

### 5. **Infrastructure as Code (IaC)** 📝
- Everything must be code-driven
- No manual terminal or console access
- **Skill Focus**: Terraform, AWS CloudFormation, Ansible

### 6. **Operational Support** 🔧
- Support and maintain everything built
- On-call responsibilities
- **Skill Focus**: Monitoring, troubleshooting, incident response

### 7. **Mentorship** 👥
- Guide technologists across business units
- Help teams deploy to public cloud
- **Skill Focus**: Documentation, teaching, knowledge sharing

### 8. **Troubleshooting** 🐛
- Issues within CSPs (Cloud Service Providers)
- Ensure connectivity with Fidelity's network
- **Skill Focus**: Network debugging, AWS/Azure troubleshooting

---

## Required Skills Matrix

| Skill Category | Required Level | Priority | Your Current Level? |
|----------------|----------------|----------|---------------------|
| **Python Development** | 2+ years primary language | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **Enterprise Software** | 4+ years large-scale | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **Object-Oriented Design** | Strong understanding | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **AWS/Azure Certifications** | Preferred | ⭐⭐⭐⭐ HIGH | ___ |
| **Cloud APIs** | AWS/Azure SDKs | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **Terraform** | Infrastructure-as-Code | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **AWS CloudFormation** | Infrastructure-as-Code | ⭐⭐⭐⭐ HIGH | ___ |
| **Virtual Networking** | AWS VPC, Azure VNet | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **Security Constructs** | Security Groups, NACLs | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **CI/CD Pipelines** | Jenkins | ⭐⭐⭐⭐ HIGH | ___ |
| **Docker** | Containerization | ⭐⭐⭐⭐ HIGH | ___ |
| **Kubernetes** | Container orchestration | ⭐⭐⭐⭐ HIGH | ___ |
| **IP Routing** | Networking fundamentals | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **Firewalls** | Network security | ⭐⭐⭐⭐⭐ CRITICAL | ___ |
| **Load Balancers** | ELB, ALB, NLB, Azure LB | ⭐⭐⭐⭐ HIGH | ___ |
| **Web Proxies** | Forward/Reverse proxies | ⭐⭐⭐ MEDIUM | ___ |
| **DNS** | Route53, Azure DNS | ⭐⭐⭐⭐ HIGH | ___ |
| **Documentation** | Technical writing | ⭐⭐⭐⭐ HIGH | ___ |

---

## CRITICAL Skills (Must Master Before Interview)

### 1. **Python for Cloud Automation** (Not just scripting!)
```python
# They want advanced Python, not basic scripts
# Focus areas:
- Object-oriented design patterns
- API development (Flask/FastAPI)
- AWS Boto3/Azure SDK
- Error handling & logging
- Unit testing (pytest)
- Async programming (asyncio)
```

### 2. **AWS/Azure Networking** (Core of the role!)
```
AWS VPC:
- Subnets (public/private)
- Route tables
- Internet Gateway / NAT Gateway
- Security Groups vs NACLs
- VPC Peering / Transit Gateway
- VPN / Direct Connect
- VPC Endpoints (Gateway/Interface)

Azure VNet:
- Subnets
- Network Security Groups (NSG)
- Route tables (UDR)
- VNet Peering
- ExpressRoute / VPN Gateway
- Service Endpoints / Private Link
```

### 3. **Terraform** (Everything is IaC!)
```hcl
# You'll be writing Terraform daily
# Focus areas:
- Module development
- State management
- Workspaces
- Providers (AWS/Azure)
- Resource provisioning
- Networking resources
- Security group management
```

### 4. **CI/CD with Jenkins**
```groovy
// Pipeline as code
pipeline {
    stages {
        stage('Validate') {
            // Terraform validate
            // Policy checks
        }
        stage('Plan') {
            // Terraform plan
        }
        stage('Apply') {
            // Terraform apply
        }
    }
}
```

---

## What Makes This Role Unique?

### 1. **Network-Focused Cloud Engineering**
- NOT general DevOps
- NOT application development
- **FOCUS**: Network infrastructure automation in the cloud

### 2. **Enterprise Financial Services**
- High security requirements
- Strict compliance (SOX, PCI-DSS)
- Change management processes
- No cowboy coding!

### 3. **Self-Service Platform**
- Building APIs for other teams
- Enabling developers to provision networks
- Policy-driven automation

### 4. **Hybrid Cloud Connectivity**
- Cloud to on-prem connectivity
- ExpressRoute / Direct Connect
- Firewall rules for connectivity

---

## Red Flags to Avoid in Interview

❌ **Don't Say**:
- "I usually just use the AWS console"
- "I'm still learning Python"
- "I haven't used Terraform much"
- "I prefer to SSH and configure manually"
- "I'm not familiar with networking concepts"

✅ **Do Say**:
- "Everything I build is infrastructure-as-code"
- "I use Python with Boto3 to automate AWS tasks"
- "I've built Terraform modules for network provisioning"
- "I implement CI/CD pipelines for infrastructure validation"
- "I understand VPC architecture and security best practices"

---

## Interview Loop Prediction

### Round 1: Phone Screen (30 min)
- Resume walkthrough
- Python experience
- Cloud experience
- Why Fidelity?

### Round 2: Technical Deep Dive (60 min)
- **Python Coding**: Live coding challenge
- **AWS/Azure Networking**: Design a VPC
- **Terraform**: Write a module
- **Troubleshooting**: Network connectivity issue

### Round 3: System Design (60 min)
- Design a self-service network provisioning system
- How would you automate security group management?
- CI/CD pipeline for infrastructure changes

### Round 4: Behavioral + Team Fit (45 min)
- STAR method questions
- On-call experience
- Collaboration examples
- Handling ambiguity

### Round 5: Hiring Manager (30 min)
- Vision for the role
- Career goals
- Questions for them

---

## Your Competitive Advantages

Based on typical cloud engineering backgrounds:

### ✅ **You Likely Have**:
- Kubernetes experience (good for containers)
- Go/Python programming
- Infrastructure automation
- Cloud deployment experience

### 🎯 **Gaps to Fill** (Estimate):
- Advanced Python (vs Go focus)
- Deep AWS/Azure networking
- Enterprise Jenkins pipelines
- Financial services compliance

---

## Success Metrics for This Role

After 30 days:
- Understand the team's codebase
- Make first Terraform contribution
- Complete onboarding runbooks

After 60 days:
- Own a small feature/API
- Participate in on-call rotation
- Contribute to CI/CD improvements

After 90 days:
- Lead a network automation project
- Mentor other teams
- Propose process improvements

---

## Next Steps

1. **Assess Your Current Skills** (be honest!)
2. **Create Learning Plan** (focus on gaps)
3. **Build Portfolio Projects** (demonstrate skills)
4. **Prepare Interview Answers** (STAR method)
5. **Study Interview Questions** (technical + behavioral)

---

## Timeline Recommendation

**If interview is in 2 weeks**:
- Focus: Python, AWS networking, Terraform (critical path)

**If interview is in 4 weeks**:
- Deep dive: All technologies + system design practice

**If interview is in 6+ weeks**:
- Master: Everything + build portfolio + AWS certification

---

**Ready to create your personalized action plan?** 🚀
