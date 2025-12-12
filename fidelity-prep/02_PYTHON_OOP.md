# Python OOP Deep Dive 🐍

## Why This Matters for Fidelity Role
The job requires **"2+ years of hands-on experience with Python as your primary language"** and **"4+ years building enterprise-level software using OOP principles"**. This is CRITICAL for the Cloud Network team.

---

## 1. Object-Oriented Programming Fundamentals

### Classes and Objects

**Concept**: Classes are blueprints, objects are instances.

```python
# Basic class definition
class VPC:
    """Represents an AWS VPC resource"""
    
    def __init__(self, vpc_id, cidr_block, region):
        # Instance attributes
        self.vpc_id = vpc_id
        self.cidr_block = cidr_block
        self.region = region
        self.subnets = []
        self.route_tables = []
    
    def add_subnet(self, subnet):
        """Add a subnet to this VPC"""
        self.subnets.append(subnet)
        return f"Added subnet {subnet.subnet_id} to VPC {self.vpc_id}"
    
    def get_available_ips(self):
        """Calculate available IP addresses"""
        # CIDR /16 = 65,536 IPs, /24 = 256 IPs, etc.
        prefix = int(self.cidr_block.split('/')[1])
        return 2 ** (32 - prefix) - 5  # AWS reserves 5 IPs per subnet

# Usage
production_vpc = VPC('vpc-12345', '10.0.0.0/16', 'us-east-1')
print(production_vpc.get_available_ips())  # 65531
```

**Interview Tip**: Be ready to explain `self`, `__init__`, instance vs class attributes.

---

### Inheritance

**Concept**: Child classes inherit from parent classes, promoting code reuse.

```python
# Base class for all network resources
class NetworkResource:
    """Base class for AWS/Azure network components"""
    
    def __init__(self, resource_id, name, tags=None):
        self.resource_id = resource_id
        self.name = name
        self.tags = tags or {}
        self.created_at = None
    
    def add_tag(self, key, value):
        """Add a tag to the resource"""
        self.tags[key] = value
    
    def validate(self):
        """Validate resource configuration - to be overridden"""
        raise NotImplementedError("Subclasses must implement validate()")

# Child class - inherits from NetworkResource
class Subnet(NetworkResource):
    """Represents a subnet within a VPC"""
    
    def __init__(self, resource_id, name, cidr_block, availability_zone, tags=None):
        # Call parent constructor
        super().__init__(resource_id, name, tags)
        self.cidr_block = cidr_block
        self.availability_zone = availability_zone
        self.is_public = False
    
    def validate(self):
        """Override parent method"""
        # Check CIDR is valid
        if not self._is_valid_cidr(self.cidr_block):
            return False, "Invalid CIDR block"
        # Check AZ is specified
        if not self.availability_zone:
            return False, "Availability zone required"
        return True, "Valid"
    
    def _is_valid_cidr(self, cidr):
        """Private method to validate CIDR notation"""
        import ipaddress
        try:
            ipaddress.ip_network(cidr)
            return True
        except ValueError:
            return False

# Usage
subnet = Subnet('subnet-abc123', 'web-subnet', '10.0.1.0/24', 'us-east-1a')
subnet.add_tag('Environment', 'Production')
is_valid, message = subnet.validate()
print(f"Subnet validation: {message}")
```

**Your HPE Experience**: You've likely used inheritance in microservices architecture. Mention base service classes!

---

### Polymorphism

**Concept**: Different classes can be treated uniformly through shared interfaces.

```python
from abc import ABC, abstractmethod

# Abstract base class (interface)
class CloudProvider(ABC):
    """Interface for cloud provider operations"""
    
    @abstractmethod
    def create_network(self, cidr_block):
        """Create a virtual network"""
        pass
    
    @abstractmethod
    def create_subnet(self, network_id, cidr_block):
        """Create a subnet"""
        pass
    
    @abstractmethod
    def get_pricing(self):
        """Get pricing information"""
        pass

# AWS implementation
class AWSProvider(CloudProvider):
    def __init__(self, region):
        self.region = region
    
    def create_network(self, cidr_block):
        return f"Creating AWS VPC with {cidr_block} in {self.region}"
    
    def create_subnet(self, network_id, cidr_block):
        return f"Creating AWS subnet in VPC {network_id}"
    
    def get_pricing(self):
        return {"vpc": 0.00, "subnet": 0.00, "nat_gateway": 0.045}

# Azure implementation
class AzureProvider(CloudProvider):
    def __init__(self, region):
        self.region = region
    
    def create_network(self, cidr_block):
        return f"Creating Azure VNet with {cidr_block} in {self.region}"
    
    def create_subnet(self, network_id, cidr_block):
        return f"Creating Azure subnet in VNet {network_id}"
    
    def get_pricing(self):
        return {"vnet": 0.00, "subnet": 0.00, "nat_gateway": 0.05}

# Polymorphic function - works with any CloudProvider
def provision_network(provider: CloudProvider, cidr: str):
    """Provision network on any cloud provider"""
    print(provider.create_network(cidr))
    print(f"Pricing: {provider.get_pricing()}")
    return "Success"

# Usage - same function, different implementations
aws = AWSProvider('us-east-1')
azure = AzureProvider('eastus')

provision_network(aws, '10.0.0.0/16')    # Works with AWS
provision_network(azure, '10.1.0.0/16')  # Works with Azure
```

**Fidelity Connection**: Multi-cloud support (AWS + Azure) requires polymorphic design!

---

### Composition vs Inheritance

**Rule**: "Favor composition over inheritance" - Gang of Four

```python
# COMPOSITION APPROACH (Preferred for complex systems)

class SecurityGroup:
    """Firewall rules for network resources"""
    
    def __init__(self, sg_id, name):
        self.sg_id = sg_id
        self.name = name
        self.ingress_rules = []
        self.egress_rules = []
    
    def add_ingress_rule(self, port, protocol, source):
        rule = {
            'port': port,
            'protocol': protocol,
            'source': source
        }
        self.ingress_rules.append(rule)

class NetworkInterface:
    """Network interface with composed security"""
    
    def __init__(self, nic_id, ip_address):
        self.nic_id = nic_id
        self.ip_address = ip_address
        # COMPOSITION - "has-a" relationship
        self.security_groups = []  # List of SecurityGroup objects
    
    def attach_security_group(self, security_group):
        """Attach a security group to this NIC"""
        self.security_groups.append(security_group)
    
    def is_port_allowed(self, port, protocol):
        """Check if traffic is allowed through any attached SG"""
        for sg in self.security_groups:
            for rule in sg.ingress_rules:
                if rule['port'] == port and rule['protocol'] == protocol:
                    return True
        return False

# Usage
web_sg = SecurityGroup('sg-web', 'web-security-group')
web_sg.add_ingress_rule(443, 'tcp', '0.0.0.0/0')
web_sg.add_ingress_rule(80, 'tcp', '0.0.0.0/0')

nic = NetworkInterface('eni-123', '10.0.1.50')
nic.attach_security_group(web_sg)

print(nic.is_port_allowed(443, 'tcp'))  # True
print(nic.is_port_allowed(22, 'tcp'))   # False
```

**When to Use Each**:
- **Inheritance**: "is-a" relationship (Subnet IS-A NetworkResource)
- **Composition**: "has-a" relationship (NetworkInterface HAS-A SecurityGroup)

---

## 2. Design Patterns for Cloud Infrastructure

### Factory Pattern

**Use Case**: Creating different cloud resources based on configuration.

```python
class NetworkResourceFactory:
    """Factory for creating network resources"""
    
    @staticmethod
    def create_resource(resource_type, config):
        """Create appropriate resource based on type"""
        if resource_type == 'vpc':
            return VPC(
                vpc_id=config['id'],
                cidr_block=config['cidr'],
                region=config['region']
            )
        elif resource_type == 'subnet':
            return Subnet(
                resource_id=config['id'],
                name=config['name'],
                cidr_block=config['cidr'],
                availability_zone=config['az']
            )
        elif resource_type == 'security_group':
            return SecurityGroup(
                sg_id=config['id'],
                name=config['name']
            )
        else:
            raise ValueError(f"Unknown resource type: {resource_type}")

# Usage
config = {
    'id': 'vpc-123',
    'cidr': '10.0.0.0/16',
    'region': 'us-east-1'
}
vpc = NetworkResourceFactory.create_resource('vpc', config)
```

**Interview Question**: "How would you design a system to provision different cloud resources?"
**Answer**: Factory pattern for flexibility and extensibility!

---

### Singleton Pattern

**Use Case**: Single configuration manager or connection pool.

```python
class CloudConfigManager:
    """Singleton configuration manager"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.config = {}
            cls._instance.initialized = False
        return cls._instance
    
    def load_config(self, config_file):
        """Load configuration (only once)"""
        if not self.initialized:
            # Load from file, environment, etc.
            self.config = {
                'aws_region': 'us-east-1',
                'azure_region': 'eastus',
                'default_cidr': '10.0.0.0/16'
            }
            self.initialized = True
    
    def get(self, key, default=None):
        """Get configuration value"""
        return self.config.get(key, default)

# Usage - always returns same instance
config1 = CloudConfigManager()
config2 = CloudConfigManager()
print(config1 is config2)  # True - same object
```

---

### Strategy Pattern

**Use Case**: Different deployment strategies (blue/green, canary, rolling).

```python
from abc import ABC, abstractmethod

class DeploymentStrategy(ABC):
    """Abstract deployment strategy"""
    
    @abstractmethod
    def deploy(self, resources):
        pass

class BlueGreenDeployment(DeploymentStrategy):
    """Blue/Green deployment strategy"""
    
    def deploy(self, resources):
        steps = [
            "1. Deploy to GREEN environment",
            "2. Run smoke tests on GREEN",
            "3. Switch traffic from BLUE to GREEN",
            "4. Keep BLUE for rollback"
        ]
        return steps

class CanaryDeployment(DeploymentStrategy):
    """Canary deployment strategy"""
    
    def deploy(self, resources):
        steps = [
            "1. Deploy to 10% of instances",
            "2. Monitor metrics for 10 minutes",
            "3. Deploy to 50% if healthy",
            "4. Deploy to 100% if healthy"
        ]
        return steps

class DeploymentExecutor:
    """Execute deployment with chosen strategy"""
    
    def __init__(self, strategy: DeploymentStrategy):
        self.strategy = strategy
    
    def execute(self, resources):
        print(f"Executing {self.strategy.__class__.__name__}")
        return self.strategy.deploy(resources)

# Usage
resources = ["web-server", "api-server", "database"]

# Blue/Green deployment
executor = DeploymentExecutor(BlueGreenDeployment())
executor.execute(resources)

# Switch to Canary
executor.strategy = CanaryDeployment()
executor.execute(resources)
```

**Your HPE Experience**: You've done 900+ deployments - mention your deployment strategies!

---

## 3. Enterprise Python Practices

### Error Handling

```python
import logging
from typing import Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NetworkProvisioningError(Exception):
    """Custom exception for network provisioning failures"""
    pass

class NetworkProvisioner:
    """Enterprise-grade network provisioning"""
    
    def provision_vpc(self, cidr: str, region: str) -> Tuple[bool, Optional[str], Optional[dict]]:
        """
        Provision a VPC with proper error handling
        
        Returns:
            (success, error_message, vpc_details)
        """
        try:
            # Validation
            if not self._validate_cidr(cidr):
                raise ValueError(f"Invalid CIDR block: {cidr}")
            
            if not self._validate_region(region):
                raise ValueError(f"Invalid region: {region}")
            
            # Provision (simulate)
            logger.info(f"Provisioning VPC in {region} with CIDR {cidr}")
            
            # Simulate API call
            vpc_id = self._call_cloud_api('create_vpc', {
                'cidr': cidr,
                'region': region
            })
            
            vpc_details = {
                'vpc_id': vpc_id,
                'cidr': cidr,
                'region': region,
                'state': 'available'
            }
            
            logger.info(f"Successfully created VPC: {vpc_id}")
            return True, None, vpc_details
            
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return False, str(e), None
            
        except NetworkProvisioningError as e:
            logger.error(f"Provisioning failed: {e}")
            return False, str(e), None
            
        except Exception as e:
            logger.exception(f"Unexpected error: {e}")
            return False, "Internal error occurred", None
    
    def _validate_cidr(self, cidr: str) -> bool:
        """Validate CIDR notation"""
        import ipaddress
        try:
            network = ipaddress.ip_network(cidr)
            # Check if it's a valid private network
            return network.is_private
        except ValueError:
            return False
    
    def _validate_region(self, region: str) -> bool:
        """Validate AWS region"""
        valid_regions = ['us-east-1', 'us-west-2', 'eu-west-1']
        return region in valid_regions
    
    def _call_cloud_api(self, operation: str, params: dict) -> str:
        """Simulate cloud API call"""
        # In real code, this would use boto3 or Azure SDK
        if operation == 'create_vpc':
            return f"vpc-{hash(params['cidr']) % 100000}"
        raise NetworkProvisioningError(f"Unknown operation: {operation}")

# Usage
provisioner = NetworkProvisioner()
success, error, vpc = provisioner.provision_vpc('10.0.0.0/16', 'us-east-1')

if success:
    print(f"VPC created: {vpc['vpc_id']}")
else:
    print(f"Failed: {error}")
```

---

### Type Hints and Documentation

```python
from typing import List, Dict, Optional, Union
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Route:
    """Represents a network route"""
    destination: str
    target: str
    state: str = 'active'
    created_at: datetime = None

class RouteTable:
    """
    Manages routes for network traffic
    
    Attributes:
        route_table_id: Unique identifier
        vpc_id: Associated VPC ID
        routes: List of Route objects
    
    Example:
        >>> rt = RouteTable('rtb-123', 'vpc-456')
        >>> rt.add_route('0.0.0.0/0', 'igw-789')
        >>> rt.get_route_to('8.8.8.8')
        Route(destination='0.0.0.0/0', target='igw-789')
    """
    
    def __init__(self, route_table_id: str, vpc_id: str):
        self.route_table_id: str = route_table_id
        self.vpc_id: str = vpc_id
        self.routes: List[Route] = []
    
    def add_route(
        self, 
        destination: str, 
        target: str,
        state: str = 'active'
    ) -> Route:
        """
        Add a route to the route table
        
        Args:
            destination: CIDR block for destination (e.g., '0.0.0.0/0')
            target: Route target (e.g., 'igw-123', 'nat-456')
            state: Route state ('active', 'blackhole')
        
        Returns:
            The created Route object
        
        Raises:
            ValueError: If destination CIDR is invalid
        """
        route = Route(
            destination=destination,
            target=target,
            state=state,
            created_at=datetime.now()
        )
        self.routes.append(route)
        return route
    
    def get_route_to(self, ip_address: str) -> Optional[Route]:
        """
        Find the matching route for an IP address
        
        Args:
            ip_address: Destination IP to route
        
        Returns:
            Matching Route object, or None if no route found
        """
        import ipaddress
        ip = ipaddress.ip_address(ip_address)
        
        # Find most specific route (longest prefix match)
        best_match = None
        best_prefix_len = -1
        
        for route in self.routes:
            network = ipaddress.ip_network(route.destination)
            if ip in network:
                prefix_len = network.prefixlen
                if prefix_len > best_prefix_len:
                    best_match = route
                    best_prefix_len = prefix_len
        
        return best_match
    
    def to_dict(self) -> Dict[str, Union[str, List[Dict]]]:
        """Convert to dictionary for serialization"""
        return {
            'route_table_id': self.route_table_id,
            'vpc_id': self.vpc_id,
            'routes': [
                {
                    'destination': r.destination,
                    'target': r.target,
                    'state': r.state
                }
                for r in self.routes
            ]
        }
```

---

### Unit Testing

```python
import unittest
from unittest.mock import Mock, patch

class TestRouteTable(unittest.TestCase):
    """Test suite for RouteTable class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.route_table = RouteTable('rtb-test', 'vpc-test')
    
    def test_add_route(self):
        """Test adding a route"""
        route = self.route_table.add_route('10.0.0.0/16', 'local')
        
        self.assertEqual(route.destination, '10.0.0.0/16')
        self.assertEqual(route.target, 'local')
        self.assertEqual(len(self.route_table.routes), 1)
    
    def test_get_route_to_exact_match(self):
        """Test finding route with exact match"""
        self.route_table.add_route('10.0.0.0/16', 'local')
        
        route = self.route_table.get_route_to('10.0.1.50')
        
        self.assertIsNotNone(route)
        self.assertEqual(route.target, 'local')
    
    def test_get_route_to_no_match(self):
        """Test finding route with no match"""
        self.route_table.add_route('10.0.0.0/16', 'local')
        
        route = self.route_table.get_route_to('192.168.1.1')
        
        self.assertIsNone(route)
    
    def test_longest_prefix_match(self):
        """Test longest prefix matching (most specific route wins)"""
        # Add broad route
        self.route_table.add_route('0.0.0.0/0', 'igw-internet')
        # Add specific route
        self.route_table.add_route('10.0.1.0/24', 'nat-specific')
        
        # Should match specific route
        route = self.route_table.get_route_to('10.0.1.50')
        self.assertEqual(route.target, 'nat-specific')
        
        # Should match broad route
        route = self.route_table.get_route_to('8.8.8.8')
        self.assertEqual(route.target, 'igw-internet')
    
    def test_to_dict(self):
        """Test serialization to dictionary"""
        self.route_table.add_route('0.0.0.0/0', 'igw-123')
        
        result = self.route_table.to_dict()
        
        self.assertEqual(result['route_table_id'], 'rtb-test')
        self.assertEqual(len(result['routes']), 1)
        self.assertEqual(result['routes'][0]['target'], 'igw-123')

# Run tests
if __name__ == '__main__':
    unittest.main()
```

---

## 4. Practice Exercises

### Exercise 1: Load Balancer Class

**Task**: Create a `LoadBalancer` class with:
- Health check functionality
- Target registration/deregistration
- Traffic distribution algorithm (round-robin)

<details>
<summary>Click for solution</summary>

```python
from typing import List
from enum import Enum

class HealthStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class Target:
    def __init__(self, target_id: str, ip_address: str, port: int):
        self.target_id = target_id
        self.ip_address = ip_address
        self.port = port
        self.health_status = HealthStatus.UNKNOWN
    
    def __repr__(self):
        return f"Target({self.target_id}, {self.ip_address}:{self.port})"

class LoadBalancer:
    def __init__(self, lb_id: str, name: str):
        self.lb_id = lb_id
        self.name = name
        self.targets: List[Target] = []
        self.current_target_index = 0
    
    def register_target(self, target: Target):
        """Register a target with the load balancer"""
        self.targets.append(target)
        target.health_status = HealthStatus.HEALTHY
    
    def deregister_target(self, target_id: str):
        """Deregister a target"""
        self.targets = [t for t in self.targets if t.target_id != target_id]
    
    def perform_health_check(self, target: Target) -> bool:
        """Perform health check (simulated)"""
        # In real implementation, this would make HTTP/TCP request
        import random
        is_healthy = random.choice([True, True, True, False])  # 75% healthy
        target.health_status = HealthStatus.HEALTHY if is_healthy else HealthStatus.UNHEALTHY
        return is_healthy
    
    def get_healthy_targets(self) -> List[Target]:
        """Get list of healthy targets"""
        return [t for t in self.targets if t.health_status == HealthStatus.HEALTHY]
    
    def route_request(self) -> Target:
        """Route request using round-robin algorithm"""
        healthy_targets = self.get_healthy_targets()
        
        if not healthy_targets:
            raise Exception("No healthy targets available")
        
        # Round-robin
        target = healthy_targets[self.current_target_index % len(healthy_targets)]
        self.current_target_index += 1
        
        return target

# Usage
lb = LoadBalancer('lb-123', 'web-load-balancer')
lb.register_target(Target('target-1', '10.0.1.10', 80))
lb.register_target(Target('target-2', '10.0.1.20', 80))
lb.register_target(Target('target-3', '10.0.1.30', 80))

# Simulate requests
for i in range(5):
    target = lb.route_request()
    print(f"Request {i+1} routed to {target}")
```
</details>

---

### Exercise 2: Network Policy Validator

**Task**: Create a class that validates network security policies against compliance rules.

**Requirements**:
- Check if SSH (port 22) is open to the internet (0.0.0.0/0)
- Verify all production resources have required tags
- Ensure encryption is enabled

---

## 5. Interview Preparation

### Common Python OOP Questions

**Q1: Explain the difference between `@staticmethod`, `@classmethod`, and instance methods.**

```python
class NetworkUtils:
    # Class variable
    default_region = 'us-east-1'
    
    # Instance method - has access to instance (self)
    def get_instance_region(self):
        return self.default_region
    
    # Class method - has access to class (cls)
    @classmethod
    def set_default_region(cls, region):
        cls.default_region = region
    
    # Static method - no access to instance or class
    @staticmethod
    def validate_cidr(cidr):
        import ipaddress
        try:
            ipaddress.ip_network(cidr)
            return True
        except ValueError:
            return False

# Usage
NetworkUtils.validate_cidr('10.0.0.0/16')  # Static - no instance needed
NetworkUtils.set_default_region('us-west-2')  # Class method - modifies class
util = NetworkUtils()
util.get_instance_region()  # Instance method - needs object
```

**Answer**: 
- **Instance method**: Operates on instance data (`self`)
- **Class method**: Operates on class data (`cls`), can be used as alternative constructors
- **Static method**: Utility function, no access to instance or class data

---

**Q2: What are Python properties and why use them?**

```python
class VPCConfig:
    def __init__(self, cidr):
        self._cidr = cidr  # Private attribute
    
    @property
    def cidr(self):
        """Getter - accessed like an attribute"""
        return self._cidr
    
    @cidr.setter
    def cidr(self, value):
        """Setter - with validation"""
        import ipaddress
        try:
            network = ipaddress.ip_network(value)
            if not network.is_private:
                raise ValueError("Must be private IP range")
            self._cidr = value
        except ValueError as e:
            raise ValueError(f"Invalid CIDR: {e}")
    
    @property
    def ip_count(self):
        """Computed property (no setter - read-only)"""
        import ipaddress
        network = ipaddress.ip_network(self._cidr)
        return network.num_addresses

# Usage
vpc = VPCConfig('10.0.0.0/16')
print(vpc.cidr)  # Getter - looks like attribute access
print(vpc.ip_count)  # Computed - calculated on demand
vpc.cidr = '10.1.0.0/16'  # Setter - with validation
# vpc.cidr = '1.1.1.1/32'  # Raises ValueError - not private
```

**Answer**: Properties provide controlled access to attributes with validation, computed values, and backward compatibility.

---

**Q3: How do you handle multiple inheritance in Python?**

```python
# Method Resolution Order (MRO) example
class AWSResource:
    def deploy(self):
        return "Deploying to AWS"

class AzureResource:
    def deploy(self):
        return "Deploying to Azure"

class MultiCloudResource(AWSResource, AzureResource):
    """Multiple inheritance - AWS takes precedence (left-to-right)"""
    pass

resource = MultiCloudResource()
print(resource.deploy())  # "Deploying to AWS" - first parent wins
print(MultiCloudResource.__mro__)  # Show method resolution order
```

**Answer**: Python uses C3 linearization (MRO). Left-to-right, depth-first order. Use `super()` for cooperative multiple inheritance.

---

## Key Takeaways for Fidelity Interview

✅ **Demonstrate Enterprise Thinking**: Show you understand large-scale systems, not just scripts  
✅ **Use Real Examples**: Reference your HPE platform engineering, 900+ deployments  
✅ **Focus on Maintainability**: Emphasize testing, error handling, documentation  
✅ **Show Multi-Cloud**: AWS + Azure polymorphic design  
✅ **Network Context**: Apply OOP to network resources (VPC, subnets, routes)  

**Next Steps**:
1. Practice coding challenges on LeetCode (Medium level, Python)
2. Review your HPE code for OOP examples to discuss
3. Read "Fluent Python" by Luciano Ramalho (Chapters 1-5)
4. Build a small project: "Multi-cloud network provisioner"

---

**Related Documents**:
- [01_SKILLS_REQUIRED.md](./01_SKILLS_REQUIRED.md) - Overview of all Fidelity requirements
- Coming next: Python for Cloud (AWS boto3)
