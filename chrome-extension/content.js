// TokenScope Chrome Extension - Content Script
// Injected into AI chatbot pages

(function() {
  'use strict';

  // ============ CONFIGURATION ============

  const CHATBOT_CONFIG = {
    chatgpt: {
      urlPattern: /chat\.openai\.com/,
      textareaSelector: 'textarea[data-id="root"]',
      submitButtonSelector: 'button[data-testid="send-button"]',
      name: 'ChatGPT'
    },
    claude: {
      urlPattern: /claude\.ai/,
      textareaSelector: '[contenteditable="true"]',
      submitButtonSelector: 'button[data-testid="send-message-button"]',
      name: 'Claude'
    },
    gemini: {
      urlPattern: /gemini\.google\.com/,
      textareaSelector: 'textarea',
      submitButtonSelector: 'button[aria-label="Send message"]',
      name: 'Gemini'
    }
  };

  // ============ STATE ============

  let currentChatbot = null;
  let overlay = null;
  let debounceTimer = null;
  let lastPrompt = '';
  let optimizationResult = null;
  let isShowingOverlay = false;

  // ============ INITIALIZATION ============

  function init() {
    // Detect which chatbot we're on
    currentChatbot = detectChatbot();

    if (!currentChatbot) {
      console.log('TokenScope: Unsupported chatbot');
      return;
    }

    console.log('TokenScope: Initialized for', currentChatbot.name);

    // Wait for page to load
    waitForElement(CHATBOT_CONFIG[currentChatbot.key].textareaSelector, setupListeners);
  }

  function detectChatbot() {
    const hostname = window.location.hostname;

    for (const [key, config] of Object.entries(CHATBOT_CONFIG)) {
      if (config.urlPattern.test(hostname)) {
        return { key, ...config };
      }
    }
    return null;
  }

  function waitForElement(selector, callback, maxAttempts = 10) {
    let attempts = 0;

    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        callback(element);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.log('TokenScope: Element not found after', maxAttempts, 'attempts');
      }
      attempts++;
    }, 500);
  }

  // ============ EVENT LISTENERS ============

  function setupListeners(textarea) {
    // Input event (debounced)
    textarea.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const prompt = e.target.value.trim();

      if (prompt && prompt !== lastPrompt) {
        debounceTimer = setTimeout(() => {
          handlePromptChange(prompt);
        }, 1500); // 1.5 second debounce
      }
    });

    // Keyboard shortcut (Ctrl+Enter)
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });

    // Submit button click
    const submitButton = document.querySelector(CHATBOT_CONFIG[currentChatbot.key].submitButtonSelector);
    if (submitButton) {
      submitButton.addEventListener('click', () => {
        if (isShowingOverlay && optimizationResult) {
          // User clicked send with overlay showing
          console.log('TokenScope: Submitting with optimization');
        }
      });
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'TRIGGER_OPTIMIZE') {
        const prompt = textarea.value.trim();
        if (prompt) {
          handlePromptChange(prompt);
        }
      }
    });

    // MutationObserver for dynamic content
    observeDOM(textarea);
  }

  function observeDOM(textarea) {
    const observer = new MutationObserver((mutations) => {
      // Re-check if textarea exists (page might have refreshed)
      if (!document.body.contains(textarea)) {
        waitForElement(
          CHATBOT_CONFIG[currentChatbot.key].textareaSelector,
          setupListeners
        );
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // ============ PROMPT HANDLING ============

  async function handlePromptChange(prompt) {
    lastPrompt = prompt;

    // Get settings
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (!settings.auto_show) return;

    console.log('TokenScope: Analyzing prompt...', prompt.substring(0, 50) + '...');

    // Show loading state
    showOverlay({
      state: 'loading',
      original: prompt
    });

    // Send to background script for API call
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'OPTIMIZE_PROMPT',
        payload: {
          prompt,
          target_model: settings.target_model || 'chatgpt'
        }
      });

      if (response.success) {
        optimizationResult = response.data;
        showOverlay({
          state: 'ready',
          original: prompt,
          ...response.data
        });
      } else {
        showOverlay({
          state: 'error',
          original: prompt,
          error: response.error
        });
      }
    } catch (error) {
      console.error('TokenScope: API error', error);
      showOverlay({
        state: 'error',
        original: prompt,
        error: error.message
      });
    }
  }

  function handleSubmit() {
    if (isShowingOverlay && optimizationResult && optimizationResult.suggestion) {
      // User wants to use optimized prompt
      const textarea = document.querySelector(CHATBOT_CONFIG[currentChatbot.key].textareaSelector);
      if (textarea) {
        textarea.value = optimizationResult.suggestion.text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // Save to history
        chrome.runtime.sendMessage({
          type: 'ADD_TO_HISTORY',
          payload: {
            original: lastPrompt,
            optimized: optimizationResult.suggestion.text,
            saved_tokens: optimizationResult.suggestion.token_savings,
            chatbot: currentChatbot.key
          }
        });
      }
    }
    hideOverlay();
  }

  // ============ OVERLAY UI ============

  function showOverlay(data) {
    isShowingOverlay = true;

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tokenscope-overlay';
      document.body.appendChild(overlay);
    }

    const { state, original, suggestion, error } = data;
    const tokenSavings = suggestion?.token_savings || 0;
    const savingsPercent = original ? Math.round((tokenSavings / original.split(' ').length) * 100) : 0;

    let stateContent = '';

    if (state === 'loading') {
      stateContent = `
        <div class="tokenscope-loading">
          <div class="tokenscope-spinner"></div>
          <span>Analyzing prompt...</span>
        </div>
      `;
    } else if (state === 'error') {
      stateContent = `
        <div class="tokenscope-error">
          <span>⚠️ ${error || 'Optimization failed'}</span>
        </div>
      `;
    } else if (state === 'ready' && suggestion) {
      stateContent = `
        <div class="tokenscope-header">
          <span class="tokenscope-logo">🤖</span>
          <span>TokenScope</span>
          <span class="tokenscope-badge">✨ Optimized</span>
        </div>

        <div class="tokenscope-section">
          <div class="tokenscope-label">Original (${original?.split(' ').length || 0} tokens)</div>
          <div class="tokenscope-text original">${escapeHtml(original)}</div>
        </div>

        <div class="tokenscope-section">
          <div class="tokenscope-label">
            Suggested (${suggestion.tokens} tokens)
            <span class="tokenscope-savings">Save ${tokenSavings} tokens (${savingsPercent}%)</span>
          </div>
          <div class="tokenscope-text optimized">${escapeHtml(suggestion.text)}</div>
        </div>

        <div class="tokenscope-actions">
          <button class="tokenscope-btn primary" id="tokenscope-send">
            📤 Send Suggested
          </button>
          <button class="tokenscope-btn secondary" id="tokenscope-edit">
            ✏️ Edit
          </button>
          <button class="tokenscope-btn secondary" id="tokenscope-dismiss">
            ❌ Dismiss
          </button>
        </div>
      `;
    }

    overlay.innerHTML = stateContent;

    // Add event listeners
    const sendBtn = overlay.querySelector('#tokenscope-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', handleSubmit);
    }

    const dismissBtn = overlay.querySelector('#tokenscope-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', hideOverlay);
    }

    const editBtn = overlay.querySelector('#tokenscope-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (suggestion) {
          const textarea = document.querySelector(CHATBOT_CONFIG[currentChatbot.key].textareaSelector);
          if (textarea) {
            textarea.value = suggestion.text;
            textarea.focus();
          }
        }
        hideOverlay();
      });
    }

    // Position overlay near textarea
    positionOverlay();
  }

  function hideOverlay() {
    isShowingOverlay = false;
    optimizationResult = null;
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  function positionOverlay() {
    if (!overlay) return;

    const textarea = document.querySelector(CHATBOT_CONFIG[currentChatbot.key].textareaSelector);
    if (!textarea) return;

    const rect = textarea.getBoundingClientRect();

    overlay.style.top = `${rect.bottom + window.scrollY + 10}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${Math.max(rect.width, 400)}px`;
    overlay.style.display = 'block';
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============ START ============

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
