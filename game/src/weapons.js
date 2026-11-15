// 4 senjata, toko antar ronde. Harga dalam $ ekonomi game.
// 1 Kestrel P9 (pistol, gratis) — 2 Rimba SMG $900 — 3 Garuda AR $2.100 — 4 Elang DMR $3.200
import * as THREE from 'three';
import { PALETTE } from './palette.js';
export const WEAPONS = [
  { name: 'Kestrel P9', short: 'P9', price: 0, damage: 34, head: 100, mag: 12, reserve: 48, gap: 0.16, reload: 1.4, spreadStill: 0.003, spreadMove: 0.02, auto: false, range: 60, pattern: [[0.011, 0], [0.012, 0.002], [0.011, -0.002], [0.013, 0.001]] },
  { name: 'Rimba SMG', short: 'SMG', price: 900, damage: 26, head: 78, mag: 28, reserve: 112, gap: 0.075, reload: 1.7, spreadStill: 0.006, spreadMove: 0.032, auto: true, range: 55, pattern: [[0.009, 0], [0.01, 0.004], [0.01, -0.005], [0.011, 0.003], [0.012, -0.004], [0.011, 0.002]] },
  { name: 'Garuda AR', short: 'AR', price: 2100, damage: 38, head: 114, mag: 30, reserve: 90, gap: 0.096, reload: 1.9, spreadStill: 0.0022, spreadMove: 0.028, auto: true, range: 80, pattern: [[0.01, 0], [0.011, 0.001], [0.012, -0.002], [0.012, 0.003], [0.013, -0.003], [0.014, 0.001], [0.013, -0.001]] },
  { name: 'Elang DMR', short: 'DMR', price: 3200, damage: 88, head: 200, mag: 8, reserve: 32, gap: 0.85, reload: 2.4, spreadStill: 0.0008, spreadMove: 0.02, auto: false, range: 90, pattern: [[0.02, 0]] },
];
// Damage falloff by range (m): [jarak, pengali]. DMR jatuh paling lambat.
export function falloff(w, dist) {
  if (w.short === 'DMR') return dist < 25 ? 1 : dist < 50 ? 0.85 : 0.7;
  if (dist < 10) return 1; if (dist < 20) return 0.78; return 0.55;
}
export function createWeapon(camera) {
  const grip = new THREE.MeshStandardMaterial({ color: PALETTE.hairline, roughness: 0.7, metalness: 0.2 });
  const bodyM = new THREE.MeshStandardMaterial({ color: PALETTE.ink, roughness: 0.5, metalness: 0.35 });
  const model = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), bodyM);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.4), grip);
  barrel.position.set(0, 0.025, -0.38);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.22), grip);
  stock.position.set(0, -0.02, 0.3);
  model.add(receiver, barrel, stock);
  // Tangan player (viewmodel): sarung tangan + lengan bawah, memegang senjata.
  // Tangan kanan di gagang, tangan kiri menopang laras — ikut bergerak saat
  // recoil / reload karena jadi anak dari model senjata.
  const gloveM = new THREE.MeshStandardMaterial({ color: 0x22262e, roughness: 0.9 });
  const sleeveM = new THREE.MeshStandardMaterial({ color: 0xc98a1e, roughness: 0.8 });
  function viewArm(x, y, z, rx, rz) {
    const arm = new THREE.Group();
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.032, 0.26, 8), sleeveM);
    fore.position.set(0, -0.1, 0.08); fore.rotation.x = 0.9;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.09), gloveM);
    hand.position.set(0, 0.02, -0.06);
    arm.add(fore, hand);
    arm.position.set(x, y, z); arm.rotation.set(rx, 0, rz);
    return arm;
  }
  model.add(viewArm(0.07, -0.10, 0.22, 0.5, -0.25));   // tangan kanan di gagang
  model.add(viewArm(-0.06, -0.08, -0.12, 0.9, 0.35));  // tangan kiri menopang laras
  model.position.set(0.24, -0.2, -0.42);
  camera.add(model);
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  flash.position.set(0.24, -0.18, -0.95); flash.visible = false; camera.add(flash);
  const flashLight = new THREE.PointLight(0xf5a623, 0, 5); flashLight.position.set(0.24, -0.16, -0.6); camera.add(flashLight);
  let idx = 0, burst = 0, burstT = 0;
  const state = { mag: 12, reserve: 48, cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, idx: 0 };
  function apply() { const w = WEAPONS[idx]; state.mag = w.mag; state.reserve = w.reserve; state.idx = idx; burst = 0; }
  function step(dt) {
    const w = WEAPONS[idx];
    burstT += dt; if (burstT > 0.8) burst = 0; // pola recoil reset kalau berhenti menembak
    state.cooldown = Math.max(0, state.cooldown - dt); state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    model.position.z = -0.42 + state.kick; model.rotation.x = state.kick * 2.2;
    model.scale.setScalar(idx === 3 ? 1.25 : idx === 0 ? 0.8 : 1);
    flash.visible = state.flash > 0; flash.rotation.z = state.flash * 30; flashLight.intensity = state.flash > 0 ? 18 : 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.55 * Math.min(1, (w.reload - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) { const need = w.mag - state.mag; const take = Math.min(need, state.reserve); state.mag += take; state.reserve -= take; }
    }
  }
  return {
    state, step,
    current: () => WEAPONS[idx],
    buy(i, money) { if (i < 0 || i > 3) return money; const w = WEAPONS[i]; if (money < w.price) return money; idx = i; apply(); return money - w.price; },
    ready() { return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0; },
    pullTrigger() { state.cooldown = WEAPONS[idx].gap; state.flash = 0.06; state.kick = 0.055; burst += 1; burstT = 0; },
    // Pola recoil yang bisa dipelajari: urutan pitch/yaw tetap per senjata,
    // pemain bisa mengimbanginya dengan menarik mouse ke bawah.
    recoilPattern() { const p = WEAPONS[idx].pattern; return p[Math.min(burst - 1, p.length - 1)] || p[p.length - 1]; },
    takeRound() { if (state.mag <= 0) return false; state.mag -= 1; return true; },
    reload() { const w = WEAPONS[idx]; if (state.reloadLeft > 0 || state.mag === w.mag || state.reserve === 0) return; state.reloadLeft = w.reload; },
    spread(speed) { const w = WEAPONS[idx]; return w.spreadStill + Math.min(1, speed / 5.2) * w.spreadMove; },
    refill() { apply(); state.cooldown = 0; state.reloadLeft = 0; state.flash = 0; state.kick = 0; },
  };
}
