#!/bin/bash

# EC2 Setup Script for Puppeteer PDF Generation
# This script installs all required system dependencies for Puppeteer on EC2

echo "========================================="
echo "EC2 Puppeteer Setup Script"
echo "========================================="

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "Cannot detect OS. Exiting."
    exit 1
fi

echo "Detected OS: $OS"

# Update package manager
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    echo "Updating apt packages..."
    sudo apt-get update
    
    echo "Installing Puppeteer dependencies for Ubuntu/Debian..."
    sudo apt-get install -y \
        ca-certificates \
        fonts-liberation \
        libappindicator3-1 \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libc6 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libexpat1 \
        libfontconfig1 \
        libgbm1 \
        libgcc1 \
        libglib2.0-0 \
        libgtk-3-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        libstdc++6 \
        libx11-6 \
        libx11-xcb1 \
        libxcb1 \
        libxcomposite1 \
        libxcursor1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxi6 \
        libxrandr2 \
        libxrender1 \
        libxss1 \
        libxtst6 \
        lsb-release \
        wget \
        xdg-utils

elif [ "$OS" = "amzn" ] || [ "$OS" = "amazon" ]; then
    echo "Installing Puppeteer dependencies for Amazon Linux..."
    sudo yum install -y \
        alsa-lib \
        atk \
        cups-libs \
        gtk3 \
        ipa-gothic-fonts \
        libXcomposite \
        libXcursor \
        libXdamage \
        libXext \
        libXi \
        libXrandr \
        libXScrnSaver \
        libXtst \
        pango \
        xorg-x11-fonts-100dpi \
        xorg-x11-fonts-75dpi \
        xorg-x11-fonts-cyrillic \
        xorg-x11-fonts-misc \
        xorg-x11-fonts-Type1 \
        xorg-x11-utils

elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ]; then
    echo "Installing Puppeteer dependencies for CentOS/RHEL..."
    sudo yum install -y \
        alsa-lib \
        atk \
        cups-libs \
        gtk3 \
        ipa-gothic-fonts \
        libXcomposite \
        libXcursor \
        libXdamage \
        libXext \
        libXi \
        libXrandr \
        libXScrnSaver \
        libXtst \
        pango \
        xorg-x11-fonts-100dpi \
        xorg-x11-fonts-75dpi \
        xorg-x11-fonts-cyrillic \
        xorg-x11-fonts-misc \
        xorg-x11-fonts-Type1 \
        xorg-x11-utils
else
    echo "Unsupported OS: $OS"
    echo "Please install Puppeteer dependencies manually."
    exit 1
fi

# Install additional fonts for better PDF rendering
echo "Installing additional fonts..."
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
    sudo apt-get install -y \
        fonts-noto-color-emoji \
        fonts-noto-cjk \
        fonts-noto-core \
        fonts-dejavu-core \
        fonts-liberation
fi

# Verify Puppeteer installation
echo ""
echo "========================================="
echo "Verifying Puppeteer setup..."
echo "========================================="

# Check if node_modules exists
if [ -d "node_modules/puppeteer" ]; then
    echo "✓ Puppeteer npm package found"
    
    # Try to get Chrome executable path
    CHROME_PATH=$(node -e "console.log(require('puppeteer').executablePath())" 2>/dev/null)
    if [ -n "$CHROME_PATH" ] && [ -f "$CHROME_PATH" ]; then
        echo "✓ Chrome executable found at: $CHROME_PATH"
    else
        echo "⚠ Chrome executable not found. Puppeteer may need to download Chrome."
        echo "  Run: npm install puppeteer (if not already done)"
    fi
else
    echo "⚠ Puppeteer not found in node_modules"
    echo "  Run: npm install"
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Ensure Node.js 18+ is installed"
echo "2. Run: npm install (if not already done)"
echo "3. Build your project: npm run build"
echo "4. Test PDF generation"
echo ""
echo "If PDF generation still fails, check:"
echo "- Server logs for specific error messages"
echo "- Ensure /tmp has sufficient space (Puppeteer uses /tmp)"
echo "- Check memory limits (Puppeteer needs ~500MB+ per PDF)"
echo ""

