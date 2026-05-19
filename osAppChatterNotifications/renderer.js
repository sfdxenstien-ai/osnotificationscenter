/**
 * Renderer Process - WebSocket Client and UI Logic
 * Connects to WebSocket server and handles real-time notifications
 */

const io = require('socket.io-client');

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
    
    socket = io(WEBSOCKET_SERVER_URL, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        timeout: 20000
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
    
    // Determine which list to add to
    if (transformed.status === 'Completed') {
        if (!notifications.completed.find(item => item.id === transformed.id)) {
            notifications.completed.unshift(transformed);
        }
    } else if (isPastDue) {
        if (!notifications.pastDue.find(item => item.id === transformed.id)) {
            notifications.pastDue.unshift(transformed);
        }
    } else {
        if (!notifications.myActions.find(item => item.id === transformed.id)) {
            notifications.myActions.unshift(transformed);
        }
    }

    // Update badge counts
    updateBadgeCounts();
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
                <span class="link-primary" title="${notification.caseId}">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    ${notification.caseNumber || 'N/A'}
                </span>
            </td>
            <td class="col-message">
                <button class="btn-view-message" onclick="viewMessage('${escapeHtml(notification.messagePreview)}')">
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

function viewMessage(message) {
    const modal = document.getElementById('messageModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.textContent = message;
    modal.style.display = 'flex';
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
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
        new Notification('New Chatter Notification', {
            body: notification.messagePreview || 'You have a new notification',
            icon: 'assets/icon.png',
            tag: notification.notificationId
        });
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
    
    console.log('Ready to receive notifications from:', WEBSOCKET_SERVER_URL);
});

// Cleanup on window close
window.addEventListener('beforeunload', () => {
    if (socket) {
        socket.disconnect();
    }
});
