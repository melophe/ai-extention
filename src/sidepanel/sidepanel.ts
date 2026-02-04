// AI Chat Side Panel Main Script
import { compat } from '../lib/browser-compat.js';
import { GeminiClient, ChatMessage } from '../lib/gemini-api.js';
import { storage } from '../lib/storage.js';
import { markdownToHtml, formatTime, copyToClipboard } from '../shared/utils.js';

declare const browser: typeof chrome | undefined;

interface ChatElements {
    messagesContainer: HTMLElement;
    welcomeMessage: HTMLElement | null;
    userInput: HTMLTextAreaElement;
    sendButton: HTMLButtonElement;
    clearButton: HTMLButtonElement;
    settingsButton: HTMLButtonElement;
    apiKeyWarning: HTMLElement | null;
    goToSettings: HTMLElement | null;
    charCount: HTMLElement;
    modelIndicator: HTMLElement;
    loadingOverlay: HTMLElement | null;
}

class ChatApp {
    private messages: ChatMessage[] = [];
    private gemini: GeminiClient | null = null;
    private isLoading: boolean = false;
    private systemPrompt: string = '';
    private elements: ChatElements;

    constructor() {
        this.elements = {
            messagesContainer: document.getElementById('messages') as HTMLElement,
            welcomeMessage: document.getElementById('welcome-message'),
            userInput: document.getElementById('user-input') as HTMLTextAreaElement,
            sendButton: document.getElementById('send-button') as HTMLButtonElement,
            clearButton: document.getElementById('clear-chat') as HTMLButtonElement,
            settingsButton: document.getElementById('open-settings') as HTMLButtonElement,
            apiKeyWarning: document.getElementById('api-key-warning'),
            goToSettings: document.getElementById('go-to-settings'),
            charCount: document.getElementById('char-count') as HTMLElement,
            modelIndicator: document.getElementById('model-indicator') as HTMLElement,
            loadingOverlay: document.getElementById('loading-overlay')
        };
    }

    async init(): Promise<void> {
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

    private setupEventListeners(): void {
        // Send button click
        this.elements.sendButton.addEventListener('click', () => this.handleSend());

        // Input field events
        this.elements.userInput.addEventListener('input', () => this.handleInputChange());
        this.elements.userInput.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeyDown(e));

        // Clear button
        this.elements.clearButton.addEventListener('click', () => this.clearChat());

        // Settings button
        this.elements.settingsButton.addEventListener('click', () => this.openSettings());

        // Go to settings link
        this.elements.goToSettings?.addEventListener('click', (e: Event) => {
            e.preventDefault();
            this.openSettings();
        });

        // Quick prompts
        document.querySelectorAll('.quick-prompt').forEach(button => {
            button.addEventListener('click', () => {
                const prompt = (button as HTMLElement).dataset.prompt;
                if (prompt) {
                    this.elements.userInput.value = prompt;
                    this.handleInputChange();
                    this.elements.userInput.focus();
                }
            });
        });

        // Listen for storage changes (settings update)
        compat.runtime.onMessage?.addListener?.((message: { type: string }) => {
            if (message.type === 'SETTINGS_UPDATED') {
                this.reloadSettings();
            }
        });
    }

    private handleInputChange(): void {
        const text = this.elements.userInput.value;
        const length = text.length;

        // Update character count
        this.elements.charCount.textContent = String(length);

        // Enable/disable send button
        this.elements.sendButton.disabled = length === 0 || this.isLoading;

        // Auto-resize textarea
        this.autoResizeTextarea();
    }

    private autoResizeTextarea(): void {
        const textarea = this.elements.userInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    private handleKeyDown(e: KeyboardEvent): void {
        // Enter to send (Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSend();
        }
    }

    private async handleSend(): Promise<void> {
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
            const messagesWithPrompt: ChatMessage[] = this.systemPrompt
                ? [{ role: 'user', content: `[システム指示] ${this.systemPrompt}` }, { role: 'assistant', content: '了解しました。' }, ...this.messages]
                : this.messages;

            await this.gemini.streamChat(messagesWithPrompt, (chunk: string) => {
                fullResponse += chunk;
                this.updateStreamingMessage(messageDiv, fullResponse);
            });

            // Finalize the message
            this.finalizeStreamingMessage(messageDiv, fullResponse);
            this.messages.push({ role: 'assistant', content: fullResponse });

        } catch (error) {
            console.error('Chat error:', error);
            messageDiv.remove();
            const errorMessage = error instanceof Error ? error.message : 'エラーが発生しました';
            this.showError(errorMessage);
        } finally {
            this.setLoading(false);
        }
    }

    private createStreamingMessage(): HTMLDivElement {
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

    private updateStreamingMessage(messageDiv: HTMLDivElement, text: string): void {
        const contentDiv = messageDiv.querySelector('.message-content');
        if (contentDiv) {
            // Show raw text while streaming (no markdown yet)
            contentDiv.innerHTML = this.escapeHtml(text) + '<span class="cursor">▋</span>';
        }
    }

    private finalizeStreamingMessage(messageDiv: HTMLDivElement, text: string): void {
        messageDiv.classList.remove('streaming');
        const contentDiv = messageDiv.querySelector('.message-content');

        if (contentDiv) {
            // Apply markdown formatting
            contentDiv.innerHTML = markdownToHtml(text);
            this.addCopyButtonsToCodeBlocks(contentDiv as HTMLElement);
        }

        // Add timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = formatTime(Date.now());
        messageDiv.appendChild(timeDiv);
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML.replace(/\n/g, '<br>');
    }

    private addMessage(role: 'user' | 'assistant', content: string): void {
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

    private addCopyButtonsToCodeBlocks(container: HTMLElement): void {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';
            pre.parentNode?.insertBefore(wrapper, pre);
            wrapper.appendChild(pre);

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code-button';
            copyButton.textContent = 'Copy';
            copyButton.addEventListener('click', async () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent || '';
                const success = await copyToClipboard(code);
                copyButton.textContent = success ? 'Copied!' : 'Failed';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                }, 2000);
            });

            wrapper.appendChild(copyButton);
        });
    }

    private showError(message: string): void {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;

        errorDiv.appendChild(contentDiv);
        this.elements.messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();
    }

    private scrollToBottom(): void {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }

    private clearChat(): void {
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

    private showWelcomeMessage(): void {
        this.elements.welcomeMessage?.classList.remove('hidden');
    }

    private hideWelcomeMessage(): void {
        this.elements.welcomeMessage?.classList.add('hidden');
    }

    private showApiKeyWarning(): void {
        this.elements.apiKeyWarning?.classList.remove('hidden');
    }

    private hideApiKeyWarning(): void {
        this.elements.apiKeyWarning?.classList.add('hidden');
    }

    private setLoading(loading: boolean): void {
        this.isLoading = loading;
        this.elements.sendButton.disabled = loading || !this.elements.userInput.value.trim();
    }

    private async openSettings(): Promise<void> {
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

    private async reloadSettings(): Promise<void> {
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
