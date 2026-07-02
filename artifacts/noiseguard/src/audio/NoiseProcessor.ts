import { Rnnoise, DenoiseState } from '@shiguredo/rnnoise-wasm';
import gateWorkletUrl from './noise-gate.worklet.ts?url';

class Float32RingBuffer {
  buffer: Float32Array;
  readPtr: number = 0;
  writePtr: number = 0;
  available: number = 0;

  constructor(capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  push(data: Float32Array | number[]) {
    for (let i = 0; i < data.length; i++) {
      this.buffer[this.writePtr] = data[i];
      this.writePtr = (this.writePtr + 1) % this.buffer.length;
      if (this.available < this.buffer.length) {
        this.available++;
      } else {
        this.readPtr = (this.readPtr + 1) % this.buffer.length;
      }
    }
  }

  shift(size: number, out: Float32Array) {
    for (let i = 0; i < size; i++) {
      if (this.available > 0) {
        out[i] = this.buffer[this.readPtr];
        this.readPtr = (this.readPtr + 1) % this.buffer.length;
        this.available--;
      } else {
        out[i] = 0;
      }
    }
  }
}

export class NoiseProcessor {
  ctx: AudioContext | null = null;
  stream: MediaStream | null = null;
  source: MediaStreamAudioSourceNode | null = null;
  
  highpass: BiquadFilterNode | null = null;
  gateNode: AudioWorkletNode | null = null;
  compressor: DynamicsCompressorNode | null = null;
  rnnoiseScriptNode: ScriptProcessorNode | null = null;
  outputGain: GainNode | null = null;
  monitorGain: GainNode | null = null;
  processedDestination: MediaStreamAudioDestinationNode | null = null;

  inAnalyser: AnalyserNode | null = null;
  outAnalyser: AnalyserNode | null = null;

  rnnoise: Rnnoise | null = null;
  denoiseState: DenoiseState | null = null;

  inputBuffer = new Float32RingBuffer(16384);
  outputBuffer = new Float32RingBuffer(16384);

  rnnoiseEnabled = true;
  compressorEnabled = true;
  
  constructor() {
    this.outputBuffer.push(new Float32Array(480)); // latency pre-fill
  }

  async init() {
    this.rnnoise = await Rnnoise.load();
    this.denoiseState = this.rnnoise.createDenoiseState();
  }

  async start(deviceId?: string) {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 48000 });
      await this.ctx.audioWorklet.addModule(gateWorkletUrl);
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    });

    this.source = this.ctx.createMediaStreamSource(this.stream);

    this.inAnalyser = this.ctx.createAnalyser();
    this.inAnalyser.fftSize = 2048;

    this.highpass = this.ctx.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 80;

    this.gateNode = new AudioWorkletNode(this.ctx, 'noise-gate-processor');

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // pending AudioWorklet migration
    this.rnnoiseScriptNode = this.ctx.createScriptProcessor(4096, 1, 1);
    this.rnnoiseScriptNode.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      this.inputBuffer.push(input);

      const frame = new Float32Array(480);
      const outFrame = new Float32Array(480);

      while (this.inputBuffer.available >= 480) {
        this.inputBuffer.shift(480, frame);
        
        if (this.rnnoiseEnabled && this.denoiseState) {
          for (let i = 0; i < 480; i++) frame[i] *= 32768.0;
          this.denoiseState.processFrame(frame);
          for (let i = 0; i < 480; i++) outFrame[i] = frame[i] / 32768.0;
        } else {
          outFrame.set(frame);
        }
        
        this.outputBuffer.push(outFrame);
      }

      this.outputBuffer.shift(output.length, output);
    };

    this.outputGain = this.ctx.createGain();
    this.outputGain.gain.value = 1;
    
    this.outAnalyser = this.ctx.createAnalyser();
    this.outAnalyser.fftSize = 2048;

    this.monitorGain = this.ctx.createGain();
    this.monitorGain.gain.value = 0;

    this.source.connect(this.inAnalyser);
    this.inAnalyser.connect(this.highpass);
    this.highpass.connect(this.gateNode);
    
    if (this.compressorEnabled) {
      this.gateNode.connect(this.compressor);
      this.compressor.connect(this.rnnoiseScriptNode);
    } else {
      this.gateNode.connect(this.rnnoiseScriptNode);
    }
    
    this.processedDestination = this.ctx.createMediaStreamDestination();

    this.rnnoiseScriptNode.connect(this.outputGain);
    this.outputGain.connect(this.outAnalyser);
    this.outAnalyser.connect(this.monitorGain);
    this.outAnalyser.connect(this.processedDestination);
    this.monitorGain.connect(this.ctx.destination);
  }

  getRawStream(): MediaStream | null {
    return this.stream;
  }

  getProcessedStream(): MediaStream | null {
    return this.processedDestination?.stream ?? null;
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  setGateThreshold(linearValue: number) {
    if (this.gateNode) {
      const param = this.gateNode.parameters.get('threshold');
      if (param) param.value = linearValue;
    }
  }

  setGateAttack(seconds: number) {
    if (this.gateNode) {
      const param = this.gateNode.parameters.get('attack');
      if (param) param.value = seconds;
    }
  }

  setGateRelease(seconds: number) {
    if (this.gateNode) {
      const param = this.gateNode.parameters.get('release');
      if (param) param.value = seconds;
    }
  }

  setHighpassCutoff(hz: number) {
    if (this.highpass) this.highpass.frequency.value = hz;
  }

  setCompressorEnabled(enabled: boolean) {
    this.compressorEnabled = enabled;
    if (!this.gateNode || !this.compressor || !this.rnnoiseScriptNode) return;
    try { this.gateNode.disconnect(); } catch(e) {}
    try { this.compressor.disconnect(); } catch(e) {}
    
    if (enabled) {
      this.gateNode.connect(this.compressor);
      this.compressor.connect(this.rnnoiseScriptNode);
    } else {
      this.gateNode.connect(this.rnnoiseScriptNode);
    }
  }

  setRnnoiseEnabled(enabled: boolean) {
    this.rnnoiseEnabled = enabled;
  }

  setOutputVolume(volume: number) {
    if (this.outputGain) this.outputGain.gain.value = volume;
  }

  setMonitorEnabled(enabled: boolean) {
    if (this.monitorGain) this.monitorGain.gain.value = enabled ? 1 : 0;
  }
}