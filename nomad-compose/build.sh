#!/bin/bash

# Build script for nomad-compose package

set -e

echo "🚀 Building nomad-compose package..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the nomad-compose directory."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf lib/ dist/ node_modules/

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript..."
npm run build

# Make CLI executable
echo "🔧 Making CLI executable..."
chmod +x bin/cli.js

# Run tests
echo "🧪 Running tests..."
npm test

# Check if build was successful
if [ -f "lib/index.js" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Output directory: lib/"
    echo "🔧 CLI binary: bin/cli.js"
    echo ""
    echo "🚀 You can now:"
    echo "  - Install globally: npm install -g ."
    echo "  - Use locally: node lib/index.js"
    echo "  - Run CLI: ./bin/cli.js --help"
else
    echo "❌ Build failed! lib/index.js not found."
    exit 1
fi

echo ""
echo "🎉 nomad-compose package is ready!"
