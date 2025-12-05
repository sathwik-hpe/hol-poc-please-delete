# Testing Guide - Velero Lab Updates

This guide helps you test the two fixes that were just implemented.

## Test 1: Verify Simulated Lab Removed ✅

### What Was Fixed
The landing page previously had a "Simulated Lab" card that linked to a non-existent page, causing 404 errors. This has been removed.

### How to Test

1. **Start the lab server:**
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/velero-lab
   python3 -m http.server 8000
   ```

2. **Open browser:**
   ```
   http://localhost:8000
   ```

3. **Expected Result:**
   - ✅ You should see ONE card: "Velero Hands-On Lab"
   - ✅ The card has button "Start Lab →"
   - ✅ Clicking it takes you to Exercise 1
   - ✅ No 404 errors
   - ✅ No mention of "Simulated Lab"

4. **Previous Behavior (Now Fixed):**
   - ❌ Used to show TWO cards
   - ❌ "Simulated Lab" link gave 404 error

---

## Test 2: Interactive Terminal Embedding 💻

This is more involved and has multiple test scenarios.

### Scenario A: WITHOUT Terminal Server (Fallback Mode)

This tests that the lab works fine even without the terminal server.

1. **Start ONLY the lab server:**
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/velero-lab
   python3 -m http.server 8000
   ```

2. **Open browser:**
   ```
   http://localhost:8000/real-lab/index.html
   ```

3. **Expected Result:**
   - ⚠️ You see instructions panel on left (40%)
   - ⚠️ Terminal panel on right shows:
     - 🔴 Red indicator
     - Text: "Terminal server not running"
     - Setup instructions for ttyd
     - Suggestion to use own terminal
   - ✅ All commands still copy-pasteable
   - ✅ Lab is fully usable with external terminal

4. **What This Tests:**
   - Graceful fallback when terminal server unavailable
   - Clear instructions on how to set it up
   - Lab still works without embedded terminal

---

### Scenario B: WITH Terminal Server (Embedded Terminal)

This tests the full embedded terminal experience.

#### Option 1: Using ttyd (Recommended)

1. **Install ttyd (if not already):**
   ```bash
   brew install ttyd
   ```

2. **Start terminal server in Terminal 1:**
   ```bash
   ttyd -p 7681 -W zsh
   ```
   
   You should see:
   ```
   [INFO] Listening on port: 7681
   ```

3. **Start lab server in Terminal 2:**
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/velero-lab
   python3 -m http.server 8000
   ```

4. **Open browser:**
   ```
   http://localhost:8000/real-lab/index.html
   ```

5. **Expected Result:**
   - ✅ Left panel: Instructions (40%)
   - ✅ Right panel: Shows connection status
   - ✅ Status indicator: 🟢 Green dot
   - ✅ Text: "Connected to terminal server"
   - ✅ Embedded terminal visible in right panel
   - ✅ Terminal is interactive (can type commands)
   - ✅ Terminal shows your actual zsh prompt
   - ✅ Commands execute in real-time

6. **Test Interactivity:**
   ```bash
   # In the embedded terminal, try:
   pwd
   ls
   kubectl cluster-info
   echo "Hello from embedded terminal!"
   ```
   
   All should work just like a regular terminal!

#### Option 2: Using Automated Start Script

1. **Use the start script:**
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/velero-lab
   ./start-lab.sh
   ```

2. **Expected Output:**
   ```
   ╔═══════════════════════════════════════════════════════════════╗
   ║                  Velero Lab Startup                           ║
   ╚═══════════════════════════════════════════════════════════════╝
   
   ✓ ttyd found - will use ttyd for terminal
   
   🚀 Starting ttyd terminal server on port 7681...
   ✓ Terminal server running at http://localhost:7681
   
   🌐 Starting lab web server on port 8000...
   
   ╔═══════════════════════════════════════════════════════════════╗
   ║                    🎉 Lab Ready!                              ║
   ╚═══════════════════════════════════════════════════════════════╝
   
   📖 Lab Interface:      http://localhost:8000
   💻 Terminal Server:    http://localhost:7681
   
   Press Ctrl+C to stop all servers
   ```

3. **Open browser:**
   ```
   http://localhost:8000
   ```

4. **Expected Result:**
   - Same as Scenario B, Option 1
   - Embedded terminal fully functional
   - To stop: Press Ctrl+C in the terminal running start-lab.sh

---

### Scenario C: Connection Lost/Reconnect

This tests the reconnection functionality.

1. **Start with terminal server running (Scenario B)**

2. **While lab is open, kill terminal server:**
   - Find the terminal running ttyd
   - Press Ctrl+C to stop it

3. **Expected Result in Browser:**
   - 🔴 Status changes to red
   - Text: "Terminal server not running"
   - "Reconnect" button appears
   - Fallback instructions appear

4. **Restart terminal server:**
   ```bash
   ttyd -p 7681 -W zsh
   ```

5. **Click "Reconnect" button**

6. **Expected Result:**
   - 🟠 Status briefly shows orange (connecting)
   - 🟢 Changes to green
   - Terminal frame reappears
   - Terminal is functional again

---

### Scenario D: Standalone Terminal Test

Test the terminal server independently.

1. **Start terminal server:**
   ```bash
   ttyd -p 7681 -W zsh
   ```

2. **Open browser directly to terminal:**
   ```
   http://localhost:7681
   ```

3. **Expected Result:**
   - Full-screen terminal interface
   - Xterm.js terminal with dark theme
   - Fully interactive
   - Shows your actual shell

4. **What This Tests:**
   - Terminal server works standalone
   - Can be used independently of lab
   - Useful for debugging

---

## Test 3: Node.js Terminal Server (Optional)

If you want to test the custom Node.js server instead of ttyd:

1. **Install dependencies:**
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/velero-lab/terminal-server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or:
   ```bash
   node server.js
   ```

3. **Expected Output:**
   ```
   Terminal server running on http://localhost:7681
   WebSocket endpoint: ws://localhost:7681/terminal
   ```

4. **Test standalone:**
   ```
   http://localhost:7681
   ```

5. **Test with lab:**
   - Start lab server in another terminal
   - Open lab page
   - Should work exactly like with ttyd

---

## Test 4: Multiple Browsers/Windows

1. **With terminal server running:**
   - Open lab in Chrome: `http://localhost:8000`
   - Open lab in Safari: `http://localhost:8000`
   - Open terminal standalone: `http://localhost:7681`

2. **Expected Result:**
   - Each browser window gets its own terminal session
   - Commands in one window don't affect others
   - All terminals work independently

---

## Test 5: Lab Functionality Without Modifying Existing Pages

This tests that the embedded terminal component can be added to pages without breaking them.

1. **Check existing lab pages (not yet modified):**
   ```
   http://localhost:8000/real-lab/index.html  (Exercise 1)
   http://localhost:8000/real-lab/lab2.html   (Exercise 2)
   ```

2. **Expected Result:**
   - Pages still work as before
   - Show terminal instructions in right panel
   - All copy buttons work
   - No errors in browser console

3. **To Add Terminal Later:**
   - Follow TERMINAL-INTEGRATION.md guide
   - Copy component from components/terminal-embed.html
   - Paste into terminal-panel section

---

## Troubleshooting Tests

### Test: Port Already in Use

1. **Start ttyd twice:**
   ```bash
   ttyd -p 7681 -W zsh  # First instance
   ttyd -p 7681 -W zsh  # Second instance - should fail
   ```

2. **Expected Error:**
   ```
   [ERROR] bind: Address already in use
   ```

3. **Solution Test:**
   ```bash
   # Find the process
   lsof -i :7681
   
   # Kill it
   kill -9 <PID>
   
   # Or use different port
   ttyd -p 8888 -W zsh
   ```

### Test: Browser Console

1. **Open browser dev tools (F12 or Cmd+Opt+I)**
2. **Go to Console tab**
3. **Load lab page**
4. **Expected Messages:**
   - WITH terminal: `"WebSocket connected"` or similar
   - WITHOUT terminal: Fetch error (expected, shows fallback)
5. **No other errors should appear**

---

## Success Criteria

### Issue 1: Simulated Lab Removed ✅
- ✅ Landing page shows single card
- ✅ No 404 errors
- ✅ Direct path to real lab

### Issue 2: Interactive Terminal ✅
- ✅ Auto-detects terminal server
- ✅ Embeds terminal when available
- ✅ Shows fallback when not available
- ✅ Terminal is fully interactive
- ✅ Can reconnect if disconnected
- ✅ Lab still works without terminal
- ✅ Documentation clear and comprehensive

---

## Quick Verification Commands

```bash
# Check all files created
ls -la /Users/kondapus/Desktop/glcp/hol/velero-lab/ | grep -E 'TERMINAL|QUICK|start-lab|components|terminal-server'

# Verify no simulated-lab references
grep -r "simulated-lab" /Users/kondapus/Desktop/glcp/hol/velero-lab/index.html
# Should return nothing (exit code 1)

# Test start script is executable
ls -l /Users/kondapus/Desktop/glcp/hol/velero-lab/start-lab.sh | grep "x"

# Count documentation files
find /Users/kondapus/Desktop/glcp/hol/velero-lab -name "*.md" | wc -l
# Should show: 5 (README, QUICKSTART, TERMINAL-SETUP, TERMINAL-INTEGRATION, and any others)
```

---

## What to Report as Success

✅ **Issue 1 Fixed:**
- "Simulated lab card removed from landing page"
- "No 404 errors when navigating"

✅ **Issue 2 Fixed:**
- "Terminal server starts successfully with ttyd"
- "Lab detects and embeds terminal automatically"
- "Fallback instructions appear when terminal unavailable"
- "Terminal is fully interactive and responsive"
- "Can execute kubectl and other commands in embedded terminal"

---

## Next Steps After Testing

If both issues are confirmed fixed:

1. **Start using the lab:**
   ```bash
   ./start-lab.sh
   ```

2. **Optional: Add terminal to other lab pages**
   - Follow TERMINAL-INTEGRATION.md
   - Copy from components/terminal-embed.html
   - Customize as needed

3. **Optional: Complete remaining exercises**
   - Exercise 3: Disaster Recovery
   - Exercise 4: Multi-Phase Restore

4. **Share with others:**
   - The lab is fully self-contained
   - Others can run ./start-lab.sh and go
   - Documentation is comprehensive
