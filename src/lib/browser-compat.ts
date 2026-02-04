// Browser compatibility layer
// Abstracts differences between Chrome and Firefox APIs

declare const browser: typeof chrome | undefined;

const isFirefox = typeof browser !== 'undefined';
const browserAPI = isFirefox ? browser! : chrome;

export interface Settings {
    apiKey: string;
    model: string;
}

export interface Compat {
    storage: {
        local: {
            get(keys: string | string[] | null): Promise<Record<string, unknown>>;
            set(items: Record<string, unknown>): Promise<void>;
            remove(keys: string | string[]): Promise<void>;
        };
    };
    sidePanel: {
        open(): Promise<void>;
        toggle(): void;
    };
    runtime: typeof chrome.runtime;
    hasApiKey(): Promise<boolean>;
    getSettings(): Promise<Settings>;
}

export const compat: Compat = {
    // Storage API
    storage: {
        local: {
            get: (keys: string | string[] | null): Promise<Record<string, unknown>> => {
                return new Promise((resolve, reject) => {
                    if (isFirefox) {
                        browserAPI.storage.local.get(keys).then(resolve).catch(reject);
                    } else {
                        browserAPI.storage.local.get(keys, (result) => {
                            if (browserAPI.runtime.lastError) {
                                reject(browserAPI.runtime.lastError);
                            } else {
                                resolve(result);
                            }
                        });
                    }
                });
            },
            set: (items: Record<string, unknown>): Promise<void> => {
                return new Promise((resolve, reject) => {
                    if (isFirefox) {
                        browserAPI.storage.local.set(items).then(resolve).catch(reject);
                    } else {
                        browserAPI.storage.local.set(items, () => {
                            if (browserAPI.runtime.lastError) {
                                reject(browserAPI.runtime.lastError);
                            } else {
                                resolve();
                            }
                        });
                    }
                });
            },
            remove: (keys: string | string[]): Promise<void> => {
                return new Promise((resolve, reject) => {
                    if (isFirefox) {
                        browserAPI.storage.local.remove(keys).then(resolve).catch(reject);
                    } else {
                        browserAPI.storage.local.remove(keys, () => {
                            if (browserAPI.runtime.lastError) {
                                reject(browserAPI.runtime.lastError);
                            } else {
                                resolve();
                            }
                        });
                    }
                });
            }
        }
    },

    // Side Panel / Sidebar control
    sidePanel: {
        open: async (): Promise<void> => {
            if (isFirefox) {
                // Firefox uses sidebarAction
                await (browserAPI as unknown as { sidebarAction: { open(): Promise<void> } }).sidebarAction.open();
            } else {
                const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    await chrome.sidePanel.open({ tabId: tab.id });
                }
            }
        },
        toggle: (): void => {
            if (isFirefox) {
                // Firefox uses sidebarAction
                (browserAPI as unknown as { sidebarAction: { toggle(): void } }).sidebarAction.toggle();
            }
            // Chrome doesn't have native toggle, handled via action click
        }
    },

    // Runtime API
    runtime: browserAPI.runtime,

    // Check if API key exists
    async hasApiKey(): Promise<boolean> {
        const result = await this.storage.local.get('apiKey');
        return !!result.apiKey;
    },

    // Get settings
    async getSettings(): Promise<Settings> {
        const defaults: Settings = {
            apiKey: '',
            model: 'gemini-1.5-flash'
        };
        const result = await this.storage.local.get(Object.keys(defaults));
        return { ...defaults, ...result } as Settings;
    }
};

export default compat;
