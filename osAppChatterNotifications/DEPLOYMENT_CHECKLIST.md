# Deployment Checklist - Machine with Node.js 22.22.22

## ✅ Pre-Deployment Verification

### On Current Machine (Before Transfer)

- [ ] All code files are present
- [ ] package.json has correct versions:
  - `electron: ^42.1.0`
  - `socket.io-client: ^4.8.1`
  - `@electron/packager: ^18.3.0`
  - `ws override: 8.20.1`
- [ ] engines field specifies `node >= 22.0.0`
- [ ] Documentation is up to date
- [ ] No node_modules folder included (will install fresh)
- [ ] No package-lock.json included (will generate fresh)

---

## 📦 Files to Transfer

Transfer these files to the machine with Node.js 22.22.22:

### Core Application Files (REQUIRED)
```
✅ main.js
✅ renderer.js  
✅ index.html
✅ styles.css
✅ package.json
```

### Run Scripts (REQUIRED)
```
✅ run-mac.sh (macOS)
✅ run-windows.bat (Windows)
✅ uninstall-mac.sh (macOS)
```

### Documentation (RECOMMENDED)
```
✅ README.md
✅ QUICK_START.md
✅ SETUP_NODE22.md
✅ ARCHITECTURE.md
✅ SECURITY_UPDATE.md
✅ SUMMARY.md
✅ DEPLOYMENT_CHECKLIST.md (this file)
```

### Configuration (OPTIONAL)
```
✅ .gitignore
```

### DO NOT Transfer
```
❌ node_modules/ (will be installed fresh)
❌ package-lock.json (will be generated)
❌ dist/ (build output)
❌ build/ (build output)
❌ *.log (log files)
```

---

## 🚀 Deployment Steps on Target Machine

### Step 1: Verify Node.js Version

```bash
node --version
```

**Expected:** `v22.22.22` ✅

If different:
- Ensure you're on the correct machine
- Check if multiple Node.js versions are installed
- Use nvm to switch versions if needed

### Step 2: Navigate to App Directory

```bash
cd /path/to/osAppChatterNotifications
```

### Step 3: Verify Files Are Present

```bash
ls -la
```

**Should see:**
- main.js
- renderer.js
- index.html
- styles.css
- package.json
- Documentation files

### Step 4: Install Dependencies

```bash
npm install
```

**Expected output:**
```
added 177 packages, and audited 178 packages in 30s
found 0 vulnerabilities ✅
```

**If errors occur:**
```bash
# Clear cache and retry
npm cache clean --force
npm install
```

### Step 5: Security Audit

```bash
npm audit
```

**Expected output:**
```
found 0 vulnerabilities ✅
```

**If vulnerabilities found:**
- This should NOT happen with the updated package.json
- Contact support or review SECURITY_UPDATE.md

### Step 6: Test Run

```bash
npm start
```

**Expected:**
- Electron window opens (1400x900 pixels)
- Title: "Chatter Notifications"
- Sidebar visible on left
- Connection status shown
- No console errors (press Cmd/Ctrl + I to check)

### Step 7: Test WebSocket Connection

**In the app:**
- Connection status should show "Connected" with 🟢 green dot
- Server URL should be: `https://osnotificationscenter.onrender.com`

**In DevTools Console (Cmd/Ctrl + I):**
```
WebSocket connected to: https://osnotificationscenter.onrender.com
Socket ID: abc123...
```

### Step 8: Test Notification Reception

1. Go to Salesforce (in browser)
2. Open any Case
3. Create Chatter post:
   ```
   @YourName please review this case #QUICKTEXTPOST
   ```
4. Wait 2-3 seconds
5. **Notification should appear in desktop app!** ✅

**If notification doesn't appear:**
- Check WebSocket connection status
- Verify Salesforce Remote Site Settings
- Check FeedItemService trigger
- Review console logs for errors

---

## 🔍 Verification Checklist

### Application Launch
- [ ] App window opens without errors
- [ ] Window size is 1400x900
- [ ] Window is not blank (UI is visible)
- [ ] No "Module not found" errors
- [ ] No "Cannot find module" errors

### User Interface
- [ ] Sidebar visible on left
- [ ] Three menu items: My Actions, Past Due, Completed
- [ ] Connection status indicator visible
- [ ] Server URL displayed at bottom
- [ ] Main content area visible on right
- [ ] No layout/CSS issues

### WebSocket Connection
- [ ] Connection status shows "Connected"
- [ ] Green dot indicator visible
- [ ] No connection errors in console
- [ ] Socket.IO client connected
- [ ] Server URL is correct

### Functionality
- [ ] Can switch between sections (My Actions/Past Due/Completed)
- [ ] Refresh button works
- [ ] Keyboard shortcuts work (Cmd/Ctrl + 1/2/3)
- [ ] DevTools can be opened (Cmd/Ctrl + I)
- [ ] Can close app normally (Cmd/Ctrl + Q)

### Notifications
- [ ] Test Chatter post created in Salesforce
- [ ] Notification appears in desktop app
- [ ] Notification shows in correct section
- [ ] Desktop notification appears (if enabled)
- [ ] Message content is correct

### Performance
- [ ] App launches in < 5 seconds
- [ ] No lag when switching sections
- [ ] No memory leaks (check Activity Monitor/Task Manager)
- [ ] CPU usage is low when idle (< 1%)

---

## 🐛 Common Issues & Solutions

### Issue: npm install fails

**Error:** `npm ERR! code ENOTFOUND` or network errors

**Solution:**
```bash
# Check internet connection
ping npmjs.org

# Clear npm cache
npm cache clean --force

# Try with verbose logging
npm install --verbose
```

### Issue: Electron won't download

**Error:** `Error downloading electron binary`

**Solution:**
```bash
# Set registry
npm config set registry https://registry.npmjs.org/

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Unsupported engine" warning

**Warning:** `npm WARN EBADENGINE Unsupported engine`

**If Node.js is 22.22.22:** This is fine! The warning is for packages that don't explicitly support 22.22.22 yet, but they work fine.

**Action:** Ignore the warning if Node.js version is >= 22.0.0

### Issue: App shows blank white screen

**Solutions:**
1. Check DevTools console for errors (Cmd/Ctrl + I)
2. Verify all files were transferred correctly
3. Check file permissions (should be readable)
4. Try running with `npm run dev` to see verbose logs

### Issue: Cannot connect to WebSocket server

**Solutions:**
1. Check internet connection
2. Verify server URL in renderer.js
3. Test server manually:
   ```bash
   curl https://osnotificationscenter.onrender.com/api/health
   ```
4. Check firewall settings

### Issue: No notifications appearing

**Solutions:**
1. Verify WebSocket is connected (green dot)
2. Check Salesforce Remote Site Settings configured
3. Verify FeedItemService trigger is active
4. Check Chatter post has @mention and #QUICKTEXTPOST
5. Review Salesforce debug logs

---

## 📊 Expected Performance Metrics

### Installation
- **npm install time:** 30-60 seconds
- **Total download size:** ~200MB
- **Disk space used:** ~250MB

### Runtime
- **Launch time:** 2-5 seconds
- **Memory usage:** ~150-200MB
- **CPU usage (idle):** < 1%
- **CPU usage (active):** < 5%

### Network
- **WebSocket connection:** < 1 second
- **Ping to server:** < 200ms
- **Notification latency:** < 1 second

---

## 🎯 Success Criteria

The deployment is successful when:

- ✅ `npm install` completes with 0 vulnerabilities
- ✅ `npm start` launches the app without errors
- ✅ App connects to WebSocket server (shows "Connected")
- ✅ Test Chatter post appears in desktop app within 3 seconds
- ✅ Desktop notification displays (if permissions granted)
- ✅ App runs smoothly without crashes or lag
- ✅ All keyboard shortcuts work
- ✅ Can switch between sections without issues

---

## 📝 Deployment Log Template

Use this to track your deployment:

```
Date: _______________
Machine: _______________
Node.js Version: _______________
npm Version: _______________

Installation:
[ ] Files transferred
[ ] npm install completed
[ ] npm audit shows 0 vulnerabilities

Testing:
[ ] App launches successfully  
[ ] WebSocket connected
[ ] Test notification received
[ ] All features working

Issues encountered:
_________________________________
_________________________________
_________________________________

Resolution:
_________________________________
_________________________________
_________________________________

Deployment Status: [ ] SUCCESS [ ] FAILED
Deployed by: _______________
```

---

## 🎉 Post-Deployment

### After Successful Deployment

1. **Save this checklist** for future reference
2. **Document any issues** encountered and solutions
3. **Test all features** thoroughly
4. **Create backup** of working installation
5. **Share feedback** on what worked well

### Optional: Build Standalone App

If you want to distribute without npm install:

```bash
# For macOS
npm run package-mac

# For Windows  
npm run package-win
```

Output will be in `dist/` folder.

---

## 🔗 Additional Resources

- **Setup Guide:** [SETUP_NODE22.md](SETUP_NODE22.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)
- **Full Documentation:** [README.md](README.md)
- **Security Info:** [SECURITY_UPDATE.md](SECURITY_UPDATE.md)
- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 📞 Support

If you encounter issues:

1. **Check console logs:** Press Cmd/Ctrl + I in the app
2. **Review documentation:** See links above
3. **Check npm logs:** Located in `~/.npm/_logs/`
4. **Test server:** `curl https://osnotificationscenter.onrender.com/api/health`

---

**Prepared for:** Machine with Node.js 22.22.22  
**App Version:** 1.0.0  
**Electron Version:** 42.1.0  
**Security Status:** 0 vulnerabilities ✅  
**Last Updated:** May 19, 2026
