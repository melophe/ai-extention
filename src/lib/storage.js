// Storage abstraction layer
import { compat } from './browser-compat.js';

const STORAGE_KEYS = {
    API_KEY: 'apiKey',
    MODEL: 'model',
    SYSTEM_PROMPT: 'systemPrompt',
    SETTINGS: 'settings'
};

export const storage = {
    /**
     * Get API key from storage
     * @returns {Promise<string|null>}
     */
    async getApiKey() {
        const result = await compat.storage.local.get(STORAGE_KEYS.API_KEY);
        return result[STORAGE_KEYS.API_KEY] || null;
    },

    /**
     * Save API key to storage
     * @param {string} apiKey
     * @returns {Promise<void>}
     */
    async setApiKey(apiKey) {
        await compat.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
    },

    /**
     * Remove API key from storage
     * @returns {Promise<void>}
     */
    async removeApiKey() {
        await compat.storage.local.remove(STORAGE_KEYS.API_KEY);
    },

    /**
     * Get selected model
     * @returns {Promise<string>}
     */
    async getModel() {
        const result = await compat.storage.local.get(STORAGE_KEYS.MODEL);
        return result[STORAGE_KEYS.MODEL] || 'gemini-1.5-flash';
    },

    /**
     * Save selected model
     * @param {string} model
     * @returns {Promise<void>}
     */
    async setModel(model) {
        await compat.storage.local.set({ [STORAGE_KEYS.MODEL]: model });
    },

    /**
     * Get all settings
     * @returns {Promise<Object>}
     */
    async getSettings() {
        const result = await compat.storage.local.get([
            STORAGE_KEYS.API_KEY,
            STORAGE_KEYS.MODEL,
            STORAGE_KEYS.SYSTEM_PROMPT,
            STORAGE_KEYS.SETTINGS
        ]);

        return {
            apiKey: result[STORAGE_KEYS.API_KEY] || '',
            model: result[STORAGE_KEYS.MODEL] || 'gemini-2.5-flash',
            systemPrompt: result[STORAGE_KEYS.SYSTEM_PROMPT] || '',
            ...result[STORAGE_KEYS.SETTINGS]
        };
    },

    /**
     * Save all settings
     * @param {Object} settings
     * @returns {Promise<void>}
     */
    async saveSettings(settings) {
        const { apiKey, model, systemPrompt, ...otherSettings } = settings;

        const toSave = {};
        if (apiKey !== undefined) toSave[STORAGE_KEYS.API_KEY] = apiKey;
        if (model !== undefined) toSave[STORAGE_KEYS.MODEL] = model;
        if (systemPrompt !== undefined) toSave[STORAGE_KEYS.SYSTEM_PROMPT] = systemPrompt;
        if (Object.keys(otherSettings).length > 0) {
            toSave[STORAGE_KEYS.SETTINGS] = otherSettings;
        }

        await compat.storage.local.set(toSave);
    },

    /**
     * Check if API key is configured
     * @returns {Promise<boolean>}
     */
    async hasApiKey() {
        const apiKey = await this.getApiKey();
        return !!apiKey && apiKey.length > 0;
    }
};

export default storage;
