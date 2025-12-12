# AWS CloudFormation (Infrastructure as Code) ☁️

## Why This Matters
Fidelity requires **"Terraform and AWS CloudFormation"**. CF is AWS-native IaC.

---

## 1. CloudFormation Basics

### Template Structure (YAML)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production VPC with public and private subnets'

Parameters:
  VpcCidr:
    Type: String
    Default: '10.0.0.0/16'
    Description: CIDR block for VPC

Mappings:
  RegionMap:
    us-east-1:
      AMI: ami-0c55b159cbfafe1f0
    us-west-2:
      AMI: ami-0d1cd67c26f5fca19

Conditions:
  IsProduction: !Equals [!Ref Environment, 'production']

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${AWS::StackName}-vpc'

Outputs:
  VpcId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'
```

---

## 2. Intrinsic Functions

```yaml
# !Ref - Reference parameter/resource
VpcId: !Ref VPC

# !Sub - String substitution
Name: !Sub '${Environment}-vpc'
Complex: !Sub 
  - 'arn:aws:s3:::${BucketName}/path'
  - BucketName: !Ref MyBucket

# !GetAtt - Get resource attribute
DnsName: !GetAtt LoadBalancer.DNSName

# !Join - Join strings
SecurityGroups: !Join [',', [!Ref SG1, !Ref SG2]]

# !Select - Select from list
FirstAz: !Select [0, !GetAZs '']

# !If - Conditional
InstanceType: !If [IsProduction, 't3.large', 't3.micro']

# !FindInMap - Lookup in Mappings
ImageId: !FindInMap [RegionMap, !Ref 'AWS::Region', AMI]

# !GetAZs - Get availability zones
AvailabilityZones: !GetAZs ''  # All AZs in region

# !Cidr - Generate CIDR blocks
SubnetCidrs: !Cidr [!Ref VpcCidr, 6, 8]  # 6 subnets with /24
```

---

## 3. Complete VPC Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Production VPC with Multi-AZ subnets, NAT Gateways, and routing'

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues:
      - development
      - staging
      - production

  VpcCidr:
    Type: String
    Default: '10.0.0.0/16'

Resources:
  # VPC
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [0, !Cidr [!Ref VpcCidr, 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-1a'

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [1, !Cidr [!Ref VpcCidr, 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-1b'

  # NAT Gateways
  NatGateway1EIP:
    Type: AWS::EC2::EIP
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NatGateway1:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NatGateway1EIP.AllocationId
      SubnetId: !Ref PublicSubnet1

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [3, !Cidr [!Ref VpcCidr, 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-private-1a'

  # Route Tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-rt'

  DefaultPublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      RouteTableId: !Ref PublicRouteTable
      SubnetId: !Ref PublicSubnet1

  # Security Group
  WebServerSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Allow HTTP/HTTPS traffic
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS from internet
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: HTTP from internet
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-sg'

Outputs:
  VpcId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'

  PublicSubnets:
    Description: Public subnet IDs
    Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2]]
    Export:
      Name: !Sub '${AWS::StackName}-PublicSubnets'
```

---

## 4. Nested Stacks

**Parent Stack:**
```yaml
Resources:
  NetworkStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-templates/vpc.yaml
      Parameters:
        Environment: production
        VpcCidr: '10.0.0.0/16'

  ApplicationStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: NetworkStack
    Properties:
      TemplateURL: https://s3.amazonaws.com/my-templates/app.yaml
      Parameters:
        VpcId: !GetAtt NetworkStack.Outputs.VpcId
        SubnetIds: !GetAtt NetworkStack.Outputs.PublicSubnets
```

---

## 5. Stack Operations (CLI)

```bash
# Create stack
aws cloudformation create-stack \
  --stack-name production-vpc \
  --template-body file://vpc.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production

# Update stack
aws cloudformation update-stack \
  --stack-name production-vpc \
  --template-body file://vpc.yaml

# Delete stack
aws cloudformation delete-stack \
  --stack-name production-vpc

# Describe stack
aws cloudformation describe-stacks \
  --stack-name production-vpc

# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name production-vpc \
  --query 'Stacks[0].Outputs'

# List stack resources
aws cloudformation list-stack-resources \
  --stack-name production-vpc
```

---

## 6. Drift Detection

```bash
# Detect drift (check if actual differs from template)
aws cloudformation detect-stack-drift \
  --stack-name production-vpc

# Get drift results
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id <detection-id>

# View resource drifts
aws cloudformation describe-stack-resource-drifts \
  --stack-name production-vpc
```

---

## 7. Interview Questions

**Q: CloudFormation vs Terraform?**
```
CloudFormation:
✅ AWS-native, deep AWS integration
✅ No state file management
✅ Free (only pay for resources)
❌ AWS-only (not multi-cloud)
❌ Slower iteration (YAML verbose)

Terraform:
✅ Multi-cloud (AWS, Azure, GCP)
✅ HCL more concise than YAML
✅ Large community, many providers
❌ State file management required
❌ Licensing changes (BSL now)
```

**Q: How do you handle secrets?**
```yaml
Parameters:
  DBPassword:
    Type: String
    NoEcho: true  # Hides value in console

# Better: Use Secrets Manager
Resources:
  DBInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      MasterUserPassword: !Sub '{{resolve:secretsmanager:${MySecret}:SecretString:password}}'
```

---

## Key Takeaways

✅ **Intrinsic Functions**: !Ref, !Sub, !GetAtt, !Join, !If  
✅ **Nested Stacks**: Modular, reusable templates  
✅ **Drift Detection**: Find manual changes  
✅ **Export/Import**: Cross-stack references  

**Next**: Jenkins CI/CD Pipelines
