# Chatter Notifications Desktop App

A cross-platform desktop application for receiving real-time Salesforce Chatter notifications via WebSocket.

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D22.0.0-brightgreen)
![Electron](https://img.shields.io/badge/electron-42.1.0-9feaf9)
![Socket.IO](https://img.shields.io/badge/socket.io--client-4.8.1-010101)
![Security](https://img.shields.io/badge/vulnerabilities-0-brightgreen)

> **🚀 Have Node.js 22.x?** See [READY_FOR_NODE22.md](READY_FOR_NODE22.md) for quick deployment!

## 🌟 Features

- ✅ **Real-time Notifications** - Receive Chatter mentions instantly via WebSocket
- ✅ **Cross-Platform** - Runs on both macOS and Windows
- ✅ **Desktop Notifications** - Native OS notifications support
- ✅ **Offline Support** - Automatic reconnection when connection is lost
- ✅ **Clean UI** - Matches Salesforce notificationCenter LWC component design
- ✅ **No Installation Required** - Run directly with npm commands
- ✅ **Three Sections** - My Actions, Past Due, and Completed notifications

## 📋 Prerequisites

- **Node.js** (v22.0.0 or higher) - **REQUIRED** [Download here](https://nodejs.org/)
- **npm** (v9.0.0 or higher - comes with Node.js)
- **WebSocket Server** running at: `https://osnotificationscenter.onrender.com`

⚠️ **Important:** This app requires Node.js 22.x due to Electron 42.1.0 requirements.

**Verify your Node.js version:**
```bash
node --version  # Should show v22.x.x or higher
npm --version   # Should show 9.x.x or higher
```

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd osAppChatterNotifications
npm install
```

This will install:
- Electron (desktop app framework)
- Socket.IO Client (WebSocket client library)

### Step 2: Run the Application

#### On macOS or Linux:
```bash
npm start
```

#### On Windows:
```cmd
npm start
```

The application window will open automatically and connect to the WebSocket server!

## 📂 Project Structure

```
osAppChatterNotifications/
├── main.js              # Electron main process (window management)
├── renderer.js          # WebSocket client & UI logic
├── index.html           # Application UI
├── styles.css           # Styling (matches LWC design)
├── package.json         # Dependencies and scripts
├── README.md            # This file
├── run-mac.sh          # Quick start script for macOS
├── run-windows.bat     # Quick start script for Windows
└── uninstall-mac.sh    # Uninstall script for macOS
```

## 🎯 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SALESFORCE CHATTER POST                                      │
│    - User creates Chatter post with @mention and #QUICKTEXTPOST │
│    - FeedItemService triggers and creates ChatterNotification__c│
│    - WebSocketNotificationService sends HTTP POST to server     │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. WEBSOCKET SERVER (server.js)                                 │
│    - Receives POST at /api/notifications                        │
│    - Broadcasts event via Socket.IO to all connected clients    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. DESKTOP APP (This App)                                       │
│    - Connects to WebSocket server on startup                    │
│    - Listens for: salesforce_notification, user_notification    │
│    - Displays notifications in real-time                        │
│    - Shows desktop notification (optional)                      │
└─────────────────────────────────────────────────────────────────┘
```

## 💻 Usage

### Main Interface

The app has three sections:

1. **My Actions** (⌘/Ctrl + 1)
   - Active notifications requiring attention
   - Shows pending tasks

2. **Past Due** (⌘/Ctrl + 2)
   - Overdue notifications
   - Highlighted in red

3. **Completed** (⌘/Ctrl + 3)
   - Notifications marked as completed
   - Archived items

### Features

- **View Message** - Click to see full Chatter message in modal
- **Auto-Refresh** - Real-time updates via WebSocket (no manual refresh needed)
- **Manual Refresh** - Click "Refresh" button to reload view
- **Connection Status** - Shows connected/disconnected state
- **Badge Counts** - Number of notifications in each section
- **Desktop Notifications** - Native OS notifications when new items arrive

### Keyboard Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| My Actions | ⌘ + 1 | Ctrl + 1 |
| Past Due | ⌘ + 2 | Ctrl + 2 |
| Completed | ⌘ + 3 | Ctrl + 3 |
| Refresh | ⌘ + R | Ctrl + R |
| Toggle DevTools | ⌘ + I | Ctrl + I |
| Quit | ⌘ + Q | Ctrl + Q |

## 🔧 Configuration

### Change WebSocket Server URL

Edit `renderer.js` line 8:

```javascript
const WEBSOCKET_SERVER_URL = 'https://osnotificationscenter.onrender.com';
```

Update with your server URL if different.

### Window Size

Edit `main.js` lines 10-13:

```javascript
const mainWindow = new BrowserWindow({
    width: 1400,     // Change width
    height: 900,     // Change height
    minWidth: 1000,  // Minimum width
    minHeight: 600   // Minimum height
});
```

## 📦 Building Standalone Apps (Optional)

### Build for macOS:
```bash
npm run package-mac
```

Creates: `dist/ChatterNotifications-darwin-x64/ChatterNotifications.app`

### Build for Windows:
```bash
npm run package-win
```

Creates: `dist/ChatterNotifications-win32-x64/ChatterNotifications.exe`

**Note:** Uses `@electron/packager` (already in package.json as dev dependency).

## �️ Uninstalling the App

### On macOS:

```bash
chmod +x uninstall-mac.sh    # Make executable (first time only)
./uninstall-mac.sh           # Run uninstaller
```

The uninstall script will:
- Remove `node_modules/` folder
- Remove `package-lock.json`
- Remove build artifacts (`dist/`, `build/`, `out/`)
- Remove `.app` files
- Remove log files
- Optionally remove the entire app directory

**What gets removed:**
- ✅ Dependencies (node_modules)
- ✅ Build outputs
- ✅ Cache files
- ❌ Source code (kept by default)

**Manual Uninstall:**
```bash
# Remove dependencies only
rm -rf node_modules package-lock.json

# Remove build artifacts
rm -rf dist build out release *.app

# Remove entire app (including source code)
cd ..
rm -rf osAppChatterNotifications
```

### On Windows:

```cmd
REM Remove dependencies
rmdir /s /q node_modules
del package-lock.json

REM Remove build artifacts
rmdir /s /q dist build out release

REM Remove entire app
cd ..
rmdir /s /q osAppChatterNotifications
```

## �🐛 Troubleshooting

### App doesn't connect to WebSocket server

**Issue:** Connection status shows "Disconnected" or "Connection Error"

**Solutions:**
1. Verify server is running: Visit https://osnotificationscenter.onrender.com/api/health
2. Check your internet connection
3. Verify WebSocket server URL in `renderer.js`
4. Check browser console in DevTools (Ctrl/Cmd + I)

### No notifications appearing

**Issue:** App is connected but no notifications show up

**Solutions:**
1. Create a Chatter post with `@mention` and `#QUICKTEXTPOST` in Salesforce
2. Verify FeedItemService is triggering in Salesforce
3. Check WebSocket server logs for incoming POST requests
4. Open DevTools (Ctrl/Cmd + I) and check console for events

### Desktop notifications not showing

**Issue:** No native OS notifications when new items arrive

**Solutions:**
1. Grant notification permission when prompted
2. Check OS notification settings (System Preferences → Notifications on macOS)
3. Restart the app to re-request permissions

### App is slow or unresponsive

**Solutions:**
1. Clear old notifications (they're stored in memory)
2. Restart the app
3. Check Task Manager/Activity Monitor for high CPU usage
4. Reduce window size if running on older hardware

## 🔍 Development Mode

Run with DevTools open automatically:

```bash
npm run dev
```

Or open DevTools manually:
- macOS: `⌘ + I`
- Windows: `Ctrl + I`

## 📊 Event Types

The app listens for these WebSocket events:

| Event | Description | Triggered By |
|-------|-------------|--------------|
| `salesforce_notification` | Broadcast to all users | Salesforce Apex callout |
| `user_notification` | Targeted to specific user | Salesforce Apex callout (mentioned user) |
| `notification_status_update` | Status change (Completed) | Salesforce status update |

## 🔐 Security Considerations

- App connects to server over HTTPS/WSS (secure)
- No authentication required currently (consider adding for production)
- All communication is encrypted via TLS
- Desktop notifications require user permission

## 🆘 Support

### Check Logs

Open DevTools Console (Ctrl/Cmd + I) to see:
- Connection status
- Incoming notifications
- Error messages
- WebSocket events

### Common Errors

**"Failed to fetch"**
- Server is down or not accessible
- Check network connection

**"WebSocket connection failed"**
- Server URL is incorrect
- CORS issues (server needs to allow connections)

**"Cannot find module 'socket.io-client'"**
- Run `npm install` to install dependencies

## 📝 Version History

- **v1.0.0** (Current)
  - Initial release
  - Real-time WebSocket notifications
  - Three-section notification view
  - Desktop notifications support
  - Auto-reconnection
  - Cross-platform support (macOS/Windows)

## 🤝 Contributing

To modify or extend the app:

1. Edit `renderer.js` for WebSocket logic and UI updates
2. Edit `index.html` for UI structure
3. Edit `styles.css` for styling
4. Edit `main.js` for Electron window management

## 📄 License

MIT License - Feel free to use and modify!

## 🎉 Enjoy!

You now have a real-time desktop notification app for Salesforce Chatter!

**Next Steps:**
1. Run `npm install`
2. Run `npm start`
3. Create a Chatter post with @mention and #QUICKTEXTPOST
4. Watch the notification appear instantly! 🚀

---

**Questions?** Check the console logs (Ctrl/Cmd + I) for debugging information.

**Server Status:** https://osnotificationscenter.onrender.com/api/health
