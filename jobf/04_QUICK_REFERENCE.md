# Fidelity Interview - Quick Reference Guide

## 🎯 Role Summary
**Position**: Senior Cloud Developer - Cloud Network Team  
**Team**: Fidelity Architecture & Engineering (FAE)  
**Focus**: Network automation in AWS/Azure  
**Location**: Westlake, TX or Merrimack, NH  

---

## ✅ Top 5 Critical Skills (MUST MASTER)

### 1. **Python Development** (Not just scripting!)
```python
# They want to see:
- Object-Oriented Design patterns
- REST API development (Flask/FastAPI)
- AWS Boto3 automation
- Error handling & logging
- Unit testing with pytest
- Clean, production-ready code

# Portfolio Project:
Build a network provisioning API with:
- VPC/subnet creation via API
- Terraform backend for infrastructure
- Policy validation
- Audit logging
```

### 2. **AWS VPC Networking** (Core of the role!)
```
Master These Concepts:
✅ VPC architecture (CIDR planning, subnets)
✅ Security Groups vs NACLs (stateful vs stateless)
✅ Route tables and routing
✅ Internet Gateway vs NAT Gateway
✅ VPC Peering vs Transit Gateway
✅ VPC Endpoints (Gateway, Interface)
✅ VPN Connection / Direct Connect
✅ Flow Logs for troubleshooting

Practice Labs:
- Multi-tier VPC (web, app, db)
- VPC Peering between regions
- Transit Gateway hub-and-spoke
- VPC Endpoint for S3 access
```

### 3. **Terraform for Network Infrastructure**
```hcl
Master These Patterns:
✅ Module development (vpc, subnet, security-group)
✅ State management (S3 backend, state locking)
✅ Workspaces for multi-environment
✅ Dynamic blocks and for_each
✅ Input validation
✅ Resource dependencies

Build Reusable Modules:
- VPC module with auto-subnet calculation
- Security group module with rule templates
- Network ACL module
- VPC Peering module
```

### 4. **CI/CD with Jenkins**
```groovy
Master Pipeline Development:
✅ Declarative pipelines
✅ Terraform validation stages
✅ Security scanning (tfsec, checkov)
✅ Policy checks (OPA, Sentinel)
✅ Approval workflows
✅ Post-deployment validation

Example Pipeline Stages:
1. Checkout code
2. Terraform init & validate
3. Security scan (parallel)
4. Policy check
5. Terraform plan
6. Manual approval
7. Terraform apply
8. Post-deployment tests
```

### 5. **Network Troubleshooting**
```
Systematic Approach:
Layer 1: Security Groups (instance-level, stateful)
Layer 2: Network ACLs (subnet-level, stateless)
Layer 3: Route Tables (routing decisions)
Layer 4: DNS Resolution (Route53, private zones)
Layer 5: Application (running? credentials?)

Tools:
- VPC Flow Logs (see rejected traffic)
- Reachability Analyzer (AWS)
- CloudWatch Logs
- tcpdump, netstat, telnet
```

---

## 🔑 Key Talking Points

### Why This Role?
"This role is uniquely focused on **network automation** in the cloud, which is more specialized than general DevOps. I'm excited to solve complex problems like:
- Automated security group management at scale
- Self-service network provisioning with compliance controls
- Hybrid cloud connectivity (AWS/Azure to on-prem)
- Policy-driven infrastructure

Working in **financial services** where reliability and security are mandatory appeals to me - it forces you to build better systems."

### Why Fidelity?
"Three reasons:
1. **Technical challenge**: Building network infrastructure as a self-service platform
2. **Domain**: Financial services has strict compliance (SOX, PCI-DSS) - I want to work where quality matters
3. **Culture**: 'No manual console access' philosophy - everything as code. That's how it should be done."

### Python Experience?
"I have [X years] of Python for cloud automation:
- **Boto3**: Automated VPC provisioning, security group management, cost optimization scripts
- **APIs**: Built Flask/FastAPI services for internal tooling
- **DevOps**: CI/CD integration, infrastructure validation

Currently building a network provisioning API that generates Terraform code based on API requests."

### Terraform Experience?
"I use Terraform as my primary IaC tool:
- **Module development**: Built reusable modules for VPC, security groups, EKS
- **State management**: S3 backend with DynamoDB locking, workspace strategy
- **CI/CD**: Integrated into Jenkins with automated validation and security scanning
- **Production**: Managed infrastructure with drift detection and safe state migrations

Example: Refactored monolithic Terraform to modular design, reducing deployment time from 45min to 10min."

---

## 💡 Interview Tips

### Do's:
✅ **Ask clarifying questions** before jumping to solutions  
✅ **Think aloud** - explain your reasoning  
✅ **Start simple** then optimize  
✅ **Discuss trade-offs** (no perfect solution)  
✅ **Use specific examples** from your experience  
✅ **Quantify results** ("reduced deployment time by 70%")  

### Don'ts:
❌ **Don't say**: "I usually use the AWS console"  
❌ **Don't guess** - admit when you don't know something  
❌ **Don't over-engineer** - start with simple, working solution  
❌ **Don't ignore security** - always mention compliance/security  
❌ **Don't blame others** in behavioral questions  

---

## 🎓 STAR Method Template

**Situation** (2-3 sentences): Set context, what was happening?  
**Task** (1 sentence): What was YOUR responsibility?  
**Action** (3-5 bullets): What did YOU do? Be specific.  
**Result** (2-3 sentences): Outcome? Quantify if possible. What did you learn?

**Example Topics to Prepare**:
1. Troubleshooting complex networking issue
2. Learning new technology quickly (Terraform, Kubernetes, etc.)
3. Disagreeing with technical decision
4. Making decision with incomplete information
5. Mentoring junior engineer
6. Handling production outage
7. Improving system performance
8. Managing competing priorities
9. Cross-team collaboration
10. Dealing with ambiguous requirements

---

## 📊 Technical Deep Dive - Common Questions

### Q: "Design a VPC for a 3-tier web application"

**Answer Framework**:
```
1. Requirements:
   - Availability: Multi-AZ for high availability
   - Security: Public web, private app/db
   - Scalability: Auto-scaling, load balancing

2. Design:
   VPC: 10.0.0.0/16
   
   AZ1 (us-east-1a):
   - Public subnet: 10.0.1.0/24 (web tier)
   - Private subnet: 10.0.11.0/24 (app tier)
   - Private subnet: 10.0.21.0/24 (db tier)
   
   AZ2 (us-east-1b):
   - Public subnet: 10.0.2.0/24 (web tier)
   - Private subnet: 10.0.12.0/24 (app tier)
   - Private subnet: 10.0.22.0/24 (db tier)
   
   Internet Gateway: Attached to VPC
   NAT Gateway: One in each public subnet (HA)
   
   Route Tables:
   - Public RT: 0.0.0.0/0 → IGW
   - Private RT (AZ1): 0.0.0.0/0 → NAT-AZ1
   - Private RT (AZ2): 0.0.0.0/0 → NAT-AZ2
   
3. Security Groups:
   - Web SG: Allow 80/443 from 0.0.0.0/0
   - App SG: Allow 8080 from Web SG
   - DB SG: Allow 3306 from App SG
   
4. Enhancements:
   - VPC Flow Logs for monitoring
   - VPC Endpoints for S3 (no internet needed)
   - Network ACLs for additional security layer
   - Bastion host or Session Manager for admin access
```

### Q: "How do you troubleshoot: Application can't connect to RDS?"

**Answer Framework**:
```
Systematic layer-by-layer approach:

1. Security Groups:
   ✓ RDS SG: Allows inbound 3306 from App SG?
   ✓ App SG: Allows outbound to RDS SG?

2. Network ACLs:
   ✓ App subnet NACL: Allows outbound 3306?
   ✓ RDS subnet NACL: Allows inbound 3306?
   ✓ Return traffic: Ephemeral ports 1024-65535?

3. Routing:
   ✓ Both in same VPC (local route exists)?
   ✓ Route tables correct?

4. DNS:
   ✓ nslookup <rds-endpoint> works?
   ✓ VPC DNS enabled?

5. Connectivity:
   ✓ telnet <rds-endpoint> 3306
   ✓ Check VPC Flow Logs for REJECT

6. Application:
   ✓ Correct endpoint?
   ✓ Valid credentials?
   ✓ Database running?
```

### Q: "How would you automate security group management?"

**Answer Framework**:
```
Solution: Self-Service API + Terraform + Policy Engine

Architecture:
API (Flask) → Policy Check (OPA) → Terraform Generator → Apply

1. API Design:
POST /api/security-groups
{
  "name": "web-server-sg",
  "vpc_id": "vpc-xxx",
  "rules": [
    {"protocol": "tcp", "port": 443, "source": "0.0.0.0/0"},
    {"protocol": "tcp", "port": 22, "source": "10.0.0.0/16"}
  ]
}

2. Policy Checks:
- No SSH from 0.0.0.0/0
- No database ports from internet
- Required description
- CIDR validation
- User authorization

3. Terraform Generation:
resource "aws_security_group" "generated" {
  name   = var.name
  vpc_id = var.vpc_id
  
  dynamic "ingress" {
    for_each = var.rules
    content {
      ...
    }
  }
}

4. CI/CD Pipeline:
- Generate Terraform code
- Run tfsec/checkov
- Run policy checks
- Terraform plan
- Approval (if production)
- Terraform apply
- Audit log

Benefits:
- Standardization
- Policy enforcement
- Audit trail
- Self-service
```

---

## 🚀 Day-Before Checklist

### Technical:
- [ ] Review AWS VPC architecture diagram
- [ ] Review Terraform module structure
- [ ] Review Python OOP concepts
- [ ] Review Jenkins pipeline syntax
- [ ] Review networking troubleshooting steps

### Behavioral:
- [ ] Review STAR stories (have 10 ready)
- [ ] Practice answering out loud
- [ ] Review resume - can explain every bullet
- [ ] Prepare 5-7 questions for interviewer

### Logistics:
- [ ] Test Zoom/video setup
- [ ] Prepare quiet space
- [ ] Have paper and pen ready
- [ ] Have water nearby
- [ ] Charge laptop fully
- [ ] Close all unnecessary browser tabs

### Mindset:
- [ ] Get good sleep night before
- [ ] Eat a proper meal before interview
- [ ] Arrive (or log in) 10 minutes early
- [ ] Take deep breaths - you're prepared!

---

## 📈 Success Metrics

**Good Signs During Interview**:
- ✅ Interviewer asks follow-up questions (engaged)
- ✅ Discussion becomes collaborative (designing together)
- ✅ They share details about team/projects
- ✅ They ask about your timeline/availability
- ✅ Interview runs over time (in a good way)

**Red Flags to Note**:
- ❌ Interviewer seems distracted
- ❌ Very short, curt answers
- ❌ No discussion of next steps
- ❌ Interview ends early

---

## 💪 Confidence Boosters

**Remember**:
1. You're **qualified** - you got the interview!
2. Interviews are **two-way** - you're evaluating them too
3. It's **okay to not know** everything - admit it and explain how you'd find out
4. **Think aloud** - shows your problem-solving approach
5. **Be yourself** - authenticity matters

**If you get stuck**:
- "That's interesting, can you give me a moment to think?"
- "I haven't encountered that exact scenario, but here's how I'd approach it..."
- "I'm not familiar with that specific tool, but I've used similar ones like..."

---

## 📞 Post-Interview

### Within 24 Hours:
- [ ] Send thank-you email to each interviewer
- [ ] Note down questions you struggled with
- [ ] Reflect on what went well
- [ ] Update your preparation materials

### Thank You Email Template:
```
Subject: Thank you - Senior Cloud Developer Interview

Hi [Interviewer Name],

Thank you for taking the time to speak with me today about the Senior Cloud Developer role. I enjoyed our discussion about [specific topic discussed - e.g., "the team's approach to network automation and self-service platforms"].

I'm particularly excited about [specific aspect - e.g., "the opportunity to build policy-driven infrastructure and enable other teams through automation"]. Our conversation reinforced my interest in joining the Cloud Network team at Fidelity.

Please let me know if you need any additional information from me. I look forward to hearing about next steps.

Best regards,
[Your Name]
```

---

## 🎯 Final Thoughts

**You've prepared thoroughly:**
- ✅ Deep understanding of AWS/Azure networking
- ✅ Strong Python and Terraform skills
- ✅ System design thinking
- ✅ Real-world troubleshooting experience
- ✅ STAR stories ready
- ✅ Questions for interviewer

**Trust your preparation. You've got this! 🚀**

---

## 📚 Key Resources

### Documentation:
- AWS VPC User Guide: https://docs.aws.amazon.com/vpc/
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/
- Boto3 Documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/index.html

### Practice:
- AWS Free Tier: Practice VPC setups
- Terraform Cloud: Free tier for remote state
- LeetCode/HackerRank: Python practice

### Your Portfolio:
- GitHub: https://github.com/[your-username]/terraform-network-modules
- Network Provisioning API: [link to demo]
- Blog Post: [link if you wrote one]

---

**Remember: They're not looking for perfection. They're looking for:**
- Problem-solving ability
- Communication skills
- Learning agility
- Culture fit
- Passion for the work

**Go show them what you've got! 💪**
