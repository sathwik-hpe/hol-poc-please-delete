# Terraform Fundamentals for Cloud Network Engineers

## Table of Contents
- [Introduction](#introduction)
- [Terraform Basics](#terraform-basics)
- [Core Concepts](#core-concepts)
- [State Management](#state-management)
- [AWS VPC with Terraform](#aws-vpc-with-terraform)
- [Terraform Modules](#terraform-modules)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Introduction

### What is Terraform?

**Terraform** is an Infrastructure as Code (IaC) tool that allows you to define and provision infrastructure using declarative configuration files.

**Key Benefits:**
- **Declarative**: Describe the desired state, Terraform handles the how
- **Cloud-agnostic**: Works with AWS, Azure, GCP, and 100+ providers
- **Version control**: Infrastructure code in Git
- **Reusable**: Modules for common patterns
- **Plan before apply**: Preview changes before execution

### When to Use Terraform vs CloudFormation

| Feature | Terraform | CloudFormation |
|---------|-----------|----------------|
| **Multi-cloud** | ✓ Yes | ✗ AWS only |
| **State management** | Explicit (S3) | Implicit (AWS) |
| **Modules** | HCL modules | Nested stacks |
| **Community** | Large | AWS-focused |
| **Learning curve** | Moderate | Steeper |
| **Cost** | Free (OSS) | Free |

**Use Terraform when:**
- Multi-cloud or hybrid cloud
- Need reusable modules across teams
- Prefer HCL syntax
- Want provider ecosystem (100+ providers)

---

## Terraform Basics

### Installation

```bash
# macOS
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify installation
terraform version
```

### Your First Terraform Configuration

**File: `main.tf`**
```hcl
# Configure the AWS Provider
terraform {
  required_version = ">= 1.0"
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

# Create a VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "my-vpc"
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}

# Output the VPC ID
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}
```

### Terraform Workflow

```bash
# 1. Initialize (download providers)
terraform init

# 2. Format code
terraform fmt

# 3. Validate syntax
terraform validate

# 4. Plan changes (dry run)
terraform plan

# 5. Apply changes
terraform apply

# 6. Show current state
terraform show

# 7. Destroy resources
terraform destroy
```

### Understanding Terraform Commands

**`terraform init`**
- Downloads provider plugins
- Initializes backend (state storage)
- Prepares working directory
- Run after cloning repo or adding new providers

**`terraform plan`**
- Shows what will change
- Creates execution plan
- No actual changes made
- Always run before apply

**`terraform apply`**
- Executes the plan
- Creates/updates/deletes resources
- Updates state file
- Can auto-approve with `-auto-approve` flag

**`terraform destroy`**
- Removes all resources
- Updates state to empty
- Useful for dev/test environments
- Use with caution in production

---

## Core Concepts

### 1. Providers

Providers are plugins that interact with cloud APIs (AWS, Azure, GCP, etc.).

```hcl
# AWS Provider
provider "aws" {
  region  = "us-east-1"
  profile = "default"  # AWS CLI profile
  
  # Optional: Assume role
  assume_role {
    role_arn = "arn:aws:iam::123456789012:role/TerraformRole"
  }
  
  # Default tags applied to all resources
  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = "production"
      Team        = "network-ops"
    }
  }
}

# Multiple provider instances (alias)
provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

# Use aliased provider
resource "aws_vpc" "west" {
  provider   = aws.us_west
  cidr_block = "10.1.0.0/16"
}
```

### 2. Resources

Resources are the infrastructure components you want to create.

```hcl
# Syntax
resource "resource_type" "local_name" {
  argument1 = "value1"
  argument2 = "value2"
}

# Example: EC2 instance
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
  
  tags = {
    Name = "web-server"
  }
}

# Reference resource attributes
# Format: resource_type.local_name.attribute
output "instance_ip" {
  value = aws_instance.web.private_ip
}
```

### 3. Data Sources

Data sources fetch information about existing resources.

```hcl
# Get latest Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Use the AMI ID
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.micro"
}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Use in resource
resource "aws_subnet" "public" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
}
```

### 4. Variables

Variables make your code reusable and configurable.

**File: `variables.tf`**
```hcl
# String variable
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Number variable
variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 2
  
  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 10
    error_message = "Instance count must be between 1 and 10."
  }
}

# Boolean variable
variable "enable_monitoring" {
  description = "Enable detailed monitoring"
  type        = bool
  default     = false
}

# List variable
variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Map variable
variable "instance_types" {
  description = "Instance types per environment"
  type        = map(string)
  default = {
    dev  = "t3.micro"
    prod = "t3.large"
  }
}

# Object variable
variable "vpc_config" {
  description = "VPC configuration"
  type = object({
    cidr_block           = string
    enable_dns_hostnames = bool
    enable_dns_support   = bool
  })
  default = {
    cidr_block           = "10.0.0.0/16"
    enable_dns_hostnames = true
    enable_dns_support   = true
  }
}
```

**Using Variables:**
```hcl
# In main.tf
provider "aws" {
  region = var.region
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_config.cidr_block
  enable_dns_hostnames = var.vpc_config.enable_dns_hostnames
  enable_dns_support   = var.vpc_config.enable_dns_support
}

resource "aws_instance" "app" {
  count         = var.instance_count
  instance_type = var.instance_types["prod"]
  ami           = data.aws_ami.amazon_linux_2.id
  
  monitoring = var.enable_monitoring
}
```

**Providing Variable Values:**

**Method 1: Command line**
```bash
terraform apply -var="region=us-west-2" -var="instance_count=5"
```

**Method 2: terraform.tfvars**
```hcl
# terraform.tfvars
region         = "us-west-2"
instance_count = 5
instance_types = {
  dev  = "t3.small"
  prod = "t3.xlarge"
}
```

**Method 3: Environment variables**
```bash
export TF_VAR_region="us-west-2"
export TF_VAR_instance_count=5
terraform apply
```

### 5. Outputs

Outputs expose values after resources are created.

**File: `outputs.tf`**
```hcl
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}

# Sensitive output (won't show in logs)
output "database_password" {
  description = "Database password"
  value       = random_password.db_password.result
  sensitive   = true
}
```

**Accessing Outputs:**
```bash
# Show all outputs
terraform output

# Show specific output
terraform output vpc_id

# JSON format (for scripting)
terraform output -json

# Use in another Terraform config
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "network/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.network.outputs.private_subnet_ids[0]
}
```

### 6. Locals

Locals are computed values used within a module.

```hcl
locals {
  # Common tags
  common_tags = {
    ManagedBy   = "Terraform"
    Environment = var.environment
    Project     = var.project_name
    Owner       = var.owner_email
  }
  
  # Computed values
  vpc_name = "${var.project_name}-${var.environment}-vpc"
  
  # Conditional expressions
  instance_type = var.environment == "prod" ? "t3.large" : "t3.micro"
  
  # Complex data structures
  subnets = {
    public = [
      { cidr = "10.0.1.0/24", az = "us-east-1a" },
      { cidr = "10.0.2.0/24", az = "us-east-1b" },
      { cidr = "10.0.3.0/24", az = "us-east-1c" }
    ]
    private = [
      { cidr = "10.0.11.0/24", az = "us-east-1a" },
      { cidr = "10.0.12.0/24", az = "us-east-1b" },
      { cidr = "10.0.13.0/24", az = "us-east-1c" }
    ]
  }
}

# Use locals
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  
  tags = merge(
    local.common_tags,
    {
      Name = local.vpc_name
    }
  )
}

resource "aws_instance" "app" {
  instance_type = local.instance_type
  ami           = data.aws_ami.amazon_linux_2.id
  
  tags = local.common_tags
}
```

---

## State Management

### What is Terraform State?

**State file (`terraform.tfstate`)**: JSON file mapping real-world resources to your configuration.

**Why State is Important:**
1. **Tracks resources**: Maps resource names to real IDs
2. **Performance**: Caches resource attributes
3. **Dependencies**: Tracks resource relationships
4. **Locking**: Prevents concurrent modifications

### Local vs Remote State

**Local State (default):**
```bash
# State stored in local file: terraform.tfstate
# Good for: Learning, personal projects
# Bad for: Teams, production
```

**Remote State (recommended):**
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/network/terraform.tfstate"
    region         = "us-east-1"
    
    # State locking
    dynamodb_table = "terraform-locks"
    
    # Encryption
    encrypt = true
    
    # Access control
    acl = "bucket-owner-full-control"
  }
}
```

### Setting Up Remote State Backend

**Step 1: Create S3 bucket and DynamoDB table**
```hcl
# bootstrap.tf (run this first)
resource "aws_s3_bucket" "terraform_state" {
  bucket = "my-terraform-state-${data.aws_caller_identity.current.account_id}"
  
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  
  attribute {
    name = "LockID"
    type = "S"
  }
  
  lifecycle {
    prevent_destroy = true
  }
}
```

**Step 2: Run bootstrap**
```bash
# Deploy S3 and DynamoDB (uses local state initially)
terraform init
terraform apply

# Migrate to remote state
# Add backend configuration to main project
# Run terraform init again
terraform init -migrate-state
```

### State Commands

```bash
# List resources in state
terraform state list

# Show resource details
terraform state show aws_vpc.main

# Move resource (rename)
terraform state mv aws_instance.web aws_instance.app

# Remove resource from state (doesn't delete resource)
terraform state rm aws_instance.old

# Import existing resource
terraform import aws_vpc.main vpc-12345678

# Pull state to stdout
terraform state pull

# Push state from file
terraform state push terraform.tfstate.backup

# Replace provider (after migration)
terraform state replace-provider hashicorp/aws registry.terraform.io/hashicorp/aws
```

### State Locking

**Why Locking?**
Prevents multiple users from running Terraform simultaneously, which could corrupt state.

**How it Works:**
1. User runs `terraform apply`
2. Terraform acquires lock in DynamoDB
3. Terraform makes changes and updates state
4. Terraform releases lock

**Force Unlock (use carefully):**
```bash
# If lock gets stuck
terraform force-unlock <lock-id>
```

### Best Practices for State

✅ **DO:**
- Use remote state for teams
- Enable state locking
- Enable S3 versioning
- Encrypt state at rest
- Restrict IAM access
- Use separate state files per environment
- Backup state regularly

❌ **DON'T:**
- Commit state files to Git
- Manually edit state files
- Share state files via email/Slack
- Store secrets in state (use AWS Secrets Manager)
- Use same state for all environments

---

## AWS VPC with Terraform

Let's build a production-ready VPC step by step.

### Simple VPC

```hcl
# vpc.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "production-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = {
    Name = "production-igw"
  }
}
```

### Adding Subnets

```hcl
# Public subnets
resource "aws_subnet" "public" {
  count                   = 3
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "public-subnet-${count.index + 1}"
    Tier = "public"
  }
}

# Private subnets
resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 11}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  tags = {
    Name = "private-subnet-${count.index + 1}"
    Tier = "private"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}
```

### NAT Gateways and Route Tables

```hcl
# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"
  
  tags = {
    Name = "nat-eip-${count.index + 1}"
  }
  
  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways (one per AZ)
resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = {
    Name = "nat-gateway-${count.index + 1}"
  }
  
  depends_on = [aws_internet_gateway.main]
}

# Public route table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = {
    Name = "public-route-table"
  }
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route tables (one per AZ)
resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  
  tags = {
    Name = "private-route-table-${count.index + 1}"
  }
}

# Associate private subnets with private route tables
resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

### Complete VPC Module

**File structure:**
```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── terraform.tfvars
```

**`versions.tf`**
```hcl
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/vpc/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.region
  
  default_tags {
    tags = {
      ManagedBy   = "Terraform"
      Environment = var.environment
      Project     = var.project_name
    }
  }
}
```

**`variables.tf`**
```hcl
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "myapp"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones_count" {
  description = "Number of availability zones"
  type        = number
  default     = 3
}
```

**`outputs.tf`**
```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ips" {
  description = "NAT Gateway Elastic IPs"
  value       = aws_eip.nat[*].public_ip
}
```

---

## Terraform Modules

Modules are reusable packages of Terraform code.

### Module Structure

```
modules/
└── vpc/
    ├── main.tf       # Resources
    ├── variables.tf  # Input variables
    ├── outputs.tf    # Output values
    └── README.md     # Documentation
```

### Creating a VPC Module

**`modules/vpc/variables.tf`**
```hcl
variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use single NAT Gateway for all AZs"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags"
  type        = map(string)
  default     = {}
}
```

**`modules/vpc/main.tf`** (simplified)
```hcl
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = merge(
    var.tags,
    {
      Name = var.vpc_name
    }
  )
}

resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-public-${var.azs[count.index]}"
      Tier = "public"
    }
  )
}

# ... more resources
```

**`modules/vpc/outputs.tf`**
```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

### Using the Module

**`main.tf`**
```hcl
module "vpc" {
  source = "./modules/vpc"
  
  vpc_name    = "production-vpc"
  vpc_cidr    = "10.0.0.0/16"
  azs         = ["us-east-1a", "us-east-1b", "us-east-1c"]
  
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false
  
  tags = {
    Environment = "production"
    Project     = "myapp"
  }
}

# Use module outputs
resource "aws_security_group" "alb" {
  vpc_id = module.vpc.vpc_id
  
  # ...
}
```

### Public Module Registry

Use community modules from [Terraform Registry](https://registry.terraform.io/):

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
  
  tags = {
    Environment = "production"
  }
}
```

---

## Best Practices

### 1. File Organization

```
project/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   └── prod/
├── modules/
│   ├── vpc/
│   ├── security-groups/
│   └── application/
└── README.md
```

### 2. Naming Conventions

```hcl
# Resources: noun describing the resource
resource "aws_vpc" "main" {}
resource "aws_subnet" "public" {}
resource "aws_security_group" "alb" {}

# Variables: descriptive, use underscores
variable "vpc_cidr_block" {}
variable "enable_monitoring" {}

# Outputs: what it represents
output "vpc_id" {}
output "subnet_ids" {}
```

### 3. Use Variables for Everything Configurable

```hcl
# Bad
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  ami           = "ami-12345678"
}

# Good
resource "aws_instance" "web" {
  instance_type = var.instance_type
  ami           = data.aws_ami.amazon_linux_2.id
}
```

### 4. Use Data Sources for Dynamic Values

```hcl
# Don't hardcode AMI IDs
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]
  
  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

# Don't hardcode availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
```

### 5. Use Locals for Computed Values

```hcl
locals {
  common_tags = {
    ManagedBy   = "Terraform"
    Environment = var.environment
    Project     = var.project_name
  }
  
  vpc_name = "${var.project_name}-${var.environment}-vpc"
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
  
  tags = merge(
    local.common_tags,
    {
      Name = local.vpc_name
    }
  )
}
```

### 6. Use Count and For_each

```hcl
# Count for creating multiple similar resources
resource "aws_subnet" "public" {
  count      = 3
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.${count.index + 1}.0/24"
}

# For_each for creating resources from a map
variable "security_groups" {
  type = map(object({
    description = string
    ingress_rules = list(object({
      from_port   = number
      to_port     = number
      protocol    = string
      cidr_blocks = list(string)
    }))
  }))
}

resource "aws_security_group" "this" {
  for_each = var.security_groups
  
  name        = each.key
  description = each.value.description
  vpc_id      = aws_vpc.main.id
  
  dynamic "ingress" {
    for_each = each.value.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }
}
```

### 7. Use Dynamic Blocks

```hcl
variable "ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id
  
  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = lookup(ingress.value, "description", null)
    }
  }
}
```

### 8. Document Your Code

```hcl
# Use meaningful descriptions
variable "vpc_cidr" {
  description = "CIDR block for VPC. Must be /16 to /28."
  type        = string
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "Must be a valid CIDR block."
  }
}

# Comment complex logic
# Calculate subnet CIDR blocks using cidrsubnet function
# cidrsubnet(prefix, newbits, netnum)
# Example: cidrsubnet("10.0.0.0/16", 8, 0) = "10.0.0.0/24"
locals {
  public_subnets = [
    for i in range(3) :
    cidrsubnet(var.vpc_cidr, 8, i)
  ]
}
```

---

## Interview Questions

### Q1: What is Terraform and how does it work?

**Answer:**
Terraform is an Infrastructure as Code (IaC) tool that uses declarative configuration files to define infrastructure. You describe the desired state, and Terraform determines what needs to change to reach that state.

**How it works:**
1. **Write**: Define infrastructure in `.tf` files using HCL
2. **Plan**: `terraform plan` shows what will change
3. **Apply**: `terraform apply` makes the changes
4. **State**: Terraform tracks current state in a state file

Key components:
- **Providers**: Plugins for cloud APIs (AWS, Azure, GCP)
- **Resources**: Infrastructure components to create
- **State**: JSON file tracking real-world resources
- **Plan**: Execution plan showing changes before applying

### Q2: Explain Terraform state. Why is it important?

**Answer:**
Terraform state is a JSON file (`terraform.tfstate`) that maps your configuration to real-world resources.

**Why important:**
1. **Resource tracking**: Maps `aws_vpc.main` → `vpc-12345678`
2. **Performance**: Caches attributes, no need to query APIs every time
3. **Dependencies**: Tracks resource relationships
4. **Metadata**: Stores resource metadata

**Best practices:**
- Use remote state (S3) for teams
- Enable state locking (DynamoDB)
- Enable versioning on S3 bucket
- Never commit state to Git
- Use separate state files per environment

**Example:**
```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

### Q3: What's the difference between `count` and `for_each`?

**Answer:**

**`count`** - Creates multiple instances using index:
```hcl
resource "aws_subnet" "public" {
  count      = 3
  cidr_block = "10.0.${count.index}.0/24"
}

# Access: aws_subnet.public[0], aws_subnet.public[1], aws_subnet.public[2]
```

**Problem with `count`:** If you remove the first element, all indices shift, causing Terraform to destroy and recreate resources.

**`for_each`** - Creates instances using keys (map or set):
```hcl
variable "subnets" {
  type = map(string)
  default = {
    "public-1" = "10.0.1.0/24"
    "public-2" = "10.0.2.0/24"
  }
}

resource "aws_subnet" "public" {
  for_each   = var.subnets
  cidr_block = each.value
  
  tags = {
    Name = each.key
  }
}

# Access: aws_subnet.public["public-1"], aws_subnet.public["public-2"]
```

**When to use:**
- **`count`**: When order doesn't matter, creating N identical resources
- **`for_each`**: When resources have unique identifiers, avoiding index shifting

### Q4: How do you handle secrets in Terraform?

**Answer:**

**❌ Never do this:**
```hcl
variable "database_password" {
  default = "MySecretPassword123!"  # NEVER hardcode
}
```

**✅ Better approaches:**

**1. Use AWS Secrets Manager:**
```hcl
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/database/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

**2. Use environment variables:**
```bash
export TF_VAR_database_password="secret"
terraform apply
```

**3. Use sensitive variables:**
```hcl
variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

# Mark outputs as sensitive
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
```

**4. Use external secret stores (Vault):**
```hcl
data "vault_generic_secret" "db_password" {
  path = "secret/database/password"
}
```

### Q5: Explain the difference between Terraform and CloudFormation.

**Answer:**

| Feature | Terraform | CloudFormation |
|---------|-----------|----------------|
| **Clouds** | Multi-cloud (AWS, Azure, GCP, 100+) | AWS only |
| **Language** | HCL (declarative) | JSON/YAML |
| **State** | Explicit (S3, Terraform Cloud) | Implicit (AWS manages) |
| **Modules** | HCL modules, Registry | Nested stacks |
| **Drift detection** | `terraform plan` | CloudFormation drift |
| **Community** | Large, multi-cloud | AWS-focused |
| **Cost** | Free (open source) | Free |
| **Rollback** | Manual (`terraform apply` old config) | Automatic |

**When to use Terraform:**
- Multi-cloud or hybrid
- Prefer HCL over JSON/YAML
- Want flexibility and control
- Need community modules

**When to use CloudFormation:**
- AWS-only
- Want deep AWS integration
- Prefer automatic rollback
- No external dependencies

---

**Next Module:** [Python Programming + boto3](02_PYTHON_BOTO3.md)  
**Back to Plan:** [INTERVIEW_PREP_PLAN.md](INTERVIEW_PREP_PLAN.md)
