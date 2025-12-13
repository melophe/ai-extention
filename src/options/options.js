// Options Page Script
import { storage } from '../lib/storage.js';
import { GeminiClient } from '../lib/gemini-api.js';
import { validateApiKeyFormat } from '../shared/utils.js';
import { AVAILABLE_MODELS } from '../shared/constants.js';

class OptionsPage {
    constructor() {
        this.elements = {
            apiKeyInput: document.getElementById('api-key'),
            toggleVisibility: document.getElementById('toggle-visibility'),
            eyeIcon: document.getElementById('eye-icon'),
            eyeOffIcon: document.getElementById('eye-off-icon'),
            modelSelect: document.getElementById('model-select'),
            systemPromptInput: document.getElementById('system-prompt'),
            saveButton: document.getElementById('save-settings'),
            testButton: document.getElementById('test-connection'),
            statusMessage: document.getElementById('status-message')
        };

        this.isPasswordVisible = false;
    }

    async init() {
        // Load current settings
        await this.loadSettings();

        // Setup event listeners
        this.setupEventListeners();
    }

    async loadSettings() {
        try {
            const settings = await storage.getSettings();
            console.log('Options - Loaded settings:', settings);

            // Set API key (if exists)
            if (settings.apiKey) {
                this.elements.apiKeyInput.value = settings.apiKey;
            }

            // Set model selection
            if (settings.model) {
                this.elements.modelSelect.value = settings.model;
            }

            // Set system prompt
            if (settings.systemPrompt) {
                this.elements.systemPromptInput.value = settings.systemPrompt;
            }
        } catch (error) {
            console.error('Options - Failed to load settings:', error);
        }
    }

    setupEventListeners() {
        // Save button
        this.elements.saveButton.addEventListener('click', () => this.saveSettings());

        // Test connection button
        this.elements.testButton.addEventListener('click', () => this.testConnection());

        // Toggle password visibility
        this.elements.toggleVisibility.addEventListener('click', () => this.togglePasswordVisibility());

        // Save on Enter in API key field
        this.elements.apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.saveSettings();
            }
        });
    }

    togglePasswordVisibility() {
        this.isPasswordVisible = !this.isPasswordVisible;

        if (this.isPasswordVisible) {
            this.elements.apiKeyInput.type = 'text';
            this.elements.eyeIcon.classList.add('hidden');
            this.elements.eyeOffIcon.classList.remove('hidden');
        } else {
            this.elements.apiKeyInput.type = 'password';
            this.elements.eyeIcon.classList.remove('hidden');
            this.elements.eyeOffIcon.classList.add('hidden');
        }
    }

    async saveSettings() {
        const apiKey = this.elements.apiKeyInput.value.trim();
        const model = this.elements.modelSelect.value;
        const systemPrompt = this.elements.systemPromptInput.value.trim();

        // Validate API key format
        if (apiKey && !validateApiKeyFormat(apiKey)) {
            this.showStatus('error', 'APIキーの形式が正しくありません。「AIza」で始まる正しいキーを入力してください。');
            return;
        }

        try {
            this.elements.saveButton.disabled = true;
            this.showStatus('loading', '保存中...');

            // Save settings
            await storage.saveSettings({ apiKey, model, systemPrompt });

            this.showStatus('success', '設定を保存しました');

            // Notify sidepanel of settings change
            this.notifySettingsUpdate();

        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showStatus('error', '設定の保存に失敗しました');
        } finally {
            this.elements.saveButton.disabled = false;
        }
    }

    async testConnection() {
        const apiKey = this.elements.apiKeyInput.value.trim();

        if (!apiKey) {
            this.showStatus('error', 'APIキーを入力してください');
            return;
        }

        if (!validateApiKeyFormat(apiKey)) {
            this.showStatus('error', 'APIキーの形式が正しくありません');
            return;
        }

        try {
            this.elements.testButton.disabled = true;
            this.showStatus('loading', '接続テスト中...');

            // Use stable model for connection test
            const testModel = 'gemini-2.5-flash';
            const client = new GeminiClient(apiKey, testModel);
            const success = await client.testConnection();

            if (success) {
                const selectedModel = this.elements.modelSelect.value;
                if (selectedModel !== testModel) {
                    this.showStatus('success', `接続テスト成功！（注: ${selectedModel} のサポートは別途確認が必要な場合があります）`);
                } else {
                    this.showStatus('success', '接続テスト成功！APIキーは有効です');
                }
            } else {
                this.showStatus('error', '接続テストに失敗しました。APIキーを確認してください');
            }

        } catch (error) {
            console.error('Connection test failed:', error);
            this.showStatus('error', error.message || '接続テストに失敗しました');
        } finally {
            this.elements.testButton.disabled = false;
        }
    }

    showStatus(type, message) {
        const statusEl = this.elements.statusMessage;
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;

        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 3000);
        }
    }

    notifySettingsUpdate() {
        // Try to notify other extension pages about settings update
        try {
            const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
            browserAPI.runtime.sendMessage({ type: 'SETTINGS_UPDATED' }).catch(() => {
                // Ignore errors - sidepanel might not be open
            });
        } catch {
            // Ignore
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const options = new OptionsPage();
    options.init();
});
