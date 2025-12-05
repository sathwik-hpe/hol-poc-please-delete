# How to Add Embedded Terminal to Lab Pages

This guide shows you how to integrate the interactive embedded terminal into your lab HTML pages.

## Quick Integration

### Step 1: Add Terminal Status and Embed Section

In your `terminal-panel` div, replace the terminal-instructions section with:

```html
<!-- Terminal Panel -->
<div class="terminal-panel">
    <div class="terminal-header">
        <h3>💻 Interactive Terminal</h3>
    </div>
    
    <!-- Embedded Terminal Component -->
    <div class="terminal-embed-container">
        <!-- Connection Status -->
        <div id="terminal-status" class="terminal-status">
            <span class="status-indicator" id="status-indicator">●</span>
            <span id="status-text">Checking terminal server...</span>
            <button id="reconnect-btn" class="reconnect-btn" style="display: none;" onclick="reconnectTerminal()">Reconnect</button>
        </div>
        
        <!-- Embedded Terminal iframe -->
        <iframe 
            id="terminal-frame"
            src="http://localhost:7681"
            style="width: 100%; height: calc(100vh - 150px); border: none; background: #1e1e1e; display: none;"
            title="Interactive Terminal"
            allow="clipboard-read; clipboard-write">
        </iframe>
        
        <!-- Fallback Instructions -->
        <div id="terminal-fallback" style="display: none;">
            <div class="terminal-instructions">
                <h3>⚠️ Interactive Terminal Not Available</h3>
                <p>The embedded terminal requires a terminal server to be running.</p>
                
                <h4 style="margin-top: 15px;">Quick Setup:</h4>
                <div class="code-block">
                    <button class="copy-btn" onclick="copyCode(this)">Copy</button>
                    <pre>brew install ttyd
ttyd -p 7681 -W zsh</pre>
                </div>
                
                <p style="margin-top: 15px;">Then refresh this page, or use your own terminal app.</p>
            </div>
        </div>
    </div>
</div>
```

### Step 2: Add CSS Styles

Add this CSS before the closing `</head>` tag or in your styles.css:

```html
<style>
.terminal-embed-container {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.terminal-status {
    background: #2d3748;
    color: white;
    padding: 10px 15px;
    border-radius: 5px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9em;
}

.status-indicator {
    font-size: 1.5em;
    animation: pulse 2s infinite;
}

.status-indicator.connected {
    color: #48bb78;
    animation: none;
}

.status-indicator.disconnected {
    color: #f56565;
    animation: none;
}

.status-indicator.connecting {
    color: #ed8936;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.reconnect-btn {
    background: #667eea;
    color: white;
    border: none;
    padding: 5px 15px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    margin-left: auto;
}

.reconnect-btn:hover {
    background: #5568d3;
}

#terminal-fallback {
    flex: 1;
    overflow-y: auto;
}
</style>
```

### Step 3: Add JavaScript

Add this JavaScript before the closing `</body>` tag:

```html
<script>
let terminalCheckInterval;
let terminalAvailable = false;

async function checkTerminalServer() {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const frame = document.getElementById('terminal-frame');
    const fallback = document.getElementById('terminal-fallback');
    const reconnectBtn = document.getElementById('reconnect-btn');
    
    try {
        const response = await fetch('http://localhost:7681', {
            method: 'HEAD',
            mode: 'no-cors'
        });
        
        terminalAvailable = true;
        indicator.className = 'status-indicator connected';
        statusText.textContent = 'Connected to terminal server';
        frame.style.display = 'block';
        fallback.style.display = 'none';
        reconnectBtn.style.display = 'none';
        
        if (terminalCheckInterval) {
            clearInterval(terminalCheckInterval);
        }
        
    } catch (error) {
        terminalAvailable = false;
        indicator.className = 'status-indicator disconnected';
        statusText.textContent = 'Terminal server not running';
        frame.style.display = 'none';
        fallback.style.display = 'block';
        reconnectBtn.style.display = 'block';
    }
}

function reconnectTerminal() {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    indicator.className = 'status-indicator connecting';
    statusText.textContent = 'Connecting...';
    
    setTimeout(checkTerminalServer, 1000);
}

// Check on page load
checkTerminalServer();

// Check every 5 seconds
terminalCheckInterval = setInterval(checkTerminalServer, 5000);
setTimeout(() => {
    if (terminalCheckInterval) {
        clearInterval(terminalCheckInterval);
    }
}, 60000);
</script>
```

## Testing

1. **Without terminal server** (should show fallback):
   ```bash
   cd velero-lab
   python3 -m http.server 8000
   # Open http://localhost:8000/real-lab/index.html
   ```

2. **With terminal server** (should show embedded terminal):
   ```bash
   # Terminal 1:
   ttyd -p 7681 -W zsh
   
   # Terminal 2:
   cd velero-lab
   python3 -m http.server 8000
   
   # Open http://localhost:8000/real-lab/index.html
   ```

## What Users See

### When Terminal Server is Running:
- ✅ Green indicator: "Connected to terminal server"
- Embedded terminal frame showing live shell
- Can type commands directly in browser

### When Terminal Server is NOT Running:
- 🔴 Red indicator: "Terminal server not running"
- Setup instructions with copy-paste commands
- "Reconnect" button to retry
- Reminder that they can use their own terminal

## Customization

### Change Terminal Server Port

Update in 3 places:
1. `ttyd -p YOUR_PORT`
2. iframe src: `http://localhost:YOUR_PORT`
3. fetch URL in checkTerminalServer()

### Change Check Interval

```javascript
// Check every 10 seconds instead of 5
terminalCheckInterval = setInterval(checkTerminalServer, 10000);
```

### Auto-reconnect

```javascript
// Keep trying to reconnect forever
setInterval(checkTerminalServer, 5000);
// Remove the setTimeout that stops checking
```

## Alternative: Using Node.js Terminal Server

Instead of ttyd, you can use the custom Node.js server:

```bash
# Setup once:
cd velero-lab/terminal-server
npm install

# Start server:
npm start
```

The server runs on port 7681 by default, so no code changes needed!

## Security Note

⚠️ **These terminal servers are for LOCAL USE ONLY!**

- Only run on `localhost`
- Never expose to public internet
- For remote access, use SSH tunneling
- Consider read-only mode for demos

## Full Example

See the file at: `/Users/kondapus/Desktop/glcp/hol/velero-lab/components/terminal-embed.html`

This contains a ready-to-use component that can be copy-pasted into any page.
