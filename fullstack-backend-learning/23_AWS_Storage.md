# Module 23: AWS Storage - S3, EBS, EFS 💾

## Master AWS Storage Services for Scalable Data Management

**Duration:** 5-6 hours  
**Prerequisites:** Module 21 (IAM & VPC)  
**Outcome:** Understand and implement AWS storage solutions

---

## 📚 Table of Contents

1. [Storage Services Overview](#storage-services-overview)
2. [S3 (Simple Storage Service)](#s3)
3. [EBS (Elastic Block Store)](#ebs)
4. [EFS (Elastic File System)](#efs)
5. [CloudFront (CDN)](#cloudfront)
6. [Storage Gateway](#storage-gateway)
7. [Best Practices](#best-practices)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## Storage Services Overview

### Storage Types

```
Block Storage (EBS):
- Attached to single EC2 instance
- Low latency, high IOPS
- Use: Databases, boot volumes

File Storage (EFS):
- Shared across multiple instances
- POSIX-compliant
- Use: Shared application data, content management

Object Storage (S3):
- Unlimited scalability
- HTTP/S access
- Use: Static assets, backups, data lakes

Comparison:
EBS:  1 instance,  low latency,    expensive
EFS:  N instances, medium latency, moderate
S3:   HTTP access, high latency,   cheap
```

---

## S3 (Simple Storage Service)

### S3 Basics

```
S3 Structure:
Bucket (globally unique name)
└── Objects (files)
    ├── Key (path/filename)
    ├── Value (data)
    ├── Metadata
    └── Version ID

Example:
s3://my-app-bucket/images/logo.png
       │            │
       Bucket       Key
```

### Create Bucket

```bash
# Create bucket
aws s3 mb s3://my-unique-bucket-12345

# List buckets
aws s3 ls

# Upload file
aws s3 cp file.txt s3://my-unique-bucket-12345/

# Upload directory
aws s3 cp ./images s3://my-unique-bucket-12345/images/ --recursive

# Download file
aws s3 cp s3://my-unique-bucket-12345/file.txt ./

# List objects
aws s3 ls s3://my-unique-bucket-12345/

# Delete object
aws s3 rm s3://my-unique-bucket-12345/file.txt

# Delete bucket (must be empty)
aws s3 rb s3://my-unique-bucket-12345 --force
```

### Go SDK - S3 Operations

```go
package main

import (
    "bytes"
    "context"
    "fmt"
    "io"
    "log"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

func main() {
    cfg, _ := config.LoadDefaultConfig(context.TODO())
    client := s3.NewFromConfig(cfg)

    // Upload file
    uploadFile(client, "my-bucket", "test.txt", []byte("Hello S3!"))

    // Download file
    data := downloadFile(client, "my-bucket", "test.txt")
    fmt.Println(string(data))

    // List objects
    listObjects(client, "my-bucket")

    // Delete object
    deleteObject(client, "my-bucket", "test.txt")
}

func uploadFile(client *s3.Client, bucket, key string, data []byte) {
    _, err := client.PutObject(context.TODO(), &s3.PutObjectInput{
        Bucket: &bucket,
        Key:    &key,
        Body:   bytes.NewReader(data),
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Uploaded: %s\n", key)
}

func downloadFile(client *s3.Client, bucket, key string) []byte {
    result, err := client.GetObject(context.TODO(), &s3.GetObjectInput{
        Bucket: &bucket,
        Key:    &key,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer result.Body.Close()

    data, _ := io.ReadAll(result.Body)
    return data
}

func listObjects(client *s3.Client, bucket string) {
    result, _ := client.ListObjectsV2(context.TODO(), &s3.ListObjectsV2Input{
        Bucket: &bucket,
    })

    for _, obj := range result.Contents {
        fmt.Printf("%s (Size: %d bytes)\n", *obj.Key, obj.Size)
    }
}

func deleteObject(client *s3.Client, bucket, key string) {
    _, err := client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
        Bucket: &bucket,
        Key:    &key,
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Deleted: %s\n", key)
}
```

### S3 Storage Classes

```
S3 Standard:
- Frequently accessed
- Low latency
- $0.023/GB/month

S3 Intelligent-Tiering:
- Auto-moves between tiers
- Unknown access patterns

S3 Standard-IA (Infrequent Access):
- Less frequent access
- $0.0125/GB/month
- Retrieval fee

S3 One Zone-IA:
- Single AZ
- Cheaper than Standard-IA
- Less durability

S3 Glacier Instant Retrieval:
- Archive storage
- Millisecond retrieval
- $0.004/GB/month

S3 Glacier Flexible Retrieval:
- Minutes to hours retrieval
- $0.0036/GB/month

S3 Glacier Deep Archive:
- Lowest cost
- 12-hour retrieval
- $0.00099/GB/month
```

```bash
# Set storage class
aws s3 cp file.txt s3://my-bucket/ --storage-class GLACIER

# Lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json
```

```json
{
  "Rules": [
    {
      "Id": "MoveToGlacier",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

### S3 Versioning

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-bucket \
  --versioning-configuration Status=Enabled

# List versions
aws s3api list-object-versions --bucket my-bucket

# Get specific version
aws s3api get-object \
  --bucket my-bucket \
  --key file.txt \
  --version-id abc123 \
  output.txt

# Delete specific version (permanent)
aws s3api delete-object \
  --bucket my-bucket \
  --key file.txt \
  --version-id abc123
```

### S3 Presigned URLs

```go
// Generate presigned URL (temporary access)
import (
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "github.com/aws/aws-sdk-go-v2/aws"
)

func generatePresignedURL(client *s3.Client, bucket, key string) string {
    presignClient := s3.NewPresignClient(client)
    
    request, err := presignClient.PresignGetObject(context.TODO(), &s3.GetObjectInput{
        Bucket: aws.String(bucket),
        Key:    aws.String(key),
    }, s3.WithPresignExpires(15*time.Minute))
    
    if err != nil {
        log.Fatal(err)
    }
    
    return request.URL  // Valid for 15 minutes
}

// Anyone with this URL can download (no auth needed)
// Use for: User file downloads, temporary sharing
```

### S3 Static Website Hosting

```bash
# Enable website hosting
aws s3 website s3://my-bucket/ \
  --index-document index.html \
  --error-document error.html

# Upload files
aws s3 cp index.html s3://my-bucket/
aws s3 cp error.html s3://my-bucket/

# Make public
aws s3api put-bucket-policy \
  --bucket my-bucket \
  --policy file://policy.json
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

### S3 Encryption

```
Server-Side Encryption (SSE):

SSE-S3:   AWS manages keys (AES-256)
SSE-KMS:  AWS KMS (audit trail, rotation)
SSE-C:    Customer-provided keys

Client-Side Encryption:
Encrypt before upload, decrypt after download
```

```bash
# Enable default encryption
aws s3api put-bucket-encryption \
  --bucket my-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

---

## EBS (Elastic Block Store)

### EBS Volume Types

```
General Purpose SSD (gp3, gp2):
- Balanced price/performance
- 3,000-16,000 IOPS
- Use: Boot volumes, dev/test

Provisioned IOPS SSD (io2, io1):
- Highest performance
- Up to 64,000 IOPS
- Use: Databases, critical apps

Throughput Optimized HDD (st1):
- Low-cost HDD
- Big data, data warehouses
- Cannot be boot volume

Cold HDD (sc1):
- Lowest cost
- Infrequent access
- Cannot be boot volume
```

### Create and Attach EBS Volume

```bash
# Create volume
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --iops 3000 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=my-volume}]'

# List volumes
aws ec2 describe-volumes

# Attach to instance
aws ec2 attach-volume \
  --volume-id vol-1234567890abcdef0 \
  --instance-id i-1234567890abcdef0 \
  --device /dev/sdf

# Format and mount (on EC2 instance)
sudo mkfs -t ext4 /dev/sdf
sudo mkdir /data
sudo mount /dev/sdf /data

# Auto-mount on reboot (add to /etc/fstab)
echo '/dev/sdf /data ext4 defaults,nofail 0 2' | sudo tee -a /etc/fstab
```

### EBS Snapshots

```bash
# Create snapshot
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "Backup before update"

# List snapshots
aws ec2 describe-snapshots --owner-ids self

# Create volume from snapshot
aws ec2 create-volume \
  --snapshot-id snap-1234567890abcdef0 \
  --availability-zone us-east-1a

# Copy snapshot to another region
aws ec2 copy-snapshot \
  --source-region us-east-1 \
  --source-snapshot-id snap-1234567890abcdef0 \
  --destination-region us-west-2

# Delete snapshot
aws ec2 delete-snapshot --snapshot-id snap-1234567890abcdef0
```

### Terraform - EBS with Snapshots

```hcl
resource "aws_ebs_volume" "data" {
  availability_zone = "us-east-1a"
  size              = 100
  type              = "gp3"
  iops              = 3000
  throughput        = 125

  tags = {
    Name = "data-volume"
  }
}

resource "aws_volume_attachment" "data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.web.id
}

# Automated snapshots
resource "aws_dlm_lifecycle_policy" "snapshots" {
  description        = "Daily snapshots"
  execution_role_arn = aws_iam_role.dlm.arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]

    schedule {
      name = "Daily snapshots"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["23:00"]
      }

      retain_rule {
        count = 7  # Keep 7 days
      }
    }

    target_tags = {
      Snapshot = "true"
    }
  }
}
```

---

## EFS (Elastic File System)

### EFS Features

```
Shared File System:
- NFSv4 protocol
- Multi-AZ, multi-instance access
- Auto-scaling (no capacity planning)
- Pay for what you use

Use Cases:
- Web serving
- Content management
- Development environments
- Container storage
```

### Create EFS

```bash
# Create EFS file system
aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=my-efs

# Create mount targets (one per AZ)
aws efs create-mount-target \
  --file-system-id fs-12345678 \
  --subnet-id subnet-aaaaa \
  --security-groups sg-12345678

# Mount on EC2 (install nfs-utils first)
sudo yum install -y amazon-efs-utils
sudo mkdir /mnt/efs
sudo mount -t efs fs-12345678:/ /mnt/efs

# Auto-mount on boot
echo 'fs-12345678:/ /mnt/efs efs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

### EFS Performance Modes

```
General Purpose:
- Low latency
- Web serving, CMS
- Max 7,000 IOPS

Max I/O:
- Higher latency
- Big data, media processing
- 500,000+ IOPS

Throughput Modes:
Bursting:     Scales with size
Provisioned:  Fixed throughput
Elastic:      Auto-scales (recommended)
```

### Terraform - EFS with Mount Targets

```hcl
resource "aws_efs_file_system" "shared" {
  creation_token = "my-efs"
  encrypted      = true

  performance_mode = "generalPurpose"
  throughput_mode  = "elastic"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = {
    Name = "shared-efs"
  }
}

resource "aws_efs_mount_target" "az" {
  count = length(var.private_subnets)

  file_system_id  = aws_efs_file_system.shared.id
  subnet_id       = var.private_subnets[count.index]
  security_groups = [aws_security_group.efs.id]
}

resource "aws_security_group" "efs" {
  name        = "efs-sg"
  description = "EFS mount target security group"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 2049
    to_port     = 2049
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }
}

output "efs_id" {
  value = aws_efs_file_system.shared.id
}
```

---

## CloudFront (CDN)

### CloudFront Basics

```
Content Delivery Network (CDN):
- Cache content at edge locations (400+ worldwide)
- Reduce latency for global users
- DDoS protection
- SSL/TLS

Origin:
- S3 bucket
- EC2/ALB
- Custom HTTP server
```

### Create CloudFront Distribution

```bash
# Create distribution
aws cloudfront create-distribution \
  --origin-domain-name my-bucket.s3.amazonaws.com \
  --default-root-object index.html
```

### Terraform - CloudFront with S3

```hcl
# S3 bucket for website
resource "aws_s3_bucket" "website" {
  bucket = "my-website-bucket"
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = "S3-my-website"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    target_origin_id       = "S3-my-website"
    viewer_protocol_policy = "redirect-to-https"

    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_cloudfront_origin_access_identity" "oai" {
  comment = "OAI for my website"
}

output "cloudfront_url" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
```

---

## Best Practices

### S3 Best Practices

```
1. Security
   ✅ Block public access by default
   ✅ Use bucket policies with least privilege
   ✅ Enable versioning for critical data
   ✅ Enable encryption (SSE-S3 or SSE-KMS)
   ✅ Use presigned URLs for temporary access

2. Cost Optimization
   ✅ Use lifecycle policies
   ✅ Intelligent-Tiering for unknown patterns
   ✅ Delete incomplete multipart uploads
   ✅ Enable S3 Analytics

3. Performance
   ✅ Use CloudFront for static content
   ✅ Parallelize uploads (multipart)
   ✅ Use Transfer Acceleration for global uploads
```

### EBS Best Practices

```
1. Backups
   ✅ Automated snapshots (DLM)
   ✅ Copy snapshots to another region
   ✅ Test restores regularly

2. Performance
   ✅ Use gp3 (cheaper than gp2)
   ✅ Provision IOPS for databases
   ✅ Monitor with CloudWatch

3. Availability
   ✅ Use RAID for redundancy
   ✅ Snapshots before major changes
```

### EFS Best Practices

```
1. Performance
   ✅ Use elastic throughput mode
   ✅ Enable lifecycle management (move to IA)
   ✅ Use Max I/O for big data

2. Security
   ✅ Use VPC and security groups
   ✅ Enable encryption
   ✅ Use IAM policies

3. Cost
   ✅ Enable IA storage class
   ✅ Monitor usage with CloudWatch
```

---

## Interview Questions

**Q1: S3 vs EBS vs EFS - when to use each?**

**Answer:**
- **S3**: Object storage, unlimited scale, HTTP access. Use: Static assets, backups, data lakes
- **EBS**: Block storage, single instance, low latency. Use: Databases, boot volumes
- **EFS**: File storage, shared across instances, NFS. Use: Shared app data, content management

**Q2: How do you ensure S3 data durability and availability?**

**Answer:**
- Durability: 99.999999999% (11 9's) - data replicated across 3+ AZs
- Availability: 99.99% (Standard), 99.9% (IA)
- Enable versioning (protect from deletes)
- Cross-region replication (disaster recovery)
- MFA delete for critical buckets

**Q3: Explain S3 lifecycle policies.**

**Answer:** Automate transitions between storage classes and deletions.
Example: Standard → Standard-IA (30 days) → Glacier (90 days) → Delete (365 days).
Saves costs by moving to cheaper tiers automatically.

**Q4: What's the difference between EBS snapshots and AMIs?**

**Answer:**
- **EBS Snapshot**: Point-in-time backup of single volume. Use: Data backup, disaster recovery
- **AMI**: Complete machine image (root volume + config). Use: Launch identical instances, scaling

**Q5: How does CloudFront improve performance?**

**Answer:**
- Caches content at 400+ edge locations worldwide
- Users download from nearest edge (lower latency)
- Reduces load on origin server
- Free data transfer from S3 to CloudFront
- DDoS protection (AWS Shield)

---

## Hands-On Exercise

### Task: Build Scalable File Upload System

**Architecture:**
```
User → API Gateway → Lambda → S3
                       ↓
                   CloudFront (for downloads)
```

```go
// Lambda function - upload handler
package main

import (
    "context"
    "encoding/base64"
    "fmt"
    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/s3"
    "strings"
)

type UploadResponse struct {
    URL string `json:"url"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
    // Parse file from base64
    fileData, _ := base64.StdEncoding.DecodeString(request.Body)
    fileName := request.Headers["x-filename"]
    
    // Upload to S3
    cfg, _ := config.LoadDefaultConfig(ctx)
    client := s3.NewFromConfig(cfg)
    
    bucket := "my-uploads-bucket"
    key := fmt.Sprintf("uploads/%s", fileName)
    
    _, err := client.PutObject(ctx, &s3.PutObjectInput{
        Bucket: &bucket,
        Key:    &key,
        Body:   strings.NewReader(string(fileData)),
    })
    
    if err != nil {
        return events.APIGatewayProxyResponse{
            StatusCode: 500,
            Body:       err.Error(),
        }, nil
    }
    
    // Generate presigned URL for download
    presignClient := s3.NewPresignClient(client)
    presignedURL, _ := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
        Bucket: &bucket,
        Key:    &key,
    })
    
    return events.APIGatewayProxyResponse{
        StatusCode: 200,
        Body:       fmt.Sprintf(`{"url": "%s"}`, presignedURL.URL),
    }, nil
}

func main() {
    lambda.Start(handler)
}
```

```hcl
# Terraform - complete setup
resource "aws_s3_bucket" "uploads" {
  bucket = "my-uploads-bucket-12345"
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "archive-old-uploads"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.uploads.bucket_regional_domain_name
    origin_id   = "S3-uploads"
  }

  enabled = true

  default_cache_behavior {
    target_origin_id       = "S3-uploads"
    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
```

---

## 📚 Additional Resources

- [S3 Developer Guide](https://docs.aws.amazon.com/s3/)
- [EBS User Guide](https://docs.aws.amazon.com/ebs/)
- [EFS User Guide](https://docs.aws.amazon.com/efs/)
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)

---

## ✅ Module Checklist

- [ ] Create S3 bucket and upload files
- [ ] Configure S3 lifecycle policies
- [ ] Generate presigned URLs
- [ ] Set up S3 static website hosting
- [ ] Create and attach EBS volume
- [ ] Create and test EBS snapshots
- [ ] Set up EFS and mount on multiple instances
- [ ] Create CloudFront distribution for S3
- [ ] Implement file upload system with Lambda + S3

---

**Next Module:** [Module 24: AWS Databases](./24_AWS_Databases.md) - RDS, DynamoDB, Aurora! 🗄️
