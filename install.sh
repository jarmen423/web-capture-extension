#!/bin/bash

# Web Capture Pro - Installation Script
# This script helps you install the extension in Chrome/Chromium

echo "====================================="
echo "Web Capture Pro - Installation Guide"
echo "====================================="
echo ""

# Check if files exist
echo "[1/4] Checking extension files..."
required_files=("manifest.json" "background.js" "content.js" "popup.html" "popup.js" "utils.js")
missing_files=0

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (MISSING)"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "ERROR: Missing $missing_files required files!"
    echo "Please ensure all extension files are present."
    exit 1
fi

echo ""
echo "[2/4] Extension files verified!"
echo ""
echo "Current directory: $(pwd)"
echo ""

# Instructions
echo "[3/4] Installation Instructions:"
echo ""
echo "Manual Installation (Chrome/Chromium):"
echo "  1. Open Chrome and navigate to: chrome://extensions/"
echo "  2. Enable 'Developer mode' (toggle in top-right corner)"
echo "  3. Click 'Load unpacked' button"
echo "  4. Select this directory: $(pwd)"
echo "  5. Extension will appear in your toolbar"
echo ""
echo "Alternative - Drag and Drop:"
echo "  1. Open: chrome://extensions/"
echo "  2. Enable 'Developer mode'"
echo "  3. Drag this entire folder into the extensions page"
echo ""

# Quick start
echo "[4/4] Quick Start Guide:"
echo ""
echo "After installation:"
echo "  1. Click the extension icon in toolbar"
echo "  2. Select mode (Screenshots or Text)"
echo "  3. Enter starting URL"
echo "  4. Set max pages and delay"
echo "  5. Click 'Start Capture'"
echo "  6. Wait for completion"
echo "  7. Click 'Export' to download"
echo ""
echo "For detailed help, click the 'ℹ️ Help' button in the extension popup."
echo ""
echo "====================================="
echo "Installation guide complete!"
echo "====================================="
