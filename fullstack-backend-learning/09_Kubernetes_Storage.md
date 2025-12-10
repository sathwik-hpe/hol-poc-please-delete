# Module 09: Kubernetes Storage 💾

## Master Persistent Volumes, StorageClasses & Stateful Storage

**Duration:** 3-4 hours  
**Prerequisites:** Module 06-08 (K8s Architecture, Workloads, Networking)  
**Outcome:** Implement persistent storage for stateful applications

---

## 📚 Table of Contents

1. [Storage Challenges in Kubernetes](#storage-challenges-in-kubernetes)
2. [Volumes - Pod Storage](#volumes---pod-storage)
3. [PersistentVolumes (PV)](#persistentvolumes-pv)
4. [PersistentVolumeClaims (PVC)](#persistentvolumeclaims-pvc)
5. [StorageClasses - Dynamic Provisioning](#storageclasses---dynamic-provisioning)
6. [StatefulSet Storage](#statefulset-storage)
7. [CSI - Container Storage Interface](#csi---container-storage-interface)
8. [Interview Questions](#interview-questions)
9. [Hands-On Exercise](#hands-on-exercise)

---

## Storage Challenges in Kubernetes

### Why is Storage Hard?

```
Problem 1: Pod Ephemeral
- Pod dies → Container filesystem deleted
- Need persistent storage

Problem 2: Node Failure
- Pod rescheduled to different node
- Must access same data

Problem 3: Cloud Portability
- AWS EBS, GCP PD, Azure Disk
- Need abstraction layer
```

### Kubernetes Storage Solutions

```
1. Volumes: Temporary storage (pod lifetime)
2. PersistentVolumes: Cluster-level storage resource
3. PersistentVolumeClaims: Request for storage
4. StorageClasses: Dynamic provisioning
```

---

## Volumes - Pod Storage

### emptyDir - Temporary Storage

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
  - name: app
    image: nginx
    volumeMounts:
    - name: cache-volume
      mountPath: /cache
  
  - name: sidecar
    image: busybox
    command: ["/bin/sh", "-c", "while true; do echo $(date) >> /cache/log.txt; sleep 5; done"]
    volumeMounts:
    - name: cache-volume
      mountPath: /cache
  
  volumes:
  - name: cache-volume
    emptyDir: {}  # Deleted when pod dies
```

**Use Cases:** Scratch space, cache, sharing data between containers

### hostPath - Node Storage

```yaml
volumes:
- name: host-volume
  hostPath:
    path: /data
    type: Directory  # Must exist on node
```

⚠️ **Warning:** Ties pod to specific node, security risk

### configMap & secret Volumes

```yaml
volumes:
- name: config
  configMap:
    name: app-config
- name: credentials
  secret:
    secretName: db-secret
```

---

## PersistentVolumes (PV)

### What is a PersistentVolume?

**Cluster resource** representing storage (admin provisioned or dynamically created).

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: pv-nfs
spec:
  capacity:
    storage: 10Gi
  
  accessModes:
  - ReadWriteMany
  
  persistentVolumeReclaimPolicy: Retain
  
  storageClassName: slow
  
  nfs:
    server: 192.168.1.100
    path: /exports/data
```

### Access Modes

```yaml
accessModes:
- ReadWriteOnce (RWO)   # Single node can mount read-write
- ReadOnlyMany (ROX)    # Multiple nodes can mount read-only
- ReadWriteMany (RWX)   # Multiple nodes can mount read-write
- ReadWriteOncePod      # Single pod (K8s 1.22+)
```

| Storage Type | RWO | ROX | RWX |
|--------------|-----|-----|-----|
| AWS EBS      | ✅  | ❌  | ❌  |
| GCP PD       | ✅  | ✅  | ❌  |
| Azure Disk   | ✅  | ❌  | ❌  |
| NFS          | ✅  | ✅  | ✅  |
| CephFS       | ✅  | ✅  | ✅  |

### Reclaim Policies

```yaml
persistentVolumeReclaimPolicy: Retain   # Manual cleanup
# OR
persistentVolumeReclaimPolicy: Delete   # Auto-delete (default)
# OR
persistentVolumeReclaimPolicy: Recycle  # Deprecated
```

### PV Lifecycle

```
1. Provisioning
   - Static: Admin creates PV manually
   - Dynamic: StorageClass creates automatically

2. Binding
   - PVC requests storage
   - K8s finds matching PV
   - PVC bound to PV

3. Using
   - Pod mounts PVC
   - Read/write data

4. Releasing
   - PVC deleted
   - PV status: Released

5. Reclaiming
   - Retain: Admin must manually clean
   - Delete: Storage deleted automatically
```

---

## PersistentVolumeClaims (PVC)

### What is a PVC?

**Request for storage** by users - abstracts away storage implementation.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
  - ReadWriteOnce
  
  resources:
    requests:
      storage: 5Gi
  
  storageClassName: fast
```

```bash
# Create PVC
kubectl apply -f pvc.yaml

# View PVC
kubectl get pvc

# NAME     STATUS   VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS
# my-pvc   Bound    pv-123   5Gi        RWO            fast

# View PV
kubectl get pv
```

### Using PVC in Pod

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
    - name: data
      mountPath: /usr/share/nginx/html
  
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: my-pvc
```

### PVC Status

```
Pending   # Waiting for binding
Bound     # Successfully bound to PV
Lost      # PV lost/failed
```

---

## StorageClasses - Dynamic Provisioning

### What is a StorageClass?

**Template for dynamic PV provisioning** - automatically creates PVs on demand.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "3000"
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

### Cloud Provider StorageClasses

#### AWS EBS

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: aws-ebs
provisioner: ebs.csi.aws.com
parameters:
  type: gp3           # General Purpose SSD
  # type: io2        # Provisioned IOPS
  # type: st1        # Throughput Optimized HDD
  encrypted: "true"
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
```

#### GCP Persistent Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-pd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd        # SSD
  # type: pd-standard # HDD
  replication-type: regional-pd
```

#### Azure Disk

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-disk
provisioner: disk.csi.azure.com
parameters:
  storageaccounttype: Premium_LRS
  kind: Managed
```

### Dynamic Provisioning Flow

```
1. User creates PVC with storageClassName: fast-ssd
2. K8s finds StorageClass "fast-ssd"
3. StorageClass provisioner creates PV (AWS EBS, GCP PD, etc.)
4. PV automatically bound to PVC
5. User uses PVC in pod
```

```yaml
# PVC requesting dynamic provisioning
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: dynamic-pvc
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd  # Uses StorageClass
  resources:
    requests:
      storage: 10Gi
```

### Volume Binding Modes

```yaml
# Immediate: Provision PV immediately
volumeBindingMode: Immediate

# WaitForFirstConsumer: Wait until pod scheduled
volumeBindingMode: WaitForFirstConsumer  # Recommended
```

**Why WaitForFirstConsumer?**
```
Pod scheduled to zone us-east-1a
PV created in same zone
Avoids cross-zone attachment issues
```

---

## StatefulSet Storage

### volumeClaimTemplates

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  
  # Creates PVC for each replica
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 10Gi
```

**Result:**
```bash
kubectl get pvc

# NAME              STATUS   VOLUME    CAPACITY
# data-postgres-0   Bound    pv-abc    10Gi
# data-postgres-1   Bound    pv-def    10Gi
# data-postgres-2   Bound    pv-ghi    10Gi

# Each pod gets its own PVC!
# If postgres-1 dies, new pod reattaches to data-postgres-1
```

### Expanding StatefulSet Storage

```yaml
# 1. StorageClass must support volume expansion
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: expandable
provisioner: kubernetes.io/aws-ebs
allowVolumeExpansion: true  # Enable expansion
```

```bash
# 2. Edit PVC to increase size
kubectl edit pvc data-postgres-0
# Change: storage: 10Gi → storage: 20Gi

# 3. Delete and recreate pod
kubectl delete pod postgres-0
# New pod gets expanded volume
```

---

## CSI - Container Storage Interface

### What is CSI?

**Standard interface** for storage drivers - allows third-party storage providers.

```
Before CSI: Storage code in K8s core (AWS, GCP, Azure)
With CSI: External drivers, easier to add new storage

Popular CSI Drivers:
- AWS EBS CSI
- GCP PD CSI
- Azure Disk CSI
- Longhorn (Rancher)
- Rook/Ceph
- OpenEBS
- Portworx
```

### Install CSI Driver (AWS EBS Example)

```bash
# Add IAM permissions
# Deploy CSI driver
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.20"

# Verify
kubectl get pods -n kube-system | grep ebs-csi

# Create StorageClass
kubectl apply -f - <<EOF
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-sc
provisioner: ebs.csi.aws.com
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: gp3
EOF
```

---

## Interview Questions

**Q1: What's the difference between PV and PVC?**

**Answer:**
- **PV (PersistentVolume)**: Cluster resource representing actual storage (admin or dynamic provisioner creates)
- **PVC (PersistentVolumeClaim)**: User request for storage (abstracts implementation details)
Analogy: PV = physical hard drive, PVC = storage request form

**Q2: Explain dynamic provisioning vs static provisioning.**

**Answer:**
- **Static**: Admin manually creates PVs, users claim them with PVCs
- **Dynamic**: User creates PVC with StorageClass, K8s automatically provisions PV
Dynamic is preferred - more automated, scalable, cloud-native.

**Q3: What are access modes and why do they matter?**

**Answer:**
- **RWO (ReadWriteOnce)**: One node can mount (most common, block storage)
- **ROX (ReadOnlyMany)**: Multiple nodes read-only
- **RWX (ReadWriteMany)**: Multiple nodes read-write (requires network storage like NFS)
Matters because AWS EBS only supports RWO - can't share between pods on different nodes.

**Q4: Why use volumeClaimTemplates in StatefulSets?**

**Answer:** Each StatefulSet pod needs its own persistent storage with stable identity. volumeClaimTemplates automatically creates a unique PVC for each replica (data-postgres-0, data-postgres-1). If pod dies, new pod reattaches to same PVC, preserving data.

**Q5: What is WaitForFirstConsumer and why use it?**

**Answer:** Volume binding mode that delays PV provisioning until pod is scheduled. Ensures PV is created in same availability zone as pod, avoiding cross-zone attachment failures (especially important in cloud environments).

---

## Hands-On Exercise

### Task: Deploy Stateful WordPress with MySQL

```yaml
# 1. StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: kubernetes.io/no-provisioner  # Use hostPath for local
volumeBindingMode: WaitForFirstConsumer

---
# 2. MySQL PV
apiVersion: v1
kind: PersistentVolume
metadata:
  name: mysql-pv
spec:
  capacity:
    storage: 5Gi
  accessModes:
  - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /tmp/data/mysql

---
# 3. MySQL PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard

---
# 4. MySQL Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: password123
        - name: MYSQL_DATABASE
          value: wordpress
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: mysql-storage
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-storage
        persistentVolumeClaim:
          claimName: mysql-pvc

---
# 5. MySQL Service
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  selector:
    app: mysql
  ports:
  - port: 3306

---
# 6. WordPress PVC
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wordpress-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
  storageClassName: standard

---
# 7. WordPress Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
spec:
  selector:
    matchLabels:
      app: wordpress
  template:
    metadata:
      labels:
        app: wordpress
    spec:
      containers:
      - name: wordpress
        image: wordpress:6.0-apache
        env:
        - name: WORDPRESS_DB_HOST
          value: mysql
        - name: WORDPRESS_DB_PASSWORD
          value: password123
        ports:
        - containerPort: 80
        volumeMounts:
        - name: wordpress-storage
          mountPath: /var/www/html
      volumes:
      - name: wordpress-storage
        persistentVolumeClaim:
          claimName: wordpress-pvc

---
# 8. WordPress Service
apiVersion: v1
kind: Service
metadata:
  name: wordpress
spec:
  type: NodePort
  selector:
    app: wordpress
  ports:
  - port: 80
    nodePort: 30080
```

**Tasks:**
1. Deploy all resources
2. Verify PVs and PVCs are bound
3. Access WordPress
4. Delete pod, verify data persists
5. Check MySQL data survived

```bash
# Deploy
kubectl apply -f wordpress.yaml

# Verify storage
kubectl get pv,pvc
kubectl get pods

# Access WordPress
minikube service wordpress  # Or http://<node-ip>:30080

# Test persistence
kubectl delete pod -l app=wordpress
kubectl delete pod -l app=mysql
# Wait for pods to recreate
# WordPress config should still exist
```

---

## 📚 Additional Resources

- [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Dynamic Volume Provisioning](https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/)
- [CSI Drivers](https://kubernetes-csi.github.io/docs/drivers.html)

---

## ✅ Module Checklist

- [ ] Understand PV vs PVC concepts
- [ ] Create static PVs and PVCs
- [ ] Configure StorageClasses for dynamic provisioning
- [ ] Use volumeClaimTemplates in StatefulSets
- [ ] Deploy stateful application with persistent storage
- [ ] Complete WordPress + MySQL exercise

---

**Next Module:** [Module 10: Kubernetes Configuration](./10_Kubernetes_Configuration.md) - Master ConfigMaps, Secrets, and environment variables! 🔐
