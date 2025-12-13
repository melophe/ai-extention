// Background script for Firefox
// Handles sidebar behavior

// Listen for installation
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open options page on first install
        browser.runtime.openOptionsPage();
    }
});

// Handle messages from sidebar
browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'OPEN_OPTIONS') {
        browser.runtime.openOptionsPage();
        return Promise.resolve({ success: true });
    }
    return false;
});

// Toggle sidebar when action (toolbar icon) is clicked
browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
});
