# 🚀 QUICK START GUIDE

Get the Chatter Notifications Desktop App running in **3 simple steps**!

## Step 1: Install Node.js 22.x (REQUIRED)

⚠️ **This app requires Node.js 22.0.0 or higher**

**macOS:**
```bash
# Download Node.js 22.x from official website
# Visit: https://nodejs.org/
# Choose "Current" version (22.x)

# Or using nvm (if installed):
nvm install 22
nvm use 22
```

**Windows:**
```
Download Node.js 22.x from: https://nodejs.org/
Choose the "Current" version (22.x.x)
Run the installer and follow the prompts
```

**Verify Installation:**
```bash
node --version    # Should show v22.x.x or higher ✅
npm --version     # Should show 9.x.x or higher ✅
```

If you see a lower version, you need to upgrade Node.js before proceeding.

---

## Step 2: Install Dependencies

**Open Terminal (macOS) or Command Prompt (Windows):**

```bash
# Navigate to the app directory
cd osAppChatterNotifications

# Install dependencies (one-time setup)
npm install
```

This installs Electron and Socket.IO client libraries.

---

## Step 3: Run the App

### Option A: Using npm (All Platforms)

```bash
npm start
```

### Option B: Using Run Scripts

**macOS/Linux:**
```bash
chmod +x run-mac.sh    # Make executable (first time only)
./run-mac.sh           # Run the app
```

**Windows:**
```cmd
run-windows.bat        # Double-click or run from command prompt
```

---

## ✅ You're Done!

The app window will open and connect to the WebSocket server automatically.

### What You'll See:

1. **Sidebar** with three sections:
   - My Actions (pending notifications)
   - Past Due (overdue items)
   - Completed (finished items)

2. **Connection Status** showing:
   - 🟢 Connected (green dot)
   - 🟡 Connecting (yellow dot)
   - 🔴 Disconnected (red dot)

3. **Empty State** initially (no notifications yet)

---

## 🧪 Test It!

### Create a Test Notification in Salesforce:

1. Go to any **Case** in Salesforce
2. Create a **Chatter post**:
   ```
   @YourName please review this case #QUICKTEXTPOST
   ```
3. Wait 2-3 seconds
4. **Watch the notification appear** in the desktop app! 🎉

### What Happens:

```
Salesforce → Apex HTTP Callout → WebSocket Server → Desktop App
    (2s)            (instant)             (instant)         (display)
```

Total time: **~2-3 seconds** from Chatter post to desktop notification!

---

## 🎯 Quick Tips

### Navigation
- Click sidebar items to switch sections
- Use keyboard shortcuts: `Cmd/Ctrl + 1/2/3`

### View Messages
- Click "View Message" button to see full Chatter content
- Modal opens with complete message text

### Refresh
- Click "Refresh" button (or `Cmd/Ctrl + R`)
- Or just wait - updates are automatic!

### Desktop Notifications
- Grant permission when prompted
- Get native OS notifications for new items

### DevTools (For Debugging)
- Press `Cmd/Ctrl + I` to open developer console
- See connection logs and incoming events

---

## 🐛 Troubleshooting

### App Won't Start

**Error: "node: command not found"**
→ Install Node.js (see Step 1)

**Error: "Cannot find module"**
→ Run `npm install` again

### Not Connecting

**Status shows "Disconnected"**
→ Check internet connection
→ Verify server is running: https://osnotificationscenter.onrender.com/api/health

### No Notifications

**App is connected but nothing appears**
→ Create Chatter post with `@mention` and `#QUICKTEXTPOST`
→ Verify FeedItemService trigger is active in Salesforce
→ Check server logs

---

## 📁 File Locations

```
osAppChatterNotifications/
├── run-mac.sh          ← Run this on Mac
├── run-windows.bat     ← Run this on Windows
├── uninstall-mac.sh    ← Uninstall on Mac
├── README.md           ← Full documentation
└── QUICK_START.md      ← This file!
```

---

## 🔄 Next Time

After initial setup, just run:

**macOS:**
```bash
./run-mac.sh
```

**Windows:**
```cmd
run-windows.bat
```

Or from any platform:
```bash
npm start
```

---

## 🎊 You're All Set!

The app is now:
- ✅ Connected to WebSocket server
- ✅ Listening for notifications
- ✅ Ready to display Chatter mentions
- ✅ Auto-reconnecting if connection drops

**Create a Chatter post to see it in action!** 🚀

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

## �️ Uninstalling

### On macOS:

```bash
chmod +x uninstall-mac.sh    # Make executable (first time only)
./uninstall-mac.sh           # Run uninstaller
```

The script will:
- ✅ Remove dependencies (node_modules)
- ✅ Remove build files (dist/, build/)
- ✅ Remove cache and log files
- ⚠️ Keep source code by default
- 🗑️ Optionally remove entire app

### Manual Uninstall:

```bash
# Remove dependencies only
rm -rf node_modules package-lock.json

# Remove everything including source
cd ..
rm -rf osAppChatterNotifications
```

---

## 📚 More Info

See [README.md](README.md) for:
- Complete documentation
- Configuration options
- Building standalone apps
- Advanced troubleshooting
- Uninstallation options

---

**That's it! Enjoy your real-time Chatter notifications!** 🎉
