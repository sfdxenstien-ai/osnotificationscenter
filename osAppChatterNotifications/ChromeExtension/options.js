/**
 * Options Page Script
 * Handles settings configuration
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    document.getElementById('saveBtn').addEventListener('click', saveSettings);
});

async function loadSettings() {
    const settings = await chrome.storage.local.get([
        'userId',
        'serverUrl',
        'enableDesktopNotifications',
        'enableSounds',
        'autoConnect'
    ]);

    // Populate form fields
    if (settings.userId) {
        document.getElementById('userId').value = settings.userId;
    }
    
    if (settings.serverUrl) {
        document.getElementById('serverUrl').value = settings.serverUrl;
    }

    // Set checkboxes (default to true if not set)
    document.getElementById('enableDesktopNotifications').checked = 
        settings.enableDesktopNotifications !== false;
    document.getElementById('enableSounds').checked = 
        settings.enableSounds !== false;
    document.getElementById('autoConnect').checked = 
        settings.autoConnect !== false;
}

async function saveSettings() {
    const saveBtn = document.getElementById('saveBtn');
    const successMessage = document.getElementById('successMessage');

    // Disable button during save
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const settings = {
        userId: document.getElementById('userId').value.trim(),
        serverUrl: document.getElementById('serverUrl').value.trim() || 'https://osnotificationscenter.onrender.com',
        enableDesktopNotifications: document.getElementById('enableDesktopNotifications').checked,
        enableSounds: document.getElementById('enableSounds').checked,
        autoConnect: document.getElementById('autoConnect').checked
    };

    try {
        // Save to storage
        await chrome.storage.local.set(settings);

        // Notify background script of user ID change
        if (settings.userId) {
            chrome.runtime.sendMessage({
                type: 'SET_USER_ID',
                userId: settings.userId
            });
        }

        // Show success message
        successMessage.classList.add('show');
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 3000);

    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
    }
}
