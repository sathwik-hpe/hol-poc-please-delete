# White Paper: Velero-Based Backup and Restore for Kubernetes Clusters
## Why VMware Snapshots Fall Short for Complex Cloud-Native Environments

**Author:** Technical Documentation Team  
**Date:** January 2025  
**Version:** 1.0

---

## Executive Summary

As organizations adopt Kubernetes for running complex, microservices-based architectures at scale, traditional VM-level backup strategies like VMware snapshots prove inadequate for ensuring business continuity. This white paper examines why VMware snapshots fail to meet the needs of modern Kubernetes deployments—particularly those with 900+ interdependent services—and demonstrates how Velero, a cloud-native backup solution, provides the granular control, application-aware capabilities, and ordered restoration required for production environments.

**Key Findings:**
- VMware snapshots operate at the infrastructure level, lacking awareness of Kubernetes application dependencies and state
- Complex Kubernetes environments with strict service ordering requirements (e.g., storage before applications) cannot be reliably restored using VM snapshots
- Velero provides namespace-level granularity, custom resource awareness, and multi-phase restore workflows
- File system-level backup using Kopia ensures persistent volume data integrity independent of snapshot mechanisms
- Production implementations demonstrate 4-phase restore processes handling 900+ services with specific dependency chains

---

## Table of Contents

1. [Introduction](#introduction)
2. [The Problem with VMware Snapshots for Kubernetes](#problem-with-vmware-snapshots)
3. [Velero Architecture and Advantages](#velero-architecture)
4. [Implementation Deep Dive](#implementation-deep-dive)
5. [Backup Workflow Analysis](#backup-workflow)
6. [Restore Workflow: Four-Phase Approach](#restore-workflow)
7. [Code Walkthrough](#code-walkthrough)
8. [Best Practices and Recommendations](#best-practices)
9. [Conclusion](#conclusion)

---

## 1. Introduction

Kubernetes has revolutionized application deployment by enabling organizations to run hundreds or thousands of microservices across distributed infrastructure. However, this architectural shift introduces new challenges for disaster recovery. Traditional backup mechanisms designed for monolithic applications and VM-based infrastructure do not translate well to the dynamic, ephemeral nature of containerized workloads.

### The Scale Challenge

Modern Kubernetes platforms can host:
- **900+ microservices** across multiple namespaces
- **Complex dependency chains** (e.g., Mayastor storage must be operational before PCE UI can start)
- **Custom Resource Definitions (CRDs)** from operators like Istio, Calico, PostgreSQL (CNPG), Kafka (Strimzi)
- **Persistent data** in volumes managed by Container Storage Interface (CSI) drivers
- **Service mesh configurations** with Istio for inter-service communication
- **Operator-managed stateful applications** (Cassandra, OpenSearch, MinIO)

A single VMware snapshot of the underlying infrastructure captures none of the intricate relationships between these components.

---

## 2. The Problem with VMware Snapshots for Kubernetes

### 2.1 Infrastructure-Level Blindness

VMware snapshots operate at the hypervisor level, capturing the entire state of a virtual machine's disk. For Kubernetes, this means:

**What VMware Snapshots Capture:**
- VM disk state (OS, Kubernetes binaries, etcd database)
- Memory state (if enabled)
- Network configuration

**What VMware Snapshots Miss:**
- **Application-level dependencies**: No understanding that service A requires service B to be running first
- **Namespace ordering**: Cannot prioritize restoration of infrastructure namespaces (storage, networking) before application namespaces
- **CRD relationships**: Operators deploy CRDs that must exist before the resources they manage can be created
- **PV/PVC binding states**: Persistent Volume Claims may not rebind correctly to Persistent Volumes after restoration
- **Service mesh initialization**: Istio sidecars and control plane must be operational before application pods can communicate

### 2.2 The Ordering Problem

Consider a real-world deployment sequence:

```
1. Mayastor (storage CSI driver) must be running
   └─ Without this, PVCs cannot be provisioned or bound
2. Base operators (Istio, Calico, CNPG, Strimzi, MetalLB)
   └─ These create CRDs needed by applications
3. Infrastructure services (container registry, MinIO, OpenSearch, Cassandra)
   └─ Applications depend on these backend services
4. Application workloads
   └─ 900+ microservices with their own inter-dependencies
```

**VMware Snapshot Restore Behavior:**
- All services start simultaneously when the VM boots
- Race conditions occur as pods attempt to bind PVCs before Mayastor is ready
- Applications crash-loop waiting for CRDs that operators haven't created yet
- etcd may contain stale references to resources that no longer exist in the correct state

### 2.3 Data Consistency Issues

VMware snapshots capture a point-in-time disk state, but:
- **etcd inconsistency**: Kubernetes state in etcd may reference resources that were in-flight during the snapshot
- **PV data skew**: Persistent volumes managed by CSI drivers may have data written after the snapshot was taken
- **Operator state drift**: Operators may have reconciled resources after the snapshot, causing out-of-sync conditions

### 2.4 No Granular Recovery

VMware snapshots are all-or-nothing:
- Cannot restore a single namespace (e.g., just the application tier)
- Cannot selectively exclude problematic resources
- Cannot restore to a different cluster or cloud provider
- No migration capabilities between infrastructures

---

## 3. Velero Architecture and Advantages

Velero is an open-source Kubernetes backup and restore tool that understands Kubernetes resources natively. It addresses every limitation of VMware snapshots.

### 3.1 Core Components

**Velero Server:**
- Runs as a deployment in the `velero` namespace
- Watches Kubernetes API for backup and restore custom resources
- Orchestrates backup and restore operations

**Velero Plugins:**
- **velero-plugin-for-aws**: Provides S3-compatible object storage integration (works with MinIO)
- **CSI plugin**: Integrates with Kubernetes CSI drivers for volume snapshots

**Node Agent (formerly Restic/Kopia):**
- DaemonSet running on every node
- Performs file system-level backup of persistent volumes
- Uses **Kopia** for incremental, encrypted backups to object storage

**Backup Storage Location (BSL):**
- S3-compatible object storage (MinIO in this implementation)
- Stores backup metadata and volume data
- Configuration includes endpoint, bucket, credentials, region

### 3.2 Key Advantages Over VMware Snapshots

| Capability | VMware Snapshots | Velero |
|------------|------------------|--------|
| **Kubernetes Resource Awareness** | ❌ No | ✅ Yes - understands Pods, Services, ConfigMaps, CRDs |
| **Namespace-Level Granularity** | ❌ VM-level only | ✅ Include/exclude specific namespaces |
| **Resource Filtering** | ❌ All or nothing | ✅ Include/exclude by resource type, label selector |
| **Ordered Restoration** | ❌ No control | ✅ Multi-phase restore with dependency handling |
| **Persistent Volume Handling** | ❌ Block-level capture | ✅ File system backup with Kopia + CSI snapshots |
| **CRD Support** | ❌ No awareness | ✅ Backs up CRDs and their instances |
| **Cluster Migration** | ❌ Same infrastructure | ✅ Restore to different clusters/clouds |
| **Selective Recovery** | ❌ Cannot restore subsets | ✅ Restore individual namespaces or resources |
| **Application Consistency** | ❌ No hooks | ✅ Pre/post backup hooks for quiescing |
| **Operator Integration** | ❌ Blind to operators | ✅ Respects operator-managed resources |

### 3.3 Velero Backup Flow

```
1. User creates Backup CR → Velero server watches API
2. Pre-backup hooks execute → Labels resources to exclude
3. Kopia file system backup → Backs up /var/onprem/ directory
4. Velero collects Kubernetes resources → Serializes to JSON
5. CSI snapshots triggered → VolumeSnapshotClass creates snapshots
6. Data uploaded to BSL → S3-compatible object storage
7. Backup CR status updated → Completed/Failed
```

### 3.4 Velero Restore Flow (High-Level)

```
1. User creates Restore CR → Velero server initiates restore
2. File system restore → Kopia restores /var/onprem/ first
3. Pre-restore cleanup hooks → Remove labels, prepare cluster
4. Phase 1: Storage layer (Mayastor) → Ensure CSI driver operational
5. Phase 2: PVC restoration → Bind persistent volumes
6. Phase 3: Base infrastructure → Operators, service mesh, databases
7. Phase 4: Applications → Remaining workloads
8. Post-restore hooks → Restart services, send notifications
```

---

## 4. Implementation Deep Dive

This section analyzes the production implementation from the HPE GreenLake Cloud Platform (GLCP) on-premises deployment.

### 4.1 Velero Installation Script Analysis

The `run_install_velero.sh` script demonstrates production-grade Velero deployment:

#### Credential Management
```bash
# Temporary file for credentials (not a Kubernetes secret)
# AWS EC2 IMDS error occurs when using secrets directly
CREDENTIALS_FILE=$(mktemp)

# Extract from verified config or existing BSL
if [ -f "$CONFIG_FILE_PATH" ]; then
  AWS_ACCESS_KEY_ID=$(jq -r '...' "$CONFIG_FILE_PATH" | base64 --decode)
  AWS_SECRET_ACCESS_KEY=$(jq -r '...' "$CONFIG_FILE_PATH" | base64 --decode)
  echo "[default]" > "$CREDENTIALS_FILE"
  echo "aws_access_key_id=$AWS_ACCESS_KEY_ID" >> "$CREDENTIALS_FILE"
  echo "aws_secret_access_key=$AWS_SECRET_ACCESS_KEY" >> "$CREDENTIALS_FILE"
fi
```

**Why This Matters:**
- Credentials are sourced from a verified configuration file or existing Backup Storage Location
- Base64 decoding ensures proper secret handling
- AWS credential format compatible with S3-compatible MinIO

#### Helm Installation with Critical Configurations

```bash
helm upgrade --install velero $ARTIFACTS_DIR/$artifact \
  --set-file credentials.secretContents.cloud=$CREDENTIALS_FILE \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket="$BUCKET_NAME" \
  --set configuration.backupStorageLocation[0].config.s3Url=$URL \
  --set configuration.backupStorageLocation[0].config.s3ForcePathStyle=true \
  --set initContainers[0].name=velero-plugin-for-aws \
  --set initContainers[0].image=velero/velero-plugin-for-aws:v1.10.0 \
  --set deployNodeAgent=true \
  --set configuration.uploaderType=kopia \
  --set configuration.defaultSnapshotMoveData=true \
  --set configuration.features=EnableCSI \
  --set snapshotsEnabled=true
```

**Key Configuration Decisions:**

1. **`s3ForcePathStyle=true`**: Required for MinIO compatibility (path-based S3 URLs rather than subdomain)
2. **`uploaderType=kopia`**: Modern replacement for Restic, better performance for large volumes
3. **`defaultSnapshotMoveData=true`**: Moves CSI snapshot data to object storage (not just metadata)
4. **`features=EnableCSI`**: Enables CSI driver integration for volume snapshots
5. **`deployNodeAgent=true`**: DaemonSet for file system backups on every node

#### CSI Driver and VolumeSnapshotClass Creation

```bash
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

**Why This Matters:**
- `velero.io/csi-volumesnapshot-class: "true"` label tells Velero to use this snapshot class
- `quiesceFs: none` parameter avoids filesystem quiescing (handled at application level)
- Mayastor CSI driver enables high-performance local storage with replication

#### Node Agent Performance Tuning

```bash
cat > /tmp/node-agent-config.json << 'EOF'
{
    "loadConcurrency": {
        "globalConfig": 24
    }
}
EOF

kubectl create configmap -n velero node-agent-config \
  --from-file=/tmp/node-agent-config.json
```

**Performance Consideration:**
- `loadConcurrency: 24` allows 24 parallel file operations during restore
- Critical for reducing restore time when dealing with thousands of files

---

### 4.2 Backup Storage Location (BSL) Configuration

The BSL defines where backups are stored and how Velero accesses them.

**Production BSL Specification:**
```go
backupStorageLocation.Spec.Provider = "aws"  // S3-compatible
backupStorageLocation.Spec.ObjectStorage.Bucket = minioInfo.BucketName
backupStorageLocation.Spec.AccessMode = velerov1api.BackupStorageLocationAccessModeReadWrite
backupStorageLocation.Spec.Config = map[string]string{
    "s3Url":             minioInfo.Endpoint,  // e.g., "https://10.14.183.240:9000"
    "s3ForcePathStyle":  "true",
    "region":            "us-east-1",
    "credentialsFile":   "/credentials/cloud",
    "checksumAlgorithm": "",  // Empty to avoid checksum validation issues
}
```

**Validation Process:**
- Secret creation/update with credentials
- BSL update triggers Velero to validate connectivity
- Kopia repository initialization ensures data can be written
- ConfigMap flag `kopia-repo-created` tracks initialization success

---

## 5. Backup Workflow Analysis

The backup process involves three critical phases that VMware snapshots cannot replicate.

### 5.1 Pre-Backup Phase: File System Backup with Kopia

```go
// From handlers.go - CreateBackup function
err = s.KopiaBackup(backupCtx, s.llK8sClient)
if err != nil {
    log.Errorf("Failed to complete kopia backup: %v", err)
    // Create a failed backup object
    return
}
log.Info("file system backup using kopia completed successfully")
```

**What Happens:**
- Kopia backs up `/var/onprem/` directory containing configuration, secrets, certificates
- This data lives outside Kubernetes and must be captured separately
- Incremental backups reduce storage and bandwidth requirements
- Encrypted during transfer and at rest in S3 storage

**Why This Can't Be Done with VMware Snapshots:**
- VMware captures the entire VM disk, not just application data
- No incremental backup capability (full disk snapshot every time)
- Cannot exclude OS and system files to optimize storage

### 5.2 Labeling Phase: Pre-Backup Hook

```go
log.Info("Running backup pre-hook script")
stdout, stderr, scriptErr := executescripts.RunScriptWithTimeout(backupCtx, backupScriptPath, log)
if scriptErr != nil {
    log.Errorf("Labeling failed: %v", scriptErr)
    // Create a failed backup object
    return
}
```

**Purpose:**
- Adds `excluderestore: true` labels to resources that should not be restored (e.g., dynamically generated secrets)
- Ensures consistency by excluding ephemeral resources
- Application-specific quiescing if needed

**VMware Limitation:**
- No equivalent mechanism to tag specific Kubernetes resources for exclusion
- Snapshots capture everything indiscriminately

### 5.3 Velero Backup Creation

```go
enable := true
backupSpec := velerov1api.BackupSpec{
    StorageLocation:         backupStorageLocationName,
    TTL:                     metav1.Duration{Duration: backupTTL},
    SnapshotVolumes:         &enable,
    SnapshotMoveData:        &enable,  // Moves CSI snapshot data to object storage
    IncludeClusterResources: &enable,
    UploaderConfig:          &uploaderConfig,
    ExcludedNamespaces:      []string{"velero"},  // Don't backup Velero itself
}
```

**Key Parameters:**
- **`SnapshotVolumes`**: Creates CSI VolumeSnapshots for PVCs
- **`SnapshotMoveData`**: Moves snapshot data to BSL (not just metadata)
- **`IncludeClusterResources`**: Backs up cluster-scoped resources (CRDs, ClusterRoles)
- **`ExcludedNamespaces`**: Prevents circular dependency (don't backup Velero namespace)

**Backup Contents:**
- All Kubernetes resources (Deployments, StatefulSets, Services, ConfigMaps, Secrets)
- Custom Resources managed by operators
- Persistent Volume Claims and their associated snapshot data
- Cluster-scoped resources needed for restoration

---

## 6. Restore Workflow: Four-Phase Approach

The production restore implementation demonstrates why Kubernetes backups require intelligent orchestration.

### 6.1 Pre-Restore Phase: File System Restore

```go
err = s.RestoreKopiaBackup(restoreCtx, s.llK8sClient, req.BackupName, veleroClient)
if err != nil {
    log.Errorf("failed to restore the kopia snapshots, marking restore as failed %v", err)
    createErr := CreateFailedRestoreObject(restoreCtx, backupName, "file-system-backup-failed", veleroClient.VeleroV1(), log)
    return
}
log.Infof("file system restore using kopia completed successfully for backup %v", backupName)
```

**Why This Comes First:**
- `/var/onprem/` contains configurations, certificates, and secrets needed by Kubernetes components
- Must be in place before any Kubernetes resources are restored
- Example: TLS certificates for Istio, trust chains for MinIO

### 6.2 Pre-Restore Hook: Cleanup Script

```go
log.Info("Running pre-restore script")
stdout, stderr, prehookErr := executescripts.RunScriptWithTimeout(restoreCtx, restoreScriptPath, log)
if prehookErr != nil {
    log.Errorf("Cleanup failed: %v", prehookErr)
    createRestoreErr := CreateFailedRestoreObject(restoreCtx, backupName, "prehook-failed", veleroClient.VeleroV1(), log)
    return
}
```

**Purpose:**
- Removes `excluderestore: true` labels from resources
- Cleans up any conflicting resources that may exist
- Prepares cluster state for restoration

### 6.3 Phase 1: Mayastor Storage Layer Restoration

```go
restore1 := velerov1api.Restore{
    Spec: velerov1api.RestoreSpec{
        BackupName:              backupName,
        IncludedNamespaces:      []string{"mayastor"},
        ExcludedResources:       []string{"pods", "ippools.crd.projectcalico.org", "ipamblocks.crd.projectcalico.org", "persistentvolumeclaims"},
        ExistingResourcePolicy:  velerov1api.PolicyTypeUpdate,
        RestorePVs:              &enableFalse,  // Don't restore PVs yet
        IncludeClusterResources: &enableFalse,
        PreserveNodePorts:       &enableTrue,
        LabelSelector: &metav1.LabelSelector{
            MatchExpressions: []metav1.LabelSelectorRequirement{
                {Key: "excluderestore", Operator: "NotIn", Values: []string{"true"}},
            },
        },
    },
}
```

**Why Mayastor First:**
- Mayastor is the CSI storage driver providing persistent volumes
- All PVCs depend on Mayastor being operational
- Restoring PVCs before Mayastor results in `Pending` state indefinitely

**Validation:**
```go
podsReadyErr := waitForPodsReady(restoreCtx, k8sClient, []string{"mayastor"}, "app=agent-core", maxPingTries, initialPingRetryDelay, maxPingRetryDelay, log)
if podsReadyErr != nil {
    log.Errorf("Failed to wait for pod with label app=agent-core in namespace mayastor to be ready: %v", err)
    // Create a failed restore object with FailureReason: "Mayastor Pods didn't come-up"
    return
}
```

- Waits for `app=agent-core` pod (Mayastor control plane) to be `Ready`
- Uses exponential backoff with configurable retry limits
- If Mayastor fails, entire restore is aborted with clear error message

### 6.4 Phase 2: Persistent Volume Claims (PVCs) Restoration

```go
restore2 := velerov1api.Restore{
    Spec: velerov1api.RestoreSpec{
        BackupName:              backupName,
        ExcludedNamespaces:      []string{"mayastor", "openebs-nfs", "backup-minio"},
        IncludedResources:       []string{"persistentvolumeclaims"},  // Only PVCs
        ExistingResourcePolicy:  velerov1api.PolicyTypeUpdate,
        RestorePVs:              &enableTrue,  // Now restore PVs
        IncludeClusterResources: &enableFalse,
        UploaderConfig:          &velerov1api.UploaderConfigForRestore{ParallelFilesDownload: concurrentDownloads},
        LabelSelector: &metav1.LabelSelector{
            MatchExpressions: []metav1.LabelSelectorRequirement{
                {Key: "excluderestore", Operator: "NotIn", Values: []string{"true"}},
            },
        },
    },
}
```

**Why PVCs Second:**
- Mayastor is now running, so PVCs can be dynamically provisioned
- `RestorePVs: true` triggers Kopia to restore volume data from BSL
- `ParallelFilesDownload: 24` speeds up restoration of large volumes

**CSI Integration:**
- Velero detects VolumeSnapshots associated with PVCs
- Kopia downloads snapshot data from S3 storage
- CSI driver provisions PVs and binds them to restored PVCs

### 6.5 Phase 3: Base Infrastructure and Operators

```go
// Dynamically exclude operator-specific CRDs
cmdBase := exec.CommandContext(restoreCtx, "sh", "-c", 
    "kubectl get crd --no-headers -o custom-columns=NAME:.metadata.name | grep -E 'istio|calico|cnpg|k8ssandra|strimzi|opster|metallb|external-secrets|openebs|velero'")
outputBase, cmdErr := cmdBase.Output()
for _, line := range strings.Split(strings.TrimSpace(string(outputBase)), "\n") {
    if line != "" {
        excludedCRDsBase = append(excludedCRDsBase, strings.TrimSpace(line))
    }
}
excludedCRDsBase = append(excludedCRDsBase, "pods", "persistentvolumeclaims")

restore3 := velerov1api.Restore{
    Spec: velerov1api.RestoreSpec{
        BackupName:              backupName,
        IncludedNamespaces:      []string{"base", "container-registry", "istio-operator", "istio-system", "cassandra", "cnpg-system", "kafka-operator", "metallb-system", "minio-operator", "opensearch"},
        ExcludedResources:       excludedCRDsBase,
        ExistingResourcePolicy:  velerov1api.PolicyTypeUpdate,
        RestorePVs:              &enableFalse,  // PVCs already restored
        IncludeClusterResources: &enableTrue,   // Restore CRDs
        PreserveNodePorts:       &enableTrue,
    },
}
```

**Why Base Infrastructure Third:**
- Operators (Istio, Calico, CNPG, Strimzi, MetalLB) create CRDs
- Applications in Phase 4 depend on these CRDs existing
- Excludes operator-managed CRDs that will be recreated by the operators themselves

**Included Namespaces:**
- `base`: Core platform services
- `container-registry`: Private container image registry
- `istio-operator`, `istio-system`: Service mesh for inter-service communication
- `cassandra`, `opensearch`: Stateful data stores
- `cnpg-system`: CloudNativePG operator for PostgreSQL
- `kafka-operator`: Strimzi operator for Apache Kafka
- `metallb-system`: LoadBalancer service implementation
- `minio-operator`: Object storage operator

**Validation:**
```go
includedNamespaces := []string{"base", "container-registry", "istio-operator", "istio-system", "cassandra", "cnpg-system", "kafka-operator", "metallb-system", "minio-operator", "opensearch"}
podsReadrErr := waitForPodsReady(restoreCtx, k8sClient, includedNamespaces, "", maxPingTries, initialPingRetryDelay, maxPingRetryDelay, log)
if podsReadrErr != nil {
    // Create a failed restore object with FailureReason: "Operator Pods didn't come-up"
    return
}
```

- Waits for all pods in infrastructure namespaces to reach `Ready` state
- Ensures operators are fully functional before proceeding

### 6.6 Phase 4: Remaining Application Workloads

```go
// Dynamically exclude management CRDs
cmdRemaining := exec.CommandContext(restoreCtx, "sh", "-c", 
    "kubectl get crd --no-headers -o custom-columns=NAME:.metadata.name | grep -E 'calico|openebs|velero'")
outputRemaining, cmdErr := cmdRemaining.Output()
for _, line := range strings.Split(strings.TrimSpace(string(outputRemaining)), "\n") {
    if line != "" {
        excludedCRDsRemaining = append(excludedCRDsRemaining, strings.TrimSpace(line))
    }
}

restore4 := velerov1api.Restore{
    Spec: velerov1api.RestoreSpec{
        BackupName:              backupName,
        ExcludedNamespaces:      []string{"mayastor", "base", "container-registry", "kube-system", "kube-public", "kube-node-lease", "velero", "istio-operator", "cassandra", "cnpg-system", "kafka-operator", "metallb-system", "minio-operator", "opensearch", "backup-minio"},
        ExcludedResources:       excludedCRDsRemaining,
        ExistingResourcePolicy:  velerov1api.PolicyTypeUpdate,
        RestorePVs:              &enableFalse,
        IncludeClusterResources: &enableTrue,
        PreserveNodePorts:       &enableTrue,
    },
}
```

**Why Applications Last:**
- All infrastructure dependencies are now satisfied
- Storage (Mayastor), service mesh (Istio), databases (Cassandra, OpenSearch) are operational
- Applications can start successfully without crash-looping

**Exclusions:**
- Infrastructure namespaces already restored in Phases 1-3
- Kubernetes system namespaces (`kube-system`, `kube-public`, `kube-node-lease`)
- Velero itself (`velero` namespace)
- Backup storage namespace (`backup-minio`)

### 6.7 Post-Restore Phase: NFS Recreation and Service Restart

```go
stdout, stderr, recreateNfsError := executescripts.RunScriptWithTimeout(restoreCtx, recreateNfsPath, log)
if recreateNfsError != nil {
    log.Errorf("NFS Recreation failed: %v", recreateNfsError)
    createRestoreErr := CreateFailedRestoreObject(restoreCtx, backupName, "nfs-recreation-failed", veleroClient.VeleroV1(), log)
    return
}

restorePostHooks(context.WithoutCancel(restoreCtx), restore4Name, veleroClient, s.llK8sClient, s.cfg, log)
```

**Post-Restore Hooks:**
- Recreates NFS exports for shared storage
- Restarts services that need to re-establish connections
- Sends notification of restore completion
- Updates monitoring/alerting systems

---

## 7. Code Walkthrough

### 7.1 Backup Creation API Handler

The `CreateBackup` function in `handlers.go` demonstrates production-grade error handling and orchestration.

**Key Implementation Details:**

1. **Pre-Flight Validation:**
```go
operationCurrentlyRunning, err := s.checkIfVeleroOperationIsCurrentlyRunning(ctx, veleroClient.VeleroV1())
if operationCurrentlyRunning {
    log.Errorf("Another backup, restore, or delete operation is already running")
    return CreateBackup409JSONResponse(s.GetReqID(ctx), ErrOperationRunning), nil
}
```
- Prevents concurrent operations that could corrupt backups
- Uses double-checked locking pattern with mutex for thread safety

2. **Timeout Handling:**
```go
backupCtx, backupCancel := context.WithTimeout(context.Background(), backupOperationTimeout)
defer backupCancel()
defer func() {
    if errors.Is(backupCtx.Err(), context.DeadlineExceeded) {
        log.Errorf("Backup operation timed out")
        // Create a failed backup object
    }
    s.progressStatus.SetProgress(stateNone)
}()
```
- Ensures operations don't hang indefinitely
- Creates a failed Backup CR if timeout occurs for auditability

3. **Asynchronous Execution:**
```go
routines.SafeGo(log, func() {
    // Backup logic runs in goroutine
    // Main request returns 202 Accepted immediately
})
return snapshot_mgr.CreateBackup202Response{}, nil
```
- Returns HTTP 202 (Accepted) immediately
- Long-running backup executes asynchronously
- Client polls `/backups` endpoint for status updates

### 7.2 Restore Creation API Handler

The `RestoreBackup` function demonstrates the complexity of production restore workflows.

**Key Implementation Details:**

1. **Backup Validation:**
```go
backup, err := veleroClient.VeleroV1().Backups(veleroNamespace).Get(ctx, backupName, metav1.GetOptions{})
if backup.Status.Phase != velerov1api.BackupPhaseCompleted {
    msg := "Invalid restore request. Backup must be in Completed phase."
    return RestoreBackup400JSONResponse(s.GetReqID(ctx), msg), nil
}
```
- Ensures only successful backups can be restored
- Prevents restoration from partial or failed backups

2. **Service Quiescing:**
```go
stopServiceErr := s.RunStopServicesPlaybook(restoreCtx, s.llK8sClient)
if stopServiceErr != nil {
    log.Errorf("Failed to execute restart_services playbook: %v", stopServiceErr)
    createErr := CreateFailedRestoreObject(restoreCtx, backupName, "autofs.service stop failed", veleroClient.VeleroV1(), log)
    return
}
```
- Stops services that might interfere with restoration (e.g., autofs for NFS mounts)
- Ensures clean cluster state before restore begins

3. **Error Recovery Context:**
```go
cleanupBaseCtx := context.Background()
restoreCtx, restoreCancel := context.WithTimeout(context.Background(), restoreOperationTimeout)
defer restoreCancel()
defer func() {
    if errors.Is(restoreCtx.Err(), context.DeadlineExceeded) {
        log.Errorf("Restore operation timed out, creating failed restore object")
        cleanupCtx, cleanupCancel := context.WithTimeout(cleanupBaseCtx, restoreErrTimeout)
        defer cleanupCancel()
        createErr := CreateFailedRestoreObject(cleanupCtx, backupName, "restore-operation-timeout", veleroClient.VeleroV1(), log)
    }
    s.progressStatus.SetProgress(stateNone)
}()
```
- Separate context for cleanup operations to avoid cancellation cascades
- Ensures failure is recorded even if main context times out

### 7.3 Backup Storage Location Management

The `SetBackupStorageLocation` function shows how dynamic BSL configuration is handled.

**Key Implementation Details:**

1. **Validation with MinIO Connectivity Check:**
```go
err := validateMinioInfo(req.Body)
if err != nil {
    msg := fmt.Sprintf("Invalid inputs provided: %v", err)
    return SetBackupStorageLocation400JSONResponse(s.GetReqID(ctx), msg), nil
}
```
- Validates endpoint URL format, credentials, bucket name
- Tests connectivity to MinIO before updating BSL

2. **Secret Management:**
```go
err = createOrUpdateSecret(ctx, k8sClient, req.Body)
if err != nil {
    msg := "k8s secret creation or update failed"
    return SetBackupStorageLocation500JSONResponse(s.GetReqID(ctx), msg), nil
}
```
- Creates or updates `velero` secret in `velero` namespace
- Contains AWS-format credentials for S3 compatibility

3. **Backup Repository Cleanup:**
```go
err = veleroClient.VeleroV1().BackupRepositories(veleroNamespace).DeleteCollection(ctx, metav1.DeleteOptions{}, metav1.ListOptions{})
if err != nil {
    msg := "failed to delete old backup repositories"
    return SetBackupStorageLocation500JSONResponse(s.GetReqID(ctx), msg), nil
}
```
- Deletes old Kopia repositories when BSL changes
- Ensures fresh repository initialization with new storage location

4. **Kopia Repository Initialization:**
```go
s.EnsureKopiaRepoExists(ctx, k8sClient, &KopiaRepoConfig{
    Bucketname: req.Body.BucketName,
    Endpoint:   req.Body.Endpoint,
    AccessKey:  req.Body.AccessKey,
    SecretKey:  req.Body.SecretKey,
    Region:     req.Body.Region,
})
```
- Asynchronously initializes Kopia repository in new S3 bucket
- Creates test upload to verify write permissions
- Sets ConfigMap flag `kopia-repo-created: true` upon success

---

## 8. Best Practices and Recommendations

### 8.1 Backup Strategy

**Frequency:**
- **Daily automated backups** for production environments
- **Pre-change backups** before major updates or upgrades
- **On-demand backups** before risky operations

**Retention:**
```go
TTL: metav1.Duration{Duration: backupTTL}  // e.g., 240 hours (10 days)
```
- Balance retention period with storage costs
- Compliance requirements may dictate minimum retention

**Backup Naming Convention:**
```
{environment}-{timestamp}-{type}
prod-20250115-1430-manual
staging-20250115-0200-scheduled
```

### 8.2 Restore Strategy

**Testing:**
- **Restore drills** on non-production clusters monthly
- **Automated validation** of restore success (check pod readiness, service health)
- **Documentation** of restore procedures with runbooks

**Disaster Recovery Planning:**
- **RTO (Recovery Time Objective)**: Plan for 4-phase restore duration
  - Kopia file system restore: ~30 minutes (depends on data size)
  - Phase 1 (Mayastor): ~5 minutes
  - Phase 2 (PVCs): ~45 minutes (depends on volume data size)
  - Phase 3 (Infrastructure): ~15 minutes
  - Phase 4 (Applications): ~30 minutes
  - **Total: ~2 hours for 900-service deployment**
- **RPO (Recovery Point Objective)**: Daily backups provide 24-hour RPO

### 8.3 Storage Considerations

**S3/MinIO Configuration:**
- **Bucket lifecycle policies**: Transition old backups to cheaper storage tiers
- **Versioning enabled**: Protects against accidental deletion
- **Encryption at rest**: Enable S3 server-side encryption
- **Replication**: Replicate backups to secondary region/datacenter

**Kopia Performance Tuning:**
```json
{
    "loadConcurrency": {
        "globalConfig": 24
    }
}
```
- Adjust `loadConcurrency` based on available CPU/memory
- Monitor Kopia pod resource usage during backups

### 8.4 Monitoring and Alerting

**Backup Success Tracking:**
- Alert if no successful backup in 24 hours
- Track backup duration trends (increasing duration may indicate problems)
- Monitor BSL connectivity status

**Restore Validation:**
- Automated post-restore smoke tests
- Check critical service availability after restore
- Validate data integrity (e.g., database query results)

### 8.5 Security Best Practices

**Credential Management:**
- **Rotate S3 credentials** regularly (quarterly minimum)
- **Principle of least privilege**: Grant Velero only necessary S3 permissions
- **Audit backup access**: Monitor who initiates backups/restores

**Backup Encryption:**
- Enable S3 server-side encryption (SSE-S3 or SSE-KMS)
- Kopia provides client-side encryption before upload
- Protect backup credentials with Kubernetes RBAC

### 8.6 Label Selector Strategy

**Exclude Problematic Resources:**
```go
LabelSelector: &metav1.LabelSelector{
    MatchExpressions: []metav1.LabelSelectorRequirement{
        {Key: "excluderestore", Operator: "NotIn", Values: []string{"true"}},
    },
}
```

**Use Cases for `excluderestore: true`:**
- Dynamically generated secrets (e.g., Istio certificates)
- Ephemeral pods (jobs that should not be restored)
- Test/debug resources in production namespaces

### 8.7 Upgrade Considerations

**Velero Version Upgrades:**
- Test upgrade on non-production cluster first
- Verify backup compatibility across versions
- Review Velero release notes for breaking changes

**Kubernetes Cluster Upgrades:**
- Create backup before upgrading Kubernetes version
- Validate restore to new Kubernetes version in test environment
- Ensure CRD API versions are compatible

---

## 9. Conclusion

VMware snapshots, while suitable for traditional VM-based workloads, fundamentally lack the application awareness and granular control required for complex Kubernetes environments. As this white paper demonstrates through production implementation analysis, Velero provides:

### Key Takeaways

1. **Application-Aware Backups**: Velero understands Kubernetes resources, CRDs, and dependencies—something VMware snapshots cannot provide.

2. **Ordered Restoration**: The four-phase restore process ensures storage (Mayastor) is operational before PVCs, infrastructure operators are running before applications, and all dependencies are satisfied.

3. **Granular Control**: Namespace-level inclusion/exclusion, resource type filtering, and label selectors enable precise backup and restore operations.

4. **File System Backup Integration**: Kopia provides efficient, incremental, encrypted backups of persistent volumes and critical file system data.

5. **Production-Grade Reliability**: Double-checked locking, timeout handling, retry logic with exponential backoff, and comprehensive error logging ensure robustness.

6. **Portability**: Backups stored in S3-compatible object storage enable cross-cluster and cross-cloud restoration—impossible with VMware snapshots tied to specific infrastructure.

### When to Use Each Approach

| Scenario | VMware Snapshots | Velero |
|----------|------------------|--------|
| **Dev/Test VMs** | ✅ Suitable | ⚠️ Overkill |
| **Single Kubernetes Node** | ⚠️ Possible | ✅ Recommended |
| **Multi-Node Kubernetes Cluster** | ❌ Inadequate | ✅ Required |
| **900+ Microservices with Dependencies** | ❌ Will Fail | ✅ Designed For This |
| **Disaster Recovery to Different Cloud** | ❌ Not Possible | ✅ Supported |
| **Granular Namespace Restore** | ❌ Cannot Do | ✅ Native Feature |
| **Compliance/Audit Requirements** | ⚠️ Limited Metadata | ✅ Full Resource Tracking |

### The Business Case for Velero

**Cost of Failure:**
- VMware snapshot restore of 900-service Kubernetes cluster: **High probability of multi-day outage** due to PVC binding failures, operator race conditions, and service dependency issues
- Manual intervention required to untangle dependencies: **Significant engineering time**

**Cost of Success:**
- Velero implementation: **1-2 days initial setup**
- Automated daily backups with 4-phase restore: **~2-hour RTO for full cluster recovery**
- No manual intervention required: **Zero additional engineering time**

For organizations running production Kubernetes workloads at scale, Velero is not optional—it's essential infrastructure. The production implementation analyzed in this white paper successfully manages backups and restores for a 900-service deployment, demonstrating real-world viability beyond proof-of-concept scenarios.

---

## Appendix A: Quick Reference Commands

### Trigger Manual Backup
```bash
curl -X POST https://<platform-url>/v1/internal/backups \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description": "Pre-upgrade backup"}'
```

### Check Backup Status
```bash
kubectl get backups -n velero
kubectl describe backup <backup-name> -n velero
```

### Trigger Restore
```bash
curl -X POST https://<platform-url>/v1/internal/backups/<backup-name>/restore \
  -H "Authorization: Bearer $TOKEN"
```

### Check Restore Status
```bash
kubectl get restores -n velero
kubectl describe restore <restore-name> -n velero
```

### Validate Backup Storage Location
```bash
kubectl get backupstoragelocation -n velero default -o yaml
```

### Check Kopia Repository Status
```bash
kubectl get backuprepositories -n velero
```

---

## Appendix B: Troubleshooting Guide

### Backup Stuck in InProgress
**Symptom:** Backup remains in `InProgress` phase for hours  
**Possible Causes:**
- Node agent pod crash-looping
- S3 connectivity issues
- Kopia upload bandwidth exhaustion

**Resolution:**
```bash
kubectl logs -n velero deployment/velero
kubectl logs -n velero daemonset/node-agent
kubectl describe backupstoragelocation -n velero default
```

### Restore Fails at Phase 1 (Mayastor)
**Symptom:** `Mayastor Pods didn't come-up` failure reason  
**Possible Causes:**
- Insufficient node resources
- Mayastor configuration corruption
- PV data loss

**Resolution:**
```bash
kubectl get pods -n mayastor
kubectl logs -n mayastor -l app=agent-core
kubectl get persistentvolumes | grep mayastor
```

### PVC Stuck in Pending After Restore
**Symptom:** PVCs not binding to restored PVs  
**Possible Causes:**
- Mayastor CSI driver not ready (should be caught in Phase 1 validation)
- VolumeSnapshotClass missing `velero.io/csi-volumesnapshot-class: true` label
- Kopia data restore incomplete

**Resolution:**
```bash
kubectl get volumesnapshotclass mayastor-snapshot-class -o yaml
kubectl get backuprepositories -n velero
kubectl logs -n velero daemonset/node-agent -c node-agent
```

---

## Appendix C: Additional Resources

- **Velero Documentation:** https://velero.io/docs/
- **Kopia Documentation:** https://kopia.io/docs/
- **Mayastor (OpenEBS) Documentation:** https://openebs.io/docs/
- **CSI Specification:** https://github.com/container-storage-interface/spec

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial publication |

**Feedback and Contributions:**  
For questions or suggestions regarding this white paper, please contact the Technical Documentation Team.

---

*This white paper is based on production implementations of Velero in HPE GreenLake Cloud Platform (GLCP) on-premises deployments. Code examples and configurations are derived from real-world usage managing 900+ microservices across multiple Kubernetes namespaces.*
