// Gemini API Client
import {
    GEMINI_API_URL,
    DEFAULT_GENERATION_CONFIG,
    DEFAULT_SAFETY_SETTINGS,
    ERROR_MESSAGES
} from '../shared/constants.js';

export interface ChatMessage {
    role: 'user' | 'assistant' | 'model';
    content: string;
}

interface GeminiPart {
    text: string;
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

interface GeminiCandidate {
    content?: {
        parts?: GeminiPart[];
    };
    finishReason?: string;
}

interface GeminiResponse {
    candidates?: GeminiCandidate[];
    error?: {
        message?: string;
    };
}

export type OnChunkCallback = (chunk: string) => void;

export class GeminiClient {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * Send a chat message and get a response
     */
    async chat(messages: ChatMessage[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }

        const url = `${GEMINI_API_URL}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: this.formatMessages(messages),
                    generationConfig: DEFAULT_GENERATION_CONFIG,
                    safetySettings: DEFAULT_SAFETY_SETTINGS
                })
            });

            if (!response.ok) {
                return this.handleApiError(response);
            }

            const data: GeminiResponse = await response.json();

            // Check for blocked content
            if (data.candidates?.[0]?.finishReason === 'SAFETY') {
                return '申し訳ありませんが、この質問にはお答えできません。別の質問をお試しください。';
            }

            // Extract text from response
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error(ERROR_MESSAGES.API_ERROR);
            }

            return text;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
            }
            throw error;
        }
    }

    /**
     * Stream chat response
     */
    async streamChat(messages: ChatMessage[], onChunk?: OnChunkCallback): Promise<string> {
        if (!this.apiKey) {
            throw new Error(ERROR_MESSAGES.NO_API_KEY);
        }

        const url = `${GEMINI_API_URL}/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: this.formatMessages(messages),
                    generationConfig: DEFAULT_GENERATION_CONFIG,
                    safetySettings: DEFAULT_SAFETY_SETTINGS
                })
            });

            if (!response.ok) {
                return this.handleApiError(response);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error(ERROR_MESSAGES.API_ERROR);
            }

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data: GeminiResponse = JSON.parse(line.slice(6));
                            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                            fullText += text;
                            if (onChunk) onChunk(text);
                        } catch {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }

            return fullText;
        } catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
            }
            throw error;
        }
    }

    /**
     * Test API connection
     */
    async testConnection(): Promise<boolean> {
        try {
            const response = await this.chat([
                { role: 'user', content: 'Hello, respond with just "OK".' }
            ]);
            return !!response;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Format messages for Gemini API
     */
    private formatMessages(messages: ChatMessage[]): GeminiContent[] {
        return messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
        }));
    }

    /**
     * Handle API errors
     */
    private async handleApiError(response: Response): Promise<never> {
        let errorData: GeminiResponse;
        try {
            errorData = await response.json();
        } catch {
            errorData = { error: { message: 'Unknown error' } };
        }

        const message = errorData.error?.message || '';

        if (response.status === 400 && message.includes('API key')) {
            throw new Error(ERROR_MESSAGES.INVALID_API_KEY);
        }

        if (response.status === 429) {
            throw new Error(ERROR_MESSAGES.RATE_LIMIT);
        }

        if (response.status >= 500) {
            throw new Error(ERROR_MESSAGES.API_ERROR);
        }

        throw new Error(message || ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    /**
     * Update the model
     */
    setModel(model: string): void {
        this.model = model;
    }

    /**
     * Update the API key
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }
}

export default GeminiClient;
