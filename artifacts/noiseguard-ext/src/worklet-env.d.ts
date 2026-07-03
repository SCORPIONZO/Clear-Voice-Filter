/**
 * AudioWorkletGlobalScope — runs in a separate thread from Window.
 * TypeScript's DOM lib doesn't fully expose these globals in regular files.
 */
declare const sampleRate: number;
declare const currentTime: number;
declare const currentFrame: number;

declare function registerProcessor(
  name: string,
  processorCtor: { new (...args: unknown[]): AudioWorkletProcessor },
): void;

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort;
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean;
}
