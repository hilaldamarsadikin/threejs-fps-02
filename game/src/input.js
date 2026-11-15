// Keyboard + mouse + sentuh (HP). Pointer lock untuk mouse look di desktop.
// HP: joystick kiri (gerak), seret kanan layar (lihat, responsif), tombol
// TEMBAK besar di kanan, LOMPAT / ISI / JONGKOK / GRANAT / TOKO.
// Aim assist ringan HP: main.js menarik arah bidik sedikit ke bot terdekat
// saat menembak (lihat shoot()).
export function createInput(canvas, onLockChange) {
  const keys = new Set();
  const state = {
    keys, locked: false, firing: false, lookX: 0, lookY: 0,
    touch: false, touchMove: { x: 0, y: 0 }, grenadeQueued: false,
    sensitivity: 0.0022, // desktop; sentuh pakai 0.0045 (lebih responsif)
  };
  function setKey(event, down) {
    if (down) keys.add(event.code);
    else keys.delete(event.code);
    if (event.code === 'Space') event.preventDefault();
  }
  window.addEventListener('keydown', (event) => setKey(event, true));
  window.addEventListener('keyup', (event) => setKey(event, false));
  window.addEventListener('blur', () => keys.clear());
  window.addEventListener('mousemove', (event) => {
    if (!state.locked) return;
    state.lookX += event.movementX;
    state.lookY += event.movementY;
  });
  window.addEventListener('mousedown', (event) => {
    if (state.locked && event.button === 0) state.firing = true;
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) state.firing = false;
  });
  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) { keys.clear(); state.firing = false; }
    onLockChange(state.locked);
  });

  // ---- Sentuh: aktif kalau ada sentuhan pertama, tampilkan UI sentuh ----
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) {
    state.touch = true;
    document.body.classList.add('touch');
    const $ = (id) => document.getElementById(id);
    // Joystick kiri
    const joy = $('joy'), knob = $('joy-knob');
    let joyId = null;
    function joyMove(t) {
      const r = joy.getBoundingClientRect();
      let dx = (t.clientX - (r.left + r.width / 2)) / (r.width / 2);
      let dy = (t.clientY - (r.top + r.height / 2)) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      state.touchMove.x = dx; state.touchMove.y = dy;
      knob.style.transform = `translate(calc(-50% + ${dx * 34}px), calc(-50% + ${dy * 34}px))`;
    }
    joy.addEventListener('touchstart', (e) => { e.preventDefault(); joyId = e.changedTouches[0].identifier; joyMove(e.changedTouches[0]); }, { passive: false });
    joy.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joyId) joyMove(t); }, { passive: false });
    const joyEnd = (e) => { for (const t of e.changedTouches) if (t.identifier === joyId) { joyId = null; state.touchMove.x = 0; state.touchMove.y = 0; knob.style.transform = 'translate(-50%, -50%)'; } };
    joy.addEventListener('touchend', joyEnd); joy.addEventListener('touchcancel', joyEnd);
    // Seret kanan layar untuk melihat (area di luar tombol)
    let lookId = null, lastX = 0, lastY = 0;
    const lookArea = $('look-area');
    lookArea.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; lookId = t.identifier; lastX = t.clientX; lastY = t.clientY; }, { passive: false });
    lookArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        state.lookX += (t.clientX - lastX) * 2.2;
        state.lookY += (t.clientY - lastY) * 2.2;
        lastX = t.clientX; lastY = t.clientY;
      }
    }, { passive: false });
    const lookEnd = (e) => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; };
    lookArea.addEventListener('touchend', lookEnd); lookArea.addEventListener('touchcancel', lookEnd);
    // Tombol aksi
    function hold(id, on, off) {
      const el = $(id); if (!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); on(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); if (off) off(); }, { passive: false });
      el.addEventListener('touchcancel', () => { if (off) off(); });
    }
    hold('btn-fire', () => { state.firing = true; }, () => { state.firing = false; });
    hold('btn-jump', () => keys.add('Space'), () => keys.delete('Space'));
    hold('btn-reload', () => keys.add('KeyR'), () => keys.delete('KeyR'));
    hold('btn-crouch', () => keys.add('ControlLeft'), () => keys.delete('ControlLeft'));
    hold('btn-grenade', () => { state.grenadeQueued = true; });
    hold('btn-shop', () => keys.add('KeyB'), () => keys.delete('KeyB'));
  }
  return {
    state,
    requestLock() { canvas.requestPointerLock(); },
    takeLook() {
      const x = state.lookX, y = state.lookY;
      state.lookX = 0; state.lookY = 0;
      return { x, y };
    },
    consumeGrenade() { const q = state.grenadeQueued; state.grenadeQueued = false; return q; },
  };
}
