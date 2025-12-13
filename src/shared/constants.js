// Gemini API Constants
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com';

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const AVAILABLE_MODELS = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (最新・推奨)', recommended: true },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', recommended: false },
    { id: 'gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (安定版)', recommended: false }
];

// Default system prompt
export const DEFAULT_SYSTEM_PROMPT = '簡潔に、要点重視で回答してください。日本語で回答してください。';

// Default generation config
export const DEFAULT_GENERATION_CONFIG = {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192
};

// Safety settings
export const DEFAULT_SAFETY_SETTINGS = [
    {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_ONLY_HIGH"
    },
    {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_ONLY_HIGH"
    },
    {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_ONLY_HIGH"
    },
    {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_ONLY_HIGH"
    }
];

// Error messages
export const ERROR_MESSAGES = {
    NO_API_KEY: 'APIキーが設定されていません。設定画面でAPIキーを入力してください。',
    INVALID_API_KEY: 'APIキーが無効です。正しいAPIキーを入力してください。',
    NETWORK_ERROR: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
    API_ERROR: 'APIエラーが発生しました。しばらく待ってから再試行してください。',
    RATE_LIMIT: 'レート制限に達しました。しばらく待ってから再試行してください。',
    UNKNOWN_ERROR: '予期しないエラーが発生しました。'
};
