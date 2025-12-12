# Comprehensive Interview Questions & Answers

## Table of Contents
- [Terraform Questions](#terraform-questions)
- [Python & boto3 Questions](#python--boto3-questions)
- [Jenkins & CI/CD Questions](#jenkins--cicd-questions)
- [FastAPI & API Design Questions](#fastapi--api-design-questions)
- [AWS Networking & Security Questions](#aws-networking--security-questions)
- [System Design Questions](#system-design-questions)
- [Behavioral & Scenario Questions](#behavioral--scenario-questions)

---

## Terraform Questions

### Q1: Explain Terraform state and why it's important

**Answer:**

Terraform state is a JSON file that maps real-world infrastructure resources to your configuration. It's crucial because:

1. **Resource Tracking**: Keeps track of which resources Terraform manages
2. **Metadata Storage**: Stores resource attributes and dependencies
3. **Performance**: Caches resource attributes to avoid querying cloud APIs repeatedly
4. **Collaboration**: Enables team collaboration through remote state

**State Management Best Practices:**

```hcl
# Remote state with S3 + DynamoDB locking
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

# State locking prevents concurrent modifications
# DynamoDB table must have primary key: LockID (String)
```

**Common State Operations:**

```bash
# List resources in state
terraform state list

# Show specific resource
terraform state show aws_vpc.main

# Move resource (refactoring)
terraform state mv aws_instance.old aws_instance.new

# Remove resource from state (don't delete actual resource)
terraform state rm aws_instance.temp

# Import existing resource
terraform import aws_vpc.main vpc-12345

# Pull remote state to local
terraform state pull

# Push local state to remote
terraform state push
```

### Q2: When would you use `count` vs `for_each`?

**Answer:**

**Use `count` when:**
- Creating a fixed number of identical resources
- Resources don't need unique identifiers
- Order doesn't matter

```hcl
# Create 3 identical subnets
resource "aws_subnet" "public" {
  count = 3

  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.${count.index}.0/24"

  tags = {
    Name = "public-${count.index + 1}"
  }
}

# Access: aws_subnet.public[0].id
```

**Problems with count:**
- Removing middle element causes recreation of subsequent resources
- Can't reference resources by meaningful names

**Use `for_each` when:**
- Need unique identifiers for each resource
- Resources have different configurations
- Want stability when adding/removing resources

```hcl
# Create subnets from map
variable "subnets" {
  type = map(object({
    cidr_block        = string
    availability_zone = string
  }))
  default = {
    public_1 = {
      cidr_block        = "10.0.1.0/24"
      availability_zone = "us-east-1a"
    }
    public_2 = {
      cidr_block        = "10.0.2.0/24"
      availability_zone = "us-east-1b"
    }
  }
}

resource "aws_subnet" "public" {
  for_each = var.subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr_block
  availability_zone = each.value.availability_zone

  tags = {
    Name = each.key
  }
}

# Access: aws_subnet.public["public_1"].id
```

**Key Differences:**

| Feature | count | for_each |
|---------|-------|----------|
| Reference | Numeric index | String key |
| Stability | Recreates on reorder | Stable references |
| Iteration | List/number | Map/set |
| Use case | Identical resources | Unique resources |

### Q3: How do you manage secrets in Terraform?

**Answer:**

**Never hardcode secrets in Terraform files!**

**Option 1: AWS Secrets Manager**

```hcl
# Retrieve secret
data "aws_secretsmanager_secret" "db_password" {
  name = "prod/db/password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}

# Use secret
resource "aws_db_instance" "main" {
  engine               = "postgres"
  username             = "admin"
  password             = data.aws_secretsmanager_secret_version.db_password.secret_string
  # ... other config
}
```

**Option 2: AWS SSM Parameter Store**

```hcl
# Retrieve parameter
data "aws_ssm_parameter" "db_password" {
  name            = "/prod/db/password"
  with_decryption = true
}

resource "aws_db_instance" "main" {
  password = data.aws_ssm_parameter.db_password.value
}
```

**Option 3: Environment Variables**

```bash
# Set environment variable
export TF_VAR_db_password="secret"

# Reference in Terraform
variable "db_password" {
  type      = string
  sensitive = true
}

resource "aws_db_instance" "main" {
  password = var.db_password
}
```

**Option 4: Encrypted tfvars**

```hcl
# Mark variable as sensitive
variable "api_key" {
  type      = string
  sensitive = true
}

# In terraform.tfvars (encrypted at rest)
api_key = "secret-key"

# Output won't show value
output "api_key" {
  value     = var.api_key
  sensitive = true
}
```

**Best Practices:**
1. Mark sensitive variables with `sensitive = true`
2. Use remote state with encryption
3. Never commit secrets to version control
4. Use `.gitignore` for `*.tfvars` files with secrets
5. Rotate secrets regularly

### Q4: Explain Terraform workspaces and when to use them

**Answer:**

Workspaces allow multiple state files for the same configuration (e.g., dev, staging, prod).

```bash
# List workspaces
terraform workspace list

# Create new workspace
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

**Using Workspace in Configuration:**

```hcl
# Different instance types per environment
locals {
  instance_types = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = local.instance_types[terraform.workspace]

  tags = {
    Name        = "app-${terraform.workspace}"
    Environment = terraform.workspace
  }
}

# Different replica counts
resource "aws_db_instance" "main" {
  instance_class  = terraform.workspace == "prod" ? "db.r5.large" : "db.t3.small"
  multi_az        = terraform.workspace == "prod" ? true : false
  backup_retention_period = terraform.workspace == "prod" ? 30 : 7
}
```

**When to Use Workspaces:**

✅ **Good for:**
- Simple environment separation (dev/staging/prod)
- Same configuration, different values
- Quick testing of changes

❌ **Not ideal for:**
- Completely different architectures per environment
- Different teams managing different environments
- Complex permission requirements

**Alternative: Separate Directories**

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       ├── backend.tf
│       └── terraform.tfvars
└── modules/
    └── vpc/
```

### Q5: How do you handle Terraform module versioning?

**Answer:**

**Local Modules:**

```hcl
# Using local path
module "vpc" {
  source = "../modules/vpc"
  # ...
}
```

**Git Modules with Tags:**

```hcl
# Specific tag (recommended for production)
module "vpc" {
  source = "git::https://github.com/company/terraform-modules.git//vpc?ref=v1.2.0"
  # ...
}

# Specific branch
module "vpc" {
  source = "git::https://github.com/company/terraform-modules.git//vpc?ref=main"
}

# Specific commit
module "vpc" {
  source = "git::https://github.com/company/terraform-modules.git//vpc?ref=a1b2c3d"
}
```

**Terraform Registry:**

```hcl
# Public registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"  # Compatible with 5.x
}

# Private registry
module "vpc" {
  source  = "app.terraform.io/company/vpc/aws"
  version = "1.2.0"
}
```

**Version Constraints:**

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  
  # Exact version
  version = "5.1.0"
  
  # >= 5.0, < 6.0
  version = "~> 5.0"
  
  # >= 5.1.0
  version = ">= 5.1.0"
  
  # >= 5.0, < 5.2
  version = "~> 5.1"
}
```

**Best Practices:**

1. **Pin versions in production:**
```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"  # Exact version
}
```

2. **Use semantic versioning:**
- Major: Breaking changes (1.0.0 → 2.0.0)
- Minor: New features, backward compatible (1.0.0 → 1.1.0)
- Patch: Bug fixes (1.0.0 → 1.0.1)

3. **Test module updates:**
```bash
# Update modules
terraform get -update

# Test in non-prod first
terraform workspace select dev
terraform plan
```

---

## Python & boto3 Questions

### Q6: Explain Python decorators with examples

**Answer:**

Decorators modify the behavior of functions or classes.

**Basic Decorator:**

```python
def timer(func):
    """Measure function execution time"""
    import time
    
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.2f}s")
        return result
    
    return wrapper

@timer
def slow_function():
    time.sleep(2)
    return "Done"

# Equivalent to: slow_function = timer(slow_function)
slow_function()  # Output: slow_function took 2.00s
```

**Decorator with Arguments:**

```python
def retry(max_attempts=3, delay=1):
    """Retry decorator with configurable attempts"""
    def decorator(func):
        from functools import wraps
        import time
        
        @wraps(func)  # Preserves original function metadata
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    print(f"Attempt {attempt} failed: {e}. Retrying...")
                    time.sleep(delay)
        
        return wrapper
    return decorator

@retry(max_attempts=3, delay=2)
def unreliable_api_call():
    import random
    if random.random() < 0.7:  # 70% chance of failure
        raise Exception("API error")
    return "Success"
```

**Multiple Decorators:**

```python
@timer
@retry(max_attempts=3)
def fetch_data():
    # Function logic
    pass

# Executes: timer(retry(fetch_data))
# Order matters: inner decorator runs first
```

**Class Decorator:**

```python
def singleton(cls):
    """Ensure only one instance of class exists"""
    instances = {}
    
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    
    return get_instance

@singleton
class Database:
    def __init__(self):
        print("Connecting to database...")

db1 = Database()  # Prints: Connecting to database...
db2 = Database()  # No print (returns same instance)
print(db1 is db2)  # True
```

**Real-World AWS Decorator:**

```python
import boto3
from functools import wraps
from botocore.exceptions import ClientError

def aws_error_handler(func):
    """Handle common AWS errors"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            if error_code == 'ResourceNotFoundException':
                print(f"Resource not found in {func.__name__}")
                return None
            elif error_code == 'AccessDeniedException':
                print(f"Access denied in {func.__name__}")
                raise
            else:
                print(f"AWS error in {func.__name__}: {error_code}")
                raise
    
    return wrapper

@aws_error_handler
@retry(max_attempts=3)
def get_vpc(vpc_id):
    ec2 = boto3.client('ec2')
    response = ec2.describe_vpcs(VpcIds=[vpc_id])
    return response['Vpcs'][0]
```

### Q7: Explain boto3 client vs resource. When to use each?

**Answer:**

**Client (Low-Level):**

```python
import boto3

# Client provides 1-to-1 mapping with AWS API
ec2_client = boto3.client('ec2', region_name='us-east-1')

# Returns raw dictionaries
response = ec2_client.describe_instances()
for reservation in response['Reservations']:
    for instance in reservation['Instances']:
        print(instance['InstanceId'])

# Must handle pagination manually
paginator = ec2_client.get_paginator('describe_instances')
for page in paginator.paginate():
    # Process page
    pass

# Waiters available
waiter = ec2_client.get_waiter('instance_running')
waiter.wait(InstanceIds=['i-12345'])
```

**Resource (High-Level):**

```python
# Resource provides object-oriented interface
ec2_resource = boto3.resource('ec2', region_name='us-east-1')

# Returns Python objects
for instance in ec2_resource.instances.all():
    print(instance.id)
    print(instance.state['Name'])
    instance.terminate()  # Direct methods

# Relationships
vpc = ec2_resource.Vpc('vpc-12345')
for subnet in vpc.subnets.all():
    print(subnet.cidr_block)

# Collections handle pagination automatically
for instance in ec2_resource.instances.filter(
    Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
):
    print(instance.id)
```

**When to Use What:**

| Scenario | Use Client | Use Resource |
|----------|-----------|--------------|
| Need all API operations | ✅ | ❌ (limited operations) |
| Complex filtering/pagination | ✅ | ❌ |
| Object-oriented code | ❌ | ✅ |
| Relationship traversal | ❌ | ✅ |
| Need waiters | ✅ | ❌ |
| Simple CRUD operations | ❌ | ✅ |

**Comparison Example:**

```python
# Client approach (more control)
response = ec2_client.create_vpc(CidrBlock='10.0.0.0/16')
vpc_id = response['Vpc']['VpcId']

ec2_client.modify_vpc_attribute(
    VpcId=vpc_id,
    EnableDnsHostnames={'Value': True}
)

ec2_client.create_tags(
    Resources=[vpc_id],
    Tags=[{'Key': 'Name', 'Value': 'my-vpc'}]
)

# Resource approach (cleaner)
vpc = ec2_resource.create_vpc(CidrBlock='10.0.0.0/16')
vpc.modify_attribute(EnableDnsHostnames={'Value': True})
vpc.create_tags(Tags=[{'Key': 'Name', 'Value': 'my-vpc'}])
```

**Best Practice: Use Both**

```python
class VPCManager:
    def __init__(self, region='us-east-1'):
        # Client for operations not available in resource
        self.client = boto3.client('ec2', region_name=region)
        # Resource for object-oriented operations
        self.resource = boto3.resource('ec2', region_name=region)
    
    def create_vpc(self, cidr_block):
        # Use resource for creation
        vpc = self.resource.create_vpc(CidrBlock=cidr_block)
        
        # Use client for waiter
        waiter = self.client.get_waiter('vpc_available')
        waiter.wait(VpcIds=[vpc.id])
        
        return vpc
```

### Q8: How do you handle pagination in boto3?

**Answer:**

**Problem: Default Limits**

```python
ec2 = boto3.client('ec2')

# Only returns first page (max 1000 instances)
response = ec2.describe_instances()
# Missing data if you have > 1000 instances!
```

**Solution 1: Manual Pagination (Don't do this)**

```python
instances = []
next_token = None

while True:
    if next_token:
        response = ec2.describe_instances(NextToken=next_token)
    else:
        response = ec2.describe_instances()
    
    instances.extend(response['Reservations'])
    
    next_token = response.get('NextToken')
    if not next_token:
        break
```

**Solution 2: Paginator (Recommended)**

```python
# Get paginator for operation
paginator = ec2.get_paginator('describe_instances')

# Iterate over pages
all_instances = []
for page in paginator.paginate():
    for reservation in page['Reservations']:
        for instance in reservation['Instances']:
            all_instances.append(instance)

print(f"Found {len(all_instances)} instances")
```

**Advanced Pagination with Filters:**

```python
# Paginate with filters
paginator = ec2.get_paginator('describe_instances')

page_iterator = paginator.paginate(
    Filters=[
        {'Name': 'instance-state-name', 'Values': ['running']},
        {'Name': 'tag:Environment', 'Values': ['production']}
    ],
    PaginationConfig={
        'MaxItems': 100,      # Maximum total items to return
        'PageSize': 10,       # Items per API call
        'StartingToken': None # Resume from previous pagination
    }
)

running_instances = []
for page in page_iterator:
    for reservation in page['Reservations']:
        running_instances.extend(reservation['Instances'])
```

**Using JMESPath for Filtering:**

```python
page_iterator = paginator.paginate()

# Filter results with JMESPath
filtered_instances = page_iterator.search(
    'Reservations[].Instances[?State.Name==`running`][]'
)

for instance in filtered_instances:
    print(f"{instance['InstanceId']}: {instance['InstanceType']}")
```

**Practical Example: List All VPCs Across Regions**

```python
import boto3
from concurrent.futures import ThreadPoolExecutor, as_completed

def list_vpcs_in_region(region):
    """List all VPCs in a region"""
    ec2 = boto3.client('ec2', region_name=region)
    paginator = ec2.get_paginator('describe_vpcs')
    
    vpcs = []
    for page in paginator.paginate():
        vpcs.extend(page['Vpcs'])
    
    return region, vpcs

def list_all_vpcs():
    """List VPCs across all regions"""
    ec2 = boto3.client('ec2')
    regions = [r['RegionName'] for r in ec2.describe_regions()['Regions']]
    
    all_vpcs = {}
    
    # Parallel execution
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(list_vpcs_in_region, region): region
            for region in regions
        }
        
        for future in as_completed(futures):
            region, vpcs = future.result()
            all_vpcs[region] = vpcs
            print(f"{region}: {len(vpcs)} VPCs")
    
    return all_vpcs

# Usage
vpcs = list_all_vpcs()
total = sum(len(v) for v in vpcs.values())
print(f"Total VPCs across all regions: {total}")
```

### Q9: Explain Python context managers and their use cases

**Answer:**

Context managers ensure proper resource cleanup using `with` statement.

**Built-in Context Managers:**

```python
# File handling
with open('file.txt', 'r') as f:
    content = f.read()
# File automatically closed even if exception occurs

# Database connections
import sqlite3
with sqlite3.connect('db.sqlite') as conn:
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users')
# Connection automatically closed

# Threading locks
import threading
lock = threading.Lock()
with lock:
    # Critical section
    # Lock automatically released
    pass
```

**Custom Context Manager (Class-Based):**

```python
class AWSSession:
    """Context manager for AWS sessions"""
    
    def __init__(self, region='us-east-1', profile=None):
        self.region = region
        self.profile = profile
        self.session = None
    
    def __enter__(self):
        """Called when entering 'with' block"""
        print(f"Creating AWS session for {self.region}")
        
        if self.profile:
            self.session = boto3.Session(
                region_name=self.region,
                profile_name=self.profile
            )
        else:
            self.session = boto3.Session(region_name=self.region)
        
        return self.session
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Called when exiting 'with' block"""
        print(f"Closing AWS session for {self.region}")
        
        # Return False to propagate exceptions
        # Return True to suppress exceptions
        if exc_type:
            print(f"Exception occurred: {exc_type.__name__}")
        
        return False  # Don't suppress exceptions

# Usage
with AWSSession(region='us-east-1') as session:
    ec2 = session.client('ec2')
    vpcs = ec2.describe_vpcs()
    print(f"Found {len(vpcs['Vpcs'])} VPCs")
# Session automatically closed
```

**Custom Context Manager (Function-Based):**

```python
from contextlib import contextmanager

@contextmanager
def temporary_vpc(ec2_client, cidr_block='10.0.0.0/16'):
    """Create temporary VPC that's automatically deleted"""
    
    # Setup (before yield)
    response = ec2_client.create_vpc(CidrBlock=cidr_block)
    vpc_id = response['Vpc']['VpcId']
    print(f"Created temporary VPC: {vpc_id}")
    
    try:
        yield vpc_id  # This is what 'as' captures
    
    finally:
        # Cleanup (after yield, always executed)
        print(f"Deleting temporary VPC: {vpc_id}")
        ec2_client.delete_vpc(VpcId=vpc_id)

# Usage
import boto3
ec2 = boto3.client('ec2')

with temporary_vpc(ec2) as vpc_id:
    # Do work with temporary VPC
    print(f"Working with VPC: {vpc_id}")
    
    # Create subnets, etc.
    ec2.create_subnet(
        VpcId=vpc_id,
        CidrBlock='10.0.1.0/24'
    )
# VPC automatically deleted even if exception occurs
```

**Practical Example: Database Transaction**

```python
@contextmanager
def database_transaction(conn):
    """Context manager for database transactions"""
    try:
        yield conn
        conn.commit()  # Commit if no exception
        print("Transaction committed")
    except Exception as e:
        conn.rollback()  # Rollback on exception
        print(f"Transaction rolled back: {e}")
        raise

# Usage
import sqlite3
conn = sqlite3.connect('app.db')

with database_transaction(conn):
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users VALUES (?, ?)", (1, "Alice"))
    cursor.execute("INSERT INTO users VALUES (?, ?)", (2, "Bob"))
    # If exception occurs here, both inserts are rolled back
```

**Real-World: AWS Resource Cleanup**

```python
@contextmanager
def temporary_security_group(ec2_client, vpc_id, name):
    """Create temporary security group with automatic cleanup"""
    
    sg_id = None
    try:
        # Create security group
        response = ec2_client.create_security_group(
            GroupName=name,
            Description=f"Temporary SG: {name}",
            VpcId=vpc_id
        )
        sg_id = response['GroupId']
        print(f"Created security group: {sg_id}")
        
        # Add rules
        ec2_client.authorize_security_group_ingress(
            GroupId=sg_id,
            IpPermissions=[{
                'IpProtocol': 'tcp',
                'FromPort': 22,
                'ToPort': 22,
                'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
            }]
        )
        
        yield sg_id
    
    finally:
        # Clean up
        if sg_id:
            print(f"Deleting security group: {sg_id}")
            try:
                ec2_client.delete_security_group(GroupId=sg_id)
            except Exception as e:
                print(f"Failed to delete SG: {e}")

# Usage
with temporary_security_group(ec2, 'vpc-12345', 'temp-sg') as sg_id:
    # Use security group for testing
    instance = ec2.run_instances(
        ImageId='ami-12345',
        InstanceType='t3.micro',
        SecurityGroupIds=[sg_id]
    )
# Security group automatically deleted
```

### Q10: Explain Python dataclasses and when to use them

**Answer:**

Dataclasses reduce boilerplate for classes that mainly store data.

**Without Dataclass:**

```python
class VPC:
    def __init__(self, vpc_id, cidr_block, region, state='available'):
        self.vpc_id = vpc_id
        self.cidr_block = cidr_block
        self.region = region
        self.state = state
    
    def __repr__(self):
        return f"VPC(vpc_id={self.vpc_id!r}, cidr_block={self.cidr_block!r})"
    
    def __eq__(self, other):
        if not isinstance(other, VPC):
            return False
        return (self.vpc_id == other.vpc_id and
                self.cidr_block == other.cidr_block)
```

**With Dataclass:**

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class VPC:
    vpc_id: str
    cidr_block: str
    region: str
    state: str = 'available'  # Default value
    
    # __init__, __repr__, __eq__ automatically generated!

# Usage
vpc = VPC(
    vpc_id='vpc-12345',
    cidr_block='10.0.0.0/16',
    region='us-east-1'
)

print(vpc)  # VPC(vpc_id='vpc-12345', cidr_block='10.0.0.0/16', ...)
```

**Advanced Features:**

```python
from dataclasses import dataclass, field, asdict, astuple
from typing import List
from datetime import datetime

@dataclass(frozen=False, order=True)  # frozen=True makes immutable
class Subnet:
    # Field with default factory
    subnet_id: str
    vpc_id: str
    cidr_block: str
    availability_zone: str
    tags: dict = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    
    # Exclude from __init__
    instance_count: int = field(default=0, init=False)
    
    # Exclude from __repr__
    _internal_id: str = field(default='', repr=False)
    
    def __post_init__(self):
        """Called after __init__"""
        # Validation
        if not self.subnet_id.startswith('subnet-'):
            raise ValueError(f"Invalid subnet ID: {self.subnet_id}")
        
        # Computed fields
        self.instance_count = self._get_instance_count()
    
    def _get_instance_count(self) -> int:
        # Query AWS for instance count
        return 0

# Usage
subnet = Subnet(
    subnet_id='subnet-12345',
    vpc_id='vpc-12345',
    cidr_block='10.0.1.0/24',
    availability_zone='us-east-1a',
    tags={'Environment': 'prod'}
)

# Convert to dict
data = asdict(subnet)
print(data)  # {'subnet_id': 'subnet-12345', ...}

# Convert to tuple
t = astuple(subnet)
print(t)  # ('subnet-12345', 'vpc-12345', ...)
```

**Real-World Example: AWS Resource Model**

```python
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum

class InstanceState(Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    STOPPING = 'stopping'
    STOPPED = 'stopped'
    TERMINATED = 'terminated'

@dataclass
class SecurityGroup:
    group_id: str
    group_name: str
    description: str = ''

@dataclass
class Instance:
    instance_id: str
    instance_type: str
    ami_id: str
    vpc_id: str
    subnet_id: str
    state: InstanceState = InstanceState.PENDING
    security_groups: List[SecurityGroup] = field(default_factory=list)
    tags: dict = field(default_factory=dict)
    private_ip: Optional[str] = None
    public_ip: Optional[str] = None
    
    @classmethod
    def from_boto3(cls, instance_dict):
        """Create from boto3 response"""
        return cls(
            instance_id=instance_dict['InstanceId'],
            instance_type=instance_dict['InstanceType'],
            ami_id=instance_dict['ImageId'],
            vpc_id=instance_dict['VpcId'],
            subnet_id=instance_dict['SubnetId'],
            state=InstanceState(instance_dict['State']['Name']),
            security_groups=[
                SecurityGroup(
                    group_id=sg['GroupId'],
                    group_name=sg['GroupName']
                )
                for sg in instance_dict.get('SecurityGroups', [])
            ],
            tags={
                tag['Key']: tag['Value']
                for tag in instance_dict.get('Tags', [])
            },
            private_ip=instance_dict.get('PrivateIpAddress'),
            public_ip=instance_dict.get('PublicIpAddress')
        )
    
    def is_running(self) -> bool:
        return self.state == InstanceState.RUNNING

# Usage
import boto3
ec2 = boto3.client('ec2')

response = ec2.describe_instances()
instances = []

for reservation in response['Reservations']:
    for instance_dict in reservation['Instances']:
        instance = Instance.from_boto3(instance_dict)
        instances.append(instance)

# Filter running instances
running = [i for i in instances if i.is_running()]
print(f"Running instances: {len(running)}")
```

---

## Jenkins & CI/CD Questions

### Q11: Declarative vs Scripted Pipeline - When to use each?

**Answer:**

**Declarative Pipeline (Recommended):**

**Pros:**
- Simpler syntax
- Built-in error handling
- Better validation
- Easier to read/maintain
- Best for standard workflows

**Cons:**
- Less flexible
- Can't do complex logic easily

```groovy
pipeline {
    agent any
    
    environment {
        AWS_REGION = 'us-east-1'
    }
    
    stages {
        stage('Build') {
            steps {
                sh 'make build'
            }
        }
        
        stage('Test') {
            steps {
                sh 'make test'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh 'make deploy'
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        failure {
            mail to: 'team@company.com',
                 subject: "Build Failed: ${env.JOB_NAME}",
                 body: "Build ${env.BUILD_NUMBER} failed"
        }
    }
}
```

**Scripted Pipeline (Advanced):**

**Pros:**
- Full Groovy power
- Complex logic possible
- Maximum flexibility
- Dynamic stage creation

**Cons:**
- More complex
- Easier to make mistakes
- Requires Groovy knowledge

```groovy
node {
    try {
        // Dynamic variables
        def environments = ['dev', 'staging', 'prod']
        def terraform_workspaces = [:]
        
        stage('Checkout') {
            checkout scm
        }
        
        // Dynamic stage creation
        for (env in environments) {
            terraform_workspaces[env] = {
                node {
                    stage("Deploy to ${env}") {
                        sh """
                            terraform workspace select ${env}
                            terraform apply -auto-approve
                        """
                    }
                }
            }
        }
        
        // Parallel execution
        parallel terraform_workspaces
        
        // Complex conditional logic
        if (env.BRANCH_NAME == 'main') {
            def deployToProd = input(
                message: 'Deploy to production?',
                parameters: [
                    choice(
                        name: 'DEPLOY',
                        choices: ['yes', 'no']
                    )
                ]
            )
            
            if (deployToProd == 'yes') {
                stage('Production Deploy') {
                    // Deploy logic
                }
            }
        }
        
    } catch (Exception e) {
        currentBuild.result = 'FAILURE'
        throw e
    } finally {
        cleanWs()
    }
}
```

**When to Use What:**

| Use Case | Declarative | Scripted |
|----------|-------------|----------|
| Simple CI/CD | ✅ | ❌ |
| Standard workflows | ✅ | ❌ |
| Complex logic | ❌ | ✅ |
| Dynamic stages | ❌ | ✅ |
| Team maintenance | ✅ | ❌ |
| Maximum flexibility | ❌ | ✅ |

**Best Practice: Hybrid Approach**

```groovy
// Declarative pipeline with script blocks for complex logic
pipeline {
    agent any
    
    stages {
        stage('Dynamic Deploy') {
            steps {
                script {
                    // Use Groovy for complex logic
                    def environments = readJSON file: 'envs.json'
                    
                    for (env in environments) {
                        if (env.enabled) {
                            sh "terraform workspace select ${env.name}"
                            sh "terraform apply -auto-approve"
                        }
                    }
                }
            }
        }
    }
}
```

### Q12: How do you handle secrets in Jenkins?

**Answer:**

**Method 1: Jenkins Credentials**

```groovy
pipeline {
    agent any
    
    environment {
        // Use credentials() to inject secrets
        AWS_CREDENTIALS = credentials('aws-credentials-id')
        // Creates: AWS_CREDENTIALS_USR and AWS_CREDENTIALS_PSW
    }
    
    stages {
        stage('Deploy') {
            steps {
                // Credentials automatically masked in logs
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-credentials',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    sh '''
                        aws s3 ls
                    '''
                }
            }
        }
    }
}
```

**Method 2: AWS Secrets Manager**

```groovy
pipeline {
    agent any
    
    stages {
        stage('Get Secrets') {
            steps {
                script {
                    // Retrieve from AWS Secrets Manager
                    def secretJson = sh(
                        script: '''
                            aws secretsmanager get-secret-value \
                                --secret-id prod/db/password \
                                --query SecretString \
                                --output text
                        ''',
                        returnStdout: true
                    ).trim()
                    
                    def secret = readJSON text: secretJson
                    
                    // Use secret (masked in logs)
                    sh "echo 'DB Password: ****'"
                }
            }
        }
    }
}
```

**Method 3: HashiCorp Vault**

```groovy
pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            steps {
                withVault([
                    vaultUrl: 'https://vault.company.com',
                    vaultCredentialId: 'vault-token',
                    engineVersion: 2,
                    vaultSecrets: [
                        [
                            path: 'secret/prod/aws',
                            secretValues: [
                                [envVar: 'AWS_ACCESS_KEY_ID', vaultKey: 'access_key'],
                                [envVar: 'AWS_SECRET_ACCESS_KEY', vaultKey: 'secret_key']
                            ]
                        ]
                    ]
                ]) {
                    sh 'aws s3 ls'
                }
            }
        }
    }
}
```

**Best Practices:**

1. **Never hardcode secrets**
```groovy
// ❌ BAD
environment {
    API_KEY = 'abc123secret'
}

// ✅ GOOD
environment {
    API_KEY = credentials('api-key-id')
}
```

2. **Use credential binding**
```groovy
withCredentials([
    string(credentialsId: 'api-key', variable: 'API_KEY'),
    file(credentialsId: 'config-file', variable: 'CONFIG')
]) {
    sh 'app deploy --api-key $API_KEY --config $CONFIG'
}
```

3. **Mask sensitive output**
```groovy
wrap([$class: 'MaskPasswordsBuildWrapper']) {
    sh 'echo $SECRET_PASSWORD'
}
```

### Q13: Explain Jenkins shared libraries and provide examples

**Answer:**

Shared libraries promote code reuse across multiple Jenkins pipelines.

**Library Structure:**

```
jenkins-shared-library/
├── vars/
│   ├── terraformPipeline.groovy    # Global variable
│   ├── deployToAWS.groovy
│   └── notifySlack.groovy
├── src/
│   └── com/
│       └── company/
│           └── jenkins/
│               ├── TerraformUtils.groovy  # Groovy class
│               └── AWSHelper.groovy
└── resources/
    ├── scripts/
    │   └── deploy.sh
    └── templates/
        └── Jenkinsfile.template
```

**vars/terraformPipeline.groovy:**

```groovy
// Global variable - can be called directly in Jenkinsfile
def call(Map config) {
    pipeline {
        agent any
        
        parameters {
            choice(
                name: 'ACTION',
                choices: ['plan', 'apply', 'destroy'],
                description: 'Terraform action'
            )
            choice(
                name: 'ENVIRONMENT',
                choices: config.environments ?: ['dev', 'prod'],
                description: 'Environment'
            )
        }
        
        stages {
            stage('Checkout') {
                steps {
                    checkout scm
                }
            }
            
            stage('Terraform Init') {
                steps {
                    script {
                        terraformInit(config.s3_bucket, params.ENVIRONMENT)
                    }
                }
            }
            
            stage('Terraform Plan') {
                when {
                    expression { params.ACTION in ['plan', 'apply'] }
                }
                steps {
                    script {
                        terraformPlan(params.ENVIRONMENT)
                    }
                }
            }
            
            stage('Approval') {
                when {
                    expression { params.ACTION == 'apply' }
                }
                steps {
                    input message: "Deploy to ${params.ENVIRONMENT}?",
                          ok: 'Deploy'
                }
            }
            
            stage('Terraform Apply') {
                when {
                    expression { params.ACTION == 'apply' }
                }
                steps {
                    script {
                        terraformApply()
                    }
                }
            }
        }
        
        post {
            success {
                notifySlack("SUCCESS: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
            }
            failure {
                notifySlack("FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
            }
        }
    }
}

def terraformInit(s3_bucket, environment) {
    sh """
        terraform init \
            -backend-config="bucket=${s3_bucket}" \
            -backend-config="key=${environment}/terraform.tfstate"
    """
}

def terraformPlan(environment) {
    sh """
        terraform plan \
            -var-file="environments/${environment}.tfvars" \
            -out=tfplan
    """
}

def terraformApply() {
    sh 'terraform apply -auto-approve tfplan'
}
```

**vars/notifySlack.groovy:**

```groovy
def call(String message, String channel = '#devops') {
    def color = message.contains('SUCCESS') ? 'good' : 'danger'
    
    slackSend(
        channel: channel,
        color: color,
        message: message,
        teamDomain: 'company',
        tokenCredentialId: 'slack-token'
    )
}
```

**src/com/company/jenkins/AWSHelper.groovy:**

```groovy
package com.company.jenkins

class AWSHelper {
    private script
    
    AWSHelper(script) {
        this.script = script
    }
    
    def createVPC(String cidrBlock, String name) {
        script.sh """
            aws ec2 create-vpc \
                --cidr-block ${cidrBlock} \
                --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=${name}}]'
        """
    }
    
    def listVPCs() {
        def output = script.sh(
            script: 'aws ec2 describe-vpcs --query "Vpcs[*].[VpcId,CidrBlock]" --output json',
            returnStdout: true
        ).trim()
        
        return script.readJSON text: output
    }
}
```

**Using Shared Library in Jenkinsfile:**

```groovy
// Method 1: Configure in Jenkins global config
@Library('jenkins-shared-library') _

// Use global variable
terraformPipeline(
    s3_bucket: 'my-terraform-state',
    environments: ['dev', 'staging', 'prod']
)
```

```groovy
// Method 2: Load specific version
@Library('jenkins-shared-library@v1.2.0') _

pipeline {
    agent any
    
    stages {
        stage('Deploy') {
            steps {
                script {
                    // Use class from src/
                    def aws = new com.company.jenkins.AWSHelper(this)
                    aws.createVPC('10.0.0.0/16', 'my-vpc')
                    
                    def vpcs = aws.listVPCs()
                    echo "Found ${vpcs.size()} VPCs"
                }
            }
        }
        
        stage('Notify') {
            steps {
                // Use global variable from vars/
                notifySlack("Deployment complete!", "#deployments")
            }
        }
    }
}
```

**Configure Library in Jenkins:**

1. Go to: Manage Jenkins → Configure System → Global Pipeline Libraries
2. Add library:
   - Name: `jenkins-shared-library`
   - Default version: `main`
   - Retrieval method: Modern SCM
   - Source Code Management: Git
   - Project Repository: `https://github.com/company/jenkins-shared-library.git`

---

**This is module 6 of 6. Interview preparation complete!** 🎉

**Continue to:** [Next Section - More Q&A](#aws-networking--security-questions)  
**Previous Module:** [Hands-On Projects](05_HANDS_ON_PROJECTS.md)  
**Back to Plan:** [INTERVIEW_PREP_PLAN.md](../INTERVIEW_PREP_PLAN.md)
