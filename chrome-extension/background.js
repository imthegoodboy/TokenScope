// TokenScope Chrome Extension - Background Service Worker

// ============ CONFIGURATION ============
const API_BASE = 'http://localhost:8000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

// Storage keys
const STORAGE_KEYS = {
  USER_ID: 'user_id',
  SETTINGS: 'settings',
  HISTORY: 'history',
  STATS: 'stats',
  AUTH_TOKEN: 'auth_token',
  GROUP_ID: 'group_id'
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
          total_tokens_saved: 0,
          total_cost_saved: 0,
          total_accepts: 0,
          total_rejects: 0,
          avg_attention_score: 0.5
        }
      });
    }
  });

  console.log('TokenScope extension installed');
});

// ============ AUTH HANDLING ============

// Listen for auth state changes from frontend
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_STATE') {
    setUserId(message.payload.userId || 'anonymous');
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_USER_ID') {
    getUserId().then(userId => sendResponse({ userId }));
    return true;
  }

  if (message.type === 'SET_USER_CONTEXT') {
    // This is the main way frontend tells extension who is logged in
    setUserId(message.payload.userId);
    if (message.payload.groupId) {
      chrome.storage.local.set({ [STORAGE_KEYS.GROUP_ID]: message.payload.groupId });
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'SET_GROUP_ID') {
    setGroupId(message.payload.groupId);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_GROUP_ID') {
    getGroupId().then(groupId => sendResponse({ groupId }));
    return true;
  }
});

// Function to set user ID (called from frontend or on install)
async function setUserId(userId) {
  await chrome.storage.local.set({ [STORAGE_KEYS.USER_ID]: userId });
}

// Function to get user ID
async function getUserId() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_ID);
    return result[STORAGE_KEYS.USER_ID] || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

// Group ID helpers
async function setGroupId(groupId) {
  await chrome.storage.local.set({ [STORAGE_KEYS.GROUP_ID]: groupId });
}

async function getGroupId() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.GROUP_ID);
    return result[STORAGE_KEYS.GROUP_ID] || null;
  } catch {
    return null;
  }
}

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

    case 'UPDATE_SETTINGS':
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              payload: message.payload
            });
          }
        });
      });
      sendResponse({ success: true });
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

    case 'LOG_ACCEPTED':
      logAcceptedOptimization(message.payload).then(() => sendResponse({ success: true }));
      return true;

    case 'LOG_DISMISSED':
      logDismissedOptimization(message.payload).then(() => sendResponse({ success: true }));
      return true;

    case 'SYNC_STATS_TO_BACKEND':
      syncStatsToBackend().then(result => sendResponse(result));
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

// ============ EXTENSION LOGGING ============

async function logAcceptedOptimization(payload) {
  const { original_prompt, optimized_prompt, original_tokens, optimized_tokens, chatbot, attention_score } = payload;

  const tokens_saved = Math.max(0, original_tokens - optimized_tokens);
  const cost_saved = calculateCostSavings(tokens_saved);

  // Update local stats
  const stats = await getStats();
  stats.total_prompts += 1;
  stats.total_accepts += 1;
  stats.total_tokens_saved += tokens_saved;
  stats.total_cost_saved += cost_saved;

  // Update average attention score
  const prevCount = stats.total_accepts - 1;
  stats.avg_attention_score = prevCount > 0
    ? (stats.avg_attention_score * prevCount + attention_score) / stats.total_accepts
    : attention_score;

  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });

  // Add to local history
  await addToHistory({
    original: original_prompt,
    optimized: optimized_prompt,
    saved_tokens: tokens_saved,
    saved_cost: cost_saved,
    chatbot,
    accepted: true,
    attention_score
  });

  // Send to backend
  try {
    const userId = await getUserId();
    const groupId = await getGroupId();

    console.log('[TokenScope] Logging to backend:', {
      userId,
      groupId,
      tokens_saved,
      chatbot
    });

    fetch(`${API_BASE}/extension/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        original_prompt,
        optimized_prompt,
        original_tokens,
        optimized_tokens,
        tokens_saved,
        cost_original: calculateCost(original_tokens),
        cost_optimized: calculateCost(optimized_tokens),
        cost_saved,
        attention_score,
        chatbot,
        accepted: true,
        group_id: groupId
      })
    }).then(r => {
      if (!r.ok) console.error('[TokenScope] Backend log failed:', r.status);
      else console.log('[TokenScope] Backend log success');
    }).catch(e => console.error('[TokenScope] Backend log error:', e));
  } catch (error) {
    console.error('Failed to log to backend:', error);
  }
}

async function logDismissedOptimization(payload) {
  const { original_prompt, optimized_prompt, original_tokens, optimized_tokens, chatbot, attention_score } = payload;

  // Update local stats
  const stats = await getStats();
  stats.total_prompts += 1;
  stats.total_rejects += 1;
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });

  // Add to local history as dismissed
  await addToHistory({
    original: original_prompt,
    optimized: optimized_prompt,
    saved_tokens: 0,
    saved_cost: 0,
    chatbot,
    accepted: false,
    attention_score
  });

  // Optionally log to backend
  try {
    const userId = await getUserId();
    await fetch(`${API_BASE}/extension/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        original_prompt,
        optimized_prompt,
        original_tokens,
        optimized_tokens,
        tokens_saved: 0,
        cost_original: calculateCost(original_tokens),
        cost_optimized: calculateCost(optimized_tokens),
        cost_saved: 0,
        attention_score,
        chatbot,
        accepted: false
      })
    });
  } catch (error) {
    console.error('Failed to log dismiss to backend:', error);
  }
}

async function syncStatsToBackend() {
  try {
    const userId = await getUserId();
    const stats = await getStats();
    const history = await getHistory();

    const response = await fetch(`${API_BASE}/extension/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        logs: history.slice(0, 100).map(item => ({
          original_prompt: item.original,
          optimized_prompt: item.optimized,
          original_tokens: countTokens(item.original),
          optimized_tokens: countTokens(item.optimized),
          tokens_saved: item.saved_tokens || 0,
          cost_original: calculateCost(countTokens(item.original)),
          cost_optimized: calculateCost(countTokens(item.optimized)),
          cost_saved: item.saved_cost || 0,
          attention_score: item.attention_score || 0.5,
          chatbot: item.chatbot || 'manual',
          accepted: item.accepted !== false
        }))
      })
    });

    if (response.ok) {
      return { success: true, synced: history.length };
    }

    return { success: false, error: 'Sync failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============ HELPER FUNCTIONS ============

function calculateCost(tokens) {
  // Approximate GPT-4o-mini pricing
  return (tokens / 1000000) * 0.15;
}

function calculateCostSavings(tokens_saved) {
  return calculateCost(tokens_saved);
}

function countTokens(text) {
  // Rough token estimation: ~4 chars per token
  return Math.ceil((text || '').split(/\s+/).filter(w => w.length > 0).length * 1.3);
}

// ============ STORAGE HELPERS ============

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
    total_tokens_saved: 0,
    total_cost_saved: 0,
    total_accepts: 0,
    total_rejects: 0,
    avg_attention_score: 0.5
  };
}

async function syncWithBackend() {
  return await syncStatsToBackend();
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