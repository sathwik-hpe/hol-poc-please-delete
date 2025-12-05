# Interactive Terminal Setup for Velero Lab

This guide explains how to embed a real, interactive terminal from your local system into the Velero lab web interface.

## Option 1: Using ttyd (Recommended - Simplest)

### What is ttyd?
`ttyd` is a simple command-line tool that shares your terminal over the web using WebSockets.

### Installation

#### macOS (using Homebrew):
```bash
brew install ttyd
```

#### Linux:
```bash
# Ubuntu/Debian
sudo apt install ttyd

# Or download from GitHub releases
wget https://github.com/tsl0922/ttyd/releases/download/1.7.4/ttyd.x86_64
chmod +x ttyd.x86_64
sudo mv ttyd.x86_64 /usr/local/bin/ttyd
```

### Running ttyd

```bash
# Start ttyd on port 7681 (default)
ttyd -p 7681 zsh

# Or with more options:
ttyd -p 7681 -W zsh  # -W allows write access
```

### Access the Terminal
Open in browser: `http://localhost:7681`

---

## Option 2: Using Xterm.js with WebSocket Server (Advanced)

This creates a more integrated solution within the lab interface.

### Setup Node.js Backend

1. **Create a new directory:**
```bash
cd /Users/kondapus/Desktop/glcp/hol/velero-lab
mkdir terminal-server
cd terminal-server
```

2. **Initialize Node.js project:**
```bash
npm init -y
```

3. **Install dependencies:**
```bash
npm install express ws node-pty xterm xterm-addon-fit xterm-addon-web-links
```

4. **I'll create the server file for you** (see terminal-server.js below)

5. **Start the server:**
```bash
node terminal-server.js
```

---

## Option 3: Using Gotty (Alternative)

### Installation
```bash
# macOS
brew install gotty

# Or download from: https://github.com/yudai/gotty/releases
```

### Running Gotty
```bash
gotty -p 8080 -w zsh
```

Access at: `http://localhost:8080`

---

## Integration with Lab

Once you have a terminal server running (ttyd, gotty, or custom), you can embed it in the lab pages using an iframe:

```html
<!-- Add this to the terminal-panel section -->
<iframe 
    src="http://localhost:7681" 
    style="width: 100%; height: 100%; border: none; background: #1e1e1e;"
    title="Interactive Terminal">
</iframe>
```

---

## Recommended Setup for This Lab

### Quick Start (Easiest):

1. **Install ttyd:**
   ```bash
   brew install ttyd
   ```

2. **Start ttyd in one terminal:**
   ```bash
   ttyd -p 7681 -W zsh
   ```

3. **Start the lab server in another terminal:**
   ```bash
   cd /Users/kondapus/Desktop/glcp/hol/velero-lab
   python3 -m http.server 8000
   ```

4. **The lab will automatically detect and embed the terminal!**

---

## Security Considerations

⚠️ **Important Security Notes:**

1. **Local Use Only**: These terminal servers should only be used on `localhost`
2. **Authentication**: For remote access, add authentication (ttyd supports `-c user:pass`)
3. **Network**: Never expose these ports to public internet without proper security
4. **Write Access**: Consider read-only mode for demonstrations

### Secure Remote Access (if needed):
```bash
# ttyd with basic auth
ttyd -p 7681 -c username:password zsh

# Or use SSH tunneling
ssh -L 7681:localhost:7681 user@remote-host
```

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
lsof -i :7681

# Kill the process
kill -9 <PID>

# Or use a different port
ttyd -p 8888 zsh
```

### WebSocket Connection Failed
- Check if the terminal server is running
- Verify the port in the iframe src matches the server port
- Check browser console for CORS errors

### Terminal Not Rendering
- Clear browser cache
- Check browser console for JavaScript errors
- Verify WebSocket support in your browser

---

## Comparison of Options

| Feature | ttyd | Gotty | Custom (Xterm.js) |
|---------|------|-------|-------------------|
| Setup Difficulty | ⭐ Easy | ⭐ Easy | ⭐⭐⭐ Complex |
| Customization | ⭐⭐ Limited | ⭐⭐ Limited | ⭐⭐⭐⭐⭐ Full |
| Performance | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| Maintained | ✅ Active | ⚠️ Less active | ✅ You control |
| Authentication | ✅ Built-in | ✅ Built-in | ⚠️ Must implement |

**Recommendation**: Use **ttyd** for this lab - it's simple, actively maintained, and works perfectly for local development.

---

## Next Steps

After setting up the terminal server, I'll update the lab HTML files to:
1. Auto-detect if terminal server is running
2. Embed the terminal in an iframe
3. Provide fallback instructions if terminal is not available
4. Add connection status indicator

Would you like me to proceed with integrating ttyd into the lab pages?
