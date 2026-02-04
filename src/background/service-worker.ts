// Service Worker for Chrome/Edge
// Handles extension lifecycle and side panel behavior

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
    try {
        if (tab.id) {
            await chrome.sidePanel.open({ tabId: tab.id });
        }
    } catch (error) {
        console.error('Failed to open side panel:', error);
    }
});

// Set side panel behavior to open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set panel behavior:', error));

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open options page on first install
        chrome.runtime.openOptionsPage();
    }
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'OPEN_OPTIONS') {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    }
    return true;
});
