/**
 * Popup UI Logic
 * Handles user interface and communication with background script
 */

let notifications = {
    myActions: [],
    pastDue: [],
    completed: []
};
let currentSection = 'myActions';
let connectionStatus = 'disconnected';

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Popup loaded');
    initializeUI();
    loadNotifications();
    setupEventListeners();
    initializeParticles();
});

function initializeUI() {
    // Set up menu item click handlers
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (section) {
                switchSection(section);
            }
        });
    });

    // Refresh button
    document.getElementById('btnRefresh').addEventListener('click', refreshNotifications);
}

function setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Popup received message:', message);
        
        switch (message.type) {
            case 'NOTIFICATIONS_UPDATED':
                notifications = message.data;
                renderNotifications();
                updateLastUpdate();
                break;
                
            case 'CONNECTION_STATUS':
                connectionStatus = message.status;
                updateConnectionStatus(message.status);
                break;
        }
    });
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadNotifications() {
    chrome.runtime.sendMessage({ type: 'GET_NOTIFICATIONS' }, (response) => {
        if (response) {
            notifications = response.data;
            connectionStatus = response.status;
            
            updateConnectionStatus(connectionStatus);
            renderNotifications();
            hideLoading();
        }
    });
}

function refreshNotifications() {
    showLoading();
    chrome.runtime.sendMessage({ type: 'REFRESH' }, (response) => {
        setTimeout(() => {
            loadNotifications();
        }, 1000);
    });
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
        tbody.innerHTML = '';
        tableContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        contentHeader.style.display = 'flex';
        updateEmptyState();
    } else {
        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';
        contentHeader.style.display = 'flex';
        
        tbody.innerHTML = list.map(notification => createNotificationRow(notification)).join('');
        
        // Attach event listeners to action buttons
        attachActionListeners();
    }

    updateBadgeCounts();
}

function createNotificationRow(notification) {
    const statusClass = getStatusClass(notification.status, notification.isPastDue);
    const statusIcon = getStatusIcon(notification.status, notification.isPastDue);
    const rowClass = notification.isPastDue ? 'row-overdue' : (notification.status === 'Completed' ? 'row-completed' : 'row-pending');
    const formattedDate = formatDate(notification.dueDate);
    
    return `
        <tr class="${rowClass}" data-id="${notification.id}">
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
                    <span class="${notification.isPastDue ? 'date-overdue' : 'date-normal'}">${formattedDate}</span>
                </div>
            </td>
            <td class="col-case">
                <span class="link-primary ${notification.caseUrl ? 'clickable' : ''}" 
                      data-url="${escapeHtml(notification.caseUrl || '')}">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    ${notification.caseNumber || 'N/A'}
                </span>
            </td>
            <td class="col-account">
                <div class="cell-content">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    ${notification.accountName || 'N/A'}
                </div>
            </td>
            <td class="col-contact">
                <div class="cell-content">
                    <svg class="icon-small" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    ${notification.contactName || 'N/A'}
                </div>
            </td>
            <td class="col-message">
                <div class="message-preview" title="${escapeHtml(notification.messagePreview)}">
                    ${truncateText(notification.messagePreview, 60)}
                </div>
                ${notification.messageThreadUrl ? `
                    <a href="${notification.messageThreadUrl}" target="_blank" class="link-secondary">
                        View Thread →
                    </a>
                ` : ''}
            </td>
            <td class="col-actions">
                <div class="action-buttons">
                    ${notification.caseUrl ? `
                        <button class="btn-action btn-view" data-url="${escapeHtml(notification.caseUrl)}" title="View Case">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                        </button>
                    ` : ''}
                    ${notification.status !== 'Completed' ? `
                        <button class="btn-action btn-complete" data-id="${notification.id}" title="Mark as Complete">
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `;
}

function attachActionListeners() {
    // View buttons
    document.querySelectorAll('.btn-view, .link-primary.clickable').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const url = e.currentTarget.dataset.url;
            if (url) {
                chrome.tabs.create({ url });
            }
        });
    });

    // Complete buttons
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            markAsCompleted(id);
        });
    });
}

// ============================================================================
// SECTION MANAGEMENT
// ============================================================================

function switchSection(section) {
    currentSection = section;
    
    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Update section title
    updateSectionHeader();
    
    // Render notifications
    renderNotifications();
}

function getCurrentList() {
    return notifications[currentSection] || [];
}

function updateSectionHeader() {
    const titles = {
        myActions: { title: 'My Actions', subtitle: 'Tasks requiring your attention' },
        pastDue: { title: 'Past Due', subtitle: 'Overdue tasks that need immediate attention' },
        completed: { title: 'Completed', subtitle: 'Successfully completed tasks' }
    };
    
    const header = titles[currentSection];
    document.getElementById('sectionTitle').textContent = header.title;
    document.getElementById('sectionSubtitle').textContent = header.subtitle;
}

function updateEmptyState() {
    const emptyStates = {
        myActions: {
            title: 'All Caught Up!',
            description: 'No pending actions at this time.'
        },
        pastDue: {
            title: 'Nothing Overdue',
            description: 'You have no past due items. Great work!'
        },
        completed: {
            title: 'No Completed Items',
            description: 'Completed tasks will appear here.'
        }
    };
    
    const state = emptyStates[currentSection];
    document.getElementById('emptyTitle').textContent = state.title;
    document.getElementById('emptyDescription').textContent = state.description;
}

// ============================================================================
// STATUS UPDATES
// ============================================================================

function markAsCompleted(notificationId) {
    chrome.runtime.sendMessage({
        type: 'MARK_AS_COMPLETED',
        notificationId: notificationId
    }, (response) => {
        if (response.success) {
            setTimeout(() => loadNotifications(), 500);
        }
    });
}

function updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    const dot = statusElement.querySelector('.status-dot');
    const text = statusElement.querySelector('.status-text');
    
    dot.className = 'status-dot';
    
    if (status === 'connected') {
        dot.classList.add('status-connected');
        text.textContent = 'Connected';
    } else if (status === 'connecting') {
        dot.classList.add('status-connecting');
        text.textContent = 'Connecting...';
    } else {
        dot.classList.add('status-disconnected');
        text.textContent = 'Disconnected';
    }
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

// ============================================================================
// LOADING STATES
// ============================================================================

function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
    document.getElementById('contentHeader').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('tableContainer').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

// ============================================================================
// PARTICLES.JS INITIALIZATION
// ============================================================================

function initializeParticles() {
    particlesJS('particles-canvas', {
        particles: {
            number: {
                value: 50,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: '#0176d3'
            },
            shape: {
                type: 'circle'
            },
            opacity: {
                value: 0.3,
                random: true,
                anim: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 3,
                random: true,
                anim: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#0176d3',
                opacity: 0.2,
                width: 1
            },
            move: {
                enable: true,
                speed: 1,
                direction: 'none',
                random: false,
                straight: false,
                out_mode: 'out',
                bounce: false
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: {
                    enable: true,
                    mode: 'grab'
                },
                onclick: {
                    enable: true,
                    mode: 'push'
                },
                resize: true
            },
            modes: {
                grab: {
                    distance: 140,
                    line_linked: {
                        opacity: 0.5
                    }
                },
                push: {
                    particles_nb: 4
                }
            }
        },
        retina_detect: true
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
