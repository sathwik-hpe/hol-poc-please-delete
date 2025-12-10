# Module 21: AWS IAM & VPC ☁️

## Secure Your Cloud Infrastructure with IAM and Networking

**Duration:** 5-6 hours  
**Prerequisites:** Basic cloud concepts, networking fundamentals  
**Outcome:** Master AWS security and networking foundations

---

## 📚 Table of Contents

1. [AWS Overview](#aws-overview)
2. [IAM (Identity and Access Management)](#iam)
3. [VPC (Virtual Private Cloud)](#vpc)
4. [Security Best Practices](#security-best-practices)
5. [Terraform for AWS](#terraform-for-aws)
6. [Interview Questions](#interview-questions)
7. [Hands-On Exercise](#hands-on-exercise)

---

## AWS Overview

### AWS Services Hierarchy

```
AWS Account (Root)
├── IAM (Who can access)
├── VPC (Network isolation)
├── Compute (EC2, Lambda, EKS)
├── Storage (S3, EBS, EFS)
├── Database (RDS, DynamoDB)
├── Monitoring (CloudWatch, X-Ray)
└── DevOps (CodePipeline, CodeBuild)

Foundation:
1. IAM - Authentication & Authorization
2. VPC - Network & Security
```

### AWS CLI Setup

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configure credentials
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## IAM (Identity and Access Management)

### Core Concepts

```
IAM Components:

1. Users:   Individual people (john@company.com)
2. Groups:  Collection of users (developers, admins)
3. Roles:   AWS services or applications
4. Policies: JSON documents defining permissions

Authentication: Who are you? (username/password, access keys)
Authorization:  What can you do? (policies)
```

### IAM Users

```bash
# Create user
aws iam create-user --user-name john-developer

# Create access keys
aws iam create-access-key --user-name john-developer

# List users
aws iam list-users

# Delete user
aws iam delete-user --user-name john-developer
```

### IAM Groups

```bash
# Create group
aws iam create-group --group-name developers

# Add user to group
aws iam add-user-to-group \
  --user-name john-developer \
  --group-name developers

# Attach policy to group
aws iam attach-group-policy \
  --group-name developers \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

# List groups
aws iam list-groups
```

### IAM Policies

#### AWS Managed Policies (Pre-built)

```bash
# Common managed policies
AdministratorAccess           # Full access to everything
PowerUserAccess               # Everything except IAM
ReadOnlyAccess                # Read-only to all services
AmazonEC2FullAccess          # Full EC2 access
AmazonS3ReadOnlyAccess       # Read S3 only

# Attach managed policy
aws iam attach-user-policy \
  --user-name john-developer \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
```

#### Custom Policies (JSON)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:StartInstances",
        "ec2:StopInstances"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-bucket",
        "arn:aws:s3:::my-bucket/*"
      ]
    },
    {
      "Effect": "Deny",
      "Action": "ec2:TerminateInstances",
      "Resource": "*"
    }
  ]
}
```

```bash
# Create custom policy
aws iam create-policy \
  --policy-name EC2-Start-Stop \
  --policy-document file://policy.json

# Attach custom policy
aws iam attach-user-policy \
  --user-name john-developer \
  --policy-arn arn:aws:iam::123456789012:policy/EC2-Start-Stop
```

### IAM Roles

```
Roles vs Users:

Users:  Humans with permanent credentials
Roles:  Applications/services with temporary credentials

Use cases:
- EC2 instance needs S3 access → EC2 Role
- Lambda function needs DynamoDB access → Lambda Role
- Cross-account access → Assume Role
```

```bash
# Create role trust policy (who can assume this role)
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name EC2-S3-Access \
  --assume-role-policy-document file://trust-policy.json

# Attach policy to role
aws iam attach-role-policy \
  --role-name EC2-S3-Access \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create instance profile (wrapper for EC2)
aws iam create-instance-profile \
  --instance-profile-name EC2-S3-Access-Profile

# Add role to instance profile
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2-S3-Access-Profile \
  --role-name EC2-S3-Access
```

### Go SDK - IAM Operations

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/iam"
)

func main() {
    // Load AWS configuration
    cfg, err := config.LoadDefaultConfig(context.TODO())
    if err != nil {
        log.Fatal(err)
    }

    client := iam.NewFromConfig(cfg)

    // List users
    users, err := client.ListUsers(context.TODO(), &iam.ListUsersInput{})
    if err != nil {
        log.Fatal(err)
    }

    for _, user := range users.Users {
        fmt.Printf("User: %s, Created: %v\n", *user.UserName, *user.CreateDate)
    }
}
```

### MFA (Multi-Factor Authentication)

```bash
# Enable MFA for user (virtual MFA device)
aws iam create-virtual-mfa-device \
  --virtual-mfa-device-name john-mfa \
  --outfile QRCode.png \
  --bootstrap-method QRCodePNG

# Enable MFA device
aws iam enable-mfa-device \
  --user-name john-developer \
  --serial-number arn:aws:iam::123456789012:mfa/john-mfa \
  --authentication-code-1 123456 \
  --authentication-code-2 789012

# Policy requiring MFA
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

---

## VPC (Virtual Private Cloud)

### VPC Architecture

```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24)
│   ├── Internet Gateway
│   ├── NAT Gateway
│   └── Web Servers
├── Private Subnet (10.0.2.0/24)
│   ├── Application Servers
│   └── No direct internet access
└── Database Subnet (10.0.3.0/24)
    └── RDS instances

Components:
1. VPC:             Isolated network
2. Subnets:         Network segments
3. Route Tables:    Traffic routing
4. Internet Gateway: Connect to internet
5. NAT Gateway:     Outbound internet for private subnets
6. Security Groups: Instance-level firewall
7. NACLs:           Subnet-level firewall
```

### Create VPC

```bash
# Create VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-vpc}]'

# Enable DNS hostnames
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-12345678 \
  --enable-dns-hostnames
```

### Subnets

```bash
# Create public subnet
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet}]'

# Create private subnet
aws ec2 create-subnet \
  --vpc-id vpc-12345678 \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet}]'

# Auto-assign public IP in public subnet
aws ec2 modify-subnet-attribute \
  --subnet-id subnet-11111111 \
  --map-public-ip-on-launch
```

### Internet Gateway

```bash
# Create internet gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=my-igw}]'

# Attach to VPC
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-12345678 \
  --vpc-id vpc-12345678
```

### Route Tables

```bash
# Create route table for public subnet
aws ec2 create-route-table \
  --vpc-id vpc-12345678 \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]'

# Add route to internet gateway
aws ec2 create-route \
  --route-table-id rtb-12345678 \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-12345678

# Associate route table with subnet
aws ec2 associate-route-table \
  --route-table-id rtb-12345678 \
  --subnet-id subnet-11111111
```

### NAT Gateway

```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Create NAT gateway in public subnet
aws ec2 create-nat-gateway \
  --subnet-id subnet-11111111 \
  --allocation-id eipalloc-12345678

# Add route in private subnet route table
aws ec2 create-route \
  --route-table-id rtb-private \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-12345678
```

### Security Groups

```
Security Groups: Stateful firewall at instance level

Stateful: If you allow inbound, response is automatically allowed
Default: All outbound allowed, no inbound allowed
```

```bash
# Create security group
aws ec2 create-security-group \
  --group-name web-sg \
  --description "Web server security group" \
  --vpc-id vpc-12345678

# Allow HTTP (port 80)
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS (port 443)
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow SSH from specific IP
aws ec2 authorize-security-group-ingress \
  --group-id sg-12345678 \
  --protocol tcp \
  --port 22 \
  --cidr 203.0.113.0/24

# Allow from another security group (e.g., app servers)
aws ec2 authorize-security-group-ingress \
  --group-id sg-db \
  --protocol tcp \
  --port 3306 \
  --source-group sg-app
```

### Network ACLs (NACLs)

```
NACLs: Stateless firewall at subnet level

Stateless: Must explicitly allow both inbound and outbound
Default:    Allow all inbound and outbound
```

```bash
# Create NACL
aws ec2 create-network-acl \
  --vpc-id vpc-12345678

# Add inbound rule (allow HTTP)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-12345678 \
  --ingress \
  --rule-number 100 \
  --protocol tcp \
  --port-range From=80,To=80 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow

# Add outbound rule (allow HTTP response)
aws ec2 create-network-acl-entry \
  --network-acl-id acl-12345678 \
  --egress \
  --rule-number 100 \
  --protocol tcp \
  --port-range From=1024,To=65535 \
  --cidr-block 0.0.0.0/0 \
  --rule-action allow
```

### VPC Peering

```
VPC Peering: Connect two VPCs (same/different accounts)

VPC A (10.0.0.0/16) ←→ VPC B (10.1.0.0/16)

Requirements:
- Non-overlapping CIDR blocks
- Update route tables in both VPCs
```

```bash
# Create peering connection
aws ec2 create-vpc-peering-connection \
  --vpc-id vpc-aaaa \
  --peer-vpc-id vpc-bbbb

# Accept peering connection (in peer account)
aws ec2 accept-vpc-peering-connection \
  --vpc-peering-connection-id pcx-12345678

# Add route in VPC A to VPC B
aws ec2 create-route \
  --route-table-id rtb-aaaa \
  --destination-cidr-block 10.1.0.0/16 \
  --vpc-peering-connection-id pcx-12345678
```

---

## Security Best Practices

### IAM Best Practices

```
1. Root Account
   ✅ Enable MFA
   ✅ Don't use for daily tasks
   ✅ Delete access keys
   
2. Users
   ✅ Create individual users (no sharing)
   ✅ Enable MFA for privileged users
   ✅ Rotate access keys regularly
   ✅ Use strong password policy
   
3. Permissions
   ✅ Principle of least privilege
   ✅ Use groups, not individual policies
   ✅ Use roles for applications
   ✅ Regularly review permissions
   
4. Monitoring
   ✅ Enable CloudTrail
   ✅ Monitor with CloudWatch
   ✅ Set up billing alerts
```

### VPC Best Practices

```
1. Network Design
   ✅ Use multiple subnets across AZs
   ✅ Separate public/private/database tiers
   ✅ Plan CIDR blocks carefully
   
2. Security
   ✅ Minimal security group rules
   ✅ Use security group chaining
   ✅ Enable VPC Flow Logs
   ✅ Use NACLs for additional defense
   
3. High Availability
   ✅ Multi-AZ deployment
   ✅ NAT Gateway in each AZ
   ✅ Load balancers across AZs
```

---

## Terraform for AWS

### Complete VPC with Terraform

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet-${count.index + 1}"
  }
}

# Private Subnet
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-subnet-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "nat-eip-${count.index + 1}"
  }
}

# NAT Gateway
resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "nat-gateway-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

# Route Table for Private Subnets
resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Group
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-sg"
  }
}

# Data source for AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

```bash
# Deploy
terraform init
terraform plan
terraform apply
```

---

## Interview Questions

**Q1: Explain IAM users vs roles.**

**Answer:**
- **Users**: For people. Permanent credentials (username/password, access keys). Example: john@company.com
- **Roles**: For applications/services. Temporary credentials via STS. Example: EC2 instance accessing S3, Lambda accessing DynamoDB

**Q2: What's the difference between security groups and NACLs?**

**Answer:**
- **Security Groups**: Instance-level, stateful (return traffic auto-allowed), allow rules only, default deny all
- **NACLs**: Subnet-level, stateless (must allow both directions), allow & deny rules, default allow all, processed in order

**Q3: Explain VPC public vs private subnet.**

**Answer:**
- **Public**: Has route to Internet Gateway (0.0.0.0/0 → IGW), instances get public IPs
- **Private**: No direct internet access, uses NAT Gateway for outbound, instances only have private IPs

**Q4: How do you secure access between tiers (web/app/db)?**

**Answer:**
1. Separate subnets (public/private/database)
2. Security group chaining (web SG → app SG → db SG)
3. No direct internet to app/db
4. Minimal ports (web: 80/443, app: custom, db: 3306/5432)
5. NACLs for additional layer

**Q5: What is the principle of least privilege?**

**Answer:** Grant minimum permissions needed. Start with no access, add only what's required. Review regularly. Use groups and roles, not individual policies. Example: Developer needs EC2 read-only, not full access.

---

## Hands-On Exercise

### Task: Create Multi-Tier VPC with Terraform

**Architecture:**
```
VPC (10.0.0.0/16)
├── Public Subnet (10.0.1.0/24) - Web tier
│   └── Security Group: Allow 80, 443
├── Private Subnet (10.0.2.0/24) - App tier
│   └── Security Group: Allow from web SG
└── Database Subnet (10.0.3.0/24) - DB tier
    └── Security Group: Allow 3306 from app SG
```

**Solution:**

```hcl
# variables.tf
variable "project_name" {
  default = "myapp"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

# vpc.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# subnets.tf
resource "aws_subnet" "web" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"

  tags = {
    Name = "${var.project_name}-web-subnet"
    Tier = "public"
  }
}

resource "aws_subnet" "app" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "${var.project_name}-app-subnet"
    Tier = "private"
  }
}

resource "aws_subnet" "db" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "${var.project_name}-db-subnet"
    Tier = "database"
  }
}

# security-groups.tf
resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg"
  description = "Web tier security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-web-sg"
  }
}

resource "aws_security_group" "app" {
  name        = "${var.project_name}-app-sg"
  description = "App tier security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "From web tier"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-app-sg"
  }
}

resource "aws_security_group" "db" {
  name        = "${var.project_name}-db-sg"
  description = "Database tier security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from app tier"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}

# outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "web_subnet_id" {
  value = aws_subnet.web.id
}

output "web_sg_id" {
  value = aws_security_group.web.id
}
```

```bash
# Deploy
terraform init
terraform apply -auto-approve

# Verify
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=myapp-vpc"
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<vpc-id>"
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=<vpc-id>"
```

---

## 📚 Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [VPC User Guide](https://docs.aws.amazon.com/vpc/latest/userguide/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/latest/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

## ✅ Module Checklist

- [ ] Set up AWS CLI and credentials
- [ ] Create IAM users, groups, and policies
- [ ] Configure IAM roles for EC2
- [ ] Enable MFA for root and users
- [ ] Create VPC with public and private subnets
- [ ] Configure Internet Gateway and NAT Gateway
- [ ] Set up security groups with proper rules
- [ ] Deploy multi-tier VPC with Terraform
- [ ] Test security group chaining

---

**Next Module:** [Module 22: AWS Compute](./22_AWS_Compute.md) - EC2, Lambda, EKS! 🚀
