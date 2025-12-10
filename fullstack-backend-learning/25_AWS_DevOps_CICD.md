# Module 25: AWS DevOps & CI/CD 🚀

## Automate Deployment with CodePipeline, CloudWatch, X-Ray

**Duration:** 6-7 hours  
**Prerequisites:** Module 22 (Compute), Module 21 (IAM), Git basics  
**Outcome:** Build complete CI/CD pipelines and monitoring for production

---

## 📚 Table of Contents

1. [DevOps on AWS Overview](#devops-on-aws-overview)
2. [CodePipeline (CI/CD Orchestration)](#codepipeline)
3. [CodeBuild (Build Service)](#codebuild)
4. [CodeDeploy (Deployment)](#codedeploy)
5. [CloudWatch (Monitoring & Logging)](#cloudwatch)
6. [X-Ray (Distributed Tracing)](#x-ray)
7. [Complete CI/CD Pipeline](#complete-cicd-pipeline)
8. [Best Practices](#best-practices)
9. [Interview Questions](#interview-questions)
10. [Hands-On Exercise](#hands-on-exercise)

---

## DevOps on AWS Overview

### AWS DevOps Services

```
Source → Build → Test → Deploy → Monitor

CodeCommit:   Git repository (like GitHub)
CodeBuild:    Compile, test, package
CodeDeploy:   Deploy to EC2, ECS, Lambda
CodePipeline: Orchestrate entire workflow

CloudWatch:   Logs, metrics, alarms
X-Ray:        Distributed tracing
CloudTrail:   API audit logs
```

---

## CodePipeline (CI/CD Orchestration)

### Pipeline Structure

```
Pipeline:
├── Source Stage (GitHub, CodeCommit, S3)
├── Build Stage (CodeBuild)
├── Test Stage (CodeBuild, 3rd party)
└── Deploy Stage (CodeDeploy, ECS, CloudFormation)

Triggers:
- Push to repository
- Scheduled (cron)
- Manual approval
```

### Create Simple Pipeline

```bash
# Create pipeline (JSON config)
aws codepipeline create-pipeline --cli-input-json file://pipeline.json
```

```json
{
  "pipeline": {
    "name": "MyPipeline",
    "roleArn": "arn:aws:iam::123456789012:role/CodePipelineServiceRole",
    "artifactStore": {
      "type": "S3",
      "location": "my-pipeline-artifacts"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [
          {
            "name": "SourceAction",
            "actionTypeId": {
              "category": "Source",
              "owner": "ThirdParty",
              "provider": "GitHub",
              "version": "1"
            },
            "configuration": {
              "Owner": "myusername",
              "Repo": "my-app",
              "Branch": "main",
              "OAuthToken": "****"
            },
            "outputArtifacts": [{"name": "SourceOutput"}]
          }
        ]
      },
      {
        "name": "Build",
        "actions": [
          {
            "name": "BuildAction",
            "actionTypeId": {
              "category": "Build",
              "owner": "AWS",
              "provider": "CodeBuild",
              "version": "1"
            },
            "configuration": {
              "ProjectName": "MyBuildProject"
            },
            "inputArtifacts": [{"name": "SourceOutput"}],
            "outputArtifacts": [{"name": "BuildOutput"}]
          }
        ]
      },
      {
        "name": "Deploy",
        "actions": [
          {
            "name": "DeployAction",
            "actionTypeId": {
              "category": "Deploy",
              "owner": "AWS",
              "provider": "CodeDeploy",
              "version": "1"
            },
            "configuration": {
              "ApplicationName": "MyApp",
              "DeploymentGroupName": "Production"
            },
            "inputArtifacts": [{"name": "BuildOutput"}]
          }
        ]
      }
    ]
  }
}
```

### Terraform - CodePipeline

```hcl
resource "aws_codepipeline" "pipeline" {
  name     = "my-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        Owner      = "myusername"
        Repo       = "my-app"
        Branch     = "main"
        OAuthToken = var.github_token
      }
    }
  }

  stage {
    name = "Build"

    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.build.name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeploy"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ApplicationName     = aws_codedeploy_app.app.name
        DeploymentGroupName = aws_codedeploy_deployment_group.group.deployment_group_name
      }
    }
  }
}
```

---

## CodeBuild (Build Service)

### BuildSpec File

```yaml
# buildspec.yml (in repository root)
version: 0.2

env:
  variables:
    GO_VERSION: "1.21"
  parameter-store:
    DB_PASSWORD: /myapp/db/password

phases:
  install:
    runtime-versions:
      golang: 1.21
    commands:
      - echo "Installing dependencies..."
      - go version

  pre_build:
    commands:
      - echo "Running tests..."
      - go test -v ./...
      - go vet ./...

  build:
    commands:
      - echo "Building application..."
      - GOOS=linux GOARCH=amd64 go build -o myapp main.go
      - echo "Build completed on $(date)"

  post_build:
    commands:
      - echo "Creating deployment package..."
      - zip deployment.zip myapp appspec.yml scripts/*

artifacts:
  files:
    - deployment.zip
  name: BuildArtifact

cache:
  paths:
    - '/go/pkg/mod/**/*'
```

### Create Build Project

```bash
aws codebuild create-project \
  --name MyBuildProject \
  --source type=GITHUB,location=https://github.com/user/repo \
  --artifacts type=S3,location=my-artifacts-bucket \
  --environment type=LINUX_CONTAINER,image=aws/codebuild/standard:5.0,computeType=BUILD_GENERAL1_SMALL \
  --service-role arn:aws:iam::123456789012:role/CodeBuildServiceRole
```

### Terraform - CodeBuild

```hcl
resource "aws_codebuild_project" "build" {
  name          = "my-build-project"
  service_role  = aws_iam_role.codebuild.arn
  build_timeout = 60

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:5.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ENVIRONMENT"
      value = "production"
    }

    environment_variable {
      name  = "DB_PASSWORD"
      value = "/myapp/db/password"
      type  = "PARAMETER_STORE"
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = file("buildspec.yml")
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/aws/codebuild/my-project"
      stream_name = "build"
    }
  }

  cache {
    type     = "S3"
    location = "${aws_s3_bucket.cache.bucket}/build-cache"
  }
}
```

### Docker Build in CodeBuild

```yaml
# buildspec.yml for Docker
version: 0.2

phases:
  pre_build:
    commands:
      - echo Logging in to Amazon ECR...
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ECR_REPO
  
  build:
    commands:
      - echo Building Docker image...
      - docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .
      - docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $ECR_REPO/$IMAGE_REPO_NAME:$IMAGE_TAG
  
  post_build:
    commands:
      - echo Pushing to ECR...
      - docker push $ECR_REPO/$IMAGE_REPO_NAME:$IMAGE_TAG
      - echo Writing image definitions file...
      - printf '[{"name":"app","imageUri":"%s"}]' $ECR_REPO/$IMAGE_REPO_NAME:$IMAGE_TAG > imagedefinitions.json

artifacts:
  files: imagedefinitions.json
```

---

## CodeDeploy (Deployment)

### Deployment Types

```
In-Place Deployment (EC2/On-Premises):
- Stop app on existing instances
- Deploy new version
- Start app
- Downtime during deployment

Blue/Green Deployment (EC2, ECS, Lambda):
- New instances (green) created
- Traffic shifted from old (blue) to new
- Old instances terminated after success
- Zero downtime
```

### AppSpec File (EC2)

```yaml
# appspec.yml
version: 0.0
os: linux

files:
  - source: /
    destination: /opt/myapp

hooks:
  BeforeInstall:
    - location: scripts/install_dependencies.sh
      timeout: 300
      runas: root
  
  AfterInstall:
    - location: scripts/configure_app.sh
      timeout: 300
      runas: root
  
  ApplicationStart:
    - location: scripts/start_app.sh
      timeout: 300
      runas: root
  
  ValidateService:
    - location: scripts/validate.sh
      timeout: 300
      runas: root
```

```bash
#!/bin/bash
# scripts/start_app.sh
cd /opt/myapp
nohup ./myapp > /var/log/myapp.log 2>&1 &
```

### Terraform - CodeDeploy

```hcl
resource "aws_codedeploy_app" "app" {
  name = "my-app"
}

resource "aws_codedeploy_deployment_group" "group" {
  app_name              = aws_codedeploy_app.app.name
  deployment_group_name = "production"
  service_role_arn      = aws_iam_role.codedeploy.arn

  deployment_config_name = "CodeDeployDefault.OneAtATime"

  ec2_tag_set {
    ec2_tag_filter {
      key   = "Environment"
      type  = "KEY_AND_VALUE"
      value = "production"
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE"]
  }

  load_balancer_info {
    target_group_info {
      name = aws_lb_target_group.app.name
    }
  }

  blue_green_deployment_config {
    terminate_blue_instances_on_deployment_success {
      action                           = "TERMINATE"
      termination_wait_time_in_minutes = 5
    }

    deployment_ready_option {
      action_on_timeout = "CONTINUE_DEPLOYMENT"
    }

    green_fleet_provisioning_option {
      action = "COPY_AUTO_SCALING_GROUP"
    }
  }
}
```

---

## CloudWatch (Monitoring & Logging)

### CloudWatch Logs

```go
// Send logs to CloudWatch
package main

import (
    "context"
    "log"
    "time"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/cloudwatchlogs"
    "github.com/aws/aws-sdk-go-v2/aws"
)

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := cloudwatchlogs.NewFromConfig(cfg)

    logGroup := "/aws/myapp"
    logStream := "app-server-1"

    // Create log stream
    client.CreateLogStream(context.TODO(), &cloudwatchlogs.CreateLogStreamInput{
        LogGroupName:  aws.String(logGroup),
        LogStreamName: aws.String(logStream),
    })

    // Send log events
    events := []types.InputLogEvent{
        {
            Message:   aws.String("Application started"),
            Timestamp: aws.Int64(time.Now().UnixMilli()),
        },
        {
            Message:   aws.String("Processing request from user 123"),
            Timestamp: aws.Int64(time.Now().UnixMilli()),
        },
    }

    client.PutLogEvents(context.TODO(), &cloudwatchlogs.PutLogEventsInput{
        LogGroupName:  aws.String(logGroup),
        LogStreamName: aws.String(logStream),
        LogEvents:     events,
    })

    log.Println("Logs sent to CloudWatch")
}
```

### CloudWatch Metrics

```go
// Publish custom metrics
import (
    "github.com/aws/aws-sdk-go-v2/service/cloudwatch"
    "github.com/aws/aws-sdk-go-v2/service/cloudwatch/types"
)

func publishMetric(client *cloudwatch.Client, value float64) {
    client.PutMetricData(context.TODO(), &cloudwatch.PutMetricDataInput{
        Namespace: aws.String("MyApp"),
        MetricData: []types.MetricDatum{
            {
                MetricName: aws.String("RequestCount"),
                Value:      aws.Float64(value),
                Unit:       types.StandardUnitCount,
                Timestamp:  aws.Time(time.Now()),
                Dimensions: []types.Dimension{
                    {
                        Name:  aws.String("Environment"),
                        Value: aws.String("production"),
                    },
                },
            },
        },
    })
}
```

### CloudWatch Alarms

```hcl
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Alert when CPU exceeds 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.web.id
  }
}

resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Alert on API errors"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiName = "my-api"
  }
}
```

### CloudWatch Logs Insights

```sql
-- Query logs
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20

-- Count errors by type
fields @timestamp, @message
| parse @message /ERROR: (?<error_type>.*)/
| stats count() by error_type

-- API latency percentiles
fields @timestamp, duration
| filter ispresent(duration)
| stats avg(duration), pct(duration, 50), pct(duration, 95), pct(duration, 99)
```

---

## X-Ray (Distributed Tracing)

### X-Ray Concepts

```
Trace:    End-to-end request journey
Segment:  Work done by single service
Subsegment: Details within segment (DB call, HTTP request)

Trace Map:
API Gateway → Lambda → DynamoDB
    |
    └→ S3
```

### Instrument Go App

```go
package main

import (
    "context"
    "database/sql"
    "net/http"

    "github.com/aws/aws-xray-sdk-go/xray"
    _ "github.com/lib/pq"
)

func main() {
    // Wrap HTTP handler
    http.Handle("/", xray.Handler(xray.NewFixedSegmentNamer("myapp"), http.HandlerFunc(handler)))
    http.ListenAndServe(":8080", nil)
}

func handler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Add annotations (indexed)
    xray.AddAnnotation(ctx, "user_id", "123")
    xray.AddAnnotation(ctx, "environment", "production")

    // Add metadata (not indexed, for details)
    xray.AddMetadata(ctx, "request", map[string]interface{}{
        "method": r.Method,
        "path":   r.URL.Path,
    })

    // Trace database call
    err := queryDatabase(ctx)
    if err != nil {
        xray.AddError(ctx, err)
    }

    // Trace HTTP call
    makeHTTPRequest(ctx)

    w.Write([]byte("Hello World"))
}

func queryDatabase(ctx context.Context) error {
    // Wrap database connection
    db, _ := xray.SQL("postgres", "postgres://user:pass@db:5432/mydb")
    defer db.Close()

    // This query will be traced
    _, err := db.QueryContext(ctx, "SELECT * FROM users WHERE id = $1", 123)
    return err
}

func makeHTTPRequest(ctx context.Context) {
    // Wrap HTTP client
    client := xray.Client(&http.Client{})
    
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/data", nil)
    resp, _ := client.Do(req)
    defer resp.Body.Close()
}
```

### X-Ray Daemon

```yaml
# docker-compose.yml
version: '3'

services:
  xray-daemon:
    image: amazon/aws-xray-daemon
    ports:
      - "2000:2000/udp"
    environment:
      - AWS_REGION=us-east-1

  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - AWS_XRAY_DAEMON_ADDRESS=xray-daemon:2000
    depends_on:
      - xray-daemon
```

### Terraform - X-Ray

```hcl
# Enable X-Ray on Lambda
resource "aws_lambda_function" "api" {
  filename      = "function.zip"
  function_name = "my-function"
  role          = aws_iam_role.lambda.arn
  handler       = "main"
  runtime       = "go1.x"

  tracing_config {
    mode = "Active"  # Enable X-Ray
  }

  environment {
    variables = {
      AWS_XRAY_TRACING_NAME = "my-api"
    }
  }
}

# IAM permission for X-Ray
resource "aws_iam_role_policy_attachment" "xray" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
```

---

## Complete CI/CD Pipeline

### Full Example with All Services

```hcl
# main.tf - Complete CI/CD pipeline

# S3 bucket for artifacts
resource "aws_s3_bucket" "artifacts" {
  bucket = "my-pipeline-artifacts"
}

# CodeBuild project
resource "aws_codebuild_project" "build" {
  name          = "my-app-build"
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:5.0"
    type         = "LINUX_CONTAINER"
  }

  source {
    type = "CODEPIPELINE"
  }
}

# CodeDeploy application
resource "aws_codedeploy_app" "app" {
  name = "my-app"
}

resource "aws_codedeploy_deployment_group" "prod" {
  app_name              = aws_codedeploy_app.app.name
  deployment_group_name = "production"
  service_role_arn      = aws_iam_role.codedeploy.arn

  ec2_tag_set {
    ec2_tag_filter {
      key   = "Environment"
      value = "production"
      type  = "KEY_AND_VALUE"
    }
  }

  auto_rollback_configuration {
    enabled = true
    events  = ["DEPLOYMENT_FAILURE", "DEPLOYMENT_STOP_ON_ALARM"]
  }

  alarm_configuration {
    enabled = true
    alarms  = [aws_cloudwatch_metric_alarm.deployment_error.alarm_name]
  }
}

# CodePipeline
resource "aws_codepipeline" "pipeline" {
  name     = "my-app-pipeline"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "ThirdParty"
      provider         = "GitHub"
      version          = "1"
      output_artifacts = ["source"]

      configuration = {
        Owner  = var.github_owner
        Repo   = var.github_repo
        Branch = "main"
        OAuthToken = var.github_token
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source"]
      output_artifacts = ["build"]

      configuration = {
        ProjectName = aws_codebuild_project.build.name
      }
    }
  }

  stage {
    name = "Deploy"
    action {
      name            = "Deploy"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "CodeDeploy"
      version         = "1"
      input_artifacts = ["build"]

      configuration = {
        ApplicationName     = aws_codedeploy_app.app.name
        DeploymentGroupName = aws_codedeploy_deployment_group.prod.deployment_group_name
      }
    }
  }
}

# CloudWatch alarm for deployment
resource "aws_cloudwatch_metric_alarm" "deployment_error" {
  alarm_name          = "deployment-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 5
}

# SNS topic for notifications
resource "aws_sns_topic" "pipeline_notifications" {
  name = "pipeline-notifications"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.pipeline_notifications.arn
  protocol  = "email"
  endpoint  = "team@example.com"
}
```

---

## Best Practices

### CI/CD Best Practices

```
1. Pipeline Design
   ✅ Automate everything
   ✅ Fail fast (run tests early)
   ✅ Parallel stages when possible
   ✅ Manual approval for production

2. Security
   ✅ Use IAM roles, not access keys
   ✅ Secrets in Parameter Store/Secrets Manager
   ✅ Scan for vulnerabilities
   ✅ Sign artifacts

3. Deployment
   ✅ Blue/green for zero downtime
   ✅ Canary deployments (gradual rollout)
   ✅ Automatic rollback on failure
   ✅ Deployment windows for maintenance

4. Monitoring
   ✅ CloudWatch alarms on key metrics
   ✅ Log aggregation
   ✅ X-Ray for distributed tracing
   ✅ Alerts to SNS/Slack
```

### CloudWatch Best Practices

```
1. Logging
   ✅ Structured logs (JSON)
   ✅ Consistent log format
   ✅ Include request IDs
   ✅ Set retention periods

2. Metrics
   ✅ Custom metrics for business KPIs
   ✅ High-resolution metrics (1-second) for critical
   ✅ Use dimensions for filtering
   ✅ Dashboard for visibility

3. Alarms
   ✅ Alert on trends, not spikes
   ✅ Multiple evaluation periods
   ✅ Actionable alerts only
   ✅ Different severity levels
```

---

## Interview Questions

**Q1: Blue/Green vs Canary deployment?**

**Answer:**
- **Blue/Green**: Two identical environments. Deploy to green, test, switch traffic 100% at once. Quick rollback.
- **Canary**: Gradual rollout. Route 10% traffic to new version, monitor, gradually increase to 100%. Safer for critical systems.

**Q2: How do you ensure zero-downtime deployments?**

**Answer:**
1. Use blue/green or rolling deployments
2. Health checks before routing traffic
3. Graceful shutdown (finish in-flight requests)
4. Database migrations backward-compatible
5. Feature flags for gradual rollout

**Q3: Explain X-Ray service map.**

**Answer:** Visual representation of request flow through distributed system. Shows services as nodes, calls as edges. Displays latency, error rates, throttling. Helps identify bottlenecks and failures. Example: API Gateway → Lambda → DynamoDB, with latency at each hop.

**Q4: CloudWatch Logs vs Metrics?**

**Answer:**
- **Logs**: Text data, events, debugging. Query with Logs Insights. Example: application logs, error stack traces
- **Metrics**: Numeric data over time. Graph, alert. Example: CPU%, request count, latency
- Use both: Logs for debugging, metrics for monitoring/alerting

**Q5: How do you handle secrets in CI/CD?**

**Answer:**
- **AWS Secrets Manager**: Auto-rotation, fine-grained IAM, versioning
- **Parameter Store**: Free tier, simpler, no auto-rotation
- **Never**: Hardcode, commit to Git, use environment variables in pipeline definition
- Inject at runtime via IAM roles

---

## Hands-On Exercise

### Task: Complete CI/CD Pipeline for Go API

**Project Structure:**
```
my-app/
├── main.go
├── buildspec.yml
├── appspec.yml
├── scripts/
│   ├── install_dependencies.sh
│   ├── start_app.sh
│   └── validate.sh
└── terraform/
    └── pipeline.tf
```

See complete Terraform configuration in "Complete CI/CD Pipeline" section above.

---

## 📚 Additional Resources

- [AWS CodePipeline User Guide](https://docs.aws.amazon.com/codepipeline/)
- [AWS CodeBuild User Guide](https://docs.aws.amazon.com/codebuild/)
- [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/)
- [CloudWatch User Guide](https://docs.aws.amazon.com/cloudwatch/)

---

## ✅ Module Checklist

- [ ] Create CodePipeline with GitHub source
- [ ] Set up CodeBuild project with buildspec.yml
- [ ] Configure CodeDeploy for EC2
- [ ] Implement blue/green deployment
- [ ] Set up CloudWatch Logs and Metrics
- [ ] Create CloudWatch alarms
- [ ] Instrument application with X-Ray
- [ ] Build complete CI/CD pipeline with Terraform
- [ ] Test automatic rollback on failure

---

**🎉 Congratulations!** You've completed Part 5: AWS!

**Next Section:** [Module 26: Prometheus & Grafana](./26_Prometheus_Grafana.md) - Observability! 📊
