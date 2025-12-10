# Module 10: Kubernetes Configuration Management 🔐

## Master ConfigMaps, Secrets & Application Configuration

**Duration:** 2-3 hours  
**Prerequisites:** Module 06-09 (K8s fundamentals)  
**Outcome:** Externalize configuration and manage secrets securely

---

## 📚 Table of Contents

1. [Configuration Challenges](#configuration-challenges)
2. [ConfigMaps](#configmaps)
3. [Secrets](#secrets)
4. [Environment Variables](#environment-variables)
5. [Best Practices](#best-practices)
6. [Interview Questions](#interview-questions)
7. [Hands-On Exercise](#hands-on-exercise)

---

## Configuration Challenges

### 12-Factor App Principle

```
III. Config
Store config in the environment
Separate code from configuration
```

### Kubernetes Configuration Options

```yaml
1. ConfigMaps      # Non-sensitive config
2. Secrets         # Sensitive data (passwords, tokens)
3. Environment Variables
4. Command-line arguments
5. Configuration files (mounted volumes)
```

---

## ConfigMaps

### What is a ConfigMap?

**Store non-sensitive configuration** as key-value pairs.

### Creating ConfigMaps

#### From Literals

```bash
kubectl create configmap app-config \
  --from-literal=database_url=postgres://db:5432/myapp \
  --from-literal=log_level=info \
  --from-literal=max_connections=100
```

#### From File

```bash
# config.properties
database_url=postgres://db:5432/myapp
log_level=info
max_connections=100

kubectl create configmap app-config --from-file=config.properties
```

#### From YAML

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgres://db:5432/myapp"
  log_level: "info"
  max_connections: "100"
  
  # Multi-line configuration
  app.conf: |
    server {
      listen 80;
      server_name example.com;
      
      location / {
        proxy_pass http://backend:8080;
      }
    }
```

### Using ConfigMaps

#### As Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    # Option 1: Individual keys
    env:
    - name: DATABASE_URL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_url
    
    # Option 2: All keys
    envFrom:
    - configMapRef:
        name: app-config
```

#### As Volume

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: config
      mountPath: /etc/config
      readOnly: true
  
  volumes:
  - name: config
    configMap:
      name: app-config
```

```bash
# Inside pod, files created for each key:
/etc/config/database_url
/etc/config/log_level
/etc/config/max_connections
/etc/config/app.conf
```

#### Specific Keys as Files

```yaml
volumes:
- name: config
  configMap:
    name: app-config
    items:
    - key: app.conf
      path: nginx.conf  # Custom filename
```

### Updating ConfigMaps

```bash
# Edit ConfigMap
kubectl edit configmap app-config

# Or apply updated YAML
kubectl apply -f configmap.yaml
```

**⚠️ Important:** Pods don't automatically reload ConfigMaps!

```bash
# Must restart pods to see changes
kubectl rollout restart deployment/myapp

# Or use tools like Reloader:
# github.com/stakater/Reloader
```

---

## Secrets

### What is a Secret?

**Store sensitive data** (passwords, tokens, certificates) - base64 encoded.

### Secret Types

```yaml
Opaque                # Generic secret (default)
kubernetes.io/tls     # TLS certificates
kubernetes.io/dockerconfigjson  # Docker registry credentials
kubernetes.io/basic-auth        # Basic authentication
kubernetes.io/ssh-auth          # SSH keys
kubernetes.io/service-account-token  # Service account token
```

### Creating Secrets

#### From Literals

```bash
kubectl create secret generic db-secret \
  --from-literal=username=admin \
  --from-literal=password=secretpass123
```

#### From Files

```bash
# db-credentials.txt
username=admin
password=secretpass123

kubectl create secret generic db-secret \
  --from-file=db-credentials.txt
```

#### From YAML

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
data:
  username: YWRtaW4=           # base64: admin
  password: c2VjcmV0cGFzczEyMw==  # base64: secretpass123
```

```bash
# Base64 encoding
echo -n "admin" | base64
# YWRtaW4=

echo -n "secretpass123" | base64
# c2VjcmV0cGFzczEyMw==

# Decoding
echo "YWRtaW4=" | base64 --decode
# admin
```

#### StringData (No Encoding Needed)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:  # Plain text, K8s encodes automatically
  username: admin
  password: secretpass123
```

### Using Secrets

#### As Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    env:
    - name: DB_USERNAME
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: username
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
```

#### As Volume (Recommended)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: secret-volume
      mountPath: /etc/secrets
      readOnly: true  # Important!
  
  volumes:
  - name: secret-volume
    secret:
      secretName: db-secret
```

```bash
# Inside pod:
cat /etc/secrets/username  # admin
cat /etc/secrets/password  # secretpass123
```

### TLS Secrets

```bash
# Create TLS secret
kubectl create secret tls tls-secret \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key
```

```yaml
# Use in Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: secure-ingress
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: tls-secret
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web
            port:
              number: 80
```

### Docker Registry Secret

```bash
# Create docker-registry secret
kubectl create secret docker-registry regcred \
  --docker-server=https://index.docker.io/v1/ \
  --docker-username=myusername \
  --docker-password=mypassword \
  --docker-email=my@email.com
```

```yaml
# Use in Pod
spec:
  containers:
  - name: app
    image: private-registry.com/myapp:1.0
  
  imagePullSecrets:
  - name: regcred
```

---

## Environment Variables

### Sources of Environment Variables

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: env-demo
spec:
  containers:
  - name: app
    image: myapp:1.0
    env:
    
    # 1. Literal value
    - name: ENVIRONMENT
      value: "production"
    
    # 2. Pod metadata
    - name: POD_NAME
      valueFrom:
        fieldRef:
          fieldPath: metadata.name
    - name: POD_NAMESPACE
      valueFrom:
        fieldRef:
          fieldPath: metadata.namespace
    - name: POD_IP
      valueFrom:
        fieldRef:
          fieldPath: status.podIP
    
    # 3. Container resources
    - name: CPU_LIMIT
      valueFrom:
        resourceFieldRef:
          containerName: app
          resource: limits.cpu
    
    # 4. ConfigMap
    - name: DATABASE_URL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: database_url
    
    # 5. Secret
    - name: DB_PASSWORD
      valueFrom:
        secretKeyRef:
          name: db-secret
          key: password
```

### Load All ConfigMap/Secret Keys

```yaml
spec:
  containers:
  - name: app
    image: myapp:1.0
    
    # All ConfigMap keys as env vars
    envFrom:
    - configMapRef:
        name: app-config
    
    # All Secret keys as env vars
    - secretRef:
        name: db-secret
```

---

## Best Practices

### 1. Don't Commit Secrets to Git

```bash
# ❌ Bad: Secrets in code
password: "mysecret123"

# ✅ Good: External secret management
- Use Kubernetes Secrets
- Use external tools (Vault, AWS Secrets Manager)
- GitOps: Sealed Secrets, SOPS
```

### 2. Use Volumes for Secrets

```yaml
# ✅ Recommended: Volume mount
volumeMounts:
- name: secret
  mountPath: /etc/secrets
  readOnly: true

# ⚠️ Less secure: Environment variable
# (visible in ps, logs, /proc)
env:
- name: PASSWORD
  valueFrom:
    secretKeyRef:
      name: secret
      key: password
```

### 3. Principle of Least Privilege

```yaml
# Create separate secrets for different components
db-secret      # Only for database pods
api-key-secret # Only for API pods
tls-secret     # Only for Ingress
```

### 4. Immutable ConfigMaps/Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
immutable: true  # Cannot be changed
data:
  config: "value"
```

**Benefits:**
- Performance (kubelet doesn't watch for changes)
- Safety (prevents accidental updates)
- For updates: Create new ConfigMap, update Deployment

### 5. Use Namespaces for Isolation

```bash
# Production secrets in production namespace
kubectl create secret generic db-secret \
  --from-literal=password=prod123 \
  -n production

# Dev secrets in dev namespace
kubectl create secret generic db-secret \
  --from-literal=password=dev123 \
  -n dev
```

### 6. External Secret Management

```yaml
# Tools for enterprise secret management:
- HashiCorp Vault
- AWS Secrets Manager
- Azure Key Vault
- GCP Secret Manager
- External Secrets Operator (ESO)
```

**Example: External Secrets Operator**

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-secret
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: db-secret
  data:
  - secretKey: password
    remoteRef:
      key: secret/database
      property: password
```

---

## Interview Questions

**Q1: What's the difference between ConfigMap and Secret?**

**Answer:**
- **ConfigMap**: Non-sensitive config (URLs, feature flags), stored as plain text
- **Secret**: Sensitive data (passwords, tokens), base64 encoded, can be encrypted at rest
Both used similarly but Secrets have additional security measures (encryption, RBAC restrictions).

**Q2: Why use volumes instead of environment variables for secrets?**

**Answer:** Security. Environment variables are:
- Visible in `kubectl describe pod`
- Visible in container `/proc` filesystem
- Can leak in logs if application prints env
Volumes are more secure, harder to accidentally expose, and support hot-reloading.

**Q3: How do you update a ConfigMap without downtime?**

**Answer:** Two approaches:
1. **In-place update**: Edit ConfigMap, rollout restart deployment (brief restart)
2. **Blue-green**: Create new ConfigMap (app-config-v2), update Deployment to use it, delete old ConfigMap (zero downtime)

**Q4: What is base64 encoding and is it secure?**

**Answer:** Base64 is encoding (not encryption) - converts binary to ASCII text. Not secure - easily decoded. Kubernetes Secrets use base64 for convenience (storing binary data), not security. For real security, enable encryption at rest in etcd.

**Q5: How would you manage secrets in a GitOps workflow?**

**Answer:** Use sealed secrets or SOPS:
- **Sealed Secrets**: Encrypt secrets with public key, commit encrypted version, controller decrypts in cluster
- **SOPS**: Encrypt files with KMS/PGP, commit encrypted files, decrypt during apply
Never commit plain secrets to Git.

---

## Hands-On Exercise

### Task: Configure Multi-Environment Application

```yaml
# 1. Development ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: dev
data:
  environment: "development"
  database_url: "postgres://db:5432/myapp_dev"
  log_level: "debug"
  feature_flag_new_ui: "true"

---
# 2. Production ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: prod
data:
  environment: "production"
  database_url: "postgres://db-prod:5432/myapp"
  log_level: "error"
  feature_flag_new_ui: "false"

---
# 3. Database Secret (dev)
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: dev
type: Opaque
stringData:
  username: "devuser"
  password: "devpass123"

---
# 4. Database Secret (prod)
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: prod
type: Opaque
stringData:
  username: "produser"
  password: "prod_secure_pass_xyz"

---
# 5. Application Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
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
        image: busybox:1.35
        command: ["/bin/sh", "-c"]
        args:
        - |
          echo "Environment: $ENVIRONMENT"
          echo "Database: $DATABASE_URL"
          echo "Log Level: $LOG_LEVEL"
          echo "DB User: $(cat /etc/secrets/username)"
          echo "New UI: $FEATURE_FLAG_NEW_UI"
          sleep 3600
        
        # Environment variables from ConfigMap
        envFrom:
        - configMapRef:
            name: app-config
        
        # Secret as volume
        volumeMounts:
        - name: db-credentials
          mountPath: /etc/secrets
          readOnly: true
      
      volumes:
      - name: db-credentials
        secret:
          secretName: db-secret
```

**Tasks:**

```bash
# 1. Create namespaces
kubectl create namespace dev
kubectl create namespace prod

# 2. Deploy to dev
kubectl apply -f config.yaml -n dev

# 3. Deploy to prod
kubectl apply -f config.yaml -n prod

# 4. Verify configurations
kubectl exec -it -n dev deployment/myapp -- env | grep -E "ENVIRONMENT|DATABASE"
kubectl exec -it -n prod deployment/myapp -- env | grep -E "ENVIRONMENT|DATABASE"

# 5. Check secrets
kubectl exec -it -n dev deployment/myapp -- cat /etc/secrets/username
kubectl exec -it -n prod deployment/myapp -- cat /etc/secrets/username

# 6. Update ConfigMap
kubectl edit configmap app-config -n dev
# Change log_level: debug → log_level: info

# 7. Restart to see changes
kubectl rollout restart deployment/myapp -n dev
```

---

## 📚 Additional Resources

- [ConfigMaps](https://kubernetes.io/docs/concepts/configuration/configmap/)
- [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Managing Secrets](https://kubernetes.io/docs/tasks/configmap-secret/)
- [External Secrets Operator](https://external-secrets.io/)

---

## ✅ Module Checklist

- [ ] Create and use ConfigMaps
- [ ] Create and use Secrets
- [ ] Mount configs as volumes
- [ ] Use environment variables
- [ ] Implement multi-environment configuration
- [ ] Understand security best practices

---

**Next Module:** [Module 11: Kubernetes Tools](./11_Kubernetes_Tools.md) - Master kubectl, Helm, kustomize, and essential K8s tools! 🛠️
