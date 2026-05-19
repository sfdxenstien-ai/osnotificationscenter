#!/bin/bash

# ==============================================================================
# Chatter Notifications Desktop App - macOS/Linux Run Script
# ==============================================================================

echo "=========================================="
echo "Chatter Notifications Desktop App"
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js 22.x from: https://nodejs.org/"
    echo "Minimum version: v22.0.0"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    echo ""
    echo "npm should come with Node.js installation"
    exit 1
fi

# Get Node.js version
NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"
echo "✅ npm version: $(npm --version)"
echo ""

# Check Node.js version (must be >= 22.0.0)
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "⚠️  WARNING: Node.js version is too old!"
    echo ""
    echo "Current version: $NODE_VERSION"
    echo "Required version: v22.0.0 or higher"
    echo ""
    echo "Please upgrade Node.js: https://nodejs.org/"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
else
    echo "✅ Node.js version check passed (v$NODE_MAJOR.x.x >= v22.0.0)"
    echo ""
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    echo "This may take a minute..."
    echo ""
    npm install
    echo ""
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully!"
    echo ""
fi

# Start the application
echo "🚀 Starting Chatter Notifications Desktop App..."
echo ""
echo "Server: https://osnotificationscenter.onrender.com"
echo ""
echo "Press Ctrl+C to stop the application"
echo "=========================================="
echo ""

npm start
