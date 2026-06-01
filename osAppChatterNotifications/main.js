/**
 * Electron Main Process
 * Creates the application window and manages app lifecycle
 */

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  // Check if icon exists
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const hasIcon = fs.existsSync(iconPath);
  
  // Create the browser window
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#f4f6f9',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'Chatter Notifications',
    show: false // Don't show until ready
  };
  
  // Only add icon if file exists
  if (hasIcon) {
    windowOptions.icon = iconPath;
  }
  
  mainWindow = new BrowserWindow(windowOptions);

  // Load the index.html
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development (optional)
  // mainWindow.webContents.openDevTools();

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: 'Toggle DevTools',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'My Actions',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-section', 'myActions');
            }
          }
        },
        {
          label: 'Past Due',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-section', 'pastDue');
            }
          }
        },
        {
          label: 'Completed',
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('switch-section', 'completed');
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Chatter Notifications',
              message: 'Chatter Notifications Desktop App',
              detail: 'Version 1.0.0\n\nReal-time Salesforce Chatter notifications via WebSocket.\n\nServer: https://osnotificationscenter.onrender.com',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// IPC Handlers for notifications
ipcMain.on('flash-window', () => {
  if (mainWindow && !mainWindow.isFocused()) {
    // Flash the window frame on Windows/Linux
    mainWindow.flashFrame(true);
    
    // On macOS, bounce the dock icon
    if (process.platform === 'darwin') {
      app.dock.bounce('informational');
    }
    
    // Stop flashing when window gains focus
    mainWindow.once('focus', () => {
      mainWindow.flashFrame(false);
    });
  }
});

ipcMain.on('update-badge-count', (event, count) => {
  // Update badge count
  if (process.platform === 'darwin') {
    // macOS dock badge
    app.dock.setBadge(count > 0 ? count.toString() : '');
  } else if (process.platform === 'win32') {
    // Windows taskbar overlay
    if (mainWindow) {
      if (count > 0) {
        // You can create a small badge icon dynamically or use a pre-made one
        // For now, we'll use the flash and title update from renderer
        mainWindow.setOverlayIcon(null, count.toString());
      } else {
        mainWindow.setOverlayIcon(null, '');
      }
    }
  }
  
  // Linux doesn't have native badge support, but some desktop environments do
  // Unity launcher badge (Ubuntu)
  if (process.platform === 'linux') {
    app.setBadgeCount(count);
  }
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Log any uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
