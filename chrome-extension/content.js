// TokenScope Chrome Extension - IntelliSense Content Script

(function() {
  'use strict';

  const CONFIG = {
    debounceMs: 2000,
    minChars: 5,
    apiBase: 'http://localhost:8000/api/v1',
    autoEnabled: true
  };

  let suggestionOverlay = null;
  let currentInput = null;
  let currentText = '';
  let optimizedText = '';
  let acceptedText = '';
  let isVisible = false;
  let debounceTimer = null;
  let isOptimizing = false;

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
    } catch (e) {}
  }

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
          transform: translateY(4px);
          transition: opacity 0.15s ease, transform 0.15s ease;
        }

        #tokenscope-overlay.visible {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .ts-container {
          background: rgba(255, 255, 255, 0.97);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 24px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px 8px 16px;
          max-width: 400px;
        }

        .ts-text {
          flex: 1;
          font-size: 13px;
          line-height: 1.4;
          color: #111;
          word-wrap: break-word;
        }

        .ts-btn {
          padding: 6px 14px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }

        .ts-btn:hover {
          background: #333;
        }
      </style>

      <div class="ts-container">
        <div class="ts-text" id="ts-text"></div>
        <button class="ts-btn" id="ts-accept">Accept</button>
      </div>
    `;
  }

  function setupEventListeners() {
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocus, true);
    suggestionOverlay.addEventListener('click', handleOverlayClick);

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

      showSuggestion();
    } catch (error) {
      console.error('[TokenScope] Optimization error:', error);
    } finally {
      isOptimizing = false;
    }
  }

  function showSuggestion() {
    const textEl = suggestionOverlay.querySelector('#ts-text');
    if (!textEl) return;

    textEl.textContent = optimizedText;

    positionOverlay();
    showOverlay();
  }

  function positionOverlay() {
    if (!currentInput) return;

    const container = suggestionOverlay.querySelector('.ts-container');
    if (!container) return;

    const inputRect = currentInput.getBoundingClientRect();

    let top = inputRect.bottom + window.scrollY + 8;
    let left = inputRect.left + window.scrollX;

    const maxLeft = window.innerWidth - 420 - 10;
    if (left > maxLeft) left = Math.max(10, maxLeft);
    if (left < 10) left = 10;

    if (top + 60 > window.innerHeight + window.scrollY - 10) {
      top = inputRect.top + window.scrollY - 60 - 8;
    }

    if (top < window.scrollY) {
      top = inputRect.bottom + window.scrollY + 8;
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

  function handleOverlayClick(e) {
    const target = e.target;
    if (!target) return;

    if (target.id === 'ts-accept') {
      acceptSuggestion();
      return;
    }
  }

  function acceptSuggestion() {
    if (!currentInput || !optimizedText) return;

    saveToHistory(currentText, optimizedText);

    currentInput.value = optimizedText;
    acceptedText = optimizedText;

    currentInput.dispatchEvent(new Event('input', { bubbles: true }));

    currentInput.style.border = '2px solid #000';
    setTimeout(() => {
      if (currentInput) currentInput.style.border = '';
    }, 1000);

    hideOverlay();
    currentText = '';
  }

  async function getUserId() {
    try {
      // First try to get authenticated user
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      if (response.is_authenticated && response.user_id) {
        return response.user_id;
      }

      // Fallback to local storage
      const result = await chrome.storage.local.get('user_id');
      return result.user_id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  async function saveToHistory(original, optimized) {
    try {
      if (!original || !optimized) return;

      const originalTokens = (original.split(' ').filter(w => w.length > 0)).length;
      const optimizedTokens = (optimized.split(' ').filter(w => w.length > 0)).length;
      const savedTokens = Math.max(0, originalTokens - optimizedTokens);

      // Try to save to backend first
      const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });

      if (authStatus.is_authenticated) {
        try {
          await fetch(`${CONFIG.apiBase}/extension/save-optimization`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authStatus.auth_token}`
            },
            body: JSON.stringify({
              user_id: authStatus.user_id,
              original_prompt: original,
              optimized_prompt: optimized,
              original_tokens: originalTokens,
              optimized_tokens: optimizedTokens,
              tokens_saved: savedTokens,
              cost_saved: 0,
              target_model: 'chatgpt',
              source: 'extension'
            })
          });
        } catch (e) {
          console.log('[TokenScope] Failed to sync to backend, saving locally');
        }
      }

      // Always save to local storage as backup
      const result = await chrome.storage.local.get(['history', 'stats']);
      const history = result.history || [];
      const stats = result.stats || { total_prompts: 0, total_saved_tokens: 0, total_saved_cost: 0 };

      history.unshift({
        original: String(original),
        optimized: String(optimized),
        saved_tokens: savedTokens,
        timestamp: new Date().toISOString(),
        source: authStatus.is_authenticated ? 'synced' : 'local'
      });

      const trimmed = history.slice(0, 100);

      stats.total_prompts = (stats.total_prompts || 0) + 1;
      stats.total_saved_tokens = (stats.total_saved_tokens || 0) + savedTokens;

      await chrome.storage.local.set({ history: trimmed, stats });
    } catch (e) {}
  }

  function observeNewInputs() {
    try {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {}
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
