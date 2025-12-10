# Module 22: AWS Compute - EC2, Lambda, EKS 🚀

## Master AWS Compute Services: VMs, Serverless, and Kubernetes

**Duration:** 6-7 hours  
**Prerequisites:** Module 21 (IAM & VPC), Kubernetes basics  
**Outcome:** Deploy and manage applications on EC2, Lambda, and EKS

---

## 📚 Table of Contents

1. [Compute Services Overview](#compute-services-overview)
2. [EC2 (Elastic Compute Cloud)](#ec2)
3. [Lambda (Serverless Functions)](#lambda)
4. [EKS (Elastic Kubernetes Service)](#eks)
5. [ECS & Fargate](#ecs--fargate)
6. [Auto Scaling](#auto-scaling)
7. [Best Practices](#best-practices)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## Compute Services Overview

### Choosing the Right Compute Service

```
EC2 (Virtual Machines)
✅ Full control over OS
✅ Custom software/configurations
✅ Long-running applications
✅ Legacy applications
❌ Manage servers yourself

Lambda (Serverless Functions)
✅ Event-driven workloads
✅ No server management
✅ Pay per invocation
✅ Auto-scaling built-in
❌ 15-minute execution limit
❌ Cold starts

EKS (Managed Kubernetes)
✅ Containerized microservices
✅ Multi-cloud portability
✅ Advanced orchestration
✅ Hybrid cloud
❌ Kubernetes complexity

ECS + Fargate (AWS Container Service)
✅ AWS-native containers
✅ Serverless containers
✅ Simpler than Kubernetes
❌ AWS lock-in
```

---

## EC2 (Elastic Compute Cloud)

### Instance Types

```
Instance Families:

T3/T4g:  Burstable (web servers, dev environments)
M5/M6i:  General purpose (balanced CPU/memory)
C5/C6i:  Compute optimized (HPC, batch processing)
R5/R6i:  Memory optimized (databases, caches)
P3/P4:   GPU (ML training, graphics)
I3/I4i:  Storage optimized (NoSQL, data warehousing)

Naming: m5.xlarge
        ││  │
        ││  └─ Size (nano, small, medium, large, xlarge, 2xlarge...)
        │└──── Generation
        └───── Family
```

### Launch EC2 Instance

```bash
# Create key pair
aws ec2 create-key-pair \
  --key-name my-key \
  --query 'KeyMaterial' \
  --output text > my-key.pem

chmod 400 my-key.pem

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \  # Amazon Linux 2
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-12345678 \
  --subnet-id subnet-12345678 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=web-server}]' \
  --user-data file://user-data.sh

# List instances
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=web-server" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]' \
  --output table

# Connect via SSH
ssh -i my-key.pem ec2-user@<public-ip>
```

### User Data (Bootstrap Script)

```bash
#!/bin/bash
# user-data.sh - runs on first boot

# Update system
yum update -y

# Install Docker
amazon-linux-extras install docker -y
systemctl start docker
systemctl enable docker
usermod -aG docker ec2-user

# Install Go
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> /etc/profile

# Deploy application
mkdir -p /opt/app
cat > /opt/app/server.go <<'EOF'
package main
import (
    "fmt"
    "net/http"
)
func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello from EC2!")
    })
    http.ListenAndServe(":8080", nil)
}
EOF

cd /opt/app
/usr/local/go/bin/go run server.go &
```

### AMI (Amazon Machine Image)

```bash
# Create custom AMI from running instance
aws ec2 create-image \
  --instance-id i-1234567890abcdef0 \
  --name "my-web-server-v1.0" \
  --description "Web server with all dependencies"

# Launch instance from custom AMI
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --count 3  # Launch 3 identical instances
```

### Terraform - EC2 with Auto Scaling

```hcl
# ec2.tf
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}

resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = "t3.micro"

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.web.id]
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from $(hostname)</h1>" > /var/www/html/index.html
              EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "web-server"
    }
  }
}

resource "aws_autoscaling_group" "web" {
  desired_capacity    = 2
  max_size            = 5
  min_size            = 1
  target_group_arns   = [aws_lb_target_group.web.arn]
  vpc_zone_identifier = aws_subnet.public[*].id

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-asg"
    propagate_at_launch = true
  }
}
```

---

## Lambda (Serverless Functions)

### Lambda Function Structure

```go
// main.go - Lambda function in Go
package main

import (
    "context"
    "fmt"

    "github.com/aws/aws-lambda-go/lambda"
)

type Event struct {
    Name string `json:"name"`
}

type Response struct {
    Message string `json:"message"`
}

func HandleRequest(ctx context.Context, event Event) (Response, error) {
    message := fmt.Sprintf("Hello, %s!", event.Name)
    return Response{Message: message}, nil
}

func main() {
    lambda.Start(HandleRequest)
}
```

```bash
# Build for Lambda
GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
zip function.zip bootstrap

# Create Lambda function
aws lambda create-function \
  --function-name hello-lambda \
  --runtime provided.al2 \
  --role arn:aws:iam::123456789012:role/lambda-role \
  --handler bootstrap \
  --zip-file fileb://function.zip

# Invoke function
aws lambda invoke \
  --function-name hello-lambda \
  --payload '{"name": "World"}' \
  response.json

cat response.json
# {"message":"Hello, World!"}
```

### Lambda with API Gateway

```go
package main

import (
    "context"
    "encoding/json"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
)

type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func HandleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Parse request body
    var user User
    json.Unmarshal([]byte(request.Body), &user)

    // Business logic
    user.ID = "generated-id-123"

    // Response
    responseBody, _ := json.Marshal(user)

    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Headers: map[string]string{
            "Content-Type": "application/json",
        },
        Body: string(responseBody),
    }, nil
}

func main() {
    lambda.Start(HandleRequest)
}
```

### Lambda Triggers

```
Event Sources:

1. API Gateway     - HTTP requests
2. S3              - Object uploads
3. DynamoDB        - Stream changes
4. SNS/SQS         - Messages
5. CloudWatch      - Scheduled (cron)
6. EventBridge     - Custom events
```

```bash
# S3 trigger - process uploaded images
aws lambda add-permission \
  --function-name process-image \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::my-bucket

aws s3api put-bucket-notification-configuration \
  --bucket my-bucket \
  --notification-configuration file://notification.json
```

```json
// notification.json
{
  "LambdaFunctionConfigurations": [
    {
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:process-image",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {
              "Name": "suffix",
              "Value": ".jpg"
            }
          ]
        }
      }
    }
  ]
}
```

### Lambda Layers

```
Layers: Share code across functions

Use cases:
- Common libraries (AWS SDK, database drivers)
- Utilities/helpers
- Configuration files

Benefits:
- Reduce deployment package size
- Share code without duplication
- Update dependencies independently
```

```bash
# Create layer
mkdir -p layer/nodejs/node_modules
cd layer/nodejs
npm install axios
cd ../..
zip -r layer.zip layer/

# Publish layer
aws lambda publish-layer-version \
  --layer-name common-libs \
  --zip-file fileb://layer.zip \
  --compatible-runtimes nodejs18.x

# Use layer in function
aws lambda update-function-configuration \
  --function-name my-function \
  --layers arn:aws:lambda:us-east-1:123456789012:layer:common-libs:1
```

### Terraform - Lambda with API Gateway

```hcl
# lambda.tf
resource "aws_iam_role" "lambda" {
  name = "lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "api" {
  filename      = "function.zip"
  function_name = "hello-api"
  role          = aws_iam_role.lambda.arn
  handler       = "bootstrap"
  runtime       = "provided.al2"

  environment {
    variables = {
      ENVIRONMENT = "production"
    }
  }
}

resource "aws_apigatewayv2_api" "lambda" {
  name          = "hello-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id           = aws_apigatewayv2_api.lambda.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.api.invoke_arn
}

resource "aws_apigatewayv2_route" "lambda" {
  api_id    = aws_apigatewayv2_api.lambda.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id      = aws_apigatewayv2_api.lambda.id
  name        = "$default"
  auto_deploy = true
}

output "api_endpoint" {
  value = aws_apigatewayv2_stage.lambda.invoke_url
}
```

---

## EKS (Elastic Kubernetes Service)

### EKS Architecture

```
EKS Cluster
├── Control Plane (Managed by AWS)
│   ├── API Server
│   ├── etcd
│   └── Scheduler
└── Worker Nodes (EC2 or Fargate)
    ├── Node Group 1 (EC2 Auto Scaling Group)
    ├── Node Group 2 (Spot instances)
    └── Fargate Profiles (Serverless pods)
```

### Create EKS Cluster with eksctl

```bash
# Install eksctl
brew install eksctl  # macOS
# or download from https://eksctl.io

# Create cluster (simple)
eksctl create cluster \
  --name my-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 4

# With custom config
cat > cluster.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-cluster
  region: us-east-1
  version: "1.28"

vpc:
  cidr: 10.0.0.0/16

managedNodeGroups:
  - name: standard-workers
    instanceType: t3.medium
    minSize: 2
    maxSize: 5
    desiredCapacity: 3
    volumeSize: 20
    ssh:
      allow: true
      publicKeyName: my-key
    labels:
      role: standard
    tags:
      nodegroup-role: standard

  - name: spot-workers
    instanceTypes: ["t3.medium", "t3a.medium"]
    minSize: 0
    maxSize: 10
    desiredCapacity: 3
    spot: true
    labels:
      role: spot
    tags:
      nodegroup-role: spot
EOF

eksctl create cluster -f cluster.yaml

# Update kubeconfig
aws eks update-kubeconfig --name my-cluster --region us-east-1

# Verify
kubectl get nodes
```

### Deploy Application to EKS

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-api
  template:
    metadata:
      labels:
        app: go-api
    spec:
      containers:
      - name: api
        image: <your-ecr-repo>/go-api:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: host
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: go-api
spec:
  type: LoadBalancer
  selector:
    app: go-api
  ports:
  - port: 80
    targetPort: 8080
```

```bash
kubectl apply -f deployment.yaml

# Get LoadBalancer URL
kubectl get svc go-api
```

### EKS with Fargate

```bash
# Create Fargate profile
eksctl create fargateprofile \
  --cluster my-cluster \
  --name backend \
  --namespace backend

# Pods in 'backend' namespace run on Fargate (serverless)
kubectl create namespace backend
kubectl apply -f deployment.yaml -n backend
```

### Terraform - Complete EKS Cluster

```hcl
# eks.tf
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "my-cluster"
  cluster_version = "1.28"

  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private[*].id

  cluster_endpoint_public_access = true

  eks_managed_node_groups = {
    standard = {
      min_size     = 2
      max_size     = 5
      desired_size = 3

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "standard"
      }

      tags = {
        Environment = "production"
      }
    }

    spot = {
      min_size     = 0
      max_size     = 10
      desired_size = 3

      instance_types = ["t3.medium", "t3a.medium"]
      capacity_type  = "SPOT"

      labels = {
        role = "spot"
      }
    }
  }

  tags = {
    Environment = "production"
  }
}

# Configure kubectl
data "aws_eks_cluster_auth" "cluster" {
  name = module.eks.cluster_name
}

provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)
  token                  = data.aws_eks_cluster_auth.cluster.token
}
```

---

## ECS & Fargate

### ECS Task Definition

```json
{
  "family": "go-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/go-api:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/go-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-def.json

# Create ECS cluster
aws ecs create-cluster --cluster-name my-cluster

# Create Fargate service
aws ecs create-service \
  --cluster my-cluster \
  --service-name go-api \
  --task-definition go-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-12345678],assignPublicIp=ENABLED}"
```

---

## Auto Scaling

### EC2 Auto Scaling Policies

```bash
# Target tracking - maintain CPU at 70%
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name web-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration file://config.json
```

```json
{
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ASGAverageCPUUtilization"
  },
  "TargetValue": 70.0
}
```

### Lambda Auto Scaling

```
Lambda auto-scales automatically!

Concurrent executions:
- Default: 1000 per region
- Reserved: Guarantee capacity
- Provisioned: Pre-warmed instances (reduce cold starts)
```

```bash
# Set provisioned concurrency
aws lambda put-provisioned-concurrency-config \
  --function-name my-function \
  --provisioned-concurrent-executions 5 \
  --qualifier prod
```

---

## Best Practices

### EC2 Best Practices

```
1. Use Auto Scaling Groups
2. Enable detailed monitoring
3. Use latest generation instance types
4. Right-size instances (cost optimization)
5. Use Spot instances for fault-tolerant workloads
6. Store secrets in Secrets Manager
7. Regular AMI updates
8. Enable termination protection for critical instances
```

### Lambda Best Practices

```
1. Keep functions small and focused
2. Use environment variables for configuration
3. Minimize deployment package size
4. Use layers for dependencies
5. Set appropriate timeout (don't use max)
6. Configure dead letter queues
7. Use provisioned concurrency for critical APIs
8. Monitor with CloudWatch Logs Insights
```

### EKS Best Practices

```
1. Use managed node groups
2. Mix on-demand and spot instances
3. Enable cluster autoscaler
4. Use IRSA (IAM Roles for Service Accounts)
5. Enable control plane logging
6. Use AWS Load Balancer Controller
7. Implement pod security policies
8. Regular cluster upgrades
```

---

## Interview Questions

**Q1: EC2 vs Lambda - when to use each?**

**Answer:**
- **EC2**: Long-running apps, full OS control, consistent workloads, stateful apps, legacy software
- **Lambda**: Event-driven, short tasks (<15 min), variable load, no server management, pay-per-use

**Q2: What are EKS node groups?**

**Answer:** Managed EC2 Auto Scaling Groups for worker nodes. Types:
- **Managed**: AWS handles provisioning, updates, draining
- **Self-managed**: You manage lifecycle
- **Fargate**: Serverless nodes, no EC2 management

**Q3: Explain Lambda cold starts and how to mitigate.**

**Answer:** Cold start = time to initialize new function instance (container, runtime, code).
Mitigations:
1. Provisioned concurrency (pre-warmed instances)
2. Keep deployment package small
3. Minimize dependencies
4. Use compiled languages (Go faster than Python)
5. VPC: Use Hyperplane ENIs (faster)

**Q4: How do you handle secrets in containers?**

**Answer:**
- **AWS Secrets Manager**: Rotate automatically, fine-grained IAM
- **Parameter Store**: Free tier, simpler
- **EKS**: External Secrets Operator, Secrets Store CSI Driver
- **Never**: Hardcode or use environment variables in task definition

**Q5: Spot instances vs On-Demand?**

**Answer:**
- **Spot**: Up to 90% cheaper, can be interrupted (2-min warning), fault-tolerant workloads
- **On-Demand**: Pay full price, guaranteed availability, stateful/critical apps
- **Best**: Mix both with node affinity for different workloads

---

## Hands-On Exercise

### Task: Deploy Go API to EKS with Auto Scaling

```bash
# 1. Create EKS cluster
eksctl create cluster \
  --name demo-cluster \
  --region us-east-1 \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4

# 2. Install metrics server (for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# 3. Deploy application
cat > deployment.yaml <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: go-api
  template:
    metadata:
      labels:
        app: go-api
    spec:
      containers:
      - name: api
        image: hashicorp/http-echo
        args:
        - "-text=Hello from EKS!"
        ports:
        - containerPort: 5678
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: go-api
spec:
  type: LoadBalancer
  selector:
    app: go-api
  ports:
  - port: 80
    targetPort: 5678
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: go-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: go-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
EOF

kubectl apply -f deployment.yaml

# 4. Test
kubectl get pods
kubectl get svc go-api  # Get LoadBalancer URL
curl <lb-url>

# 5. Load test (trigger auto-scaling)
kubectl run -it --rm load-generator --image=busybox /bin/sh
while true; do wget -q -O- http://go-api; done

# Watch scaling
kubectl get hpa -w

# 6. Cleanup
eksctl delete cluster --name demo-cluster
```

---

## 📚 Additional Resources

- [EC2 User Guide](https://docs.aws.amazon.com/ec2/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [EKS Best Practices Guide](https://aws.github.io/aws-eks-best-practices/)
- [eksctl Documentation](https://eksctl.io/)

---

## ✅ Module Checklist

- [ ] Launch and connect to EC2 instance
- [ ] Create custom AMI
- [ ] Deploy Lambda function with Go
- [ ] Set up Lambda with API Gateway trigger
- [ ] Create EKS cluster with eksctl
- [ ] Deploy application to EKS with HPA
- [ ] Set up ECS Fargate service
- [ ] Configure Auto Scaling for EC2
- [ ] Test spot instances

---

**Next Module:** [Module 23: AWS Storage](./23_AWS_Storage.md) - S3, EBS, EFS, CloudFront! 💾
