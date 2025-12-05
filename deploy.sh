#!/bin/bash

# 🚀 Deploy HPE Labs Portfolio
# This script deploys your portfolio to GitHub Pages

set -e

echo "════════════════════════════════════════════════════════"
echo "🚀 Deploying HPE Labs Portfolio"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: index.html not found. Run this from the hol directory."
    exit 1
fi

# Check git status
echo "📋 Checking git status..."
git status

echo ""
echo "════════════════════════════════════════════════════════"
echo "📝 Please enter a commit message (or press Enter for default):"
read -p "Message: " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update portfolio $(date +%Y-%m-%d\ %H:%M)"
fi

echo ""
echo "════════════════════════════════════════════════════════"
echo "📦 Staging files..."
git add .

echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG" || echo "No changes to commit"

echo "🔄 Pushing to GitHub..."
git push origin main

echo ""
echo "════════════════════════════════════════════════════════"
echo "✅ Deployment initiated!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Check deployment status:"
echo "   https://github.com/sathwik-hpe/hol-poc-please-delete/actions"
echo ""
echo "🌐 Your portfolio will be live at:"
echo "   https://sathwik-hpe.github.io/hol-poc-please-delete/"
echo ""
echo "⏱️  Deployment usually takes 2-3 minutes"
echo ""
echo "════════════════════════════════════════════════════════"
