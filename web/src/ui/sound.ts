// Sound effects, synthesised with the Web Audio API so there's nothing to download. Short, soft, and
// happy by default; the player can mute them and the choice is remembered.
const KEY = 'mtbrpg:v1:muted';

export type Sfx = 'tap' | 'pick' | 'gain' | 'lose' | 'crash' | 'win' | 'podium' | 'cash' | 'levelup' | 'step' | 'fuel' | 'open' | 'bad' | 'start';

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(KEY) === '1';
    } catch {
      /* storage unavailable */
    }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem(KEY, this.muted ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    if (!this.muted) this.play('tap');
    return this.muted;
  }

  /** Lazily creates the context on the first user gesture (browsers require that). */
  private get audio(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    return this.ctx;
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 1, slideTo?: number) {
    const ctx = this.audio;
    if (!ctx || !this.master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.02);
  }

  private noise(at: number, dur: number, vol = 0.5, lowpass = 1200) {
    const ctx = this.audio;
    if (!ctx || !this.master) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
  }

  play(name: Sfx) {
    if (this.muted) return;
    const ctx = this.audio;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + 0.01;
    switch (name) {
      case 'tap': this.tone(660, t, 0.06, 'triangle', 0.5); break;
      case 'open': this.tone(520, t, 0.08, 'triangle', 0.4); this.tone(780, t + 0.06, 0.1, 'triangle', 0.35); break;
      case 'pick': this.tone(440, t, 0.07, 'square', 0.25); this.tone(660, t + 0.07, 0.09, 'square', 0.25); break;
      case 'step': this.tone(300, t, 0.04, 'triangle', 0.25); break;
      case 'gain': this.tone(523, t, 0.09, 'sine', 0.6); this.tone(784, t + 0.08, 0.14, 'sine', 0.6); break;
      case 'lose': this.tone(392, t, 0.1, 'sine', 0.5); this.tone(294, t + 0.1, 0.18, 'sine', 0.45); break;
      case 'bad': this.tone(220, t, 0.16, 'sawtooth', 0.25, 160); break;
      case 'crash': this.noise(t, 0.35, 0.8, 900); this.tone(120, t, 0.3, 'sawtooth', 0.4, 50); break;
      case 'cash': this.tone(1046, t, 0.07, 'square', 0.25); this.tone(1318, t + 0.07, 0.12, 'square', 0.25); break;
      case 'fuel': this.tone(330, t, 0.12, 'triangle', 0.4, 520); break;
      case 'start': this.tone(440, t, 0.1, 'square', 0.3); this.tone(440, t + 0.18, 0.1, 'square', 0.3); this.tone(880, t + 0.36, 0.3, 'square', 0.35); break;
      case 'podium': [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.12, 0.2, 'triangle', 0.5)); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.11, i === 3 ? 0.5 : 0.16, 'triangle', 0.55)); this.noise(t + 0.3, 0.5, 0.15, 3000); break;
      case 'levelup': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, t + i * 0.09, i === 4 ? 0.6 : 0.14, 'sine', 0.55)); break;
    }
  }
}

export const sfx = new Sound();
