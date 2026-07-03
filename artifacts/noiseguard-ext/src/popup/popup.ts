const powerBtn = document.getElementById('powerBtn') as HTMLButtonElement;
const powerRing = document.getElementById('powerRing') as HTMLDivElement;
const heroStatus = document.getElementById('heroStatus') as HTMLDivElement;
const heroSub = document.getElementById('heroSub') as HTMLDivElement;
const chain = document.getElementById('chain') as HTMLDivElement;
const openBtn = document.getElementById('openBtn') as HTMLButtonElement;

async function getState(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'POPUP_GET_STATE' }, (res) => {
      resolve(res?.enabled ?? false);
    });
  });
}

async function setState(enabled: boolean): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'POPUP_SET_STATE', enabled }, () => resolve());
  });
}

function applyUI(enabled: boolean) {
  powerBtn.classList.toggle('active', enabled);
  powerRing.classList.toggle('active', enabled);
  heroStatus.classList.toggle('active', enabled);
  chain.classList.toggle('active', enabled);

  heroStatus.textContent = enabled ? 'Активен' : 'Выключен';
  heroSub.textContent = enabled
    ? 'Микрофон очищается в реальном времени'
    : 'Нажмите, чтобы включить';
}

// Toggle on click
powerBtn.addEventListener('click', async () => {
  const current = await getState();
  const next = !current;
  await setState(next);
  applyUI(next);
});

// Open web app
openBtn.addEventListener('click', () => {
  // Try to find already open NoiseGuard tab, otherwise open new one
  const APP_URL = 'https://noiseguard.replit.app';
  chrome.tabs.query({ url: APP_URL + '/*' }, (tabs) => {
    if (tabs.length > 0 && tabs[0].id != null) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId!, { focused: true });
    } else {
      chrome.tabs.create({ url: APP_URL });
    }
    window.close();
  });
});

// Init
getState().then(applyUI);
