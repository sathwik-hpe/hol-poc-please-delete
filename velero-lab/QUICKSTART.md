# Velero Lab - Quick Start Guide

## 🚀 Two Ways to Use This Lab

### Option 1: With Interactive Embedded Terminal (Recommended)

Get a fully integrated experience with a terminal embedded directly in the browser.

#### Step 1: Install ttyd
```bash
brew install ttyd
```

#### Step 2: Start Everything
```bash
cd /Users/kondapus/Desktop/glcp/hol/velero-lab
./start-lab.sh
```

This will start:
- Lab web interface on `http://localhost:8000`
- Interactive terminal on `http://localhost:7681`

#### Step 3: Open Browser
Open `http://localhost:8000` and click "Start Lab"

---

### Option 2: Without Embedded Terminal (Simpler)

Use the lab instructions in the browser, but run commands in your own terminal.

#### Step 1: Start Lab Server
```bash
cd /Users/kondapus/Desktop/glcp/hol/velero-lab
python3 -m http.server 8000
```

#### Step 2: Open Two Windows
- **Browser**: `http://localhost:8000`
- **Terminal**: Your favorite terminal app (Terminal.app, iTerm2, etc.)

#### Step 3: Follow Along
Copy commands from browser, paste into your terminal.

---

## 📋 Prerequisites

Before starting either option, make sure you have:

### Required:
- ✅ **Kubernetes cluster** (Kind, Minikube, or K3s)
  ```bash
  # Create a Kind cluster
  kind create cluster --name velero-lab
  ```

- ✅ **kubectl** - Kubernetes CLI
  ```bash
  # macOS
  brew install kubectl
  
  # Verify
  kubectl version --client
  ```

- ✅ **Helm 3.x** - Package manager
  ```bash
  # macOS
  brew install helm
  
  # Verify
  helm version
  ```

### Optional (for embedded terminal):
- ⭐ **ttyd** - Terminal server
  ```bash
  brew install ttyd
  ```

### For Exercise Operations:
- **MinIO Client (mc)** - Will be installed in Exercise 1
- **Velero CLI** - Optional but helpful

---

## 🎯 Lab Structure

The lab consists of 4 progressive exercises:

1. **Exercise 1** (45 min) - Installing Velero
   - Deploy MinIO for storage
   - Install Velero with Helm
   - Configure backup location

2. **Exercise 2** (30 min) - Creating Backups
   - Deploy demo application
   - Create first backup
   - Monitor and verify

3. **Exercise 3** (30 min) - Disaster Recovery
   - Simulate disaster
   - Restore from backup
   - Verify restoration

4. **Exercise 4** (45 min) - Multi-Phase Restore
   - Complex multi-tier app
   - Phase-based restoration
   - Production patterns

---

## 🔧 Troubleshooting

### Terminal Server Won't Start

**Error**: `ttyd: command not found`
```bash
# Install ttyd
brew install ttyd
```

**Error**: Port 7681 already in use
```bash
# Find what's using the port
lsof -i :7681

# Kill it
kill -9 <PID>

# Or use different port in start-lab.sh
```

### Lab Server Won't Start

**Error**: Port 8000 already in use
```bash
# Use different port
python3 -m http.server 8080
```

### Can't Connect to Kubernetes

```bash
# Check cluster is running
kubectl cluster-info

# If using Kind
kind get clusters

# Recreate cluster if needed
kind delete cluster --name velero-lab
kind create cluster --name velero-lab
```

### Browser Can't Load Terminal

1. **Check if ttyd is running**:
   ```bash
   curl http://localhost:7681
   ```

2. **Check browser console** (F12) for errors

3. **Try standalone terminal**:
   Open `http://localhost:7681` directly

4. **Fallback**: Just use your own terminal app instead

---

## 🛑 Stopping the Lab

### If you used start-lab.sh:
```bash
# Press Ctrl+C in the terminal running the script
```

### If you started manually:
```bash
# Stop lab server (Ctrl+C in that terminal)
# Stop ttyd (Ctrl+C in that terminal)
```

---

## 🧹 Cleanup After Lab

### Remove Kind cluster:
```bash
kind delete cluster --name velero-lab
```

### Keep the lab files:
The lab can be reused anytime. Just start the servers again!

---

## 💡 Tips

1. **Use Two Monitors**: Browser on one, terminal on another
2. **Multiple Terminals**: Some exercises need multiple terminal windows
3. **Take Notes**: Document what you learn for future reference
4. **Experiment**: Try variations of the commands
5. **Check Logs**: When something doesn't work, check pod logs:
   ```bash
   kubectl logs -n velero <pod-name>
   ```

---

## 📚 Additional Resources

- **White Paper**: `/Users/kondapus/Desktop/glcp/hol/whitepaper/velero-kubernetes-backup-whitepaper.md`
- **Blog Guide**: `/Users/kondapus/Desktop/glcp/hol/blog/velero-hands-on-guide.md`
- **Terminal Setup**: `TERMINAL-SETUP.md` (detailed terminal server options)
- **Official Velero Docs**: https://velero.io/docs/

---

## ❓ FAQ

**Q: Do I need the embedded terminal?**
A: No! It's optional. You can use any terminal application.

**Q: Can I use a remote Kubernetes cluster?**
A: Yes, as long as kubectl can connect to it.

**Q: Is this production-ready configuration?**
A: The Helm values are production-inspired, but you'd need to adjust for your specific environment (auth, storage, retention, etc.).

**Q: Can I share this lab with others?**
A: Yes! The lab is self-contained. Just share the velero-lab directory.

**Q: What if Exercise 3 or 4 are missing?**
A: They're in development. Exercises 1 and 2 are complete and fully functional.

---

## 🎉 Ready to Start?

### Quick Command Reference:

```bash
# One-liner to start everything:
cd /Users/kondapus/Desktop/glcp/hol/velero-lab && ./start-lab.sh

# Or manual start:
cd /Users/kondapus/Desktop/glcp/hol/velero-lab
ttyd -p 7681 -W zsh &           # Terminal server
python3 -m http.server 8000 &    # Lab server
open http://localhost:8000       # Open browser
```

**Then click "Start Lab" and begin Exercise 1!** 🚀
