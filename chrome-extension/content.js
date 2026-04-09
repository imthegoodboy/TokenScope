// TokenScope Chrome Extension - IntelliSense Content Script
// Auto-detects typing, optimizes after 2s pause, shows inline suggestions

(function() {
  'use strict';

  // ============ CONFIGURATION ============
  const CONFIG = {
    debounceMs: 2000,
    minChars: 5,
    apiBase: 'http://localhost:8000/api/v1',
    autoEnabled: true
  };

  // ============ STATE ============
  let suggestionOverlay = null;
  let currentInput = null;
  let currentText = '';
  let optimizedText = '';
  let acceptedText = '';
  let isVisible = false;
  let debounceTimer = null;
  let isOptimizing = false;

  // ============ INIT ============
  function init() {
    loadSettings();
    createOverlay();
    setupEventListeners();
    observeNewInputs();
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.local.get('settings');
      if (result.settings) {
        CONFIG.autoEnabled = result.settings.auto_popup !== false;
      }
    } catch (e) {
      // Use default settings
    }
  }

  // ============ CREATE OVERLAY ============
  function createOverlay() {
    suggestionOverlay = document.createElement('div');
    suggestionOverlay.id = 'tokenscope-overlay';
    suggestionOverlay.innerHTML = getOverlayHTML();
    document.body.appendChild(suggestionOverlay);
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
          transform: translateY(8px) scale(0.98);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        #tokenscope-overlay.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }

        .ts-container {
          background: rgba(30, 30, 30, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          min-width: 320px;
          max-width: 500px;
          overflow: hidden;
        }

        .ts-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .ts-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ts-logo {
          width: 24px;
          height: 24px;
          background: #FF6B00;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #000;
        }

        .ts-title {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .ts-hints {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }

        .ts-hints kbd {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
        }

        .ts-close {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.15s;
        }

        .ts-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.9);
        }

        .ts-body {
          padding: 12px 14px;
        }

        .ts-optimized-text {
          background: rgba(255, 107, 0, 0.08);
          border: 1px solid rgba(255, 107, 0, 0.3);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.95);
        }

        .ts-stats-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 10px;
        }

        .ts-stat {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .ts-stat-value {
          font-weight: 600;
          color: #FF6B00;
        }

        .ts-stat-value.green {
          color: #4ade80;
        }

        .ts-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .ts-btn {
          flex: 1;
          padding: 8px 14px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .ts-btn-accept {
          background: #FF6B00;
          color: #000;
        }

        .ts-btn-accept:hover {
          background: #ff8533;
        }

        .ts-btn-dismiss {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
          flex: 0 0 auto;
          padding: 8px 12px;
        }

        .ts-btn-dismiss:hover {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
        }
      </style>

      <div class="ts-container">
        <div class="ts-header">
          <div class="ts-header-left">
            <div class="ts-logo">TS</div>
            <span class="ts-title">TokenScope</span>
          </div>
          <div class="ts-hints">
            <kbd>Tab</kbd> accept
            <span>|</span>
            <kbd>Esc</kbd> dismiss
          </div>
          <button class="ts-close" id="ts-close">✕</button>
        </div>

        <div class="ts-body" id="ts-body"></div>
      </div>
    `;
  }

  // ============ EVENT LISTENERS ============
  function setupEventListeners() {
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocus, true);
    suggestionOverlay.addEventListener('click', handleOverlayClick);

    // Listen for settings updates from popup
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SETTINGS_UPDATED' && message.payload) {
        CONFIG.autoEnabled = message.payload.auto_popup !== false;
      }
    });
  }

  function handleInput(e) {
    const target = e.target;
    if (!target || !isTextInput(target)) return;
    if (!CONFIG.autoEnabled) return;

    currentInput = target;
    clearTimeout(debounceTimer);

    let text = '';
    if (target.value !== undefined && target.value !== null) {
      text = String(target.value);
    } else if (target.textContent !== undefined) {
      text = target.textContent || '';
    }

    if (!text || text.length < CONFIG.minChars) {
      hideOverlay();
      return;
    }

    // Don't re-trigger if text matches last accepted text
    if (text === acceptedText) {
      hideOverlay();
      return;
    }

    debounceTimer = setTimeout(() => {
      optimizePrompt(text);
    }, CONFIG.debounceMs);
  }

  function handleKeyDown(e) {
    if (!isVisible) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      acceptSuggestion();
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      hideOverlay();
      return;
    }
  }

  function handleFocus(e) {
    if (e.target && isTextInput(e.target)) {
      currentInput = e.target;
    }
  }

  // ============ INPUT DETECTION ============
  function isTextInput(element) {
    if (!element) return false;

    try {
      const tagName = (element.tagName || '').toUpperCase();
      if (tagName === 'TEXTAREA') return true;
      if (tagName === 'INPUT') {
        const type = (element.type || '').toLowerCase();
        return !type || type === 'text' || type === 'search' || type === 'url' || type === 'email' || type === 'password';
      }

      const isEditable = element.isContentEditable || element.getAttribute?.('contenteditable') === 'true';
      if (isEditable) return true;

      return false;
    } catch (e) {
      return false;
    }
  }

  // ============ OPTIMIZATION ============
  async function optimizePrompt(text) {
    if (!text || text.length < CONFIG.minChars) return;
    if (isOptimizing) return;

    isOptimizing = true;
    optimizedText = '';
    currentText = text;

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

      if (!response.ok) throw new Error('Optimization failed');

      const data = await response.json();

      if (data && data.suggestion && data.suggestion.text) {
        optimizedText = data.suggestion.text;
      } else {
        optimizedText = text;
      }

      showSuggestion(data);
    } catch (error) {
      console.error('[TokenScope] Optimization error:', error);
    } finally {
      isOptimizing = false;
    }
  }

  // ============ UI ============
  function showSuggestion(data) {
    const body = suggestionOverlay.querySelector('#ts-body');
    if (!body) return;

    const suggestion = data?.suggestion || {};
    const savedTokens = suggestion.token_savings || 0;
    const savingsPercent = suggestion.token_savings !== undefined && currentText.split(' ').length > 0
      ? Math.round((savedTokens / currentText.split(' ').length) * 100)
      : 0;
    const costSavings = suggestion.cost_savings || 0;

    body.innerHTML = `
      <div class="ts-optimized-text">${escapeHtml(optimizedText)}</div>

      <div class="ts-stats-row">
        <div class="ts-stat">
          <span class="ts-stat-value">-${savedTokens}</span>
          <span>tokens</span>
        </div>
        <div class="ts-stat">
          <span class="ts-stat-value green">${savingsPercent}%</span>
          <span>smaller</span>
        </div>
        ${costSavings > 0 ? `
        <div class="ts-stat">
          <span class="ts-stat-value">-$${costSavings.toFixed(6)}</span>
          <span>saved</span>
        </div>
        ` : ''}
      </div>

      <div class="ts-actions">
        <button class="ts-btn ts-btn-accept" id="ts-accept">✓ Accept</button>
        <button class="ts-btn ts-btn-dismiss" id="ts-dismiss">✕</button>
      </div>
    `;

    positionOverlay();
    showOverlay();
  }

  function positionOverlay() {
    if (!currentInput) return;

    const container = suggestionOverlay.querySelector('.ts-container');
    if (!container) return;

    const inputRect = currentInput.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    let top = inputRect.bottom + window.scrollY + 10;
    let left = inputRect.left + window.scrollX;

    // Keep within viewport
    const maxLeft = window.innerWidth - containerRect.width - 10;
    if (left > maxLeft) left = Math.max(10, maxLeft);
    if (left < 10) left = 10;

    // Show above if not enough space below
    if (top + containerRect.height > window.innerHeight + window.scrollY - 10) {
      top = inputRect.top + window.scrollY - containerRect.height - 10;
    }

    if (top < window.scrollY) {
      top = inputRect.bottom + window.scrollY + 10;
    }

    suggestionOverlay.style.top = `${top}px`;
    suggestionOverlay.style.left = `${left}px`;
  }

  function showOverlay() {
    suggestionOverlay.classList.add('visible');
    isVisible = true;
  }

  function hideOverlay() {
    suggestionOverlay.classList.remove('visible');
    isVisible = false;
  }

  // ============ ACTIONS ============
  function handleOverlayClick(e) {
    const target = e.target;
    if (!target) return;

    if (target.id === 'ts-close' || target.closest?.('#ts-close')) {
      hideOverlay();
      return;
    }

    if (target.id === 'ts-accept' || target.closest?.('#ts-accept')) {
      acceptSuggestion();
      return;
    }

    if (target.id === 'ts-dismiss' || target.closest?.('#ts-dismiss')) {
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
    acceptedText = optimizedText;

    // Trigger input event for React/Vue
    currentInput.dispatchEvent(new Event('input', { bubbles: true }));

    // Visual feedback
    currentInput.style.border = '2px solid #FF6B00';
    setTimeout(() => {
      if (currentInput) currentInput.style.border = '';
    }, 1000);

    // Hide overlay completely
    hideOverlay();

    // Clear current text to prevent re-triggering on same content
    currentText = '';
  }

  // ============ UTILITIES ============
  function escapeHtml(text) {
    if (!text) return '';
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
      if (!original || !optimized) return;

      const result = await chrome.storage.local.get(['history', 'stats']);
      const history = result.history || [];
      const stats = result.stats || { total_prompts: 0, total_saved_tokens: 0, total_saved_cost: 0 };

      const originalTokens = (original.split(' ').filter(w => w.length > 0)).length;
      const optimizedTokens = (optimized.split(' ').filter(w => w.length > 0)).length;
      const savedTokens = Math.max(0, originalTokens - optimizedTokens);

      history.unshift({
        original: String(original),
        optimized: String(optimized),
        saved_tokens: savedTokens,
        timestamp: new Date().toISOString()
      });

      const trimmed = history.slice(0, 100);

      stats.total_prompts = (stats.total_prompts || 0) + 1;
      stats.total_saved_tokens = (stats.total_saved_tokens || 0) + savedTokens;

      await chrome.storage.local.set({ history: trimmed, stats });
    } catch (e) {
      console.error('[TokenScope] Save history error:', e);
    }
  }

  // ============ OBSERVER ============
  function observeNewInputs() {
    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Already handled by event listeners
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {
      console.error('[TokenScope] Observer error:', e);
    }
  }

  // ============ START ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
