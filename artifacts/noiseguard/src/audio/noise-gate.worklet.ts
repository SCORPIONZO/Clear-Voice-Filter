// artifacts/noiseguard/src/audio/noise-gate.worklet.ts
// AudioWorkletProcessor runs in the AudioWorklet global scope, not the main Window
// scope — it has different globals than the DOM lib covers. Suppress type errors here.
// @ts-nocheck
class NoiseGateProcessor extends AudioWorkletProcessor {
  envelope = 0;
  gain = 1;

  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: 0.01 }, // Linear amplitude
      { name: 'attack', defaultValue: 0.005 },   // Seconds
      { name: 'release', defaultValue: 0.150 }   // Seconds
    ];
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input.length) return true;

    const channelData = input[0];
    if (!channelData) return true;
    
    const outChannelData = output[0];

    const threshold = parameters.threshold.length > 1 ? parameters.threshold : parameters.threshold[0];
    const attack = parameters.attack.length > 1 ? parameters.attack : parameters.attack[0];
    const release = parameters.release.length > 1 ? parameters.release : parameters.release[0];

    const sampleRate = 48000; // Worklet global sampleRate is roughly this

    for (let i = 0; i < channelData.length; i++) {
      const sample = channelData[i];
      const absSample = Math.abs(sample);
      
      const thresh = typeof threshold === 'number' ? threshold : threshold[i];
      const att = typeof attack === 'number' ? attack : attack[i];
      const rel = typeof release === 'number' ? release : release[i];

      const attackCoef = Math.exp(-1.0 / (sampleRate * 0.005)); 
      const releaseCoef = Math.exp(-1.0 / (sampleRate * 0.05)); 
      
      if (absSample > this.envelope) {
        this.envelope = attackCoef * this.envelope + (1.0 - attackCoef) * absSample;
      } else {
        this.envelope = releaseCoef * this.envelope + (1.0 - releaseCoef) * absSample;
      }

      const targetGain = this.envelope > thresh ? 1.0 : 0.0;
      
      const gainAttackCoef = Math.exp(-1.0 / (sampleRate * Math.max(0.001, att)));
      const gainReleaseCoef = Math.exp(-1.0 / (sampleRate * Math.max(0.001, rel)));

      if (targetGain > this.gain) {
        this.gain = gainAttackCoef * this.gain + (1.0 - gainAttackCoef) * targetGain;
      } else {
        this.gain = gainReleaseCoef * this.gain + (1.0 - gainReleaseCoef) * targetGain;
      }

      outChannelData[i] = sample * this.gain;
    }

    return true;
  }
}
registerProcessor('noise-gate-processor', NoiseGateProcessor);