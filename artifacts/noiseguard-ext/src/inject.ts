/**
 * inject.ts — runs in the PAGE's JavaScript context (not isolated world).
 * Overrides navigator.mediaDevices.getUserMedia to apply noise suppression.
 * Loaded as a <script src="chrome-extension://..."> tag by content.ts.
 */

// ── Read extension base URL and nonce synchronously at script load time ───────
const _currentScript = document.currentScript as HTMLScriptElement | null;
const EXT_BASE = _currentScript?.dataset?.extBase ?? '';
const NONCE = _currentScript?.dataset?.nonce ?? '';
const WORKLET_URL = EXT_BASE + 'worklet.js';

// ── State ──────────────────────────────────────────────────────────────────────
let isEnabled = false;

/**
 * stateKnown: becomes true once content script has relayed the persisted state.
 * getUserMedia calls that arrive before this resolves are queued for up to 600 ms.
 */
let stateKnown = false;
const STATE_TIMEOUT_MS = 600;

// ── Message channel with content script ───────────────────────────────────────
// Only accept messages from our own content script, verified with the per-page nonce.
window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window) return;
  const data = event.data as {
    source?: string;
    type?: string;
    enabled?: boolean;
    nonce?: string;
  };
  if (data?.source !== 'ng-content') return;
  if (!NONCE || data.nonce !== NONCE) return; // reject unsigned / forged messages
  if (data.type === 'NG_STATE') {
    isEnabled = data.enabled ?? false;
    stateKnown = true;
  }
});

// Tell content script we're ready; it will immediately reply with the current state.
window.dispatchEvent(new CustomEvent('NG_INJECT_READY'));

// Announce extension presence to NoiseGuard web app
window.dispatchEvent(new CustomEvent('NOISEGUARD_EXT_PRESENT', {
  detail: { version: '1.0.0' },
}));

// ── getUserMedia override ──────────────────────────────────────────────────────
const originalGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

navigator.mediaDevices.getUserMedia = async function (
  constraints?: MediaStreamConstraints,
): Promise<MediaStream> {
  // Wait for persisted state to arrive (bounded by STATE_TIMEOUT_MS)
  if (!stateKnown) {
    await waitForState();
  }

  const raw = await originalGUM(constraints);
  if (!isEnabled) return raw;
  if (!constraints?.audio) return raw;

  try {
    return await processStream(raw);
  } catch (err) {
    console.warn('[NoiseGuard] Audio processing failed, using raw stream:', err);
    return raw;
  }
};

/**
 * Waits until content script delivers the initial state, or STATE_TIMEOUT_MS elapses.
 * This eliminates the startup race without holding up calls indefinitely.
 */
function waitForState(): Promise<void> {
  return new Promise<void>((resolve) => {
    const start = Date.now();
    const poll = () => {
      if (stateKnown || Date.now() - start >= STATE_TIMEOUT_MS) {
        stateKnown = true; // ensure flag is set even on timeout
        resolve();
      } else {
        setTimeout(poll, 10);
      }
    };
    setTimeout(poll, 10);
  });
}

// ── AudioContext + worklet pool ────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
let workletLoaded = false;

async function getAudioContext(): Promise<AudioContext> {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
    workletLoaded = false;
  }
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (!workletLoaded && WORKLET_URL) {
    await audioCtx.audioWorklet.addModule(WORKLET_URL);
    workletLoaded = true;
  }
  return audioCtx;
}

// ── Audio processing pipeline ─────────────────────────────────────────────────
async function processStream(raw: MediaStream): Promise<MediaStream> {
  const ctx = await getAudioContext();
  const source = ctx.createMediaStreamSource(raw);

  // ① High-pass filter — cut room rumble below 80 Hz
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 80;
  hpf.Q.value = 0.7;

  // ② Noise gate AudioWorklet (per-channel gain, see worklet.ts)
  const gate = new AudioWorkletNode(ctx, 'ng-noise-gate', {
    processorOptions: { threshold: -42, attack: 0.004, release: 0.12 },
  });

  // ③ Adaptive expander — gentle downward expansion
  const expander = ctx.createDynamicsCompressor();
  expander.threshold.value = -50;
  expander.knee.value = 8;
  expander.ratio.value = 4;
  expander.attack.value = 0.002;
  expander.release.value = 0.1;

  // ④ Output compressor — normalise speech dynamics
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 5;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;

  // ⑤ Destination
  const dest = ctx.createMediaStreamDestination();

  source.connect(hpf);
  hpf.connect(gate);
  gate.connect(expander);
  expander.connect(compressor);
  compressor.connect(dest);

  return new MediaStream([
    ...dest.stream.getAudioTracks(),
    ...raw.getVideoTracks(),
  ]);
}
