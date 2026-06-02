/**
 * Electron Main Process
 * Creates the application window and manages app lifecycle
 */

const { app, BrowserWindow, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

/**
 * Generate a vibrant badge overlay for Windows taskbar
 * @param {number} count - The notification count to display
 * @returns {Electron.NativeImage|null} - The badge image
 */
function generateBadgeOverlay(count) {
  if (count <= 0) return null;

  const text = count > 99 ? '99+' : count.toString();
  const size = 64; // Larger size for better visibility
  const fontSize = text.length > 2 ? 32 : 40; // Smaller font for "99+"
  
  // Create vibrant SVG badge with gradient
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#FF5252;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#E91E63;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#badgeGradient)" stroke="#D32F2F" stroke-width="2"/>
      <text x="${size/2}" y="${size/2 + fontSize/3}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle" 
            stroke="#C41E3A" 
            stroke-width="1">${text}</text>
    </svg>
  `;

  try {
    // Convert SVG to data URL and then to native image
    const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    const image = nativeImage.createFromDataURL(dataUrl);
    
    // Verify the image was created
    if (image.isEmpty()) {
      console.log('⚠️ Badge image is empty, trying fallback...');
      return generateSimpleBadge(count);
    }
    
    console.log('✅ Badge image created successfully, size:', image.getSize());
    return image;
  } catch (error) {
    console.error('❌ Error creating badge from SVG:', error);
    return generateSimpleBadge(count);
  }
}

/**
 * Generate a simple solid-color badge as fallback
 * @param {number} count - The notification count
 * @returns {Electron.NativeImage|null} - Simple badge image
 */
function generateSimpleBadge(count) {
  if (count <= 0) return null;
  
  const text = count > 99 ? '99+' : count.toString();
  const size = 64;
  const fontSize = text.length > 2 ? 32 : 40;
  
  // Simple solid red badge without gradient
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#FF3B30" stroke="#C41E3A" stroke-width="3"/>
      <text x="${size/2}" y="${size/2 + fontSize/3}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="white" 
            text-anchor="middle">${text}</text>
    </svg>
  `;
  
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  return nativeImage.createFromDataURL(dataUrl);
}

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
          label: 'Test Badge (Windows)',
          click: () => {
            if (process.platform === 'win32' && mainWindow) {
              console.log('🧪 Testing badge with count: 5');
              const testBadge = generateBadgeOverlay(5);
              if (testBadge) {
                mainWindow.setOverlayIcon(testBadge, '5 test notifications');
                console.log('✅ Test badge applied');
              } else {
                console.log('❌ Test badge generation failed');
              }
            }
          }
        },
        { type: 'separator' },
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
  console.log('📊 Updating badge count:', count);
  
  // Update badge count
  if (process.platform === 'darwin') {
    // macOS dock badge
    app.dock.setBadge(count > 0 ? count.toString() : '');
  } else if (process.platform === 'win32') {
    // Windows taskbar overlay with vibrant badge
    if (mainWindow) {
      // Ensure window is visible and ready
      if (!mainWindow.isDestroyed() && mainWindow.isVisible()) {
        if (count > 0) {
          const badgeImage = generateBadgeOverlay(count);
          if (badgeImage) {
            const description = count > 99 ? '99+ notifications' : `${count} notification${count > 1 ? 's' : ''}`;
            console.log('🪟 Setting Windows taskbar badge:', description);
            try {
              mainWindow.setOverlayIcon(badgeImage, description);
              console.log('✅ Badge overlay set successfully');
            } catch (error) {
              console.error('❌ Error setting overlay icon:', error);
            }
          } else {
            console.log('⚠️ Badge image generation returned null');
          }
        } else {
          console.log('🪟 Clearing Windows taskbar badge');
          mainWindow.setOverlayIcon(null, '');
        }
      } else {
        console.log('⚠️ Window not ready for badge update (destroyed or hidden)');
        // Retry after window is ready
        if (!mainWindow.isDestroyed()) {
          mainWindow.once('ready-to-show', () => {
            console.log('🔄 Retrying badge update after window ready');
            event.sender.send('retry-badge-update');
          });
        }
      }
    } else {
      console.log('⚠️ Main window not available for badge update');
    }
  }
  
  // Linux doesn't have native badge support, but some desktop environments do
  // Unity launcher badge (Ubuntu)
  if (process.platform === 'linux') {
    app.setBadgeCount(count);
  }
});

ipcMain.on('restore-window', () => {
  if (mainWindow) {
    // Restore window if minimized
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    
    // Show window if hidden
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    
    // Focus the window
    mainWindow.focus();
    
    // On macOS, also bring to front
    if (process.platform === 'darwin') {
      app.dock.show();
    }
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
