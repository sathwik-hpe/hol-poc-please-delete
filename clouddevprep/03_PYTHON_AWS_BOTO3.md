# Python for AWS Cloud (boto3) ☁️

## Why This Matters for Target Company Role
The job requires **"experience with cloud APIs such as AWS and Azure"** and **"automating cloud infrastructure provisioning"**. boto3 is Python's AWS SDK - **THIS IS CRITICAL**.

---

## 1. boto3 Fundamentals

### Installation and Setup

```bash
# Install boto3
pip install boto3

# Install with type hints
pip install boto3-stubs[ec2,s3,iam]
```

### Authentication

```python
import boto3
from botocore.exceptions import ClientError, BotoCoreError

# Method 1: AWS CLI credentials (~/.aws/credentials)
# [default]
# aws_access_key_id = YOUR_KEY
# aws_secret_access_key = YOUR_SECRET

# Method 2: Environment variables
# export AWS_ACCESS_KEY_ID=xxx
# export AWS_SECRET_ACCESS_KEY=yyy
# export AWS_DEFAULT_REGION=us-east-1

# Method 3: IAM Role (best for EC2/Lambda)
# Automatic when running on AWS infrastructure

# Create clients
ec2_client = boto3.client('ec2', region_name='us-east-1')
s3_client = boto3.client('s3')
iam_client = boto3.client('iam')

# Create resources (higher-level, object-oriented)
ec2_resource = boto3.resource('ec2', region_name='us-east-1')
s3_resource = boto3.resource('s3')
```

**Interview Tip**: Know the difference between clients (low-level) vs resources (high-level OOP).

---

## 2. VPC Management with boto3

### Creating a VPC

```python
import boto3
from typing import Dict, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AWSNetworkManager:
    """Manage AWS VPC networking with boto3"""
    
    def __init__(self, region: str = 'us-east-1'):
        self.ec2_client = boto3.client('ec2', region_name=region)
        self.ec2_resource = boto3.resource('ec2', region_name=region)
        self.region = region
    
    def create_vpc(self, cidr_block: str, name: str) -> Optional[Dict]:
        """
        Create a VPC with tags
        
        Args:
            cidr_block: CIDR block (e.g., '10.0.0.0/16')
            name: VPC name for tagging
        
        Returns:
            VPC details dict or None on error
        """
        try:
            # Create VPC
            response = self.ec2_client.create_vpc(
                CidrBlock=cidr_block,
                AmazonProvidedIpv6CidrBlock=False,
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc',
                        'Tags': [
                            {'Key': 'Name', 'Value': name},
                            {'Key': 'ManagedBy', 'Value': 'Python'},
                            {'Key': 'Environment', 'Value': 'Production'}
                        ]
                    }
                ]
            )
            
            vpc_id = response['Vpc']['VpcId']
            logger.info(f"Created VPC: {vpc_id} with CIDR {cidr_block}")
            
            # Wait for VPC to be available
            waiter = self.ec2_client.get_waiter('vpc_available')
            waiter.wait(VpcIds=[vpc_id])
            
            # Enable DNS hostnames (important for instances)
            self.ec2_client.modify_vpc_attribute(
                VpcId=vpc_id,
                EnableDnsHostnames={'Value': True}
            )
            
            # Enable DNS support
            self.ec2_client.modify_vpc_attribute(
                VpcId=vpc_id,
                EnableDnsSupport={'Value': True}
            )
            
            return {
                'vpc_id': vpc_id,
                'cidr_block': cidr_block,
                'name': name,
                'region': self.region,
                'state': 'available'
            }
            
        except ClientError as e:
            logger.error(f"Failed to create VPC: {e}")
            return None
    
    def delete_vpc(self, vpc_id: str) -> bool:
        """
        Delete a VPC (must delete dependencies first)
        
        Args:
            vpc_id: VPC ID to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # First, delete all dependencies
            vpc = self.ec2_resource.Vpc(vpc_id)
            
            # Delete subnets
            for subnet in vpc.subnets.all():
                logger.info(f"Deleting subnet: {subnet.id}")
                subnet.delete()
            
            # Delete route tables (except main)
            for route_table in vpc.route_tables.all():
                if not route_table.associations_attribute:
                    continue
                is_main = any(assoc.get('Main') for assoc in route_table.associations_attribute)
                if not is_main:
                    logger.info(f"Deleting route table: {route_table.id}")
                    route_table.delete()
            
            # Delete internet gateways
            for igw in vpc.internet_gateways.all():
                logger.info(f"Detaching and deleting IGW: {igw.id}")
                vpc.detach_internet_gateway(InternetGatewayId=igw.id)
                igw.delete()
            
            # Delete security groups (except default)
            for sg in vpc.security_groups.all():
                if sg.group_name != 'default':
                    logger.info(f"Deleting security group: {sg.id}")
                    sg.delete()
            
            # Finally, delete VPC
            logger.info(f"Deleting VPC: {vpc_id}")
            vpc.delete()
            
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete VPC: {e}")
            return False

# Usage
network_mgr = AWSNetworkManager(region='us-east-1')
vpc = network_mgr.create_vpc('10.0.0.0/16', 'production-vpc')
print(f"Created VPC: {vpc}")
```

**Your HPE Experience**: You've worked with VPCs for platform infrastructure - mention this!

---

### Creating Subnets

```python
class AWSNetworkManager:
    # ... (previous code)
    
    def create_subnet(
        self,
        vpc_id: str,
        cidr_block: str,
        availability_zone: str,
        name: str,
        is_public: bool = False
    ) -> Optional[Dict]:
        """
        Create a subnet in a VPC
        
        Args:
            vpc_id: Parent VPC ID
            cidr_block: Subnet CIDR (e.g., '10.0.1.0/24')
            availability_zone: AZ (e.g., 'us-east-1a')
            name: Subnet name
            is_public: Whether to map public IPs automatically
        
        Returns:
            Subnet details dict or None on error
        """
        try:
            response = self.ec2_client.create_subnet(
                VpcId=vpc_id,
                CidrBlock=cidr_block,
                AvailabilityZone=availability_zone,
                TagSpecifications=[
                    {
                        'ResourceType': 'subnet',
                        'Tags': [
                            {'Key': 'Name', 'Value': name},
                            {'Key': 'Type', 'Value': 'Public' if is_public else 'Private'}
                        ]
                    }
                ]
            )
            
            subnet_id = response['Subnet']['SubnetId']
            logger.info(f"Created subnet: {subnet_id} in AZ {availability_zone}")
            
            # Auto-assign public IPs if public subnet
            if is_public:
                self.ec2_client.modify_subnet_attribute(
                    SubnetId=subnet_id,
                    MapPublicIpOnLaunch={'Value': True}
                )
            
            return {
                'subnet_id': subnet_id,
                'vpc_id': vpc_id,
                'cidr_block': cidr_block,
                'availability_zone': availability_zone,
                'is_public': is_public
            }
            
        except ClientError as e:
            logger.error(f"Failed to create subnet: {e}")
            return None
    
    def create_multi_az_subnets(
        self,
        vpc_id: str,
        base_cidr: str = '10.0',
        availability_zones: list = None
    ) -> Dict[str, list]:
        """
        Create public and private subnets across multiple AZs
        
        Args:
            vpc_id: VPC ID
            base_cidr: Base for CIDR blocks (e.g., '10.0')
            availability_zones: List of AZs (defaults to first 3 in region)
        
        Returns:
            Dict with 'public' and 'private' subnet lists
        """
        if not availability_zones:
            # Get available AZs in region
            azs_response = self.ec2_client.describe_availability_zones(
                Filters=[{'Name': 'state', 'Values': ['available']}]
            )
            availability_zones = [az['ZoneName'] for az in azs_response['AvailabilityZones'][:3]]
        
        public_subnets = []
        private_subnets = []
        
        for i, az in enumerate(availability_zones):
            # Public subnet (e.g., 10.0.1.0/24, 10.0.2.0/24, 10.0.3.0/24)
            public_cidr = f"{base_cidr}.{i+1}.0/24"
            public_subnet = self.create_subnet(
                vpc_id=vpc_id,
                cidr_block=public_cidr,
                availability_zone=az,
                name=f"public-subnet-{az}",
                is_public=True
            )
            if public_subnet:
                public_subnets.append(public_subnet)
            
            # Private subnet (e.g., 10.0.11.0/24, 10.0.12.0/24, 10.0.13.0/24)
            private_cidr = f"{base_cidr}.{i+11}.0/24"
            private_subnet = self.create_subnet(
                vpc_id=vpc_id,
                cidr_block=private_cidr,
                availability_zone=az,
                name=f"private-subnet-{az}",
                is_public=False
            )
            if private_subnet:
                private_subnets.append(private_subnet)
        
        logger.info(f"Created {len(public_subnets)} public and {len(private_subnets)} private subnets")
        
        return {
            'public': public_subnets,
            'private': private_subnets
        }

# Usage
subnets = network_mgr.create_multi_az_subnets(
    vpc_id='vpc-123456',
    base_cidr='10.0'
)
print(f"Public subnets: {len(subnets['public'])}")
print(f"Private subnets: {len(subnets['private'])}")
```

---

## 3. Internet Gateway and NAT Gateway

```python
class AWSNetworkManager:
    # ... (previous code)
    
    def create_internet_gateway(self, vpc_id: str, name: str) -> Optional[str]:
        """
        Create and attach Internet Gateway to VPC
        
        Args:
            vpc_id: VPC ID to attach to
            name: IGW name for tagging
        
        Returns:
            Internet Gateway ID or None
        """
        try:
            # Create IGW
            response = self.ec2_client.create_internet_gateway(
                TagSpecifications=[
                    {
                        'ResourceType': 'internet-gateway',
                        'Tags': [{'Key': 'Name', 'Value': name}]
                    }
                ]
            )
            
            igw_id = response['InternetGateway']['InternetGatewayId']
            logger.info(f"Created Internet Gateway: {igw_id}")
            
            # Attach to VPC
            self.ec2_client.attach_internet_gateway(
                InternetGatewayId=igw_id,
                VpcId=vpc_id
            )
            logger.info(f"Attached IGW {igw_id} to VPC {vpc_id}")
            
            return igw_id
            
        except ClientError as e:
            logger.error(f"Failed to create IGW: {e}")
            return None
    
    def create_nat_gateway(
        self,
        subnet_id: str,
        name: str,
        allocation_id: str = None
    ) -> Optional[str]:
        """
        Create NAT Gateway in a public subnet
        
        Args:
            subnet_id: Public subnet ID
            name: NAT Gateway name
            allocation_id: Elastic IP allocation ID (creates new if None)
        
        Returns:
            NAT Gateway ID or None
        """
        try:
            # Allocate Elastic IP if not provided
            if not allocation_id:
                eip_response = self.ec2_client.allocate_address(Domain='vpc')
                allocation_id = eip_response['AllocationId']
                logger.info(f"Allocated Elastic IP: {allocation_id}")
            
            # Create NAT Gateway
            response = self.ec2_client.create_nat_gateway(
                SubnetId=subnet_id,
                AllocationId=allocation_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'natgateway',
                        'Tags': [{'Key': 'Name', 'Value': name}]
                    }
                ]
            )
            
            nat_gateway_id = response['NatGateway']['NatGatewayId']
            logger.info(f"Created NAT Gateway: {nat_gateway_id}")
            
            # Wait for NAT Gateway to be available
            waiter = self.ec2_client.get_waiter('nat_gateway_available')
            waiter.wait(NatGatewayIds=[nat_gateway_id])
            logger.info(f"NAT Gateway {nat_gateway_id} is now available")
            
            return nat_gateway_id
            
        except ClientError as e:
            logger.error(f"Failed to create NAT Gateway: {e}")
            return None

# Usage
igw_id = network_mgr.create_internet_gateway('vpc-123456', 'production-igw')
nat_gw_id = network_mgr.create_nat_gateway('subnet-abc123', 'production-nat-gw')
```

---

## 4. Route Tables

```python
class AWSNetworkManager:
    # ... (previous code)
    
    def create_route_table(
        self,
        vpc_id: str,
        name: str,
        routes: list = None
    ) -> Optional[str]:
        """
        Create a route table with optional routes
        
        Args:
            vpc_id: VPC ID
            name: Route table name
            routes: List of route dicts [{'destination': '0.0.0.0/0', 'target': 'igw-xxx'}]
        
        Returns:
            Route table ID or None
        """
        try:
            # Create route table
            response = self.ec2_client.create_route_table(
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'route-table',
                        'Tags': [{'Key': 'Name', 'Value': name}]
                    }
                ]
            )
            
            route_table_id = response['RouteTable']['RouteTableId']
            logger.info(f"Created route table: {route_table_id}")
            
            # Add routes
            if routes:
                for route in routes:
                    self.add_route(
                        route_table_id=route_table_id,
                        destination_cidr=route['destination'],
                        **{k: v for k, v in route.items() if k != 'destination'}
                    )
            
            return route_table_id
            
        except ClientError as e:
            logger.error(f"Failed to create route table: {e}")
            return None
    
    def add_route(
        self,
        route_table_id: str,
        destination_cidr: str,
        gateway_id: str = None,
        nat_gateway_id: str = None,
        instance_id: str = None,
        network_interface_id: str = None,
        vpc_peering_connection_id: str = None
    ) -> bool:
        """
        Add a route to a route table
        
        Args:
            route_table_id: Route table ID
            destination_cidr: Destination CIDR block
            gateway_id: Internet gateway ID (for public routes)
            nat_gateway_id: NAT gateway ID (for private routes)
            instance_id: EC2 instance ID
            network_interface_id: ENI ID
            vpc_peering_connection_id: VPC peering connection ID
        
        Returns:
            True if successful
        """
        try:
            # Build route parameters
            route_params = {
                'RouteTableId': route_table_id,
                'DestinationCidrBlock': destination_cidr
            }
            
            # Add target (only one can be specified)
            if gateway_id:
                route_params['GatewayId'] = gateway_id
            elif nat_gateway_id:
                route_params['NatGatewayId'] = nat_gateway_id
            elif instance_id:
                route_params['InstanceId'] = instance_id
            elif network_interface_id:
                route_params['NetworkInterfaceId'] = network_interface_id
            elif vpc_peering_connection_id:
                route_params['VpcPeeringConnectionId'] = vpc_peering_connection_id
            else:
                raise ValueError("Must specify a target for the route")
            
            self.ec2_client.create_route(**route_params)
            logger.info(f"Added route {destination_cidr} to route table {route_table_id}")
            
            return True
            
        except ClientError as e:
            logger.error(f"Failed to add route: {e}")
            return False
    
    def associate_route_table(self, route_table_id: str, subnet_id: str) -> Optional[str]:
        """
        Associate a route table with a subnet
        
        Args:
            route_table_id: Route table ID
            subnet_id: Subnet ID
        
        Returns:
            Association ID or None
        """
        try:
            response = self.ec2_client.associate_route_table(
                RouteTableId=route_table_id,
                SubnetId=subnet_id
            )
            
            association_id = response['AssociationId']
            logger.info(f"Associated route table {route_table_id} with subnet {subnet_id}")
            
            return association_id
            
        except ClientError as e:
            logger.error(f"Failed to associate route table: {e}")
            return None

# Usage - Complete public/private routing setup
# Public route table (internet access)
public_rt_id = network_mgr.create_route_table(
    vpc_id='vpc-123456',
    name='public-route-table',
    routes=[
        {'destination': '0.0.0.0/0', 'gateway_id': igw_id}
    ]
)

# Private route table (NAT gateway for outbound)
private_rt_id = network_mgr.create_route_table(
    vpc_id='vpc-123456',
    name='private-route-table',
    routes=[
        {'destination': '0.0.0.0/0', 'nat_gateway_id': nat_gw_id}
    ]
)

# Associate with subnets
network_mgr.associate_route_table(public_rt_id, 'subnet-public-123')
network_mgr.associate_route_table(private_rt_id, 'subnet-private-456')
```

---

## 5. Security Groups

```python
class AWSNetworkManager:
    # ... (previous code)
    
    def create_security_group(
        self,
        vpc_id: str,
        name: str,
        description: str,
        ingress_rules: list = None,
        egress_rules: list = None
    ) -> Optional[str]:
        """
        Create a security group with rules
        
        Args:
            vpc_id: VPC ID
            name: Security group name
            description: Security group description
            ingress_rules: List of ingress rule dicts
            egress_rules: List of egress rule dicts (default allows all outbound)
        
        Returns:
            Security group ID or None
        
        Example ingress rule:
            {
                'protocol': 'tcp',
                'port': 443,
                'source': '0.0.0.0/0',
                'description': 'HTTPS from anywhere'
            }
        """
        try:
            # Create security group
            response = self.ec2_client.create_security_group(
                GroupName=name,
                Description=description,
                VpcId=vpc_id,
                TagSpecifications=[
                    {
                        'ResourceType': 'security-group',
                        'Tags': [{'Key': 'Name', 'Value': name}]
                    }
                ]
            )
            
            sg_id = response['GroupId']
            logger.info(f"Created security group: {sg_id}")
            
            # Add ingress rules
            if ingress_rules:
                for rule in ingress_rules:
                    self.add_security_group_rule(
                        sg_id=sg_id,
                        rule_type='ingress',
                        **rule
                    )
            
            # Add egress rules (default allows all if not specified)
            if egress_rules:
                # Remove default egress rule first
                self.ec2_client.revoke_security_group_egress(
                    GroupId=sg_id,
                    IpPermissions=[
                        {
                            'IpProtocol': '-1',
                            'IpRanges': [{'CidrIp': '0.0.0.0/0'}]
                        }
                    ]
                )
                # Add custom egress rules
                for rule in egress_rules:
                    self.add_security_group_rule(
                        sg_id=sg_id,
                        rule_type='egress',
                        **rule
                    )
            
            return sg_id
            
        except ClientError as e:
            logger.error(f"Failed to create security group: {e}")
            return None
    
    def add_security_group_rule(
        self,
        sg_id: str,
        rule_type: str,  # 'ingress' or 'egress'
        protocol: str,  # 'tcp', 'udp', 'icmp', or '-1' for all
        port: int = None,  # Single port
        port_range: tuple = None,  # (from_port, to_port)
        source: str = None,  # CIDR for ingress
        destination: str = None,  # CIDR for egress
        source_sg: str = None,  # Source security group ID
        description: str = ''
    ) -> bool:
        """Add a single rule to a security group"""
        try:
            # Determine port range
            if port:
                from_port = to_port = port
            elif port_range:
                from_port, to_port = port_range
            else:
                from_port = to_port = -1
            
            # Build IP permission
            ip_permission = {
                'IpProtocol': protocol,
                'FromPort': from_port,
                'ToPort': to_port
            }
            
            # Add source/destination
            if source_sg:
                ip_permission['UserIdGroupPairs'] = [
                    {
                        'GroupId': source_sg,
                        'Description': description
                    }
                ]
            elif source:
                ip_permission['IpRanges'] = [
                    {
                        'CidrIp': source,
                        'Description': description
                    }
                ]
            elif destination:
                ip_permission['IpRanges'] = [
                    {
                        'CidrIp': destination,
                        'Description': description
                    }
                ]
            
            # Add rule
            if rule_type == 'ingress':
                self.ec2_client.authorize_security_group_ingress(
                    GroupId=sg_id,
                    IpPermissions=[ip_permission]
                )
            else:
                self.ec2_client.authorize_security_group_egress(
                    GroupId=sg_id,
                    IpPermissions=[ip_permission]
                )
            
            logger.info(f"Added {rule_type} rule to {sg_id}: {protocol}:{from_port}-{to_port}")
            return True
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'InvalidPermission.Duplicate':
                logger.warning(f"Rule already exists: {e}")
                return True
            logger.error(f"Failed to add security group rule: {e}")
            return False

# Usage - Web server security group
web_sg_id = network_mgr.create_security_group(
    vpc_id='vpc-123456',
    name='web-server-sg',
    description='Security group for web servers',
    ingress_rules=[
        {
            'protocol': 'tcp',
            'port': 443,
            'source': '0.0.0.0/0',
            'description': 'HTTPS from internet'
        },
        {
            'protocol': 'tcp',
            'port': 80,
            'source': '0.0.0.0/0',
            'description': 'HTTP from internet'
        },
        {
            'protocol': 'tcp',
            'port': 22,
            'source': '10.0.0.0/16',
            'description': 'SSH from VPC only'
        }
    ]
)

# Database security group (only allows traffic from web SG)
db_sg_id = network_mgr.create_security_group(
    vpc_id='vpc-123456',
    name='database-sg',
    description='Security group for databases',
    ingress_rules=[
        {
            'protocol': 'tcp',
            'port': 3306,
            'source_sg': web_sg_id,
            'description': 'MySQL from web servers only'
        }
    ]
)
```

---

## 6. Complete VPC Setup (Putting It All Together)

```python
def provision_complete_vpc(
    region: str = 'us-east-1',
    vpc_cidr: str = '10.0.0.0/16',
    environment: str = 'production'
) -> Dict:
    """
    Provision a complete, production-ready VPC with:
    - 3 public subnets (across 3 AZs)
    - 3 private subnets (across 3 AZs)
    - Internet Gateway
    - NAT Gateways (one per AZ for high availability)
    - Route tables (public and private)
    - Security groups (web, app, db tiers)
    
    Args:
        region: AWS region
        vpc_cidr: VPC CIDR block
        environment: Environment name (production, staging, etc.)
    
    Returns:
        Dict with all created resource IDs
    """
    mgr = AWSNetworkManager(region=region)
    resources = {}
    
    # 1. Create VPC
    logger.info("=" * 60)
    logger.info("STEP 1: Creating VPC")
    logger.info("=" * 60)
    vpc = mgr.create_vpc(vpc_cidr, f"{environment}-vpc")
    resources['vpc'] = vpc
    
    # 2. Create subnets
    logger.info("\n" + "=" * 60)
    logger.info("STEP 2: Creating subnets across 3 AZs")
    logger.info("=" * 60)
    subnets = mgr.create_multi_az_subnets(
        vpc_id=vpc['vpc_id'],
        base_cidr=vpc_cidr.split('.0.0/')[0]  # Extract '10.0'
    )
    resources['subnets'] = subnets
    
    # 3. Create Internet Gateway
    logger.info("\n" + "=" * 60)
    logger.info("STEP 3: Creating Internet Gateway")
    logger.info("=" * 60)
    igw_id = mgr.create_internet_gateway(vpc['vpc_id'], f"{environment}-igw")
    resources['internet_gateway'] = igw_id
    
    # 4. Create NAT Gateways (one per AZ for HA)
    logger.info("\n" + "=" * 60)
    logger.info("STEP 4: Creating NAT Gateways (one per AZ)")
    logger.info("=" * 60)
    nat_gateways = []
    for i, public_subnet in enumerate(subnets['public']):
        nat_gw_id = mgr.create_nat_gateway(
            subnet_id=public_subnet['subnet_id'],
            name=f"{environment}-nat-gw-az{i+1}"
        )
        nat_gateways.append(nat_gw_id)
    resources['nat_gateways'] = nat_gateways
    
    # 5. Create and configure route tables
    logger.info("\n" + "=" * 60)
    logger.info("STEP 5: Creating route tables")
    logger.info("=" * 60)
    
    # Public route table (shared by all public subnets)
    public_rt_id = mgr.create_route_table(
        vpc_id=vpc['vpc_id'],
        name=f"{environment}-public-rt",
        routes=[{'destination': '0.0.0.0/0', 'gateway_id': igw_id}]
    )
    
    # Associate public route table with all public subnets
    for public_subnet in subnets['public']:
        mgr.associate_route_table(public_rt_id, public_subnet['subnet_id'])
    
    # Private route tables (one per AZ, each with its own NAT gateway)
    private_rt_ids = []
    for i, (private_subnet, nat_gw_id) in enumerate(zip(subnets['private'], nat_gateways)):
        private_rt_id = mgr.create_route_table(
            vpc_id=vpc['vpc_id'],
            name=f"{environment}-private-rt-az{i+1}",
            routes=[{'destination': '0.0.0.0/0', 'nat_gateway_id': nat_gw_id}]
        )
        mgr.associate_route_table(private_rt_id, private_subnet['subnet_id'])
        private_rt_ids.append(private_rt_id)
    
    resources['route_tables'] = {
        'public': public_rt_id,
        'private': private_rt_ids
    }
    
    # 6. Create security groups
    logger.info("\n" + "=" * 60)
    logger.info("STEP 6: Creating security groups (3-tier architecture)")
    logger.info("=" * 60)
    
    # Web tier security group
    web_sg_id = mgr.create_security_group(
        vpc_id=vpc['vpc_id'],
        name=f"{environment}-web-sg",
        description='Security group for web tier',
        ingress_rules=[
            {'protocol': 'tcp', 'port': 443, 'source': '0.0.0.0/0', 'description': 'HTTPS'},
            {'protocol': 'tcp', 'port': 80, 'source': '0.0.0.0/0', 'description': 'HTTP'},
        ]
    )
    
    # App tier security group
    app_sg_id = mgr.create_security_group(
        vpc_id=vpc['vpc_id'],
        name=f"{environment}-app-sg",
        description='Security group for application tier',
        ingress_rules=[
            {'protocol': 'tcp', 'port': 8080, 'source_sg': web_sg_id, 'description': 'App from web tier'},
        ]
    )
    
    # Database tier security group
    db_sg_id = mgr.create_security_group(
        vpc_id=vpc['vpc_id'],
        name=f"{environment}-db-sg",
        description='Security group for database tier',
        ingress_rules=[
            {'protocol': 'tcp', 'port': 3306, 'source_sg': app_sg_id, 'description': 'MySQL from app tier'},
            {'protocol': 'tcp', 'port': 5432, 'source_sg': app_sg_id, 'description': 'PostgreSQL from app tier'},
        ]
    )
    
    resources['security_groups'] = {
        'web': web_sg_id,
        'app': app_sg_id,
        'database': db_sg_id
    }
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("VPC PROVISIONING COMPLETE!")
    logger.info("=" * 60)
    logger.info(f"VPC ID: {vpc['vpc_id']}")
    logger.info(f"Public Subnets: {len(subnets['public'])}")
    logger.info(f"Private Subnets: {len(subnets['private'])}")
    logger.info(f"NAT Gateways: {len(nat_gateways)}")
    logger.info(f"Security Groups: 3 (web, app, db)")
    
    return resources

# Usage
if __name__ == '__main__':
    resources = provision_complete_vpc(
        region='us-east-1',
        vpc_cidr='10.0.0.0/16',
        environment='production'
    )
    
    import json
    print("\nCreated Resources:")
    print(json.dumps(resources, indent=2, default=str))
```

---

## 7. Interview Practice Scenarios

### Scenario 1: VPC Peering

**Question**: "How would you connect two VPCs using boto3?"

```python
def create_vpc_peering(
    requester_vpc_id: str,
    accepter_vpc_id: str,
    accepter_region: str = None
) -> Optional[str]:
    """Create VPC peering connection"""
    ec2_client = boto3.client('ec2')
    
    try:
        # Create peering connection
        params = {
            'VpcId': requester_vpc_id,
            'PeerVpcId': accepter_vpc_id
        }
        if accepter_region:
            params['PeerRegion'] = accepter_region
        
        response = ec2_client.create_vpc_peering_connection(**params)
        peering_id = response['VpcPeeringConnection']['VpcPeeringConnectionId']
        
        # Accept peering (if same account)
        ec2_client.accept_vpc_peering_connection(
            VpcPeeringConnectionId=peering_id
        )
        
        logger.info(f"Created and accepted VPC peering: {peering_id}")
        return peering_id
        
    except ClientError as e:
        logger.error(f"Failed to create VPC peering: {e}")
        return None
```

---

### Scenario 2: Cost Optimization

**Question**: "How would you identify unused resources to save costs?"

```python
def find_unused_network_resources(region: str = 'us-east-1') -> Dict:
    """Find unused network resources that cost money"""
    ec2_client = boto3.client('ec2', region_name=region)
    unused = {
        'elastic_ips': [],
        'nat_gateways': [],
        'network_interfaces': []
    }
    
    # Find unattached Elastic IPs ($0.005/hour = $3.60/month each)
    eips = ec2_client.describe_addresses()
    for eip in eips['Addresses']:
        if 'InstanceId' not in eip and 'NetworkInterfaceId' not in eip:
            unused['elastic_ips'].append({
                'allocation_id': eip['AllocationId'],
                'public_ip': eip['PublicIp'],
                'cost_per_month': 3.60
            })
    
    # Find idle NAT Gateways ($0.045/hour = $32.40/month each)
    nat_gateways = ec2_client.describe_nat_gateways(
        Filters=[{'Name': 'state', 'Values': ['available']}]
    )
    # Would need CloudWatch metrics to determine if truly idle
    for nat_gw in nat_gateways['NatGateways']:
        unused['nat_gateways'].append({
            'nat_gateway_id': nat_gw['NatGatewayId'],
            'subnet_id': nat_gw['SubnetId'],
            'cost_per_month': 32.40
        })
    
    # Calculate total potential savings
    total_savings = (
        len(unused['elastic_ips']) * 3.60 +
        len(unused['nat_gateways']) * 32.40
    )
    
    print(f"Potential monthly savings: ${total_savings:.2f}")
    return unused
```

---

## Key Takeaways for Target Company Interview

✅ **Know boto3 Clients vs Resources**: Clients are low-level, Resources are OOP  
✅ **Error Handling**: Always use try/except with `ClientError`  
✅ **Waiters**: Use `get_waiter()` for resource state transitions  
✅ **Pagination**: Use paginators for `describe_*` operations with many results  
✅ **Cost Awareness**: Know NAT Gateway costs, Elastic IP costs  
✅ **High Availability**: Multi-AZ design (3 AZs, NAT gateway per AZ)  
✅ **Security**: Principle of least privilege in security groups  

**Your HPE Advantage**: You've built platform infrastructure - connect this to AWS networking!

---

**Next Module**: Azure SDK (Python for Azure Cloud)
