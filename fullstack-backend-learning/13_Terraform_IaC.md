# Module 13: Terraform - Infrastructure as Code 🏗️

## Automate Infrastructure Provisioning with Terraform

**Duration:** 5-6 hours  
**Prerequisites:** Module 12 (Infrastructure Basics), Cloud provider account (AWS/GCP/Azure)  
**Outcome:** Master Terraform for declarative infrastructure management

---

## 📚 Table of Contents

1. [What is Terraform](#what-is-terraform)
2. [HCL Syntax](#hcl-syntax)
3. [Providers](#providers)
4. [Resources & Data Sources](#resources--data-sources)
5. [Variables & Outputs](#variables--outputs)
6. [State Management](#state-management)
7. [Modules](#modules)
8. [Workspaces](#workspaces)
9. [Best Practices](#best-practices)
10. [Interview Questions](#interview-questions)
11. [Hands-On Exercise](#hands-on-exercise)

---

## What is Terraform

### Infrastructure as Code (IaC)

```
Traditional Infrastructure:
- Manual configuration
- Click through UI
- Hard to replicate
- No version control
- Error-prone

Infrastructure as Code:
- Declarative configuration
- Version controlled
- Repeatable
- Auditable
- Automated
```

### Terraform Workflow

```
1. Write      → Define infrastructure in .tf files
2. Init       → terraform init (download providers)
3. Plan       → terraform plan (preview changes)
4. Apply      → terraform apply (create resources)
5. Destroy    → terraform destroy (clean up)
```

### Installation

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Verify
terraform version
```

---

## HCL Syntax

### HashiCorp Configuration Language

```hcl
# Basic structure
<block_type> "<label>" "<label>" {
  argument1 = value1
  argument2 = value2
  
  nested_block {
    argument = value
  }
}
```

### Example: EC2 Instance

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "WebServer"
    Environment = "Production"
  }
}
```

### Data Types

```hcl
# String
variable "region" {
  type    = string
  default = "us-west-2"
}

# Number
variable "instance_count" {
  type    = number
  default = 3
}

# Bool
variable "enable_monitoring" {
  type    = bool
  default = true
}

# List
variable "availability_zones" {
  type    = list(string)
  default = ["us-west-2a", "us-west-2b"]
}

# Map
variable "instance_types" {
  type = map(string)
  default = {
    dev  = "t2.micro"
    prod = "t2.large"
  }
}

# Object
variable "server_config" {
  type = object({
    name = string
    cpu  = number
    memory = number
  })
}

# Set (unique values)
variable "security_groups" {
  type = set(string)
}
```

### Expressions

```hcl
# String interpolation
name = "server-${var.environment}"

# Conditionals
instance_type = var.environment == "prod" ? "t2.large" : "t2.micro"

# For expressions
subnet_ids = [for s in var.subnets : s.id]

# Splat
instance_ids = aws_instance.web[*].id
```

---

## Providers

### What are Providers?

**Providers** are plugins that interact with cloud APIs (AWS, Azure, GCP) or services (GitHub, Datadog).

### Configure AWS Provider

```hcl
# main.tf
terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region  = "us-west-2"
  profile = "default"  # AWS CLI profile
  
  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}
```

### Multiple Provider Configurations

```hcl
# Primary region
provider "aws" {
  region = "us-west-2"
}

# Disaster recovery region
provider "aws" {
  alias  = "dr"
  region = "us-east-1"
}

# Use alias
resource "aws_instance" "web" {
  provider = aws.dr
  ami      = "ami-12345678"
  instance_type = "t2.micro"
}
```

### Popular Providers

```hcl
# Google Cloud
provider "google" {
  project = "my-project"
  region  = "us-central1"
}

# Azure
provider "azurerm" {
  features {}
  subscription_id = "xxx"
}

# Kubernetes
provider "kubernetes" {
  config_path = "~/.kube/config"
}

# GitHub
provider "github" {
  token = var.github_token
  owner = "my-org"
}
```

---

## Resources & Data Sources

### Resources (Create/Manage)

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "main-vpc"
  }
}

# Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id  # Reference
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-west-2a"
  map_public_ip_on_launch = true
  
  tags = {
    Name = "public-subnet"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

# Route Table Association
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
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
}

# EC2 Instance
resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t2.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "Hello from Terraform" > /var/www/html/index.html
              EOF
  
  tags = {
    Name = "web-server"
  }
}
```

### Data Sources (Read Existing)

```hcl
# Get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Use data source
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t2.micro"
}

# Get existing VPC
data "aws_vpc" "default" {
  default = true
}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Get caller identity
data "aws_caller_identity" "current" {}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}
```

### Count & For_Each

```hcl
# Count (for identical resources)
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  
  tags = {
    Name = "web-${count.index}"
  }
}

# Reference
output "instance_ips" {
  value = aws_instance.web[*].private_ip
}

# For_each (for unique resources)
variable "users" {
  type = map(string)
  default = {
    admin = "Administrator"
    dev   = "Developer"
    ops   = "Operations"
  }
}

resource "aws_iam_user" "users" {
  for_each = var.users
  name     = each.key
  
  tags = {
    Role = each.value
  }
}

# Reference
output "user_arns" {
  value = { for k, v in aws_iam_user.users : k => v.arn }
}
```

---

## Variables & Outputs

### Input Variables

```hcl
# variables.tf
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 2
  
  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10"
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "enable_monitoring" {
  description = "Enable CloudWatch monitoring"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default     = {}
}
```

### Variable Precedence

```
1. Command line (-var, -var-file)
2. *.auto.tfvars files
3. terraform.tfvars
4. Environment variables (TF_VAR_*)
5. Default values
```

### terraform.tfvars

```hcl
# terraform.tfvars
region          = "us-east-1"
instance_count  = 3
environment     = "prod"
enable_monitoring = true

tags = {
  Project = "WebApp"
  Owner   = "DevOps"
}
```

### Output Values

```hcl
# outputs.tf
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "instance_ips" {
  description = "Public IPs of instances"
  value       = aws_instance.web[*].public_ip
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.web.id
  sensitive   = true
}

output "connection_string" {
  value = "http://${aws_instance.web[0].public_ip}"
}
```

---

## State Management

### What is State?

**State file** (`terraform.tfstate`) tracks resources Terraform manages. Maps configuration to real infrastructure.

### Local State

```hcl
# Default: stored locally
# terraform.tfstate in current directory

# View state
terraform show

# List resources
terraform state list

# Show specific resource
terraform state show aws_instance.web
```

### Remote State (S3 Backend)

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # State locking
  }
}
```

### State Locking (DynamoDB)

```hcl
# Create DynamoDB table for locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
}
```

### State Commands

```bash
# Initialize backend
terraform init -migrate-state

# Pull remote state
terraform state pull

# Push local state
terraform state push terraform.tfstate

# Move resource
terraform state mv aws_instance.web aws_instance.web_server

# Remove resource from state (doesn't destroy)
terraform state rm aws_instance.old

# Import existing resource
terraform import aws_instance.web i-1234567890abcdef0
```

---

## Modules

### What are Modules?

**Modules** are reusable Terraform configurations. Package infrastructure patterns.

### Module Structure

```
modules/
└── vpc/
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── README.md
```

### Create VPC Module

```hcl
# modules/vpc/variables.tf
variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string
}

variable "name" {
  description = "VPC name"
  type        = string
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
}

# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = var.name
  }
}

resource "aws_subnet" "public" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone = var.availability_zones[count.index]
  
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.name}-public-${count.index + 1}"
  }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
}

# modules/vpc/outputs.tf
output "vpc_id" {
  value = aws_vpc.this.id
}

output "public_subnet_ids" {
  value = aws_subnet.public[*].id
}
```

### Use Module

```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  
  cidr_block         = "10.0.0.0/16"
  name               = "main-vpc"
  availability_zones = ["us-west-2a", "us-west-2b"]
}

# Reference module outputs
resource "aws_instance" "web" {
  subnet_id = module.vpc.public_subnet_ids[0]
  # ...
}
```

### Terraform Registry Modules

```hcl
# Use public module from registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-west-2a", "us-west-2b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
}
```

---

## Workspaces

### What are Workspaces?

**Workspaces** allow multiple state files for same configuration (dev/staging/prod).

### Workspace Commands

```bash
# List workspaces
terraform workspace list

# Create workspace
terraform workspace new dev
terraform workspace new staging
terraform workspace new prod

# Switch workspace
terraform workspace select dev

# Show current workspace
terraform workspace show

# Delete workspace
terraform workspace delete staging
```

### Use Workspace in Configuration

```hcl
# Different instance types per workspace
locals {
  instance_type = {
    dev     = "t2.micro"
    staging = "t2.small"
    prod    = "t2.large"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.instance_type[terraform.workspace]
  
  tags = {
    Name        = "web-${terraform.workspace}"
    Environment = terraform.workspace
  }
}
```

---

## Best Practices

### 1. Project Structure

```
terraform-project/
├── main.tf              # Main configuration
├── variables.tf         # Input variables
├── outputs.tf           # Output values
├── providers.tf         # Provider configuration
├── backend.tf           # Backend configuration
├── terraform.tfvars     # Variable values
├── modules/             # Reusable modules
│   ├── vpc/
│   ├── ec2/
│   └── rds/
└── environments/        # Environment-specific
    ├── dev/
    │   ├── main.tf
    │   └── terraform.tfvars
    └── prod/
        ├── main.tf
        └── terraform.tfvars
```

### 2. Naming Conventions

```hcl
# Resources: resource_type
aws_instance.web_server
aws_db_instance.postgres_main

# Variables: descriptive, lowercase, underscores
variable "instance_count" {}
variable "db_password" {}

# Outputs: descriptive
output "vpc_id" {}
output "instance_public_ips" {}
```

### 3. Version Constraints

```hcl
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # >= 5.0.0, < 6.0.0
    }
  }
}
```

### 4. State Management

```
✅ Use remote backend (S3, Terraform Cloud)
✅ Enable state locking (DynamoDB)
✅ Encrypt state at rest
✅ Never commit state files to Git
✅ Use .gitignore
```

### 5. Sensitive Data

```hcl
# Mark sensitive
variable "db_password" {
  type      = string
  sensitive = true
}

# Use environment variables
export TF_VAR_db_password="secretpassword"

# Or use secrets management
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}
```

---

## Interview Questions

**Q1: What is Terraform state and why is it important?**

**Answer:** State file maps Terraform configuration to real infrastructure. Contains resource metadata, dependencies, outputs. Critical for:
- Tracking what Terraform manages
- Planning changes (comparing desired vs current)
- Metadata (resource IDs, dependencies)
- Performance (caching attributes)
Should use remote backend for team collaboration and locking.

**Q2: Explain the difference between `count` and `for_each`.**

**Answer:**
- `count`: Creates multiple identical resources, indexed numerically (0, 1, 2...). If you remove middle item, Terraform recreates subsequent resources.
- `for_each`: Creates resources keyed by map/set. More stable - removing item doesn't affect others. Better for managing diverse resources.

**Q3: How do you handle secrets in Terraform?**

**Answer:**
1. Never hardcode in .tf files
2. Use environment variables (`TF_VAR_*`)
3. External secrets management (AWS Secrets Manager, Vault)
4. Mark variables as `sensitive = true`
5. Use .gitignore for .tfvars files
6. Encrypt remote state

**Q4: What are Terraform modules and when would you use them?**

**Answer:** Modules are reusable Terraform configurations. Use for:
- Encapsulating patterns (VPC setup, EKS cluster)
- DRY principle (don't repeat yourself)
- Standardization across teams
- Versioning infrastructure patterns
- Sharing via Terraform Registry

**Q5: How does Terraform handle dependencies?**

**Answer:** 
- **Implicit**: Referencing resource attributes (e.g., `aws_vpc.main.id`)
- **Explicit**: `depends_on` meta-argument
- Terraform builds dependency graph, applies in correct order
- Destroys in reverse order

---

## Hands-On Exercise

### Task: Deploy 3-Tier AWS Infrastructure

```hcl
# main.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  
  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-public-${count.index + 1}"
  }
}

# Private Subnet
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "${var.project_name}-private-${count.index + 1}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

# NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Web Tier Security Group
resource "aws_security_group" "web" {
  name   = "${var.project_name}-web-sg"
  vpc_id = aws_vpc.main.id
  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Web Servers
resource "aws_instance" "web" {
  count                  = 2
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[count.index].id
  vpc_security_group_ids = [aws_security_group.web.id]
  
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              echo "Web Server ${count.index + 1}" > /var/www/html/index.html
              EOF
  
  tags = {
    Name = "${var.project_name}-web-${count.index + 1}"
  }
}

# Data Sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# variables.tf
variable "region" {
  default = "us-west-2"
}

variable "project_name" {
  default = "my-app"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "instance_type" {
  default = "t2.micro"
}

# outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "web_server_ips" {
  value = aws_instance.web[*].public_ip
}
```

### Deploy

```bash
# Initialize
terraform init

# Validate
terraform validate

# Plan
terraform plan

# Apply
terraform apply -auto-approve

# Test
curl http://$(terraform output -raw web_server_ips | jq -r '.[0]')

# Destroy
terraform destroy -auto-approve
```

---

## 📚 Additional Resources

- [Terraform Documentation](https://www.terraform.io/docs)
- [Terraform Registry](https://registry.terraform.io/)
- [AWS Provider Docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

---

## ✅ Module Checklist

- [ ] Understand IaC principles
- [ ] Master HCL syntax
- [ ] Configure providers
- [ ] Create resources and data sources
- [ ] Use variables and outputs
- [ ] Manage state with remote backend
- [ ] Build reusable modules
- [ ] Use workspaces for environments
- [ ] Complete 3-tier infrastructure exercise

---

**Next Module:** [Module 14: Ansible - Configuration Management](./14_Ansible_Configuration_Management.md) - Automate server configuration! 🔧
