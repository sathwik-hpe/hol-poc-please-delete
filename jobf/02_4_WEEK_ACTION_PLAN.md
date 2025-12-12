# 📋 Fidelity Senior Cloud Developer - 4-Week Action Plan

## Overview
**Goal**: Land Fidelity Senior Cloud Developer role  
**Timeline**: 4 weeks intensive preparation  
**Focus**: Python, AWS/Azure Networking, Terraform, CI/CD  
**Daily Commitment**: 3-4 hours/day + weekends

---

## Week 1: Python Mastery & AWS Networking Foundations

### Monday (4 hours) - Python OOP & Design Patterns
**Morning (2 hours)**:
```python
# Study Topics:
1. SOLID Principles
   - Single Responsibility
   - Open/Closed
   - Liskov Substitution
   - Interface Segregation
   - Dependency Inversion

2. Design Patterns
   - Factory Pattern
   - Singleton Pattern
   - Strategy Pattern
   - Observer Pattern
```

**Resources**:
- Python Design Patterns (Refactoring Guru)
- "Clean Code in Python" book chapters 1-3

**Practice**:
```python
# Build: Network Device Factory
class NetworkDevice:
    def __init__(self, name, ip):
        self.name = name
        self.ip = ip
    
    def configure(self):
        raise NotImplementedError

class Router(NetworkDevice):
    def configure(self):
        return f"Configuring router {self.name} at {self.ip}"

class Switch(NetworkDevice):
    def configure(self):
        return f"Configuring switch {self.name} at {self.ip}"

class NetworkDeviceFactory:
    @staticmethod
    def create_device(device_type, name, ip):
        if device_type == "router":
            return Router(name, ip)
        elif device_type == "switch":
            return Switch(name, ip)
        else:
            raise ValueError(f"Unknown device type: {device_type}")
```

**Afternoon (2 hours)**:
- Build a complete OOP project: VPC CIDR Calculator
- Include: Classes, inheritance, error handling
- Write unit tests with pytest

**Deliverable**: `vpc_calculator.py` with tests

---

### Tuesday (4 hours) - Flask API Development

**Morning (2 hours)**:
```python
# Learn Flask Basics
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route('/network/validate', methods=['POST'])
def validate_cidr():
    data = request.json
    cidr = data.get('cidr')
    
    # Validation logic
    try:
        import ipaddress
        network = ipaddress.ip_network(cidr)
        return jsonify({
            "valid": True,
            "network_address": str(network.network_address),
            "broadcast_address": str(network.broadcast_address),
            "num_addresses": network.num_addresses
        }), 200
    except ValueError as e:
        return jsonify({"valid": False, "error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Study Topics**:
- Flask routing
- Request handling (GET, POST, PUT, DELETE)
- JSON responses
- Error handling
- Blueprint patterns

**Afternoon (2 hours)**:
- Add authentication (API keys)
- Add request validation
- Add logging
- Write API documentation (OpenAPI/Swagger)

**Deliverable**: Complete Flask API with 5+ endpoints

---

### Wednesday (4 hours) - AWS Boto3 Automation

**Morning (2 hours)**:
```python
# AWS EC2 Automation with Boto3
import boto3
from botocore.exceptions import ClientError

class EC2Manager:
    def __init__(self, region='us-east-1'):
        self.ec2_client = boto3.client('ec2', region_name=region)
        self.ec2_resource = boto3.resource('ec2', region_name=region)
    
    def list_vpcs(self):
        """List all VPCs"""
        try:
            response = self.ec2_client.describe_vpcs()
            return response['Vpcs']
        except ClientError as e:
            print(f"Error: {e}")
            return []
    
    def create_security_group(self, vpc_id, group_name, description):
        """Create security group"""
        try:
            response = self.ec2_client.create_security_group(
                GroupName=group_name,
                Description=description,
                VpcId=vpc_id
            )
            sg_id = response['GroupId']
            print(f"Created security group: {sg_id}")
            return sg_id
        except ClientError as e:
            print(f"Error: {e}")
            return None
    
    def add_inbound_rule(self, sg_id, protocol, port, cidr):
        """Add inbound rule to security group"""
        try:
            self.ec2_client.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[{
                    'IpProtocol': protocol,
                    'FromPort': port,
                    'ToPort': port,
                    'IpRanges': [{'CidrIp': cidr}]
                }]
            )
            print(f"Added rule: {protocol}/{port} from {cidr}")
        except ClientError as e:
            print(f"Error: {e}")
```

**Study Topics**:
- Boto3 client vs resource
- VPC operations
- EC2 operations
- Security group management
- Error handling
- Pagination for large results

**Afternoon (2 hours)**:
- Build VPC creator script
- Add subnet creation
- Add route table configuration
- Add NAT gateway setup

**Deliverable**: `aws_network_provisioner.py`

---

### Thursday (4 hours) - AWS VPC Deep Dive

**Study Topics** (Use AWS Console + CLI):

**Part 1: VPC Basics** (1 hour)
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=MyVPC}]'

# Enable DNS hostnames
aws ec2 modify-vpc-attribute --vpc-id vpc-xxx --enable-dns-hostnames

# Create Internet Gateway
aws ec2 create-internet-gateway --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=MyIGW}]'

# Attach IGW to VPC
aws ec2 attach-internet-gateway --vpc-id vpc-xxx --internet-gateway-id igw-xxx
```

**Part 2: Subnets** (1 hour)
```bash
# Create public subnet
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 --availability-zone us-east-1a

# Create private subnet
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 --availability-zone us-east-1a

# Create database subnet
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.3.0/24 --availability-zone us-east-1a
```

**Part 3: Route Tables** (1 hour)
```bash
# Create route table for public subnet
aws ec2 create-route-table --vpc-id vpc-xxx

# Add route to Internet Gateway
aws ec2 create-route --route-table-id rtb-xxx --destination-cidr-block 0.0.0.0/0 --gateway-id igw-xxx

# Associate with subnet
aws ec2 associate-route-table --route-table-id rtb-xxx --subnet-id subnet-xxx
```

**Part 4: NAT Gateway** (1 hour)
```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Create NAT Gateway in public subnet
aws ec2 create-nat-gateway --subnet-id subnet-xxx --allocation-id eipalloc-xxx

# Add route in private route table
aws ec2 create-route --route-table-id rtb-private --destination-cidr-block 0.0.0.0/0 --nat-gateway-id nat-xxx
```

**Deliverable**: Complete 3-tier VPC architecture diagram + CLI commands

---

### Friday (4 hours) - Security Groups & NACLs

**Morning (2 hours)**:
Study differences and best practices

| Feature | Security Group | Network ACL |
|---------|----------------|-------------|
| Level | Instance | Subnet |
| State | Stateful | Stateless |
| Rules | Allow only | Allow + Deny |
| Evaluation | All rules | In order |
| Return traffic | Auto allowed | Must configure |

**Hands-on Labs**:
```
Lab 1: 3-Tier Application Security
- Web tier: Port 80/443 from 0.0.0.0/0
- App tier: Port 8080 from web tier SG
- DB tier: Port 3306 from app tier SG

Lab 2: NACL Configuration
- Allow HTTP/HTTPS inbound
- Allow SSH from corporate IP
- Allow ephemeral ports for return traffic
- Deny all other traffic
```

**Afternoon (2 hours)**:
Build security group automation tool
```python
# security_group_builder.py
class SecurityGroupBuilder:
    def __init__(self, boto3_client):
        self.ec2 = boto3_client
    
    def create_web_tier_sg(self, vpc_id):
        # Create SG
        # Add HTTP/HTTPS rules
        # Add SSH from bastion
        pass
    
    def create_app_tier_sg(self, vpc_id, web_sg_id):
        # Create SG
        # Add port 8080 from web tier
        # Add SSH from bastion
        pass
    
    def create_db_tier_sg(self, vpc_id, app_sg_id):
        # Create SG
        # Add port 3306 from app tier
        # No SSH (managed via Session Manager)
        pass
```

**Deliverable**: Security group templates for common patterns

---

### Weekend (8-10 hours) - AWS Hands-On Labs

**Saturday (5 hours)**:

**Lab 1: Multi-Tier VPC** (2 hours)
- VPC: 10.0.0.0/16
- Public subnets: 10.0.1.0/24, 10.0.2.0/24 (2 AZs)
- Private subnets: 10.0.11.0/24, 10.0.12.0/24
- Database subnets: 10.0.21.0/24, 10.0.22.0/24
- NAT Gateways in both AZs
- Route tables properly configured

**Lab 2: VPC Peering** (1.5 hours)
- Create two VPCs
- Set up VPC peering
- Configure route tables
- Test connectivity

**Lab 3: VPC Endpoints** (1.5 hours)
- Create S3 Gateway Endpoint
- Create EC2 Interface Endpoint
- Test access without internet

**Sunday (5 hours)**:

**Lab 4: Transit Gateway** (2 hours)
- Create 3 VPCs
- Set up Transit Gateway
- Attach all VPCs
- Configure routing

**Lab 5: VPN Connection** (1.5 hours)
- Create Customer Gateway
- Create Virtual Private Gateway
- Set up VPN connection
- Configure routing

**Lab 6: Troubleshooting Practice** (1.5 hours)
- Enable VPC Flow Logs
- Analyze rejected traffic
- Fix security group issues
- Use Reachability Analyzer

**Deliverable**: Lab screenshots + Terraform code for each lab

---

## Week 2: Terraform Mastery & Azure Networking

### Monday (4 hours) - Terraform Fundamentals

**Morning (2 hours)**:
```hcl
# Learn Terraform basics

# 1. Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.region
}

# 2. Variables
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be valid IPv4 CIDR block."
  }
}

# 3. Locals
locals {
  common_tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Team        = "CloudNetwork"
  }
}

# 4. Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# 5. Resources
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-vpc"
    }
  )
}

# 6. Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}
```

**Study Topics**:
- Terraform state management
- Workspaces (dev, staging, prod)
- Remote state with S3 backend
- State locking with DynamoDB

**Afternoon (2 hours)**:
- Set up Terraform project structure
- Configure remote state
- Create first VPC with Terraform

**Deliverable**: Basic Terraform VPC project

---

### Tuesday (4 hours) - Terraform Modules

**Morning (2 hours)**:
```
Project Structure:
terraform-aws-network/
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── subnet/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── security-group/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── examples/
│   └── 3-tier-app/
│       ├── main.tf
│       ├── variables.tf
│       └── terraform.tfvars
├── tests/
│   └── vpc_test.go
└── README.md
```

**VPC Module Example**:
```hcl
# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support
  
  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}

resource "aws_internet_gateway" "this" {
  count = var.create_igw ? 1 : 0
  
  vpc_id = aws_vpc.this.id
  
  tags = merge(
    var.tags,
    {
      Name = "${var.name}-igw"
    }
  )
}

# modules/vpc/variables.tf
variable "name" {
  description = "Name of the VPC"
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for VPC"
  type        = string
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support"
  type        = bool
  default     = true
}

variable "create_igw" {
  description = "Create Internet Gateway"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.this.cidr_block
}

output "igw_id" {
  description = "Internet Gateway ID"
  value       = try(aws_internet_gateway.this[0].id, null)
}
```

**Afternoon (2 hours)**:
- Build complete module library
- Add input validation
- Add comprehensive outputs
- Write module documentation

**Deliverable**: Reusable Terraform modules for VPC, Subnet, Security Groups

---

### Wednesday (4 hours) - Advanced Terraform Patterns

**Dynamic Blocks**:
```hcl
resource "aws_security_group" "this" {
  name        = var.name
  description = var.description
  vpc_id      = var.vpc_id
  
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
  
  tags = var.tags
}
```

**Count vs For_Each**:
```hcl
# Count (when order doesn't matter)
resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "${var.name}-public-${count.index + 1}"
  }
}

# For_Each (when you need map keys)
resource "aws_subnet" "private" {
  for_each = var.private_subnets
  
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
  
  tags = {
    Name = "${var.name}-${each.key}"
  }
}
```

**Deliverable**: Advanced Terraform patterns library

---

### Thursday-Friday (8 hours) - Azure Networking

**Azure VNet Basics** (4 hours):
```hcl
# Terraform for Azure
provider "azurerm" {
  features {}
}

resource "azurerm_virtual_network" "main" {
  name                = "${var.prefix}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = var.tags
}

resource "azurerm_subnet" "web" {
  name                 = "web-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_network_security_group" "web" {
  name                = "${var.prefix}-web-nsg"
  location            = var.location
  resource_group_name = azurerm_resource_group.main.name
  
  security_rule {
    name                       = "allow-http"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
```

**Azure Topics to Cover**:
- Resource Groups
- VNets and Subnets
- Network Security Groups (NSG)
- Application Security Groups (ASG)
- VNet Peering
- Service Endpoints
- Private Link
- Azure Firewall
- User-Defined Routes (UDR)

**Hands-On Labs**:
1. Create VNet with 3 subnets
2. Configure NSG rules
3. Set up VNet Peering
4. Configure Service Endpoint for Storage
5. Set up Private Link for SQL Database

**Deliverable**: Azure networking Terraform modules

---

### Weekend (10 hours) - Portfolio Project

**Build: Network Provisioning API**

**Architecture**:
```
Frontend (Optional): React dashboard
Backend: Python Flask/FastAPI
Infrastructure: Terraform modules
CI/CD: Jenkins pipeline
Cloud: AWS + Azure
```

**Features**:
1. Create VPC/VNet via API
2. Auto-calculate subnet CIDRs
3. Create security groups with templates
4. Validate network configurations
5. Generate Terraform code
6. Apply via Terraform
7. Audit logging
8. Cost estimation

**Code Structure**:
```
network-provisioning-api/
├── api/
│   ├── __init__.py
│   ├── app.py
│   ├── routes/
│   │   ├── vpc.py
│   │   ├── subnet.py
│   │   └── security_group.py
│   ├── models/
│   │   ├── network.py
│   │   └── validation.py
│   └── utils/
│       ├── cidr_calculator.py
│       └── terraform_generator.py
├── terraform/
│   ├── modules/
│   │   ├── vpc/
│   │   ├── subnet/
│   │   └── security-group/
│   └── examples/
├── tests/
│   ├── test_api.py
│   ├── test_cidr.py
│   └── test_terraform.py
├── Jenkinsfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

**Deliverable**: Complete working API + documentation + demo video

---

## Week 3: CI/CD, Jenkins & Troubleshooting

### Monday-Tuesday (8 hours) - Jenkins Mastery

**Day 1: Jenkins Basics** (4 hours):
- Install Jenkins (Docker)
- Plugin management
- Job types (Freestyle, Pipeline)
- Credentials management
- Shared libraries

**Day 2: Pipeline Development** (4 hours):
```groovy
// Jenkinsfile
@Library('shared-library') _

pipeline {
    agent {
        docker {
            image 'hashicorp/terraform:latest'
        }
    }
    
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Target environment'
        )
        booleanParam(
            name: 'AUTO_APPROVE',
            defaultValue: false,
            description: 'Auto-approve Terraform apply'
        )
    }
    
    environment {
        AWS_REGION = 'us-east-1'
        TF_WORKSPACE = "${params.ENVIRONMENT}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Terraform Init') {
            steps {
                sh '''
                    cd terraform
                    terraform init -backend-config=env/${ENVIRONMENT}.tfbackend
                '''
            }
        }
        
        stage('Terraform Validate') {
            steps {
                sh 'terraform validate'
                sh 'terraform fmt -check -recursive'
            }
        }
        
        stage('Security Scan') {
            parallel {
                stage('tfsec') {
                    steps {
                        sh 'tfsec .'
                    }
                }
                stage('checkov') {
                    steps {
                        sh 'checkov -d .'
                    }
                }
            }
        }
        
        stage('Policy Check') {
            steps {
                script {
                    def result = sh(
                        script: 'opa test policies/',
                        returnStatus: true
                    )
                    if (result != 0) {
                        error "Policy validation failed"
                    }
                }
            }
        }
        
        stage('Terraform Plan') {
            steps {
                sh '''
                    terraform plan \
                        -var-file=env/${ENVIRONMENT}.tfvars \
                        -out=tfplan
                '''
                
                sh 'terraform show -no-color tfplan > plan.txt'
                archiveArtifacts artifacts: 'plan.txt'
            }
        }
        
        stage('Approval') {
            when {
                expression { params.AUTO_APPROVE == false }
            }
            steps {
                script {
                    def userInput = input(
                        id: 'Proceed',
                        message: 'Apply Terraform changes?',
                        parameters: [
                            booleanParam(
                                name: 'CONFIRM',
                                defaultValue: false,
                                description: 'Check to confirm'
                            )
                        ]
                    )
                    
                    if (!userInput) {
                        error "Deployment cancelled"
                    }
                }
            }
        }
        
        stage('Terraform Apply') {
            steps {
                sh 'terraform apply -auto-approve tfplan'
            }
        }
        
        stage('Post-Deployment Tests') {
            steps {
                sh 'python tests/integration_tests.py'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        success {
            slackSend(
                channel: '#deployments',
                color: 'good',
                message: "✅ ${env.JOB_NAME} #${env.BUILD_NUMBER} succeeded"
            )
        }
        failure {
            slackSend(
                channel: '#deployments',
                color: 'danger',
                message: "❌ ${env.JOB_NAME} #${env.BUILD_NUMBER} failed"
            )
        }
    }
}
```

**Deliverable**: Complete Jenkins pipeline for Terraform deployments

---

### Wednesday-Friday (12 hours) - Network Troubleshooting

**Systematic Troubleshooting Framework**:

**Scenario 1: Cannot access web application** (3 hours)
```
Problem: Users cannot access web app at http://myapp.example.com

Layer-by-layer troubleshooting:
1. DNS
   - nslookup myapp.example.com
   - dig myapp.example.com
   - Check Route53 hosted zone

2. Load Balancer
   - Check ALB target health
   - Check ALB security group (allow 80/443)
   - Check ALB subnets (must be public)
   - Check listener rules

3. Target Instances
   - Check EC2 instance status
   - Check security group (allow from ALB SG)
   - Check application is running: curl localhost:8080
   - Check logs: /var/log/app.log

4. Network Path
   - Check VPC Flow Logs
   - Check NACL rules
   - Use AWS Reachability Analyzer

5. Application
   - Check application health endpoint
   - Check database connectivity
   - Check environment variables
```

**Scenario 2: RDS connection timeout** (3 hours)
```
Problem: Application cannot connect to RDS database

Troubleshooting steps:
1. Security Groups
   ✅ RDS SG allows inbound 3306 from App SG
   ✅ App SG allows outbound to RDS SG

2. Network ACLs
   ✅ App subnet NACL allows outbound 3306
   ✅ RDS subnet NACL allows inbound 3306
   ✅ Return traffic (ephemeral ports 1024-65535)

3. Routing
   ✅ Both subnets in same VPC (local route exists)
   ✅ Check route tables

4. DNS
   ✅ Resolve RDS endpoint
   ✅ nslookup mydb.xxxx.us-east-1.rds.amazonaws.com

5. Connectivity Test
   # From EC2
   telnet mydb.xxxx.us-east-1.rds.amazonaws.com 3306
   
   # MySQL client
   mysql -h mydb.xxxx.us-east-1.rds.amazonaws.com -u admin -p

6. VPC Flow Logs
   # Filter for rejected traffic
   aws ec2 describe-flow-logs
   # Analyze logs in CloudWatch
```

**Scenario 3: VPC Peering not working** (3 hours)
```
Problem: Instances in VPC-A cannot reach VPC-B

Checks:
1. Peering Connection
   ✅ Status: Active
   ✅ Both sides accepted

2. Route Tables
   VPC-A route table:
   10.1.0.0/16 → local
   10.2.0.0/16 → pcx-xxxxx (peering)
   
   VPC-B route table:
   10.2.0.0/16 → local
   10.1.0.0/16 → pcx-xxxxx (peering)

3. Security Groups
   ✅ Allow traffic from peered VPC CIDR

4. NACLs
   ✅ Allow traffic from peered VPC CIDR

5. CIDR Overlap
   ❌ CIDRs must NOT overlap!

6. DNS
   ✅ Enable DNS resolution for peering
```

**Scenario 4: NAT Gateway issues** (3 hours)
```
Problem: Private subnet instances cannot reach internet

Troubleshooting:
1. NAT Gateway
   ✅ Status: Available
   ✅ Located in public subnet
   ✅ Has Elastic IP attached

2. Route Tables
   Private route table:
   10.0.0.0/16 → local
   0.0.0.0/0 → nat-xxxxx ✅
   
   Public route table (for NAT subnet):
   10.0.0.0/16 → local
   0.0.0.0/0 → igw-xxxxx ✅

3. Security Group
   ✅ Instance SG allows outbound to 0.0.0.0/0

4. NACL
   ✅ Private subnet NACL allows outbound to 0.0.0.0/0
   ✅ Public subnet NACL allows inbound from private CIDR
   ✅ Ephemeral ports configured

5. Test
   # From private instance
   curl https://www.google.com
   ping 8.8.8.8
```

**Deliverable**: Troubleshooting playbooks for common scenarios

---

### Weekend (10 hours) - Additional Skills

**Saturday**:
- CloudFormation (5 hours)
- DNS deep dive (Route53, Azure DNS) (5 hours)

**Sunday**:
- Load balancers (ALB, NLB, Azure LB) (5 hours)
- Web proxies & Policy as Code (5 hours)

---

## Week 4: Interview Preparation & Final Polish

### Monday-Tuesday (8 hours) - System Design Practice

**Practice these designs**:

1. **Self-Service Network Provisioning Platform** (2 hours)
2. **Multi-Region Network Architecture** (2 hours)
3. **Hybrid Cloud Connectivity Solution** (2 hours)
4. **Network Compliance Automation** (2 hours)

### Wednesday-Friday (12 hours) - Mock Interviews

**Wednesday**: Technical coding (4 hours)
- Python coding challenges
- Boto3 automation tasks
- Terraform module creation

**Thursday**: System design (4 hours)
- Practice with peers
- Record yourself
- Time yourself (45 min each)

**Friday**: Behavioral (4 hours)
- STAR method answers
- Prepare questions for interviewer
- Company research

### Weekend (8 hours) - Final Review & Portfolio

**Deliverables**:
1. ✅ GitHub repo with Terraform modules
2. ✅ Network provisioning API (running demo)
3. ✅ Blog post about a complex network problem solved
4. ✅ Updated resume highlighting relevant skills
5. ✅ LinkedIn profile optimized

---

## Daily Routine (Mon-Fri)

**Morning (6:00 - 7:00 AM)**: 1 hour
- Python coding practice (LeetCode/HackerRank)
- Focus on data structures, algorithms

**Evening (7:00 - 10:00 PM)**: 3 hours
- Follow weekly plan
- Hands-on labs
- Build projects

**Weekend**: 8-10 hours
- Deep dive projects
- Mock interviews
- Portfolio building

---

## Success Metrics

### Week 1:
- ✅ Built 3+ Python projects with OOP
- ✅ Created Flask API with 10+ endpoints
- ✅ Completed 6 AWS VPC labs
- ✅ Can explain VPC architecture confidently

### Week 2:
- ✅ Built reusable Terraform modules
- ✅ Completed Azure networking labs
- ✅ Portfolio project 50% complete

### Week 3:
- ✅ Working Jenkins pipeline
- ✅ Can troubleshoot 10+ network scenarios
- ✅ Portfolio project 100% complete

### Week 4:
- ✅ Completed 5 system design practices
- ✅ Ready with 20+ STAR stories
- ✅ Confident for all interview rounds

---

**Ready to start? Begin with Week 1, Day 1! Let me know when you want the detailed interview questions.** 🚀
