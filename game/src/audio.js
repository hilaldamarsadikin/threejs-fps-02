// Suara sintetis WebAudio — tanpa file eksternal, tanpa network.
// Tembakan, hit, reload, bunyi plant/defuse, ledakan, dan bel ronde.
export function createAudio() {
  let ctx = null;
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, slideTo) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
  function noise(dur, vol, low) {
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low || 1800;
    const g = c.createGain(); g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  return {
    unlock() { ac(); },
    shoot(kind) { noise(0.09, kind === 'DMR' ? 0.35 : 0.2, kind === 'DMR' ? 900 : 2200); tone(kind === 'DMR' ? 90 : 160, 0.07, 'square', 0.08, 60); },
    enemyShoot() { noise(0.07, 0.08, 1200); },
    hit() { tone(1200, 0.05, 'sine', 0.14); },
    kill() { tone(880, 0.08, 'sine', 0.16); tone(1320, 0.12, 'sine', 0.12); },
    hurt() { tone(220, 0.12, 'sawtooth', 0.12, 110); },
    reload() { tone(500, 0.06, 'square', 0.08); setTimeout(() => tone(700, 0.06, 'square', 0.08), 120); },
    beep() { tone(1000, 0.09, 'sine', 0.15); },
    plant() { tone(660, 0.15, 'sine', 0.15); },
    explosion() { noise(0.9, 0.5, 400); tone(60, 0.8, 'sine', 0.3, 30); },
    grenadeThrow() { tone(700, 0.08, 'sine', 0.1, 300); noise(0.15, 0.08, 3000); },
    round() { tone(523, 0.12, 'sine', 0.14); setTimeout(() => tone(784, 0.18, 'sine', 0.14), 140); },
    buy() { tone(980, 0.07, 'sine', 0.12); },
  };
}
