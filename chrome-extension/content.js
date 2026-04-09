// TokenScope Chrome Extension - IntelliSense Content Script
// Auto-detects typing, optimizes after 2s pause, shows inline suggestions

(function() {
  'use strict';

  // ============ CONFIGURATION ============
  const CONFIG = {
    debounceMs: 2000,        // Wait 2 seconds after typing stops
    minChars: 5,             // Minimum characters to trigger optimization
    apiBase: 'http://localhost:8000/api/v1'
  };

  // ============ STATE ============
  let suggestionOverlay = null;
  let currentInput = null;
  let currentText = '';
  let optimizedText = '';
  let isVisible = false;
  let debounceTimer = null;
  let isOptimizing = false;
  let lastOptimized = '';

  // ============ INIT ============
  function init() {
    createOverlay();
    setupEventListeners();
    observeNewInputs();
    console.log('[TokenScope] Initialized - Ready to optimize!');
  }

  // ============ CREATE OVERLAY ============
  function createOverlay() {
    suggestionOverlay = document.createElement('div');
    suggestionOverlay.id = 'tokenscope-overlay';
    suggestionOverlay.innerHTML = getOverlayHTML();
    document.body.appendChild(suggestionOverlay);

    // Event listeners for buttons
    suggestionOverlay.addEventListener('click', handleOverlayClick);
  }

  function getOverlayHTML() {
    return `
      <style>
        #tokenscope-overlay {
          position: fixed;
          z-index: 999999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          pointer-events: none;
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        #tokenscope-overlay.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .ts-container {
          background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
          border: 2px solid #FF6B00;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 107, 0, 0.2);
          min-width: 400px;
          max-width: 600px;
          overflow: hidden;
        }

        .ts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: linear-gradient(90deg, rgba(255, 107, 0, 0.2), transparent);
          border-bottom: 1px solid #333;
        }

        .ts-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ts-logo {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #FF6B00, #FF8533);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 800;
          color: #000;
        }

        .ts-title {
          font-size: 14px;
          font-weight: 600;
          color: #FF6B00;
        }

        .ts-close {
          width: 28px;
          height: 28px;
          background: #333;
          border: none;
          border-radius: 6px;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s;
        }

        .ts-close:hover {
          background: #444;
          color: #fff;
        }

        .ts-body {
          padding: 16px;
        }

        .ts-section {
          margin-bottom: 14px;
        }

        .ts-section:last-child {
          margin-bottom: 0;
        }

        .ts-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ts-text {
          background: #0a0a0a;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.5;
          color: #888;
          max-height: 60px;
          overflow: hidden;
          position: relative;
        }

        .ts-text::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          background: linear-gradient(transparent, #0a0a0a);
        }

        .ts-text.optimized {
          background: rgba(255, 107, 0, 0.1);
          border: 1px solid #FF6B00;
          color: #fff;
        }

        .ts-text.optimized::after {
          background: linear-gradient(transparent, rgba(255, 107, 0, 0.1));
        }

        .ts-stats {
          display: flex;
          gap: 16px;
          padding: 10px 12px;
          background: #0a0a0a;
          border-radius: 8px;
          margin-bottom: 14px;
        }

        .ts-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #888;
        }

        .ts-stat-value {
          font-weight: 700;
          color: #fff;
        }

        .ts-stat-value.green { color: #22c55e; }
        .ts-stat-value.orange { color: #FF6B00; }

        .ts-actions {
          display: flex;
          gap: 10px;
        }

        .ts-btn {
          flex: 1;
          padding: 12px 16px;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .ts-btn-accept {
          background: linear-gradient(135deg, #FF6B00, #FF8533);
          color: #000;
        }

        .ts-btn-accept:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 107, 0, 0.4);
        }

        .ts-btn-edit {
          background: #222;
          color: #fff;
        }

        .ts-btn-edit:hover {
          background: #333;
        }

        .ts-btn-dismiss {
          background: #222;
          color: #888;
          flex: 0;
          padding: 12px;
        }

        .ts-btn-dismiss:hover {
          background: #333;
          color: #fff;
        }

        .ts-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 30px;
          color: #888;
        }

        .ts-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #333;
          border-top-color: #FF6B00;
          border-radius: 50%;
          animation: ts-spin 0.8s linear infinite;
        }

        @keyframes ts-spin {
          to { transform: rotate(360deg); }
        }

        .ts-hint {
          position: fixed;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 8px;
          padding: 8px 14px;
          font-size: 12px;
          color: #888;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
          z-index: 999999998;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .ts-hint.visible {
          opacity: 1;
        }

        .ts-hint kbd {
          background: #333;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          margin: 0 2px;
          color: #fff;
        }
      </style>

      <div class="ts-container">
        <div class="ts-header">
          <div class="ts-header-left">
            <div class="ts-logo">TS</div>
            <span class="ts-title">✨ TokenScope</span>
          </div>
          <button class="ts-close" id="ts-close">✕</button>
        </div>

        <div class="ts-body" id="ts-body">
          <div class="ts-loading">
            <div class="ts-spinner"></div>
            <span>Analyzing prompt...</span>
          </div>
        </div>
      </div>

      <div class="ts-hint" id="ts-hint">
        Press <kbd>Tab</kbd> to accept or <kbd>Esc</kbd> to dismiss
      </div>
    `;
  }

  // ============ EVENT LISTENERS ============
  function setupEventListeners() {
    // Listen for all input events on the page
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // Listen for focus on inputs
    document.addEventListener('focusin', handleFocus, true);
  }

  function handleInput(e) {
    const target = e.target;

    // Only handle text inputs
    if (!isTextInput(target)) return;

    currentInput = target;

    // Clear previous timer
    clearTimeout(debounceTimer);

    const text = target.value;

    // Don't optimize if too short
    if (text.length < CONFIG.minChars) {
      hideOverlay();
      return;
    }

    // Start new timer - optimize after 2 seconds of NO typing
    debounceTimer = setTimeout(() => {
      console.log('[TokenScope] Typing stopped, optimizing...');
      optimizePrompt(text);
    }, CONFIG.debounceMs);
  }

  function handleKeyDown(e) {
    // Tab to accept
    if (e.key === 'Tab' && isVisible) {
      e.preventDefault();
      acceptSuggestion();
      return;
    }

    // Escape to dismiss
    if (e.key === 'Escape' && isVisible) {
      e.preventDefault();
      hideOverlay();
      return;
    }

    // Ctrl+Shift+O to manually trigger
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      if (currentInput && currentInput.value.length >= CONFIG.minChars) {
        optimizePrompt(currentInput.value);
      }
      return;
    }
  }

  function handleFocus(e) {
    if (isTextInput(e.target)) {
      currentInput = e.target;
    }
  }

  // ============ INPUT DETECTION ============
  function isTextInput(element) {
    if (!element) return false;

    const tagName = element.tagName?.toUpperCase();
    if (tagName === 'TEXTAREA') return true;
    if (tagName === 'INPUT') {
      const type = element.type?.toLowerCase();
      return !type || type === 'text' || type === 'search' || type === 'url' || type === 'email' || type === 'password';
    }
    // contenteditable
    if (element.isContentEditable || element.getAttribute?.('contenteditable') === 'true') return true;

    // Check for common AI chatbot selectors
    const className = element.className || '';
    const id = element.id || '';

    const aiSelectors = [
      'prompt-input',
      'text-input',
      'chat-input',
      'message-input',
      'composer',
      'ProseMirror',
      'notion',
      'tiptap'
    ];

    for (const selector of aiSelectors) {
      if (className.includes(selector) || id.includes(selector)) {
        return true;
      }
    }

    return false;
  }

  // ============ OPTIMIZATION ============
  async function optimizePrompt(text) {
    if (isOptimizing || text === lastOptimized) return;
    isOptimizing = true;
    optimizedText = '';
    currentText = text;

    // Show loading state
    showLoading();

    try {
      const response = await fetch(`${CONFIG.apiBase}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': await getUserId()
        },
        body: JSON.stringify({
          prompt: text,
          target_model: 'chatgpt'
        })
      });

      if (!response.ok) {
        throw new Error('Optimization failed');
      }

      const data = await response.json();
      optimizedText = data.suggestion?.text || text;
      lastOptimized = text;

      showSuggestion(data);

    } catch (error) {
      console.error('[TokenScope] Error:', error);
      hideOverlay();
    } finally {
      isOptimizing = false;
    }
  }

  // ============ UI ============
  function showLoading() {
    const body = suggestionOverlay.querySelector('#ts-body');
    const hint = suggestionOverlay.querySelector('#ts-hint');

    body.innerHTML = `
      <div class="ts-loading">
        <div class="ts-spinner"></div>
        <span>Analyzing prompt...</span>
      </div>
    `;

    positionOverlay();
    showOverlay();
  }

  function showSuggestion(data) {
    const { suggestion, original } = data;
    const originalTokens = original?.tokens || currentText.split(' ').length;
    const savedTokens = suggestion?.token_savings || 0;
    const savingsPercent = originalTokens > 0 ? Math.round((savedTokens / originalTokens) * 100) : 0;

    const body = suggestionOverlay.querySelector('#ts-body');
    const hint = suggestionOverlay.querySelector('#ts-hint');

    body.innerHTML = `
      <div class="ts-section">
        <div class="ts-label">📝 Original</div>
        <div class="ts-text">${escapeHtml(truncate(currentText, 150))}</div>
      </div>

      <div class="ts-section">
        <div class="ts-label">✨ Optimized</div>
        <div class="ts-text optimized">${escapeHtml(truncate(suggestion.text, 150))}</div>
      </div>

      <div class="ts-stats">
        <div class="ts-stat">
          <span>📝</span>
          <span class="ts-stat-value orange">-${savedTokens}</span>
          <span>tokens</span>
        </div>
        <div class="ts-stat">
          <span>✨</span>
          <span class="ts-stat-value green">${savingsPercent}%</span>
          <span>smaller</span>
        </div>
        <div class="ts-stat">
          <span>💰</span>
          <span class="ts-stat-value">$${(suggestion.cost_savings || 0).toFixed(6)}</span>
          <span>saved</span>
        </div>
      </div>

      <div class="ts-actions">
        <button class="ts-btn ts-btn-accept" id="ts-accept">
          ✓ Accept
        </button>
        <button class="ts-btn ts-btn-edit" id="ts-edit">
          ✏️ Edit
        </button>
        <button class="ts-btn ts-btn-dismiss" id="ts-dismiss">
          ✕
        </button>
      </div>
    `;

    positionOverlay();
    showOverlay();
    showHint();
  }

  function positionOverlay() {
    if (!currentInput) return;

    const inputRect = currentInput.getBoundingClientRect();
    const overlayRect = suggestionOverlay.querySelector('.ts-container').getBoundingClientRect();

    let top = inputRect.bottom + window.scrollY + 10;
    let left = inputRect.left + window.scrollX;

    // Keep within viewport
    const maxLeft = window.innerWidth - overlayRect.width - 20;
    if (left > maxLeft) left = maxLeft;
    if (left < 20) left = 20;

    // Show above if not enough space below
    if (top + overlayRect.height > window.innerHeight + window.scrollY) {
      top = inputRect.top + window.scrollY - overlayRect.height - 10;
    }

    suggestionOverlay.style.top = `${top}px`;
    suggestionOverlay.style.left = `${left}px`;
  }

  function showHint() {
    const hint = suggestionOverlay.querySelector('#ts-hint');
    const container = suggestionOverlay.querySelector('.ts-container');
    const containerRect = container.getBoundingClientRect();

    hint.style.top = `${containerRect.bottom + 8}px`;
    hint.style.left = `${containerRect.left}px`;
    hint.classList.add('visible');

    // Auto-hide hint after 5 seconds
    setTimeout(() => {
      hint.classList.remove('visible');
    }, 5000);
  }

  function showOverlay() {
    suggestionOverlay.classList.add('visible');
    isVisible = true;
  }

  function hideOverlay() {
    suggestionOverlay.classList.remove('visible');
    isVisible = false;

    const hint = suggestionOverlay.querySelector('#ts-hint');
    if (hint) hint.classList.remove('visible');
  }

  // ============ ACTIONS ============
  function handleOverlayClick(e) {
    if (e.target.id === 'ts-close' || e.target.closest('#ts-close')) {
      hideOverlay();
      return;
    }

    if (e.target.id === 'ts-accept' || e.target.closest('#ts-accept')) {
      acceptSuggestion();
      return;
    }

    if (e.target.id === 'ts-edit' || e.target.closest('#ts-edit')) {
      editSuggestion();
      return;
    }

    if (e.target.id === 'ts-dismiss' || e.target.closest('#ts-dismiss')) {
      hideOverlay();
      return;
    }
  }

  function acceptSuggestion() {
    if (!currentInput || !optimizedText) return;

    // Save to history
    saveToHistory(currentText, optimizedText);

    // Replace text
    currentInput.value = optimizedText;

    // Trigger input event for React/Vue
    currentInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Visual feedback
    currentInput.style.border = '2px solid #FF6B00';
    setTimeout(() => {
      currentInput.style.border = '';
    }, 1000);

    hideOverlay();

    // Reset
    lastOptimized = '';
    optimizedText = '';
  }

  function editSuggestion() {
    if (!currentInput || !optimizedText) return;

    // Put optimized text in input and focus
    currentInput.value = optimizedText;
    currentInput.focus();

    // Move cursor to end
    const len = optimizedText.length;
    if (currentInput.setSelectionRange) {
      currentInput.setSelectionRange(len, len);
    }

    hideOverlay();
  }

  // ============ UTILITIES ============
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

  async function getUserId() {
    try {
      const result = await chrome.storage.local.get('user_id');
      return result.user_id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  async function saveToHistory(original, optimized) {
    try {
      const result = await chrome.storage.local.get(['history', 'stats']);
      const history = result.history || [];
      const stats = result.stats || { total_prompts: 0, total_saved_tokens: 0, total_saved_cost: 0 };

      // Calculate savings
      const originalTokens = original.split(' ').length;
      const optimizedTokens = optimized.split(' ').length;
      const savedTokens = originalTokens - optimizedTokens;

      history.unshift({
        original,
        optimized,
        saved_tokens: savedTokens,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100
      const trimmed = history.slice(0, 100);

      // Update stats
      stats.total_prompts += 1;
      stats.total_saved_tokens += Math.max(0, savedTokens);

      await chrome.storage.local.set({ history: trimmed, stats });

    } catch (error) {
      console.error('[TokenScope] Failed to save history:', error);
    }
  }

  // ============ OBSERVER ============
  function observeNewInputs() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (isTextInput(node)) {
              // Already handled by event listeners
            }

            // Check children for inputs
            const inputs = node.querySelectorAll?.('textarea, input[type="text"], input:not([type])');
            inputs?.forEach(() => {
              // Already handled by event listeners
            });
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============ START ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
