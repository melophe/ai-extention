// Storage abstraction layer
import { compat } from './browser-compat.js';

const STORAGE_KEYS = {
    API_KEY: 'apiKey',
    MODEL: 'model',
    SYSTEM_PROMPT: 'systemPrompt',
    SETTINGS: 'settings'
} as const;

export interface StorageSettings {
    apiKey: string;
    model: string;
    systemPrompt: string;
    [key: string]: unknown;
}

export interface Storage {
    getApiKey(): Promise<string | null>;
    setApiKey(apiKey: string): Promise<void>;
    removeApiKey(): Promise<void>;
    getModel(): Promise<string>;
    setModel(model: string): Promise<void>;
    getSettings(): Promise<StorageSettings>;
    saveSettings(settings: Partial<StorageSettings>): Promise<void>;
    hasApiKey(): Promise<boolean>;
}

export const storage: Storage = {
    /**
     * Get API key from storage
     */
    async getApiKey(): Promise<string | null> {
        const result = await compat.storage.local.get(STORAGE_KEYS.API_KEY);
        return (result[STORAGE_KEYS.API_KEY] as string) || null;
    },

    /**
     * Save API key to storage
     */
    async setApiKey(apiKey: string): Promise<void> {
        await compat.storage.local.set({ [STORAGE_KEYS.API_KEY]: apiKey });
    },

    /**
     * Remove API key from storage
     */
    async removeApiKey(): Promise<void> {
        await compat.storage.local.remove(STORAGE_KEYS.API_KEY);
    },

    /**
     * Get selected model
     */
    async getModel(): Promise<string> {
        const result = await compat.storage.local.get(STORAGE_KEYS.MODEL);
        return (result[STORAGE_KEYS.MODEL] as string) || 'gemini-1.5-flash';
    },

    /**
     * Save selected model
     */
    async setModel(model: string): Promise<void> {
        await compat.storage.local.set({ [STORAGE_KEYS.MODEL]: model });
    },

    /**
     * Get all settings
     */
    async getSettings(): Promise<StorageSettings> {
        const result = await compat.storage.local.get([
            STORAGE_KEYS.API_KEY,
            STORAGE_KEYS.MODEL,
            STORAGE_KEYS.SYSTEM_PROMPT,
            STORAGE_KEYS.SETTINGS
        ]);

        const otherSettings = (result[STORAGE_KEYS.SETTINGS] as Record<string, unknown>) || {};

        return {
            apiKey: (result[STORAGE_KEYS.API_KEY] as string) || '',
            model: (result[STORAGE_KEYS.MODEL] as string) || 'gemini-2.5-flash',
            systemPrompt: (result[STORAGE_KEYS.SYSTEM_PROMPT] as string) || '',
            ...otherSettings
        };
    },

    /**
     * Save all settings
     */
    async saveSettings(settings: Partial<StorageSettings>): Promise<void> {
        const { apiKey, model, systemPrompt, ...otherSettings } = settings;

        const toSave: Record<string, unknown> = {};
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
     */
    async hasApiKey(): Promise<boolean> {
        const apiKey = await this.getApiKey();
        return !!apiKey && apiKey.length > 0;
    }
};

export default storage;
