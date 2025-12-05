# 🌐 Deployment Guide: Making Your Portfolio Accessible

## Current Situation
- ✅ Portfolio works locally with `python3 -m http.server`
- ❌ Requires local infrastructure
- 🎯 Goal: Make accessible via HPE network (10.14.177.97) or internet (GitHub)

---

## 🚀 **Option 1: GitHub Pages (RECOMMENDED)**

### Why GitHub Pages?
- ✅ **Free hosting**
- ✅ **Global accessibility** (https://sathwik-hpe.github.io/hol-poc-please-delete/)
- ✅ **Automatic HTTPS**
- ✅ **No infrastructure needed**
- ✅ **CI/CD built-in**
- ✅ **Perfect for portfolios**

### Setup Steps (5 minutes):

#### 1. Push Your Code to GitHub
```bash
cd /Users/kondapus/Desktop/glcp/hol

# Initialize git (if not already done)
git init
git add .
git commit -m "Complete portfolio with 8 labs and 12 blogs"

# Add your GitHub repo as remote
git remote add origin https://github.com/sathwik-hpe/hol-poc-please-delete.git

# Push to main branch
git branch -M main
git push -u origin main
```

#### 2. Enable GitHub Pages
1. Go to your repo: https://github.com/sathwik-hpe/hol-poc-please-delete
2. Click **Settings** (top menu)
3. Click **Pages** (left sidebar)
4. Under "Source":
   - Select: **GitHub Actions**
5. Click **Save**

#### 3. Trigger Deployment
The GitHub Action (`.github/workflows/deploy-pages.yml`) will automatically:
- Deploy on every push to `main`
- Make your site available at: **https://sathwik-hpe.github.io/hol-poc-please-delete/**

#### 4. Access Your Portfolio
- **Public URL**: https://sathwik-hpe.github.io/hol-poc-please-delete/
- **Custom Domain** (optional): Can configure your own domain

### Testing GitHub Pages
```bash
# After pushing, check deployment status
# Go to: https://github.com/sathwik-hpe/hol-poc-please-delete/actions

# Once deployed, visit:
# https://sathwik-hpe.github.io/hol-poc-please-delete/
```

---

## 🏢 **Option 2: HPE Internal Server (10.14.177.97)**

### Why HPE Server?
- ✅ **Internal HPE access**
- ✅ **Fast for HPE employees**
- ✅ **You control infrastructure**
- ❌ Not accessible outside HPE network

### Setup Steps:

#### 1. Install Nginx on Server
```bash
# SSH to your server
ssh user@10.14.177.97

# Install nginx
sudo apt update
sudo apt install nginx -y

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2. Deploy Your Site
```bash
# On your Mac, rsync files to server
cd /Users/kondapus/Desktop/glcp/hol
rsync -avz --exclude '.git' . user@10.14.177.97:/var/www/html/hol-labs/

# Or use scp
scp -r * user@10.14.177.97:/var/www/html/hol-labs/
```

#### 3. Configure Nginx
```bash
# On server
sudo nano /etc/nginx/sites-available/hol-labs

# Add this configuration:
server {
    listen 80;
    server_name 10.14.177.97;
    root /var/www/html/hol-labs;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable markdown viewer
    location ~ \.md$ {
        default_type text/plain;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/hol-labs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Access Your Portfolio
- **Internal URL**: http://10.14.177.97/
- **Only accessible within HPE network**

---

## 🎯 **Option 3: HYBRID APPROACH (BEST)**

Use both for maximum reach:

### GitHub Pages (Internet)
- **URL**: https://sathwik-hpe.github.io/hol-poc-please-delete/
- **Audience**: Job applications, external recruiters, conferences
- **Access**: Anyone, anywhere

### HPE Server (Internal)
- **URL**: http://10.14.177.97/
- **Audience**: HPE colleagues, internal demos
- **Access**: HPE network only

### Deployment Script
```bash
#!/bin/bash
# deploy.sh - Deploy to both GitHub and HPE server

echo "📦 Deploying to GitHub Pages..."
git add .
git commit -m "Update portfolio $(date +%Y-%m-%d)"
git push origin main

echo "🏢 Deploying to HPE server..."
rsync -avz --exclude '.git' . user@10.14.177.97:/var/www/html/hol-labs/

echo "✅ Deployed to both locations!"
echo "🌐 GitHub: https://sathwik-hpe.github.io/hol-poc-please-delete/"
echo "🏢 HPE: http://10.14.177.97/"
```

---

## 📝 **What to Share in Job Applications**

### For External Jobs
```
Portfolio: https://sathwik-hpe.github.io/hol-poc-please-delete/
GitHub: https://github.com/sathwik-hpe/hol-poc-please-delete

Highlights:
- 8 hands-on Kubernetes labs
- 12 technical blog posts
- Production-ready examples
- CKA exam preparation materials
```

### For Internal HPE Opportunities
```
Portfolio: http://10.14.177.97/
GitHub: https://github.com/sathwik-hpe/hol-poc-please-delete

This lab environment demonstrates expertise in:
- HPE GreenLake Private Cloud
- Kubernetes ecosystem (ArgoCD, Helm, Istio)
- Cloud-native best practices
```

---

## 🚀 **Quick Start (Recommended Path)**

### Step 1: Push to GitHub (2 minutes)
```bash
cd /Users/kondapus/Desktop/glcp/hol
git add .
git commit -m "Complete K8s portfolio - 8 labs, 12 blogs"
git push origin main
```

### Step 2: Enable GitHub Pages (1 minute)
1. Go to repo settings
2. Enable Pages with GitHub Actions
3. Wait 2-3 minutes for deployment

### Step 3: Share Your Link (Done!)
```
https://sathwik-hpe.github.io/hol-poc-please-delete/
```

---

## 🔧 **Troubleshooting**

### GitHub Pages Not Working?
```bash
# Check Actions tab for deployment status
# https://github.com/sathwik-hpe/hol-poc-please-delete/actions

# Ensure index.html is in root
ls -la index.html

# Check Pages settings
# Repo Settings → Pages → Source: GitHub Actions
```

### HPE Server Issues?
```bash
# Check nginx status
sudo systemctl status nginx

# Check logs
sudo tail -f /var/log/nginx/error.log

# Test locally on server
curl http://localhost/
```

---

## 📊 **Comparison**

| Feature | GitHub Pages | HPE Server | Hybrid |
|---------|-------------|------------|--------|
| **Cost** | Free | Server costs | Server costs |
| **Global Access** | ✅ | ❌ | ✅ |
| **HPE Access** | ✅ | ✅ | ✅ |
| **Setup Time** | 5 min | 30 min | 35 min |
| **Maintenance** | None | Updates needed | Minimal |
| **HTTPS** | Auto | Manual | Mixed |
| **Custom Domain** | ✅ | ✅ | ✅ |
| **Best For** | Job search | Internal demos | Both |

---

## 🎯 **My Recommendation**

**Start with GitHub Pages** (Option 1):
1. ✅ 5-minute setup
2. ✅ Zero maintenance
3. ✅ Global accessibility
4. ✅ Professional URL
5. ✅ Perfect for job applications

**Add HPE Server Later** (if needed):
- For internal demos
- For faster HPE access
- For company-specific content

---

## ✅ **Next Actions**

1. **Push to GitHub** (do this now!)
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol
   git add .
   git commit -m "Deploy complete portfolio"
   git push origin main
   ```

2. **Enable GitHub Pages**
   - Settings → Pages → Source: GitHub Actions

3. **Wait 2-3 minutes**
   - Check: https://sathwik-hpe.github.io/hol-poc-please-delete/

4. **Update your resume/LinkedIn**
   - Add portfolio link
   - Show off your work!

---

**Your portfolio will be live and accessible to recruiters worldwide in under 5 minutes!** 🚀
