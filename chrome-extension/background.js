// TokenScope Chrome Extension - Background Service Worker

const API_BASE = 'http://localhost:8000/api/v1';

// Storage keys
const STORAGE_KEYS = {
  USER_ID: 'user_id',
  SETTINGS: 'settings',
  HISTORY: 'history',
  STATS: 'stats'
};

// Default settings
const DEFAULT_SETTINGS = {
  auto_show: true,
  debounce_ms: 1500,
  target_model: 'chatgpt',
  enabled_chatbots: {
    chatgpt: true,
    claude: true,
    gemini: true
  }
};

// ============ MESSAGE HANDLERS ============

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'OPTIMIZE_PROMPT':
      handleOptimizePrompt(message.payload, sendResponse);
      return true;

    case 'ENHANCE_PROMPT':
      handleEnhancePrompt(message.payload, sendResponse);
      return true;

    case 'GET_SETTINGS':
      getSettings().then(settings => sendResponse(settings));
      return true;

    case 'SAVE_SETTINGS':
      saveSettings(message.payload).then(() => sendResponse({ success: true }));
      return true;

    case 'GET_HISTORY':
      getHistory().then(history => sendResponse(history));
      return true;

    case 'GET_STATS':
      getStats().then(stats => sendResponse(stats));
      return true;

    case 'ADD_TO_HISTORY':
      addToHistory(message.payload).then(() => sendResponse({ success: true }));
      return true;

    case 'CLEAR_HISTORY':
      clearHistory().then(() => sendResponse({ success: true }));
      return true;

    case 'SYNC_WITH_BACKEND':
      syncWithBackend().then(result => sendResponse(result));
      return true;

    default:
      console.log('Unknown message type:', message.type);
  }
});

// ============ API CALLS ============

async function handleOptimizePrompt(payload, sendResponse) {
  const { prompt, target_model = 'chatgpt' } = payload;

  try {
    const userId = await getUserId();

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        prompt,
        target_model
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();
    sendResponse({ success: true, data: result });

  } catch (error) {
    console.error('Optimization failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleEnhancePrompt(payload, sendResponse) {
  const { prompt, target_model = 'chatgpt' } = payload;

  try {
    const userId = await getUserId();

    const response = await fetch(`${API_BASE}/enhance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        prompt,
        target_model
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();
    sendResponse({ success: true, data: result });

  } catch (error) {
    console.error('Enhancement failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// ============ STORAGE HELPERS ============

async function getUserId() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_ID);
    return result[STORAGE_KEYS.USER_ID] || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

async function setUserId(userId) {
  await chrome.storage.local.set({ [STORAGE_KEYS.USER_ID]: userId });
}

async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
}

async function saveSettings(settings) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: settings
  });
}

async function getHistory() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

async function addToHistory(entry) {
  const history = await getHistory();

  const newEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };

  history.unshift(newEntry);
  const trimmed = history.slice(0, 100);

  await chrome.storage.local.set({
    [STORAGE_KEYS.HISTORY]: trimmed
  });

  // Update local stats
  await updateStats(entry);
}

async function clearHistory() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.HISTORY]: []
  });
}

async function getStats() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  return result[STORAGE_KEYS.STATS] || {
    total_prompts: 0,
    total_saved_tokens: 0,
    total_saved_cost: 0
  };
}

async function updateStats(entry) {
  const stats = await getStats();

  stats.total_prompts += 1;

  if (entry.saved_tokens) {
    stats.total_saved_tokens += entry.saved_tokens;
  }

  if (entry.saved_cost) {
    stats.total_saved_cost += entry.saved_cost;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.STATS]: stats
  });

  // Also sync to backend
  try {
    const userId = await getUserId();
    await fetch(`${API_BASE}/stats/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        prompts: stats.total_prompts,
        tokens_saved: stats.total_saved_tokens,
        cost_saved: stats.total_saved_cost
      })
    });
  } catch (error) {
    console.error('Failed to sync stats to backend:', error);
  }
}

async function syncWithBackend() {
  try {
    const userId = await getUserId();
    const stats = await getStats();
    const history = await getHistory();

    // Send to backend
    const response = await fetch(`${API_BASE}/stats/extension-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        stats,
        history: history.slice(0, 50)
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, data };
    }

    return { success: false, error: 'Sync failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ KEYBOARD SHORTCUTS ============

chrome.commands.onCommand.addListener((command) => {
  if (command === 'optimize-prompt') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TRIGGER_OPTIMIZE' });
      }
    });
  }
});

// ============ INITIALIZATION ============

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings on first install
  chrome.storage.local.get(STORAGE_KEYS.SETTINGS, (result) => {
    if (!result[STORAGE_KEYS.SETTINGS]) {
      chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS
      });
    }
  });

  // Set default stats
  chrome.storage.local.get(STORAGE_KEYS.STATS, (result) => {
    if (!result[STORAGE_KEYS.STATS]) {
      chrome.storage.local.set({
        [STORAGE_KEYS.STATS]: {
          total_prompts: 0,
          total_saved_tokens: 0,
          total_saved_cost: 0
        }
      });
    }
  });

  console.log('TokenScope extension installed');
});

// Listen for tab updates to re-inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedUrls = [
      'chat.openai.com',
      'claude.ai',
      'gemini.google.com'
    ];

    if (supportedUrls.some(url => tab.url.includes(url))) {
      chrome.tabs.sendMessage(tabId, { type: 'TAB_UPDATED' });
    }
  }
});

console.log('TokenScope background service worker loaded');
