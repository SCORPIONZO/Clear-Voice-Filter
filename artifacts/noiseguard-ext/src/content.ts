// Content script — runs in isolated world, injects hook into page context

(function () {
  // Generate a per-page nonce to authenticate messages from this content script.
  // The nonce is passed to the inject script via a data attribute.
  // Forged messages from page scripts won't know the nonce.
  const NONCE = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  // Inject the hook into the actual page world
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.dataset.extBase = chrome.runtime.getURL('/');
    script.dataset.nonce = NONCE;
    (document.head || document.documentElement).appendChild(script);
    // Don't remove: inject.ts reads dataset synchronously during load.
    // The browser moves on immediately; the attributes remain stable.
  }

  // Send enabled state to inject script
  function sendState(enabled: boolean) {
    window.postMessage({ source: 'ng-content', type: 'NG_STATE', enabled, nonce: NONCE }, '*');
  }

  // Inject script announces readiness — reply with current state immediately
  window.addEventListener('NG_INJECT_READY', async () => {
    const { enabled = false } = await chrome.storage.local.get('enabled');
    sendState(enabled as boolean);
  }, { once: true });

  // Background service worker broadcasts state changes
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'NG_STATE') {
      sendState(msg.enabled);
    }
  });

  injectScript();
})();
