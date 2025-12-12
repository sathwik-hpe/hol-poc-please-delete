# Python for Azure Cloud (Azure SDK) ☁️

## Why This Matters
Fidelity requires **"experience with AWS and Azure cloud APIs"**. While you have AWS experience, **Azure is a GAP**. This is CRITICAL to learn.

---

## 1. Azure SDK Setup

```bash
# Install Azure SDK packages
pip install azure-identity
pip install azure-mgmt-network
pip install azure-mgmt-resource
pip install azure-mgmt-compute
```

### Authentication

```python
from azure.identity import DefaultAzureCredential, ClientSecretCredential
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.resource import ResourceManagementClient

# Method 1: Azure CLI (az login)
credential = DefaultAzureCredential()

# Method 2: Service Principal
credential = ClientSecretCredential(
    tenant_id="your-tenant-id",
    client_id="your-client-id",
    client_secret="your-client-secret"
)

# Initialize clients
subscription_id = "your-subscription-id"
network_client = NetworkManagementClient(credential, subscription_id)
resource_client = ResourceManagementClient(credential, subscription_id)
```

---

## 2. VNet Management (Azure's VPC)

```python
from azure.mgmt.network import NetworkManagementClient
from azure.mgmt.resource import ResourceManagementClient
from azure.identity import DefaultAzureCredential
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AzureNetworkManager:
    """Manage Azure Virtual Networks"""
    
    def __init__(self, subscription_id: str, resource_group: str, location: str = 'eastus'):
        credential = DefaultAzureCredential()
        self.network_client = NetworkManagementClient(credential, subscription_id)
        self.resource_client = ResourceManagementClient(credential, subscription_id)
        self.resource_group = resource_group
        self.location = location
    
    def create_resource_group(self):
        """Create resource group (Azure's resource container)"""
        rg_result = self.resource_client.resource_groups.create_or_update(
            self.resource_group,
            {"location": self.location}
        )
        logger.info(f"Created resource group: {rg_result.name}")
        return rg_result
    
    def create_vnet(self, vnet_name: str, address_prefix: str):
        """Create Virtual Network"""
        vnet_params = {
            'location': self.location,
            'address_space': {
                'address_prefixes': [address_prefix]
            }
        }
        
        poller = self.network_client.virtual_networks.begin_create_or_update(
            self.resource_group,
            vnet_name,
            vnet_params
        )
        vnet = poller.result()
        logger.info(f"Created VNet: {vnet.name}")
        return vnet
    
    def create_subnet(self, vnet_name: str, subnet_name: str, address_prefix: str):
        """Create subnet in VNet"""
        subnet_params = {
            'address_prefix': address_prefix
        }
        
        poller = self.network_client.subnets.begin_create_or_update(
            self.resource_group,
            vnet_name,
            subnet_name,
            subnet_params
        )
        subnet = poller.result()
        logger.info(f"Created subnet: {subnet.name}")
        return subnet
    
    def create_nsg(self, nsg_name: str, rules: list = None):
        """Create Network Security Group (like AWS Security Group)"""
        nsg_params = {
            'location': self.location,
            'security_rules': []
        }
        
        # Add security rules if provided
        if rules:
            for i, rule in enumerate(rules):
                nsg_params['security_rules'].append({
                    'name': rule.get('name', f'rule-{i}'),
                    'priority': rule.get('priority', 100 + i * 10),
                    'protocol': rule.get('protocol', 'Tcp'),
                    'access': rule.get('access', 'Allow'),
                    'direction': rule.get('direction', 'Inbound'),
                    'source_address_prefix': rule.get('source', '*'),
                    'source_port_range': '*',
                    'destination_address_prefix': '*',
                    'destination_port_range': str(rule.get('port', '*'))
                })
        
        poller = self.network_client.network_security_groups.begin_create_or_update(
            self.resource_group,
            nsg_name,
            nsg_params
        )
        nsg = poller.result()
        logger.info(f"Created NSG: {nsg.name}")
        return nsg

# Usage
mgr = AzureNetworkManager(
    subscription_id='your-sub-id',
    resource_group='fidelity-demo-rg',
    location='eastus'
)

mgr.create_resource_group()
vnet = mgr.create_vnet('production-vnet', '10.0.0.0/16')
subnet = mgr.create_subnet('production-vnet', 'web-subnet', '10.0.1.0/24')

# Create NSG with web server rules
nsg = mgr.create_nsg('web-nsg', rules=[
    {'name': 'allow-https', 'priority': 100, 'port': 443, 'source': '*'},
    {'name': 'allow-http', 'priority': 110, 'port': 80, 'source': '*'}
])
```

---

## 3. Key Differences: AWS vs Azure

| **Concept** | **AWS** | **Azure** |
|-------------|---------|-----------|
| Virtual Network | VPC | VNet |
| Subnet | Subnet | Subnet |
| Firewall | Security Group | Network Security Group (NSG) |
| Outbound NAT | NAT Gateway | NAT Gateway / Azure Firewall |
| Load Balancer | ELB (ALB/NLB) | Load Balancer / Application Gateway |
| Connectivity | VPC Peering / Transit Gateway | VNet Peering / Virtual WAN |
| DNS | Route 53 | Azure DNS / Traffic Manager |
| Resource Grouping | Tags | Resource Groups (required) |

---

## 4. Interview Questions

**Q: How is Azure Resource Group different from AWS?**
**A**: Azure requires Resource Groups to organize resources. AWS uses tags optionally. Resource Groups are regional containers that simplify lifecycle management.

**Q: Create a complete VNet with public/private subnets**
```python
def provision_azure_network():
    mgr = AzureNetworkManager('sub-id', 'prod-rg', 'eastus')
    
    # Resource group
    mgr.create_resource_group()
    
    # VNet
    vnet = mgr.create_vnet('prod-vnet', '10.0.0.0/16')
    
    # Subnets
    public_subnet = mgr.create_subnet('prod-vnet', 'public', '10.0.1.0/24')
    private_subnet = mgr.create_subnet('prod-vnet', 'private', '10.0.2.0/24')
    
    # NSGs
    web_nsg = mgr.create_nsg('web-nsg', rules=[
        {'name': 'https', 'priority': 100, 'port': 443},
        {'name': 'http', 'priority': 110, 'port': 80}
    ])
    
    return vnet
```

---

## Key Takeaways

✅ **Azure SDK** uses async patterns (`.begin_create_or_update()` returns pollers)  
✅ **Resource Groups** are mandatory in Azure (not optional like AWS tags)  
✅ **NSG** = AWS Security Group (but attached to subnet OR NIC)  
✅ **VNet Peering** = VPC Peering (can be global across regions)  

**Action**: Practice creating VNets to match your AWS VPC knowledge!

**Next**: AWS Networking Deep Dive
