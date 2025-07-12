#!/bin/bash
echo "Starting Branch app..."
cd /Users/jude.osby/personal/comfy

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Try to start the dev server
echo "Starting development server..."
npm run dev

echo "Server started. Check http://localhost:5173"
