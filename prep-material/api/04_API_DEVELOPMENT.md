# API Development with FastAPI for Infrastructure Automation

## Table of Contents
- [FastAPI Fundamentals](#fastapi-fundamentals)
- [REST API Design](#rest-api-design)
- [Request/Response Models](#requestresponse-models)
- [AWS Integration](#aws-integration)
- [Authentication & Authorization](#authentication--authorization)
- [API Documentation](#api-documentation)
- [Best Practices](#best-practices)
- [Interview Questions](#interview-questions)

---

## FastAPI Fundamentals

### Why FastAPI?

**FastAPI** is a modern, fast web framework for building APIs with Python.

**Key Features:**
- **Fast**: High performance (comparable to NodeJS and Go)
- **Easy**: Simple to learn and use
- **Automatic documentation**: OpenAPI (Swagger) and ReDoc
- **Type hints**: Python 3.6+ type annotations
- **Async support**: Native async/await
- **Validation**: Automatic request validation with Pydantic

### Installation

```bash
pip install fastapi uvicorn[standard] boto3 pydantic
```

### Hello World API

```python
# main.py
from fastapi import FastAPI

app = FastAPI(
    title="Infrastructure API",
    description="Self-service infrastructure provisioning API",
    version="1.0.0"
)

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Infrastructure API is running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

# Run with: uvicorn main:app --reload
```

```bash
# Start server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Access API at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
# ReDoc at http://localhost:8000/redoc
```

### Path Parameters

```python
@app.get("/vpcs/{vpc_id}")
async def get_vpc(vpc_id: str):
    """Get VPC by ID"""
    return {
        "vpc_id": vpc_id,
        "cidr_block": "10.0.0.0/16",
        "state": "available"
    }

@app.get("/users/{user_id}/vpcs/{vpc_id}")
async def get_user_vpc(user_id: int, vpc_id: str):
    """Get specific VPC for a user"""
    return {
        "user_id": user_id,
        "vpc_id": vpc_id
    }
```

### Query Parameters

```python
from typing import Optional

@app.get("/vpcs")
async def list_vpcs(
    region: str = "us-east-1",
    limit: int = 10,
    state: Optional[str] = None
):
    """
    List VPCs with filters
    
    - region: AWS region
    - limit: Max results (default: 10)
    - state: Filter by state (optional)
    """
    return {
        "region": region,
        "limit": limit,
        "state": state,
        "vpcs": []
    }

# Usage:
# GET /vpcs
# GET /vpcs?region=us-west-2
# GET /vpcs?region=us-west-2&limit=20&state=available
```

---

## REST API Design

### RESTful Principles

```python
from fastapi import FastAPI, HTTPException, status

app = FastAPI()

# GET - Retrieve resources
@app.get("/vpcs")
async def list_vpcs():
    """List all VPCs"""
    return {"vpcs": []}

@app.get("/vpcs/{vpc_id}")
async def get_vpc(vpc_id: str):
    """Get specific VPC"""
    # Return 404 if not found
    if vpc_id == "vpc-notfound":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"VPC {vpc_id} not found"
        )
    return {"vpc_id": vpc_id}

# POST - Create new resource
@app.post("/vpcs", status_code=status.HTTP_201_CREATED)
async def create_vpc(cidr_block: str):
    """Create a new VPC"""
    vpc_id = "vpc-12345"
    return {
        "vpc_id": vpc_id,
        "cidr_block": cidr_block,
        "state": "pending"
    }

# PUT - Update entire resource
@app.put("/vpcs/{vpc_id}")
async def update_vpc(vpc_id: str, cidr_block: str):
    """Update VPC (full replacement)"""
    return {
        "vpc_id": vpc_id,
        "cidr_block": cidr_block
    }

# PATCH - Partial update
@app.patch("/vpcs/{vpc_id}")
async def patch_vpc(vpc_id: str, tags: dict):
    """Update VPC tags (partial update)"""
    return {
        "vpc_id": vpc_id,
        "tags": tags
    }

# DELETE - Remove resource
@app.delete("/vpcs/{vpc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vpc(vpc_id: str):
    """Delete a VPC"""
    # Return 204 No Content on success
    return None
```

---

## Request/Response Models

### Pydantic Models

```python
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import datetime

class VPCCreate(BaseModel):
    """Request model for creating VPC"""
    cidr_block: str = Field(
        ...,
        description="CIDR block for VPC",
        example="10.0.0.0/16"
    )
    region: str = Field(
        default="us-east-1",
        description="AWS region"
    )
    enable_dns_hostnames: bool = True
    enable_dns_support: bool = True
    tags: Optional[Dict[str, str]] = {}
    
    @validator('cidr_block')
    def validate_cidr(cls, v):
        """Validate CIDR block format"""
        import ipaddress
        try:
            ipaddress.ip_network(v)
        except ValueError:
            raise ValueError(f"Invalid CIDR block: {v}")
        return v
    
    @validator('region')
    def validate_region(cls, v):
        """Validate AWS region"""
        valid_regions = ['us-east-1', 'us-west-2', 'eu-west-1']
        if v not in valid_regions:
            raise ValueError(f"Invalid region. Must be one of: {valid_regions}")
        return v
    
    class Config:
        schema_extra = {
            "example": {
                "cidr_block": "10.0.0.0/16",
                "region": "us-east-1",
                "enable_dns_hostnames": True,
                "tags": {
                    "Environment": "production",
                    "Team": "network"
                }
            }
        }

class VPCResponse(BaseModel):
    """Response model for VPC"""
    vpc_id: str
    cidr_block: str
    region: str
    state: str
    enable_dns_hostnames: bool
    enable_dns_support: bool
    tags: Dict[str, str]
    created_at: datetime
    
    class Config:
        schema_extra = {
            "example": {
                "vpc_id": "vpc-0123456789abcdef0",
                "cidr_block": "10.0.0.0/16",
                "region": "us-east-1",
                "state": "available",
                "enable_dns_hostnames": True,
                "enable_dns_support": True,
                "tags": {"Environment": "production"},
                "created_at": "2024-01-15T10:30:00Z"
            }
        }

class SubnetCreate(BaseModel):
    """Request model for creating subnet"""
    vpc_id: str
    cidr_block: str
    availability_zone: str
    map_public_ip: bool = False
    tags: Optional[Dict[str, str]] = {}

class SecurityGroupRule(BaseModel):
    """Security group rule model"""
    protocol: str = Field(..., regex="^(tcp|udp|icmp|-1)$")
    from_port: int = Field(..., ge=0, le=65535)
    to_port: int = Field(..., ge=0, le=65535)
    cidr_blocks: List[str]
    description: Optional[str] = None

class SecurityGroupCreate(BaseModel):
    """Request model for creating security group"""
    name: str = Field(..., min_length=1, max_length=255)
    description: str
    vpc_id: str
    ingress_rules: List[SecurityGroupRule] = []
    egress_rules: List[SecurityGroupRule] = []
    tags: Optional[Dict[str, str]] = {}

# Using models in endpoints
@app.post("/vpcs", response_model=VPCResponse, status_code=201)
async def create_vpc(vpc: VPCCreate):
    """
    Create a new VPC
    
    Creates a VPC with the specified CIDR block and configuration.
    Returns the created VPC details including the VPC ID.
    """
    # Simulated response
    return VPCResponse(
        vpc_id="vpc-12345",
        cidr_block=vpc.cidr_block,
        region=vpc.region,
        state="available",
        enable_dns_hostnames=vpc.enable_dns_hostnames,
        enable_dns_support=vpc.enable_dns_support,
        tags=vpc.tags or {},
        created_at=datetime.now()
    )

@app.post("/security-groups", response_model=dict, status_code=201)
async def create_security_group(sg: SecurityGroupCreate):
    """Create a security group with rules"""
    return {
        "security_group_id": "sg-12345",
        "name": sg.name,
        "vpc_id": sg.vpc_id,
        "ingress_rules_count": len(sg.ingress_rules),
        "egress_rules_count": len(sg.egress_rules)
    }
```

---

## AWS Integration

### VPC Management API

```python
from fastapi import FastAPI, HTTPException, status, Depends
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError
from typing import List, Optional
import logging

app = FastAPI(title="AWS Infrastructure API")
logger = logging.getLogger(__name__)

# Dependency for EC2 client
def get_ec2_client(region: str = "us-east-1"):
    """Get EC2 client for region"""
    return boto3.client('ec2', region_name=region)

class VPCService:
    """Service for VPC operations"""
    
    def __init__(self, ec2_client):
        self.ec2 = ec2_client
    
    def create_vpc(self, cidr_block: str, tags: dict = None) -> dict:
        """Create VPC in AWS"""
        try:
            response = self.ec2.create_vpc(
                CidrBlock=cidr_block,
                TagSpecifications=[
                    {
                        'ResourceType': 'vpc',
                        'Tags': [
                            {'Key': k, 'Value': v}
                            for k, v in (tags or {}).items()
                        ]
                    }
                ] if tags else []
            )
            
            vpc = response['Vpc']
            vpc_id = vpc['VpcId']
            
            # Enable DNS hostnames
            self.ec2.modify_vpc_attribute(
                VpcId=vpc_id,
                EnableDnsHostnames={'Value': True}
            )
            
            # Enable DNS support
            self.ec2.modify_vpc_attribute(
                VpcId=vpc_id,
                EnableDnsSupport={'Value': True}
            )
            
            logger.info(f"Created VPC: {vpc_id}")
            return vpc
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            logger.error(f"Failed to create VPC: {error_code}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"AWS error: {error_code}"
            )
    
    def list_vpcs(self, filters: List[dict] = None) -> List[dict]:
        """List VPCs"""
        try:
            response = self.ec2.describe_vpcs(
                Filters=filters or []
            )
            return response['Vpcs']
        except ClientError as e:
            logger.error(f"Failed to list VPCs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to list VPCs"
            )
    
    def get_vpc(self, vpc_id: str) -> dict:
        """Get VPC by ID"""
        try:
            response = self.ec2.describe_vpcs(VpcIds=[vpc_id])
            vpcs = response['Vpcs']
            
            if not vpcs:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"VPC {vpc_id} not found"
                )
            
            return vpcs[0]
        except ClientError as e:
            if e.response['Error']['Code'] == 'InvalidVpcID.NotFound':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"VPC {vpc_id} not found"
                )
            raise
    
    def delete_vpc(self, vpc_id: str):
        """Delete VPC"""
        try:
            self.ec2.delete_vpc(VpcId=vpc_id)
            logger.info(f"Deleted VPC: {vpc_id}")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'InvalidVpcID.NotFound':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"VPC {vpc_id} not found"
                )
            elif error_code == 'DependencyViolation':
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="VPC has dependencies. Delete subnets/etc first."
                )
            raise

# Endpoints using the service
@app.post("/api/v1/vpcs", status_code=status.HTTP_201_CREATED)
async def create_vpc(
    vpc: VPCCreate,
    ec2_client=Depends(lambda: get_ec2_client("us-east-1"))
):
    """Create a new VPC"""
    service = VPCService(ec2_client)
    
    vpc_data = service.create_vpc(
        cidr_block=vpc.cidr_block,
        tags=vpc.tags
    )
    
    return {
        "vpc_id": vpc_data['VpcId'],
        "cidr_block": vpc_data['CidrBlock'],
        "state": vpc_data['State']
    }

@app.get("/api/v1/vpcs")
async def list_vpcs(
    region: str = "us-east-1",
    state: Optional[str] = None,
    ec2_client=Depends(get_ec2_client)
):
    """List all VPCs"""
    service = VPCService(ec2_client)
    
    filters = []
    if state:
        filters.append({'Name': 'state', 'Values': [state]})
    
    vpcs = service.list_vpcs(filters=filters)
    
    return {
        "count": len(vpcs),
        "vpcs": [
            {
                "vpc_id": vpc['VpcId'],
                "cidr_block": vpc['CidrBlock'],
                "state": vpc['State']
            }
            for vpc in vpcs
        ]
    }

@app.get("/api/v1/vpcs/{vpc_id}")
async def get_vpc(
    vpc_id: str,
    ec2_client=Depends(get_ec2_client)
):
    """Get VPC by ID"""
    service = VPCService(ec2_client)
    vpc = service.get_vpc(vpc_id)
    
    return {
        "vpc_id": vpc['VpcId'],
        "cidr_block": vpc['CidrBlock'],
        "state": vpc['State'],
        "is_default": vpc['IsDefault'],
        "tags": {tag['Key']: tag['Value'] for tag in vpc.get('Tags', [])}
    }

@app.delete("/api/v1/vpcs/{vpc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vpc(
    vpc_id: str,
    ec2_client=Depends(get_ec2_client)
):
    """Delete a VPC"""
    service = VPCService(ec2_client)
    service.delete_vpc(vpc_id)
    return None
```

### Complete Infrastructure Provisioning API

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List
import uuid

app = FastAPI()

class InfrastructureRequest(BaseModel):
    """Request to provision complete infrastructure"""
    project_name: str
    environment: str  # dev, staging, prod
    vpc_cidr: str
    availability_zones: List[str]
    enable_nat_gateway: bool = True
    enable_vpn: bool = False
    
class InfrastructureResponse(BaseModel):
    """Response with provisioning status"""
    request_id: str
    status: str
    message: str

def provision_infrastructure(request_id: str, request: InfrastructureRequest):
    """Background task to provision infrastructure"""
    import time
    import boto3
    
    ec2 = boto3.client('ec2', region_name='us-east-1')
    
    try:
        # 1. Create VPC
        vpc_response = ec2.create_vpc(
            CidrBlock=request.vpc_cidr,
            TagSpecifications=[{
                'ResourceType': 'vpc',
                'Tags': [
                    {'Key': 'Name', 'Value': f"{request.project_name}-{request.environment}"},
                    {'Key': 'Environment', 'Value': request.environment},
                    {'Key': 'RequestId', 'Value': request_id}
                ]
            }]
        )
        vpc_id = vpc_response['Vpc']['VpcId']
        
        # 2. Create Internet Gateway
        igw_response = ec2.create_internet_gateway(
            TagSpecifications=[{
                'ResourceType': 'internet-gateway',
                'Tags': [{'Key': 'Name', 'Value': f"{request.project_name}-igw"}]
            }]
        )
        igw_id = igw_response['InternetGateway']['InternetGatewayId']
        
        # Attach IGW to VPC
        ec2.attach_internet_gateway(InternetGatewayId=igw_id, VpcId=vpc_id)
        
        # 3. Create subnets
        public_subnets = []
        private_subnets = []
        
        for i, az in enumerate(request.availability_zones):
            # Public subnet
            public_subnet = ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=f"10.0.{i+1}.0/24",
                AvailabilityZone=az,
                TagSpecifications=[{
                    'ResourceType': 'subnet',
                    'Tags': [
                        {'Key': 'Name', 'Value': f"public-{az}"},
                        {'Key': 'Tier', 'Value': 'public'}
                    ]
                }]
            )
            public_subnets.append(public_subnet['Subnet']['SubnetId'])
            
            # Private subnet
            private_subnet = ec2.create_subnet(
                VpcId=vpc_id,
                CidrBlock=f"10.0.{i+11}.0/24",
                AvailabilityZone=az,
                TagSpecifications=[{
                    'ResourceType': 'subnet',
                    'Tags': [
                        {'Key': 'Name', 'Value': f"private-{az}"},
                        {'Key': 'Tier', 'Value': 'private'}
                    ]
                }]
            )
            private_subnets.append(private_subnet['Subnet']['SubnetId'])
        
        # 4. Create NAT Gateways (if enabled)
        if request.enable_nat_gateway:
            for i, subnet_id in enumerate(public_subnets):
                # Allocate Elastic IP
                eip_response = ec2.allocate_address(Domain='vpc')
                eip_id = eip_response['AllocationId']
                
                # Create NAT Gateway
                nat_response = ec2.create_nat_gateway(
                    SubnetId=subnet_id,
                    AllocationId=eip_id,
                    TagSpecifications=[{
                        'ResourceType': 'natgateway',
                        'Tags': [{'Key': 'Name', 'Value': f"nat-{i+1}"}]
                    }]
                )
        
        # Store result (in real app, use database)
        logger.info(f"Successfully provisioned infrastructure: {request_id}")
        
    except Exception as e:
        logger.error(f"Failed to provision infrastructure: {e}")

@app.post("/api/v1/infrastructure", response_model=InfrastructureResponse)
async def create_infrastructure(
    request: InfrastructureRequest,
    background_tasks: BackgroundTasks
):
    """
    Provision complete infrastructure
    
    Creates VPC, subnets, internet gateway, NAT gateways, etc.
    Returns immediately with request ID. Check status endpoint for progress.
    """
    request_id = str(uuid.uuid4())
    
    # Start provisioning in background
    background_tasks.add_task(
        provision_infrastructure,
        request_id,
        request
    )
    
    return InfrastructureResponse(
        request_id=request_id,
        status="pending",
        message="Infrastructure provisioning started"
    )

@app.get("/api/v1/infrastructure/{request_id}/status")
async def get_provisioning_status(request_id: str):
    """Get infrastructure provisioning status"""
    # In real app, query from database
    return {
        "request_id": request_id,
        "status": "in_progress",  # pending, in_progress, completed, failed
        "progress": 60,
        "current_step": "Creating NAT Gateways",
        "vpc_id": "vpc-12345",
        "resources_created": {
            "vpc": 1,
            "subnets": 6,
            "internet_gateway": 1,
            "nat_gateways": 2
        }
    }
```

---

## Authentication & Authorization

### API Key Authentication

```python
from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader
from typing import Optional

API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

# In production, store in database or secrets manager
VALID_API_KEYS = {
    "key-123": {"user": "admin", "permissions": ["read", "write", "delete"]},
    "key-456": {"user": "developer", "permissions": ["read", "write"]},
    "key-789": {"user": "viewer", "permissions": ["read"]}
}

async def get_api_key(api_key: str = Security(api_key_header)) -> dict:
    """Validate API key"""
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is missing"
        )
    
    if api_key not in VALID_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )
    
    return VALID_API_KEYS[api_key]

def require_permission(permission: str):
    """Dependency to check specific permission"""
    async def permission_checker(user: dict = Security(get_api_key)):
        if permission not in user["permissions"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return user
    return permission_checker

# Protected endpoints
@app.get("/api/v1/vpcs")
async def list_vpcs(user: dict = Security(get_api_key)):
    """List VPCs (requires API key)"""
    return {"user": user["user"], "vpcs": []}

@app.post("/api/v1/vpcs")
async def create_vpc(
    vpc: VPCCreate,
    user: dict = Depends(require_permission("write"))
):
    """Create VPC (requires write permission)"""
    return {"message": "VPC created", "created_by": user["user"]}

@app.delete("/api/v1/vpcs/{vpc_id}")
async def delete_vpc(
    vpc_id: str,
    user: dict = Depends(require_permission("delete"))
):
    """Delete VPC (requires delete permission)"""
    return {"message": "VPC deleted", "deleted_by": user["user"]}
```

### JWT Authentication

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel

SECRET_KEY = "your-secret-key-here"  # Use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

class TokenData(BaseModel):
    username: str
    permissions: list

def create_access_token(data: dict, expires_delta: timedelta = None):
    """Create JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """Validate JWT token"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        permissions: list = payload.get("permissions", [])
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        return TokenData(username=username, permissions=permissions)
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

@app.post("/api/v1/token")
async def login(username: str, password: str):
    """Login and get JWT token"""
    # Verify credentials (use database in production)
    if username != "admin" or password != "secret":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Create token
    access_token = create_access_token(
        data={
            "sub": username,
            "permissions": ["read", "write", "delete"]
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.get("/api/v1/vpcs")
async def list_vpcs(current_user: TokenData = Depends(get_current_user)):
    """List VPCs (requires JWT token)"""
    return {
        "user": current_user.username,
        "vpcs": []
    }
```

---

## Best Practices

### 1. Error Handling

```python
from fastapi import Request
from fastapi.responses import JSONResponse

class CustomException(Exception):
    def __init__(self, name: str, detail: str):
        self.name = name
        self.detail = detail

@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    """Handle custom exceptions"""
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.name,
            "detail": exc.detail,
            "path": request.url.path
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Custom 404 handler"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "detail": f"Resource at {request.url.path} not found"
        }
    )
```

### 2. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/v1/vpcs")
@limiter.limit("10/minute")
async def list_vpcs(request: Request):
    """List VPCs (rate limited to 10 requests per minute)"""
    return {"vpcs": []}
```

### 3. Logging

```python
import logging
from fastapi import Request
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests"""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"completed in {process_time:.3f}s "
        f"with status {response.status_code}"
    )
    
    return response
```

---

**This is module 4 of 6. Continue?**

**Next Module:** [Hands-On Projects](05_HANDS_ON_PROJECTS.md)  
**Previous Module:** [Jenkins CI/CD](03_JENKINS_CICD.md)  
**Back to Plan:** [INTERVIEW_PREP_PLAN.md](INTERVIEW_PREP_PLAN.md)
