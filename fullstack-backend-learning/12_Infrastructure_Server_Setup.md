# Module 12: Infrastructure & Server Setup 🖥️

## From Bare Metal to Cloud - Complete Infrastructure Guide

**Duration:** 4-5 hours  
**Prerequisites:** Basic networking knowledge  
**Outcome:** Understand server provisioning, networking, DNS, and infrastructure fundamentals

---

## 📚 Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Bare Metal Servers](#bare-metal-servers)
3. [Virtual Machines](#virtual-machines)
4. [Networking Fundamentals](#networking-fundamentals)
5. [DNS & FQDN](#dns--fqdn)
6. [Static IP Configuration](#static-ip-configuration)
7. [OVA Deployment](#ova-deployment)
8. [MicroK8s Setup](#microk8s-setup)
9. [Best Practices](#best-practices)
10. [Interview Questions](#interview-questions)
11. [Hands-On Exercise](#hands-on-exercise)

---

## Infrastructure Overview

### Infrastructure Types

```
1. On-Premises (Physical)
   ├── Bare Metal Servers
   ├── Own Data Center
   └── Full control, high capital cost

2. Virtualization
   ├── VMware vSphere
   ├── Hyper-V
   ├── KVM/Proxmox
   └── Better resource utilization

3. Cloud (IaaS)
   ├── AWS EC2
   ├── Google Compute Engine
   ├── Azure VMs
   └── Pay-as-you-go, high operational flexibility

4. Container Platforms
   ├── Kubernetes
   ├── Docker Swarm
   └── Orchestration layer
```

---

## Bare Metal Servers

### What is Bare Metal?

**Physical server** without virtualization layer - direct hardware access.

### Server Procurement

```bash
# 1. Specifications
CPU: 16+ cores (Intel Xeon, AMD EPYC)
RAM: 64GB+ DDR4 ECC
Storage: 
  - 2x 500GB NVMe (OS, RAID 1)
  - 4x 2TB SSD (Data, RAID 10)
Network: 2x 10GbE (bonded)
IPMI/BMC: Remote management

# 2. Vendors
- Dell PowerEdge
- HP ProLiant
- Supermicro
- Lenovo ThinkSystem
```

### BIOS Configuration

```
1. Boot Order
   - Network PXE (for automation)
   - Primary disk
   - USB

2. Virtualization
   - Intel VT-x / AMD-V: Enabled
   - Intel VT-d / AMD-Vi: Enabled (IOMMU)

3. Power Management
   - Performance mode for production
   - Balanced for efficiency

4. IPMI/iLO/iDRAC
   - Set IP address
   - Enable remote console
   - Configure users
```

### OS Installation (Ubuntu Server Example)

```bash
# 1. Download Ubuntu Server 22.04 LTS
wget https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso

# 2. Create bootable USB
sudo dd if=ubuntu-22.04.3-live-server-amd64.iso of=/dev/sdb bs=4M status=progress

# 3. Boot from USB and install
# - Hostname: server01.example.com
# - Username: admin
# - Install OpenSSH server
# - LVM for disk management

# 4. Post-install configuration
sudo apt update && sudo apt upgrade -y
sudo apt install -y vim git curl wget htop net-tools

# 5. Configure static IP (covered later)
```

---

## Virtual Machines

### Hypervisor Types

```
Type 1 (Bare Metal):
- VMware ESXi
- Proxmox VE
- Microsoft Hyper-V
- KVM
Runs directly on hardware

Type 2 (Hosted):
- VMware Workstation
- VirtualBox
- Parallels
Runs on host OS
```

### Proxmox VE Setup

```bash
# 1. Download Proxmox ISO
# https://www.proxmox.com/en/downloads

# 2. Install on bare metal server
# - Management interface: 192.168.1.100
# - Gateway: 192.168.1.1
# - DNS: 8.8.8.8

# 3. Access web UI
https://192.168.1.100:8006

# 4. Create VM via CLI
qm create 100 \
  --name ubuntu-vm \
  --memory 4096 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:32 \
  --cdrom local:iso/ubuntu-22.04-server-amd64.iso \
  --boot order=scsi0

# 5. Start VM
qm start 100

# 6. VNC console
qm vncproxy 100
```

### VMware ESXi

```bash
# 1. Install ESXi on server
# 2. Access via vSphere Client

# Create VM via PowerCLI:
New-VM -Name "web-server" \
  -VMHost "esxi01.example.com" \
  -Datastore "datastore1" \
  -DiskGB 50 \
  -MemoryGB 8 \
  -NumCpu 4 \
  -NetworkName "VM Network" \
  -GuestId "ubuntu64Guest"

# Start VM
Start-VM -VM "web-server"
```

### KVM/QEMU (Linux)

```bash
# 1. Install KVM
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager

# 2. Verify installation
sudo systemctl status libvirtd
sudo virsh list --all

# 3. Create VM
virt-install \
  --name ubuntu-vm \
  --ram 4096 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/ubuntu-vm.qcow2,size=20 \
  --os-variant ubuntu22.04 \
  --network bridge=br0 \
  --graphics vnc \
  --cdrom /path/to/ubuntu-22.04-server-amd64.iso

# 4. Manage VMs
virsh list --all
virsh start ubuntu-vm
virsh shutdown ubuntu-vm
virsh console ubuntu-vm
```

---

## Networking Fundamentals

### OSI Model & TCP/IP

```
OSI Layer          TCP/IP           Protocols
─────────────────────────────────────────────
7. Application  ─┐
6. Presentation  ├─ Application   HTTP, DNS, SSH
5. Session      ─┘

4. Transport    ─── Transport     TCP, UDP

3. Network      ─── Internet      IP, ICMP, IGMP

2. Data Link    ─┐
1. Physical     ─┴─ Link          Ethernet, ARP
```

### IP Addressing

```bash
# IPv4 Classes
Class A: 10.0.0.0/8        (10.0.0.0 - 10.255.255.255)
Class B: 172.16.0.0/12     (172.16.0.0 - 172.31.255.255)
Class C: 192.168.0.0/16    (192.168.0.0 - 192.168.255.255)

# CIDR Notation
192.168.1.0/24  = 256 IPs (192.168.1.0 - 192.168.1.255)
192.168.1.0/25  = 128 IPs (192.168.1.0 - 192.168.1.127)
192.168.1.0/26  = 64 IPs  (192.168.1.0 - 192.168.1.63)

# Subnet Mask
/24 = 255.255.255.0
/16 = 255.255.0.0
/8  = 255.0.0.0
```

### Network Configuration (Ubuntu)

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens18:
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
        search:
          - example.com
```

```bash
# Apply configuration
sudo netplan apply

# Test connectivity
ping 192.168.1.1
ping google.com

# View routing table
ip route show

# View network interfaces
ip addr show
```

### VLANs

```bash
# Create VLAN interface
sudo ip link add link eth0 name eth0.10 type vlan id 10
sudo ip addr add 192.168.10.100/24 dev eth0.10
sudo ip link set dev eth0.10 up

# Persistent configuration (netplan)
network:
  version: 2
  vlans:
    vlan10:
      id: 10
      link: eth0
      addresses: [192.168.10.100/24]
```

### Network Bonding (Link Aggregation)

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
    eth1:
      dhcp4: no
  
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
      parameters:
        mode: 802.3ad  # LACP
        lacp-rate: fast
        mii-monitor-interval: 100
```

---

## DNS & FQDN

### DNS Hierarchy

```
Root (.)
  ↓
TLD (.com, .org, .net)
  ↓
Domain (example.com)
  ↓
Subdomain (www.example.com, api.example.com)

FQDN: Fully Qualified Domain Name
Example: server01.datacenter.example.com.
```

### DNS Record Types

```bash
# A Record (IPv4)
server01.example.com.  IN  A  192.168.1.100

# AAAA Record (IPv6)
server01.example.com.  IN  AAAA  2001:db8::1

# CNAME (Alias)
www.example.com.  IN  CNAME  server01.example.com.

# MX (Mail Exchange)
example.com.  IN  MX  10 mail.example.com.

# TXT (Text/SPF/DKIM)
example.com.  IN  TXT  "v=spf1 mx ~all"

# PTR (Reverse DNS)
100.1.168.192.in-addr.arpa.  IN  PTR  server01.example.com.

# SRV (Service)
_http._tcp.example.com.  IN  SRV  10 60 80 server01.example.com.
```

### BIND9 DNS Server Setup

```bash
# 1. Install BIND9
sudo apt install -y bind9 bind9utils bind9-doc

# 2. Configure zone (/etc/bind/named.conf.local)
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
};

zone "1.168.192.in-addr.arpa" {
    type master;
    file "/etc/bind/zones/db.192.168.1";
};

# 3. Create forward zone (/etc/bind/zones/db.example.com)
cat <<EOF | sudo tee /etc/bind/zones/db.example.com
\$TTL    604800
@       IN      SOA     ns1.example.com. admin.example.com. (
                              3         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
;
@       IN      NS      ns1.example.com.
@       IN      A       192.168.1.10
ns1     IN      A       192.168.1.10
server01 IN     A       192.168.1.100
server02 IN     A       192.168.1.101
www     IN      CNAME   server01
api     IN      A       192.168.1.102
EOF

# 4. Create reverse zone (/etc/bind/zones/db.192.168.1)
cat <<EOF | sudo tee /etc/bind/zones/db.192.168.1
\$TTL    604800
@       IN      SOA     ns1.example.com. admin.example.com. (
                              3         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL
;
@       IN      NS      ns1.example.com.
10      IN      PTR     ns1.example.com.
100     IN      PTR     server01.example.com.
101     IN      PTR     server02.example.com.
EOF

# 5. Check configuration
sudo named-checkconf
sudo named-checkzone example.com /etc/bind/zones/db.example.com

# 6. Restart BIND
sudo systemctl restart bind9

# 7. Test DNS
dig @localhost server01.example.com
nslookup server01.example.com localhost
```

### /etc/hosts (Local DNS)

```bash
# /etc/hosts
127.0.0.1       localhost
192.168.1.100   server01.example.com server01
192.168.1.101   server02.example.com server02
192.168.1.102   api.example.com api

# Test
ping server01
ping api.example.com
```

---

## Static IP Configuration

### Ubuntu/Debian (Netplan)

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens18:
      dhcp4: no
      dhcp6: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.10    # Internal DNS
          - 8.8.8.8         # Google DNS
        search:
          - example.com
          - datacenter.example.com
```

```bash
# Apply
sudo netplan apply

# Debug
sudo netplan --debug apply
sudo networkctl status
```

### CentOS/RHEL (NetworkManager)

```bash
# /etc/sysconfig/network-scripts/ifcfg-eth0
TYPE=Ethernet
BOOTPROTO=static
NAME=eth0
DEVICE=eth0
ONBOOT=yes
IPADDR=192.168.1.100
NETMASK=255.255.255.0
GATEWAY=192.168.1.1
DNS1=8.8.8.8
DNS2=8.8.4.4
DOMAIN=example.com

# Restart network
sudo systemctl restart NetworkManager
```

### Cloud-Init (Cloud Servers)

```yaml
# /etc/cloud/cloud.cfg.d/99-custom-networking.cfg
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 203.0.113.100/24
      routes:
        - to: default
          via: 203.0.113.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]

# Disable cloud-init network config
echo 'network: {config: disabled}' | sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
```

---

## OVA Deployment

### What is OVA?

**Open Virtualization Appliance** - pre-configured VM image (OVF + VMDK).

### Deploy OVA (VMware)

```bash
# 1. Download OVA
wget https://example.com/appliance.ova

# 2. Deploy via ovftool
ovftool \
  --name="MyAppliance" \
  --datastore="datastore1" \
  --network="VM Network" \
  --powerOn \
  appliance.ova \
  vi://username@vcenter.example.com/datacenter/host/cluster

# 3. Or use vSphere Client
# File → Deploy OVF Template → Select OVA → Configure → Finish
```

### Deploy OVA (VirtualBox)

```bash
# CLI
VBoxManage import appliance.ova \
  --vsys 0 \
  --vmname "MyVM" \
  --cpus 2 \
  --memory 4096

# GUI: File → Import Appliance
```

### Create OVA

```bash
# Export VM to OVA (VMware)
ovftool \
  --acceptAllEulas \
  vi://username@vcenter.example.com/datacenter/vm/MyVM \
  MyVM.ova

# VirtualBox
VBoxManage export MyVM -o MyVM.ova
```

---

## MicroK8s Setup

### What is MicroK8s?

**Lightweight Kubernetes** - single-node or multi-node, perfect for edge/IoT/development.

### Installation

```bash
# 1. Install MicroK8s (Ubuntu)
sudo snap install microk8s --classic --channel=1.28

# 2. Add user to group
sudo usermod -a -G microk8s $USER
sudo chown -R $USER ~/.kube
newgrp microk8s

# 3. Check status
microk8s status --wait-ready

# 4. Enable addons
microk8s enable dns storage ingress dashboard metrics-server

# 5. Alias kubectl
alias kubectl='microk8s kubectl'

# 6. Get nodes
kubectl get nodes
```

### Multi-Node Cluster

```bash
# On master node:
microk8s add-node

# Output:
# microk8s join 192.168.1.100:25000/abc123xyz

# On worker nodes:
microk8s join 192.168.1.100:25000/abc123xyz

# Verify cluster
kubectl get nodes
```

### Configuration

```bash
# View kubeconfig
microk8s config

# Export for external access
microk8s config > ~/.kube/config

# Enable HA (3+ nodes)
microk8s enable ha-cluster

# Enable community addons
microk8s enable community
microk8s enable portainer
microk8s enable prometheus
```

---

## Best Practices

### 1. Network Segmentation

```
DMZ:          Public-facing servers (web)
Application:  Backend services
Database:     Data tier
Management:   Admin access (IPMI, SSH)
```

### 2. Security Hardening

```bash
# SSH hardening
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 3. Monitoring & Logging

```bash
# Install monitoring agents
# Prometheus Node Exporter
# Telegraf
# Filebeat

# Centralized logging
# ELK Stack
# Loki + Promtail
```

### 4. Backup & DR

```bash
# VM snapshots
# Database backups
# Configuration management (Ansible/Terraform)
# Offsite backups
```

---

## Interview Questions

**Q1: What's the difference between bare metal and virtual machines?**

**Answer:** Bare metal is physical server with direct hardware access - better performance, no hypervisor overhead, but less flexible. VMs run on hypervisor, share physical resources, easier to provision/migrate, better utilization, but slight performance penalty.

**Q2: Explain static IP vs DHCP.**

**Answer:** 
- Static IP: Manually configured, doesn't change, used for servers/network devices
- DHCP: Automatically assigned by DHCP server, can change, used for clients
Servers need static IPs for predictable DNS/access.

**Q3: What is an FQDN?**

**Answer:** Fully Qualified Domain Name - complete domain name specifying exact location in DNS hierarchy. Example: server01.datacenter.example.com includes hostname (server01), subdomain (datacenter), domain (example), TLD (com).

**Q4: Describe the purpose of reverse DNS (PTR records).**

**Answer:** Maps IP address back to hostname. Used for: email validation (anti-spam), logging (readable hostnames), security auditing. Example: 192.168.1.100 → server01.example.com.

**Q5: When would you use an OVA?**

**Answer:** Pre-configured appliances (vendor software like firewalls, routers), template VMs, disaster recovery images, rapid deployment scenarios. Faster than manual VM creation + OS installation + configuration.

---

## Hands-On Exercise

### Task: Complete Infrastructure Setup

```bash
# 1. Install Ubuntu Server VM
# - Hostname: lab-server01
# - IP: 192.168.1.100/24
# - Gateway: 192.168.1.1

# 2. Configure static IP
sudo nano /etc/netplan/00-installer-config.yaml
# (paste configuration from earlier)
sudo netplan apply

# 3. Set hostname
sudo hostnamectl set-hostname lab-server01.example.local

# 4. Update /etc/hosts
echo "192.168.1.100 lab-server01.example.local lab-server01" | sudo tee -a /etc/hosts

# 5. Install DNS tools
sudo apt install -y dnsutils net-tools

# 6. Test networking
ping -c 4 192.168.1.1
ping -c 4 google.com
dig google.com

# 7. Install MicroK8s
sudo snap install microk8s --classic
sudo usermod -a -G microk8s $USER
newgrp microk8s

# 8. Enable addons
microk8s enable dns storage ingress

# 9. Deploy test app
microk8s kubectl create deployment nginx --image=nginx
microk8s kubectl expose deployment nginx --port=80 --type=NodePort

# 10. Verify
microk8s kubectl get all
curl http://192.168.1.100:$(microk8s kubectl get svc nginx -o jsonpath='{.spec.ports[0].nodePort}')
```

---

## 📚 Additional Resources

- [Linux Networking](https://www.kernel.org/doc/html/latest/networking/index.html)
- [BIND9 Documentation](https://bind9.readthedocs.io/)
- [MicroK8s Documentation](https://microk8s.io/docs)
- [VMware vSphere](https://docs.vmware.com/en/VMware-vSphere/)

---

## ✅ Module Checklist

- [ ] Understand bare metal vs virtualization
- [ ] Configure static IP addressing
- [ ] Set up DNS server and records
- [ ] Create FQDN for services
- [ ] Deploy OVA appliances
- [ ] Install and configure MicroK8s
- [ ] Complete infrastructure setup exercise

---

**Next Module:** [Module 13: Terraform - Infrastructure as Code](./13_Terraform_IaC.md) - Automate infrastructure provisioning! ⚡
