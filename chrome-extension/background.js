// TokenScope Chrome Extension - Background Service Worker

const API_BASE = 'http://localhost:8000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

// Storage keys
const STORAGE_KEYS = {
  USER_ID: 'user_id',
  AUTH_TOKEN: 'auth_token',
  SETTINGS: 'settings',
  HISTORY: 'history',
  STATS: 'stats',
  IS_AUTHENTICATED: 'is_authenticated'
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
  handleMessage(message, sender).then(sendResponse);
  return true;
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'OPTIMIZE_PROMPT':
      return await handleOptimizePrompt(message.payload);

    case 'ENHANCE_PROMPT':
      return await handleEnhancePrompt(message.payload);

    case 'GET_SETTINGS':
      return await getSettings();

    case 'SAVE_SETTINGS':
      await saveSettings(message.payload);
      // Broadcast to content scripts
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
      return { success: true };

    case 'UPDATE_SETTINGS':
      await saveSettings(message.payload);
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
      return { success: true };

    case 'GET_HISTORY':
      return await getHistory();

    case 'GET_STATS':
      return await getStats();

    case 'ADD_TO_HISTORY':
      return await addToHistory(message.payload);

    case 'CLEAR_HISTORY':
      await clearHistory();
      return { success: true };

    case 'SYNC_WITH_BACKEND':
      return await syncWithBackend();

    // ============ AUTH HANDLERS ============
    case 'GET_AUTH_STATUS':
      return await getAuthStatus();

    case 'SET_USER_AUTH':
      await setUserAuth(message.payload);
      return { success: true };

    case 'CLEAR_USER_AUTH':
      await clearUserAuth();
      return { success: true };

    case 'OPEN_DASHBOARD':
      return await openDashboard();

    default:
      console.log('Unknown message type:', message.type);
      return { error: 'Unknown message type' };
  }
}

// ============ API CALLS ============

async function handleOptimizePrompt(payload) {
  const { prompt, target_model = 'chatgpt' } = payload;

  try {
    const auth = await getAuthStatus();
    const userId = auth.user_id || 'anonymous';

    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId
    };

    if (auth.auth_token) {
      headers['Authorization'] = `Bearer ${auth.auth_token}`;
    }

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        target_model,
        user_id: userId
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    console.error('Optimization failed:', error);
    return { success: false, error: error.message };
  }
}

async function handleEnhancePrompt(payload) {
  const { prompt, target_model = 'chatgpt' } = payload;

  try {
    const auth = await getAuthStatus();
    const userId = auth.user_id || 'anonymous';

    const headers = {
      'Content-Type': 'application/json',
      'X-User-Id': userId
    };

    if (auth.auth_token) {
      headers['Authorization'] = `Bearer ${auth.auth_token}`;
    }

    const response = await fetch(`${API_BASE}/enhance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        target_model,
        user_id: userId
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const result = await response.json();
    return { success: true, data: result };

  } catch (error) {
    console.error('Enhancement failed:', error);
    return { success: false, error: error.message };
  }
}

// ============ AUTH FUNCTIONS ============

async function getAuthStatus() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.USER_ID, STORAGE_KEYS.AUTH_TOKEN]);
    const userId = result[STORAGE_KEYS.USER_ID];
    const authToken = result[STORAGE_KEYS.AUTH_TOKEN];

    if (userId && authToken) {
      return {
        is_authenticated: true,
        user_id: userId,
        auth_token: authToken
      };
    }

    return { is_authenticated: false, user_id: 'anonymous' };
  } catch (error) {
    console.error('Error getting auth status:', error);
    return { is_authenticated: false, user_id: 'anonymous' };
  }
}

async function setUserAuth(payload) {
  const { user_id, auth_token } = payload;
  await chrome.storage.local.set({
    [STORAGE_KEYS.USER_ID]: user_id,
    [STORAGE_KEYS.AUTH_TOKEN]: auth_token,
    [STORAGE_KEYS.IS_AUTHENTICATED]: true
  });
  console.log('User auth set:', user_id);
}

async function clearUserAuth() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.USER_ID,
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.IS_AUTHENTICATED
  ]);
  console.log('User auth cleared');
}

async function openDashboard() {
  const auth = await getAuthStatus();
  const dashboardUrl = auth.is_authenticated
    ? `${FRONTEND_URL}/extension-dashboard`
    : `${FRONTEND_URL}/sign-in?redirect=extension-dashboard`;

  // Open dashboard in new tab
  chrome.tabs.create({ url: dashboardUrl });
  return { url: dashboardUrl };
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
  const auth = await getAuthStatus();

  // If authenticated, try to get from backend
  if (auth.is_authenticated) {
    try {
      const response = await fetch(`${API_BASE}/extension/history/${auth.user_id}?limit=50`, {
        headers: {
          'Authorization': `Bearer ${auth.auth_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.map(item => ({
          original: item.original_prompt,
          optimized: item.optimized_prompt,
          saved_tokens: item.tokens_saved,
          saved_cost: item.cost_saved,
          timestamp: item.created_at,
          chatbot: 'synced',
          source: 'backend'
        }));
      }
    } catch (error) {
      console.error('Failed to get history from backend:', error);
    }
  }

  // Fallback to local storage
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

async function addToHistory(entry) {
  const auth = await getAuthStatus();

  // Always save locally first
  const history = await getHistoryFromStorage();
  const newEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };
  history.unshift(newEntry);
  const trimmed = history.slice(0, 100);
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: trimmed });

  // Update local stats
  await updateStats(entry);

  // If authenticated, sync to backend
  if (auth.is_authenticated) {
    try {
      await fetch(`${API_BASE}/extension/save-optimization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.auth_token}`
        },
        body: JSON.stringify({
          user_id: auth.user_id,
          original_prompt: entry.original,
          optimized_prompt: entry.optimized,
          original_tokens: entry.original?.split(' ').filter(w => w.length > 0).length || 0,
          optimized_tokens: entry.optimized?.split(' ').filter(w => w.length > 0).length || 0,
          tokens_saved: entry.saved_tokens || 0,
          cost_saved: entry.saved_cost || 0,
          target_model: entry.target_model || 'chatgpt',
          source: 'extension'
        })
      });
    } catch (error) {
      console.error('Failed to sync optimization to backend:', error);
    }
  }

  return { success: true };
}

async function getHistoryFromStorage() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

async function clearHistory() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.HISTORY]: []
  });
}

async function getStats() {
  const auth = await getAuthStatus();

  // If authenticated, try to get from backend
  if (auth.is_authenticated) {
    try {
      const response = await fetch(`${API_BASE}/extension/stats/${auth.user_id}`, {
        headers: {
          'Authorization': `Bearer ${auth.auth_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          total_prompts: data.total_prompts,
          total_saved_tokens: data.total_tokens_saved,
          total_saved_cost: data.total_cost_saved,
          weekly_prompts: data.weekly_prompts,
          weekly_tokens_saved: data.weekly_tokens_saved
        };
      }
    } catch (error) {
      console.error('Failed to get stats from backend:', error);
    }
  }

  // Fallback to local stats
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  return result[STORAGE_KEYS.STATS] || {
    total_prompts: 0,
    total_saved_tokens: 0,
    total_saved_cost: 0
  };
}

async function updateStats(entry) {
  const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
  const stats = result[STORAGE_KEYS.STATS] || {
    total_prompts: 0,
    total_saved_tokens: 0,
    total_saved_cost: 0
  };

  stats.total_prompts = (stats.total_prompts || 0) + 1;

  if (entry.saved_tokens) {
    stats.total_saved_tokens = (stats.total_saved_tokens || 0) + entry.saved_tokens;
  }

  if (entry.saved_cost) {
    stats.total_saved_cost = (stats.total_saved_cost || 0) + entry.saved_cost;
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.STATS]: stats
  });
}

async function syncWithBackend() {
  try {
    const auth = await getAuthStatus();
    if (!auth.is_authenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    const stats = await getStats();
    const history = await getHistoryFromStorage();

    const response = await fetch(`${API_BASE}/extension/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.auth_token}`
      },
      body: JSON.stringify({
        user_id: auth.user_id,
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