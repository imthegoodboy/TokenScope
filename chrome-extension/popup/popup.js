// TokenScope Chrome Extension - Popup Script

const API_BASE = 'http://localhost:8000/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

let authState = {
  is_authenticated: false,
  user_id: null,
  auth_token: null,
  email: null
};

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize
  await checkAuth();
  await Promise.all([
    loadStats(),
    loadHistory(),
    loadSettings()
  ]);
  setupEventListeners();
});

// ============ AUTH FUNCTIONS ============

async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    authState = {
      is_authenticated: response.is_authenticated,
      user_id: response.user_id,
      auth_token: response.auth_token
    };
    updateAuthUI();
  } catch (error) {
    console.error('Failed to check auth:', error);
  }
}

function updateAuthUI() {
  const authDot = document.getElementById('auth-dot');
  const authStatus = document.getElementById('auth-status');
  const userEmail = document.getElementById('user-email');
  const authBtn = document.getElementById('auth-btn');
  const authBtnText = document.getElementById('auth-btn-text');
  const dashboardBtn = document.getElementById('open-dashboard');
  const dashboardBtnText = document.getElementById('dashboard-btn-text');

  if (authState.is_authenticated) {
    authDot.classList.add('active');
    authStatus.classList.add('active');
    authStatus.textContent = 'Signed in';
    authStatus.parentElement.nextElementSibling.textContent = authState.user_id ? truncateEmail(authState.user_id) : '';
    authBtn.classList.remove('sign-in');
    authBtn.classList.add('sign-out');
    authBtnText.textContent = 'Sign Out';
    authBtn.innerHTML = '<span>🚪</span><span>Sign Out</span>';
    dashboardBtnText.textContent = 'Open Dashboard';
  } else {
    authDot.classList.remove('active');
    authStatus.classList.remove('active');
    authStatus.textContent = 'Not signed in';
    userEmail.textContent = '';
    authBtn.classList.remove('sign-out');
    authBtn.classList.add('sign-in');
    authBtnText.textContent = 'Sign In';
    authBtn.innerHTML = '<span>🔑</span><span>Sign In</span>';
    dashboardBtnText.textContent = 'Sign In to Dashboard';
  }
}

function truncateEmail(email) {
  if (!email) return '';
  if (email.length > 20) return email.substring(0, 17) + '...';
  return email;
}

async function handleAuth() {
  if (authState.is_authenticated) {
    // Sign out
    await chrome.runtime.sendMessage({ type: 'CLEAR_USER_AUTH' });
    authState = {
      is_authenticated: false,
      user_id: null,
      auth_token: null
    };
    updateAuthUI();
    await loadStats();
    await loadHistory();
  } else {
    // Open sign-in page
    const signInUrl = `${FRONTEND_URL}/sign-in?redirect=extension-auth`;
    chrome.tabs.create({ url: signInUrl });
  }
}

async function handleDashboard() {
  if (authState.is_authenticated) {
    const dashboardUrl = `${FRONTEND_URL}/extension-dashboard`;
    chrome.tabs.create({ url: dashboardUrl });
  } else {
    const signInUrl = `${FRONTEND_URL}/sign-in?redirect=extension-dashboard`;
    chrome.tabs.create({ url: signInUrl });
  }
}

// Listen for messages from background (for auth callback)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_UPDATED') {
    authState = message.payload;
    updateAuthUI();
    loadStats();
    loadHistory();
  }
});

// ============ SETTINGS ============

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    const settings = result.settings || { auto_popup: true };
    document.getElementById('auto-toggle').checked = settings.auto_popup !== false;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ settings });
    await chrome.runtime.sendMessage({
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
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

    document.getElementById('total-prompts').textContent = formatNumber(stats.total_prompts || 0);
    document.getElementById('saved-tokens').textContent = formatNumber(stats.total_saved_tokens || 0);

    const costValue = stats.total_saved_cost || 0;
    const costStr = costValue >= 0.01 ? '$' + costValue.toFixed(4) : '$' + costValue.toFixed(8);
    document.getElementById('saved-cost').textContent = costStr;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// ============ HISTORY ============

async function loadHistory() {
  try {
    const history = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
    const container = document.getElementById('history-list');

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

    container.innerHTML = history.slice(0, 10).map((item, index) => {
      const originalTokens = item.original ? item.original.split(' ').filter(w => w.length > 0).length : 0;
      const optimizedTokens = item.optimized ? item.optimized.split(' ').filter(w => w.length > 0).length : 0;
      const savingsPercent = originalTokens > 0 ? Math.round(((originalTokens - optimizedTokens) / originalTokens) * 100) : 0;
      const isSynced = item.source === 'backend';

      return `
        <div class="history-item">
          <div class="history-item-header">
            <div class="history-chatbot">
              <span>${getChatbotIcon(item.chatbot)}</span>
              <span>${getChatbotName(item.chatbot)}</span>
              ${isSynced ? '<span class="synced-badge">✓ Synced</span>' : ''}
            </div>
            <div class="history-savings">${savingsPercent > 0 ? `-${savingsPercent}%` : '0%'}</div>
          </div>
          <div class="history-prompt">${escapeHtml(truncate(item.original, 100))}</div>
          <div class="history-optimized">${escapeHtml(truncate(item.optimized, 80))}</div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

// ============ EVENT LISTENERS ============

function setupEventListeners() {
  // Auth button
  document.getElementById('auth-btn').addEventListener('click', handleAuth);

  // Dashboard button
  document.getElementById('open-dashboard').addEventListener('click', handleDashboard);

  // Optimize button
  document.getElementById('optimize-btn').addEventListener('click', handleOptimize);

  // Clear button
  document.getElementById('clear-btn').addEventListener('click', () => {
    document.getElementById('prompt-input').value = '';
    document.getElementById('result-card').classList.remove('show');
    document.getElementById('optimize-btn').disabled = false;
  });

  // Auto toggle
  document.getElementById('auto-toggle').addEventListener('change', (e) => {
    saveSettings({ auto_popup: e.target.checked });
  });

  // Enter to optimize
  document.getElementById('prompt-input').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleOptimize();
    }
  });
}

// ============ OPTIMIZE ============

async function handleOptimize() {
  const input = document.getElementById('prompt-input');
  const btn = document.getElementById('optimize-btn');
  const resultCard = document.getElementById('result-card');
  const prompt = input.value.trim();

  if (!prompt) return;

  // Show loading
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Optimizing...';
  resultCard.classList.remove('show');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'OPTIMIZE_PROMPT',
      payload: { prompt, target_model: 'chatgpt' }
    });

    if (!response.success) {
      throw new Error(response.error || 'Optimization failed');
    }

    const data = response.data;

    // Show result
    const suggestion = data.suggestion;
    const originalTokens = data.original?.tokens || prompt.split(' ').length;
    const savingsPercent = suggestion.token_savings > 0
      ? Math.round((suggestion.token_savings / originalTokens) * 100)
      : 0;

    document.getElementById('result-text').textContent = suggestion.text;
    document.getElementById('result-tokens').textContent = suggestion.tokens;
    document.getElementById('result-cost').textContent = '$' + formatMoney(suggestion.estimated_cost || 0);
    document.getElementById('result-savings-badge').textContent = `-${savingsPercent}%`;
    resultCard.classList.add('show');

    // Save to history
    await chrome.runtime.sendMessage({
      type: 'ADD_TO_HISTORY',
      payload: {
        original: prompt,
        optimized: suggestion.text,
        saved_tokens: suggestion.token_savings,
        saved_cost: suggestion.cost_savings || 0,
        chatbot: 'manual'
      }
    });

    // Refresh stats and history
    await Promise.all([loadStats(), loadHistory()]);

  } catch (error) {
    console.error('Optimization error:', error);
    alert('Failed to optimize. Please check if the backend is running.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✨</span> Optimize';
  }
}

// ============ HELPERS ============

function getChatbotIcon(chatbot) {
  const icons = {
    chatgpt: '🤖',
    claude: '🧠',
    gemini: '✨',
    perplexity: '🔍',
    manual: '✍️',
    synced: '🔄'
  };
  return icons[chatbot] || '🤖';
}

function getChatbotName(chatbot) {
  const names = {
    chatgpt: 'ChatGPT',
    claude: 'Claude',
    gemini: 'Gemini',
    perplexity: 'Perplexity',
    manual: 'Manual',
    synced: 'Synced'
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
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toFixed(8);
}