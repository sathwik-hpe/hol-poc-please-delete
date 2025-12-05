# Kubernetes Security Hardening: A Complete Guide

**Published: January 2025 | Reading Time: 10 min**

Security in Kubernetes is multi-layered. This comprehensive guide covers everything from cluster setup to runtime protection.

## Layer 1: Cluster Security

### API Server Hardening

```yaml
# kube-apiserver flags
--anonymous-auth=false
--authorization-mode=RBAC,Node
--enable-admission-plugins=NodeRestriction,PodSecurityPolicy,ServiceAccount
--audit-log-path=/var/log/kubernetes/audit.log
--audit-log-maxage=30
--tls-cert-file=/path/to/cert
--tls-private-key-file=/path/to/key
```

### etcd Encryption at Rest

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
- resources:
  - secrets
  providers:
  - aescbc:
      keys:
      - name: key1
        secret: <base64-encoded-32-byte-key>
  - identity: {}
```

Apply configuration:
```bash
kube-apiserver --encryption-provider-config=/path/to/encryption-config.yaml
```

### Network Segmentation

```yaml
# Deny all traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress

---
# Allow specific traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

## Layer 2: RBAC Configuration

### Principle of Least Privilege

```yaml
# Bad: Too permissive
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: bad-role
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

---
# Good: Specific permissions
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: development
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
  
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: development
subjects:
- kind: User
  name: developer@company.com
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### Service Account Best Practices

```yaml
# Disable default service account token mounting
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-sa
automountServiceAccountToken: false

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      serviceAccountName: app-sa
      automountServiceAccountToken: false  # Explicitly disable if not needed
```

### Audit RBAC Permissions

```bash
# Check what a user can do
kubectl auth can-i --list --as=developer@company.com

# Check specific permission
kubectl auth can-i delete pods --as=developer@company.com -n production

# Find overly permissive roles
kubectl get clusterrolebindings -o json | jq '.items[] | select(.roleRef.name=="cluster-admin")'
```

## Layer 3: Pod Security

### Pod Security Standards

```yaml
# Enforce at namespace level
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Security Context

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: myapp:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

### AppArmor and Seccomp

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
  annotations:
    container.apparmor.security.beta.kubernetes.io/app: runtime/default
spec:
  securityContext:
    seccompProfile:
      type: Localhost
      localhostProfile: profiles/audit.json
  containers:
  - name: app
    image: myapp:latest
```

## Layer 4: Image Security

### Image Scanning

```yaml
# Trivy scan in CI/CD
- name: Scan image
  run: |
    trivy image --severity HIGH,CRITICAL --exit-code 1 myapp:latest

# Admission webhook to block vulnerable images
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: image-scan
webhooks:
- name: scan.example.com
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  clientConfig:
    service:
      name: image-scanner
      namespace: security
```

### Image Pull Policies

```yaml
spec:
  containers:
  - name: app
    image: registry.company.com/myapp:v1.2.3  # Use specific tags, not :latest
    imagePullPolicy: Always  # Always pull to ensure latest security patches
  imagePullSecrets:
  - name: registry-credentials
```

### Distroless Images

```dockerfile
# Use Google's distroless base images
FROM gcr.io/distroless/static-debian11

COPY --from=builder /app/binary /app/binary
USER 65532:65532
ENTRYPOINT ["/app/binary"]
```

## Layer 5: Secrets Management

### Never Commit Secrets to Git

```bash
# Bad
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
data:
  password: cGFzc3dvcmQxMjM=  # base64 is NOT encryption!

# Good: Use external secrets operator
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

### Sealed Secrets

```bash
# Install Sealed Secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal a secret
echo -n mypassword | kubectl create secret generic mysecret --dry-run=client --from-file=password=/dev/stdin -o yaml | \
  kubeseal -o yaml > mysealedsecret.yaml

# Commit sealed secret to git (safe)
git add mysealedsecret.yaml
```

### Rotate Secrets Regularly

```yaml
# External Secrets with rotation
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-secret
spec:
  refreshInterval: 24h  # Automatically sync every 24h
  secretStoreRef:
    name: vault
    kind: SecretStore
  target:
    name: app-secret
    creationPolicy: Owner
    template:
      type: Opaque
      engineVersion: v2
  dataFrom:
  - extract:
      key: secret/app
```

## Layer 6: Runtime Security

### Falco for Runtime Detection

```yaml
# Deploy Falco
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set driver.kind=ebpf

# Custom Falco rules
- rule: Unexpected outbound connection
  desc: Detect unexpected outbound connections
  condition: >
    outbound and 
    container and 
    not fd.sip in (allowed_ips)
  output: >
    Unexpected outbound connection
    (user=%user.name container=%container.name dest=%fd.rip)
  priority: WARNING
```

### OPA Gatekeeper

```yaml
# Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.14/deploy/gatekeeper.yaml

# Constraint template: Require labels
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8srequiredlabels
      
      violation[{"msg": msg}] {
        provided := {label | input.review.object.metadata.labels[label]}
        required := {label | label := input.parameters.labels[_]}
        missing := required - provided
        count(missing) > 0
        msg := sprintf("Missing required labels: %v", [missing])
      }

---
# Apply constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-labels
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
  parameters:
    labels:
    - app
    - environment
    - owner
```

## Layer 7: Supply Chain Security

### SBOM (Software Bill of Materials)

```bash
# Generate SBOM with Syft
syft packages myapp:latest -o spdx-json > sbom.json

# Verify with Cosign
cosign verify --key cosign.pub myapp:latest
```

### Image Signing

```bash
# Sign images with Cosign
cosign generate-key-pair
cosign sign --key cosign.key myapp:latest

# Verify in admission controller
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image
spec:
  validationFailureAction: enforce
  rules:
  - name: verify-signature
    match:
      resources:
        kinds:
        - Pod
    verifyImages:
    - imageReferences:
      - "registry.company.com/*"
      attestors:
      - entries:
        - keys:
            publicKeys: |-
              -----BEGIN PUBLIC KEY-----
              ...
              -----END PUBLIC KEY-----
```

## Security Auditing

### CIS Benchmark

```bash
# Run kube-bench
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
kubectl logs -f job/kube-bench

# Review findings
kubectl logs job/kube-bench | grep -E "FAIL|WARN"
```

### Regular Penetration Testing

```bash
# kube-hunter for vulnerability scanning
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-hunter/main/job.yaml

# Review results
kubectl logs -f job/kube-hunter
```

## Security Checklist

**Cluster Level:**
- [ ] API server has TLS enabled
- [ ] etcd encryption at rest enabled
- [ ] RBAC enabled
- [ ] Admission controllers configured
- [ ] Audit logging enabled
- [ ] Network policies enforced

**Pod Level:**
- [ ] Run as non-root
- [ ] Read-only root filesystem
- [ ] Drop all capabilities
- [ ] Pod Security Standards enforced
- [ ] Resource limits set
- [ ] Security context configured

**Image Level:**
- [ ] Images scanned for vulnerabilities
- [ ] Using minimal base images (distroless)
- [ ] Images signed
- [ ] No secrets in images
- [ ] Specific image tags (not :latest)

**Secrets Management:**
- [ ] Secrets stored externally (Vault/AWS Secrets Manager)
- [ ] Secrets encrypted at rest
- [ ] Secret rotation implemented
- [ ] No secrets in environment variables
- [ ] Sealed Secrets for GitOps

**Runtime:**
- [ ] Falco deployed for anomaly detection
- [ ] OPA Gatekeeper for policy enforcement
- [ ] Regular security audits
- [ ] Incident response plan documented

## Conclusion

Kubernetes security is not a one-time task but an ongoing process. Key principles:

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal permissions
3. **Zero Trust**: Verify everything
4. **Automation**: Security as code
5. **Monitoring**: Detect and respond

Stay vigilant, automate security checks, and regularly audit your cluster.

---

*Practice security techniques in our [Kubernetes Labs](../k8s-fundamentals/index.html) at HPE Labs Hub.*
