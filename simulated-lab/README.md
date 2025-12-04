# HPE SilverCreek Hands-On Labs - Simulated Environment

This is a **fully simulated** version of the HPE SilverCreek hands-on labs that works completely offline. It includes dummy pages that simulate the actual platform interface.

## Features

- 🎭 Complete simulation - no real system required
- 🔒 Fake login page with mock authentication
- 📊 Mock dashboard with dummy data
- 🛠️ Simulated support bundle generation
- 💾 Simulated backup creation interface
- ✅ All interactions work without internet connection

## How to Run

1. Open Terminal and navigate to this directory:
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/simulated-lab
   ```

2. Start the local server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open your browser and go to:
   ```
   http://localhost:8000
   ```

4. Follow the exercises - all pages are simulated!

## Differences from Real Lab

- **Real Lab**: Uses actual HPE GreenLake system (op360-g10s06-vm04.hstlabs.glcp.hpecorp.net)
- **Simulated Lab**: Uses local dummy pages with fake data and interactions

## Use Cases

- **Simulated Lab**: Practice offline, demo without credentials, training prep
- **Real Lab**: Actual system testing, production workflows, real data validation

## Credentials (Dummy)

These credentials are for the simulated environment only:
- **URL**: http://localhost:8000/mock-platform/login.html
- **Username**: admin@silvercreek.local
- **Password**: Demo@123
