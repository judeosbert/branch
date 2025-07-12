#!/bin/bash

# Fix for blank page issue in React app
echo "=== Fixing Blank Page Issue ==="

cd /Users/jude.osby/personal/comfy

echo "1. Installing dependencies..."
npm install

echo "2. Clearing build cache..."
rm -rf dist
rm -rf node_modules/.vite

echo "3. Building with simple app first..."
npm run build

echo "4. Checking built files..."
if [ -f "dist/index.html" ]; then
    echo "✓ dist/index.html exists"
    echo "Content of dist/index.html:"
    cat dist/index.html
else
    echo "✗ dist/index.html not found"
    exit 1
fi

echo "5. Testing with simple app..."
echo "Opening simple app in browser..."
open dist/index.html

echo "6. If simple app works, will restore full app..."
read -p "Press Enter after checking if simple app works..."

# Restore full app
echo "7. Restoring full app..."
sed -i '' 's/App-simple.tsx/App.tsx/' src/main.tsx

echo "8. Rebuilding with full app..."
rm -rf dist
npm run build

echo "9. Testing full app..."
open dist/index.html

echo "=== Done ==="
echo "If still blank, check browser console for errors"
