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
    try {
      console.log('[TokenScope] Initializing...');
      createOverlay();
      setupEventListeners();
      observeNewInputs();
      console.log('[TokenScope] Initialized - Ready to optimize!');
    } catch (error) {
      console.error('[TokenScope] Init error:', error);
    }
  }

  // ============ CREATE OVERLAY ============
  function createOverlay() {
    console.log('[TokenScope] Creating overlay...');
    suggestionOverlay = document.createElement('div');
    suggestionOverlay.id = 'tokenscope-overlay';
    suggestionOverlay.innerHTML = getOverlayHTML();
    document.body.appendChild(suggestionOverlay);
    console.log('[TokenScope] Overlay created and added to DOM');
  }

  // ============ EVENT LISTENERS ============
  function setupEventListeners() {
    try {
      console.log('[TokenScope] Setting up event listeners...');
      // Listen for all input events on the page
      document.addEventListener('input', handleInput, true);
      document.addEventListener('keydown', handleKeyDown, true);

      // Listen for focus on inputs
      document.addEventListener('focusin', handleFocus, true);

      // Listen for clicks on overlay
      suggestionOverlay.addEventListener('click', handleOverlayClick);
      console.log('[TokenScope] Event listeners set up successfully');
    } catch (error) {
      console.error('[TokenScope] Event listener error:', error);
    }
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

        .ts-label {
          font-size: 11px;
          text-transform: uppercase;
          color: #666;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .ts-text {
          background: #0a0a0a;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          line-height: 1.5;
          color: #888;
          max-height: 80px;
          overflow: hidden;
          position: relative;
          word-wrap: break-word;
        }

        .ts-text::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 25px;
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
            <span class="ts-title">TokenScope</span>
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
    try {
      // Listen for all input events on the page
      document.addEventListener('input', handleInput, true);
      document.addEventListener('keydown', handleKeyDown, true);

      // Listen for focus on inputs
      document.addEventListener('focusin', handleFocus, true);

      // Listen for clicks on overlay
      suggestionOverlay.addEventListener('click', handleOverlayClick);
    } catch (error) {
      console.error('[TokenScope] Event listener error:', error);
    }
  }

  function handleInput(e) {
    try {
      const target = e.target;
      if (!target) return;

      console.log('[TokenScope] Input event fired on:', target.tagName);

      // Only handle text inputs
      if (!isTextInput(target)) return;

      console.log('[TokenScope] Is text input, processing...');

      currentInput = target;

      // Clear previous timer
      clearTimeout(debounceTimer);

      // Get text value safely
      let text = '';
      if (target.value !== undefined && target.value !== null) {
        text = String(target.value);
      } else if (target.textContent !== undefined) {
        text = target.textContent || '';
      }

      console.log('[TokenScope] Text length:', text.length);

      if (!text || text.length === 0) {
        console.log('[TokenScope] Empty text, hiding overlay');
        hideOverlay();
        return;
      }

      // Don't optimize if too short
      if (text.length < CONFIG.minChars) {
        console.log('[TokenScope] Text too short:', text.length, '<', CONFIG.minChars);
        hideOverlay();
        return;
      }

      // Start new timer - optimize after 2 seconds of NO typing
      console.log('[TokenScope] Starting debounce timer...');
      debounceTimer = setTimeout(() => {
        console.log('[TokenScope] Debounce complete, calling optimizePrompt');
        optimizePrompt(text);
      }, CONFIG.debounceMs);
    } catch (error) {
      console.error('[TokenScope] Input handle error:', error);
    }
  }

  function handleKeyDown(e) {
    try {
      if (!isVisible) return;

      // Tab to accept
      if (e.key === 'Tab') {
        e.preventDefault();
        acceptSuggestion();
        return;
      }

      // Escape to dismiss
      if (e.key === 'Escape') {
        e.preventDefault();
        hideOverlay();
        return;
      }

      // Ctrl+Shift+O to manually trigger
      if (e.ctrlKey && e.shiftKey && e.key && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        if (currentInput && currentInput.value && currentInput.value.length >= CONFIG.minChars) {
          optimizePrompt(currentInput.value);
        }
        return;
      }
    } catch (error) {
      console.error('[TokenScope] Keydown error:', error);
    }
  }

  function handleFocus(e) {
    try {
      if (e.target && isTextInput(e.target)) {
        currentInput = e.target;
      }
    } catch (error) {
      console.error('[TokenScope] Focus error:', error);
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

      // contenteditable
      const isEditable = element.isContentEditable || element.getAttribute?.('contenteditable') === 'true';
      if (isEditable) return true;

      return false;
    } catch (error) {
      return false;
    }
  }

  // ============ OPTIMIZATION ============
  async function optimizePrompt(text) {
    console.log('[TokenScope] optimizePrompt called with text length:', text ? text.length : 0);
    if (!text || text.length < CONFIG.minChars) return;
    if (isOptimizing || text === lastOptimized) return;

    isOptimizing = true;
    optimizedText = '';
    currentText = text;

    console.log('[TokenScope] Showing loading state...');
    // Show loading state
    showLoading();

    try {
      console.log('[TokenScope] Sending API request...');
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

      console.log('[TokenScope] Response status:', response.status);

      if (!response.ok) {
        throw new Error('Optimization failed');
      }

      const data = await response.json();
      console.log('[TokenScope] API response received:', JSON.stringify(data).substring(0, 200));

      // Handle response safely
      if (data && data.suggestion && data.suggestion.text) {
        optimizedText = data.suggestion.text;
      } else {
        console.log('[TokenScope] No suggestion in response, using original');
        optimizedText = text; // Fallback to original
      }

      lastOptimized = text;
      console.log('[TokenScope] Calling showSuggestion...');
      showSuggestion(data);

    } catch (error) {
      console.error('[TokenScope] Optimization error:', error);
      hideOverlay();
    } finally {
      isOptimizing = false;
    }
  }

  // ============ UI ============
  function showLoading() {
    try {
      const body = suggestionOverlay.querySelector('#ts-body');
      if (body) {
        body.innerHTML = `
          <div class="ts-loading">
            <div class="ts-spinner"></div>
            <span>Analyzing prompt...</span>
          </div>
        `;
      }
      positionOverlay();
      showOverlay();
    } catch (error) {
      console.error('[TokenScope] Show loading error:', error);
    }
  }

  function showSuggestion(data) {
    try {
      console.log('[TokenScope] showSuggestion called, data keys:', data ? Object.keys(data) : 'null');

      const body = suggestionOverlay.querySelector('#ts-body');
      const hint = suggestionOverlay.querySelector('#ts-hint');
      if (!body) {
        console.log('[TokenScope] Body element not found!');
        return;
      }
      console.log('[TokenScope] Body element found');

      // Safe data extraction
      const suggestion = data?.suggestion || {};
      const originalTokens = suggestion.token_savings !== undefined
        ? (currentText.split(' ').length)
        : (data?.original?.tokens || currentText.split(' ').length);
      const savedTokens = suggestion.token_savings || 0;
      const savingsPercent = originalTokens > 0 ? Math.round((savedTokens / originalTokens) * 100) : 0;

      body.innerHTML = `
        <div class="ts-section">
          <div class="ts-label">📝 Original</div>
          <div class="ts-text">${escapeHtml(truncate(currentText || '', 200))}</div>
        </div>

        <div class="ts-section">
          <div class="ts-label">✨ Optimized</div>
          <div class="ts-text optimized">${escapeHtml(truncate(optimizedText || currentText || '', 200))}</div>
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
          <button class="ts-btn ts-btn-accept" id="ts-accept">✓ Accept</button>
          <button class="ts-btn ts-btn-edit" id="ts-edit">✏️ Edit</button>
          <button class="ts-btn ts-btn-dismiss" id="ts-dismiss">✕</button>
        </div>
      `;

      positionOverlay();
      showOverlay();
      showHint();
      console.log('[TokenScope] Overlay shown successfully');
    } catch (error) {
      console.error('[TokenScope] Show suggestion error:', error);
    }
  }

  function positionOverlay() {
    try {
      if (!currentInput) {
        console.log('[TokenScope] positionOverlay: no currentInput');
        return;
      }

      const container = suggestionOverlay.querySelector('.ts-container');
      if (!container) {
        console.log('[TokenScope] positionOverlay: no container');
        return;
      }

      console.log('[TokenScope] Positioning overlay...');

      const inputRect = currentInput.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      console.log('[TokenScope] Input rect:', inputRect);
      console.log('[TokenScope] Container rect:', containerRect);

      let top = inputRect.bottom + window.scrollY + 10;
      let left = inputRect.left + window.scrollX;

      // Keep within viewport
      const maxLeft = window.innerWidth - containerRect.width - 20;
      if (left > maxLeft) left = Math.max(20, maxLeft);
      if (left < 20) left = 20;

      // Show above if not enough space below
      if (top + containerRect.height > window.innerHeight + window.scrollY) {
        top = inputRect.top + window.scrollY - containerRect.height - 10;
      }

      if (top < window.scrollY) {
        top = inputRect.bottom + window.scrollY + 10;
      }

      suggestionOverlay.style.top = `${top}px`;
      suggestionOverlay.style.left = `${left}px`;
      console.log('[TokenScope] Overlay positioned at top:', top, 'left:', left);
    } catch (error) {
      console.error('[TokenScope] Position error:', error);
    }
  }

  function showHint() {
    try {
      const hint = suggestionOverlay.querySelector('#ts-hint');
      const container = suggestionOverlay.querySelector('.ts-container');
      if (!hint || !container) return;

      const containerRect = container.getBoundingClientRect();

      hint.style.top = `${containerRect.bottom + 8}px`;
      hint.style.left = `${containerRect.left}px`;
      hint.classList.add('visible');

      // Auto-hide hint after 5 seconds
      setTimeout(() => {
        hint.classList.remove('visible');
      }, 5000);
    } catch (error) {
      console.error('[TokenScope] Show hint error:', error);
    }
  }

  function showOverlay() {
    console.log('[TokenScope] showOverlay called, setting isVisible=true');
    suggestionOverlay.classList.add('visible');
    isVisible = true;
  }

  function hideOverlay() {
    console.log('[TokenScope] hideOverlay called');
    suggestionOverlay.classList.remove('visible');
    isVisible = false;

    try {
      const hint = suggestionOverlay.querySelector('#ts-hint');
      if (hint) hint.classList.remove('visible');
    } catch (error) {
      console.error('[TokenScope] Hide overlay error:', error);
    }
  }

  // ============ ACTIONS ============
  function handleOverlayClick(e) {
    try {
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

      if (target.id === 'ts-edit' || target.closest?.('#ts-edit')) {
        editSuggestion();
        return;
      }

      if (target.id === 'ts-dismiss' || target.closest?.('#ts-dismiss')) {
        hideOverlay();
        return;
      }
    } catch (error) {
      console.error('[TokenScope] Overlay click error:', error);
    }
  }

  function acceptSuggestion() {
    try {
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
        if (currentInput) currentInput.style.border = '';
      }, 1000);

      hideOverlay();

      // Reset
      lastOptimized = '';
      optimizedText = '';
    } catch (error) {
      console.error('[TokenScope] Accept error:', error);
    }
  }

  function editSuggestion() {
    try {
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
    } catch (error) {
      console.error('[TokenScope] Edit error:', error);
    }
  }

  // ============ UTILITIES ============
  function truncate(str, length) {
    if (!str) return '';
    str = String(str);
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  }

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

      // Calculate savings safely
      const originalTokens = (original.split(' ').filter(w => w.length > 0)).length;
      const optimizedTokens = (optimized.split(' ').filter(w => w.length > 0)).length;
      const savedTokens = Math.max(0, originalTokens - optimizedTokens);

      history.unshift({
        original: String(original),
        optimized: String(optimized),
        saved_tokens: savedTokens,
        timestamp: new Date().toISOString()
      });

      // Keep only last 100
      const trimmed = history.slice(0, 100);

      // Update stats
      stats.total_prompts = (stats.total_prompts || 0) + 1;
      stats.total_saved_tokens = (stats.total_saved_tokens || 0) + savedTokens;

      await chrome.storage.local.set({ history: trimmed, stats });

    } catch (error) {
      console.error('[TokenScope] Save history error:', error);
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
    } catch (error) {
      console.error('[TokenScope] Observer error:', error);
    }
  }

  // ============ START ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
