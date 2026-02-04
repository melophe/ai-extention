// Browser API type declarations for cross-browser compatibility

declare const browser: typeof chrome | undefined;

interface BrowserAPI {
  storage: typeof chrome.storage;
  runtime: typeof chrome.runtime;
  tabs: typeof chrome.tabs;
  sidePanel?: typeof chrome.sidePanel;
  sidebarAction?: {
    open(): Promise<void>;
    toggle(): Promise<void>;
  };
  action: typeof chrome.action;
}
