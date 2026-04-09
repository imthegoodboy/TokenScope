# TokenScope Chrome Extension

A Chrome extension that optimizes AI chatbot prompts using TF-IDF analysis.

## Quick Start

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

### 2. Configure Backend URL

In `background.js`, update the API URL:
```javascript
const API_BASE = 'http://localhost:8000/api/v1';
```

For production:
```javascript
const API_BASE = 'https://api.tokenscope.ai/api/v1';
```

### 3. Test It

1. Open ChatGPT (chat.openai.com)
2. Type any prompt in the textarea
3. The extension will show optimized suggestions

---

## Architecture Summary

```
User types in ChatGPT
        │
        ▼
Content Script detects input
        │
        ▼
Send to Background Script
        │
        ▼
Background → Backend (TF-IDF)
        │
        ▼
Show optimized prompt
        │
        ▼
User clicks "Send" → Replace & Submit
```

---

## How Prompt Detection Works

### Method 1: MutationObserver
```javascript
// Watch for textarea changes
const observer = new MutationObserver(callback);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
```

### Method 2: Input Event Listener
```javascript
// Direct input detection
textarea.addEventListener('input', debounce(handlePrompt, 1500));
```

### Method 3: Submit Detection
```javascript
// Detect send button clicks
sendButton.addEventListener('click', handleSubmit);
```

---

## Supported Chatbots

| Chatbot | Status |
|---------|--------|
| ChatGPT | ✅ Ready |
| Claude | 🔜 Planned |
| Gemini | 🔜 Planned |
| Perplexity | 🔜 Planned |

---

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension configuration |
| `background.js` | Service worker, API calls |
| `content.js` | Page injection, detection |
| `popup/` | Toolbar popup UI |
| `styles/` | CSS styles |

---

## Development

```bash
# Test backend API
cd backend
python -c "
import asyncio
import httpx
async def test():
    r = await httpx.AsyncClient().post(
        'http://localhost:8000/api/v1/analyze',
        json={'prompt': 'Hello world test', 'target_model': 'chatgpt'}
    )
    print(r.json())
asyncio.run(test())
"
```
