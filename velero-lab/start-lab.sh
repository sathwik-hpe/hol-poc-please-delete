#!/bin/bash

# Velero Lab Startup Script
# This script starts both the lab web server and the interactive terminal server

set -e

LAB_DIR="/Users/kondapus/Desktop/glcp/hol/velero-lab"
LAB_PORT=8000
TERMINAL_PORT=7681

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  Velero Lab Startup                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if ttyd is installed
if command -v ttyd &> /dev/null; then
    echo "✓ ttyd found - will use ttyd for terminal"
    TERMINAL_METHOD="ttyd"
elif [ -d "$LAB_DIR/terminal-server/node_modules" ]; then
    echo "✓ Node.js terminal server found"
    TERMINAL_METHOD="node"
else
    echo "⚠️  No terminal server found!"
    echo ""
    echo "Please install ttyd for interactive terminal support:"
    echo "  brew install ttyd"
    echo ""
    echo "Or setup Node.js terminal server:"
    echo "  cd $LAB_DIR/terminal-server"
    echo "  npm install"
    echo ""
    read -p "Continue without interactive terminal? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    TERMINAL_METHOD="none"
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start terminal server in background
if [ "$TERMINAL_METHOD" = "ttyd" ]; then
    echo ""
    echo "🚀 Starting ttyd terminal server on port $TERMINAL_PORT..."
    ttyd -p $TERMINAL_PORT -W zsh &
    TERMINAL_PID=$!
    sleep 2
    echo "✓ Terminal server running at http://localhost:$TERMINAL_PORT"
elif [ "$TERMINAL_METHOD" = "node" ]; then
    echo ""
    echo "🚀 Starting Node.js terminal server on port $TERMINAL_PORT..."
    cd "$LAB_DIR/terminal-server"
    PORT=$TERMINAL_PORT node server.js &
    TERMINAL_PID=$!
    sleep 2
    echo "✓ Terminal server running at http://localhost:$TERMINAL_PORT"
fi

# Start lab web server
echo ""
echo "🌐 Starting lab web server on port $LAB_PORT..."
cd "$LAB_DIR"
python3 -m http.server $LAB_PORT &
LAB_PID=$!
sleep 2

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 Lab Ready!                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "📖 Lab Interface:      http://localhost:$LAB_PORT"
if [ "$TERMINAL_METHOD" != "none" ]; then
    echo "💻 Terminal Server:    http://localhost:$TERMINAL_PORT"
fi
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for background jobs
wait
