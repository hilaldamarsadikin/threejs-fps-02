// HUD Stasiun Senja: health, ammo, uang, ronde, timer, skor, tim hidup,
// status bom, killfeed, banner ronde, dan toko senjata (B / 1-4).
const COPY = {
  start: { title: 'STASIUN SENJA', copy: 'Stasiun kereta tua, malam hari. Plant bom di Peron Barat (A) atau Gudang Timur (B), atau habisi semua Penjaga. Klik untuk main.', action: 'Klik untuk main' },
  paused: { title: 'STASIUN SENJA', copy: 'Jeda. Klik untuk lanjut.', action: 'Klik untuk lanjut' },
  end: { title: 'Pertandingan selesai', copy: 'Skor akhir sudah ditentukan.', action: 'Main lagi' },
};
// Tutorial awal yang detail — tampil di layar awal (index.html, .keys).
export const TUTORIAL = [
  ['W A S D', 'Gerak'], ['Mouse', 'Arah bidik'], ['Klik kiri', 'Tembak'], ['Shift', 'Lari'],
  ['R', 'Reload'], ['E (tahan)', 'Plant bom di site'], ['B lalu 1-4', 'Beli senjata'],
  ['G', 'Lempar granat'], ['Ctrl / C', 'Jongkok'], ['Space', 'Lompat'],
];
export function createHud() {
  const $ = (id) => document.getElementById(id);
  const overlay = $('overlay'), title = $('overlay-title'), copy = $('overlay-copy'), play = $('play');
  const hitmarker = $('hitmarker');
  let hitTimer = 0;
  function setText(id, v) { const el = $(id); if (el && el.textContent !== String(v)) el.textContent = String(v); }
  return {
    setAmmo(m, r) { setText('ammo-mag', m); setText('ammo-reserve', '/ ' + r); $('ammo').classList.toggle('empty', m === 0); },
    setHealth(h) { setText('health-value', Math.max(0, Math.round(h))); $('health').classList.toggle('low', h <= 30); },
    setMoney(m) { setText('money-value', '$' + m); },
    setWeapon(name) { setText('weapon-name', name); },
    setScore(a, d) { setText('score-atk', a); setText('score-def', d); },
    setRound(r) { setText('round-value', 'RONDE ' + r + '/9'); },
    setTimer(s) { setText('timer-value', Math.max(0, Math.ceil(s)) + 's'); },
    setAlive(a, d) { setText('alive-value', a + ' vs ' + d); },
    setGrenades(n) { setText('grenade-value', 'GRANAT ×' + n); $('grenade-value').classList.toggle('empty', n === 0); },
    setDamageDealt(v) { setText('damage-value', v > 0 ? 'DMG ' + Math.round(v) : ''); },
    // Crosshair dinamis: gap membesar saat bergerak / spray, mengecil saat diam / jongkok.
    setCrosshair(gapPx, firing) {
      const c = $('crosshair'); if (!c) return;
      c.style.setProperty('--gap', Math.round(gapPx) + 'px');
      c.classList.toggle('firing', !!firing);
    },
    // Angka damage kecil di dekat crosshair — feedback langsung kena tembak.
    damageNumber(amount, isHead, isKill) {
      const d = $('dmgnum'); if (!d) return;
      d.textContent = (isHead ? 'HEADSHOT ' : '') + amount;
      d.className = 'show' + (isKill ? ' kill' : isHead ? ' head' : '');
      d.style.left = (50 + (Math.random() * 6 - 3)) + '%';
      d.style.top = (46 + (Math.random() * 4 - 2)) + '%';
      clearTimeout(d._t); d._t = setTimeout(() => { d.className = ''; }, 450);
    },
    setSite(t) { setText('site-value', t); },
    setBomb(t) { setText('bomb-value', t); },
    banner(t, sub) { const b = $('banner'); $('banner-title').textContent = t; $('banner-sub').textContent = sub || ''; b.classList.add('show'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), 2600); },
    feed(t) { const f = $('feed'); const d = document.createElement('div'); d.textContent = t; f.prepend(d); while (f.children.length > 5) f.lastChild.remove(); },
    hitMarker(kind = 'hit', holdMs = 90) {
      // kind: 'hit' (kuning), 'head' (oranye), 'kill' (merah, lebih besar).
      hitmarker.classList.add('on');
      hitmarker.dataset.kind = kind;
      hitmarker.style.transform = kind === 'kill' ? 'translate(-50%, -50%) rotate(45deg) scale(1.4)' : kind === 'head' ? 'translate(-50%, -50%) rotate(45deg) scale(1.15)' : '';
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => { hitmarker.classList.remove('on'); hitmarker.style.transform = ''; }, holdMs);
    },
    showOverlay(mode, score) {
      const t = COPY[mode]; title.textContent = t.title;
      copy.textContent = mode === 'end' ? t.copy + ' Skor ' + score + '.' : t.copy;
      play.textContent = t.action; overlay.hidden = false; play.focus();
    },
    hideOverlay() { overlay.hidden = true; },
    onPlay(h) { play.addEventListener('click', h); },
    showBuy(show) { $('buy').hidden = !show; },
  };
}
