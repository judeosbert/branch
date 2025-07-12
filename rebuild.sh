#!/bin/bash
cd /Users/jude.osby/personal/comfy

echo "Installing dependencies..."
npm install

echo "Building the project..."
rm -rf dist
npm run build

echo "Built files:"
ls -la dist/

echo "Testing the built app..."
echo "Content of dist/index.html:"
cat dist/index.html

echo "Opening browser..."
open dist/index.html

echo "Done!"
