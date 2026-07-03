/**
 * NoiseGuard AudioWorklet — noise gate with per-channel independent processing.
 * Runs on the audio render thread; no DOM access.
 */

const MAX_CHANNELS = 8;
const RMS_SIZE = 128;

class NoiseGateProcessor extends AudioWorkletProcessor {
  private readonly threshold: number;
  private readonly attackCoeff: number;
  private readonly releaseCoeff: number;

  // Per-channel state (pre-allocated, indexed by channel index)
  private readonly gains = new Float32Array(MAX_CHANNELS);
  private readonly rmsSums = new Float64Array(MAX_CHANNELS);
  private readonly rmsIndices = new Uint32Array(MAX_CHANNELS);
  private readonly rmsBuffers: Float32Array[] = Array.from(
    { length: MAX_CHANNELS },
    () => new Float32Array(RMS_SIZE),
  );

  constructor(options: AudioWorkletNodeOptions) {
    super();
    const p = options.processorOptions as Record<string, number> | undefined ?? {};

    // Convert dBFS threshold to linear amplitude
    this.threshold = Math.pow(10, (p['threshold'] ?? -42) / 20);
    const attack = p['attack'] ?? 0.004;
    const release = p['release'] ?? 0.12;

    this.attackCoeff = Math.exp(-1 / (sampleRate * attack));
    this.releaseCoeff = Math.exp(-1 / (sampleRate * release));
  }

  static get parameterDescriptors() {
    return [
      {
        name: 'threshold',
        defaultValue: -42,
        minValue: -100,
        maxValue: 0,
        automationRate: 'k-rate',
      },
    ];
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>,
  ): boolean {
    const input = inputs[0];
    const output = outputs[0];
    if (!input?.length) return true;

    // Allow live threshold adjustment via AudioParam
    const thresholdLinear = Math.pow(10, (parameters['threshold'][0]) / 20);

    const channelCount = Math.min(output.length, MAX_CHANNELS);

    for (let ch = 0; ch < channelCount; ch++) {
      const inp = input[ch] ?? new Float32Array(output[ch].length);
      const out = output[ch];
      const rmsBuffer = this.rmsBuffers[ch];
      let rmsSum = this.rmsSums[ch];
      let rmsIdx = this.rmsIndices[ch];
      let gain = this.gains[ch];

      for (let i = 0; i < out.length; i++) {
        const s = inp[i];

        // Rolling RMS
        const old = rmsBuffer[rmsIdx];
        rmsBuffer[rmsIdx] = s * s;
        rmsSum += s * s - old;
        rmsIdx = (rmsIdx + 1) % RMS_SIZE;
        const rms = Math.sqrt(Math.max(0, rmsSum / RMS_SIZE));

        // Gate decision: target is 1 (open) or 0 (closed)
        const target = rms > thresholdLinear ? 1 : 0;
        const coeff = target >= gain ? this.attackCoeff : this.releaseCoeff;
        gain += (1 - coeff) * (target - gain);

        out[i] = s * gain;
      }

      // Write back per-channel state
      this.rmsSums[ch] = rmsSum;
      this.rmsIndices[ch] = rmsIdx;
      this.gains[ch] = gain;
    }

    return true;
  }
}

// @ts-ignore — registerProcessor is a global in AudioWorklet scope
registerProcessor('ng-noise-gate', NoiseGateProcessor);
