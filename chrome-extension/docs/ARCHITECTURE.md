# TokenScope Chrome Extension - Architecture & Roadmap

## Overview

A Chrome extension that analyzes prompts typed in AI chatbots (ChatGPT, Claude, Gemini) and suggests optimized versions using TF-IDF analysis.

---

## How It Works (User POV)

### Step 1: User Types Prompt
```
User opens ChatGPT and types: "Hey! So basically I need you to help me with some coding stuff.
Like, I want to write a function that can maybe calculate some numbers but I'm not really sure
how to do it and also I'm kind of new to programming so if you could explain it in a simple way
that would be really great thanks!"
```

### Step 2: Extension Detects Prompt
- Extension monitors the textarea/input field
- Detects when user stops typing (debounce ~1.5s)
- Shows "Optimizing..." indicator

### Step 3: Suggested Prompt Appears
```
[TokenScope Icon] ✨ Optimized: "Write a function to calculate numbers. 
Explain simply for a beginner."
[Send Suggested] [Dismiss]
```

### Step 4: User Chooses
- Click "Send Suggested" → Replaces text and sends
- Click "Dismiss" → Uses original prompt
- Click extension icon → See full analysis

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   POPUP     │    │   CONTENT   │    │  BACKGROUND │       │
│  │  (UI Page)  │◄──►│   SCRIPT    │◄──►│    SERVICE  │       │
│  │             │    │             │    │             │       │
│  │ - Settings  │    │ - Detect    │    │ - API Calls │       │
│  │ - History   │    │   Prompts   │    │ - Storage   │       │
│  │ - Stats     │    │ - Overlay   │    │ - Messages  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                  │
│         └───────────────────┴───────────────────┘                  │
│                             │                                     │
│                    ┌────────▼────────┐                          │
│                    │   TF-IDF ENGINE  │                          │
│                    │    (Backend)     │                          │
│                    └────────┬────────┘                          │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   BACKEND API      │
                    │  /api/v1/analyze  │
                    │  /api/v1/enhance  │
                    └───────────────────┘
```

---

## Component Details

### 1. Content Script (`content.js`)
**What it does:**
- Injected into AI chatbot pages
- Monitors DOM for textarea/input elements
- Detects prompt submission attempts
- Shows floating overlay with suggestions

**Detection Methods:**
```javascript
// Target sites:
- chat.openai.com (ChatGPT)
- claude.ai (Claude)
- gemini.google.com (Gemini)

// Method 1: MutationObserver
// Watches for new textareas

// Method 2: Direct DOM query
// document.querySelector('textarea')

// Method 3: Keyboard listener
// Detects Ctrl+Enter or Cmd+Enter

// Method 4: Click listener
// Detects submit button clicks
```

**Trigger Points:**
1. **Before Submit** - When user clicks Send button
2. **Keyboard Shortcut** - Ctrl/Cmd + Enter
3. **Idle Detection** - User stops typing for 1.5s
4. **Manual** - User clicks extension icon

### 2. Background Script (`background.js`)
**What it does:**
- Handles communication between content and popup
- Manages Chrome storage (sync with user account)
- Makes API calls to backend
- Handles extension lifecycle

### 3. Popup (`popup.html/js`)
**What it does:**
- Quick access UI from toolbar
- Shows optimization stats
- Manual prompt input for testing
- Settings and preferences

### 4. Overlay UI
**What it shows:**
```
┌─────────────────────────────────────────────────────┐
│ 🤖 TokenScope                          [Settings] ⚙ │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Original (127 tokens)                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ Hey! So basically I need you to help me... │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ✨ Suggested (45 tokens) - Save 64%                │
│  ┌─────────────────────────────────────────────┐   │
│  │ Write a function to calculate numbers.      │   │
│  │ Explain simply for a beginner.               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Token Analysis:                                    │
│  [Important: function, calculate, numbers, beginner]
│  [Removed: Hey, basically, stuff, maybe, really]   │
│                                                     │
│  [📤 Send Suggested]  [✏️ Edit]  [❌ Dismiss]       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Communication Flow

```
User types in ChatGPT
        │
        ▼
Content Script detects textarea change
        │
        ▼
Debounce 1.5s (wait for user to stop typing)
        │
        ▼
Send prompt to Background Script
        │
        ▼
Background Script → Backend API (TF-IDF)
        │
        ▼
Get optimized prompt + analysis
        │
        ▼
Show overlay with suggestion
        │
        ▼
User clicks "Send Suggested"
        │
        ▼
Replace textarea content + trigger submit
```

---

## API Integration

### Endpoint: `POST /api/v1/analyze`
```json
Request:
{
  "prompt": "User's original prompt",
  "target_model": "chatgpt"
}

Response:
{
  "original": {
    "text": "...",
    "tokens": 127
  },
  "token_scores": [
    {"token": "function", "score": 0.9, "importance": "high"},
    {"token": "calculate", "score": 0.8, "importance": "high"},
    ...
  ],
  "suggestion": {
    "text": "Optimized prompt...",
    "tokens": 45,
    "token_savings": 82
  }
}
```

### Endpoint: `POST /api/v1/enhance`
```json
Request:
{
  "prompt": "User's original prompt",
  "target_model": "chatgpt"
}

Response:
{
  "original": "...",
  "enhanced": "Optimized version...",
  "original_tokens": 127,
  "enhanced_tokens": 45
}
```

---

## Supported Chatbots

| Chatbot | URL Pattern | Textarea Selector |
|---------|-------------|-------------------|
| ChatGPT | `chat.openai.com` | `textarea[data-id="root"]` |
| Claude | `claude.ai` | `div[contenteditable="true"]` |
| Gemini | `gemini.google.com` | `textarea` |
| Perplexity | `perplexity.ai` | `textarea` |

---

## Data Flow & Storage

### Chrome Storage
```javascript
// Stored per user (synced)
{
  user_id: "clerk_user_id",
  api_key: "tokenscope_api_key",
  preferences: {
    auto_show: true,
    debounce_ms: 1500,
    target_model: "chatgpt",
    shortcuts: {
      optimize: "Ctrl+Shift+O"
    }
  },
  history: [
    {
      timestamp: "2024-01-01T12:00:00Z",
      original: "...",
      optimized: "...",
      saved_tokens: 82,
      chatbot: "chatgpt"
    }
  ],
  stats: {
    total_prompts: 150,
    total_saved_tokens: 12000,
    total_saved_cost: 0.15
  }
}
```

---

## Key Features

### 1. Smart Detection
- ✅ Detects which chatbot user is on
- ✅ Finds correct input field
- ✅ Identifies submission events
- ✅ Handles dynamic page content

### 2. TF-IDF Optimization
- ✅ Backend analyzes prompt importance
- ✅ Removes filler/noise words
- ✅ Preserves key context
- ✅ Shows token savings

### 3. User Controls
- ✅ Toggle on/off per chatbot
- ✅ Adjust debounce timing
- ✅ Custom keyboard shortcuts
- ✅ View optimization history

### 4. Integration
- ✅ Connect to user account
- ✅ Sync settings across devices
- ✅ Track personal usage stats
- ✅ Share successful prompts

---

## Roadmap

### Phase 1: Core MVP (Week 1)
- [ ] Set up Chrome extension scaffold
- [ ] Content script for ChatGPT only
- [ ] Basic TF-IDF API integration
- [ ] Simple overlay UI
- [ ] Manual trigger (button click)

### Phase 2: Smart Detection (Week 2)
- [ ] MutationObserver for dynamic content
- [ ] Keyboard shortcut detection
- [ ] Auto-trigger on idle
- [ ] Handle multiple chatbots
- [ ] Debounce optimization

### Phase 3: User Experience (Week 3)
- [ ] Popup UI with stats
- [ ] Settings page
- [ ] Keyboard shortcuts
- [ ] History tracking
- [ ] Chrome storage sync

### Phase 4: Polish (Week 4)
- [ ] Keyboard navigation
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation

### Phase 5: Advanced (Future)
- [ ] Multi-language support
- [ ] Custom TF-IDF training
- [ ] Prompt templates
- [ ] Team sharing
- [ ] API rate limiting

---

## File Structure

```
chrome-extension/
├── manifest.json           # Extension manifest
├── background.js          # Background service worker
├── content.js             # Content script (injected)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── overlay/
│   ├── overlay.html       # Suggestion overlay template
│   └── overlay.js
├── styles/
│   ├── content.css        # Content script styles
│   └── popup.css         # Popup styles
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── docs/
    └── ARCHITECTURE.md
```

---

## Manifest Permissions

```json
{
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "http://localhost:8000/*"
  ]
}
```

---

## Next Steps

1. Create basic extension scaffold
2. Set up manifest.json
3. Build content script with ChatGPT detection
4. Create simple overlay UI
5. Connect to backend API
6. Test end-to-end flow

---

## Questions & Decisions

1. **API Authentication**: Use Clerk user ID or separate API key?
2. **Rate Limiting**: How many optimizations per day?
3. **Offline Mode**: Cache recent analyses locally?
4. **Analytics**: Track anonymous usage for improvement?
5. **Auto-replace vs Manual**: Default to auto or manual trigger?
