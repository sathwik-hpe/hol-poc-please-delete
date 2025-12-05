# Hands-On Guide: Installing and Configuring Velero for Kubernetes Backup and Restore
## A Step-by-Step Tutorial with Real Examples

**Author:** Technical Documentation Team  
**Date:** December 2025  
**Estimated Time:** 45 minutes  
**Difficulty:** Intermediate

---

## 🎯 What You'll Learn

By the end of this guide, you'll be able to:
- Install Velero using Helm with production-grade configuration
- Configure S3-compatible storage (MinIO) as a backup destination
- Create manual backups of your Kubernetes cluster
- Perform multi-phase restores with proper dependency ordering
- Validate backup and restore operations

## 📋 Prerequisites

Before starting, ensure you have:
- A running Kubernetes cluster (1.21+)
- `kubectl` configured to access your cluster
- `helm` CLI (version 3.x)
- S3-compatible object storage (MinIO or AWS S3)
- Cluster admin permissions

### Verify Prerequisites

```bash
# Check Kubernetes connection
kubectl cluster-info

# Expected output:
# Kubernetes control plane is running at https://your-cluster:6443
# CoreDNS is running at https://your-cluster:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy

# Check Helm version
helm version --short

# Expected output:
# v3.12.0+g1234abc
```

---

## 🏗️ Part 1: Preparing Your Environment

### Step 1: Set Up MinIO Storage

We'll use MinIO as our S3-compatible backup storage.

```bash
# Set your MinIO credentials
export MINIO_ENDPOINT="https://10.14.183.240:9000"
export MINIO_ACCESS_KEY="vmreadwrite"
export MINIO_SECRET_KEY="shell_pass@123"
export MINIO_BUCKET="backup-storage"
```

### Step 2: Create Velero Credentials File

Create a temporary credentials file for Velero to access MinIO:

```bash
# Create credentials file
cat > /tmp/velero-credentials <<EOF
[default]
aws_access_key_id=${MINIO_ACCESS_KEY}
aws_secret_access_key=${MINIO_SECRET_KEY}
EOF

# Verify credentials file
cat /tmp/velero-credentials
```

**Expected output:**
```
[default]
aws_access_key_id=vmreadwrite
aws_secret_access_key=shell_pass@123
```

### Step 3: Download Velero Helm Chart

```bash
# Add Velero Helm repository
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts

# Update Helm repositories
helm repo update

# Verify Velero chart is available
helm search repo velero
```

**Expected output:**
```
NAME                    CHART VERSION   APP VERSION     DESCRIPTION
vmware-tanzu/velero     5.1.0           1.12.0          A Helm chart for velero
```

---

## 🚀 Part 2: Installing Velero

### Step 4: Install Velero with Helm

Now we'll install Velero with production-grade configuration matching the implementation from the white paper.

```bash
helm upgrade --install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set-file credentials.secretContents.cloud=/tmp/velero-credentials \
  --set configuration.backupStorageLocation[0].name=default \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket="${MINIO_BUCKET}" \
  --set configuration.backupStorageLocation[0].config.region=us-east-1 \
  --set configuration.backupStorageLocation[0].config.s3ForcePathStyle=true \
  --set configuration.backupStorageLocation[0].config.s3Url=${MINIO_ENDPOINT} \
  --set configuration.backupStorageLocation[0].config.checksumAlgorithm="" \
  --set configuration.volumeSnapshotLocation[0].name=default-snapshot-location \
  --set configuration.volumeSnapshotLocation[0].provider=aws \
  --set configuration.volumeSnapshotLocation[0].config.region=us-east-1 \
  --set initContainers[0].name=velero-plugin-for-aws \
  --set initContainers[0].image=velero/velero-plugin-for-aws:v1.10.0 \
  --set initContainers[0].volumeMounts[0].mountPath=/target \
  --set initContainers[0].volumeMounts[0].name=plugins \
  --set deployNodeAgent=true \
  --set configuration.uploaderType=kopia \
  --set configuration.defaultSnapshotMoveData=true \
  --set configuration.features=EnableCSI \
  --set configuration.repositoryMaintenanceJob.latestJobsCount=1 \
  --set snapshotsEnabled=true
```

**Expected output:**
```
Release "velero" does not exist. Installing it now.
NAME: velero
LAST DEPLOYED: Thu Dec  4 10:30:00 2025
NAMESPACE: velero
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

**🔍 Configuration Breakdown:**

| Parameter | Value | Why? |
|-----------|-------|------|
| `s3ForcePathStyle=true` | Enabled | Required for MinIO (uses path-based URLs) |
| `uploaderType=kopia` | kopia | Modern, faster alternative to Restic |
| `defaultSnapshotMoveData=true` | Enabled | Moves snapshot data to object storage |
| `features=EnableCSI` | Enabled | Integrates with CSI drivers for volume snapshots |
| `deployNodeAgent=true` | Enabled | DaemonSet for file system backups |
| `checksumAlgorithm=""` | Empty | Avoids checksum validation issues with MinIO |

### Step 5: Verify Velero Installation

```bash
# Check Velero deployment
kubectl get deployment -n velero

# Expected output:
# NAME     READY   UP-TO-DATE   AVAILABLE   AGE
# velero   1/1     1            1           30s

# Check Velero node agent (runs on all nodes)
kubectl get daemonset -n velero

# Expected output:
# NAME         DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
# node-agent   3         3         3       3            3           <none>          30s

# Check Velero pods
kubectl get pods -n velero
```

**Expected output:**
```
NAME                      READY   STATUS    RESTARTS   AGE
velero-6c8d7b5b5d-abc12   1/1     Running   0          1m
node-agent-xyz45          1/1     Running   0          1m
node-agent-def67          1/1     Running   0          1m
node-agent-ghi89          1/1     Running   0          1m
```

### Step 6: Verify Backup Storage Location

```bash
# Check BSL status
kubectl get backupstoragelocation -n velero

# Expected output:
# NAME      PHASE       LAST VALIDATED   AGE   DEFAULT
# default   Available   10s              1m    true

# Get detailed BSL information
kubectl describe backupstoragelocation default -n velero
```

**Expected output:**
```
Name:         default
Namespace:    velero
Labels:       <none>
Annotations:  <none>
API Version:  velero.io/v1
Kind:         BackupStorageLocation
Spec:
  Config:
    Region:            us-east-1
    S3 Force Path Style: true
    S3 Url:            https://10.14.183.240:9000
    checksumAlgorithm: 
  Object Storage:
    Bucket:  backup-storage
  Provider:  aws
Status:
  Phase:          Available
  Last Validated Time:  2025-12-04T10:31:00Z
```

---

## 🔧 Part 3: Configuring CSI Integration

For clusters using CSI drivers (like Mayastor, AWS EBS, etc.), we need to configure VolumeSnapshotClass.

### Step 7: Create CSI Driver Configuration (Mayastor Example)

```bash
# Create CSI Driver resource
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: CSIDriver
metadata:
  name: io.openebs.csi-mayastor
spec:
  attachRequired: true
  podInfoOnMount: false
  volumeLifecycleModes:
  - Persistent
EOF
```

**Expected output:**
```
csidriver.storage.k8s.io/io.openebs.csi-mayastor created
```

### Step 8: Create VolumeSnapshotClass

```bash
# Create VolumeSnapshotClass for Velero
cat <<EOF | kubectl apply -f -
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: mayastor-snapshot-class
  labels:
    velero.io/csi-volumesnapshot-class: "true"
driver: io.openebs.csi-mayastor
deletionPolicy: Delete
parameters:
  quiesceFs: none
EOF
```

**Expected output:**
```
volumesnapshotclass.snapshot.storage.k8s.io/mayastor-snapshot-class created
```

**🔍 Key Label:**
The `velero.io/csi-volumesnapshot-class: "true"` label tells Velero to use this snapshot class for PVC backups.

### Step 9: Configure Node Agent Performance

```bash
# Create node-agent configuration for optimal performance
cat > /tmp/node-agent-config.json <<EOF
{
    "loadConcurrency": {
        "globalConfig": 24
    }
}
EOF

# Create ConfigMap
kubectl create configmap node-agent-config \
  -n velero \
  --from-file=/tmp/node-agent-config.json

# Restart node-agent pods to apply configuration
kubectl delete pods -n velero -l name=node-agent
```

**Expected output:**
```
configmap/node-agent-config created
pod "node-agent-xyz45" deleted
pod "node-agent-def67" deleted
pod "node-agent-ghi89" deleted
```

**What is `loadConcurrency`?**  
This setting allows 24 parallel file operations during backup/restore, significantly reducing time for large volumes.

---

## 💾 Part 4: Creating Your First Backup

### Step 10: Create a Test Namespace with Data

Let's create a sample application to backup:

```bash
# Create test namespace
kubectl create namespace demo-app

# Create a ConfigMap with some data
kubectl create configmap app-config \
  -n demo-app \
  --from-literal=database_url="postgresql://db.example.com:5432" \
  --from-literal=api_key="demo-key-12345"

# Create a deployment
kubectl create deployment nginx \
  -n demo-app \
  --image=nginx:latest \
  --replicas=2

# Create a service
kubectl expose deployment nginx \
  -n demo-app \
  --port=80 \
  --type=ClusterIP

# Verify resources
kubectl get all,configmap -n demo-app
```

**Expected output:**
```
NAME                         READY   STATUS    RESTARTS   AGE
pod/nginx-7c5d7c7b6d-abc12   1/1     Running   0          10s
pod/nginx-7c5d7c7b6d-def34   1/1     Running   0          10s

NAME            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/nginx   ClusterIP   10.96.123.456   <none>        80/TCP    5s

NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx   2/2     2            2           10s

NAME                               DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-7c5d7c7b6d   2         2         2       10s

NAME                         DATA   AGE
configmap/app-config         2      15s
```

### Step 11: Create a Manual Backup

```bash
# Create backup of demo-app namespace
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: demo-app-backup-$(date +%Y%m%d-%H%M%S)
  namespace: velero
  annotations:
    description: "Manual backup of demo application"
    manual-backup: "true"
spec:
  includedNamespaces:
  - demo-app
  storageLocation: default
  ttl: 240h0m0s
  snapshotVolumes: true
  snapshotMoveData: true
  includeClusterResources: true
EOF
```

**Expected output:**
```
backup.velero.io/demo-app-backup-20251204-103000 created
```

### Step 12: Monitor Backup Progress

```bash
# Watch backup status
kubectl get backups -n velero -w

# Expected progression:
# NAME                              STATUS         CREATED                         EXPIRES   STORAGE LOCATION   SELECTOR
# demo-app-backup-20251204-103000   InProgress     2025-12-04T10:30:00Z            9d        default            <none>
# demo-app-backup-20251204-103000   Completed      2025-12-04T10:30:45Z            9d        default            <none>

# Get detailed backup information
kubectl describe backup demo-app-backup-20251204-103000 -n velero
```

**Expected output:**
```
Name:         demo-app-backup-20251204-103000
Namespace:    velero
Labels:       <none>
Annotations:  description: Manual backup of demo application
              manual-backup: true
API Version:  velero.io/v1
Kind:         Backup
Spec:
  Included Namespaces:
    demo-app
  Storage Location:       default
  TTL:                    240h0m0s
  Snapshot Volumes:       true
  Snapshot Move Data:     true
Status:
  Phase:                  Completed
  Start Timestamp:        2025-12-04T10:30:00Z
  Completion Timestamp:   2025-12-04T10:30:45Z
  Expiration:             2025-12-14T10:30:00Z
  Format Version:         1.1.0
  Backup Item Operations Attempted:  0
  Backup Item Operations Completed:  0
  Backup Item Operations Failed:     0
  Progress:
    Items Backed Up:  15
    Total Items:      15
  Version:            1
Events:               <none>
```

### Step 13: Verify Backup Contents

```bash
# List all backed-up resources
kubectl get backup demo-app-backup-20251204-103000 -n velero -o jsonpath='{.status.progress}' | jq

# Check backup in MinIO (if you have MinIO client)
mc ls minio/backup-storage/backups/
```

---

## 🔄 Part 5: Performing a Restore

### Step 14: Simulate Disaster (Delete the Namespace)

```bash
# Delete the entire demo-app namespace
kubectl delete namespace demo-app

# Verify it's gone
kubectl get namespace demo-app
```

**Expected output:**
```
Error from server (NotFound): namespaces "demo-app" not found
```

### Step 15: Create a Restore

```bash
# Restore from backup
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: demo-app-restore-$(date +%Y%m%d-%H%M%S)
  namespace: velero
spec:
  backupName: demo-app-backup-20251204-103000
  includedNamespaces:
  - demo-app
  restorePVs: true
  includeClusterResources: true
EOF
```

**Expected output:**
```
restore.velero.io/demo-app-restore-20251204-104500 created
```

### Step 16: Monitor Restore Progress

```bash
# Watch restore status
kubectl get restores -n velero -w

# Expected progression:
# NAME                               STATUS         CREATED                         AGE
# demo-app-restore-20251204-104500   InProgress     2025-12-04T10:45:00Z            10s
# demo-app-restore-20251204-104500   Completed      2025-12-04T10:45:30Z            40s

# Get detailed restore information
kubectl describe restore demo-app-restore-20251204-104500 -n velero
```

**Expected output:**
```
Name:         demo-app-restore-20251204-104500
Namespace:    velero
Labels:       <none>
Annotations:  <none>
API Version:  velero.io/v1
Kind:         Restore
Spec:
  Backup Name:             demo-app-backup-20251204-103000
  Included Namespaces:
    demo-app
  Restore PVs:             true
  Include Cluster Resources: true
Status:
  Phase:                   Completed
  Start Timestamp:         2025-12-04T10:45:00Z
  Completion Timestamp:    2025-12-04T10:45:30Z
  Progress:
    Items Restored:        15
    Total Items:           15
  Warnings:                0
  Errors:                  0
Events:                    <none>
```

### Step 17: Verify Restored Resources

```bash
# Check that demo-app namespace is back
kubectl get namespace demo-app

# Verify all resources are restored
kubectl get all,configmap -n demo-app
```

**Expected output:**
```
NAME                         READY   STATUS    RESTARTS   AGE
pod/nginx-7c5d7c7b6d-abc12   1/1     Running   0          30s
pod/nginx-7c5d7c7b6d-def34   1/1     Running   0          30s

NAME            TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)   AGE
service/nginx   ClusterIP   10.96.123.456   <none>        80/TCP    30s

NAME                    READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/nginx   2/2     2            2           30s

NAME                               DESIRED   CURRENT   READY   AGE
replicaset.apps/nginx-7c5d7c7b6d   2         2         2       30s

NAME                         DATA   AGE
configmap/app-config         2      30s

# Verify ConfigMap data is intact
kubectl get configmap app-config -n demo-app -o yaml
```

**Expected ConfigMap output:**
```yaml
apiVersion: v1
data:
  api_key: demo-key-12345
  database_url: postgresql://db.example.com:5432
kind: ConfigMap
metadata:
  name: app-config
  namespace: demo-app
```

✅ **Success!** Your application has been fully restored.

---

## 🏗️ Part 6: Advanced Multi-Phase Restore

For complex environments with dependencies (like the 900-service example in the white paper), you need ordered restoration.

### Step 18: Understanding Multi-Phase Restore

Let's simulate a multi-tier application with dependencies:

```bash
# Create infrastructure namespace (storage layer)
kubectl create namespace storage-infra

# Create application namespace
kubectl create namespace production-app

# Deploy storage-infra resources
kubectl create deployment storage-controller \
  -n storage-infra \
  --image=nginx:latest

# Deploy production app that depends on storage
kubectl create deployment app-backend \
  -n production-app \
  --image=nginx:latest \
  --replicas=3
```

### Step 19: Create a Full Backup

```bash
# Backup both namespaces
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: full-backup-$(date +%Y%m%d-%H%M%S)
  namespace: velero
spec:
  includedNamespaces:
  - storage-infra
  - production-app
  storageLocation: default
  ttl: 240h0m0s
  snapshotVolumes: true
EOF
```

### Step 20: Perform Multi-Phase Restore

**Phase 1: Restore Storage Infrastructure First**

```bash
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: restore-phase1-storage-$(date +%Y%m%d-%H%M%S)
  namespace: velero
spec:
  backupName: full-backup-20251204-105000
  includedNamespaces:
  - storage-infra
  restorePVs: true
EOF
```

**Wait for Phase 1 completion:**

```bash
# Wait for storage layer to be ready
kubectl wait --for=condition=ready pod \
  -l app=storage-controller \
  -n storage-infra \
  --timeout=300s

# Expected output:
# pod/storage-controller-abc123 condition met
```

**Phase 2: Restore Applications**

```bash
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Restore
metadata:
  name: restore-phase2-apps-$(date +%Y%m%d-%H%M%S)
  namespace: velero
spec:
  backupName: full-backup-20251204-105000
  includedNamespaces:
  - production-app
  restorePVs: false
EOF
```

**Verify both phases:**

```bash
# Check all restores
kubectl get restores -n velero

# Expected output:
# NAME                                  STATUS      CREATED
# restore-phase1-storage-20251204...    Completed   2m
# restore-phase2-apps-20251204...       Completed   1m
```

---

## 📊 Part 7: Monitoring and Troubleshooting

### Step 21: Check Velero Logs

```bash
# View Velero server logs
kubectl logs deployment/velero -n velero --tail=50

# View node-agent logs (for file system operations)
kubectl logs daemonset/node-agent -n velero --tail=50
```

### Step 22: List All Backups

```bash
# List all backups
kubectl get backups -n velero

# Get backup details in JSON
kubectl get backups -n velero -o json | jq '.items[] | {name: .metadata.name, phase: .status.phase, startTime: .status.startTimestamp}'
```

**Expected output:**
```json
{
  "name": "demo-app-backup-20251204-103000",
  "phase": "Completed",
  "startTime": "2025-12-04T10:30:00Z"
}
{
  "name": "full-backup-20251204-105000",
  "phase": "Completed",
  "startTime": "2025-12-04T10:50:00Z"
}
```

### Step 23: Check Backup Storage Location Status

```bash
# Verify BSL connectivity
kubectl get backupstoragelocation -n velero

# Force BSL validation
kubectl annotate backupstoragelocation default \
  -n velero \
  velero.io/force-update=$(date +%s)

# Check validation result
kubectl get backupstoragelocation default -n velero -o jsonpath='{.status.phase}'
```

**Expected output:**
```
Available
```

### Step 24: View Backup Repositories

```bash
# List Kopia backup repositories
kubectl get backuprepositories -n velero

# Expected output:
# NAME                                    AGE
# default-demo-app-abc123                 5m
# default-production-app-def456           3m
```

---

## 🔧 Part 8: Updating Backup Storage Location

### Step 25: Update BSL Configuration

If you need to change your storage backend:

```bash
# Get current BSL
kubectl get backupstoragelocation default -n velero -o yaml > bsl-backup.yaml

# Edit BSL (change endpoint, bucket, etc.)
kubectl edit backupstoragelocation default -n velero
```

**Example BSL update:**
```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: new-backup-bucket  # Changed bucket
  config:
    region: us-east-1
    s3ForcePathStyle: "true"
    s3Url: https://new-minio.example.com:9000  # Changed endpoint
```

### Step 26: Update Velero Credentials

```bash
# Create new credentials file
cat > /tmp/new-credentials <<EOF
[default]
aws_access_key_id=new-access-key
aws_secret_access_key=new-secret-key
EOF

# Update Velero secret
kubectl create secret generic velero \
  -n velero \
  --from-file=cloud=/tmp/new-credentials \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Velero to pick up new credentials
kubectl rollout restart deployment/velero -n velero
```

---

## 📅 Part 9: Scheduling Automated Backups

### Step 27: Create a Backup Schedule

```bash
# Create daily backup schedule
cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: daily-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # 2 AM every day
  template:
    includedNamespaces:
    - demo-app
    - production-app
    storageLocation: default
    ttl: 720h0m0s  # 30 days retention
    snapshotVolumes: true
    snapshotMoveData: true
EOF
```

**Expected output:**
```
schedule.velero.io/daily-backup created
```

### Step 28: Verify Schedule

```bash
# Check schedule status
kubectl get schedules -n velero

# Expected output:
# NAME           STATUS    SCHEDULE      BACKUP TTL   LAST BACKUP   AGE
# daily-backup   Enabled   0 2 * * *     30d          n/a           10s

# View schedule details
kubectl describe schedule daily-backup -n velero
```

**Expected output:**
```
Name:         daily-backup
Namespace:    velero
Labels:       <none>
Annotations:  <none>
API Version:  velero.io/v1
Kind:         Schedule
Spec:
  Schedule:  0 2 * * *
  Template:
    Included Namespaces:
      demo-app
      production-app
    Storage Location:  default
    TTL:              720h0m0s
    Snapshot Volumes:  true
Status:
  Phase:              Enabled
  Last Backup:        <none>
Events:               <none>
```

---

## 🧪 Part 10: Testing and Validation

### Step 29: Perform a Backup Validation Test

```bash
# Create a test backup
BACKUP_NAME="validation-test-$(date +%Y%m%d-%H%M%S)"

cat <<EOF | kubectl apply -f -
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: ${BACKUP_NAME}
  namespace: velero
spec:
  includedNamespaces:
  - demo-app
  storageLocation: default
EOF

# Wait for completion
kubectl wait --for=jsonpath='{.status.phase}'=Completed \
  backup/${BACKUP_NAME} \
  -n velero \
  --timeout=300s

# Validate backup
kubectl get backup ${BACKUP_NAME} -n velero -o jsonpath='{.status.progress}'
```

**Expected output:**
```json
{"itemsBackedUp":15,"totalItems":15}
```

### Step 30: Cleanup Test Resources

```bash
# Delete test namespaces
kubectl delete namespace demo-app --wait=false
kubectl delete namespace production-app --wait=false
kubectl delete namespace storage-infra --wait=false

# Clean up old backups (optional)
kubectl delete backup validation-test-20251204-110000 -n velero

# Remove credentials file
rm /tmp/velero-credentials /tmp/new-credentials /tmp/node-agent-config.json
```

---

## 📚 Summary: Command Quick Reference

### Installation Commands
```bash
# Install Velero with Helm
helm upgrade --install velero vmware-tanzu/velero \
  --namespace velero \
  --create-namespace \
  --set-file credentials.secretContents.cloud=/tmp/velero-credentials \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.uploaderType=kopia \
  --set deployNodeAgent=true
```

### Backup Commands
```bash
# Create backup
kubectl create backup my-backup -n velero --include-namespaces demo-app

# List backups
kubectl get backups -n velero

# Describe backup
kubectl describe backup my-backup -n velero

# Delete backup
kubectl delete backup my-backup -n velero
```

### Restore Commands
```bash
# Create restore
kubectl create restore my-restore -n velero --from-backup my-backup

# List restores
kubectl get restores -n velero

# Describe restore
kubectl describe restore my-restore -n velero
```

### Monitoring Commands
```bash
# Check Velero status
kubectl get deployments,daemonsets,pods -n velero

# View Velero logs
kubectl logs deployment/velero -n velero

# Check BSL status
kubectl get backupstoragelocation -n velero

# List backup repositories
kubectl get backuprepositories -n velero
```

---

## 🎓 Key Takeaways

1. **Production Configuration**: We used `kopia` uploader, CSI integration, and parallel downloads for optimal performance

2. **Multi-Phase Restore**: Critical for complex environments—restore storage infrastructure before applications

3. **Validation at Every Step**: Always verify BSL status, pod readiness, and backup completion

4. **Automation**: Use schedules for daily backups with appropriate retention policies

5. **Monitoring**: Regularly check Velero logs and backup repository status

---

## 🚀 Next Steps

Now that you have a working Velero installation, consider:

1. **Creating a disaster recovery runbook** based on your restore procedures
2. **Implementing automated restore testing** in a staging environment
3. **Setting up monitoring alerts** for failed backups
4. **Documenting your backup and restore procedures** for your team
5. **Reviewing the [Velero White Paper](../whitepaper/velero-kubernetes-backup-whitepaper.md)** for advanced architectures

---

## 🐛 Common Issues and Solutions

### Issue 1: BSL Shows "Unavailable"

**Symptom:**
```bash
kubectl get backupstoragelocation -n velero
# NAME      PHASE         LAST VALIDATED   AGE
# default   Unavailable   1m               5m
```

**Solution:**
```bash
# Check Velero logs
kubectl logs deployment/velero -n velero | grep -i "error\|failed"

# Verify MinIO connectivity
curl -k ${MINIO_ENDPOINT}

# Check credentials
kubectl get secret velero -n velero -o jsonpath='{.data.cloud}' | base64 -d
```

### Issue 2: Backup Stuck in "InProgress"

**Symptom:**
```bash
kubectl get backup my-backup -n velero
# NAME        STATUS       CREATED
# my-backup   InProgress   10m
```

**Solution:**
```bash
# Check node-agent logs
kubectl logs daemonset/node-agent -n velero --all-containers

# Verify there's no resource exhaustion
kubectl top pods -n velero

# Check for stuck volumes
kubectl get volumesnapshots --all-namespaces
```

### Issue 3: Restore Completes but Pods Not Running

**Symptom:**
```bash
kubectl get pods -n demo-app
# NAME                    READY   STATUS    RESTARTS   AGE
# nginx-abc123            0/1     Pending   0          2m
```

**Solution:**
```bash
# Check PVC status
kubectl get pvc -n demo-app

# Verify VolumeSnapshotClass exists
kubectl get volumesnapshotclass

# Check node-agent is running
kubectl get pods -n velero -l name=node-agent
```

---

## 📖 Additional Resources

- **Official Velero Documentation**: https://velero.io/docs/
- **Kopia Documentation**: https://kopia.io/docs/
- **White Paper**: [Velero vs VMware Snapshots](../whitepaper/velero-kubernetes-backup-whitepaper.md)
- **Community Support**: https://kubernetes.slack.com (#velero)

---

**🎉 Congratulations!** You've successfully installed and configured Velero for Kubernetes backup and restore. You're now ready to protect your production workloads with confidence.

**Questions or feedback?** Let us know how this guide worked for you!
