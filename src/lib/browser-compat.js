// Browser compatibility layer
// Abstracts differences between Chrome and Firefox APIs

const isFirefox = typeof browser !== 'undefined';
const browserAPI = isFirefox ? browser : chrome;

export const compat = {
  // Storage API
  storage: {
    local: {
      get: (keys) => {
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
      set: (items) => {
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
      remove: (keys) => {
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
    open: async () => {
      if (isFirefox) {
        return browserAPI.sidebarAction.open();
      } else {
        const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          return browserAPI.sidePanel.open({ tabId: tab.id });
        }
      }
    },
    toggle: () => {
      if (isFirefox) {
        return browserAPI.sidebarAction.toggle();
      }
      // Chrome doesn't have native toggle, handled via action click
    }
  },

  // Runtime API
  runtime: browserAPI.runtime,

  // Check if API key exists
  async hasApiKey() {
    const result = await this.storage.local.get('apiKey');
    return !!result.apiKey;
  },

  // Get settings
  async getSettings() {
    const defaults = {
      apiKey: '',
      model: 'gemini-1.5-flash'
    };
    const result = await this.storage.local.get(Object.keys(defaults));
    return { ...defaults, ...result };
  }
};

export default compat;
