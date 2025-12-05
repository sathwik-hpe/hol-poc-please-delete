# Velero Backup & Restore - Hands-On Lab

Welcome to the **Velero Backup & Restore Hands-On Lab**! This lab provides real, executable commands to help you master Kubernetes backup and disaster recovery using Velero.

---

## 🎯 Lab Overview

This hands-on lab teaches you how to:
- Install Velero on Kubernetes with production configuration
- Create backups of Kubernetes applications
- Perform disaster recovery with restore operations
- Handle complex multi-tier application dependencies

**Time Required:** 2-3 hours  
**Difficulty Level:** Intermediate  
**Prerequisites:** Basic Kubernetes knowledge

---

## 📋 Prerequisites

Before starting this lab, ensure you have:

### Required Software

1. **Kubernetes Cluster** (one of the following):
   - [Kind](https://kind.sigs.k8s.io/) (Recommended for local testing)
   - [Minikube](https://minikube.sigs.k8s.io/)
   - [K3s](https://k3s.io/)
   - Any other Kubernetes 1.21+ cluster

2. **kubectl** - Kubernetes command-line tool
   ```bash
   # Verify installation
   kubectl version --client
   ```

3. **Helm 3.x** - Kubernetes package manager
   ```bash
   # Verify installation
   helm version --short
   ```

4. **MinIO Client (mc)** - For interacting with object storage
   ```bash
   # macOS
   brew install minio/stable/mc
   
   # Linux
   wget https://dl.min.io/client/mc/release/linux-amd64/mc
   chmod +x mc
   sudo mv mc /usr/local/bin/
   ```

5. **Velero CLI** (Optional but recommended)
   ```bash
   # macOS
   brew install velero
   
   # Linux
   wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
   tar -xvf velero-v1.12.0-linux-amd64.tar.gz
   sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/
   ```

###System Requirements

- **RAM:** 8GB minimum, 16GB recommended
- **Disk Space:** 20GB free space
- **CPU:** 2 cores minimum, 4 cores recommended
- **Network:** Internet connection for pulling container images

---

## 🚀 Quick Start

### Option 1: Create a Kind Cluster (Recommended for Testing)

```bash
# Install Kind
brew install kind  # macOS
# OR
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind

# Create cluster
kind create cluster --name velero-lab

# Verify cluster
kubectl cluster-info
```

### Option 2: Use Existing Cluster

If you already have a Kubernetes cluster:

```bash
# Verify access
kubectl get nodes

# Verify you have admin permissions
kubectl auth can-i '*' '*' --all-namespaces
```

---

## 📚 Lab Exercises

This lab consists of 4 hands-on exercises:

### **Exercise 1: Installing Velero** (45 minutes)
Learn how to:
- Deploy MinIO as S3-compatible backup storage
- Install Velero using Helm with production configuration
- Verify Backup Storage Location connectivity
- Set up Velero CLI

**Start:** [Open Exercise 1](real-lab/index.html)

---

### **Exercise 2: Creating Your First Backup** (30 minutes)
Learn how to:
- Deploy a sample application
- Create backups using Velero CLI and kubectl
- Monitor backup progress
- Verify backups in object storage
- Use label selectors for selective backups

**Start:** [Open Exercise 2](real-lab/lab2.html)

---

### **Exercise 3: Performing Disaster Recovery** (30 minutes)
Learn how to:
- Simulate a disaster scenario
- Restore applications from backup
- Verify restored resources
- Understand restore options and parameters

**Start:** [Open Exercise 3](real-lab/lab3.html)

---

### **Exercise 4: Multi-Phase Restore** (45 minutes)
Learn how to:
- Handle complex application dependencies
- Perform ordered multi-phase restores
- Restore storage infrastructure first
- Manage operator-based applications

**Start:** [Open Exercise 4](real-lab/lab4.html)

---

## 🖥️ Running the Lab

1. **Start the lab server:**
   ```bash
   cd velero-lab
   python3 -m http.server 8000
   ```

2. **Open in your browser:**
   ```
   http://localhost:8000
   ```

3. **Choose "Real Lab"** from the landing page

4. **Open a terminal** alongside your browser to execute commands

---

## 📖 Lab Structure

```
velero-lab/
├── index.html              # Landing page
├── styles.css              # Shared styles
├── README.md              # This file
└── real-lab/
    ├── index.html         # Exercise 1: Installing Velero
    ├── lab2.html          # Exercise 2: Creating Backups
    ├── lab3.html          # Exercise 3: Disaster Recovery
    └── lab4.html          # Exercise 4: Multi-Phase Restore
```

---

## 💡 Lab Tips

### Best Practices

1. **Follow the order:** Exercises build on each other
2. **Read before executing:** Understand what each command does
3. **Check expected outputs:** Verify your results match
4. **Keep terminals organized:** Use multiple terminal tabs/windows
5. **Don't skip checkpoints:** Verify success before moving forward

### Copy-Paste Workflow

1. Click the **"Copy"** button on any code block
2. Paste into your terminal
3. Review the output
4. Compare with the "Expected Output" section
5. Proceed to the next step

### Common Terminal Windows Needed

- **Terminal 1:** Main kubectl/helm commands
- **Terminal 2:** MinIO port-forward (Exercise 1)
- **Terminal 3:** Monitoring (watching backups/restores)

---

## 🐛 Troubleshooting

### Issue: Kubernetes cluster not accessible

```bash
# Check current context
kubectl config current-context

# List available contexts
kubectl config get-contexts

# Switch context if needed
kubectl config use-context <context-name>
```

### Issue: Helm command not found

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### Issue: MinIO pods not starting

```bash
# Check pod status
kubectl get pods -n minio

# View pod logs
kubectl logs -n minio -l app=minio

# Check events
kubectl get events -n minio --sort-by='.lastTimestamp'
```

### Issue: Velero backup stuck in "InProgress"

```bash
# Check Velero logs
kubectl logs deployment/velero -n velero

# Check node-agent logs
kubectl logs daemonset/node-agent -n velero

# Verify BSL connectivity
kubectl get backupstoragelocation -n velero
```

### Issue: Port-forward disconnects

```bash
# Restart port-forward in background
kubectl port-forward -n minio svc/minio 9000:9000 &

# Or use a more stable method
kubectl -n minio port-forward --address=0.0.0.0 svc/minio 9000:9000
```

---

## 🧹 Cleanup

After completing the lab, clean up resources:

### Remove Demo Applications

```bash
kubectl delete namespace demo-app
kubectl delete namespace multi-tier-app  # if you created it in Exercise 4
```

### Remove Velero

```bash
helm uninstall velero -n velero
kubectl delete namespace velero
```

### Remove MinIO

```bash
kubectl delete namespace minio
```

### Delete Kind Cluster (if used)

```bash
kind delete cluster --name velero-lab
```

---

## 📚 Additional Resources

### Official Documentation

- **Velero Documentation:** https://velero.io/docs/
- **Velero GitHub:** https://github.com/vmware-tanzu/velero
- **MinIO Documentation:** https://min.io/docs/
- **Kubernetes Backup Best Practices:** https://kubernetes.io/docs/tasks/administer-cluster/

### Related Materials in This Repository

- **📄 White Paper:** [Velero-Based Backup and Restore for Kubernetes](../whitepaper/velero-kubernetes-backup-whitepaper.md)
  - Deep-dive on architecture
  - Why VMware snapshots fail for K8s
  - Production implementation analysis

- **📝 Blog Guide:** [Hands-On Guide: Installing and Configuring Velero](../blog/velero-hands-on-guide.md)
  - Step-by-step tutorial format
  - Additional configuration examples
  - Advanced scenarios

### Community

- **Kubernetes Slack:** #velero channel
- **Stack Overflow:** [velero tag](https://stackoverflow.com/questions/tagged/velero)
- **VMware Tanzu Community:** https://tanzu.vmware.com/community

---

## ❓ FAQ

### Q: Do I need a real cloud provider S3?

**A:** No! This lab uses MinIO running inside your cluster, which is S3-compatible. It's perfect for learning and testing.

### Q: Can I use this lab in production?

**A:** The techniques are production-ready, but you should:
- Use external S3 storage (AWS S3, Google Cloud Storage, Azure Blob)
- Configure proper retention policies
- Set up monitoring and alerting
- Test restore procedures regularly

### Q: How much does this lab cost?

**A:** $0! Everything runs locally on your machine. No cloud resources needed.

### Q: Can I skip exercises?

**A:** Not recommended. Each exercise builds on the previous one. Exercise 1 sets up the infrastructure needed for all subsequent exercises.

### Q: What if I get stuck?

**A:** 
1. Check the "Expected Output" sections
2. Review Velero logs: `kubectl logs deployment/velero -n velero`
3. Consult the Troubleshooting section above
4. Check Velero GitHub issues: https://github.com/vmware-tanzu/velero/issues

### Q: How long are backups retained?

**A:** Default TTL is 720 hours (30 days). You can customize this with the `--ttl` flag when creating backups.

### Q: Can I backup the entire cluster?

**A:** Yes! Omit the `--include-namespaces` flag:
```bash
velero backup create full-cluster-backup
```

---

## 🎓 Learning Objectives

By the end of this lab, you will:

✅ Understand Velero architecture and components  
✅ Install and configure Velero on Kubernetes  
✅ Create backups of Kubernetes resources  
✅ Perform disaster recovery operations  
✅ Handle complex multi-tier application restores  
✅ Troubleshoot common backup/restore issues  
✅ Apply best practices for production use  

---

## 🤝 Contributing

Found an issue or have a suggestion? This lab is part of an open-source learning initiative. Feel free to:
- Submit issues for bugs or improvements
- Suggest additional exercises
- Share your experience

---

## 📝 License

This lab is provided for educational purposes. Velero is an open-source project under the Apache 2.0 License.

---

## 🎉 Ready to Start?

1. Verify prerequisites above
2. Start the lab server: `python3 -m http.server 8000`
3. Open http://localhost:8000 in your browser
4. Click "Start Real Lab"
5. Begin with Exercise 1!

**Good luck and happy learning!** 🚀

---

**Lab Version:** 1.0  
**Last Updated:** December 2025  
**Velero Version:** 1.12.0  
**Kubernetes Version:** 1.21+
