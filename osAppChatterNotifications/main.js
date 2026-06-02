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
 * Windows taskbar overlays should be 16x16 pixels for optimal display
 * @param {number} count - The notification count to display
 * @returns {Electron.NativeImage|null} - The badge image
 */
function generateBadgeOverlay(count) {
  if (count <= 0) return null;

  const text = count > 99 ? '99' : count.toString();
  // Windows taskbar overlay should be 16x16 for best results
  const size = 16;
  const fontSize = text.length > 1 ? 11 : 13;
  
  // Create vibrant solid badge (gradients don't work well at 16x16)
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="#FF3B30" stroke="#FFFFFF" stroke-width="1"/>
      <text x="${size/2}" y="${size/2 + 4}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="#FFFFFF" 
            text-anchor="middle">${text}</text>
    </svg>
  `;

  try {
    // Convert SVG to data URL and then to native image
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const image = nativeImage.createFromDataURL(dataUrl);
    
    // Resize to ensure it's exactly 16x16
    const resized = image.resize({ width: 16, height: 16 });
    
    // Verify the image was created
    if (resized.isEmpty()) {
      console.log('⚠️ Badge image is empty, trying canvas approach...');
      return generateCanvasBadge(count);
    }
    
    console.log('✅ Badge overlay created successfully, size:', resized.getSize());
    return resized;
  } catch (error) {
    console.error('❌ Error creating badge from SVG:', error);
    return generateCanvasBadge(count);
  }
}

/**
 * Generate badge using canvas/bitmap approach as fallback
 * @param {number} count - The notification count
 * @returns {Electron.NativeImage|null} - Canvas-based badge image
 */
function generateCanvasBadge(count) {
  if (count <= 0) return null;
  
  const text = count > 99 ? '99' : count.toString();
  
  // Create a larger SVG and let Electron resize it
  const size = 32; // Create at 2x size for better quality
  const fontSize = text.length > 1 ? 22 : 26;
  
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#FF3B30" stroke="#FFFFFF" stroke-width="2"/>
      <text x="${size/2}" y="${size/2 + 8}" 
            font-family="Arial, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="#FFFFFF" 
            text-anchor="middle">${text}</text>
    </svg>
  `;
  
  try {
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const image = nativeImage.createFromDataURL(dataUrl);
    // Resize down to 16x16 for taskbar overlay
    return image.resize({ width: 16, height: 16 });
  } catch (error) {
    console.error('❌ Canvas badge generation failed:', error);
    return null;
  }
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
          label: 'Test Badge - Count 3 (Windows)',
          click: () => {
            if (mainWindow) {
              console.log('🧪 Testing taskbar badge with count: 3');
              const testBadge = generateBadgeOverlay(3);
              if (testBadge && !testBadge.isEmpty()) {
                try {
                  mainWindow.setOverlayIcon(testBadge, '3 notifications');
                  console.log('✅ Test badge applied to taskbar icon');
                  console.log('👀 Look at your taskbar - you should see a red circle with "3" on the app icon');
                } catch (error) {
                  console.error('❌ Error setting test badge:', error);
                }
              } else {
                console.log('❌ Test badge generation failed - image is null or empty');
              }
            }
          }
        },
        {
          label: 'Clear Badge (Windows)',
          click: () => {
            if (mainWindow) {
              console.log('🧹 Clearing taskbar badge');
              mainWindow.setOverlayIcon(null, '');
              console.log('✅ Badge cleared from taskbar icon');
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
  console.log('📊 Received badge update request. Count:', count, '| Platform:', process.platform);
  
  // Update badge count
  if (process.platform === 'darwin') {
    // macOS dock badge
    app.dock.setBadge(count > 0 ? count.toString() : '');
    console.log('🍎 macOS dock badge updated');
  } else if (process.platform === 'win32') {
    // Windows taskbar overlay with vibrant badge
    if (mainWindow) {
      // Ensure window is visible and ready
      if (!mainWindow.isDestroyed() && mainWindow.isVisible()) {
        if (count > 0) {
          console.log('🪟 Generating Windows taskbar badge overlay...');
          const badgeImage = generateBadgeOverlay(count);
          if (badgeImage && !badgeImage.isEmpty()) {
            const description = count > 99 ? '99+ notifications' : `${count} notification${count > 1 ? 's' : ''}`;
            console.log('🎨 Badge image created. Setting on taskbar...');
            try {
              mainWindow.setOverlayIcon(badgeImage, description);
              console.log('✅ SUCCESS! Badge overlay set on taskbar icon with count:', count);
              console.log('👀 CHECK YOUR TASKBAR - You should see a red circle with number on the app icon!');
            } catch (error) {
              console.error('❌ Error setting overlay icon:', error);
            }
          } else {
            console.log('⚠️ Badge image generation returned null or empty image');
          }
        } else {
          console.log('🪟 Clearing Windows taskbar badge (count is 0)');
          mainWindow.setOverlayIcon(null, '');
          console.log('✅ Badge cleared from taskbar');
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
    console.log('🐧 Linux badge count updated');
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
