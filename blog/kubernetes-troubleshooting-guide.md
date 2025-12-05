# Kubernetes Troubleshooting Guide: From Pods to Nodes

**Published: January 2025 | Reading Time: 12 min**

Troubleshooting Kubernetes can be daunting. This comprehensive guide covers common issues and systematic debugging approaches.

## Troubleshooting Methodology

### The 5-Step Process

1. **Identify**: What's the symptom?
2. **Isolate**: Which component is failing?
3. **Investigate**: Gather logs and metrics
4. **Diagnose**: Find root cause
5. **Resolve**: Fix and verify

## Pod Issues

### Pod Stuck in Pending

**Symptom**: Pod shows `Pending` status

**Check Events**
```bash
kubectl describe pod <pod-name>

# Common reasons in events:
# - Insufficient CPU/memory
# - No nodes match nodeSelector/affinity
# - Volume not available
# - Image pull backoff
```

**Solution 1: Insufficient Resources**
```bash
# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Reduce resource requests or add nodes
```

**Solution 2: Node Selector Issues**
```bash
# Check pod's nodeSelector
kubectl get pod <pod-name> -o yaml | grep -A 5 nodeSelector

# Check node labels
kubectl get nodes --show-labels

# Add missing label or remove nodeSelector
kubectl label nodes <node-name> disktype=ssd
```

**Solution 3: PVC Not Bound**
```bash
# Check PVC status
kubectl get pvc

# Check storage class
kubectl get sc

# Verify PV exists
kubectl get pv
```

### Pod Stuck in CrashLoopBackOff

**Symptom**: Pod repeatedly crashes

**Investigate**
```bash
# Check logs from crashed container
kubectl logs <pod-name> --previous

# Check events
kubectl describe pod <pod-name>

# Check liveness/readiness probes
kubectl get pod <pod-name> -o yaml | grep -A 10 livenessProbe
```

**Common Causes**

**1. Application Error**
```bash
# View application logs
kubectl logs <pod-name> --tail=100

# If multiple containers
kubectl logs <pod-name> -c <container-name>

# Follow logs
kubectl logs <pod-name> -f
```

**2. Configuration Error**
```bash
# Check environment variables
kubectl exec <pod-name> -- env

# Check mounted config
kubectl exec <pod-name> -- cat /etc/config/app.conf

# Verify secrets/configmaps exist
kubectl get secrets
kubectl get configmaps
```

**3. Probe Misconfiguration**
```yaml
# Fix: Increase initialDelaySeconds
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 60  # Increase if app starts slowly
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Pod OOMKilled

**Symptom**: Pod terminated with `OOMKilled` status

**Diagnose**
```bash
# Check exit code (137 = OOMKilled)
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[*].lastState.terminated.exitCode}'

# Check memory limit
kubectl get pod <pod-name> -o jsonpath='{.spec.containers[*].resources.limits.memory}'

# View metrics
kubectl top pod <pod-name>
```

**Solution**
```yaml
# Increase memory limit
resources:
  requests:
    memory: "256Mi"
  limits:
    memory: "512Mi"  # Increase this

# Or investigate memory leak
# Profile application
# Fix memory leak in code
```

### ImagePullBackOff

**Symptom**: Cannot pull container image

**Diagnose**
```bash
# Check events
kubectl describe pod <pod-name>

# Common errors:
# - "image not found"
# - "unauthorized"
# - "manifest unknown"
```

**Solution 1: Image Doesn't Exist**
```bash
# Verify image name and tag
docker pull <image-name>:<tag>

# Fix typo in deployment
kubectl set image deployment/<name> <container>=<correct-image>
```

**Solution 2: Authentication Required**
```bash
# Create docker-registry secret
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  --docker-email=<email>

# Add to deployment
spec:
  imagePullSecrets:
  - name: regcred
```

**Solution 3: Rate Limited (Docker Hub)**
```bash
# Use authenticated pulls
# Or use alternative registry (ghcr.io, quay.io)

# Check rate limit status
docker run --rm -it alpine sh -c \
  "TOKEN=\$(wget -qO- 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull' | jq -r .token) && \
  wget -qO- --header=\"Authorization: Bearer \$TOKEN\" https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest 2>&1 | grep -i ratelimit"
```

## Deployment Issues

### Deployment Not Rolling Out

**Symptom**: New version not deploying

**Check Rollout Status**
```bash
# View rollout status
kubectl rollout status deployment/<name>

# View rollout history
kubectl rollout history deployment/<name>

# Describe deployment
kubectl describe deployment <name>
```

**Common Issues**

**1. Pod Not Ready**
```bash
# Check why pods aren't ready
kubectl get pods -l app=<name>
kubectl describe pod <pod-name>

# Often due to:
# - Failing readiness probe
# - Application not starting
# - Dependency not available
```

**2. ImagePullBackOff**
```bash
# New image doesn't exist or can't be pulled
# See ImagePullBackOff section above
```

**3. Insufficient Quota**
```bash
# Check resource quotas
kubectl describe quota -n <namespace>

# Check limit ranges
kubectl describe limitrange -n <namespace>
```

**Rollback**
```bash
# Rollback to previous version
kubectl rollout undo deployment/<name>

# Rollback to specific revision
kubectl rollout undo deployment/<name> --to-revision=2

# Check rollout history
kubectl rollout history deployment/<name>
```

## Service and Networking Issues

### Service Not Accessible

**Symptom**: Cannot reach service

**Systematic Debugging**

**1. Check Service Exists**
```bash
kubectl get svc <service-name>
kubectl describe svc <service-name>

# Check endpoints
kubectl get endpoints <service-name>
# Should show pod IPs
```

**2. Verify Pod Labels Match**
```bash
# Service selector
kubectl get svc <service-name> -o jsonpath='{.spec.selector}'

# Pod labels
kubectl get pods --show-labels

# If no match: fix selector or labels
```

**3. Test from Within Cluster**
```bash
# Create debug pod
kubectl run debug --image=nicolaka/netshoot -it --rm -- bash

# Test service DNS
nslookup <service-name>
nslookup <service-name>.<namespace>.svc.cluster.local

# Test service IP
curl http://<service-ip>:<port>

# Test pod directly
curl http://<pod-ip>:<container-port>
```

**4. Check Network Policies**
```bash
# List network policies
kubectl get networkpolicies

# Describe policy
kubectl describe networkpolicy <policy-name>

# If traffic blocked: update policy
```

**5. Check Container Port**
```bash
# Verify container is listening
kubectl exec <pod-name> -- netstat -tlnp

# Check logs for errors
kubectl logs <pod-name>
```

### Ingress Not Working

**Symptom**: External traffic not reaching application

**Debug Steps**

**1. Check Ingress Controller**
```bash
# Verify ingress controller running
kubectl get pods -n ingress-nginx

# Check logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

**2. Check Ingress Resource**
```bash
kubectl get ingress
kubectl describe ingress <ingress-name>

# Verify host and path
# Check backend service
```

**3. Test Service Directly**
```bash
# Port-forward to service
kubectl port-forward svc/<service-name> 8080:80

# Test locally
curl http://localhost:8080

# If this works, issue is with ingress
```

**4. Check DNS**
```bash
# Verify DNS resolves
nslookup <hostname>

# Should point to load balancer IP
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

**5. Check TLS**
```bash
# Verify cert exists
kubectl get secret <tls-secret>

# Check cert details
kubectl get secret <tls-secret> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout

# Test with curl
curl -v https://<hostname>
```

## Node Issues

### Node NotReady

**Symptom**: Node shows `NotReady` status

**Check Node Condition**
```bash
kubectl describe node <node-name>

# Check conditions:
# - DiskPressure
# - MemoryPressure
# - PIDPressure
# - NetworkUnavailable
```

**Common Causes**

**1. Kubelet Not Running**
```bash
# SSH to node
ssh <node>

# Check kubelet
systemctl status kubelet
journalctl -u kubelet -f

# Restart if needed
systemctl restart kubelet
```

**2. Disk Pressure**
```bash
# Check disk usage
df -h

# Clean up
docker system prune -a
journalctl --vacuum-time=3d

# Check kubelet garbage collection
kubectl get node <node-name> -o yaml | grep -A 10 allocatable
```

**3. Network Issues**
```bash
# Check CNI plugin
kubectl get pods -n kube-system | grep -i cni

# Check CNI logs
kubectl logs -n kube-system <cni-pod>

# Restart CNI if needed
kubectl delete pod -n kube-system <cni-pod>
```

### Node High CPU/Memory

**Diagnose**
```bash
# Check node resources
kubectl top nodes

# Find resource hogs
kubectl top pods --all-namespaces --sort-by=memory
kubectl top pods --all-namespaces --sort-by=cpu

# SSH to node and check
top
htop
```

**Solutions**

**1. Scale Down/Evict Pods**
```bash
# Cordon node (prevent new pods)
kubectl cordon <node-name>

# Drain node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

**2. Adjust Resource Limits**
```yaml
# Set appropriate limits
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

**3. Add More Nodes**
```bash
# Scale node group (cloud provider specific)
# AWS EKS
eksctl scale nodegroup --cluster=<cluster> --name=<nodegroup> --nodes=5

# GKE
gcloud container clusters resize <cluster> --num-nodes=5
```

## Persistent Volume Issues

### PVC Stuck in Pending

**Symptom**: PersistentVolumeClaim not bound

**Diagnose**
```bash
kubectl describe pvc <pvc-name>

# Check events:
# - No storage class available
# - No PV matches
# - Storage class provisioner error
```

**Solutions**

**1. No Storage Class**
```bash
# Check storage classes
kubectl get sc

# If none, create one or use existing
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  storageClassName: "standard"  # Specify explicitly
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

**2. No Matching PV**
```bash
# Check available PVs
kubectl get pv

# Create PV or use dynamic provisioning
```

**3. Provisioner Error**
```bash
# Check storage class provisioner logs
# AWS EBS CSI Driver
kubectl logs -n kube-system -l app=ebs-csi-controller

# Google PD CSI Driver
kubectl logs -n kube-system -l app=gcp-compute-persistent-disk-csi-driver
```

## Performance Issues

### Slow API Server

**Symptoms**: kubectl commands slow

**Diagnose**
```bash
# Check API server metrics
kubectl get --raw /metrics | grep apiserver_request_duration

# Check etcd latency
kubectl get --raw /metrics | grep etcd_request_duration

# Check API server logs
kubectl logs -n kube-system -l component=kube-apiserver
```

**Solutions**
- Reduce object count (old deployments, pods)
- Scale etcd (if applicable)
- Increase API server resources
- Enable API priority and fairness

### Slow Pod Startup

**Diagnose**
```bash
# Check events timeline
kubectl describe pod <pod-name>

# Common delays:
# - Image pull
# - Volume mounting
# - Init containers
# - Application startup
```

**Solutions**

**1. Slow Image Pull**
```bash
# Use local registry or cache
# Reduce image size
# Pre-pull images to nodes
```

**2. Init Containers**
```yaml
# Optimize or parallelize init containers
initContainers:
- name: wait-for-db
  image: busybox
  command: ['sh', '-c', 'until nc -z db 5432; do sleep 1; done']
  # Ensure this completes quickly
```

## Debugging Tools

### Essential Commands
```bash
# Events (cluster-wide)
kubectl get events --all-namespaces --sort-by='.lastTimestamp'

# Resource usage
kubectl top nodes
kubectl top pods

# Port forwarding
kubectl port-forward pod/<pod> 8080:80

# Exec into pod
kubectl exec -it <pod> -- /bin/bash

# Copy files
kubectl cp <pod>:/path/to/file ./local-file

# Debug with ephemeral container
kubectl debug <pod> -it --image=busybox --target=<container>
```

### Debug Pod
```bash
# Create debug pod
kubectl run debug --image=nicolaka/netshoot -it --rm -- bash

# Tools included:
# - curl, wget
# - netstat, ss, nmap
# - dig, nslookup
# - tcpdump, iftop
# - iperf, netperf
```

## Conclusion

Effective Kubernetes troubleshooting requires:

1. **Systematic Approach**: Follow the 5-step process
2. **Know Your Tools**: kubectl, logs, events, describe
3. **Understand Architecture**: How components interact
4. **Check Logs**: Application and K8s components
5. **Use Metrics**: Monitor resource usage
6. **Practice**: The more you troubleshoot, the faster you become

Keep this guide handy. Kubernetes issues will happen, but with the right approach, they're always solvable.

---

*Practice troubleshooting in our [Kubernetes Labs](../k8s-fundamentals/index.html) at HPE Labs Hub.*
