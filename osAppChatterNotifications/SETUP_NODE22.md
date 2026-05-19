# Setup Guide for Node.js 22.x Machine

## ✅ System Requirements

Your machine with **Node.js 22.22.22** meets all requirements! This guide will help you set up the app.

---

## 📋 Prerequisites Check

### 1. Verify Node.js Version

```bash
node --version
```

**Expected Output:** `v22.22.22` ✅

### 2. Verify npm Version

```bash
npm --version
```

**Expected Output:** `9.x.x` or higher ✅

---

## 🚀 Installation Steps

### Step 1: Copy App Files

Copy the entire `osAppChatterNotifications` folder to your machine with Node.js 22.22.22.

You can use:
- **USB drive**
- **Git clone/pull**
- **File sharing** (AirDrop, network share, etc.)
- **Cloud storage** (Dropbox, Google Drive, etc.)

### Step 2: Navigate to App Directory

```bash
cd /path/to/osAppChatterNotifications
```

### Step 3: Install Dependencies

```bash
npm install
```

**What happens:**
- Downloads Electron 42.1.0 (compatible with Node.js 22.x)
- Downloads Socket.IO Client 4.8.1
- Downloads @electron/packager 18.3.0
- Applies security override for ws package (8.20.1)
- Total download size: ~200MB
- Installation time: 30-60 seconds

**Expected output:**
```
added 177 packages, and audited 178 packages in 30s

35 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities ✅
```

### Step 4: Verify Installation

```bash
npm audit
```

**Expected output:**
```
found 0 vulnerabilities ✅
```

### Step 5: Run the App

```bash
npm start
```

**What happens:**
- Electron window opens (1400x900)
- App connects to WebSocket server
- Connection status shows "Connected" (green dot)
- You'll see the notification interface ready!

---

## 🎯 Quick Test

### Test WebSocket Connection

1. App should show **"Connected"** status with 🟢 green indicator
2. Check console (press `Cmd/Ctrl + I`) for connection logs:
   ```
   WebSocket connected to: https://osnotificationscenter.onrender.com
   ```

### Test Notification Reception

1. Go to Salesforce
2. Open any Case
3. Create a Chatter post:
   ```
   @YourName please review this case #QUICKTEXTPOST
   ```
4. Wait 2-3 seconds
5. **Notification should appear in desktop app!** 🎉

---

## 📦 Files Included

```
osAppChatterNotifications/
├── package.json         ← Dependencies (Electron 42.1.0)
├── main.js              ← Electron main process
├── renderer.js          ← WebSocket client logic
├── index.html           ← UI structure
├── styles.css           ← UI styling
├── run-mac.sh           ← macOS launcher (chmod +x first)
├── run-windows.bat      ← Windows launcher
├── uninstall-mac.sh     ← Uninstaller for macOS
├── README.md            ← Full documentation
├── QUICK_START.md       ← Quick start guide
├── ARCHITECTURE.md      ← System architecture
├── SECURITY_UPDATE.md   ← Security update log
└── SETUP_NODE22.md      ← This file!
```

---

## 🔧 Configuration (Optional)

### Change WebSocket Server URL

Edit `renderer.js` line 8:

```javascript
const WEBSOCKET_SERVER_URL = 'https://osnotificationscenter.onrender.com';
```

Change to your server if different.

### Change Window Size

Edit `main.js` lines 10-13:

```javascript
const mainWindow = new BrowserWindow({
    width: 1400,     // Adjust width
    height: 900,     // Adjust height
    minWidth: 1000,
    minHeight: 600
});
```

---

## ⌨️ Keyboard Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| My Actions | ⌘ + 1 | Ctrl + 1 |
| Past Due | ⌘ + 2 | Ctrl + 2 |
| Completed | ⌘ + 3 | Ctrl + 3 |
| Refresh | ⌘ + R | Ctrl + R |
| DevTools | ⌘ + I | Ctrl + I |
| Quit | ⌘ + Q | Ctrl + Q |

---

## 🐛 Troubleshooting

### Issue: "npm install" fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue: "Electron failed to install"

**Solution:**
```bash
# Remove node_modules and try again
rm -rf node_modules package-lock.json
npm install
```

### Issue: App won't start

**Solution 1:** Verify Node.js version
```bash
node --version  # Should be v22.x.x
```

**Solution 2:** Check for errors
```bash
npm start
# Read error messages carefully
```

**Solution 3:** Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
npm start
```

### Issue: Not connecting to WebSocket server

**Check server status:**
```bash
curl https://osnotificationscenter.onrender.com/api/health
```

**Expected response:** `{"status":"healthy"}`

**Solutions:**
1. Check internet connection
2. Verify server URL in `renderer.js`
3. Open DevTools (Cmd/Ctrl + I) and check console

### Issue: No notifications appearing

**Solutions:**
1. Verify WebSocket connection (should show "Connected")
2. Create Chatter post with `@mention` and `#QUICKTEXTPOST`
3. Check Salesforce FeedItemService trigger is active
4. Check Remote Site Settings in Salesforce (Setup → Remote Site Settings)

---

## 📊 System Information

### Node.js Version Compatibility

| Node.js Version | Electron 42.1.0 | Status |
|----------------|----------------|--------|
| v20.x.x | ❌ Not supported | Too old |
| v22.0.0 - v22.11.x | ⚠️ Minimum | Works but shows warning |
| **v22.12.0+** | ✅ Recommended | Fully supported |
| **v22.22.22** | ✅ Perfect | **Your version!** |
| v23.x.x+ | ✅ Supported | Future versions |

---

## 🔒 Security

### Verified Security Status

```bash
npm audit
# Output: found 0 vulnerabilities ✅
```

### Security Features

- ✅ **Electron 42.1.0** - Latest secure version
- ✅ **Socket.IO Client 4.8.1** - Latest version
- ✅ **ws 8.20.1** - Security override applied
- ✅ **@electron/packager 18.3.0** - Official maintained package
- ✅ **0 vulnerabilities** - All known security issues resolved

---

## 🎊 Success Checklist

After setup, verify:

- [ ] `npm install` completed successfully
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] `npm start` launches the app
- [ ] App window opens (1400x900 pixels)
- [ ] Connection status shows "Connected" with green dot
- [ ] WebSocket server URL is correct
- [ ] Sidebar shows three sections (My Actions, Past Due, Completed)
- [ ] Test Chatter post creates notification in app
- [ ] Desktop notification appears (if permissions granted)

---

## 🚀 Next Steps

1. **Run the app:** `npm start`
2. **Test notifications:** Create Chatter post with @mention
3. **Customize:** Modify settings if needed
4. **Build standalone app (optional):**
   ```bash
   npm run package-mac    # For macOS
   npm run package-win    # For Windows
   ```

---

## 📞 Support

### Console Logs

Press `Cmd/Ctrl + I` to open DevTools:
- See WebSocket connection status
- View incoming notifications
- Debug errors

### Server Health Check

```bash
curl https://osnotificationscenter.onrender.com/api/health
```

### Documentation

- [README.md](README.md) - Complete guide
- [QUICK_START.md](QUICK_START.md) - Quick setup
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [SECURITY_UPDATE.md](SECURITY_UPDATE.md) - Security info

---

## ✨ Summary

With **Node.js 22.22.22**, you have the perfect environment for this app!

**Installation is just 3 commands:**
```bash
cd osAppChatterNotifications
npm install
npm start
```

**Total time:** ~2 minutes

Enjoy your real-time Chatter notifications! 🎉

---

**Setup Date:** May 19, 2026  
**Node.js Version:** 22.22.22 ✅  
**Electron Version:** 42.1.0 ✅  
**Security Status:** 0 vulnerabilities ✅
