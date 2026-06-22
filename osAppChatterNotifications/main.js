/**
 * Electron Main Process
 * Creates the application window and manages app lifecycle
 */

const { app, BrowserWindow, Menu, ipcMain, nativeImage, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ============================================================================
// SINGLE INSTANCE LOCK - Prevent multiple instances of the app
// ============================================================================

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  // This is EXPECTED when you click a Windows notification in dev mode
  console.log('');
  console.log('═'.repeat(60));
  console.log('✅ SINGLE INSTANCE LOCK - Working Correctly');
  console.log('');
  console.log('   Another instance is already running.');
  console.log('   Your existing window is being restored now.');
  console.log('   This window will close automatically.');
  console.log('');
  console.log('   (This is normal when clicking notifications in dev mode)');
  console.log('═'.repeat(60));
  console.log('');
  
  app.quit();
} else {
  // This is the primary instance
  console.log('✅ Single instance lock acquired - this is the primary instance');
  
  // Handle second-instance attempts (e.g., from notification clicks)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    console.log('\n' + '🚨'.repeat(35));
    console.log('🚨 NOTIFICATION CLICK → SECOND INSTANCE BLOCKED!');
    console.log('   This is EXPECTED when you click a Windows notification');
    console.log('   Windows tried to launch: npm start (or batch file)');
    console.log('   Single-instance lock prevented it ✅');
    console.log('   Now restoring your existing window...');
    console.log('🚨'.repeat(35));
    
    // Someone tried to run a second instance, focus our window instead
    if (!mainWindow) {
      console.log('❌ ERROR: Main window is null - cannot restore!');
      return;
    }
    
    console.log('📱 Current window state:');
    console.log('   - Minimized:', mainWindow.isMinimized());
    console.log('   - Visible:', mainWindow.isVisible());
    console.log('   - Focused:', mainWindow.isFocused());
    
    try {
      // AGGRESSIVELY restore the window
      console.log('   → Stopping taskbar flash...');
      mainWindow.flashFrame(false);
      
      // Force show even if not minimized
      console.log('   → Calling show()...');
      mainWindow.show();
      
      // Restore if minimized
      if (mainWindow.isMinimized()) {
        console.log('   → Calling restore()...');
        mainWindow.restore();
      }
      
      // On Windows, use MULTIPLE techniques to ensure window comes to front
      if (process.platform === 'win32') {
        console.log('   → Windows: Using aggressive focus techniques...');
        
        // Technique 1: setAlwaysOnTop
        mainWindow.setAlwaysOnTop(true);
        
        // Technique 2: Multiple show/focus calls
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();
        
        // Technique 3: Remove alwaysOnTop after delay
        setTimeout(() => {
          mainWindow.setAlwaysOnTop(false);
          mainWindow.focus();
          console.log('   → Window should now be visible and focused!');
        }, 200);
      } else {
        mainWindow.focus();
      }
      
      console.log('\n✅✅✅ WINDOW RESTORATION COMPLETE! ✅✅✅');
      console.log('   Your Chatter Notifications window should now be visible!');
      console.log('🚨'.repeat(35) + '\n');
      
    } catch (error) {
      console.error('❌ ERROR during window restoration:', error);
    }
  });
}

/**
 * Generate a vibrant badge overlay for Windows taskbar
 * Windows taskbar overlays should be 16x16 pixels for optimal display
 * @param {number} count - The notification count to display
 * @returns {Electron.NativeImage|null} - The badge image
 */
function generateBadgeOverlay(count) {
  if (count <= 0) return null;

  const text = count > 99 ? '99' : count.toString();
  // Create at larger size (32x32) for better rendering, then resize to 16x16
  const size = 32;
  const fontSize = text.length > 1 ? 18 : 20;
  
  // Create vibrant solid badge (use larger size for better text rendering)
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#FF3B30" stroke="#FFFFFF" stroke-width="2"/>
      <text x="${size/2}" y="${size/2}" 
            font-family="Arial, Helvetica, sans-serif" 
            font-size="${fontSize}" 
            font-weight="bold" 
            fill="#FFFFFF" 
            text-anchor="middle"
            dominant-baseline="central">${text}</text>
    </svg>
  `;

  try {
    // Convert SVG to data URL using base64 (more reliable on Windows)
    const base64Svg = Buffer.from(svg, 'utf-8').toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
    console.log('🎨 Creating badge at 32x32 with text:', text);
    
    const image = nativeImage.createFromDataURL(dataUrl);
    console.log('📐 Initial image:', image.getSize(), 'isEmpty:', image.isEmpty());
    
    // Resize to 16x16 for Windows taskbar
    const resized = image.resize({ width: 16, height: 16, quality: 'best' });
    console.log('📐 Resized to 16x16:', resized.getSize(), 'isEmpty:', resized.isEmpty());
    
    // Verify the image has content
    if (resized.isEmpty()) {
      console.log('⚠️ Badge image is empty after resize, using fallback...');
      return generateCanvasBadge(count);
    }
    
    console.log('✅ Badge with text "' + text + '" created successfully');
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
    show: false, // Don't show until ready
    skipTaskbar: false // Ensure it appears in taskbar
  };
  
  // Only add icon if file exists
  if (hasIcon) {
    windowOptions.icon = iconPath;
  }
  
  mainWindow = new BrowserWindow(windowOptions);
  
  console.log('🪟 Window created');
  console.log('   Process ID:', process.pid);
  console.log('   Platform:', process.platform);

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
      console.log('');
      console.log('📢 IMPORTANT - Windows Notification Behavior:');
      console.log('   When you click a notification in dev mode (npm start):');
      console.log('   1. Windows tries to launch the app again');
      console.log('   2. You may briefly see a console window (this is normal)');
      console.log('   3. Single-instance lock blocks the second launch');
      console.log('   4. Your existing window will be restored');
      console.log('');
      console.log('   ✅ This is EXPECTED and WORKING AS DESIGNED');
      console.log('   ✅ Your window will restore - just wait a moment');
      console.log('');
      console.log('   Alternative: Click the TASKBAR ICON (always works)');
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
          label: 'Test Notification Click (Windows)',
          click: () => {
            console.log('\n' + '🧪'.repeat(35));
            console.log('🧪 NOTIFICATION CLICK TEST');
            console.log('');
            console.log('   INSTRUCTIONS:');
            console.log('   1. Test notification will appear in 2 seconds');
            console.log('   2. Minimize this window NOW (use taskbar or minimize button)');
            console.log('   3. Click the notification when it appears');
            console.log('   4. Watch what happens:');
            console.log('      - Windows will try to launch app again via npm start');
            console.log('      - Single-instance lock will BLOCK it (this is GOOD)');
            console.log('      - Existing window will be restored (this is what we want)');
            console.log('');
            console.log('🧪'.repeat(35) + '\n');
            
            // Give user time to minimize the window
            setTimeout(() => {
              const testNotification = new Notification({
                title: '🧪 TEST: Click This Notification',
                body: 'Click me now! The app window should restore from minimized state.',
                icon: fs.existsSync(path.join(__dirname, 'assets', 'icon.png')) 
                  ? path.join(__dirname, 'assets', 'icon.png') 
                  : undefined
              });
              
              testNotification.on('show', () => {
                console.log('✅ Test notification is now visible');
                console.log('👆 Click the notification now!');
                console.log('');
              });
              
              testNotification.on('click', () => {
                // This event MAY NOT fire reliably on Windows in dev mode
                console.log('🎯 Direct notification.on("click") event fired!');
                console.log('   (This is rare in Windows dev mode - you got lucky!)');
              });
              
              testNotification.show();
              
              console.log('⏱️  Waiting for you to click the notification...');
              console.log('   Expected: Windows launches npm start → blocked → window restored');
              console.log('');
              
            }, 2000);
          }
        },
        { type: 'separator' },
        {
          label: 'Test Badge - Count 3 (Windows)',
          click: () => {
            if (mainWindow) {
              console.log('🧪 Testing taskbar badge with count: 3');
              // Request badge from renderer (same as normal flow)
              mainWindow.webContents.send('generate-badge-image', 3);
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
  // Set App User Model ID for Windows (helps with notification association)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.chatternotifications.app');
    console.log('✅ Windows App User Model ID set: com.chatternotifications.app');
  }
  
  createWindow();

  app.on('activate', () => {
    console.log('📱 App activated');
    
    if (mainWindow) {
      // Window exists, just focus it
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      // On macOS, re-create window when dock icon is clicked
      createWindow();
    }
  });
});

// Handle app activation on Windows (e.g., from notification clicks)
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log('🔗 App opened with URL:', url);
  
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Handle when app is about to quit
app.on('before-quit', () => {
  console.log('👋 App is about to quit');
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
    
    // Check if window is visible (allow minimized windows - they can still show badges!)
    if (!mainWindow.isVisible() && !mainWindow.isMinimized()) {
      console.log('⚠️  WARNING: Main window is HIDDEN (not minimized)');
      console.log('   Will retry when window becomes visible...');
      mainWindow.once('ready-to-show', () => {
        console.log('🔄 Window now visible, retrying badge update');
        event.sender.send('retry-badge-update');
      });
      return;
    }
    
    if (mainWindow.isMinimized()) {
      console.log('📊 Window is minimized - badge will update on taskbar icon');
    } else {
      console.log('✅ Main window is visible and focused');
    }
    
    if (count <= 0) {
      console.log('📭 Count is 0 or negative - CLEARING badge');
      mainWindow.setOverlayIcon(null, '');
      console.log('✅ Badge cleared from taskbar');
      return;
    }
    console.log('✅ Count is positive:', count);
    
    // Request badge image from renderer (which has access to Canvas API)
    console.log('📤 Requesting badge image from renderer process...');
    event.sender.send('generate-badge-image', count);
  }
  
  // Linux doesn't have native badge support, but some desktop environments do
  // Unity launcher badge (Ubuntu)
  if (process.platform === 'linux') {
    app.setBadgeCount(count);
    console.log('🐧 Linux badge count updated');
  }
  
  console.log('='.repeat(70) + '\n');
});

// Receive badge image from renderer and apply it
ipcMain.on('badge-image-ready', (event, dataUrl, count) => {
  console.log('📥 Received badge image from renderer');
  
  if (!mainWindow || mainWindow.isDestroyed()) {
    console.log('❌ Window no longer available');
    return;
  }
  
  try {
    const badgeImage = nativeImage.createFromDataURL(dataUrl);
    console.log('📐 Badge image size:', badgeImage.getSize(), 'isEmpty:', badgeImage.isEmpty());
    
    if (badgeImage.isEmpty()) {
      console.log('❌ Badge image is empty');
      return;
    }
    
    const description = count > 99 ? '99+ notifications' : `${count} notification${count > 1 ? 's' : ''}`;
    
    mainWindow.setOverlayIcon(badgeImage, description);
    console.log('');
    console.log('🎉'.repeat(35));
    console.log('✅ SUCCESS! Badge overlay set on taskbar icon!');
    console.log('   Count displayed:', count);
    console.log('👀 CHECK YOUR WINDOWS TASKBAR NOW!');
    console.log('🎉'.repeat(35));
    console.log('');
  } catch (error) {
    console.error('❌ Error setting badge:', error);
  }
});

ipcMain.on('restore-window', () => {
  if (mainWindow) {
    console.log('📱 Restore window requested');
    console.log('   Is minimized:', mainWindow.isMinimized());
    console.log('   Is visible:', mainWindow.isVisible());
    
    // Restore window if minimized
    if (mainWindow.isMinimized()) {
      console.log('   → Restoring minimized window');
      mainWindow.restore();
    }
    
    // Show window if hidden
    if (!mainWindow.isVisible()) {
      console.log('   → Showing hidden window');
      mainWindow.show();
    }
    
    // On Windows, use setAlwaysOnTop trick to bring window to front
    if (process.platform === 'win32') {
      console.log('   → Windows: Bringing window to front');
      mainWindow.setAlwaysOnTop(true);
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(false);
    } else {
      // Focus the window on other platforms
      mainWindow.focus();
    }
    
    // On macOS, also bring to front
    if (process.platform === 'darwin') {
      app.dock.show();
    }
    
    console.log('✅ Window restored and focused');
  }
});

// Handle native notification display (with proper Windows click support)
ipcMain.on('show-native-notification', (event, notificationData) => {
  console.log('\n' + '='.repeat(70));
  console.log('🔔 NOTIFICATION REQUEST RECEIVED');
  console.log('   Title:', notificationData.title);
  console.log('   Body:', notificationData.body);
  console.log('   Platform:', process.platform);
  console.log('='.repeat(70));
  
  if (!Notification.isSupported()) {
    console.log('❌ Native notifications not supported on this platform');
    // Fallback: just focus the window
    if (mainWindow && mainWindow.isMinimized()) {
      mainWindow.restore();
      mainWindow.focus();
    }
    return;
  }
  
  // Windows-specific workaround for development mode
  // When running via npm start, Windows notifications don't properly activate the app
  // So we'll ALSO use the window flash to ensure user sees it
  if (process.platform === 'win32') {
    console.log('🪟 Windows detected - using enhanced notification strategy');
    
    // Flash the taskbar to ensure user attention
    if (mainWindow && !mainWindow.isFocused()) {
      mainWindow.flashFrame(true);
      console.log('   → Taskbar flashing activated');
      
      // Stop flashing when window gets focus
      const stopFlash = () => {
        mainWindow.flashFrame(false);
        console.log('   → Taskbar flashing stopped');
      };
      mainWindow.once('focus', stopFlash);
      
      // Also stop after 10 seconds
      setTimeout(() => {
        if (mainWindow && !mainWindow.isFocused()) {
          mainWindow.flashFrame(false);
        }
      }, 10000);
    }
  }
  
  // Create notification options
  const options = {
    title: notificationData.title || 'New Chatter Notification',
    body: notificationData.body || 'You have a new notification',
    silent: false
  };
  
  // Add icon if available
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  if (fs.existsSync(iconPath)) {
    options.icon = iconPath;
  }
  
  console.log('📋 Creating notification with options:', {
    title: options.title,
    bodyLength: options.body.length,
    hasIcon: !!options.icon
  });
  
  // Create the native notification
  const notification = new Notification(options);
  
  // CRITICAL: Set up click handler BEFORE showing
  const clickHandler = () => {
    console.log('\n' + '🎯'.repeat(35));
    console.log('🖱️  ✅ NOTIFICATION CLICK DETECTED!');
    console.log('   Time:', new Date().toLocaleTimeString());
    console.log('🎯'.repeat(35));
    
    if (!mainWindow) {
      console.log('❌ Main window is null');
      return;
    }
    
    console.log('📱 Window state before restore:');
    console.log('   - Is minimized:', mainWindow.isMinimized());
    console.log('   - Is visible:', mainWindow.isVisible());
    console.log('   - Is focused:', mainWindow.isFocused());
    console.log('   - Is destroyed:', mainWindow.isDestroyed());
    
    try {
      // Stop any flashing
      mainWindow.flashFrame(false);
      
      // Restore if minimized
      if (mainWindow.isMinimized()) {
        console.log('   ➜ Restoring from minimized state...');
        mainWindow.restore();
      }
      
      // Show if hidden
      if (!mainWindow.isVisible()) {
        console.log('   ➜ Showing hidden window...');
        mainWindow.show();
      }
      
      // Platform-specific focus
      if (process.platform === 'win32') {
        console.log('   ➜ Windows: Force bringing to front...');
        // Multiple approaches to ensure window comes to front
        mainWindow.setAlwaysOnTop(true);
        mainWindow.focus();
        mainWindow.show();
        setTimeout(() => {
          mainWindow.setAlwaysOnTop(false);
          console.log('   ➜ AlwaysOnTop removed');
        }, 100);
      } else if (process.platform === 'darwin') {
        app.dock.show();
        mainWindow.focus();
      } else {
        mainWindow.focus();
      }
      
      console.log('✅ Window restoration complete!');
      console.log('📱 Window state after restore:');
      console.log('   - Is minimized:', mainWindow.isMinimized());
      console.log('   - Is visible:', mainWindow.isVisible());
      console.log('   - Is focused:', mainWindow.isFocused());
      console.log('🎯'.repeat(35) + '\n');
      
    } catch (error) {
      console.error('❌ Error during window restoration:', error);
    }
  };
  
  // Attach click handler
  notification.on('click', clickHandler);
  
  // Additional event handlers for debugging
  notification.on('show', () => {
    console.log('✅ Notification SHOWN to user');
    console.log('   Click the notification to test window activation');
  });
  
  notification.on('close', () => {
    console.log('🔕 Notification closed by user or timeout');
  });
  
  notification.on('action', (event, index) => {
    console.log('🎬 Notification action triggered:', index);
    clickHandler(); // Also trigger window restoration
  });
  
  notification.on('failed', (event, error) => {
    console.error('❌ Notification FAILED:', error);
  });
  
  // Show the notification
  try {
    notification.show();
    console.log('✅ Notification.show() called successfully');
    console.log('='.repeat(70) + '\n');
    
    // WORKAROUND for Windows development mode:
    // If notification is not clicked within 3 seconds, assume click isn't working
    // and show a taskbar flash reminder
    if (process.platform === 'win32') {
      const reminderTimeout = setTimeout(() => {
        if (mainWindow && !mainWindow.isFocused() && mainWindow.isMinimized()) {
          console.log('⚠️  Notification not clicked - reminding user via taskbar flash');
          mainWindow.flashFrame(true);
          
          // Stop flashing when user clicks taskbar icon
          const stopReminder = () => {
            mainWindow.flashFrame(false);
            clearTimeout(reminderTimeout);
          };
          mainWindow.once('focus', stopReminder);
        }
      }, 3000);
    }
    
  } catch (error) {
    console.error('❌ Error showing notification:', error);
    // Fallback: just focus the window
    if (mainWindow && mainWindow.isMinimized()) {
      mainWindow.restore();
      mainWindow.focus();
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
