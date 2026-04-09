// TokenScope Chrome Extension - Popup Script

const API_BASE = 'http://localhost:8000/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
  // Load initial data
  await Promise.all([
    loadStats(),
    loadHistory(),
    loadSettings()
  ]);

  // Setup event listeners
  setupEventListeners();
});

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

async function loadStats() {
  try {
    const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });

    document.getElementById('total-prompts').textContent = formatNumber(stats.total_prompts || 0);
    document.getElementById('saved-tokens').textContent = formatNumber(stats.total_saved_tokens || 0);
    document.getElementById('saved-cost').textContent = '$' + formatMoney(stats.total_saved_cost || 0);
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

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

    container.innerHTML = history.slice(0, 10).map(item => {
      const savingsPercent = item.original ? Math.round((item.saved_tokens / item.original.split(' ').length) * 100) : 0;
      return `
        <div class="history-item">
          <div class="history-item-header">
            <div class="history-chatbot">
              <span>${getChatbotIcon(item.chatbot)}</span>
              <span>${getChatbotName(item.chatbot)}</span>
            </div>
            <div class="history-savings">-${savingsPercent}%</div>
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

function setupEventListeners() {
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
    const userId = await getUserId();

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
    const suggestion = data.suggestion;
    const originalTokens = data.original?.tokens || prompt.split(' ').length;
    const savingsPercent = Math.round((suggestion.token_savings / originalTokens) * 100);

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

async function getUserId() {
  try {
    const result = await chrome.storage.local.get('user_id');
    return result.user_id || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

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
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toFixed(8);
}
