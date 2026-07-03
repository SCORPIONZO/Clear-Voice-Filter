// Service Worker — manages global state, badge, broadcasts to content scripts

const BADGE_COLORS = {
  on: '#00d4aa',
  off: '#555555',
} as const;

async function getEnabled(): Promise<boolean> {
  const { enabled = false } = await chrome.storage.local.get('enabled');
  return enabled as boolean;
}

async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ enabled });
  await updateBadge(enabled);

  // Broadcast to all content scripts
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id == null) continue;
    chrome.tabs.sendMessage(tab.id, { type: 'NG_STATE', enabled }).catch(() => {
      // Tab may not have content script — that's fine
    });
  }
}

async function updateBadge(enabled: boolean): Promise<void> {
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : '' });
  await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.on });
}

// Restore badge on startup
chrome.runtime.onStartup.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});

chrome.runtime.onInstalled.addListener(async () => {
  const enabled = await getEnabled();
  await updateBadge(enabled);
});

// Messages from popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'POPUP_SET_STATE') {
    setEnabled(msg.enabled).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  if (msg.type === 'POPUP_GET_STATE') {
    getEnabled().then((enabled) => sendResponse({ enabled }));
    return true;
  }
});
