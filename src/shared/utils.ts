// Utility functions

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format timestamp to locale string
 */
export function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: Parameters<T>): void {
        const later = (): void => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string | null | undefined): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
        return false;
    }
    // Gemini API keys typically start with 'AIza'
    return apiKey.startsWith('AIza') && apiKey.length >= 35;
}

/**
 * Simple markdown to HTML converter
 * Supports: bold, italic, code blocks, inline code, links
 */
export function markdownToHtml(text: string | null | undefined): string {
    if (!text) return '';

    let html = escapeHtml(text);

    // Code blocks (```...```)
    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang: string, code: string) => {
        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code (`...`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold (**...**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic (*...*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}
