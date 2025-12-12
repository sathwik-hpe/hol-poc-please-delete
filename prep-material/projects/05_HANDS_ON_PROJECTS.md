# Hands-On Projects: Building a Complete Infrastructure Automation Platform

## Table of Contents
- [Project 1: AWS Network Automation CLI](#project-1-aws-network-automation-cli)
- [Project 2: Terraform Module Library](#project-2-terraform-module-library)
- [Project 3: Self-Service Infrastructure API](#project-3-self-service-infrastructure-api)
- [Project 4: CI/CD Pipeline for Infrastructure](#project-4-cicd-pipeline-for-infrastructure)

---

## Project 1: AWS Network Automation CLI

### Overview
Build a Python CLI tool using `boto3` to automate AWS network provisioning.

### Features
- Create/delete VPCs with subnets
- Manage security groups
- Configure route tables
- List and describe resources
- Export configurations to Terraform

### Project Structure

```
aws-network-cli/
├── README.md
├── requirements.txt
├── setup.py
├── aws_network_cli/
│   ├── __init__.py
│   ├── cli.py              # Click CLI interface
│   ├── vpc.py              # VPC operations
│   ├── subnet.py           # Subnet operations
│   ├── security_group.py   # Security group operations
│   ├── utils.py            # Helper functions
│   └── config.py           # Configuration
└── tests/
    ├── test_vpc.py
    └── test_security_group.py
```

### Implementation

#### requirements.txt
```txt
boto3==1.28.0
click==8.1.0
rich==13.5.0
pydantic==2.0.0
python-dotenv==1.0.0
pytest==7.4.0
```

#### cli.py
```python
"""
AWS Network Automation CLI
Usage: aws-network vpc create --cidr 10.0.0.0/16 --name my-vpc
"""

import click
from rich.console import Console
from rich.table import Table
from .vpc import VPCManager
from .subnet import SubnetManager
from .security_group import SecurityGroupManager

console = Console()

@click.group()
def cli():
    """AWS Network Automation CLI"""
    pass

# VPC Commands
@cli.group()
def vpc():
    """VPC management commands"""
    pass

@vpc.command()
@click.option('--cidr', required=True, help='CIDR block (e.g., 10.0.0.0/16)')
@click.option('--name', required=True, help='VPC name')
@click.option('--region', default='us-east-1', help='AWS region')
def create(cidr, name, region):
    """Create a new VPC"""
    try:
        manager = VPCManager(region=region)
        vpc = manager.create_vpc(cidr_block=cidr, name=name)
        
        console.print(f"[green]✓[/green] Created VPC: {vpc['VpcId']}")
        console.print(f"  CIDR: {vpc['CidrBlock']}")
        console.print(f"  Name: {name}")
    except Exception as e:
        console.print(f"[red]✗[/red] Error: {e}")

@vpc.command()
@click.option('--region', default='us-east-1', help='AWS region')
def list(region):
    """List all VPCs"""
    try:
        manager = VPCManager(region=region)
        vpcs = manager.list_vpcs()
        
        table = Table(title="VPCs")
        table.add_column("VPC ID")
        table.add_column("CIDR")
        table.add_column("State")
        table.add_column("Name")
        
        for vpc in vpcs:
            name = next(
                (tag['Value'] for tag in vpc.get('Tags', []) 
                 if tag['Key'] == 'Name'),
                '-'
            )
            table.add_row(
                vpc['VpcId'],
                vpc['CidrBlock'],
                vpc['State'],
                name
            )
        
        console.print(table)
    except Exception as e:
        console.print(f"[red]✗[/red] Error: {e}")

@vpc.command()
@click.argument('vpc-id')
def delete(vpc_id):
    """Delete a VPC"""
    if click.confirm(f"Delete VPC {vpc_id}?"):
        try:
            manager = VPCManager()
            manager.delete_vpc(vpc_id)
            console.print(f"[green]✓[/green] Deleted VPC: {vpc_id}")
        except Exception as e:
            console.print(f"[red]✗[/red] Error: {e}")

# Subnet Commands
@cli.group()
def subnet():
    """Subnet management commands"""
    pass

@subnet.command()
@click.option('--vpc-id', required=True, help='VPC ID')
@click.option('--cidr', required=True, help='Subnet CIDR')
@click.option('--az', required=True, help='Availability zone')
@click.option('--name', required=True, help='Subnet name')
@click.option('--public/--private', default=False, help='Public subnet')
def create(vpc_id, cidr, az, name, public):
    """Create a subnet"""
    try:
        manager = SubnetManager()
        subnet = manager.create_subnet(
            vpc_id=vpc_id,
            cidr_block=cidr,
            availability_zone=az,
            name=name,
            map_public_ip=public
        )
        
        console.print(f"[green]✓[/green] Created subnet: {subnet['SubnetId']}")
        console.print(f"  Type: {'Public' if public else 'Private'}")
    except Exception as e:
        console.print(f"[red]✗[/red] Error: {e}")

# Security Group Commands
@cli.group()
def sg():
    """Security group management commands"""
    pass

@sg.command()
@click.option('--vpc-id', required=True, help='VPC ID')
@click.option('--name', required=True, help='Security group name')
@click.option('--description', required=True, help='Description')
def create(vpc_id, name, description):
    """Create a security group"""
    try:
        manager = SecurityGroupManager()
        sg = manager.create_security_group(
            vpc_id=vpc_id,
            name=name,
            description=description
        )
        
        console.print(f"[green]✓[/green] Created security group: {sg['GroupId']}")
    except Exception as e:
        console.print(f"[red]✗[/red] Error: {e}")

@sg.command()
@click.argument('sg-id')
@click.option('--protocol', required=True, help='Protocol (tcp/udp/icmp)')
@click.option('--port', required=True, type=int, help='Port number')
@click.option('--cidr', required=True, help='Source CIDR')
@click.option('--description', default='', help='Rule description')
def add_rule(sg_id, protocol, port, cidr, description):
    """Add ingress rule to security group"""
    try:
        manager = SecurityGroupManager()
        manager.add_ingress_rule(
            sg_id=sg_id,
            protocol=protocol,
            from_port=port,
            to_port=port,
            cidr_blocks=[cidr],
            description=description
        )
        
        console.print(f"[green]✓[/green] Added rule to {sg_id}")
    except Exception as e:
        console.print(f"[red]✗[/red] Error: {e}")

if __name__ == '__main__':
    cli()
```

#### vpc.py
```python
"""VPC management operations"""

import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class VPCManager:
    """Manage AWS VPC operations"""
    
    def __init__(self, region: str = 'us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.region = region
    
    def create_vpc(
        self, 
        cidr_block: str, 
        name: str,
        enable_dns_hostnames: bool = True,
        enable_dns_support: bool = True
    ) -> Dict:
        """
        Create a VPC with specified configuration
        
        Args:
            cidr_block: VPC CIDR block (e.g., '10.0.0.0/16')
            name: VPC name tag
            enable_dns_hostnames: Enable DNS hostnames
            enable_dns_support: Enable DNS support
        
        Returns:
            VPC details dictionary
        """
        try:
            # Create VPC
            response = self.ec2.create_vpc(
                CidrBlock=cidr_block,
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc',
                        'Tags': [
                            {'Key': 'Name', 'Value': name},
                            {'Key': 'ManagedBy', 'Value': 'aws-network-cli'}
                        ]
                    }
                ]
            )
            
            vpc = response['Vpc']
            vpc_id = vpc['VpcId']
            
            logger.info(f"Created VPC: {vpc_id}")
            
            # Wait for VPC to be available
            waiter = self.ec2.get_waiter('vpc_available')
            waiter.wait(VpcIds=[vpc_id])
            
            # Enable DNS hostnames
            if enable_dns_hostnames:
                self.ec2.modify_vpc_attribute(
                    VpcId=vpc_id,
                    EnableDnsHostnames={'Value': True}
                )
                logger.info(f"Enabled DNS hostnames for {vpc_id}")
            
            # Enable DNS support
            if enable_dns_support:
                self.ec2.modify_vpc_attribute(
                    VpcId=vpc_id,
                    EnableDnsSupport={'Value': True}
                )
                logger.info(f"Enabled DNS support for {vpc_id}")
            
            return vpc
            
        except ClientError as e:
            logger.error(f"Failed to create VPC: {e}")
            raise
    
    def list_vpcs(self, filters: Optional[List[Dict]] = None) -> List[Dict]:
        """
        List all VPCs
        
        Args:
            filters: Optional filters (e.g., [{'Name': 'state', 'Values': ['available']}])
        
        Returns:
            List of VPC dictionaries
        """
        try:
            response = self.ec2.describe_vpcs(Filters=filters or [])
            return response['Vpcs']
        except ClientError as e:
            logger.error(f"Failed to list VPCs: {e}")
            raise
    
    def get_vpc(self, vpc_id: str) -> Dict:
        """Get VPC by ID"""
        try:
            response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            vpcs = response['Vpcs']
            
            if not vpcs:
                raise ValueError(f"VPC {vpc_id} not found")
            
            return vpcs[0]
        except ClientError as e:
            logger.error(f"Failed to get VPC {vpc_id}: {e}")
            raise
    
    def delete_vpc(self, vpc_id: str):
        """
        Delete a VPC
        
        Note: VPC must not have dependencies (subnets, IGW, etc.)
        """
        try:
            self.ec2.delete_vpc(VpcId=vpc_id)
            logger.info(f"Deleted VPC: {vpc_id}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'DependencyViolation':
                raise ValueError(
                    f"VPC {vpc_id} has dependencies. "
                    "Delete subnets, IGW, etc. first."
                )
            logger.error(f"Failed to delete VPC {vpc_id}: {e}")
            raise
    
    def export_to_terraform(self, vpc_id: str) -> str:
        """Export VPC configuration as Terraform code"""
        vpc = self.get_vpc(vpc_id)
        
        name = next(
            (tag['Value'] for tag in vpc.get('Tags', []) 
             if tag['Key'] == 'Name'),
            'vpc'
        )
        
        tf_code = f'''
resource "aws_vpc" "{name}" {{
  cidr_block           = "{vpc['CidrBlock']}"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {{
    Name = "{name}"
  }}
}}
'''
        return tf_code
```

#### security_group.py
```python
"""Security group management operations"""

import boto3
from botocore.exceptions import ClientError
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class SecurityGroupManager:
    """Manage AWS Security Groups"""
    
    def __init__(self, region: str = 'us-east-1'):
        self.ec2 = boto3.client('ec2', region_name=region)
    
    def create_security_group(
        self,
        vpc_id: str,
        name: str,
        description: str
    ) -> Dict:
        """Create a security group"""
        try:
            response = self.ec2.create_security_group(
                GroupName=name,
                Description=description,
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [
                            {'Key': 'Name', 'Value': name},
                            {'Key': 'ManagedBy', 'Value': 'aws-network-cli'}
                        ]
                    }
                ]
            )
            
            sg_id = response['GroupId']
            logger.info(f"Created security group: {sg_id}")
            
            return response
            
        except ClientError as e:
            logger.error(f"Failed to create security group: {e}")
            raise
    
    def add_ingress_rule(
        self,
        sg_id: str,
        protocol: str,
        from_port: int,
        to_port: int,
        cidr_blocks: List[str],
        description: str = ''
    ):
        """Add ingress rule to security group"""
        try:
            self.ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[
                    {
                        'IpProtocol': protocol,
                        'FromPort': from_port,
                        'ToPort': to_port,
                        'IpRanges': [
                            {
                                'CidrIp': cidr,
                                'Description': description
                            }
                            for cidr in cidr_blocks
                        ]
                    }
                ]
            )
            
            logger.info(f"Added ingress rule to {sg_id}")
            
        except ClientError as e:
            logger.error(f"Failed to add ingress rule: {e}")
            raise
    
    def list_security_groups(self, vpc_id: str = None) -> List[Dict]:
        """List security groups"""
        try:
            filters = []
            if vpc_id:
                filters.append({'Name': 'vpc-id', 'Values': [vpc_id]})
            
            response = self.ec2.describe_security_groups(Filters=filters)
            return response['SecurityGroups']
            
        except ClientError as e:
            logger.error(f"Failed to list security groups: {e}")
            raise
```

---

## Project 2: Terraform Module Library

### Overview
Create reusable Terraform modules for common infrastructure patterns.

### Module Structure

```
terraform-modules/
├── README.md
├── modules/
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── application-stack/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── security-baseline/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── README.md
└── examples/
    ├── complete-infrastructure/
    │   ├── main.tf
    │   ├── terraform.tfvars
    │   └── README.md
    └── multi-region/
        ├── main.tf
        └── terraform.tfvars
```

### Module 1: VPC Module

#### modules/vpc/main.tf
```hcl
# VPC Module - Creates a complete VPC with subnets, NAT gateways, etc.

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    var.tags,
    {
      Name = var.vpc_name
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-igw"
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-public-${var.availability_zones[count.index]}"
      Tier = "public"
    }
  )
}

# Private Subnets
resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-private-${var.availability_zones[count.index]}"
      Tier = "private"
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = var.enable_nat_gateway ? length(var.availability_zones) : 0

  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-eip-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? length(var.availability_zones) : 0

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-nat-${count.index + 1}"
    }
  )
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-public"
    }
  )
}

# Public Route to Internet
resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

# Associate public subnets with public route table
resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Tables (one per AZ)
resource "aws_route_table" "private" {
  count = length(var.availability_zones)

  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-private-${var.availability_zones[count.index]}"
    }
  )
}

# Private Routes to NAT Gateway
resource "aws_route" "private_nat" {
  count = var.enable_nat_gateway ? length(var.availability_zones) : 0

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[count.index].id
}

# Associate private subnets with private route tables
resource "aws_route_table_association" "private" {
  count = length(aws_subnet.private)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs (optional)
resource "aws_flow_log" "main" {
  count = var.enable_flow_logs ? 1 : 0

  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.vpc_name}-flow-logs"
    }
  )
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name              = "/aws/vpc/${var.vpc_name}"
  retention_in_days = var.flow_logs_retention_days

  tags = var.tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.vpc_name}-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0

  name = "${var.vpc_name}-flow-logs-policy"
  role = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}
```

#### modules/vpc/variables.tf
```hcl
variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "vpc_cidr must be a valid CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in VPC"
  type        = bool
  default     = true
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = false
}

variable "flow_logs_retention_days" {
  description = "Flow logs retention in days"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
```

#### modules/vpc/outputs.tf
```hcl
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "IDs of NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "internet_gateway_id" {
  description = "ID of Internet Gateway"
  value       = aws_internet_gateway.main.id
}

output "public_route_table_id" {
  description = "ID of public route table"
  value       = aws_route_table.public.id
}

output "private_route_table_ids" {
  description = "IDs of private route tables"
  value       = aws_route_table.private[*].id
}
```

### Module 2: Application Stack Module

#### modules/application-stack/main.tf
```hcl
# Application Stack Module
# Creates: ALB, Target Group, Auto Scaling Group, Launch Template

terraform {
  required_version = ">= 1.0"
}

# Security Group for ALB
resource "aws_security_group" "alb" {
  name_description = "${var.app_name}-alb-sg"
  vpc_id          = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.app_name}-alb-sg"
    }
  )
}

# Security Group for Application
resource "aws_security_group" "app" {
  name_description = "${var.app_name}-app-sg"
  vpc_id          = var.vpc_id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Traffic from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.app_name}-app-sg"
    }
  )
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.enable_deletion_protection

  tags = merge(
    var.tags,
    {
      Name = "${var.app_name}-alb"
    }
  )
}

# Target Group
resource "aws_lb_target_group" "main" {
  name     = "${var.app_name}-tg"
  port     = var.app_port
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = var.health_check_path
    matcher             = "200"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.app_name}-tg"
    }
  )
}

# ALB Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}

# Launch Template
resource "aws_launch_template" "main" {
  name_prefix   = "${var.app_name}-lt-"
  image_id      = var.ami_id
  instance_type = var.instance_type

  vpc_security_group_ids = [aws_security_group.app.id]

  user_data = base64encode(var.user_data)

  tag_specifications {
    resource_type = "instance"
    tags = merge(
      var.tags,
      {
        Name = "${var.app_name}-instance"
      }
    )
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "main" {
  name = "${var.app_name}-asg"

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  vpc_zone_identifier = var.private_subnet_ids
  target_group_arns   = [aws_lb_target_group.main.arn]

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "${var.app_name}-asg-instance"
    propagate_at_launch = true
  }

  dynamic "tag" {
    for_each = var.tags
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }
}

# Auto Scaling Policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${var.app_name}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${var.app_name}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = aws_autoscaling_group.main.name
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.app_name}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_up.arn]
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "${var.app_name}-cpu-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "20"

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.main.name
  }

  alarm_actions = [aws_autoscaling_policy.scale_down.arn]
}
```

### Using the Modules

#### examples/complete-infrastructure/main.tf
```hcl
terraform {
  required_version = ">= 1.0"

  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# Create VPC using module
module "vpc" {
  source = "../../modules/vpc"

  vpc_name           = "${var.project_name}-${var.environment}"
  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
  enable_nat_gateway = true
  enable_flow_logs   = true

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Create application stack using module
module "web_app" {
  source = "../../modules/application-stack"

  app_name            = "web-app"
  vpc_id              = module.vpc.vpc_id
  public_subnet_ids   = module.vpc.public_subnet_ids
  private_subnet_ids  = module.vpc.private_subnet_ids
  
  ami_id        = var.web_app_ami
  instance_type = var.web_app_instance_type
  app_port      = 8080
  
  min_size         = 2
  max_size         = 10
  desired_capacity = 2
  
  health_check_path = "/health"
  
  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y docker
              systemctl start docker
              docker run -d -p 8080:8080 myapp:latest
              EOF

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "alb_dns_name" {
  value = module.web_app.alb_dns_name
}
```

---

## Project 3: Self-Service Infrastructure API

### Overview
Complete FastAPI application that combines Terraform and boto3 for self-service infrastructure provisioning.

### Project Structure

```
infrastructure-api/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── vpc.py
│   │   ├── security_groups.py
│   │   └── infrastructure.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── vpc.py
│   │   └── infrastructure.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── aws_service.py
│   │   └── terraform_service.py
│   └── core/
│       ├── __init__.py
│       ├── config.py
│       └── auth.py
├── terraform_templates/
│   ├── vpc/
│   └── full_stack/
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### Main Application

#### app/main.py
```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time

from .api import vpc, security_groups, infrastructure
from .core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Infrastructure Automation API",
    description="Self-service API for AWS infrastructure provisioning",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"completed in {process_time:.3f}s "
        f"with status {response.status_code}"
    )
    
    return response

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0"
    }

# Include routers
app.include_router(
    vpc.router,
    prefix="/api/v1/vpcs",
    tags=["VPCs"]
)

app.include_router(
    security_groups.router,
    prefix="/api/v1/security-groups",
    tags=["Security Groups"]
)

app.include_router(
    infrastructure.router,
    prefix="/api/v1/infrastructure",
    tags=["Infrastructure"]
)

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "detail": f"Resource at {request.url.path} not found"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    logger.error(f"Internal error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

#### app/services/terraform_service.py
```python
"""Terraform execution service"""

import subprocess
import json
import tempfile
import shutil
from pathlib import Path
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class TerraformService:
    """Execute Terraform operations"""
    
    def __init__(self, working_dir: Path = None):
        self.working_dir = working_dir or Path(tempfile.mkdtemp())
    
    def init(self) -> Dict:
        """Run terraform init"""
        result = self._run_command(["terraform", "init", "-no-color"])
        return {
            "success": result.returncode == 0,
            "output": result.stdout
        }
    
    def plan(self, var_file: Path = None) -> Dict:
        """Run terraform plan"""
        cmd = ["terraform", "plan", "-no-color", "-out=tfplan"]
        if var_file:
            cmd.extend(["-var-file", str(var_file)])
        
        result = self._run_command(cmd)
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "changes": self._parse_plan_output(result.stdout)
        }
    
    def apply(self) -> Dict:
        """Run terraform apply"""
        result = self._run_command([
            "terraform", "apply",
            "-no-color",
            "-auto-approve",
            "tfplan"
        ])
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "outputs": self._get_outputs() if result.returncode == 0 else {}
        }
    
    def destroy(self, var_file: Path = None) -> Dict:
        """Run terraform destroy"""
        cmd = ["terraform", "destroy", "-no-color", "-auto-approve"]
        if var_file:
            cmd.extend(["-var-file", str(var_file)])
        
        result = self._run_command(cmd)
        return {
            "success": result.returncode == 0,
            "output": result.stdout
        }
    
    def _run_command(self, cmd: List[str]) -> subprocess.CompletedProcess:
        """Run terraform command"""
        logger.info(f"Running: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            logger.error(f"Command failed: {result.stderr}")
        
        return result
    
    def _get_outputs(self) -> Dict:
        """Get terraform outputs"""
        result = self._run_command([
            "terraform", "output", "-json"
        ])
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        return {}
    
    def _parse_plan_output(self, output: str) -> Dict:
        """Parse plan output to extract changes"""
        # Simplified parsing
        return {
            "to_create": output.count("will be created"),
            "to_update": output.count("will be updated"),
            "to_destroy": output.count("will be destroyed")
        }
    
    def cleanup(self):
        """Clean up working directory"""
        if self.working_dir.exists():
            shutil.rmtree(self.working_dir)
```

---

## Project 4: CI/CD Pipeline for Infrastructure

### Jenkins Pipeline Library

#### vars/infrastructurePipeline.groovy
```groovy
#!/usr/bin/env groovy

def call(Map config) {
    pipeline {
        agent any
        
        parameters {
            choice(
                name: 'ACTION',
                choices: ['plan', 'apply', 'destroy'],
                description: 'Terraform action to perform'
            )
            choice(
                name: 'ENVIRONMENT',
                choices: ['dev', 'staging', 'prod'],
                description: 'Environment to deploy to'
            )
            booleanParam(
                name: 'AUTO_APPROVE',
                defaultValue: false,
                description: 'Auto-approve apply/destroy'
            )
        }
        
        environment {
            AWS_REGION = config.aws_region ?: 'us-east-1'
            TF_VERSION = config.tf_version ?: '1.6.0'
            PROJECT_NAME = config.project_name
        }
        
        stages {
            stage('Checkout') {
                steps {
                    checkout scm
                }
            }
            
            stage('Setup') {
                steps {
                    script {
                        sh """
                            wget https://releases.hashicorp.com/terraform/${TF_VERSION}/terraform_${TF_VERSION}_linux_amd64.zip
                            unzip terraform_${TF_VERSION}_linux_amd64.zip
                            chmod +x terraform
                            sudo mv terraform /usr/local/bin/
                        """
                    }
                }
            }
            
            stage('Terraform Init') {
                steps {
                    dir('terraform') {
                        withAWS(credentials: 'aws-credentials') {
                            sh """
                                terraform init \
                                    -backend-config="key=${PROJECT_NAME}/${ENVIRONMENT}/terraform.tfstate"
                            """
                        }
                    }
                }
            }
            
            stage('Terraform Validate') {
                steps {
                    dir('terraform') {
                        sh 'terraform validate'
                    }
                }
            }
            
            stage('Terraform Plan') {
                when {
                    expression { params.ACTION in ['plan', 'apply'] }
                }
                steps {
                    dir('terraform') {
                        withAWS(credentials: 'aws-credentials') {
                            sh """
                                terraform plan \
                                    -var-file="environments/${ENVIRONMENT}.tfvars" \
                                    -out=tfplan
                            """
                        }
                    }
                }
            }
            
            stage('Approval') {
                when {
                    expression {
                        params.ACTION in ['apply', 'destroy'] && 
                        !params.AUTO_APPROVE
                    }
                }
                steps {
                    script {
                        def action = params.ACTION.toUpperCase()
                        input message: "Proceed with ${action} on ${ENVIRONMENT}?",
                              ok: "Yes, ${action}"
                    }
                }
            }
            
            stage('Terraform Apply') {
                when {
                    expression { params.ACTION == 'apply' }
                }
                steps {
                    dir('terraform') {
                        withAWS(credentials: 'aws-credentials') {
                            sh 'terraform apply -auto-approve tfplan'
                        }
                    }
                }
            }
            
            stage('Terraform Destroy') {
                when {
                    expression { params.ACTION == 'destroy' }
                }
                steps {
                    dir('terraform') {
                        withAWS(credentials: 'aws-credentials') {
                            sh """
                                terraform destroy \
                                    -var-file="environments/${ENVIRONMENT}.tfvars" \
                                    -auto-approve
                            """
                        }
                    }
                }
            }
            
            stage('Outputs') {
                when {
                    expression { params.ACTION == 'apply' }
                }
                steps {
                    dir('terraform') {
                        script {
                            def outputs = sh(
                                script: 'terraform output -json',
                                returnStdout: true
                            ).trim()
                            
                            writeFile file: 'outputs.json', text: outputs
                            archiveArtifacts artifacts: 'outputs.json'
                        }
                    }
                }
            }
        }
        
        post {
            always {
                cleanWs()
            }
            success {
                echo "Infrastructure ${params.ACTION} completed successfully!"
            }
            failure {
                echo "Infrastructure ${params.ACTION} failed!"
            }
        }
    }
}
```

### Using the Pipeline Library

#### Jenkinsfile
```groovy
@Library('infrastructure-pipeline') _

infrastructurePipeline(
    aws_region: 'us-east-1',
    tf_version: '1.6.0',
    project_name: 'my-project'
)
```

---

## Summary

You now have 4 complete hands-on projects:

1. **AWS Network CLI** - Python CLI for network automation
2. **Terraform Modules** - Reusable infrastructure modules
3. **Self-Service API** - FastAPI + Terraform + boto3
4. **CI/CD Pipeline** - Jenkins pipeline for infrastructure

These projects demonstrate all the skills required for the Senior Cloud Developer role!

**Next Module:** [Interview Questions & Answers](06_INTERVIEW_QA.md)  
**Previous Module:** [API Development](04_API_DEVELOPMENT.md)  
**Back to Plan:** [INTERVIEW_PREP_PLAN.md](../INTERVIEW_PREP_PLAN.md)
