#!/bin/bash

# ==============================================================================
# Chatter Notifications Desktop App - macOS Uninstall Script
# ==============================================================================

echo "=========================================="
echo "Chatter Notifications - Uninstaller"
echo "=========================================="
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "Current directory: $SCRIPT_DIR"
echo ""

# Function to get directory size
get_dir_size() {
    if [ -d "$1" ]; then
        du -sh "$1" 2>/dev/null | cut -f1
    else
        echo "0B"
    fi
}

# Check what will be removed
echo "📋 Files and folders to be removed:"
echo ""

ITEMS_TO_REMOVE=()
TOTAL_SIZE=0

# Check node_modules
if [ -d "node_modules" ]; then
    SIZE=$(get_dir_size "node_modules")
    echo "  📦 node_modules/ ($SIZE)"
    ITEMS_TO_REMOVE+=("node_modules")
fi

# Check package-lock.json
if [ -f "package-lock.json" ]; then
    SIZE=$(du -sh "package-lock.json" 2>/dev/null | cut -f1)
    echo "  📄 package-lock.json ($SIZE)"
    ITEMS_TO_REMOVE+=("package-lock.json")
fi

# Check dist folder (build output)
if [ -d "dist" ]; then
    SIZE=$(get_dir_size "dist")
    echo "  📦 dist/ ($SIZE)"
    ITEMS_TO_REMOVE+=("dist")
fi

# Check build folder
if [ -d "build" ]; then
    SIZE=$(get_dir_size "build")
    echo "  📦 build/ ($SIZE)"
    ITEMS_TO_REMOVE+=("build")
fi

# Check out folder (electron-packager output)
if [ -d "out" ]; then
    SIZE=$(get_dir_size "out")
    echo "  📦 out/ ($SIZE)"
    ITEMS_TO_REMOVE+=("out")
fi

# Check release folder
if [ -d "release" ]; then
    SIZE=$(get_dir_size "release")
    echo "  📦 release/ ($SIZE)"
    ITEMS_TO_REMOVE+=("release")
fi

# Check for .app file in current directory
APP_FILE=$(find . -maxdepth 1 -name "*.app" 2>/dev/null)
if [ ! -z "$APP_FILE" ]; then
    SIZE=$(get_dir_size "$APP_FILE")
    echo "  📱 $(basename "$APP_FILE") ($SIZE)"
    ITEMS_TO_REMOVE+=("$APP_FILE")
fi

# Check for log files
if ls *.log 1> /dev/null 2>&1; then
    echo "  📄 *.log files"
    ITEMS_TO_REMOVE+=("*.log")
fi

echo ""

# If nothing to remove
if [ ${#ITEMS_TO_REMOVE[@]} -eq 0 ]; then
    echo "✅ No dependencies or build files found."
    echo "The app appears to be already clean or never installed."
    echo ""
    read -p "Do you want to remove the entire app directory? (y/N): " REMOVE_ALL
    if [[ $REMOVE_ALL =~ ^[Yy]$ ]]; then
        cd ..
        echo ""
        echo "🗑️  Removing app directory: osAppChatterNotifications"
        rm -rf "osAppChatterNotifications"
        echo "✅ App completely removed!"
        echo ""
        exit 0
    else
        echo "✅ No changes made."
        exit 0
    fi
fi

# Confirmation prompt
echo "⚠️  WARNING: This will remove all dependencies and build files."
echo "The source code files (main.js, renderer.js, etc.) will NOT be deleted."
echo ""
read -p "Do you want to continue? (y/N): " CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo ""
    echo "❌ Uninstall cancelled."
    echo ""
    exit 0
fi

echo ""
echo "🗑️  Removing files..."
echo ""

# Remove each item
REMOVED_COUNT=0
for item in "${ITEMS_TO_REMOVE[@]}"; do
    if [ "$item" = "*.log" ]; then
        # Special handling for wildcard
        rm -f *.log 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "  ✅ Removed log files"
            ((REMOVED_COUNT++))
        fi
    else
        if [ -e "$item" ]; then
            rm -rf "$item"
            if [ $? -eq 0 ]; then
                echo "  ✅ Removed $(basename "$item")"
                ((REMOVED_COUNT++))
            else
                echo "  ❌ Failed to remove $(basename "$item")"
            fi
        fi
    fi
done

echo ""
echo "✅ Uninstall complete! Removed $REMOVED_COUNT item(s)."
echo ""

# Ask if user wants to remove the entire app
read -p "Do you want to remove the entire app directory? (y/N): " REMOVE_ALL
echo ""

if [[ $REMOVE_ALL =~ ^[Yy]$ ]]; then
    echo "⚠️  This will delete ALL files including source code!"
    read -p "Are you absolutely sure? (y/N): " CONFIRM_ALL
    echo ""
    
    if [[ $CONFIRM_ALL =~ ^[Yy]$ ]]; then
        cd ..
        echo "🗑️  Removing app directory: osAppChatterNotifications"
        rm -rf "osAppChatterNotifications"
        echo "✅ App completely removed!"
        echo ""
        echo "Thank you for using Chatter Notifications Desktop App!"
    else
        echo "✅ Source files kept. App directory preserved."
        echo ""
        echo "To reinstall dependencies later, run:"
        echo "  npm install"
    fi
else
    echo "✅ Source files kept. App directory preserved."
    echo ""
    echo "The app has been uninstalled but source files remain."
    echo "To reinstall dependencies later, run:"
    echo "  npm install"
fi

echo ""
echo "=========================================="
