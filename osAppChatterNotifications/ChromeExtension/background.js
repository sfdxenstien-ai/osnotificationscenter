/**
 * Service Worker - Background Script
 * Manages WebSocket connection and background tasks
 */

// Import socket.io library at top level (required for service workers)
importScripts('socket.io.min.js');

const WEBSOCKET_SERVER_URL = 'https://osnotificationscenter.onrender.com';
const RECONNECT_DELAY = 5000;
const HEARTBEAT_INTERVAL = 30000;

let socket = null;
let reconnectTimeout = null;
let heartbeatInterval = null;
let notificationData = {
  myActions: [],
  pastDue: [],
  completed: []
};
let currentUserId = null;
let connectionStatus = 'disconnected';

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
  initializeExtension();
});

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeExtension() {
  console.log('Initializing extension...');
  
  // Check notification permissions
  await checkNotificationPermissions();
  
  // Load stored data
  const stored = await chrome.storage.local.get(['notifications', 'userId']);
  if (stored.notifications) {
    notificationData = stored.notifications;
  }
  if (stored.userId) {
    currentUserId = stored.userId;
  }
  
  // Check server health before connecting
  await checkServerHealth();
  
  // Connect to WebSocket
  connectToWebSocket();
  
  // Update badge
  updateBadge();
  
  // Set up periodic connection check
  chrome.alarms.create('connectionCheck', { periodInMinutes: 1 });
}

// ============================================================================
// NOTIFICATION PERMISSIONS
// ============================================================================

async function checkNotificationPermissions() {
  try {
    // In Manifest V3, notifications permission is granted at install time
    // but we should verify it's available
    const permissions = await chrome.permissions.getAll();
    console.log('Available permissions:', permissions);
    
    if (permissions.permissions.includes('notifications')) {
      console.log('✅ Notification permission granted');
      return true;
    } else {
      console.warn('⚠️ Notification permission not available');
      return false;
    }
  } catch (error) {
    console.error('Error checking notification permissions:', error);
    return false;
  }
}

function testNotification() {
  console.log('Creating test notification...');
  const testNotif = {
    notificationId: 'test-' + Date.now(),
    notificationType: 'Test Notification',
    messagePreview: 'This is a test notification to verify the system is working',
    caseNumber: 'TEST-001',
    accountName: 'Test Account'
  };
  showChromeNotification(testNotif);
}

// ============================================================================
// SERVER HEALTH CHECK
// ============================================================================

async function checkServerHealth() {
  try {
    console.log('Checking server health...');
    const response = await fetch(`${WEBSOCKET_SERVER_URL}/api/health`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is healthy:', data);
      return true;
    } else {
      console.warn('⚠️ Server responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Server health check failed:', error);
    console.error('This usually means the server is not running or not accessible');
    console.error('Please check: https://osnotificationscenter.onrender.com/api/health');
    return false;
  }
}

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

function connectToWebSocket() {
  console.log('Connecting to WebSocket server:', WEBSOCKET_SERVER_URL);
  
  socket = io(WEBSOCKET_SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: RECONNECT_DELAY,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    forceNew: true,
    path: '/socket.io/',
    autoConnect: true,
    secure: true,
    rejectUnauthorized: false
  });

  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket:', socket.id);
    connectionStatus = 'connected';
    updateBadge();
    
    if (currentUserId) {
      socket.emit('join_user_room', currentUserId);
    }
    
    startHeartbeat();
    broadcastToPopups({ type: 'CONNECTION_STATUS', status: 'connected' });
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnected from WebSocket');
    connectionStatus = 'disconnected';
    updateBadge();
    stopHeartbeat();
    broadcastToPopups({ type: 'CONNECTION_STATUS', status: 'disconnected' });
  });

  socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error description:', error.description);
    connectionStatus = 'disconnected';
    updateBadge();
    broadcastToPopups({ type: 'CONNECTION_ERROR', error: error.message });
  });

  socket.on('salesforce_notification', (data) => {
    console.log('📢 Received broadcast notification:', data);
    handleNotification(data);
  });

  socket.on('user_notification', (notification) => {
    console.log('👤 Received user notification:', notification);
    handleUserNotification(notification);
  });

  socket.on('notification_status_update', (data) => {
    console.log('🔄 Status update:', data);
    handleStatusUpdate(data);
  });
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('ping');
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

function handleNotification(data) {
  console.log('📥 handleNotification called with data:', data);
  if (!data) {
    console.warn('No data received in handleNotification');
    return;
  }

  if (data.notifications && Array.isArray(data.notifications)) {
    console.log(`Processing ${data.notifications.length} notifications`);
    data.notifications.forEach((notification, index) => {
      console.log(`Processing notification ${index + 1}:`, notification);
      addNotificationToList(notification);
      showChromeNotification(notification);
    });
  } else if (data.notification) {
    console.log('Processing single notification:', data.notification);
    addNotificationToList(data.notification);
    showChromeNotification(data.notification);
  }

  saveNotifications();
  updateBadge();
  broadcastToPopups({ type: 'NOTIFICATIONS_UPDATED', data: notificationData });
}

function handleUserNotification(notification) {
  console.log('👤 handleUserNotification called with:', notification);
  if (!notification) {
    console.warn('No notification received in handleUserNotification');
    return;
  }
  
  addNotificationToList(notification);
  showChromeNotification(notification);
  saveNotifications();
  updateBadge();
  broadcastToPopups({ type: 'NOTIFICATIONS_UPDATED', data: notificationData });
}

function handleStatusUpdate(data) {
  if (!data || !data.notificationIds) return;

  const { notificationIds, status } = data;
  
  updateNotificationStatus(notificationData.myActions, notificationIds, status);
  updateNotificationStatus(notificationData.pastDue, notificationIds, status);
  updateNotificationStatus(notificationData.completed, notificationIds, status);

  if (status === 'Completed') {
    moveToCompleted(notificationIds);
  }

  saveNotifications();
  updateBadge();
  broadcastToPopups({ type: 'NOTIFICATIONS_UPDATED', data: notificationData });
}

function addNotificationToList(notification) {
  const transformed = transformNotification(notification);
  if (!transformed) return;

  const today = new Date();
  const dueDate = transformed.dueDate ? new Date(transformed.dueDate) : null;
  const isPastDue = dueDate && dueDate < today;

  if (transformed.status === 'Completed') {
    if (!notificationData.completed.find(item => item.id === transformed.id)) {
      notificationData.completed.unshift(transformed);
    }
  } else if (isPastDue) {
    if (!notificationData.pastDue.find(item => item.id === transformed.id)) {
      notificationData.pastDue.unshift(transformed);
    }
  } else {
    if (!notificationData.myActions.find(item => item.id === transformed.id)) {
      notificationData.myActions.unshift(transformed);
    }
  }
}

function transformNotification(notification) {
  if (!notification) return null;

  const now = new Date();
  const timestamp = notification.timestamp ? new Date(notification.timestamp) : now;
  const dueDate = timestamp;
  const isPastDue = dueDate < now;

  return {
    id: notification.notificationId || notification.id || generateId(),
    feedItemId: notification.feedItemId,
    caseId: notification.caseId,
    caseNumber: notification.caseNumber,
    caseUrl: notification.caseUrl || notification.caseURL,
    accountName: notification.accountName,
    contactName: notification.contactName,
    messagePreview: notification.messagePreview || 'No message preview',
    messageThreadUrl: notification.messageThreadUrl,
    notificationType: notification.notificationType || 'Chatter Mention',
    status: notification.status || 'Pending',
    mentionedUsers: notification.mentionedUsers || [],
    timestamp: timestamp.toISOString(),
    dueDate: dueDate.toISOString(),
    isPastDue: isPastDue
  };
}

function updateNotificationStatus(list, notificationIds, newStatus) {
  list.forEach(item => {
    if (notificationIds.includes(item.id)) {
      item.status = newStatus;
    }
  });
}

function moveToCompleted(notificationIds) {
  const fromMyActions = notificationData.myActions.filter(item => notificationIds.includes(item.id));
  fromMyActions.forEach(item => {
    if (!notificationData.completed.find(comp => comp.id === item.id)) {
      notificationData.completed.unshift(item);
    }
  });
  notificationData.myActions = notificationData.myActions.filter(item => !notificationIds.includes(item.id));

  const fromPastDue = notificationData.pastDue.filter(item => notificationIds.includes(item.id));
  fromPastDue.forEach(item => {
    if (!notificationData.completed.find(comp => comp.id === item.id)) {
      notificationData.completed.unshift(item);
    }
  });
  notificationData.pastDue = notificationData.pastDue.filter(item => !notificationIds.includes(item.id));
}

// ============================================================================
// CHROME NOTIFICATIONS
// ============================================================================

function showChromeNotification(notification) {
  console.log('🔔 showChromeNotification called with:', notification);
  
  const notificationId = notification.notificationId || notification.id || generateId();
  console.log('Creating notification with ID:', notificationId);
  
  const options = {
    type: 'basic',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/2965/2965260.png',
    title: '🔔 ' + (notification.notificationType || 'New Salesforce Notification'),
    message: notification.messagePreview || 'You have a new notification',
    contextMessage: notification.caseNumber ? `Case: ${notification.caseNumber}` : (notification.accountName || ''),
    priority: 2,
    requireInteraction: true, // Keep notification visible until user interacts
    silent: false, // Play notification sound
    buttons: [
      { title: 'View Now' },
      { title: 'Dismiss' }
    ]
  };

  console.log('Notification options:', options);

  chrome.notifications.create(notificationId, options, (createdId) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error creating notification:', chrome.runtime.lastError);
      return;
    }
    console.log('✅ Chrome notification created successfully:', createdId);
    // Update badge to show new notification count
    updateBadge();
  });
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  // Open the extension popup by opening the action
  chrome.action.openPopup().catch(() => {
    // If popup fails to open (e.g., in background), try opening in new window
    chrome.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600
    });
  });
  // Clear the notification
  chrome.notifications.clear(notificationId);
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('Notification button clicked:', notificationId, buttonIndex);
  
  if (buttonIndex === 0) { // View Now button
    chrome.action.openPopup().catch(() => {
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 400,
        height: 600
      });
    });
  }
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
});

// Handle notification closed
chrome.notifications.onClosed.addListener((notificationId, byUser) => {
  console.log('Notification closed:', notificationId, 'by user:', byUser);
});

// ============================================================================
// BADGE MANAGEMENT
// ============================================================================

function updateBadge() {
  const count = notificationData.myActions.length + notificationData.pastDue.length;
  
  if (count > 0) {
    chrome.action.setBadgeText({ text: count > 99 ? '99+' : count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#FF3B30' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ============================================================================
// STORAGE
// ============================================================================

async function saveNotifications() {
  await chrome.storage.local.set({ notifications: notificationData });
}

// ============================================================================
// MESSAGE PASSING
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  switch (message.type) {
    case 'GET_NOTIFICATIONS':
      sendResponse({ 
        data: notificationData, 
        status: connectionStatus 
      });
      break;
      
    case 'MARK_AS_COMPLETED':
      handleStatusUpdate({
        notificationIds: [message.notificationId],
        status: 'Completed'
      });
      sendResponse({ success: true });
      break;
      
    case 'REFRESH':
      if (socket && socket.connected) {
        socket.emit('request_refresh');
        sendResponse({ success: true });
      } else {
        connectToWebSocket();
        sendResponse({ success: false, error: 'Reconnecting...' });
      }
      break;
      
    case 'SET_USER_ID':
      currentUserId = message.userId;
      chrome.storage.local.set({ userId: currentUserId });
      if (socket && socket.connected) {
        socket.emit('join_user_room', currentUserId);
      }
      sendResponse({ success: true });
      break;
      
    case 'TEST_NOTIFICATION':
      testNotification();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return true; // Keep channel open for async response
});

function broadcastToPopups(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // No popup open, ignore
  });
}

// ============================================================================
// ALARM HANDLERS
// ============================================================================

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'connectionCheck') {
    if (!socket || !socket.connected) {
      console.log('Connection lost, reconnecting...');
      connectToWebSocket();
    }
  }
});

// ============================================================================
// UTILITIES
// ============================================================================

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
