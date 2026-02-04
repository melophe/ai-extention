# AI Chat Assistant

<p align="center">
  <img src="assets/icons/icon-128.png" alt="AI Chat Assistant" width="128">
</p>

<p align="center">
  <strong>Browser-resident AI Chat Extension</strong><br>
  Chat with AI directly in your browser using the Gemini API
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Supported-brightgreen?logo=googlechrome" alt="Chrome">
  <img src="https://img.shields.io/badge/Edge-Supported-brightgreen?logo=microsoftedge" alt="Edge">
  <img src="https://img.shields.io/badge/Firefox-Supported-brightgreen?logo=firefox" alt="Firefox">
  <img src="https://img.shields.io/badge/Manifest-V3-blue" alt="Manifest V3">
</p>

---

## Features

| Feature | Description |
|---------|-------------|
| **Side Panel UI** | Always accessible from the browser sidebar, no extra tabs needed |
| **Privacy Focused** | Does not read any web page content |
| **Streaming Response** | Displays AI responses in real-time |
| **Custom Prompts** | Customize the system prompt to your needs |
| **Cross-Browser** | Supports Chrome / Edge / Firefox |

---

## Installation

### Chrome / Edge

1. Open `chrome://extensions` or `edge://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project folder

### Firefox

1. Open `about:debugging`
2. Click **This Firefox** > **Load Temporary Add-on**
3. Select `dist/firefox/manifest.json`

> **Tip**: Use the build script to automatically generate packages for both Chrome and Firefox.

---

## Setup

### 1. Get an API Key

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Configure the Extension

1. Right-click the extension icon > **Options**
2. Enter your API key and save
3. (Optional) Customize the system prompt

### 3. Usage

- **Chrome / Edge**: Click the toolbar icon to open the side panel
- **Firefox**: Click the toolbar icon or open from the sidebar
- **Send**: `Ctrl + Enter` or click the send button

---

## Development

### Build

```bash
node scripts/build.js
```

Output:
- `dist/chrome/` - For Chrome / Edge
- `dist/firefox/` - For Firefox

### Directory Structure

```
ai-chat-extension/
├── manifest.json            # For Chrome / Edge
├── manifest.firefox.json    # For Firefox
├── scripts/
│   └── build.js             # Build script
├── src/
│   ├── background/          # Background scripts
│   ├── sidepanel/           # Side panel UI
│   ├── options/             # Options page
│   ├── lib/                 # API and storage modules
│   └── shared/              # Shared utilities
└── assets/
    └── icons/               # Icon images
```

---

## Permissions and Security

### Permissions Used

| Permission | Purpose |
|------------|---------|
| `storage` | Store API key and settings |
| `sidePanel` | Side panel UI (Chrome/Edge) |

### Permissions Not Used

- Page content reading
- Browsing history access
- Tab information access

### Security

- API key is stored only in local storage
- No API key transmission to external servers
- No Content Script (does not interfere with web pages)

---

## License

MIT License
