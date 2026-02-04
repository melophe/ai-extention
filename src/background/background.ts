// Background script for Firefox
// Handles sidebar behavior

declare const browser: typeof chrome;

// Listen for installation
browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        // Open options page on first install
        browser.runtime.openOptionsPage();
    }
});

// Handle messages from sidebar
browser.runtime.onMessage.addListener((message, _sender) => {
    if (message.type === 'OPEN_OPTIONS') {
        browser.runtime.openOptionsPage();
        return Promise.resolve({ success: true });
    }
    return false;
});

// Toggle sidebar when action (toolbar icon) is clicked
browser.action.onClicked.addListener(() => {
    (browser as unknown as { sidebarAction: { toggle(): void } }).sidebarAction.toggle();
});
