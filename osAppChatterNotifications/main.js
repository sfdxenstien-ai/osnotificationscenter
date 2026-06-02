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
    // Convert SVG to data URL using base64 (more reliable on Windows)
    const base64Svg = Buffer.from(svg, 'utf-8').toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
    console.log('🎨 Converting SVG to base64 data URL...');
    
    const image = nativeImage.createFromDataURL(dataUrl);
    console.log('📐 Initial image size:', image.getSize(), 'isEmpty:', image.isEmpty());
    
    // Resize to ensure it's exactly 16x16
    const resized = image.resize({ width: 16, height: 16 });
    console.log('📐 Resized image size:', resized.getSize(), 'isEmpty:', resized.isEmpty());
    
    // Verify the image was created
    if (resized.isEmpty()) {
      console.log('⚠️ Badge image is empty after resize, trying canvas approach...');
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
 * Generate badge using raw bitmap data (guaranteed to work on Windows)
 * @param {number} count - The notification count
 * @returns {Electron.NativeImage|null} - Bitmap-based badge image
 */
function generateCanvasBadge(count) {
  if (count <= 0) return null;
  
  console.log('🎨 Generating badge using raw bitmap approach...');
  
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4); // RGBA format
  
  // Draw a red circle with white text manually
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - size/2;
      const dy = y - size/2;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const index = (y * size + x) * 4;
      
      if (distance <= size/2 - 1) {
        // Inside circle - red background
        buffer[index] = 255;     // R
        buffer[index + 1] = 59;  // G  
        buffer[index + 2] = 48;  // B
        buffer[index + 3] = 255; // A (fully opaque)
      } else {
        // Outside circle - transparent
        buffer[index] = 0;
        buffer[index + 1] = 0;
        buffer[index + 2] = 0;
        buffer[index + 3] = 0;
      }
    }
  }
  
  try {
    const image = nativeImage.createFromBuffer(buffer, { width: size, height: size });
    console.log('✅ Bitmap badge created, size:', image.getSize(), 'isEmpty:', image.isEmpty());
    return image;
  } catch (error) {
    console.error('❌ Bitmap badge generation failed:', error);
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
    
    // Log platform and badge support
    console.log('='.repeat(60));
    console.log('🚀 Chatter Notifications App Started');
    console.log('📱 Platform:', process.platform);
    console.log('🔔 Badge Support:');
    if (process.platform === 'darwin') {
      console.log('   ✅ macOS Dock Badge - Enabled');
      console.log('   ❌ Windows Taskbar Overlay - Not Available on macOS');
    } else if (process.platform === 'win32') {
      console.log('   ✅ Windows Taskbar Overlay - Enabled');
      console.log('   📍 Badge will appear on taskbar icon');
    } else {
      console.log('   ✅ Linux Badge Count - Enabled (if supported by DE)');
    }
    console.log('='.repeat(60));
  });

  // Open DevTools in development (optional)
  mainWindow.webContents.openDevTools(); // ← ENABLED for debugging

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
  console.log('\n' + '='.repeat(70));
  console.log('📊 BADGE UPDATE REQUEST RECEIVED');
  console.log('   Count:', count);
  console.log('   Platform:', process.platform);
  console.log('   Timestamp:', new Date().toLocaleTimeString());
  console.log('='.repeat(70));
  
  // Update badge count
  if (process.platform === 'darwin') {
    // macOS dock badge
    app.dock.setBadge(count > 0 ? count.toString() : '');
    console.log('🍎 macOS dock badge updated');
  } else if (process.platform === 'win32') {
    console.log('🪟 Windows Platform Detected - Processing taskbar badge...');
    
    // Windows taskbar overlay with vibrant badge
    if (!mainWindow) {
      console.log('❌ FAILED: Main window is NULL');
      return;
    }
    console.log('✅ Main window exists');
    
    if (mainWindow.isDestroyed()) {
      console.log('❌ FAILED: Main window is DESTROYED');
      return;
    }
    console.log('✅ Main window is not destroyed');
    
    if (!mainWindow.isVisible()) {
      console.log('⚠️  WARNING: Main window is NOT VISIBLE');
      console.log('   Minimized:', mainWindow.isMinimized());
      console.log('   Will retry when window becomes visible...');
      mainWindow.once('ready-to-show', () => {
        console.log('🔄 Window now visible, retrying badge update');
        event.sender.send('retry-badge-update');
      });
      return;
    }
    console.log('✅ Main window is visible');
    
    if (count <= 0) {
      console.log('📭 Count is 0 or negative - CLEARING badge');
      mainWindow.setOverlayIcon(null, '');
      console.log('✅ Badge cleared from taskbar');
      return;
    }
    console.log('✅ Count is positive:', count);
    
    console.log('🎨 Generating badge image...');
    const badgeImage = generateBadgeOverlay(count);
    
    if (!badgeImage) {
      console.log('❌ FAILED: Badge image is NULL');
      return;
    }
    console.log('✅ Badge image generated');
    
    if (badgeImage.isEmpty()) {
      console.log('❌ FAILED: Badge image is EMPTY');
      return;
    }
    console.log('✅ Badge image is not empty');
    console.log('   Image size:', badgeImage.getSize());
    
    const description = count > 99 ? '99+ notifications' : `${count} notification${count > 1 ? 's' : ''}`;
    console.log('📝 Description:', description);
    
    try {
      console.log('🔧 Calling setOverlayIcon()...');
      mainWindow.setOverlayIcon(badgeImage, description);
      console.log('');
      console.log('🎉'.repeat(35));
      console.log('✅ SUCCESS! Badge overlay set on taskbar icon!');
      console.log('   Count displayed:', count);
      console.log('👀 CHECK YOUR WINDOWS TASKBAR NOW!');
      console.log('   Look at the bottom of your screen');
      console.log('   The app icon should have a red circle with "' + count + '"');
      console.log('🎉'.repeat(35));
      console.log('');
    } catch (error) {
      console.log('❌ FAILED: Error calling setOverlayIcon()');
      console.error('   Error details:', error);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
  }
  
  // Linux doesn't have native badge support, but some desktop environments do
  // Unity launcher badge (Ubuntu)
  if (process.platform === 'linux') {
    app.setBadgeCount(count);
    console.log('🐧 Linux badge count updated');
  }
  
  console.log('='.repeat(70) + '\n');
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
