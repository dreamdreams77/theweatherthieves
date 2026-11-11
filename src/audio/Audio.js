/** Fully synthesised audio: ambient pads that brighten as weather returns, wind/rain beds, character blips and effects. */
export class AudioManager {
  constructor() { this.ctx = null; this.muted = false; this.restore = 0; this.rain = 0; this.wind = 0.1; this.started = false; }
  start() {
    if (this.started) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); } catch { return; } const c = this.ctx; this.started = true;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.connect(this.master); this.out = comp;
    const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = buf.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    this.noiseBuf = buf;
    const mkNoise = (type, freq, q) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(this.out); s.start(); return { g, f }; };
    this.windN = mkNoise('bandpass', 500, 0.6); this.rainN = mkNoise('highpass', 2500, 0.3); this.rainN2 = mkNoise('bandpass', 5500, 0.8);
    // pad
    this.padG = c.createGain(); this.padG.gain.value = 0.0; this.padG.connect(this.out); this.padOsc = [];
    const minor = [220, 261.63, 329.63, 164.81], major = [261.63, 329.63, 392, 196]; this.padSets = [minor, major];
    for (let i = 0; i < 4; i++) for (const det of [-6, 6]) { const o = c.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = minor[i]; o.detune.value = det; const g = c.createGain(); g.gain.value = 0.045; o.connect(g).connect(this.padG); o.start(); this.padOsc.push({ o, i }); }
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 0.02; lfo.connect(lg).connect(this.padG.gain); lfo.start();
    this.padG.gain.linearRampToValueAtTime(0.5, c.currentTime + 6);
    this.nextChime = c.currentTime + 4;
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05); }
  update(dt, st) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime;
    this.restore = st.restore; this.windN.g.gain.setTargetAtTime(0.025 + st.wind * 0.22, t, 0.15); this.windN.f.frequency.setTargetAtTime(350 + st.wind * 900, t, 0.2);
    this.rainN.g.gain.setTargetAtTime(st.rain * 0.12, t, 0.15); this.rainN2.g.gain.setTargetAtTime(st.rain * 0.05, t, 0.15);
    const set = this.padSets[0], set2 = this.padSets[1]; for (const p of this.padOsc) p.o.frequency.setTargetAtTime(set[p.i] + (set2[p.i] - set[p.i]) * Math.min(1, st.restore * 1.4), t, 2);
    if (t > this.nextChime) { const pent = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; this.tone(pent[(Math.random() * pent.length) | 0] * (st.restore > 0.5 ? 1 : 0.5), 0.9, 0.05, 'sine'); this.nextChime = t + 2.5 + Math.random() * (st.restore > 0.5 ? 4 : 9); }
  }
  tone(f, dur = 0.3, vol = 0.1, type = 'sine', slide = 0, when = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + when; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur = 0.2, vol = 0.1, freq = 1200, type = 'lowpass') { if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); const t = c.currentTime; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
  blip(who) { const base = { juno: 520, fen: 150, sunny: 700, cloud: 330, narrator: 260 }[who] || (200 + ([...String(who)].reduce((a, c) => a + c.charCodeAt(0), 0) % 40) * 12); this.tone(base * (0.9 + Math.random() * 0.35), 0.07, 0.05, who === 'fen' ? 'sawtooth' : 'triangle'); }
  sfx(n) {
    if (!this.ctx) return;
    switch (n) {
      case 'jump': this.tone(300, 0.18, 0.08, 'sine', 2); break; case 'land': this.noise(0.1, 0.12, 400); break;
      case 'grab': this.tone(220, 0.25, 0.08, 'sine', 2.2); this.noise(0.3, 0.05, 2500, 'bandpass'); break;
      case 'squeak': this.tone(900, 0.12, 0.07, 'triangle', 1.6); this.tone(1200, 0.1, 0.05, 'triangle', 0.8, 0.08); break;
      case 'tool': this.tone(660, 0.07, 0.05, 'triangle'); break;
      case 'bloom': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.7, 0.07, 'sine', 1, i * 0.09)); break;
      case 'glint': [1318.5, 1567.98, 2093].forEach((f, i) => this.tone(f, 0.5, 0.05, 'sine', 1, i * 0.07)); break;
      case 'melt': for (let i = 0; i < 5; i++) this.noise(0.12, 0.06, 4000 + i * 800, 'highpass'); this.tone(392, 0.8, 0.06, 'sine', 1.5); break;
      case 'unlock': [392, 493.88, 587.33, 783.99].forEach((f, i) => this.tone(f, 1.2, 0.07, 'triangle', 1, i * 0.12)); this.noise(0.6, 0.1, 300); break;
      case 'plate': this.tone(196, 0.3, 0.1, 'square', 0.7); this.tone(392, 0.4, 0.06, 'sine', 1, 0.05); break;
      case 'fall': this.tone(600, 0.6, 0.07, 'sine', 0.2); break;
      case 'finale': [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 2.6, 0.08, 'triangle', 1, i * 0.18)); break;
      case 'pop': this.noise(0.15, 0.2, 800); this.tone(150, 0.3, 0.2, 'sine', 0.3); break;
      default: break;
    }
  }
}
