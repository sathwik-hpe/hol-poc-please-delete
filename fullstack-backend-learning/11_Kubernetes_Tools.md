# Module 11: Kubernetes Essential Tools 🛠️

## Master kubectl, Helm, kustomize & Productivity Tools

**Duration:** 3-4 hours  
**Prerequisites:** Module 06-10 (All K8s fundamentals)  
**Outcome:** Efficient K8s cluster management and application deployment

---

## 📚 Table of Contents

1. [kubectl Advanced](#kubectl-advanced)
2. [Helm - Package Manager](#helm---package-manager)
3. [kustomize - Configuration Management](#kustomize---configuration-management)
4. [k9s - Terminal UI](#k9s---terminal-ui)
5. [kubectx & kubens](#kubectx--kubens)
6. [stern - Multi-Pod Logs](#stern---multi-pod-logs)
7. [Other Essential Tools](#other-essential-tools)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## kubectl Advanced

### Productivity Shortcuts

```bash
# Aliases
alias k=kubectl
alias kgp="kubectl get pods"
alias kgd="kubectl get deployments"
alias kgs="kubectl get services"
alias kga="kubectl get all"
alias kaf="kubectl apply -f"
alias kdel="kubectl delete"

# Shell completion
source <(kubectl completion bash)  # bash
source <(kubectl completion zsh)   # zsh
```

### Advanced Get Commands

```bash
# Custom columns
kubectl get pods -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName

# JSONPath
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}'

# Sort by creation time
kubectl get pods --sort-by=.metadata.creationTimestamp

# Filter by label
kubectl get pods -l app=nginx,tier=frontend

# Show labels
kubectl get pods --show-labels

# Watch resources
kubectl get pods -w
```

### Resource Management

```bash
# Top (requires metrics-server)
kubectl top nodes
kubectl top pods
kubectl top pods --containers

# Drain node (for maintenance)
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data

# Cordon (prevent scheduling)
kubectl cordon node-1

# Uncordon
kubectl uncordon node-1

# Taint node
kubectl taint nodes node-1 key=value:NoSchedule

# Remove taint
kubectl taint nodes node-1 key:NoSchedule-
```

### Debugging

```bash
# Describe (detailed info)
kubectl describe pod nginx-abc123

# Logs
kubectl logs pod-name
kubectl logs pod-name -f              # Follow
kubectl logs pod-name --previous      # Previous container (if crashed)
kubectl logs pod-name -c container    # Specific container
kubectl logs -l app=nginx             # All pods with label

# Execute commands
kubectl exec -it pod-name -- /bin/bash
kubectl exec pod-name -- ls /app
kubectl exec pod-name -- env

# Port forward
kubectl port-forward pod-name 8080:80
kubectl port-forward service/web 8080:80

# Copy files
kubectl cp pod-name:/path/to/file ./local-file
kubectl cp ./local-file pod-name:/path/to/file

# Debug with ephemeral container (K8s 1.23+)
kubectl debug pod-name -it --image=busybox --target=container-name
```

### Apply Strategies

```bash
# Apply (declarative)
kubectl apply -f deployment.yaml

# Create (imperative, fails if exists)
kubectl create -f deployment.yaml

# Replace (delete and recreate)
kubectl replace -f deployment.yaml

# Patch (update specific fields)
kubectl patch deployment nginx -p '{"spec":{"replicas":5}}'

# Edit (interactive)
kubectl edit deployment nginx

# Dry run
kubectl apply -f deployment.yaml --dry-run=client
kubectl apply -f deployment.yaml --dry-run=server

# Diff before apply
kubectl diff -f deployment.yaml
```

### Context & Namespaces

```bash
# View contexts
kubectl config get-contexts

# Current context
kubectl config current-context

# Switch context
kubectl config use-context minikube

# Set default namespace
kubectl config set-context --current --namespace=production

# Create namespace
kubectl create namespace dev

# All namespaces
kubectl get pods --all-namespaces
kubectl get pods -A  # Short form
```

---

## Helm - Package Manager

### What is Helm?

**Kubernetes package manager** - manages charts (pre-configured K8s resources).

```
Helm = apt/yum for Kubernetes

Chart = Package (nginx, postgresql, prometheus)
Release = Deployed instance
Repository = Chart storage
```

### Installation

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify
helm version
```

### Helm Commands

```bash
# Add repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add stable https://charts.helm.sh/stable

# Update repositories
helm repo update

# Search charts
helm search repo nginx
helm search hub wordpress

# Install chart
helm install my-nginx bitnami/nginx

# Install with custom values
helm install my-db bitnami/postgresql \
  --set auth.postgresPassword=secretpass \
  --set primary.persistence.size=20Gi

# Install from values file
helm install my-app ./my-chart -f values.yaml

# List releases
helm list
helm list --all-namespaces

# Get release info
helm status my-nginx
helm get values my-nginx
helm get manifest my-nginx

# Upgrade release
helm upgrade my-nginx bitnami/nginx --set replicaCount=3

# Rollback
helm rollback my-nginx 1  # Rollback to revision 1

# Uninstall
helm uninstall my-nginx

# History
helm history my-nginx
```

### Creating Helm Charts

```bash
# Create chart scaffold
helm create my-app

# Directory structure:
my-app/
├── Chart.yaml           # Chart metadata
├── values.yaml          # Default values
├── charts/              # Dependencies
└── templates/           # K8s manifests (templated)
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    └── _helpers.tpl     # Template helpers
```

**Chart.yaml:**
```yaml
apiVersion: v2
name: my-app
description: A Helm chart for my application
type: application
version: 1.0.0
appVersion: "1.0"
```

**values.yaml:**
```yaml
replicaCount: 3

image:
  repository: nginx
  tag: 1.21
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

**templates/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "my-app.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "my-app.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - containerPort: 80
        resources:
          {{- toYaml .Values.resources | nindent 12 }}
```

```bash
# Package chart
helm package my-app

# Install local chart
helm install my-release ./my-app

# Template (render without installing)
helm template my-release ./my-app

# Lint
helm lint my-app
```

### Helm Best Practices

```yaml
# 1. Use values.yaml for configuration
# ❌ Hardcoded:
replicas: 3

# ✅ Parameterized:
replicas: {{ .Values.replicaCount }}

# 2. Use _helpers.tpl for reusable templates
{{- define "my-app.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

# 3. Always set resource limits
resources:
  {{- toYaml .Values.resources | nindent 12 }}

# 4. Use if/else for optional resources
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
...
{{- end }}

# 5. Version your charts
version: 1.2.3  # Chart version
appVersion: "2.0.1"  # Application version
```

---

## kustomize - Configuration Management

### What is kustomize?

**Customize K8s manifests** without templates - uses overlays and patches.

```
Base → Common configuration
Overlays → Environment-specific changes (dev, staging, prod)
```

### Installation

```bash
# Built into kubectl (1.14+)
kubectl kustomize ./

# Standalone
brew install kustomize
```

### Directory Structure

```
my-app/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── replica-patch.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── production/
        └── kustomization.yaml
```

### Base Configuration

**base/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml

commonLabels:
  app: myapp
```

**base/deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myapp:latest
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

### Overlays (Environment-Specific)

**overlays/dev/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namePrefix: dev-

namespace: development

replicas:
- name: myapp
  count: 1

images:
- name: myapp
  newTag: dev-latest

configMapGenerator:
- name: app-config
  literals:
  - environment=development
  - log_level=debug
```

**overlays/production/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

namePrefix: prod-

namespace: production

replicas:
- name: myapp
  count: 5

images:
- name: myapp
  newTag: v1.2.3

configMapGenerator:
- name: app-config
  literals:
  - environment=production
  - log_level=error

patchesStrategicMerge:
- |-
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: myapp
  spec:
    template:
      spec:
        containers:
        - name: app
          resources:
            limits:
              cpu: 2
              memory: 2Gi
            requests:
              cpu: 500m
              memory: 512Mi
```

### Using kustomize

```bash
# Preview output
kubectl kustomize overlays/dev
kubectl kustomize overlays/production

# Apply
kubectl apply -k overlays/dev
kubectl apply -k overlays/production

# Diff
kubectl diff -k overlays/production
```

### kustomize Capabilities

```yaml
# 1. Replace image tags
images:
- name: myapp
  newName: myregistry/myapp
  newTag: v2.0.0

# 2. Add common labels
commonLabels:
  app: myapp
  team: platform

# 3. Add name prefix/suffix
namePrefix: staging-
nameSuffix: -v1

# 4. Generate ConfigMaps/Secrets
configMapGenerator:
- name: config
  files:
  - app.conf
  literals:
  - key=value

secretGenerator:
- name: secret
  literals:
  - password=secret123

# 5. Patches
patchesStrategicMerge:
- patch.yaml

patchesJson6902:
- target:
    kind: Deployment
    name: myapp
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 3
```

---

## k9s - Terminal UI

### What is k9s?

**Terminal-based UI** for managing Kubernetes clusters - interactive and fast.

### Installation

```bash
# macOS
brew install k9s

# Linux
curl -sS https://webinstall.dev/k9s | bash

# Run
k9s
```

### Key Shortcuts

```
Navigation:
:pods        # View pods
:deploy      # View deployments
:svc         # View services
:ns          # View namespaces
/            # Filter by name
Ctrl-a       # All namespaces

Actions:
d            # Describe resource
e            # Edit resource
l            # View logs
s            # Shell into pod
y            # View YAML
Ctrl-k       # Delete resource
Ctrl-d       # Delete pod

Other:
?            # Help
:q or Ctrl-c # Quit
:ctx         # Switch context
:pulse       # View cluster metrics
```

---

## kubectx & kubens

### kubectx - Switch Contexts

```bash
# Install
brew install kubectx

# List contexts
kubectx

# Switch context
kubectx minikube
kubectx production

# Previous context
kubectx -

# Rename context
kubectx new-name=old-name
```

### kubens - Switch Namespaces

```bash
# List namespaces
kubens

# Switch namespace
kubens development
kubens production

# Previous namespace
kubens -
```

---

## stern - Multi-Pod Logs

### What is stern?

**Tail logs from multiple pods** simultaneously with color coding.

### Installation

```bash
# macOS
brew install stern

# Linux
wget https://github.com/stern/stern/releases/download/v1.25.0/stern_1.25.0_linux_amd64.tar.gz
```

### Usage

```bash
# All pods matching pattern
stern nginx

# Specific namespace
stern nginx -n production

# All containers in pod
stern nginx --all-namespaces

# Since timestamp
stern nginx --since 15m

# Include/exclude containers
stern nginx --container app
stern nginx --exclude-container sidecar

# Custom output
stern nginx --template '{{color .PodColor .PodName}} {{.Message}}'

# Follow specific deployment
stern -l app=nginx
```

---

## Other Essential Tools

### 1. kubeseal - Sealed Secrets

```bash
# Encrypt secrets for Git
brew install kubeseal

# Install controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.23.0/controller.yaml

# Create sealed secret
echo -n "secretvalue" | kubectl create secret generic mysecret \
  --dry-run=client --from-file=password=/dev/stdin -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Apply (controller decrypts)
kubectl apply -f sealed-secret.yaml
```

### 2. kube-ps1 - Context in Prompt

```bash
# Install
brew install kube-ps1

# Add to .bashrc/.zshrc
source "/opt/homebrew/opt/kube-ps1/share/kube-ps1.sh"
PS1='$(kube_ps1)'$PS1

# Shows: (⎈ |minikube:default)
```

### 3. kubectl-tree - Resource Hierarchy

```bash
# Install
brew install kubectl-tree

# View resource tree
kubectl tree deployment myapp
```

### 4. popeye - Cluster Scanner

```bash
# Install
brew install derailed/popeye/popeye

# Scan cluster
popeye

# Saves report
popeye -o html > report.html
```

---

## Interview Questions

**Q1: What's the difference between Helm and kustomize?**

**Answer:**
- **Helm**: Template-based, package manager, good for third-party apps, uses Go templates
- **kustomize**: Patch-based, built into kubectl, no templates, overlays for environments
Use Helm for complex apps/dependencies, kustomize for simpler customization.

**Q2: When would you use `kubectl apply` vs `kubectl create`?**

**Answer:**
- **apply**: Declarative, idempotent, can update existing resources, recommended for GitOps
- **create**: Imperative, fails if resource exists, one-time creation
Always use `apply` for production (infrastructure as code).

**Q3: How do you troubleshoot a pod that's CrashLoopBackOff?**

**Answer:**
1. `kubectl describe pod` - check events
2. `kubectl logs pod-name --previous` - see why it crashed
3. `kubectl get pod -o yaml` - check configuration
4. `kubectl exec -it pod -- sh` - debug if running
Common causes: wrong image, missing dependencies, incorrect command, resource limits.

**Q4: Explain Helm's rollback mechanism.**

**Answer:** Helm tracks release revisions in Secrets. Each upgrade creates new revision. `helm rollback` reverts to previous revision by applying old manifest. Can rollback to any revision with `helm rollback release-name revision-number`.

**Q5: What are the advantages of kustomize's overlay approach?**

**Answer:**
- No templates (pure YAML)
- DRY principle (don't repeat base config)
- Git-friendly (can diff changes)
- Built into kubectl
- Environment-specific overlays without duplication
Perfect for GitOps workflows.

---

## Hands-On Exercise

### Task: Deploy App Using Multiple Tools

```bash
# 1. Create namespace with kubens
kubens -c my-app

# 2. Create kustomize structure
mkdir -p my-app/{base,overlays/dev,overlays/prod}

# 3. Create base/deployment.yaml
cat <<EOF > my-app/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
EOF

# 4. Create base/kustomization.yaml
cat <<EOF > my-app/base/kustomization.yaml
resources:
- deployment.yaml
EOF

# 5. Create overlays/dev/kustomization.yaml
cat <<EOF > my-app/overlays/dev/kustomization.yaml
bases:
- ../../base
namePrefix: dev-
replicas:
- name: nginx
  count: 1
EOF

# 6. Create overlays/prod/kustomization.yaml
cat <<EOF > my-app/overlays/prod/kustomization.yaml
bases:
- ../../base
namePrefix: prod-
replicas:
- name: nginx
  count: 5
EOF

# 7. Apply with kustomize
kubectl apply -k my-app/overlays/dev

# 8. View with k9s
k9s

# 9. Check logs with stern
stern nginx

# 10. Install Helm chart
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-redis bitnami/redis

# 11. View all resources
kubectl get all

# 12. Clean up
kubectl delete -k my-app/overlays/dev
helm uninstall my-redis
```

---

## 📚 Additional Resources

- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Helm Documentation](https://helm.sh/docs/)
- [kustomize Documentation](https://kustomize.io/)
- [k9s GitHub](https://github.com/derailed/k9s)

---

## ✅ Module Checklist

- [ ] Master advanced kubectl commands
- [ ] Create and deploy Helm charts
- [ ] Use kustomize for multi-environment configs
- [ ] Install and use k9s for cluster management
- [ ] Use kubectx/kubens for context switching
- [ ] Tail logs with stern
- [ ] Complete hands-on exercise with all tools

---

## 🎉 Kubernetes Section Complete!

**Congratulations!** You've mastered Kubernetes fundamentals:
- ✅ Architecture & Components
- ✅ All 7 Core Workload Types
- ✅ Networking (Services, Ingress, NetworkPolicies)
- ✅ Storage (PV, PVC, StorageClasses)
- ✅ Configuration (ConfigMaps, Secrets)
- ✅ Essential Tools (kubectl, Helm, kustomize, k9s)

**Next Section:** [Module 12: Infrastructure - Server Setup](./12_Infrastructure_Server_Setup.md) - Learn bare metal, VMs, networking, and infrastructure basics! 🖥️
