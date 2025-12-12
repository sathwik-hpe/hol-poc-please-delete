# Terraform Advanced (Infrastructure as Code) 🏗️

## Critical for Fidelity Role

Job requires **"Terraform and AWS CloudFormation"** - Terraform is ESSENTIAL!

---

## 1. Terraform Basics

### HCL Syntax

```hcl
# Provider configuration
provider "aws" {
  region = "us-east-1"
}

# Resource: VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# Data source: Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# Output
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}
```

---

## 2. Modules (Reusable Infrastructure)

### Module Structure

```
modules/
└── vpc/
    ├── main.tf        # Resources
    ├── variables.tf   # Input variables
    ├── outputs.tf     # Outputs
    └── README.md      # Documentation
```

### VPC Module Example

**modules/vpc/variables.tf:**
```hcl
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "azs" {
  description = "Availability zones"
  type        = list(string)
}
```

**modules/vpc/main.tf:**
```hcl
resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 1)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${var.environment}-public-${var.azs[count.index]}"
    Type = "Public"
  }
}

resource "aws_subnet" "private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 11)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${var.environment}-private-${var.azs[count.index]}"
    Type = "Private"
  }
}
```

**modules/vpc/outputs.tf:**
```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}
```

### Using the Module

**main.tf:**
```hcl
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
  azs         = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

# Use module outputs
resource "aws_security_group" "web" {
  vpc_id = module.vpc.vpc_id
  # ... rest of configuration
}
```

---

## 3. State Management

### Remote Backend (S3 + DynamoDB)

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # For state locking
  }
}

# State locking prevents concurrent modifications
# DynamoDB table needs "LockID" primary key
```

### State Commands

```bash
# Initialize backend
terraform init

# View state
terraform state list
terraform state show aws_vpc.main

# Move resource in state
terraform state mv aws_instance.old aws_instance.new

# Remove from state (doesn't delete resource!)
terraform state rm aws_instance.test

# Import existing resource
terraform import aws_vpc.main vpc-12345

# Refresh state from actual infrastructure
terraform refresh
```

---

## 4. Workspaces (Multi-Environment)

```bash
# Create workspaces
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# List workspaces
terraform workspace list

# Switch workspace
terraform workspace select production

# Current workspace
terraform workspace show
```

**Use workspace in code:**
```hcl
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidrs[terraform.workspace]

  tags = {
    Environment = terraform.workspace
  }
}

variable "vpc_cidrs" {
  type = map(string)
  default = {
    dev        = "10.0.0.0/16"
    staging    = "10.1.0.0/16"
    production = "10.2.0.0/16"
  }
}
```

---

## 5. Advanced Patterns

### For_each vs Count

```hcl
# Count: Use for simple lists
resource "aws_subnet" "example" {
  count      = 3
  cidr_block = cidrsubnet("10.0.0.0/16", 8, count.index)
  # Problem: Changing list order recreates resources!
}

# For_each: Use for maps/sets (better!)
resource "aws_subnet" "example" {
  for_each   = toset(["web", "app", "db"])
  cidr_block = cidrsubnet("10.0.0.0/16", 8, index(["web", "app", "db"], each.key))

  tags = {
    Name = "${each.key}-subnet"
  }
}

# Access outputs
output "subnet_ids" {
  value = { for k, v in aws_subnet.example : k => v.id }
  # Result: { web = "subnet-123", app = "subnet-456", db = "subnet-789" }
}
```

### Dynamic Blocks

```hcl
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id

  # Dynamic ingress rules
  dynamic "ingress" {
    for_each = var.ingress_rules

    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
      description = ingress.value.description
    }
  }
}

variable "ingress_rules" {
  type = list(object({
    port        = number
    protocol    = string
    cidr_blocks = list(string)
    description = string
  }))

  default = [
    {
      port        = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTPS"
    },
    {
      port        = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
      description = "HTTP"
    }
  ]
}
```

---

## 6. Multi-Cloud (AWS + Azure)

```hcl
# providers.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

provider "azurerm" {
  features {}
}

# AWS VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# Azure VNet
resource "azurerm_virtual_network" "main" {
  name                = "production-vnet"
  resource_group_name = azurerm_resource_group.main.name
  location            = "East US"
  address_space       = ["10.1.0.0/16"]
}
```

---

## 7. Testing and Validation

### Terraform Validate

```bash
# Validate syntax
terraform validate

# Format code
terraform fmt -recursive

# Show plan (dry run)
terraform plan

# Show plan with detailed diff
terraform plan -out=tfplan
terraform show tfplan
```

### Policy as Code (Sentinel)

```hcl
# sentinel.hcl
policy "require-vpc-tags" {
  enforcement_level = "hard-mandatory"
}

# require-vpc-tags.sentinel
import "tfplan/v2" as tfplan

# Ensure all VPCs have required tags
main = rule {
  all tfplan.resource_changes as _, rc {
    rc.type is "aws_vpc" implies
      rc.change.after.tags contains "Environment" and
      rc.change.after.tags contains "ManagedBy"
  }
}
```

---

## 8. Interview Questions

**Q: How do you handle secrets in Terraform?**
```hcl
# Option 1: AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "production/db/password"
}

resource "aws_db_instance" "main" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
  # DON'T: password = "hardcoded_password"
}

# Option 2: Environment variables
variable "db_password" {
  type      = string
  sensitive = true
}
# Set via: export TF_VAR_db_password=xxx

# Option 3: HashiCorp Vault
data "vault_generic_secret" "db_creds" {
  path = "secret/database/production"
}
```

**Q: How do you prevent resource deletion?**
```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  lifecycle {
    prevent_destroy = true  # Terraform will error if you try to destroy
  }
}

resource "aws_instance" "web" {
  ami           = "ami-12345"
  instance_type = "t3.micro"

  lifecycle {
    create_before_destroy = true  # Create new before destroying old
  }
}
```

**Q: How do you manage Terraform in a team?**
```
1. Remote state (S3 + DynamoDB locking)
2. State locking (prevents concurrent runs)
3. Pull request reviews for terraform plan
4. CI/CD integration (terraform validate, plan, apply)
5. Module versioning (Git tags)
6. Separate workspaces/accounts per environment
```

---

## 9. Best Practices

✅ **Use modules** for reusable infrastructure  
✅ **Remote state** with locking (S3 + DynamoDB)  
✅ **Version providers** (`required_providers`)  
✅ **Separate environments** (workspaces or separate state files)  
✅ **Never commit** `.tfstate` or secrets  
✅ **Use `for_each`** over `count` for stability  
✅ **Tag everything** for cost tracking and organization  
✅ **Plan before apply** always!  

---

## Key Takeaways

✅ **Modules**: Reusable, versioned infrastructure components  
✅ **State Management**: Remote backend with locking for team collaboration  
✅ **Multi-Cloud**: Single tool for AWS, Azure, GCP  
✅ **Validation**: `terraform validate`, `fmt`, `plan` before apply  

**Your HPE Advantage**: Terraform/Ansible experience - emphasize in interview!

**Next**: AWS CloudFormation
