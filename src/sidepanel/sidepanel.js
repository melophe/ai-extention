// AI Chat Side Panel Main Script
import { compat } from '../lib/browser-compat.js';
import { GeminiClient } from '../lib/gemini-api.js';
import { storage } from '../lib/storage.js';
import { markdownToHtml, formatTime, copyToClipboard } from '../shared/utils.js';

class ChatApp {
    constructor() {
        this.messages = [];
        this.gemini = null;
        this.isLoading = false;

        // DOM elements
        this.elements = {
            messagesContainer: document.getElementById('messages'),
            welcomeMessage: document.getElementById('welcome-message'),
            userInput: document.getElementById('user-input'),
            sendButton: document.getElementById('send-button'),
            clearButton: document.getElementById('clear-chat'),
            settingsButton: document.getElementById('open-settings'),
            apiKeyWarning: document.getElementById('api-key-warning'),
            goToSettings: document.getElementById('go-to-settings'),
            charCount: document.getElementById('char-count'),
            modelIndicator: document.getElementById('model-indicator'),
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }

    async init() {
        // Load settings and initialize
        const settings = await storage.getSettings();

        if (!settings.apiKey) {
            this.showApiKeyWarning();
        } else {
            this.hideApiKeyWarning();
            this.gemini = new GeminiClient(settings.apiKey, settings.model);
        }

        // Store system prompt
        this.systemPrompt = settings.systemPrompt || '';

        // Update model indicator
        this.elements.modelIndicator.textContent = settings.model || 'gemini-2.5-flash';

        // Setup event listeners
        this.setupEventListeners();

        // Focus input
        this.elements.userInput.focus();
    }

    setupEventListeners() {
        // Send button click
        this.elements.sendButton.addEventListener('click', () => this.handleSend());

        // Input field events
        this.elements.userInput.addEventListener('input', () => this.handleInputChange());
        this.elements.userInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Clear button
        this.elements.clearButton.addEventListener('click', () => this.clearChat());

        // Settings button
        this.elements.settingsButton.addEventListener('click', () => this.openSettings());

        // Go to settings link
        this.elements.goToSettings?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openSettings();
        });

        // Quick prompts
        document.querySelectorAll('.quick-prompt').forEach(button => {
            button.addEventListener('click', () => {
                const prompt = button.dataset.prompt;
                this.elements.userInput.value = prompt;
                this.handleInputChange();
                this.elements.userInput.focus();
            });
        });

        // Listen for storage changes (settings update)
        compat.runtime.onMessage?.addListener?.((message) => {
            if (message.type === 'SETTINGS_UPDATED') {
                this.reloadSettings();
            }
        });
    }

    handleInputChange() {
        const text = this.elements.userInput.value;
        const length = text.length;

        // Update character count
        this.elements.charCount.textContent = length;

        // Enable/disable send button
        this.elements.sendButton.disabled = length === 0 || this.isLoading;

        // Auto-resize textarea
        this.autoResizeTextarea();
    }

    autoResizeTextarea() {
        const textarea = this.elements.userInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    handleKeyDown(e) {
        // Enter to send (Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    }

    async handleSend() {
        const text = this.elements.userInput.value.trim();

        if (!text || this.isLoading) return;

        // Check if API key is set
        if (!this.gemini) {
            const settings = await storage.getSettings();
            if (!settings.apiKey) {
                this.showError('APIキーが設定されていません。設定画面でAPIキーを入力してください。');
                return;
            }
            this.gemini = new GeminiClient(settings.apiKey, settings.model);
        }

        // Hide welcome message
        this.hideWelcomeMessage();

        // Add user message to UI
        this.addMessage('user', text);

        // Clear input
        this.elements.userInput.value = '';
        this.handleInputChange();

        // Add to messages array
        this.messages.push({ role: 'user', content: text });

        // Create assistant message element for streaming
        const messageDiv = this.createStreamingMessage();
        this.setLoading(true);

        try {
            // Send to Gemini API with streaming
            let fullResponse = '';

            // Prepare messages with system prompt if set
            const messagesWithPrompt = this.systemPrompt
                ? [{ role: 'user', content: `[システム指示] ${this.systemPrompt}` }, { role: 'assistant', content: '了解しました。' }, ...this.messages]
                : this.messages;

            await this.gemini.streamChat(messagesWithPrompt, (chunk) => {
                fullResponse += chunk;
                this.updateStreamingMessage(messageDiv, fullResponse);
            });

            // Finalize the message
            this.finalizeStreamingMessage(messageDiv, fullResponse);
            this.messages.push({ role: 'assistant', content: fullResponse });

        } catch (error) {
            console.error('Chat error:', error);
            messageDiv.remove();
            this.showError(error.message);
        } finally {
            this.setLoading(false);
        }
    }

    createStreamingMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant streaming';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '<span class="cursor">▋</span>';

        messageDiv.appendChild(contentDiv);
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    updateStreamingMessage(messageDiv, text) {
        const contentDiv = messageDiv.querySelector('.message-content');
        // Show raw text while streaming (no markdown yet)
        contentDiv.innerHTML = this.escapeHtml(text) + '<span class="cursor">▋</span>';
    }

    finalizeStreamingMessage(messageDiv, text) {
        messageDiv.classList.remove('streaming');
        const contentDiv = messageDiv.querySelector('.message-content');

        // Apply markdown formatting
        contentDiv.innerHTML = markdownToHtml(text);
        this.addCopyButtonsToCodeBlocks(contentDiv);

        // Add timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatTime(Date.now());
        messageDiv.appendChild(timeDiv);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (role === 'assistant') {
            contentDiv.innerHTML = markdownToHtml(content);
            this.addCopyButtonsToCodeBlocks(contentDiv);
        } else {
            contentDiv.textContent = content;
        }

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatTime(Date.now());

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);

        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addCopyButtonsToCodeBlocks(container) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.textContent = 'Copy';
            copyButton.addEventListener('click', async () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent;
                const success = await copyToClipboard(code);
                copyButton.textContent = success ? 'Copied!' : 'Failed';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            });

            wrapper.appendChild(copyButton);
        });
    }

    showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'message assistant';
        indicator.id = 'typing-indicator';

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;

        indicator.appendChild(typingDiv);
        this.elements.messagesContainer.appendChild(indicator);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        indicator?.remove();
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;

        errorDiv.appendChild(contentDiv);
        this.elements.messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    clearChat() {
        // Clear messages array
        this.messages = [];

        // Clear UI (keep welcome message)
        const messages = this.elements.messagesContainer.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());

        // Show welcome message
        this.showWelcomeMessage();

        // Focus input
        this.elements.userInput.focus();
    }

    showWelcomeMessage() {
        this.elements.welcomeMessage?.classList.remove('hidden');
    }

    hideWelcomeMessage() {
        this.elements.welcomeMessage?.classList.add('hidden');
    }

    showApiKeyWarning() {
        this.elements.apiKeyWarning?.classList.remove('hidden');
    }

    hideApiKeyWarning() {
        this.elements.apiKeyWarning?.classList.add('hidden');
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.elements.sendButton.disabled = loading || !this.elements.userInput.value.trim();
    }

    async openSettings() {
        try {
            await compat.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
        } catch {
            // Fallback: open options page directly
            if (typeof chrome !== 'undefined') {
                chrome.runtime.openOptionsPage();
            } else if (typeof browser !== 'undefined') {
                browser.runtime.openOptionsPage();
            }
        }
    }

    async reloadSettings() {
        const settings = await storage.getSettings();

        if (settings.apiKey) {
            this.hideApiKeyWarning();
            this.gemini = new GeminiClient(settings.apiKey, settings.model);
        } else {
            this.showApiKeyWarning();
            this.gemini = null;
        }

        this.elements.modelIndicator.textContent = settings.model || 'gemini-1.5-flash';
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChatApp();
    app.init();
});
