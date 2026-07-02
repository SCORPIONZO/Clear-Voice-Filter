import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type ProgressData = { downloaded: number; total: number };
type ProgressCallback = (data: ProgressData) => void;
type Unsubscribe = () => void;

contextBridge.exposeInMainWorld('electronAPI', {
  checkBlackHole: (): Promise<boolean> =>
    ipcRenderer.invoke('blackhole:check'),

  downloadBlackHole: (): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke('blackhole:download'),

  installBlackHole: (pkgPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('blackhole:install', pkgPath),

  /** Returns an unsubscribe function — always clean up to avoid leaks. */
  onProgress: (cb: ProgressCallback): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: ProgressData) => cb(data);
    ipcRenderer.on('blackhole:progress', handler);
    return () => ipcRenderer.removeListener('blackhole:progress', handler);
  },

  launchApp: (): Promise<void> => ipcRenderer.invoke('app:launch'),
  skipSetup: (): Promise<void> => ipcRenderer.invoke('app:skip'),
});
