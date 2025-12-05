# GitOps Workflows: The Modern Way to Deploy

**Published: January 2025 | Reading Time: 7 min**

GitOps has revolutionized how we deploy and manage Kubernetes applications. This guide explores implementing effective GitOps workflows.

## What is GitOps?

GitOps uses Git as the single source of truth for declarative infrastructure and applications. Key principles:

1. **Declarative**: System desired state defined declaratively
2. **Versioned**: All changes tracked in Git
3. **Pulled**: Automated agents pull changes from Git
4. **Continuously Reconciled**: System converges to desired state

## GitOps Tools

### ArgoCD
- **Pros**: Rich UI, multi-cluster, Helm/Kustomize support
- **Cons**: Heavier resource usage
- **Best For**: Teams wanting visibility and manual overrides

### Flux CD
- **Pros**: Lightweight, GitOps Toolkit, native Git integration
- **Cons**: Less intuitive UI
- **Best For**: Automation-first teams, multi-tenancy

## Repository Structures

### Monorepo Pattern
```
gitops-repo/
├── apps/
│   ├── frontend/
│   │   ├── base/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   ├── overlays/
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── production/
│   └── backend/
├── infrastructure/
│   ├── ingress-nginx/
│   ├── cert-manager/
│   └── monitoring/
└── clusters/
    ├── dev-cluster/
    ├── staging-cluster/
    └── production-cluster/
```

**Advantages:**
- Single source of truth
- Easy to see entire system
- Atomic changes across multiple apps

**Disadvantages:**
- Access control complexity
- Larger repository

### Polyrepo Pattern
```
frontend-gitops/
├── base/
└── overlays/

backend-gitops/
├── base/
└── overlays/

infrastructure-gitops/
├── ingress/
├── monitoring/
└── security/
```

**Advantages:**
- Fine-grained access control
- Team autonomy
- Smaller, focused repositories

**Disadvantages:**
- Harder to coordinate changes
- Multiple sources of truth

## ArgoCD Application Patterns

### App of Apps Pattern
```yaml
# apps/root-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: root-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/gitops
    targetRevision: HEAD
    path: apps
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true

---
# apps/frontend-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/gitops
    targetRevision: HEAD
    path: apps/frontend/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

### ApplicationSet for Multi-Cluster
```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: frontend-multicluster
spec:
  generators:
  - list:
      elements:
      - cluster: dev
        url: https://dev-cluster.example.com
        namespace: frontend-dev
      - cluster: staging
        url: https://staging-cluster.example.com
        namespace: frontend-staging
      - cluster: production
        url: https://production-cluster.example.com
        namespace: frontend
  template:
    metadata:
      name: '{{cluster}}-frontend'
    spec:
      project: default
      source:
        repoURL: https://github.com/company/gitops
        targetRevision: HEAD
        path: 'apps/frontend/overlays/{{cluster}}'
      destination:
        server: '{{url}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## CI/CD Integration

### Two-Repo Strategy

**Code Repo (CI)**
```yaml
# .github/workflows/ci.yml
name: CI
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Build and test
      run: |
        go test ./...
        docker build -t myapp:${{ github.sha }} .
    
    - name: Push image
      run: |
        docker push ghcr.io/company/myapp:${{ github.sha }}
    
    - name: Update GitOps repo
      run: |
        git clone https://github.com/company/gitops
        cd gitops/apps/myapp/overlays/dev
        kustomize edit set image myapp=ghcr.io/company/myapp:${{ github.sha }}
        git add .
        git commit -m "Update myapp to ${{ github.sha }}"
        git push
```

**GitOps Repo (CD)**
- ArgoCD watches this repo
- Automatically deploys changes
- Manual promotion to production

### Image Updater Pattern

```yaml
# ArgoCD Image Updater
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=ghcr.io/company/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: digest
    argocd-image-updater.argoproj.io/write-back-method: git
spec:
  source:
    repoURL: https://github.com/company/gitops
    path: apps/myapp
```

## Environment Promotion

### Manual Promotion
```bash
# Developer merges to main -> auto-deploy to dev
git checkout main
git merge feature-branch

# QA approves -> promote to staging
git checkout staging
git merge main
git push

# Product owner approves -> promote to production
git checkout production
git merge staging
git push
```

### PR-Based Promotion
```yaml
# .github/workflows/promote-to-prod.yml
name: Promote to Production
on:
  pull_request:
    branches: [production]
    paths:
    - 'apps/**/overlays/production/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Validate manifests
      run: |
        kubectl apply --dry-run=client -k apps/myapp/overlays/production
    
    - name: Security scan
      run: |
        kube-score score apps/myapp/overlays/production/*.yaml
```

## Secrets Management

### Sealed Secrets
```bash
# Seal secret
kubectl create secret generic db-creds \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit to Git (safe)
git add sealed-secret.yaml
git commit -m "Add database credentials"
```

### External Secrets Operator
```yaml
# external-secret.yaml (safe to commit)
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-secret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: db-secret
  data:
  - secretKey: password
    remoteRef:
      key: prod/database/password
```

## Rollback Strategies

### Git Revert
```bash
# Identify bad commit
git log --oneline

# Revert
git revert <bad-commit-hash>
git push

# ArgoCD automatically rolls back
```

### ArgoCD Rollback
```bash
# Via UI: Click "Rollback" button

# Via CLI
argocd app rollback myapp
argocd app rollback myapp --to-revision=5
```

### Canary with Argo Rollouts
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 5m}
      - setWeight: 40
      - pause: {duration: 5m}
      - setWeight: 60
      - pause: {duration: 5m}
      - setWeight: 80
      - pause: {duration: 5m}
      analysis:
        templates:
        - templateName: error-rate-analysis
        startingStep: 2
      # Auto-rollback on failure
      rollback:
        enabled: true
```

## Sync Policies

### Automatic Sync
```yaml
syncPolicy:
  automated:
    prune: true     # Delete resources not in Git
    selfHeal: true  # Auto-correct drift
  syncOptions:
  - CreateNamespace=true
  - PruneLast=true  # Delete resources after creating new ones
```

### Manual Sync
```yaml
syncPolicy:
  syncOptions:
  - CreateNamespace=true
# No automated field = manual sync required
```

### Sync Windows
```yaml
# Only sync during maintenance window
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  syncWindows:
  - kind: allow
    schedule: '0 2 * * *'  # 2 AM daily
    duration: 1h
    applications:
    - '*'
```

## Monitoring GitOps

### Key Metrics
```promql
# Sync failures
argocd_app_sync_total{phase="Failed"}

# Out of sync apps
count(argocd_app_info{sync_status!="Synced"})

# Health status
argocd_app_info{health_status!="Healthy"}
```

### Alerts
```yaml
groups:
- name: argocd
  rules:
  - alert: ArgocdSyncFailed
    expr: argocd_app_sync_total{phase="Failed"} > 0
    annotations:
      summary: "ArgoCD sync failed for {{ $labels.name }}"
  
  - alert: ArgocdOutOfSync
    expr: argocd_app_info{sync_status!="Synced"} > 0
    for: 10m
    annotations:
      summary: "App {{ $labels.name }} out of sync"
```

## Best Practices

### Repository Structure
- ✅ Separate application code from GitOps manifests
- ✅ Use Kustomize overlays for environments
- ✅ Store base manifests separately
- ✅ Document repository structure in README

### Security
- ✅ Never commit secrets to Git
- ✅ Use Sealed Secrets or External Secrets Operator
- ✅ Require PR reviews for production changes
- ✅ Implement RBAC for ArgoCD

### Sync Strategy
- ✅ Enable automated sync for non-production
- ✅ Use manual sync for production (initial phases)
- ✅ Enable prune and selfHeal after gaining confidence
- ✅ Use sync waves for ordering dependencies

### Validation
- ✅ Validate manifests in CI pipeline
- ✅ Run security scans (kube-score, Polaris)
- ✅ Test in dev/staging before production
- ✅ Implement automated rollback on failures

## Troubleshooting

### Out of Sync
```bash
# Check diff
argocd app diff myapp

# Force sync
argocd app sync myapp --force

# Check status
argocd app get myapp
```

### Sync Failures
```bash
# View events
kubectl get events -n myapp

# Check ArgoCD logs
kubectl logs -n argocd deployment/argocd-application-controller

# Validate manifests
kubectl apply --dry-run=server -k path/to/manifests
```

## Conclusion

GitOps transforms deployment practices:

1. **Git as Source of Truth**: All changes tracked and auditable
2. **Automated Deployments**: Reduce human error
3. **Easy Rollbacks**: Just revert Git commits
4. **Consistent Environments**: Dev, staging, prod from same codebase
5. **Disaster Recovery**: Entire cluster state in Git

Start with manual syncs, gradually enable automation as confidence grows.

---

*Practice GitOps in our [ArgoCD Lab](../argocd-lab/index.html) at HPE Labs Hub.*
