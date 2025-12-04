# HPE SilverCreek Hands-On Labs

Welcome! This repository contains hands-on lab exercises for HPE SilverCreek platform.

## 📋 Prerequisites

You need **Python 3** installed on your system to run the local web server.

### Installing Python 3

#### macOS
```bash
# Install using Homebrew (recommended)
brew install python3

# Verify installation
python3 --version
```

If you don't have Homebrew installed, first install it:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Windows
1. Download Python from [python.org](https://www.python.org/downloads/)
2. Run the installer
3. **Important**: Check "Add Python to PATH" during installation
4. Verify installation in Command Prompt:
   ```cmd
   python --version
   ```

#### Linux
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install python3

# Fedora/RHEL
sudo dnf install python3

# Verify installation
python3 --version
```

## 🚀 Getting Started

### 1. Clone this repository
```bash
git clone <your-repo-url>
cd hol
```

### 2. Choose your lab environment

We provide two lab environments:

#### 🎭 **Simulated Lab** (Recommended for Learning)
- Runs 100% offline
- No system credentials needed
- Perfect for practice and training

#### 🏢 **Real Lab** (For Production Testing)
- Connects to actual HPE GreenLake system
- Requires system credentials
- Real operations with live data

## 🖥️ Running the Labs

### Option 1: Choose from Selector Page

1. Start the server from the main directory:
   ```bash
   python3 -m http.server 8000
   ```

2. Open your browser and go to:
   ```
   http://localhost:8000/index-selector.html
   ```

3. Click on either **Real Lab** or **Simulated Lab**

### Option 2: Run Simulated Lab Directly

1. Navigate to simulated lab:
   ```bash
   cd simulated-lab
   python3 -m http.server 8000
   ```

2. Open: **http://localhost:8000**

### Option 3: Run Real Lab Directly

1. Navigate to real lab:
   ```bash
   cd real-lab
   python3 -m http.server 8000
   ```

2. Open: **http://localhost:8000**

## 📚 Lab Exercises

Both environments include 4 exercises:

1. **Exercise 1**: Login & Workspace Selection
2. **Exercise 2**: Dashboard Navigation
3. **Exercise 3**: Generate Support Bundle
4. **Exercise 4**: Create System Backup

## 🔑 Credentials

### Simulated Lab (Demo)
- Username: `admin@silvercreek.local`
- Password: `Demo@123`

### Real Lab (Actual System)
- See `real-lab/README.md` for credentials

## 🆘 Troubleshooting

**Port already in use?**
```bash
# Use a different port
python3 -m http.server 8080
```

**Pop-ups blocked?**
- Allow pop-ups for localhost in your browser settings

**Python command not found?**
- On Windows, try `python` instead of `python3`
- Ensure Python is added to your PATH

## 📖 More Information

- **Simulated Lab**: See `simulated-lab/README.md`
- **Real Lab**: See `real-lab/README.md`

## 💡 Quick Tips

- Start with the **Simulated Lab** if you're new
- The simulated environment is perfect for demos and training
- Use the **Real Lab** when you need actual system testing

---

**Happy Learning! 🎓**
# hol-poc-please-delete
