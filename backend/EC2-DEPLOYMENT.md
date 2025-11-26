# EC2 Deployment Guide for PDF Generation

This guide helps you set up PDF generation on AWS EC2 instances.

## Common Issues

PDF generation works locally but fails on EC2 due to missing system dependencies required by Puppeteer (Chrome/Chromium).

## Quick Setup

### 1. Install System Dependencies

Run the setup script on your EC2 instance:

```bash
cd backend
chmod +x ec2-setup.sh
./ec2-setup.sh
```

Or manually install dependencies:

#### For Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y \
    ca-certificates fonts-liberation libappindicator3-1 libasound2 \
    libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
    libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
    libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    lsb-release wget xdg-utils
```

#### For Amazon Linux:
```bash
sudo yum install -y \
    alsa-lib atk cups-libs gtk3 ipa-gothic-fonts libXcomposite \
    libXcursor libXdamage libXext libXi libXrandr libXScrnSaver \
    libXtst pango xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi \
    xorg-x11-fonts-cyrillic xorg-x11-fonts-misc xorg-x11-fonts-Type1 \
    xorg-x11-utils
```

### 2. Install Node.js Dependencies

```bash
cd backend
npm install
```

This will install Puppeteer and download Chrome automatically.

### 3. Build the Project

```bash
npm run build
```

This compiles TypeScript and copies templates to the `dist` folder.

### 4. Verify Setup

Test if Puppeteer can launch Chrome:

```bash
node -e "const puppeteer = require('puppeteer'); puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']}).then(b => {console.log('✓ Puppeteer works!'); b.close();}).catch(e => console.error('✗ Error:', e.message));"
```

## Troubleshooting

### Issue: "Failed to load PDF" or "PDF generation failed"

#### Check 1: Verify Chrome is installed
```bash
node -e "console.log(require('puppeteer').executablePath())"
```

If this returns a path, verify it exists:
```bash
ls -la $(node -e "console.log(require('puppeteer').executablePath())")
```

#### Check 2: Check server logs
Look for specific error messages in your application logs. Common errors:
- `Failed to launch browser` - Missing system dependencies
- `Template not found` - Templates not copied to dist folder
- `Logo file not found` - Logo path issue (non-critical, PDF will work without logo)

#### Check 3: Memory and Disk Space
```bash
# Check available memory
free -h

# Check disk space (Puppeteer uses /tmp)
df -h /tmp
```

Puppeteer needs at least 500MB free memory per PDF generation.

#### Check 4: Permissions
Ensure the application user has permissions to:
- Execute Chrome
- Write to /tmp
- Read template files

### Issue: Templates not found

The build script should copy templates automatically. If not:

```bash
# Manually copy templates
cp -r src/templates dist/templates
```

### Issue: Logo not found

The logo is optional. If missing, PDFs will generate without it. To fix:

1. Ensure `Logo11.jpeg` exists in one of these locations:
   - `backend/public/Logo11.jpeg`
   - `public/Logo11.jpeg` (project root)

2. Or update the logo path in `pdf.service.ts` if using a different location.

## Environment Variables

Ensure these are set in your production environment:

```env
NODE_ENV=production
```

## Production Recommendations

1. **Use PM2 or similar** for process management:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name hms-backend
   ```

2. **Set up log rotation** to prevent disk space issues

3. **Monitor memory usage** - Puppeteer can be memory-intensive

4. **Consider using a queue** for PDF generation if handling high volume

5. **Set up health checks** that test PDF generation

## Testing PDF Generation

After deployment, test the PDF endpoint:

```bash
# Replace with your actual bill ID and server URL
curl -O http://your-server/api/billing/{billId}/export/pdf
```

Or use the test endpoint if available:
```bash
curl http://your-server/api/test-pdf
```

## Additional Resources

- [Puppeteer Troubleshooting](https://pptr.dev/troubleshooting)
- [Chrome Headless on Linux](https://chromium.googlesource.com/chromium/src/+/lkgr/headless/README.md)

