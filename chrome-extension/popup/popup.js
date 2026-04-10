// TokenScope Chrome Extension - Popup Script

const API_BASE = 'http://localhost:8000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', async () => {
  // Load user ID from local storage or try to get from frontend
  await ensureUserId();

  // Load initial data
  await Promise.all([
    loadStats(),
    loadHistory(),
    loadSettings(),
    syncWithBackend()
  ]);

  // Setup event listeners
  setupEventListeners();
});

// Ensure user ID is set (from auth or anonymous)
async function ensureUserId() {
  let userId = await getStoredUserId();

  if (!userId || userId === 'anonymous') {
    // Try to get from URL params (if opened from frontend)
    const urlParams = new URLSearchParams(window.location.search);
    const paramUserId = urlParams.get('userId');
    if (paramUserId) {
      userId = paramUserId;
      await setUserId(userId);
    }
  }

  // If still no user ID, generate anonymous one
  if (!userId || userId === 'anonymous') {
    userId = 'anonymous_' + Date.now();
    await setUserId(userId);
  }
}

async function getStoredUserId() {
  try {
    const result = await chrome.storage.local.get('user_id');
    return result.user_id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

async function setUserId(userId) {
  await chrome.storage.local.set({ user_id: userId });
}

// ============ BACKEND SYNC ============

async function syncWithBackend() {
  try {
    const userId = await getStoredUserId();

    // Get local stats and history
    const [stats, history] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'GET_STATS' }),
      chrome.runtime.sendMessage({ type: 'GET_HISTORY' })
    ]);

    if (!stats || !history || history.length === 0) return;

    // Sync with backend
    const response = await fetch(`${API_BASE}/extension/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        logs: history.slice(0, 100).map(item => ({
          original_prompt: item.original || '',
          optimized_prompt: item.optimized || '',
          original_tokens: countTokens(item.original || ''),
          optimized_tokens: countTokens(item.optimized || ''),
          tokens_saved: item.saved_tokens || 0,
          cost_original: calculateCost(countTokens(item.original || '')),
          cost_optimized: calculateCost(countTokens(item.optimized || '')),
          cost_saved: item.saved_cost || 0,
          attention_score: item.attention_score || 0.5,
          chatbot: item.chatbot || 'manual',
          accepted: item.accepted !== false
        }))
      })
    });

    if (response.ok) {
      console.log('Synced with backend successfully');
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// ============ SETTINGS ============

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || { auto_popup: true };
    document.getElementById('auto-toggle').checked = settings.auto_popup !== false;

    // Sync with content script
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: settings
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ settings });
    // Sync with content script
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: settings
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

// ============ STATS ============

async function loadStats() {
  try {
    // Try to get stats from backend first
    const userId = await getStoredUserId();

    try {
      const response = await fetch(`${API_BASE}/extension/stats/overview`, {
        headers: { 'X-User-Id': userId }
      });

      if (response.ok) {
        const data = await response.json();
        displayStats(data);
        return;
      }
    } catch (e) {
      console.log('Backend not available, using local stats');
    }

    // Fallback to local stats
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
    displayStats({
      total_optimizations: stats.total_prompts || 0,
      total_accepts: stats.total_accepts || 0,
      total_tokens_saved: stats.total_tokens_saved || 0,
      total_cost_saved: stats.total_cost_saved || 0,
      avg_attention_score: stats.avg_attention_score || 0.5
    });
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

function displayStats(data) {
  const promptsEl = document.getElementById('total-prompts');
  const tokensEl = document.getElementById('saved-tokens');
  const costEl = document.getElementById('saved-cost');

  if (promptsEl) promptsEl.textContent = formatNumber(data.total_optimizations || 0);
  if (tokensEl) tokensEl.textContent = formatNumber(data.total_tokens_saved || 0);
  if (costEl) costEl.textContent = formatMoney(data.total_cost_saved || 0);
}

// ============ HISTORY ============

async function loadHistory() {
  try {
    const userId = await getStoredUserId();

    // Try backend first
    try {
      const response = await fetch(`${API_BASE}/extension/history?limit=10`, {
        headers: { 'X-User-Id': userId }
      });

      if (response.ok) {
        const data = await response.json();
        displayHistory(data);
        return;
      }
    } catch (e) {
      console.log('Using local history');
    }

    // Fallback to local
    const history = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
    displayHistory(history || []);
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

function displayHistory(history) {
  const container = document.getElementById('history-list');
  if (!container) return;

  if (!history || history.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">📭</div>
        <div>No history yet</div>
        <div style="font-size: 11px; margin-top: 4px;">Optimize your first prompt!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = history.slice(0, 10).map(item => {
    const savedTokens = item.tokens_saved || item.saved_tokens || 0;
    const originalTokens = countTokens(item.original_prompt || item.original || '');
    const savingsPercent = originalTokens > 0 ? Math.round((savedTokens / originalTokens) * 100) : 0;

    return `
      <div class="history-item">
        <div class="history-item-header">
          <div class="history-chatbot">
            <span>${getChatbotIcon(item.chatbot)}</span>
            <span>${getChatbotName(item.chatbot)}</span>
          </div>
          <div class="history-savings">-${savingsPercent}%</div>
        </div>
        <div class="history-prompt">${escapeHtml(truncate(item.original_prompt || item.original, 100))}</div>
        <div class="history-optimized">${escapeHtml(truncate(item.optimized_prompt || item.optimized, 80))}</div>
      </div>
    `;
  }).join('');
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
  // Optimize button
  const optimizeBtn = document.getElementById('optimize-btn');
  if (optimizeBtn) {
    optimizeBtn.addEventListener('click', handleOptimize);
  }

  // Clear button
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = document.getElementById('prompt-input');
      const resultCard = document.getElementById('result-card');
      const btn = document.getElementById('optimize-btn');

      if (input) input.value = '';
      if (resultCard) resultCard.classList.remove('show');
      if (btn) btn.disabled = false;
    });
  }

  // Auto toggle
  const autoToggle = document.getElementById('auto-toggle');
  if (autoToggle) {
    autoToggle.addEventListener('change', (e) => {
      saveSettings({ auto_popup: e.target.checked });
    });
  }

  // Enter to optimize
  const input = document.getElementById('prompt-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleOptimize();
      }
    });
  }
}

// ============ OPTIMIZE HANDLER ============

async function handleOptimize() {
  const input = document.getElementById('prompt-input');
  const btn = document.getElementById('optimize-btn');
  const resultCard = document.getElementById('result-card');
  const prompt = input?.value?.trim();

  if (!prompt) return;

  // Show loading
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Optimizing...';
  }
  if (resultCard) resultCard.classList.remove('show');

  try {
    const userId = await getStoredUserId();

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId
      },
      body: JSON.stringify({
        prompt,
        target_model: 'chatgpt'
      })
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    // Show result
    const suggestion = data.suggestion || {};
    const originalTokens = data.original?.tokens || countTokens(prompt);
    const savingsPercent = originalTokens > 0 && suggestion.token_savings
      ? Math.round((suggestion.token_savings / originalTokens) * 100)
      : 0;

    const resultText = document.getElementById('result-text');
    const resultTokens = document.getElementById('result-tokens');
    const resultCost = document.getElementById('result-cost');
    const resultBadge = document.getElementById('result-savings-badge');

    if (resultText) resultText.textContent = suggestion.text || prompt;
    if (resultTokens) resultTokens.textContent = suggestion.tokens || originalTokens;
    if (resultCost) resultCost.textContent = formatMoney(suggestion.estimated_cost || 0);
    if (resultBadge) resultBadge.textContent = `-${savingsPercent}%`;

    if (resultCard) resultCard.classList.add('show');

    // Save to history and sync to backend
    await chrome.runtime.sendMessage({
      type: 'ADD_TO_HISTORY',
      payload: {
        original: prompt,
        optimized: suggestion.text || prompt,
        saved_tokens: suggestion.token_savings || 0,
        saved_cost: suggestion.cost_savings || 0,
        chatbot: 'manual',
        accepted: true,
        attention_score: 0.7
      }
    });

    // Refresh stats and history
    await Promise.all([loadStats(), loadHistory()]);

  } catch (error) {
    console.error('Optimization error:', error);
    alert('Failed to optimize. Please check if the backend is running.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>✨</span> Optimize';
    }
  }
}

// ============ HELPERS ============

function getChatbotIcon(chatbot) {
  const icons = {
    chatgpt: '🤖',
    claude: '🧠',
    gemini: '✨',
    perplexity: '🔍',
    manual: '✍️'
  };
  return icons[chatbot] || '🤖';
}

function getChatbotName(chatbot) {
  const names = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    manual: 'Manual'
  };
  return names[chatbot] || 'Unknown';
}

function truncate(str, length) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatMoney(num) {
  if (num >= 1) return '$' + num.toFixed(2);
  if (num >= 0.01) return '$' + num.toFixed(4);
  if (num >= 0.0001) return '$' + num.toFixed(6);
  return '$' + num.toFixed(8);
}

function countTokens(text) {
  return Math.ceil((text || '').split(/\s+/).filter(w => w.length > 0).length * 1.3);
}

function calculateCost(tokens) {
  return (tokens / 1000000) * 0.15;
}

// Open dashboard link with user ID
const dashboardLink = document.getElementById('open-dashboard');
if (dashboardLink) {
  dashboardLink.href = `${FRONTEND_URL}/dashboard?userId=${encodeURIComponent(getStoredUserId())}`;
}