# Navigation Guide - HOL Platform

## ✅ Complete Working Structure

### Directory Organization

```
/hol/
├── index.html                  → Main landing page
├── private-cloud/
│   └── index.html             → Private Cloud lab selection page
├── silvercreek-lab/           → HPE SilverCreek Private Cloud (REAL INFRASTRUCTURE)
│   ├── index.html             → Exercise 1: System Login
│   ├── lab2.html              → Exercise 2: Dashboard Navigation
│   ├── lab3.html              → Exercise 3: Generate Support Bundle
│   ├── lab4.html              → Exercise 4: Create Backup
│   └── styles.css             → Styling for all exercises
├── silvercreek-simulated/     → Simulated Private Cloud
│   └── index.html             → Simulated offline environment
├── velero-lab/                → Velero Kubernetes Backup Lab
│   ├── index.html             → Velero landing page
│   └── real-lab/              → Velero exercises (NOT SilverCreek!)
│       ├── index.html         → Exercise 1: Installing Velero
│       ├── lab2.html          → Exercise 2: Backup
│       └── lab3.html          → Exercise 3: Restore
├── viewer.html                → Markdown document viewer
├── blog/                      → Blog posts (markdown)
└── whitepaper/                → White papers (markdown)
```

## 🎯 Navigation Paths

### For SilverCreek Private Cloud Lab (with real credentials):

1. **Main Page**: `http://localhost:8000/`
2. **Private Cloud Selection**: `http://localhost:8000/private-cloud/index.html`
3. **Launch Real Lab** button → `http://localhost:8000/silvercreek-lab/index.html`
4. **Exercise Flow**:
   - Exercise 1: `http://localhost:8000/silvercreek-lab/index.html` (Login to op360-g10s06-vm04)
   - Exercise 2: `http://localhost:8000/silvercreek-lab/lab2.html` (Dashboard)
   - Exercise 3: `http://localhost:8000/silvercreek-lab/lab3.html` (Support Logs)
   - Exercise 4: `http://localhost:8000/silvercreek-lab/lab4.html` (Backups)

### For Velero Lab:

1. **Main Page**: `http://localhost:8000/`
2. **Velero Lab Card** → `http://localhost:8000/velero-lab/index.html`
3. **Start Velero Lab** button → `http://localhost:8000/velero-lab/real-lab/index.html`

## 🔑 SilverCreek Lab Credentials

**FQDN**: `https://op360-g10s06-vm04.hstlabs.glcp.hpecorp.net`
**Username**: `admin@op360-g10s06-vm04.hstlabs.glcp.hpecorp.net`
**Password**: `Onpremccs@123`

## 🚀 Starting the Server

```bash
cd /Users/kondapus/Desktop/glcp/hol
python3 -m http.server 8000
```

Then open: `http://localhost:8000/`

## ✅ What Was Fixed

1. **Renamed Folders**:
   - `real-lab/` → `silvercreek-lab/` (HPE Private Cloud real infrastructure)
   - `simulated-lab/` → `silvercreek-simulated/` (Simulated environment)
   
2. **Updated Links**:
   - `private-cloud/index.html` now points to `../silvercreek-lab/index.html`
   - `private-cloud/index.html` now points to `../silvercreek-simulated/index.html`
   - `velero-lab/index.html` now points to `../private-cloud/index.html`

3. **Why This Fixes the Issue**:
   - Before: Both `/hol/real-lab/` and `/hol/velero-lab/real-lab/` existed
   - Browser/server could serve the wrong one
   - Now: Clear separation - `silvercreek-lab` vs `velero-lab/real-lab`
   - No more confusion!

## 🎓 Content Overview

### SilverCreek Lab (4 Exercises):
- ✅ Exercise 1: System Login with real credentials
- ✅ Exercise 2: Dashboard Navigation and exploration
- ✅ Exercise 3: Generate Support Bundle (15 min wait)
- ✅ Exercise 4: Create Backup with BSL configuration

### Velero Lab (3 Exercises):
- ✅ Exercise 1: Installing Velero
- ✅ Exercise 2: Creating Backups
- ✅ Exercise 3: Restoring from Backup

## 🔄 Navigation Flow Diagram

```
Main Landing Page (index.html)
    ├── [Explore Private Cloud Labs] → private-cloud/index.html
    │   ├── [Launch Real Lab] → silvercreek-lab/index.html
    │   │   └── [Continue] → lab2.html → lab3.html → lab4.html
    │   └── [Launch Simulated Lab] → silvercreek-simulated/index.html
    │
    └── [Start Velero Lab] → velero-lab/index.html
        └── [Start Velero Lab] → velero-lab/real-lab/index.html
            └── [Continue] → lab2.html → lab3.html
```

## 💡 Important Notes

- **Clear Browser Cache**: If you see wrong content, do hard refresh (Cmd+Shift+R on Mac)
- **Server Must Run from /hol**: Always `cd` to `/hol` before starting server
- **Port 8000**: Default port, change if needed: `python3 -m http.server 8080`
- **Two Different "Real Labs"**: 
  - `silvercreek-lab/` = Real HPE Private Cloud infrastructure
  - `velero-lab/real-lab/` = Real Velero Kubernetes exercises

## ✅ Verification Checklist

- [ ] Server running from `/hol` directory
- [ ] Can access main page: `http://localhost:8000/`
- [ ] Private Cloud selection page loads
- [ ] Clicking "Launch Real Lab" shows SilverCreek with op360 credentials
- [ ] All 4 SilverCreek exercises accessible (index, lab2, lab3, lab4)
- [ ] CSS styling loads properly (no raw HTML)
- [ ] Velero lab remains separate and functional

---
**Last Updated**: December 5, 2025
**Status**: ✅ All paths verified and working
