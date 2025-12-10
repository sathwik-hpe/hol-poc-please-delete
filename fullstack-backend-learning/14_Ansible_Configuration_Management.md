# Module 14: Ansible - Configuration Management 🔧

## Automate Server Configuration with Ansible

**Duration:** 4-5 hours  
**Prerequisites:** Module 12 (Infrastructure), Linux basics, SSH  
**Outcome:** Master Ansible for infrastructure automation and configuration management

---

## 📚 Table of Contents

1. [What is Ansible](#what-is-ansible)
2. [Installation & Setup](#installation--setup)
3. [Inventory](#inventory)
4. [Ad-Hoc Commands](#ad-hoc-commands)
5. [Playbooks](#playbooks)
6. [Roles](#roles)
7. [Variables & Facts](#variables--facts)
8. [Handlers & Templates](#handlers--templates)
9. [Ansible Galaxy](#ansible-galaxy)
10. [Best Practices](#best-practices)
11. [Interview Questions](#interview-questions)
12. [Hands-On Exercise](#hands-on-exercise)

---

## What is Ansible

### Configuration Management

```
Manual Configuration:
- SSH to each server
- Run commands manually
- No version control
- Hard to scale
- Error-prone

Ansible:
- Agentless (SSH-based)
- Declarative (YAML)
- Idempotent (safe to re-run)
- Version controlled
- Scalable
```

### Key Concepts

```yaml
Control Node:   Where Ansible runs (your laptop, CI/CD)
Managed Nodes:  Servers Ansible configures
Inventory:      List of managed nodes
Playbook:       YAML file defining automation
Task:           Single action (install package, copy file)
Module:         Code that executes tasks
Role:           Reusable collection of tasks
```

### Ansible vs Alternatives

```
Ansible:     Agentless, Python, push-based
Puppet:      Agent-based, Ruby, pull-based
Chef:        Agent-based, Ruby, pull-based
SaltStack:   Agent/agentless, Python, push/pull
Terraform:   Infrastructure provisioning (IaC)
```

---

## Installation & Setup

### Install Ansible

```bash
# macOS
brew install ansible

# Ubuntu/Debian
sudo apt update
sudo apt install -y software-properties-common
sudo add-apt-repository --yes --update ppa:ansible/ansible
sudo apt install -y ansible

# RHEL/CentOS
sudo yum install -y ansible

# Python pip
pip install ansible

# Verify
ansible --version
```

### SSH Key Setup

```bash
# Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "ansible"

# Copy to managed nodes
ssh-copy-id user@server1.example.com
ssh-copy-id user@server2.example.com

# Test connection
ssh user@server1.example.com
```

### Ansible Configuration

```ini
# /etc/ansible/ansible.cfg or ~/.ansible.cfg or ./ansible.cfg
[defaults]
inventory = ./inventory
host_key_checking = False
remote_user = ubuntu
private_key_file = ~/.ssh/id_ed25519
retry_files_enabled = False
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible_facts
fact_caching_timeout = 3600

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
```

---

## Inventory

### Static Inventory (INI format)

```ini
# inventory/hosts
[web]
web1.example.com
web2.example.com ansible_host=192.168.1.101

[db]
db1.example.com ansible_host=192.168.1.201
db2.example.com ansible_host=192.168.1.202

[app:children]
web
db

[app:vars]
ansible_user=ubuntu
ansible_port=22

[web:vars]
http_port=80
max_clients=200
```

### YAML Inventory

```yaml
# inventory/hosts.yml
all:
  children:
    web:
      hosts:
        web1.example.com:
        web2.example.com:
          ansible_host: 192.168.1.101
      vars:
        http_port: 80
        max_clients: 200
    
    db:
      hosts:
        db1.example.com:
          ansible_host: 192.168.1.201
        db2.example.com:
          ansible_host: 192.168.1.202
      vars:
        db_port: 5432
    
    app:
      children:
        - web
        - db
      vars:
        ansible_user: ubuntu
        ansible_port: 22
```

### Dynamic Inventory (AWS EC2)

```yaml
# inventory/aws_ec2.yml
plugin: aws_ec2
regions:
  - us-west-2
filters:
  tag:Environment: production
  instance-state-name: running
keyed_groups:
  - key: tags.Role
    prefix: role
  - key: placement.availability_zone
    prefix: az
hostnames:
  - private-ip-address
compose:
  ansible_host: private_ip_address
```

```bash
# Use dynamic inventory
ansible-inventory -i inventory/aws_ec2.yml --list
ansible-playbook -i inventory/aws_ec2.yml playbook.yml
```

---

## Ad-Hoc Commands

### Basic Commands

```bash
# Ping all hosts
ansible all -m ping

# Check uptime
ansible all -a "uptime"

# Install package (requires sudo)
ansible web -m apt -a "name=nginx state=present" -b

# Copy file
ansible all -m copy -a "src=/tmp/file.txt dest=/tmp/file.txt"

# Restart service
ansible web -m service -a "name=nginx state=restarted" -b

# Get facts
ansible web -m setup

# Filter facts
ansible web -m setup -a "filter=ansible_distribution*"
```

### Common Modules

```bash
# File operations
ansible all -m file -a "path=/tmp/test state=directory mode=0755"

# User management
ansible all -m user -a "name=deploy state=present shell=/bin/bash" -b

# Execute command
ansible all -m shell -a "df -h"

# Git clone
ansible all -m git -a "repo=https://github.com/user/repo.git dest=/opt/app"

# Template
ansible all -m template -a "src=nginx.conf.j2 dest=/etc/nginx/nginx.conf" -b
```

---

## Playbooks

### Basic Playbook

```yaml
# webserver.yml
---
- name: Configure web servers
  hosts: web
  become: yes
  
  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: yes
    
    - name: Start nginx
      service:
        name: nginx
        state: started
        enabled: yes
    
    - name: Copy index.html
      copy:
        src: files/index.html
        dest: /var/www/html/index.html
        owner: www-data
        group: www-data
        mode: '0644'
```

```bash
# Run playbook
ansible-playbook webserver.yml

# Check mode (dry-run)
ansible-playbook webserver.yml --check

# Limit to specific hosts
ansible-playbook webserver.yml --limit web1.example.com

# Verbose output
ansible-playbook webserver.yml -vvv
```

### Variables

```yaml
# playbook-with-vars.yml
---
- name: Configure app
  hosts: app
  become: yes
  
  vars:
    app_name: myapp
    app_version: 1.0.0
    app_port: 8080
  
  tasks:
    - name: Create app directory
      file:
        path: "/opt/{{ app_name }}"
        state: directory
    
    - name: Print app info
      debug:
        msg: "Deploying {{ app_name }} version {{ app_version }} on port {{ app_port }}"
```

### Conditionals

```yaml
---
- name: Install packages based on OS
  hosts: all
  become: yes
  
  tasks:
    - name: Install httpd (RedHat)
      yum:
        name: httpd
        state: present
      when: ansible_os_family == "RedHat"
    
    - name: Install apache2 (Debian)
      apt:
        name: apache2
        state: present
      when: ansible_os_family == "Debian"
    
    - name: Ensure service is running
      service:
        name: "{{ 'httpd' if ansible_os_family == 'RedHat' else 'apache2' }}"
        state: started
```

### Loops

```yaml
---
- name: Create multiple users
  hosts: all
  become: yes
  
  tasks:
    - name: Create users
      user:
        name: "{{ item.name }}"
        groups: "{{ item.groups }}"
        shell: /bin/bash
      loop:
        - { name: 'alice', groups: 'sudo' }
        - { name: 'bob', groups: 'developers' }
        - { name: 'charlie', groups: 'developers' }
    
    - name: Install packages
      apt:
        name: "{{ item }}"
        state: present
      loop:
        - vim
        - git
        - htop
        - curl
```

### Handlers

```yaml
---
- name: Configure nginx
  hosts: web
  become: yes
  
  tasks:
    - name: Copy nginx config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx
    
    - name: Copy site config
      template:
        src: site.conf.j2
        dest: /etc/nginx/sites-available/default
      notify: Reload nginx
  
  handlers:
    - name: Restart nginx
      service:
        name: nginx
        state: restarted
    
    - name: Reload nginx
      service:
        name: nginx
        state: reloaded
```

---

## Roles

### Role Structure

```
roles/
└── webserver/
    ├── tasks/
    │   └── main.yml
    ├── handlers/
    │   └── main.yml
    ├── templates/
    │   └── nginx.conf.j2
    ├── files/
    │   └── index.html
    ├── vars/
    │   └── main.yml
    ├── defaults/
    │   └── main.yml
    ├── meta/
    │   └── main.yml
    └── README.md
```

### Create Role

```bash
# Create role skeleton
ansible-galaxy role init webserver

# Directory structure created:
cd webserver
tree
```

### Role: tasks/main.yml

```yaml
# roles/webserver/tasks/main.yml
---
- name: Install nginx
  apt:
    name: nginx
    state: present
    update_cache: yes

- name: Copy nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Restart nginx

- name: Copy site config
  template:
    src: site.conf.j2
    dest: /etc/nginx/sites-available/default
  notify: Reload nginx

- name: Enable site
  file:
    src: /etc/nginx/sites-available/default
    dest: /etc/nginx/sites-enabled/default
    state: link

- name: Start nginx
  service:
    name: nginx
    state: started
    enabled: yes
```

### Role: handlers/main.yml

```yaml
# roles/webserver/handlers/main.yml
---
- name: Restart nginx
  service:
    name: nginx
    state: restarted

- name: Reload nginx
  service:
    name: nginx
    state: reloaded
```

### Role: defaults/main.yml

```yaml
# roles/webserver/defaults/main.yml
---
nginx_port: 80
nginx_worker_processes: auto
nginx_worker_connections: 1024
server_name: localhost
document_root: /var/www/html
```

### Role: templates/nginx.conf.j2

```jinja2
# roles/webserver/templates/nginx.conf.j2
user www-data;
worker_processes {{ nginx_worker_processes }};
pid /run/nginx.pid;

events {
    worker_connections {{ nginx_worker_connections }};
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

### Use Role in Playbook

```yaml
# site.yml
---
- name: Configure web servers
  hosts: web
  become: yes
  
  roles:
    - webserver
    
  vars:
    nginx_port: 8080
    server_name: example.com
```

```bash
# Run
ansible-playbook site.yml
```

---

## Variables & Facts

### Variable Precedence

```
1. Command line (-e)
2. Role defaults
3. Inventory (host_vars, group_vars)
4. Playbook vars
5. Role vars
6. Block vars
7. Task vars
```

### Group Variables

```yaml
# group_vars/web.yml
---
nginx_port: 80
app_env: production

# group_vars/db.yml
---
db_port: 5432
db_name: myapp
```

### Host Variables

```yaml
# host_vars/web1.example.com.yml
---
nginx_worker_processes: 4

# host_vars/web2.example.com.yml
---
nginx_worker_processes: 2
```

### Facts

```yaml
---
- name: Gather and use facts
  hosts: all
  
  tasks:
    - name: Print OS info
      debug:
        msg: "{{ ansible_distribution }} {{ ansible_distribution_version }}"
    
    - name: Print memory
      debug:
        msg: "Total memory: {{ ansible_memtotal_mb }} MB"
    
    - name: Print network info
      debug:
        msg: "IP: {{ ansible_default_ipv4.address }}"
```

### Custom Facts

```bash
# Create custom fact
cat <<'EOF' | sudo tee /etc/ansible/facts.d/custom.fact
#!/bin/bash
echo "{\"app_version\": \"1.0.0\", \"deployment_date\": \"$(date +%Y-%m-%d)\"}"
EOF

sudo chmod +x /etc/ansible/facts.d/custom.fact

# Use in playbook
- debug:
    msg: "App version: {{ ansible_local.custom.app_version }}"
```

---

## Handlers & Templates

### Handlers (Triggered by Tasks)

```yaml
---
- name: Configure services
  hosts: app
  become: yes
  
  tasks:
    - name: Copy nginx config
      copy:
        src: nginx.conf
        dest: /etc/nginx/nginx.conf
      notify:
        - Reload nginx
        - Clear cache
    
    - name: Copy php config
      copy:
        src: php.ini
        dest: /etc/php/7.4/fpm/php.ini
      notify: Restart php-fpm
  
  handlers:
    - name: Reload nginx
      service:
        name: nginx
        state: reloaded
    
    - name: Restart php-fpm
      service:
        name: php7.4-fpm
        state: restarted
    
    - name: Clear cache
      command: rm -rf /var/cache/app/*
```

### Jinja2 Templates

```jinja2
{# templates/app.conf.j2 #}
server {
    listen {{ nginx_port }};
    server_name {{ server_name }};
    
    root {{ document_root }};
    index index.html index.php;
    
    {% if enable_ssl %}
    listen 443 ssl;
    ssl_certificate {{ ssl_cert_path }};
    ssl_certificate_key {{ ssl_key_path }};
    {% endif %}
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    {% for location in custom_locations %}
    location {{ location.path }} {
        proxy_pass {{ location.backend }};
    }
    {% endfor %}
}
```

---

## Ansible Galaxy

### What is Ansible Galaxy?

**Public repository** of community-contributed Ansible roles.

### Install Role from Galaxy

```bash
# Install role
ansible-galaxy role install geerlingguy.nginx

# Install specific version
ansible-galaxy role install geerlingguy.nginx,3.1.4

# Install from requirements file
cat <<EOF > requirements.yml
roles:
  - name: geerlingguy.nginx
    version: 3.1.4
  - name: geerlingguy.postgresql
    version: 3.3.1
EOF

ansible-galaxy role install -r requirements.yml

# List installed roles
ansible-galaxy role list

# Remove role
ansible-galaxy role remove geerlingguy.nginx
```

### Use Galaxy Role

```yaml
# site.yml
---
- name: Setup web server
  hosts: web
  become: yes
  
  roles:
    - role: geerlingguy.nginx
      nginx_vhosts:
        - listen: "80"
          server_name: "example.com"
          root: "/var/www/html"
```

### Create & Publish Role

```bash
# Initialize role
ansible-galaxy role init my_role

# Login to Galaxy
ansible-galaxy login

# Publish (from GitHub repo)
# Push to GitHub, then import via Galaxy website
```

---

## Best Practices

### 1. Project Structure

```
ansible-project/
├── ansible.cfg
├── inventory/
│   ├── production/
│   │   ├── hosts
│   │   └── group_vars/
│   └── staging/
│       ├── hosts
│       └── group_vars/
├── group_vars/
│   ├── all.yml
│   └── web.yml
├── host_vars/
│   └── web1.example.com.yml
├── roles/
│   ├── common/
│   ├── webserver/
│   └── database/
├── playbooks/
│   ├── site.yml
│   ├── webservers.yml
│   └── databases.yml
├── files/
├── templates/
└── requirements.yml
```

### 2. Idempotency

```yaml
# ✅ Idempotent
- name: Ensure nginx is installed
  apt:
    name: nginx
    state: present

# ❌ Not idempotent
- name: Install nginx
  shell: apt-get install nginx
```

### 3. Use Modules (Not Shell)

```yaml
# ✅ Preferred
- name: Create directory
  file:
    path: /opt/app
    state: directory

# ❌ Avoid
- name: Create directory
  shell: mkdir /opt/app
```

### 4. Vault for Secrets

```bash
# Create encrypted file
ansible-vault create secrets.yml

# Edit encrypted file
ansible-vault edit secrets.yml

# Encrypt existing file
ansible-vault encrypt vars.yml

# Decrypt
ansible-vault decrypt vars.yml

# Run with vault
ansible-playbook site.yml --ask-vault-pass

# Use password file
ansible-playbook site.yml --vault-password-file ~/.vault_pass
```

### 5. Tags

```yaml
---
- name: Full setup
  hosts: all
  become: yes
  
  tasks:
    - name: Install packages
      apt:
        name: "{{ item }}"
        state: present
      loop:
        - nginx
        - postgresql
      tags:
        - packages
    
    - name: Configure nginx
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      tags:
        - config
        - nginx
```

```bash
# Run only specific tags
ansible-playbook site.yml --tags "config"

# Skip tags
ansible-playbook site.yml --skip-tags "packages"
```

---

## Interview Questions

**Q1: What makes Ansible different from Puppet/Chef?**

**Answer:** Ansible is agentless (SSH-based), uses YAML (not Ruby DSL), push-based (vs pull), simpler learning curve. No need to install agents on managed nodes. Idempotent - safe to run multiple times.

**Q2: Explain Ansible's idempotency.**

**Answer:** Idempotent operations produce same result regardless of how many times executed. Ansible modules are designed to be idempotent - running playbook multiple times won't cause unintended changes. Example: `apt` module checks if package installed before attempting installation.

**Q3: What is the difference between a role and a playbook?**

**Answer:**
- **Playbook**: YAML file containing plays (tasks to execute)
- **Role**: Organized collection of tasks, handlers, variables, templates - reusable component
Roles promote modularity, reusability. Playbooks can include multiple roles.

**Q4: How do you handle secrets in Ansible?**

**Answer:** Use Ansible Vault to encrypt sensitive data:
- `ansible-vault create/edit/encrypt/decrypt`
- Store encrypted vars in version control
- Pass vault password at runtime (`--ask-vault-pass`)
- Use external secret management (HashiCorp Vault, AWS Secrets Manager)

**Q5: Explain dynamic inventory.**

**Answer:** Dynamic inventory pulls host information from external sources (AWS, GCP, Azure, CMDB) at runtime. Uses scripts/plugins that query cloud APIs. Benefits: Always up-to-date, no manual inventory maintenance, auto-discovers infrastructure.

---

## Hands-On Exercise

### Task: Configure LAMP Stack

```yaml
# lamp-stack.yml
---
- name: Install LAMP stack
  hosts: web
  become: yes
  
  vars:
    mysql_root_password: "SecurePassword123!"
    app_user: www-data
  
  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600
    
    - name: Install Apache
      apt:
        name: apache2
        state: present
    
    - name: Install MySQL
      apt:
        name:
          - mysql-server
          - python3-pymysql
        state: present
    
    - name: Install PHP
      apt:
        name:
          - php
          - php-mysql
          - libapache2-mod-php
        state: present
    
    - name: Start Apache
      service:
        name: apache2
        state: started
        enabled: yes
    
    - name: Start MySQL
      service:
        name: mysql
        state: started
        enabled: yes
    
    - name: Create database
      mysql_db:
        name: myapp_db
        state: present
        login_unix_socket: /var/run/mysqld/mysqld.sock
    
    - name: Create database user
      mysql_user:
        name: myapp_user
        password: "{{ mysql_root_password }}"
        priv: 'myapp_db.*:ALL'
        state: present
        login_unix_socket: /var/run/mysqld/mysqld.sock
    
    - name: Copy PHP info file
      copy:
        content: "<?php phpinfo(); ?>"
        dest: /var/www/html/info.php
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
    
    - name: Test PHP
      uri:
        url: http://localhost/info.php
        return_content: yes
      register: php_test
    
    - name: Display PHP test result
      debug:
        msg: "PHP is working!"
      when: "'PHP Version' in php_test.content"
```

```bash
# Run playbook
ansible-playbook lamp-stack.yml

# Verify
curl http://web1.example.com/info.php
```

---

## 📚 Additional Resources

- [Ansible Documentation](https://docs.ansible.com/)
- [Ansible Galaxy](https://galaxy.ansible.com/)
- [Ansible Best Practices](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)
- [Jeff Geerling's Ansible Book](https://www.ansiblefordevops.com/)

---

## ✅ Module Checklist

- [ ] Understand Ansible architecture
- [ ] Create inventory (static & dynamic)
- [ ] Write playbooks with tasks, handlers, templates
- [ ] Create reusable roles
- [ ] Use variables and facts
- [ ] Install roles from Ansible Galaxy
- [ ] Encrypt secrets with Ansible Vault
- [ ] Complete LAMP stack exercise

---

**Next Module:** [Module 15: Database Deep Dive](./15_Database_Deep_Dive.md) - PostgreSQL, Elasticsearch, MinIO! 🗄️
