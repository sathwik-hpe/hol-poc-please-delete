# Hands-On Exercises & Labs

## Table of Contents
- [Exercise 1: VPC Setup with Multi-AZ](#exercise-1-vpc-setup-with-multi-az)
- [Exercise 2: Configure Security Groups & NACLs](#exercise-2-configure-security-groups--nacls)
- [Exercise 3: Deploy Application Load Balancer](#exercise-3-deploy-application-load-balancer)
- [Exercise 4: Implement Auto Scaling](#exercise-4-implement-auto-scaling)
- [Exercise 5: Setup DNS with Failover](#exercise-5-setup-dns-with-failover)
- [Exercise 6: Configure Web Proxy with Nginx](#exercise-6-configure-web-proxy-with-nginx)
- [Exercise 7: Multi-Region Architecture](#exercise-7-multi-region-architecture)
- [Troubleshooting Scenarios](#troubleshooting-scenarios)

---

## Exercise 1: VPC Setup with Multi-AZ

### Objective
Create a production-ready VPC with public, private, and database subnets across 3 availability zones.

### Requirements
- VPC CIDR: 10.0.0.0/16
- 3 Availability Zones
- Public subnets (for load balancers)
- Private subnets (for application servers)
- Database subnets (for RDS)
- NAT Gateways for private subnet internet access
- VPC Flow Logs

### Solution

**Step 1: Create VPC using Terraform**

```hcl
# main.tf
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

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "production-vpc"
    Environment = "production"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "production-igw"
  }
}

# Public Subnets
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

# Private Subnets
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

# Database Subnets
resource "aws_subnet" "database" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 21}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "database-subnet-${count.index + 1}"
    Tier = "database"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "nat-eip-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways (one per AZ for high availability)
resource "aws_nat_gateway" "main" {
  count         = 3
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
    Name = "public-route-table"
  }
}

# Route Table Association for Public Subnets
resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Tables for Private Subnets (one per AZ)
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

# Route Table Association for Private Subnets
resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Route Table for Database Subnets
resource "aws_route_table" "database" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "database-route-table"
  }
}

# Route Table Association for Database Subnets
resource "aws_route_table_association" "database" {
  count          = 3
  subnet_id      = aws_subnet.database[count.index].id
  route_table_id = aws_route_table.database.id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name = "vpc-flow-logs"
  }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flow-logs"
  retention_in_days = 7

  tags = {
    Name = "vpc-flow-logs"
  }
}

resource "aws_iam_role" "flow_logs" {
  name = "vpc-flow-logs-role"

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
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "vpc-flow-logs-policy"
  role = aws_iam_role.flow_logs.id

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

# Data source for availability zones
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

output "database_subnet_ids" {
  value = aws_subnet.database[*].id
}

output "nat_gateway_ips" {
  value = aws_eip.nat[*].public_ip
}
```

**Step 2: Deploy**

```bash
# Initialize Terraform
terraform init

# Validate configuration
terraform validate

# Plan deployment
terraform plan

# Apply changes
terraform apply

# View outputs
terraform output
```

**Step 3: Verify**

```bash
# Verify VPC created
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=production-vpc"

# Verify subnets
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<vpc-id>"

# Verify NAT gateways
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=<vpc-id>"

# Verify route tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=<vpc-id>"

# Check VPC Flow Logs
aws logs describe-log-groups --log-group-name-prefix "/aws/vpc"
```

### Validation Checklist
- [ ] VPC created with correct CIDR block
- [ ] 3 public, 3 private, 3 database subnets
- [ ] Subnets distributed across 3 AZs
- [ ] Internet Gateway attached
- [ ] 3 NAT Gateways (one per AZ)
- [ ] Route tables configured correctly
- [ ] VPC Flow Logs enabled

---

## Exercise 2: Configure Security Groups & NACLs

### Objective
Implement security group architecture for a 3-tier web application with Network ACLs as an additional layer.

### Architecture
```
Internet → ALB (SG: allow 80, 443) 
           ↓
      Web Tier (SG: allow ALB only)
           ↓
      App Tier (SG: allow Web Tier only)
           ↓
      Database (SG: allow App Tier only)
```

### Solution

**Step 1: Create Security Groups**

```hcl
# security-groups.tf

# ALB Security Group
resource "aws_security_group" "alb" {
  name_prefix = "alb-sg-"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "alb-security-group"
    Tier = "loadbalancer"
  }
}

# Web Tier Security Group
resource "aws_security_group" "web" {
  name_prefix = "web-sg-"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "HTTPS from ALB"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-security-group"
    Tier = "web"
  }
}

# App Tier Security Group
resource "aws_security_group" "app" {
  name_prefix = "app-sg-"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Application port from web tier"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "app-security-group"
    Tier = "application"
  }
}

# Database Security Group
resource "aws_security_group" "database" {
  name_prefix = "db-sg-"
  description = "Security group for database"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from app tier"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  ingress {
    description     = "PostgreSQL from bastion (for admin)"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "database-security-group"
    Tier = "database"
  }
}

# Bastion Security Group
resource "aws_security_group" "bastion" {
  name_prefix = "bastion-sg-"
  description = "Security group for bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from office IP"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]  # Replace with your office IP
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bastion-security-group"
    Tier = "management"
  }
}
```

**Step 2: Configure Network ACLs**

```hcl
# nacls.tf

# Public Subnet NACL
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Inbound Rules
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535  # Ephemeral ports
  }

  # Outbound Rules
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  egress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "10.0.0.0/16"  # VPC CIDR
    from_port  = 0
    to_port    = 65535
  }

  egress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535  # Ephemeral ports
  }

  tags = {
    Name = "public-nacl"
  }
}

# Private Subnet NACL
resource "aws_network_acl" "private" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  # Inbound from public subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/16"  # VPC CIDR
    from_port  = 0
    to_port    = 65535
  }

  # Inbound ephemeral ports from internet (for responses)
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Outbound to internet
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  egress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Outbound within VPC
  egress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 0
    to_port    = 65535
  }

  tags = {
    Name = "private-nacl"
  }
}

# Database Subnet NACL
resource "aws_network_acl" "database" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.database[*].id

  # Inbound from private subnets only
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.11.0/24"  # Private subnet 1
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "10.0.12.0/24"  # Private subnet 2
    from_port  = 5432
    to_port    = 5432
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "10.0.13.0/24"  # Private subnet 3
    from_port  = 5432
    to_port    = 5432
  }

  # Ephemeral ports for responses
  ingress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 1024
    to_port    = 65535
  }

  # Outbound to private subnets
  egress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/16"
    from_port  = 0
    to_port    = 65535
  }

  tags = {
    Name = "database-nacl"
  }
}
```

**Step 3: Test Security Configuration**

```bash
# Test 1: Verify internet can reach ALB
curl -I https://your-alb-dns-name.amazonaws.com

# Test 2: Try to SSH directly to web server (should fail)
ssh ec2-user@<web-server-private-ip>  # Should timeout

# Test 3: SSH through bastion (should work)
ssh -J ec2-user@<bastion-public-ip> ec2-user@<web-server-private-ip>

# Test 4: Test database connection from app server
# SSH to app server, then:
psql -h <rds-endpoint> -U admin -d myapp

# Test 5: Try to connect to database from web server (should fail)
# SSH to web server, then:
psql -h <rds-endpoint> -U admin -d myapp  # Should fail

# Test 6: Verify NAT Gateway (from private instance)
curl http://checkip.amazonaws.com  # Should return NAT Gateway IP
```

### Troubleshooting Commands

```bash
# View security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx

# View NACL rules
aws ec2 describe-network-acls --network-acl-ids acl-xxxxx

# Check VPC Flow Logs for denied traffic
aws logs filter-log-events \
  --log-group-name "/aws/vpc/flow-logs" \
  --filter-pattern "REJECT"

# Verify instance security groups
aws ec2 describe-instances --instance-ids i-xxxxx \
  --query 'Reservations[*].Instances[*].SecurityGroups'
```

---

## Exercise 3: Deploy Application Load Balancer

### Objective
Deploy an ALB with SSL termination, health checks, and multiple target groups for path-based routing.

### Requirements
- HTTPS with ACM certificate
- Path-based routing: /api → API service, / → Web service
- Health checks
- Access logging

### Solution

```hcl
# alb.tf

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "production-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2              = true
  enable_cross_zone_load_balancing = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.id
    prefix  = "alb"
    enabled = true
  }

  tags = {
    Name        = "production-alb"
    Environment = "production"
  }
}

# S3 Bucket for ALB Logs
resource "aws_s3_bucket" "alb_logs" {
  bucket = "my-app-alb-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSLogDeliveryWrite"
        Effect = "Allow"
        Principal = {
          Service = "elasticloadbalancing.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/*"
      }
    ]
  })
}

# Target Group for Web Service
resource "aws_lb_target_group" "web" {
  name     = "web-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
    protocol            = "HTTP"
  }

  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400  # 1 day
    enabled         = false   # Prefer stateless
  }

  tags = {
    Name = "web-target-group"
  }
}

# Target Group for API Service
resource "aws_lb_target_group" "api" {
  name     = "api-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/api/health"
    matcher             = "200,202"
    protocol            = "HTTP"
  }

  deregistration_delay = 30

  tags = {
    Name = "api-target-group"
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.web.arn
  }
}

# HTTP Listener (redirect to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# Listener Rule for API paths
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Listener Rule for health check endpoint
resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 50

  action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Healthy"
      status_code  = "200"
    }
  }

  condition {
    path_pattern {
      values = ["/health"]
    }
  }
}

# ACM Certificate
resource "aws_acm_certificate" "main" {
  domain_name       = "example.com"
  validation_method = "DNS"

  subject_alternative_names = [
    "*.example.com"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "main-certificate"
  }
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  alarm_name          = "alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "Alert when unhealthy hosts detected"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.web.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "high_response_time" {
  alarm_name          = "alb-high-response-time"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = "60"
  statistic           = "Average"
  threshold           = "1"  # 1 second
  alarm_description   = "Alert when response time exceeds 1 second"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# Outputs
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}
```

**Testing:**

```bash
# Test HTTPS endpoint
curl -I https://your-alb-dns.amazonaws.com

# Test HTTP redirect
curl -I http://your-alb-dns.amazonaws.com

# Test path routing
curl https://your-alb-dns.amazonaws.com/api/users

# Check ALB status
aws elbv2 describe-load-balancers --names production-alb

# Check target health
aws elbv2 describe-target-health \
  --target-group-arn <target-group-arn>

# View ALB access logs
aws s3 ls s3://my-app-alb-logs-<account-id>/alb/ --recursive
```

---

## Troubleshooting Scenarios

### Scenario 1: Users Cannot Access Website

**Symptoms:**
- Users receive "Connection timeout" error
- ALB health checks failing

**Troubleshooting Steps:**

```bash
# Step 1: Check ALB status
aws elbv2 describe-load-balancers --names production-alb

# Step 2: Check target health
aws elbv2 describe-target-health --target-group-arn <arn>

# Step 3: Check security group allows traffic
aws ec2 describe-security-groups --group-ids <alb-sg-id>

# Step 4: Test from instance
# SSH to instance and test locally
curl http://localhost/health

# Step 5: Check VPC Flow Logs
aws logs filter-log-events \
  --log-group-name "/aws/vpc/flow-logs" \
  --filter-pattern "<alb-ip> REJECT"

# Step 6: Verify route tables
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=<vpc-id>"
```

**Common Causes & Fixes:**

1. **Security group blocks traffic:**
```hcl
# Fix: Allow ALB to reach instances
resource "aws_security_group_rule" "web_from_alb" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  security_group_id        = aws_security_group.web.id
  source_security_group_id = aws_security_group.alb.id
}
```

2. **Health check path wrong:**
```hcl
# Fix: Update health check path
health_check {
  path = "/health"  # Make sure this endpoint exists
}
```

3. **Instances not registered:**
```bash
# Register instances
aws elbv2 register-targets \
  --target-group-arn <arn> \
  --targets Id=i-xxxxx Id=i-yyyyy
```

### Scenario 2: High Latency from Specific Region

**Symptoms:**
- Users in Europe experiencing 2-3 second response times
- US users have normal response times (<100ms)

**Troubleshooting:**

```bash
# Step 1: Check latency from different regions
# From Europe:
time curl -I https://app.example.com

# From US:
time curl -I https://app.example.com

# Step 2: Check Route 53 routing policy
aws route53 get-hosted-zone --id <zone-id>

# Step 3: Check if CloudFront enabled
aws cloudfront list-distributions

# Step 4: Check database location
aws rds describe-db-instances --db-instance-identifier production-db

# Step 5: Check if read replicas exist in target region
aws rds describe-db-instances --filters "Name=engine,Values=postgres"
```

**Solutions:**

1. **Add CloudFront CDN:**
```hcl
resource "aws_cloudfront_distribution" "main" {
  enabled = true
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"
  }
  
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
}
```

2. **Add Read Replica in Europe:**
```hcl
resource "aws_db_instance" "replica_eu" {
  provider            = aws.eu_west_1
  identifier          = "production-db-eu"
  replicate_source_db = aws_db_instance.main.arn
  instance_class      = "db.r6g.large"
}
```

3. **Implement latency-based routing:**
```hcl
resource "aws_route53_record" "app_us" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.us.dns_name
    zone_id                = aws_lb.us.zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = "us-east-1"
  }

  set_identifier = "us-east-1"
}

resource "aws_route53_record" "app_eu" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.eu.dns_name
    zone_id                = aws_lb.eu.zone_id
    evaluate_target_health = true
  }

  latency_routing_policy {
    region = "eu-west-1"
  }

  set_identifier = "eu-west-1"
}
```

---

**Previous Module**: [06_INTERVIEW_QUESTIONS.md](06_INTERVIEW_QUESTIONS.md)  
**Next Module**: [08_QUICK_REFERENCE.md](08_QUICK_REFERENCE.md)
