/**
 * Renderer Process - WebSocket Client and UI Logic
 * Connects to WebSocket server and handles real-time notifications
 */

// Configuration
const WEBSOCKET_SERVER_URL = 'https://osnotificationscenter.onrender.com';

// State Management
let socket = null;
let notifications = {
    myActions: [],
    pastDue: [],
    completed: []
};
let currentSection = 'myActions';
let currentUserId = null; // Will be set from first notification or config

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================

function connectToWebSocket() {
    console.log('Connecting to WebSocket server:', WEBSOCKET_SERVER_URL);
    
    // Use socket.io-client from CDN (same as test-client.html)
    socket = io(WEBSOCKET_SERVER_URL, {
        transports: ['polling', 'websocket'],
        upgrade: true
    });

    // Connection events
    socket.on('connect', () => {
        console.log('✅ Connected to WebSocket server:', socket.id);
        updateConnectionStatus('connected', 'Connected');
        
        // Join user room if userId is available
        if (currentUserId) {
            socket.emit('join_user_room', currentUserId);
        }
        
        hideLoading();
        renderNotifications();
    });

    socket.on('disconnect', () => {
        console.log('❌ Disconnected from WebSocket server');
        updateConnectionStatus('disconnected', 'Disconnected');
    });

    socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        updateConnectionStatus('disconnected', 'Connection Error');
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        updateConnectionStatus('connected', 'Reconnected');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt:', attemptNumber);
        updateConnectionStatus('connecting', `Reconnecting... (${attemptNumber})`);
    });

    // Listen for Salesforce notification events
    socket.on('salesforce_notification', (data) => {
        console.log('📢 Received broadcast notification:', data);
        handleWebSocketNotification(data);
    });

    socket.on('user_notification', (notification) => {
        console.log('👤 Received user-specific notification:', notification);
        handleUserNotification(notification);
    });

    socket.on('notification_status_update', (data) => {
        console.log('🔄 Notification status update:', data);
        handleStatusUpdate(data);
    });

    // Other WebSocket events
    socket.on('status', (data) => {
        console.log('Server status:', data);
    });
}

// ============================================================================
// NOTIFICATION HANDLERS
// ============================================================================

function handleWebSocketNotification(data) {
    if (!data) return;

    // Handle batch notifications
    if (data.notifications && Array.isArray(data.notifications)) {
        data.notifications.forEach(notification => {
            addNotificationToList(notification);
        });
    } 
    // Handle single notification
    else if (data.notification) {
        addNotificationToList(data.notification);
    }

    renderNotifications();
    updateLastUpdate();
}

function handleUserNotification(notification) {
    if (!notification) return;
    
    addNotificationToList(notification);
    renderNotifications();
    updateLastUpdate();
    
    // Show desktop notification if supported
    showDesktopNotification(notification);
}

function handleStatusUpdate(data) {
    if (!data || !data.notificationIds) return;

    const notificationIds = data.notificationIds;
    const newStatus = data.status;

    // Update status in all lists
    updateNotificationStatus(notifications.myActions, notificationIds, newStatus);
    updateNotificationStatus(notifications.pastDue, notificationIds, newStatus);
    updateNotificationStatus(notifications.completed, notificationIds, newStatus);

    // Move to completed if status is Completed
    if (newStatus === 'Completed') {
        moveToCompleted(notificationIds);
    }

    renderNotifications();
    updateLastUpdate();
}

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

function addNotificationToList(notification) {
    const transformed = transformNotification(notification);
    
    if (!transformed) return;

    const today = new Date();
    const dueDate = transformed.dueDate ? new Date(transformed.dueDate) : null;
    const isPastDue = dueDate && dueDate < today;
    
    let isNewNotification = false;
    
    // Determine which list to add to
    if (transformed.status === 'Completed') {
        if (!notifications.completed.find(item => item.id === transformed.id)) {
            notifications.completed.unshift(transformed);
            isNewNotification = true;
        }
    } else if (isPastDue) {
        if (!notifications.pastDue.find(item => item.id === transformed.id)) {
            notifications.pastDue.unshift(transformed);
            isNewNotification = true;
        }
    } else {
        if (!notifications.myActions.find(item => item.id === transformed.id)) {
            notifications.myActions.unshift(transformed);
            isNewNotification = true;
            
            // Show desktop notification and flash window for new My Actions items
            showDesktopNotification(transformed);
            flashWindow();
        }
    }

    // Update badge counts
    if (isNewNotification) {
        updateBadgeCounts();
        updateTaskbarBadge();
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
        timestamp: timestamp,
        dueDate: dueDate,
        formattedDate: formatDate(dueDate),
        formattedTimestamp: formatTimestamp(timestamp),
        isPastDue: isPastDue,
        rowClass: isPastDue ? 'row-overdue' : 'row-pending'
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
    // Move from myActions to completed
    const fromMyActions = notifications.myActions.filter(item => notificationIds.includes(item.id));
    fromMyActions.forEach(item => {
        if (!notifications.completed.find(comp => comp.id === item.id)) {
            item.rowClass = 'row-completed';
            notifications.completed.unshift(item);
        }
    });
    notifications.myActions = notifications.myActions.filter(item => !notificationIds.includes(item.id));

    // Move from pastDue to completed
    const fromPastDue = notifications.pastDue.filter(item => notificationIds.includes(item.id));
    fromPastDue.forEach(item => {
        if (!notifications.completed.find(comp => comp.id === item.id)) {
            item.rowClass = 'row-completed';
            notifications.completed.unshift(item);
        }
    });
    notifications.pastDue = notifications.pastDue.filter(item => !notificationIds.includes(item.id));
}

// ============================================================================
// UI RENDERING
// ============================================================================

function renderNotifications() {
    const list = getCurrentList();
    const tbody = document.getElementById('notificationTableBody');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');
    const contentHeader = document.getElementById('contentHeader');

    if (list.length === 0) {
        // Show empty state
        tbody.innerHTML = '';
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        contentHeader.style.display = 'flex';
        updateEmptyState();
    } else {
        // Show table with notifications
        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';
        contentHeader.style.display = 'flex';
        
        tbody.innerHTML = list.map(notification => createNotificationRow(notification)).join('');
    }

    updateBadgeCounts();
}

function createNotificationRow(notification) {
    const statusClass = getStatusClass(notification.status, notification.isPastDue);
    const statusIcon = getStatusIcon(notification.status, notification.isPastDue);
    
    return `
        <tr class="${notification.rowClass}">
            <td class="col-status">
                <span class="status-badge ${statusClass}">
                    ${statusIcon}
                    ${notification.status}
                </span>
            </td>
            <td class="col-duedate">
                <div class="date-cell">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
                    </svg>
                    <span class="${notification.isPastDue ? 'date-overdue' : 'date-normal'}">${notification.formattedDate}</span>
                </div>
            </td>
            <td class="col-case">
                <span class="link-primary" title="${notification.caseId}" onclick="openCaseUrl('${escapeHtml(notification.caseUrl || '')}')" style="cursor: ${notification.caseUrl ? 'pointer' : 'default'}">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    ${notification.caseNumber || 'N/A'}
                </span>
            </td>
            <td class="col-message">
                <button class="btn-view-message" onclick="viewMessage('${notification.id}')">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                    </svg>
                    View Message
                </button>
            </td>
            <td class="col-timestamp">
                <span class="text-muted">${notification.formattedTimestamp}</span>
            </td>
        </tr>
    `;
}

function getStatusClass(status, isPastDue) {
    if (status === 'Completed') return 'status-completed';
    if (isPastDue) return 'status-overdue';
    return 'status-pending';
}

function getStatusIcon(status, isPastDue) {
    if (status === 'Completed') {
        return '<svg class="status-icon" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    }
    if (isPastDue) {
        return '<svg class="status-icon" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
    }
    return '<svg class="status-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
}

function updateEmptyState() {
    const emptyTitle = document.getElementById('emptyTitle');
    const emptyMessage = document.getElementById('emptyMessage');

    switch (currentSection) {
        case 'myActions':
            emptyTitle.textContent = 'No pending actions';
            emptyMessage.textContent = "You're all caught up! No tasks require your attention right now.";
            break;
        case 'pastDue':
            emptyTitle.textContent = 'No overdue items';
            emptyMessage.textContent = 'Great work! You have no past due notifications.';
            break;
        case 'completed':
            emptyTitle.textContent = 'No completed items';
            emptyMessage.textContent = 'Completed notifications will appear here.';
            break;
    }
}

// ============================================================================
// UI UPDATES
// ============================================================================

function updateConnectionStatus(status, text) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    statusDot.className = 'status-dot status-' + status;
    statusText.textContent = text;
}

function updateBadgeCounts() {
    document.getElementById('myActionsCount').textContent = notifications.myActions.length;
    document.getElementById('pastDueCount').textContent = notifications.pastDue.length;
    document.getElementById('completedCount').textContent = notifications.completed.length;
}

function updateTaskbarBadge() {
    const totalPending = notifications.myActions.length + notifications.pastDue.length;
    
    console.log('\n' + '─'.repeat(70));
    console.log('🔔 RENDERER: Updating taskbar badge');
    console.log('   My Actions:', notifications.myActions.length);
    console.log('   Past Due:', notifications.pastDue.length);
    console.log('   Total Pending:', totalPending);
    console.log('─'.repeat(70));
    
    // Try to update badge count if Electron is available
    if (window.require) {
        try {
            const { ipcRenderer } = window.require('electron');
            // Send badge count to main process
            console.log('📤 Sending IPC message: update-badge-count with count:', totalPending);
            ipcRenderer.send('update-badge-count', totalPending);
            console.log('✅ IPC message sent successfully');
        } catch (err) {
            console.log('❌ Electron IPC not available for badge update:', err);
        }
    } else {
        console.log('⚠️  window.require is not available (running in browser?)');
    }
    
    // Update page title with count for browser tab
    if (totalPending > 0) {
        document.title = `(${totalPending}) Chatter Notifications`;
        console.log('📝 Page title updated:', document.title);
    } else {
        document.title = 'Chatter Notifications';
        console.log('📝 Page title reset');
    }
    console.log('─'.repeat(70) + '\n');
}

function flashWindow() {
    // Flash the window in taskbar to get user's attention
    if (window.require) {
        try {
            const { ipcRenderer } = window.require('electron');
            // Request window flash from main process
            ipcRenderer.send('flash-window');
        } catch (err) {
            console.log('Electron IPC not available for window flash');
        }
    }
    
    // Play notification sound if available
    playNotificationSound();
}

function playNotificationSound() {
    try {
        // Create a simple beep sound using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
        console.log('Could not play notification sound:', err);
    }
}

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString();
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function updateSectionHeader() {
    const titleMap = {
        myActions: 'My Actions',
        pastDue: 'Past Due',
        completed: 'Completed'
    };
    
    const subtitleMap = {
        myActions: 'Tasks requiring your attention',
        pastDue: 'Overdue notifications',
        completed: 'Completed notifications'
    };
    
    document.getElementById('sectionTitle').textContent = titleMap[currentSection];
    document.getElementById('sectionSubtitle').textContent = subtitleMap[currentSection];
}

// ============================================================================
// NAVIGATION
// ============================================================================

function showMyActions() {
    currentSection = 'myActions';
    setActiveMenuItem('menuMyActions');
    updateSectionHeader();
    renderNotifications();
}

function showPastDue() {
    currentSection = 'pastDue';
    setActiveMenuItem('menuPastDue');
    updateSectionHeader();
    renderNotifications();
}

function showCompleted() {
    currentSection = 'completed';
    setActiveMenuItem('menuCompleted');
    updateSectionHeader();
    renderNotifications();
}

function setActiveMenuItem(menuId) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.getElementById(menuId).classList.add('active');
}

function getCurrentList() {
    return notifications[currentSection] || [];
}

// ============================================================================
// MODAL
// ============================================================================

function viewMessage(notificationId) {
    const modal = document.getElementById('messageModal');
    const modalContent = document.getElementById('modalContent');
    
    // Find the notification in all lists
    let notification = null;
    notification = notifications.myActions.find(n => n.id === notificationId) ||
                   notifications.pastDue.find(n => n.id === notificationId) ||
                   notifications.completed.find(n => n.id === notificationId);
    
    if (notification && notification.messagePreview) {
        modalContent.textContent = notification.messagePreview;
        modal.style.display = 'flex';
    } else {
        console.error('Notification not found or no message preview available:', notificationId);
    }
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
}

function openCaseUrl(url) {
    if (!url || url === '') {
        console.log('No case URL available');
        return;
    }
    
    console.log('Opening case URL:', url);
    
    // Try to use Electron's shell if available
    if (window.require) {
        try {
            const { shell } = window.require('electron');
            shell.openExternal(url);
            return;
        } catch (err) {
            console.log('Electron shell not available, using window.open');
        }
    }
    
    // Fallback to window.open
    window.open(url, '_blank');
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDate(date) {
    if (!date) return 'N/A';
    
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 1) return `In ${diffDays} days`;
    
    return date.toLocaleDateString();
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return timestamp.toLocaleDateString();
}

function generateId() {
    return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}

function generateVibrantNotificationIcon() {
    // Create vibrant notification bell icon with gradient background
    const svg = `
        <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#5C6BC0;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#7B1FA2;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="dotGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" style="stop-color:#FF5252;stop-opacity:1" />
                    <stop offset="70%" style="stop-color:#FF1744;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#D50000;stop-opacity:1" />
                </radialGradient>
            </defs>
            <rect width="256" height="256" rx="38" ry="38" fill="url(#bgGradient)"/>
            <path d="M 84 145 Q 84 98 128 98 Q 172 98 172 145 L 84 145 Z" fill="white"/>
            <ellipse cx="128" cy="145" rx="44" ry="10" fill="white"/>
            <circle cx="128" cy="165" r="12" fill="#FFD700"/>
            <path d="M 113 93 Q 113 83 128 83 Q 143 83 143 93" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>
            <circle cx="185" cy="90" r="30" fill="url(#dotGradient)"/>
            <circle cx="185" cy="90" r="30" fill="none" stroke="white" stroke-width="3"/>
        </svg>
    `;
    
    // Convert SVG to data URL
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

function refreshNotifications() {
    console.log('Refreshing notifications...');
    renderNotifications();
    updateLastUpdate();
}

function showDesktopNotification(notification) {
    if (!('Notification' in window)) {
        return;
    }
    
    if (Notification.permission === 'granted') {
        // Generate vibrant notification icon using SVG data URL
        const vibrantIcon = generateVibrantNotificationIcon();
        
        const notif = new Notification('New Chatter Notification', {
            body: notification.messagePreview || 'You have a new notification',
            icon: vibrantIcon,
            tag: notification.id || notification.notificationId,
            badge: vibrantIcon,
            requireInteraction: false,
            silent: false
        });
        
        // Auto close after 5 seconds
        setTimeout(() => notif.close(), 5000);
        
        // Focus window when notification is clicked
        notif.onclick = () => {
            // Request main process to restore and focus the window
            if (window.require) {
                try {
                    const { ipcRenderer } = window.require('electron');
                    ipcRenderer.send('restore-window');
                } catch (err) {
                    console.log('Electron IPC not available, using window.focus fallback');
                    window.focus();
                }
            } else {
                window.focus();
            }
            notif.close();
        };
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showDesktopNotification(notification);
            }
        });
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Chatter Notifications Desktop App started');
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    // Connect to WebSocket server
    connectToWebSocket();
    
    // Set initial section
    updateSectionHeader();
    
    // Listen for section switching from menu shortcuts
    if (window.require) {
        try {
            const { ipcRenderer } = window.require('electron');
            
            ipcRenderer.on('switch-section', (event, section) => {
                switch(section) {
                    case 'myActions':
                        showMyActions();
                        break;
                    case 'pastDue':
                        showPastDue();
                        break;
                    case 'completed':
                        showCompleted();
                        break;
                }
            });
            
            // Listen for retry badge update request
            ipcRenderer.on('retry-badge-update', () => {
                console.log('🔄 Retrying badge update as requested by main process');
                updateTaskbarBadge();
            });
            
            // Listen for badge image generation request (Windows)
            ipcRenderer.on('generate-badge-image', (event, count) => {
                console.log('🎨 Generating badge image using Canvas API for count:', count);
                
                // Create an offscreen canvas
                const canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;
                const ctx = canvas.getContext('2d');
                
                // Draw red circle background
                ctx.fillStyle = '#FF3B30';
                ctx.beginPath();
                ctx.arc(8, 8, 7, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw white border
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(8, 8, 7, 0, 2 * Math.PI);
                ctx.stroke();
                
                // Draw count text
                const text = count > 99 ? '99' : count.toString();
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold ' + (text.length > 1 ? '9px' : '11px') + ' Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, 8, 8);
                
                // Convert canvas to data URL
                const dataUrl = canvas.toDataURL('image/png');
                
                console.log('✅ Badge image created with Canvas, sending to main process');
                
                // Send back to main process
                ipcRenderer.send('badge-image-ready', dataUrl, count);
            });
        } catch (err) {
            console.log('Electron IPC not available for menu shortcuts');
        }
    }
    
    console.log('Ready to receive notifications from:', WEBSOCKET_SERVER_URL);
});

// Handle window focus - clear flash and update badge
window.addEventListener('focus', () => {
    console.log('🔍 Window focused - refreshing badge');
    // Update badge when window is focused
    updateTaskbarBadge();
});

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});
