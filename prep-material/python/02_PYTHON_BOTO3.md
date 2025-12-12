# Python Programming + AWS boto3 for Cloud Engineers

## Table of Contents
- [Python Fundamentals Review](#python-fundamentals-review)
- [Object-Oriented Programming](#object-oriented-programming)
- [Design Patterns](#design-patterns)
- [AWS SDK (boto3)](#aws-sdk-boto3)
- [Building CLI Tools](#building-cli-tools)
- [Error Handling & Retries](#error-handling--retries)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## Python Fundamentals Review

### Data Structures

```python
# Lists - Ordered, mutable
subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
subnets.append("10.0.4.0/24")
subnets[0]  # "10.0.1.0/24"

# Dictionaries - Key-value pairs
vpc_config = {
    "cidr_block": "10.0.0.0/16",
    "region": "us-east-1",
    "tags": {"Environment": "prod"}
}
vpc_config["region"]  # "us-east-1"

# Sets - Unique, unordered
security_groups = {"sg-123", "sg-456", "sg-123"}  # Only 2 elements

# Tuples - Immutable
aws_region = ("us-east-1", "US East (N. Virginia)")
```

### List Comprehensions

```python
# Create list of subnet CIDRs
subnet_cidrs = [f"10.0.{i}.0/24" for i in range(1, 4)]
# Result: ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]

# Filter running instances
running_instances = [
    instance for instance in instances 
    if instance['State']['Name'] == 'running'
]

# Extract instance IDs
instance_ids = [i['InstanceId'] for i in instances]

# Nested comprehension
subnet_config = [
    {
        "cidr": f"10.0.{i}.0/24",
        "az": az
    }
    for i, az in enumerate(["us-east-1a", "us-east-1b", "us-east-1c"], 1)
]
```

### Dictionary Comprehensions

```python
# Create tag dictionary
tags = {f"Tag{i}": f"Value{i}" for i in range(1, 4)}
# Result: {"Tag1": "Value1", "Tag2": "Value2", "Tag3": "Value3"}

# Filter dictionary
large_instances = {
    k: v for k, v in instances.items() 
    if v['InstanceType'].startswith('t3.')
}

# Transform values
instance_map = {
    i['InstanceId']: i['PrivateIpAddress'] 
    for i in instances
}
```

### Functions and Decorators

```python
# Basic function
def create_vpc(cidr_block, region="us-east-1"):
    """Create a VPC with given CIDR block"""
    print(f"Creating VPC {cidr_block} in {region}")
    return {"VpcId": "vpc-12345"}

# Type hints (Python 3.6+)
def create_vpc(cidr_block: str, region: str = "us-east-1") -> dict:
    """Create a VPC with given CIDR block"""
    return {"VpcId": "vpc-12345"}

# *args and **kwargs
def create_tags(*resource_ids, **tags):
    """Apply tags to multiple resources"""
    for resource_id in resource_ids:
        print(f"Tagging {resource_id} with {tags}")

create_tags("vpc-123", "subnet-456", Environment="prod", Owner="ops")

# Lambda functions
get_instance_id = lambda instance: instance['InstanceId']
instance_ids = list(map(get_instance_id, instances))

# Better: Use list comprehension
instance_ids = [i['InstanceId'] for i in instances]
```

### Decorators

```python
import time
import functools

# Simple decorator
def timer(func):
    """Measure function execution time"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.2f} seconds")
        return result
    return wrapper

@timer
def list_vpcs():
    # Simulate API call
    time.sleep(1)
    return ["vpc-123", "vpc-456"]

# Decorator with parameters
def retry(max_attempts=3, delay=1):
    """Retry decorator"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                    time.sleep(delay * (attempt + 1))
        return wrapper
    return decorator

@retry(max_attempts=5, delay=2)
def create_vpc(cidr_block):
    # May fail due to rate limiting
    return ec2_client.create_vpc(CidrBlock=cidr_block)
```

### Context Managers

```python
# Built-in context manager
with open('config.json', 'r') as f:
    config = json.load(f)
# File automatically closed

# Custom context manager
class AWSSession:
    """Context manager for AWS sessions"""
    def __init__(self, region):
        self.region = region
        self.session = None
    
    def __enter__(self):
        print(f"Opening AWS session in {self.region}")
        self.session = boto3.Session(region_name=self.region)
        return self.session
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Closing AWS session")
        # Cleanup if needed
        return False  # Don't suppress exceptions

# Usage
with AWSSession('us-east-1') as session:
    ec2 = session.client('ec2')
    vpcs = ec2.describe_vpcs()

# Using contextlib
from contextlib import contextmanager

@contextmanager
def temp_tags(resource_id, **temp_tags):
    """Temporarily apply tags to a resource"""
    # Add temp tags
    ec2.create_tags(Resources=[resource_id], Tags=[
        {'Key': k, 'Value': v} for k, v in temp_tags.items()
    ])
    
    try:
        yield
    finally:
        # Remove temp tags
        ec2.delete_tags(Resources=[resource_id], Tags=[
            {'Key': k} for k in temp_tags.keys()
        ])

with temp_tags('vpc-123', Testing='true'):
    # Do testing
    pass
# Tags automatically removed
```

---

## Object-Oriented Programming

### Classes and Objects

```python
class VPC:
    """Represents an AWS VPC"""
    
    # Class variable
    default_region = "us-east-1"
    
    def __init__(self, cidr_block, region=None):
        """Initialize VPC instance"""
        self.cidr_block = cidr_block
        self.region = region or self.default_region
        self.vpc_id = None
        self.subnets = []
    
    def create(self):
        """Create the VPC in AWS"""
        print(f"Creating VPC {self.cidr_block} in {self.region}")
        # Simulated
        self.vpc_id = "vpc-12345"
        return self.vpc_id
    
    def add_subnet(self, subnet):
        """Add a subnet to this VPC"""
        self.subnets.append(subnet)
    
    def __repr__(self):
        """String representation"""
        return f"VPC(cidr={self.cidr_block}, vpc_id={self.vpc_id})"
    
    def __str__(self):
        """Human-readable string"""
        return f"VPC {self.vpc_id} ({self.cidr_block})"

# Usage
vpc = VPC("10.0.0.0/16", region="us-west-2")
vpc.create()
print(vpc)  # VPC vpc-12345 (10.0.0.0/16)
```

### Inheritance

```python
class AWSResource:
    """Base class for AWS resources"""
    
    def __init__(self, region="us-east-1"):
        self.region = region
        self.resource_id = None
        self.tags = {}
    
    def add_tag(self, key, value):
        """Add a tag to the resource"""
        self.tags[key] = value
    
    def create(self):
        """Create the resource (to be implemented by subclasses)"""
        raise NotImplementedError("Subclasses must implement create()")

class VPC(AWSResource):
    """VPC resource"""
    
    def __init__(self, cidr_block, region="us-east-1"):
        super().__init__(region)
        self.cidr_block = cidr_block
    
    def create(self):
        """Create VPC"""
        print(f"Creating VPC {self.cidr_block}")
        self.resource_id = "vpc-12345"
        return self.resource_id

class Subnet(AWSResource):
    """Subnet resource"""
    
    def __init__(self, vpc_id, cidr_block, availability_zone, region="us-east-1"):
        super().__init__(region)
        self.vpc_id = vpc_id
        self.cidr_block = cidr_block
        self.availability_zone = availability_zone
    
    def create(self):
        """Create subnet"""
        print(f"Creating subnet {self.cidr_block} in {self.availability_zone}")
        self.resource_id = "subnet-12345"
        return self.resource_id

# Usage
vpc = VPC("10.0.0.0/16", region="us-east-1")
vpc.add_tag("Environment", "production")
vpc.create()

subnet = Subnet(vpc.resource_id, "10.0.1.0/24", "us-east-1a")
subnet.add_tag("Tier", "public")
subnet.create()
```

### Polymorphism

```python
class AWSResource:
    """Base class"""
    def describe(self):
        raise NotImplementedError

class VPC(AWSResource):
    def describe(self):
        return f"VPC: {self.cidr_block}"

class Subnet(AWSResource):
    def describe(self):
        return f"Subnet: {self.cidr_block} in {self.availability_zone}"

# Polymorphism in action
resources = [
    VPC("10.0.0.0/16"),
    Subnet("vpc-123", "10.0.1.0/24", "us-east-1a"),
    Subnet("vpc-123", "10.0.2.0/24", "us-east-1b")
]

for resource in resources:
    print(resource.describe())  # Calls the appropriate method
```

### Encapsulation

```python
class VPC:
    """VPC with private attributes"""
    
    def __init__(self, cidr_block):
        self._cidr_block = cidr_block  # Protected (convention)
        self.__vpc_id = None            # Private (name mangling)
    
    @property
    def cidr_block(self):
        """Get CIDR block"""
        return self._cidr_block
    
    @cidr_block.setter
    def cidr_block(self, value):
        """Set CIDR block with validation"""
        if not self._is_valid_cidr(value):
            raise ValueError(f"Invalid CIDR block: {value}")
        self._cidr_block = value
    
    @property
    def vpc_id(self):
        """Get VPC ID (read-only)"""
        return self.__vpc_id
    
    def create(self):
        """Create VPC"""
        self.__vpc_id = "vpc-12345"
    
    @staticmethod
    def _is_valid_cidr(cidr):
        """Validate CIDR block"""
        import ipaddress
        try:
            ipaddress.ip_network(cidr)
            return True
        except ValueError:
            return False

# Usage
vpc = VPC("10.0.0.0/16")
print(vpc.cidr_block)  # 10.0.0.0/16

vpc.cidr_block = "192.168.0.0/16"  # OK
# vpc.cidr_block = "invalid"  # Raises ValueError

vpc.create()
print(vpc.vpc_id)  # vpc-12345
# vpc.vpc_id = "vpc-999"  # AttributeError: can't set attribute
```

### Dataclasses (Python 3.7+)

```python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class VPCConfig:
    """VPC configuration"""
    cidr_block: str
    region: str = "us-east-1"
    enable_dns_hostnames: bool = True
    enable_dns_support: bool = True
    tags: dict = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate after initialization"""
        if not self._is_valid_cidr(self.cidr_block):
            raise ValueError(f"Invalid CIDR: {self.cidr_block}")
    
    @staticmethod
    def _is_valid_cidr(cidr):
        import ipaddress
        try:
            ipaddress.ip_network(cidr)
            return True
        except ValueError:
            return False

@dataclass
class SubnetConfig:
    """Subnet configuration"""
    cidr_block: str
    availability_zone: str
    name: Optional[str] = None
    map_public_ip: bool = False

@dataclass
class NetworkArchitecture:
    """Complete network architecture"""
    vpc: VPCConfig
    public_subnets: List[SubnetConfig] = field(default_factory=list)
    private_subnets: List[SubnetConfig] = field(default_factory=list)

# Usage
vpc_config = VPCConfig(
    cidr_block="10.0.0.0/16",
    region="us-east-1",
    tags={"Environment": "prod"}
)

architecture = NetworkArchitecture(
    vpc=vpc_config,
    public_subnets=[
        SubnetConfig("10.0.1.0/24", "us-east-1a", "public-1", True),
        SubnetConfig("10.0.2.0/24", "us-east-1b", "public-2", True),
    ],
    private_subnets=[
        SubnetConfig("10.0.11.0/24", "us-east-1a", "private-1"),
        SubnetConfig("10.0.12.0/24", "us-east-1b", "private-2"),
    ]
)

print(architecture)
```

---

## Design Patterns

### 1. Factory Pattern

```python
from abc import ABC, abstractmethod

class AWSResource(ABC):
    """Abstract base class for AWS resources"""
    
    @abstractmethod
    def create(self):
        pass
    
    @abstractmethod
    def delete(self):
        pass

class VPC(AWSResource):
    def __init__(self, cidr_block):
        self.cidr_block = cidr_block
        self.vpc_id = None
    
    def create(self):
        print(f"Creating VPC: {self.cidr_block}")
        self.vpc_id = "vpc-12345"
        return self.vpc_id
    
    def delete(self):
        print(f"Deleting VPC: {self.vpc_id}")

class Subnet(AWSResource):
    def __init__(self, vpc_id, cidr_block, az):
        self.vpc_id = vpc_id
        self.cidr_block = cidr_block
        self.az = az
        self.subnet_id = None
    
    def create(self):
        print(f"Creating Subnet: {self.cidr_block} in {self.az}")
        self.subnet_id = "subnet-12345"
        return self.subnet_id
    
    def delete(self):
        print(f"Deleting Subnet: {self.subnet_id}")

class ResourceFactory:
    """Factory for creating AWS resources"""
    
    @staticmethod
    def create_resource(resource_type, **kwargs):
        """Create resource based on type"""
        if resource_type == "vpc":
            return VPC(kwargs['cidr_block'])
        elif resource_type == "subnet":
            return Subnet(kwargs['vpc_id'], kwargs['cidr_block'], kwargs['az'])
        else:
            raise ValueError(f"Unknown resource type: {resource_type}")

# Usage
factory = ResourceFactory()

vpc = factory.create_resource("vpc", cidr_block="10.0.0.0/16")
vpc.create()

subnet = factory.create_resource(
    "subnet",
    vpc_id=vpc.vpc_id,
    cidr_block="10.0.1.0/24",
    az="us-east-1a"
)
subnet.create()
```

### 2. Singleton Pattern

```python
class AWSClientManager:
    """Singleton for managing AWS clients"""
    
    _instance = None
    _clients = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_client(self, service_name, region="us-east-1"):
        """Get or create AWS client"""
        key = f"{service_name}:{region}"
        
        if key not in self._clients:
            import boto3
            self._clients[key] = boto3.client(service_name, region_name=region)
            print(f"Created new {service_name} client for {region}")
        
        return self._clients[key]

# Usage
manager1 = AWSClientManager()
manager2 = AWSClientManager()

print(manager1 is manager2)  # True (same instance)

ec2 = manager1.get_client('ec2', 'us-east-1')
ec2_2 = manager2.get_client('ec2', 'us-east-1')
print(ec2 is ec2_2)  # True (same client)
```

### 3. Strategy Pattern

```python
from abc import ABC, abstractmethod

class SubnetStrategy(ABC):
    """Abstract strategy for subnet creation"""
    
    @abstractmethod
    def create_subnets(self, vpc_id, vpc_cidr, azs):
        pass

class PublicSubnetStrategy(SubnetStrategy):
    """Create public subnets"""
    
    def create_subnets(self, vpc_id, vpc_cidr, azs):
        subnets = []
        for i, az in enumerate(azs):
            subnet = {
                'vpc_id': vpc_id,
                'cidr_block': f"10.0.{i+1}.0/24",
                'az': az,
                'map_public_ip': True,
                'tier': 'public'
            }
            subnets.append(subnet)
        return subnets

class PrivateSubnetStrategy(SubnetStrategy):
    """Create private subnets"""
    
    def create_subnets(self, vpc_id, vpc_cidr, azs):
        subnets = []
        for i, az in enumerate(azs):
            subnet = {
                'vpc_id': vpc_id,
                'cidr_block': f"10.0.{i+11}.0/24",
                'az': az,
                'map_public_ip': False,
                'tier': 'private'
            }
            subnets.append(subnet)
        return subnets

class VPCBuilder:
    """Context class that uses strategies"""
    
    def __init__(self, vpc_id, vpc_cidr):
        self.vpc_id = vpc_id
        self.vpc_cidr = vpc_cidr
        self.subnets = []
    
    def add_subnets(self, strategy: SubnetStrategy, azs):
        """Add subnets using given strategy"""
        new_subnets = strategy.create_subnets(self.vpc_id, self.vpc_cidr, azs)
        self.subnets.extend(new_subnets)

# Usage
vpc_builder = VPCBuilder("vpc-123", "10.0.0.0/16")

azs = ["us-east-1a", "us-east-1b", "us-east-1c"]

# Add public subnets
vpc_builder.add_subnets(PublicSubnetStrategy(), azs)

# Add private subnets
vpc_builder.add_subnets(PrivateSubnetStrategy(), azs)

print(f"Created {len(vpc_builder.subnets)} subnets")
for subnet in vpc_builder.subnets:
    print(f"  {subnet['tier']}: {subnet['cidr_block']} in {subnet['az']}")
```

### 4. Builder Pattern

```python
class VPCBuilder:
    """Builder for VPC configuration"""
    
    def __init__(self):
        self.config = {
            'region': 'us-east-1',
            'enable_dns': True,
            'tags': {}
        }
    
    def with_cidr(self, cidr_block):
        """Set CIDR block"""
        self.config['cidr_block'] = cidr_block
        return self
    
    def in_region(self, region):
        """Set region"""
        self.config['region'] = region
        return self
    
    def with_dns(self, enable=True):
        """Enable/disable DNS"""
        self.config['enable_dns'] = enable
        return self
    
    def with_tag(self, key, value):
        """Add tag"""
        self.config['tags'][key] = value
        return self
    
    def with_tags(self, **tags):
        """Add multiple tags"""
        self.config['tags'].update(tags)
        return self
    
    def build(self):
        """Build the configuration"""
        if 'cidr_block' not in self.config:
            raise ValueError("CIDR block is required")
        return self.config

# Usage - fluent interface
vpc_config = (VPCBuilder()
    .with_cidr("10.0.0.0/16")
    .in_region("us-west-2")
    .with_tags(Environment="production", Team="network")
    .build()
)

print(vpc_config)
```

---

## AWS SDK (boto3)

### Installation and Setup

```bash
pip install boto3

# Configure AWS credentials
aws configure
# or use environment variables
export AWS_ACCESS_KEY_ID="your-key"
export AWS_SECRET_ACCESS_KEY="your-secret"
export AWS_DEFAULT_REGION="us-east-1"
```

### Client vs Resource

```python
import boto3

# Client - Low-level service access
ec2_client = boto3.client('ec2', region_name='us-east-1')
response = ec2_client.describe_vpcs()
vpcs = response['Vpcs']  # Returns dict

# Resource - Higher-level, object-oriented
ec2_resource = boto3.resource('ec2', region_name='us-east-1')
vpcs = ec2_resource.vpcs.all()  # Returns objects

# When to use:
# Client: More control, all API operations, raw responses
# Resource: Simpler, Pythonic, not all services supported
```

### Working with EC2/VPC

```python
import boto3

ec2_client = boto3.client('ec2', region_name='us-east-1')

# Create VPC
response = ec2_client.create_vpc(
    CidrBlock='10.0.0.0/16',
    TagSpecifications=[
        {
            'ResourceType': 'vpc',
            'Tags': [
                {'Key': 'Name', 'Value': 'my-vpc'},
                {'Key': 'Environment', 'Value': 'production'}
            ]
        }
    ]
)
vpc_id = response['Vpc']['VpcId']
print(f"Created VPC: {vpc_id}")

# Enable DNS hostnames
ec2_client.modify_vpc_attribute(
    VpcId=vpc_id,
    EnableDnsHostnames={'Value': True}
)

# Create subnet
subnet_response = ec2_client.create_subnet(
    VpcId=vpc_id,
    CidrBlock='10.0.1.0/24',
    AvailabilityZone='us-east-1a',
    TagSpecifications=[
        {
            'ResourceType': 'subnet',
            'Tags': [{'Key': 'Name', 'Value': 'public-subnet-1'}]
        }
    ]
)
subnet_id = subnet_response['Subnet']['SubnetId']

# List VPCs
response = ec2_client.describe_vpcs()
for vpc in response['Vpcs']:
    vpc_id = vpc['VpcId']
    cidr = vpc['CidrBlock']
    print(f"VPC {vpc_id}: {cidr}")

# List subnets in VPC
response = ec2_client.describe_subnets(
    Filters=[
        {'Name': 'vpc-id', 'Values': [vpc_id]}
    ]
)
for subnet in response['Subnets']:
    print(f"  Subnet {subnet['SubnetId']}: {subnet['CidrBlock']}")
```

### Pagination

```python
# Bad - only gets first page (max 1000 results)
response = ec2_client.describe_instances()
instances = response['Reservations']

# Good - paginate through all results
paginator = ec2_client.get_paginator('describe_instances')
page_iterator = paginator.paginate()

all_instances = []
for page in page_iterator:
    for reservation in page['Reservations']:
        all_instances.extend(reservation['Instances'])

print(f"Found {len(all_instances)} instances")

# Alternative: Use PageIterator helper
paginator = ec2_client.get_paginator('describe_instances')
pages = paginator.paginate(
    Filters=[
        {'Name': 'instance-state-name', 'Values': ['running']}
    ]
)

# Get specific values using JMESPath
instances = pages.search('Reservations[].Instances[]')
for instance in instances:
    print(f"{instance['InstanceId']}: {instance['PrivateIpAddress']}")
```

### Waiters

```python
# Wait for instance to be running
ec2_client.run_instances(
    ImageId='ami-12345678',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1
)

# Instead of polling manually
waiter = ec2_client.get_waiter('instance_running')
waiter.wait(
    InstanceIds=['i-12345678'],
    WaiterConfig={
        'Delay': 15,  # Check every 15 seconds
        'MaxAttempts': 40  # Max 10 minutes
    }
)
print("Instance is now running!")

# Available waiters
print(ec2_client.waiter_names)
# ['instance_running', 'instance_stopped', 'instance_terminated', ...]
```

### Error Handling

```python
from botocore.exceptions import ClientError, BotoCoreError
import time

def create_vpc_with_retry(cidr_block, max_retries=3):
    """Create VPC with exponential backoff retry"""
    for attempt in range(max_retries):
        try:
            response = ec2_client.create_vpc(CidrBlock=cidr_block)
            return response['Vpc']['VpcId']
        
        except ClientError as e:
            error_code = e.response['Error']['Code']
            
            # Handle specific errors
            if error_code == 'VpcLimitExceeded':
                print("VPC limit exceeded!")
                raise
            
            elif error_code in ['RequestLimitExceeded', 'Throttling']:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    print(f"Throttled. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    print("Max retries exceeded")
                    raise
            
            elif error_code == 'InvalidParameterValue':
                print(f"Invalid parameter: {e.response['Error']['Message']}")
                raise
            
            else:
                print(f"Unexpected error: {error_code}")
                raise
        
        except BotoCoreError as e:
            print(f"BotoCore error: {e}")
            raise

# Usage
try:
    vpc_id = create_vpc_with_retry("10.0.0.0/16")
    print(f"Created VPC: {vpc_id}")
except Exception as e:
    print(f"Failed to create VPC: {e}")
```

---

**This is a partial module. Continue to next section for CLI Tools, Error Handling, and Interview Questions.**

---

**Next Section:** [CLI Tools & Complete Examples](02_PYTHON_BOTO3_PART2.md)  
**Previous Module:** [Terraform Fundamentals](01_TERRAFORM_FUNDAMENTALS.md)  
**Back to Plan:** [INTERVIEW_PREP_PLAN.md](INTERVIEW_PREP_PLAN.md)
