const express = require('express');
const expressWs = require('express-ws');
const pty = require('node-pty');
const os = require('os');

const app = express();
expressWs(app);

// Enable CORS for lab interface
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Serve xterm.js and addons
app.use('/xterm', express.static('node_modules/xterm/css'));
app.use('/xterm-js', express.static('node_modules/xterm/lib'));
app.use('/xterm-addon-fit', express.static('node_modules/xterm-addon-fit/lib'));
app.use('/xterm-addon-web-links', express.static('node_modules/xterm-addon-web-links/lib'));

// WebSocket endpoint for terminal
app.ws('/terminal', (ws, req) => {
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'zsh';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  console.log('Terminal session started');

  // Send data from PTY to WebSocket
  ptyProcess.on('data', (data) => {
    try {
      ws.send(data);
    } catch (error) {
      console.error('Error sending data to WebSocket:', error);
    }
  });

  // Receive data from WebSocket and send to PTY
  ws.on('message', (msg) => {
    ptyProcess.write(msg);
  });

  // Handle resize
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'resize') {
        ptyProcess.resize(data.cols, data.rows);
      }
    } catch (error) {
      // Not a JSON message, treat as terminal input
      ptyProcess.write(msg);
    }
  });

  // Clean up on close
  ws.on('close', () => {
    console.log('Terminal session ended');
    ptyProcess.kill();
  });

  ptyProcess.on('exit', () => {
    try {
      ws.close();
    } catch (error) {
      // Already closed
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Terminal server running' });
});

// Simple HTML page to test terminal
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Terminal</title>
    <link rel="stylesheet" href="/xterm/xterm.css" />
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #1e1e1e;
            font-family: 'Courier New', monospace;
        }
        #terminal {
            width: 100%;
            height: 600px;
        }
        .header {
            color: #fff;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Interactive Terminal - Velero Lab</h2>
        <p>Connected to your local shell</p>
    </div>
    <div id="terminal"></div>
    
    <script src="/xterm-js/xterm.js"></script>
    <script src="/xterm-addon-fit/xterm-addon-fit.js"></script>
    <script src="/xterm-addon-web-links/xterm-addon-web-links.js"></script>
    <script>
        const term = new Terminal({
            cursorBlink: true,
            theme: {
                background: '#1e1e1e',
                foreground: '#f0f0f0'
            }
        });
        
        const fitAddon = new FitAddon.FitAddon();
        term.loadAddon(fitAddon);
        term.loadAddon(new WebLinksAddon.WebLinksAddon());
        
        term.open(document.getElementById('terminal'));
        fitAddon.fit();
        
        const ws = new WebSocket('ws://' + location.host + '/terminal');
        
        ws.onopen = () => {
            console.log('WebSocket connected');
            term.writeln('\\x1b[32mConnected to terminal server\\x1b[0m');
        };
        
        ws.onmessage = (event) => {
            term.write(event.data);
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            term.writeln('\\x1b[31mConnection error\\x1b[0m');
        };
        
        ws.onclose = () => {
            console.log('WebSocket closed');
            term.writeln('\\x1b[31mConnection closed\\x1b[0m');
        };
        
        term.onData((data) => {
            ws.send(data);
        });
        
        // Handle resize
        window.addEventListener('resize', () => {
            fitAddon.fit();
            ws.send(JSON.stringify({
                type: 'resize',
                cols: term.cols,
                rows: term.rows
            }));
        });
    </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 7681;
app.listen(PORT, () => {
  console.log(`Terminal server running on http://localhost:${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/terminal`);
});
