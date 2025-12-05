# Cost Optimization Strategies for Kubernetes

**Published: January 2025 | Reading Time: 9 min**

Running Kubernetes in production can be expensive. This guide provides actionable strategies to optimize costs without sacrificing reliability.

## Understanding Kubernetes Costs

### Cost Breakdown

1. **Compute**: 60-70% (nodes, CPU, memory)
2. **Storage**: 10-20% (persistent volumes)
3. **Network**: 10-15% (data transfer, load balancers)
4. **Control Plane**: 5-10% (managed services)

## Strategy 1: Right-Sizing Resources

### The Problem

```yaml
# Over-provisioned (wastes money)
resources:
  requests:
    cpu: 2000m
    memory: 4Gi
  limits:
    cpu: 4000m
    memory: 8Gi

# Actual usage: 200m CPU, 512Mi memory
# Wasting 90% of allocated resources!
```

### The Solution: Monitor and Adjust

**1. Use Metrics**
```bash
# Check actual usage
kubectl top pods --all-namespaces

# Over week/month (Prometheus)
avg_over_time(container_memory_working_set_bytes[7d])
avg_over_time(rate(container_cpu_usage_seconds_total[7d])[1h:5m])
```

**2. Vertical Pod Autoscaler (VPA)**
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"  # or "Recommend" for suggestions only
```

**3. Get VPA Recommendations**
```bash
# Install VPA
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh

# Get recommendations
kubectl describe vpa myapp-vpa

# Sample output:
# Recommendation:
#   Container: myapp
#   Target:
#     Cpu:     250m
#     Memory:  512Mi
```

**4. Right-Size Example**
```yaml
# Optimized (based on actual usage + buffer)
resources:
  requests:
    cpu: 200m      # Actual avg + 20% buffer
    memory: 512Mi  # Actual avg + 20% buffer
  limits:
    cpu: 500m      # 2.5x requests for burst
    memory: 1Gi    # 2x requests

# Cost savings: 75-80%!
```

## Strategy 2: Horizontal Pod Autoscaling

### Dynamic Scaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2    # Baseline during off-peak
  maxReplicas: 20   # Peak capacity
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Percent
        value: 50    # Scale down max 50% of pods
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
      - type: Percent
        value: 100   # Double pods if needed
        periodSeconds: 15
      - type: Pods
        value: 4     # Or add 4 pods
        periodSeconds: 15
      selectPolicy: Max  # Choose most aggressive
```

**Cost Impact**
- **Without HPA**: 20 replicas 24/7 = 480 pod-hours/day
- **With HPA**: avg 5 replicas = 120 pod-hours/day
- **Savings**: 75%

## Strategy 3: Cluster Autoscaling

### Node-Level Scaling

```yaml
# AWS Cluster Autoscaler
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        name: cluster-autoscaler
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws
        - --namespace=kube-system
        - --node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/<cluster-name>
        - --balance-similar-node-groups
        - --skip-nodes-with-system-pods=false
        - --scale-down-enabled=true
        - --scale-down-delay-after-add=10m
        - --scale-down-unneeded-time=10m
```

**Cost Impact**
- Scales down nodes during off-peak
- Removes nodes with <50% utilization
- Typical savings: 30-40%

## Strategy 4: Spot/Preemptible Instances

### Use Spot Instances for Fault-Tolerant Workloads

**AWS EKS Node Group**
```bash
eksctl create nodegroup \
  --cluster=my-cluster \
  --name=spot-nodes \
  --instance-types=m5.large,m5a.large,m5d.large \
  --spot \
  --nodes-min=2 \
  --nodes-max=10
```

**Mix On-Demand and Spot**
```yaml
# Critical workloads: on-demand nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database
spec:
  template:
    spec:
      nodeSelector:
        node-lifecycle: on-demand

---
# Fault-tolerant: spot nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processing
spec:
  template:
    spec:
      nodeSelector:
        node-lifecycle: spot
      tolerations:
      - key: spot
        operator: Equal
        value: "true"
        effect: NoSchedule
```

**Cost Impact**
- Spot instances: 70-90% cheaper
- Run 50% of workload on spot: 35-45% total savings

### Handle Spot Interruptions

```yaml
# Use PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: myapp-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: myapp

# Increase replicas on spot
# If spot interrupted, on-demand nodes handle load
```

## Strategy 5: Storage Optimization

### Identify Unused Volumes

```bash
# Find unattached PVs
kubectl get pv --all-namespaces -o json | \
  jq -r '.items[] | select(.status.phase=="Available") | .metadata.name'

# Find unused PVCs
kubectl get pvc --all-namespaces -o json | \
  jq -r '.items[] | select(.status.phase!="Bound") | "\(.metadata.namespace)/\(.metadata.name)"'

# Delete unused PVCs
kubectl delete pvc <pvc-name> -n <namespace>
```

### Use Appropriate Storage Classes

```yaml
# Expensive (SSD, high IOPS)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: io2  # Provisioned IOPS (expensive)
  iopsPerGB: "100"

---
# Cheaper (HDD, for logs/backups)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: slow-hdd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: st1  # Throughput optimized (cheap)
```

**Use Case Mapping**
- **io2/gp3**: Databases, high-performance apps (expensive)
- **gp2**: General purpose (medium cost)
- **st1**: Logs, backups (cheap)

### Snapshot and Archive

```bash
# Snapshot volumes
velero backup create monthly-backup --include-namespaces production

# Delete old volumes
# Move to S3/Glacier for long-term retention
```

**Cost Impact**
- gp2 → st1: 50% savings
- Delete unused PVs: 10-20% storage cost reduction

## Strategy 6: Network Optimization

### Reduce Data Transfer Costs

**1. Use Same-Region Communication**
```yaml
# Topology-aware routing
apiVersion: v1
kind: Service
metadata:
  name: myapp
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  topologyKeys:
  - kubernetes.io/hostname  # Prefer same node
  - topology.kubernetes.io/zone  # Then same AZ
```

**2. NAT Gateway Optimization**
```bash
# Expensive: All egress through NAT Gateway
# Solution: Use VPC endpoints for AWS services

# Create VPC endpoints
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xxx

# S3, DynamoDB, ECR: free VPC endpoints
# Savings: $100-500/month on NAT Gateway
```

**3. Reduce Load Balancer Count**
```yaml
# Bad: One LoadBalancer per service
apiVersion: v1
kind: Service
metadata:
  name: service1
spec:
  type: LoadBalancer  # $18/month each

---
# Good: Use Ingress (one LoadBalancer)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
spec:
  rules:
  - host: service1.example.com
    http:
      paths:
      - path: /
        backend:
          service:
            name: service1
            port:
              number: 80
  - host: service2.example.com
    http:
      paths:
      - path: /
        backend:
          service:
            name: service2
            port:
              number: 80

# Cost: 1 load balancer vs 10+ = $180/month savings
```

## Strategy 7: Schedule Non-Critical Workloads

### CronJobs for Batch Processing

```yaml
# Run during off-peak hours
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-processing
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          nodeSelector:
            workload-type: batch
          containers:
          - name: processor
            image: myapp:latest
            resources:
              requests:
                cpu: 2000m      # Use otherwise idle capacity
                memory: 4Gi
          restartPolicy: OnFailure
```

### Scale Down Dev/Test Environments

```bash
# Automated scripts
# Scale down dev at 6 PM
kubectl scale deployment --all --replicas=0 -n development

# Scale up at 8 AM
kubectl scale deployment --all --replicas=2 -n development

# Or use ArgoCD Application sync windows
```

**Cost Impact**
- Dev environments idle 16 hours/day
- Savings: 66% on dev clusters

## Strategy 8: Use Pod Priority and Preemption

### Prioritize Critical Workloads

```yaml
# High priority (critical)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-priority
value: 1000
globalDefault: false
description: "Critical production workloads"

---
# Low priority (batch jobs)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: low-priority
value: 100
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Batch jobs, can be preempted"

---
# Use in deployments
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-app
spec:
  template:
    spec:
      priorityClassName: high-priority
      containers:
      - name: app
        image: myapp:latest

---
apiVersion: batch/v1
kind: Job
metadata:
  name: batch-job
spec:
  template:
    spec:
      priorityClassName: low-priority
      containers:
      - name: processor
        image: processor:latest
```

**Benefit**: Better resource utilization without over-provisioning

## Strategy 9: Optimize Container Images

### Reduce Image Size

```dockerfile
# Bad: Large image (1.2GB)
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y python3 python3-pip
COPY requirements.txt .
RUN pip3 install -r requirements.txt
COPY . .
CMD ["python3", "app.py"]

# Good: Smaller image (50MB)
FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]

# Better: Multi-stage (20MB)
FROM python:3.11 AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
CMD ["python", "app.py"]

# Best: Distroless (15MB)
FROM gcr.io/distroless/python3
COPY --from=builder /app /app
WORKDIR /app
CMD ["app.py"]
```

**Cost Impact**
- Faster pulls = faster scaling
- Less bandwidth = lower costs
- Faster startup = better HPA response

## Monitoring and Alerting

### Track Cost Metrics

```promql
# Cost per pod (estimate)
sum(
  avg_over_time(container_cpu_usage_seconds_total[1d]) * 0.04 +  # $0.04/CPU-hour
  avg_over_time(container_memory_working_set_bytes[1d]) / 1073741824 * 0.005  # $0.005/GB-hour
) by (namespace, pod)

# Unused resources (waste)
sum(
  container_spec_cpu_quota / 100000 - on(pod,namespace,container) rate(container_cpu_usage_seconds_total[1h])
) by (namespace)

# Cost by namespace
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace) * 0.04
```

### Cost Optimization Alerts

```yaml
groups:
- name: cost-optimization
  rules:
  - alert: HighCPUWaste
    expr: |
      (sum(container_spec_cpu_quota) - sum(rate(container_cpu_usage_seconds_total[5m]))) 
      / sum(container_spec_cpu_quota) > 0.5
    annotations:
      summary: "High CPU waste detected"

  - alert: UnusedPersistentVolume
    expr: kube_persistentvolume_status_phase{phase="Available"} == 1
    for: 7d
    annotations:
      summary: "PV {{ $labels.persistentvolume }} unused for 7 days"
```

## Cost Optimization Checklist

**Resources**
- [ ] Right-size requests/limits (VPA)
- [ ] Enable HPA for variable workloads
- [ ] Use cluster autoscaler
- [ ] Implement pod priority

**Compute**
- [ ] Use spot instances (50-90% of capacity)
- [ ] Scale down dev/test environments off-hours
- [ ] Schedule batch jobs during off-peak

**Storage**
- [ ] Delete unused PVCs/PVs
- [ ] Use appropriate storage classes
- [ ] Implement retention policies
- [ ] Snapshot and archive

**Network**
- [ ] Use Ingress instead of multiple LoadBalancers
- [ ] Enable VPC endpoints
- [ ] Use topology-aware routing
- [ ] Optimize NAT Gateway usage

**Containers**
- [ ] Use smaller base images
- [ ] Multi-stage builds
- [ ] Layer caching
- [ ] Image pruning

## Tools

**Cost Analysis**
- **Kubecost**: Detailed K8s cost analysis
- **Cloud Provider Tools**: AWS Cost Explorer, GCP Cost Management
- **Prometheus**: Custom cost metrics

**Resource Optimization**
- **Vertical Pod Autoscaler**: Right-sizing recommendations
- **Goldilocks**: VPA recommendations dashboard
- **KRR (Kubernetes Resource Recommendations)**: CLI tool for recommendations

## Conclusion

Cost optimization is ongoing, not one-time:

1. **Monitor**: Track actual usage
2. **Right-Size**: Adjust based on data
3. **Autoscale**: Horizontal and vertical
4. **Spot Instances**: Use for fault-tolerant workloads
5. **Clean Up**: Delete unused resources
6. **Optimize**: Storage, network, images
7. **Review**: Monthly cost reviews

Typical savings with these strategies: **40-60%**

Start with quick wins (delete unused resources, enable autoscaling), then tackle more complex optimizations.

---

*Learn more in our [Kubernetes Labs](../k8s-fundamentals/index.html) at HPE Labs Hub.*
