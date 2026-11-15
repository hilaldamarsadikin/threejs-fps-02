// STASIUN SENJA — boot + loop. 3v3 plant/defuse, ronde, ekonomi, toko 4 senjata.
// ?shot=start|play|end&seed=N — deterministic frame for screenshots, sets __shotReady.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld, SITES, SPAWNS } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon, WEAPONS, falloff } from './weapons.js';
import { createBots } from './bots.js';
import { createGame } from './game.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createGrenades } from './grenades.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.canvas), 22, 55);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);

const world = createWorld(scene);
const game = createGame();
const bots = createBots(scene, world);
const weapon = createWeapon(camera);
const hud = createHud();
const audio = createAudio();
const player = createPlayer(world.colliders);
const input = createInput(renderer.domElement, onLockChange);
const raycaster = new THREE.Raycaster(); raycaster.far = 90;
const direction = new THREE.Vector3();
const body = player.state;

// Bomb visual
const bombMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0xf5a623, emissive: 0xf5a623, emissiveIntensity: 0.9 }));
bombMesh.visible = false; scene.add(bombMesh);
const bombLight = new THREE.PointLight(0xf5a623, 0, 6); scene.add(bombLight);

let health = 100, alive = true, plantT = 0, buyOpen = false;
let elapsed = 0, frozen = false, started = false, accumulator = 0, lastTime = performance.now();
let tracers = [];
let damageDealt = 0;
const grenades = createGrenades();
const grenadeMeshes = new Map(); // granat logika -> mesh 3D
const explosions = []; // {mesh, smoke, t}
const G = game.state;

function syncHud() {
  hud.setAmmo(weapon.state.mag, weapon.state.reserve);
  hud.setHealth(health); hud.setMoney(G.money); hud.setWeapon(weapon.current().name);
  hud.setScore(G.scoreAtk, G.scoreDef); hud.setRound(G.round);
  hud.setTimer(G.phase === 'buy' ? G.timer : G.bomb.planted ? G.bomb.timer : G.timer);
  hud.setAlive((alive ? 1 : 0) + bots.aliveCount('atk'), bots.aliveCount('def'));
  hud.setBomb(G.bomb.planted ? 'BOM AKTIF ' + Math.ceil(G.bomb.timer) + 's' : 'BOM BELUM DITANAM');
  hud.setGrenades(grenades.count);
  hud.setDamageDealt(damageDealt);
  hud.setSite('TARGET: ' + G.siteKey + ' — ' + (G.siteKey === 'A' ? 'PERON BARAT' : 'GUDANG TIMUR'));
}
function spawnAll() {
  const s = SPAWNS.atk[1]; body.position.set(s[0], 0, s[1]); body.yaw = 0; body.pitch = 0; body.velocity.set(0, 0, 0);
  health = 100; alive = true; plantT = 0; damageDealt = 0;
  grenades.reset(1); // 1 granat per ronde
  for (const m of grenadeMeshes.values()) scene.remove(m);
  grenadeMeshes.clear();
  bots.reset(G.round, G.siteKey);
  weapon.refill();
}
function startMatch() { game.startRound(); spawnAll(); hud.banner('RONDE 1 — STASIUN SENJA', 'Plant di ' + G.siteKey); audio.round(); syncHud(); }
function endRoundUI(winner, reason) {
  const r = game.endRound(winner, reason);
  audio.round();
  hud.banner(winner === 'atk' ? 'SENJA MENANG' : 'PENJAGA MENANG', reason + ' — ' + G.scoreAtk + ' : ' + G.scoreDef);
  hud.feed((winner === 'atk' ? 'SENJA' : 'PENJAGA') + ' menang ronde ' + G.round + ' (' + reason + ')');
  if (G.matchOver) {
    hud.showOverlay('end', G.scoreAtk + ' : ' + G.scoreDef);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  syncHud();
}
function checkRoundEnd() {
  if (G.phase !== 'live' || G.matchOver) return;
  if (bots.aliveCount('def') === 0 && !G.bomb.planted) endRoundUI('atk', 'semua Penjaga gugur');
  else if (!alive && bots.aliveCount('atk') === 0) endRoundUI('def', 'semua Senja gugur');
}
function addTracer(from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9 }));
  scene.add(line); tracers.push({ line, t: 0.07 });
}
function shoot(spread) {
  if (!weapon.takeRound()) { audio.reload(); return false; }
  const w = weapon.current();
  camera.getWorldDirection(direction);
  // Aim assist ringan (HP saja): tarik arah bidik ke bot terdekat dalam
  // kerucut ~8°, supaya di layar sentuh tetap bisa kena.
  if (input.state.touch) {
    let bestBot = null, bestAng = 0.14;
    for (const b of bots.bots) {
      if (!b.alive) continue;
      const to = new THREE.Vector3(b.pos.x, 1.2, b.pos.z).sub(camera.position);
      const d = to.length(); if (d > 30) continue;
      const ang = direction.angleTo(to.normalize());
      if (ang < bestAng) { bestAng = ang; bestBot = to; }
    }
    if (bestBot) direction.lerp(bestBot, 0.6).normalize();
  }
  direction.x += (random() * 2 - 1) * spread; direction.y += (random() * 2 - 1) * spread; direction.z += (random() * 2 - 1) * spread;
  direction.normalize();
  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);
  const targets = world.shootables.concat(bots.hitMeshes);
  const hit = raycaster.intersectObjects(targets, false)[0];
  const end = hit ? hit.point : camera.position.clone().add(direction.clone().multiplyScalar(60));
  addTracer(camera.position.clone().add(direction.clone().multiplyScalar(0.6)), end);
  audio.shoot(w.short);
  bots.hear(new THREE.Vector3(body.position.x, body.position.y, body.position.z));
  if (hit && hit.object.userData.bot) {
    const bot = hit.object.userData.bot;
    const isHead = hit.object.userData.part === 'head';
    const dist = hit.distance;
    const mult = falloff(w, dist);
    const dmg = Math.round((isHead ? w.head : w.damage) * mult);
    const killed = bots.damage(bot, dmg);
    damageDealt += dmg;
    audio.hit(); if (killed) { audio.kill(); game.addKill(); hud.feed('Kamu menghabisi ' + bot.name + (isHead ? ' (headshot)' : '') + ' — ' + Math.round(dist) + 'm'); }
    hud.hitMarker(killed ? 'kill' : isHead ? 'head' : 'hit', shot ? 4000 : 120);
    hud.damageNumber(dmg, isHead, killed);
    checkRoundEnd();
  }
  weapon.pullTrigger();
  const [rp, ry] = weapon.recoilPattern();
  player.recoil(rp, ry);
  syncHud();
  return true;
}
// ---- Granat: G (desktop) / tombol GRANAT (HP) ----
function throwGrenade() {
  if (!alive || G.phase !== 'live' || grenades.count <= 0) return;
  camera.getWorldDirection(direction);
  const g = grenades.throwFrom(camera.position.clone(), direction.clone());
  if (!g) return;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a4a22, roughness: 0.6, metalness: 0.3 }),
  );
  mesh.position.set(g.pos.x, g.pos.y, g.pos.z); mesh.castShadow = true;
  scene.add(mesh); grenadeMeshes.set(g, mesh);
  audio.grenadeThrow(); hud.feed('Kamu melempar granat!'); syncHud();
}
function explodeGrenade(g) {
  const mesh = grenadeMeshes.get(g);
  if (mesh) { scene.remove(mesh); grenadeMeshes.delete(g); }
  // Efek ledakan: bola api oranye membesar + asap abu-abu, memudar 0.7 dtk.
  const fire = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.95 }));
  fire.position.set(g.pos.x, Math.max(0.6, g.pos.y), g.pos.z); scene.add(fire);
  const smoke = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshBasicMaterial({ color: 0x8a8f96, transparent: true, opacity: 0.55 }));
  smoke.position.copy(fire.position); scene.add(smoke);
  explosions.push({ fire, smoke, t: 0.7 });
  const light = new THREE.PointLight(0xff7a1a, 30, 12); light.position.copy(fire.position); scene.add(light);
  explosions[explosions.length - 1].light = light;
  audio.explosion();
  // Damage area ke bot (dan ke player kalau terlalu dekat — 20 max).
  for (const b of bots.bots) {
    if (!b.alive) continue;
    const d = Math.hypot(b.pos.x - g.pos.x, b.pos.z - g.pos.z);
    const dmg = grenades.damageAt(d);
    if (dmg > 0) {
      const killed = bots.damage(b, dmg);
      damageDealt += dmg;
      hud.feed('Granat mengenai ' + b.name + ' −' + dmg + (killed ? ' (gugur)' : ''));
      if (killed) game.addKill();
    }
  }
  const pd = Math.hypot(body.position.x - g.pos.x, body.position.z - g.pos.z);
  if (pd < 3 && alive) { health -= Math.round(grenades.damageAt(pd) * 0.25); syncHud(); if (health <= 0) { alive = false; game.onDeath(); hud.feed('Kamu gugur oleh granat sendiri'); checkRoundEnd(); } }
  checkRoundEnd(); syncHud();
}
function botShoot(bot, enemy, dist, hitChance) {
  // Line of sight vs world only
  const from = new THREE.Vector3(bot.pos.x, 1.45, bot.pos.z);
  const to = enemy.isPlayer ? new THREE.Vector3(body.position.x, body.position.y + 1.3, body.position.z) : new THREE.Vector3(enemy.pos.x, 1.2, enemy.pos.z);
  const dir = to.clone().sub(from).normalize();
  raycaster.set(from, dir); raycaster.far = dist + 1;
  const blocked = raycaster.intersectObjects(world.shootables, false)[0];
  if (blocked) return;
  addTracer(from, to);
  audio.enemyShoot();
  // hitChance sudah termasuk aim yang mengecil selama engage; damage falloff by range
  if (random() > hitChance) return;
  const dmg = (14 + random() * 16) * (dist < 10 ? 1 : dist < 20 ? 0.8 : 0.6);
  if (enemy.isPlayer) {
    health -= dmg; audio.hurt(); syncHud();
    if (health <= 0) { alive = false; game.onDeath(); hud.feed('Kamu gugur oleh ' + bot.name); checkRoundEnd(); }
  } else if (enemy.bot) {
    const killed = bots.damage(enemy.bot, dmg);
    if (killed) hud.feed(bot.name + ' menghabisi ' + enemy.bot.name);
    checkRoundEnd();
  }
}
function onPlantDone(bot) {
  game.plant(G.siteKey);
  bombMesh.position.set(G.bomb.site.x, 0.15, G.bomb.site.z); bombMesh.visible = true; bombLight.position.copy(bombMesh.position);
  G.phase = 'live';
  audio.plant(); hud.banner('BOM DITANAM DI SITE ' + G.siteKey, 'Bertahan 35 detik!'); hud.feed((bot.name || 'Kamu') + ' menanam bom di Site ' + G.siteKey);
  syncHud();
}
function onDefuseDone(bot) {
  G.bomb.planted = false; bombMesh.visible = false;
  endRoundUI('def', 'bom dijinakkan ' + bot.name);
}
function step(dt) {
  elapsed += dt;
  if (G.phase === 'buy') {
    G.timer -= dt;
    if (G.timer <= 0) { G.phase = 'live'; G.timer = 100; hud.showBuy(false); buyOpen = false; hud.banner('RONDE ' + G.round + ' DIMULAI', 'Target: Site ' + G.siteKey); }
  } else if (G.phase === 'live') {
    G.timer -= dt;
    if (G.bomb.planted) {
      G.bomb.timer -= dt; bombLight.intensity = 6 + Math.sin(elapsed * 10) * 4;
      if (Math.floor(G.bomb.timer) !== Math.floor(G.bomb.timer + dt)) audio.beep();
      if (G.bomb.timer <= 0) { bombMesh.visible = false; audio.explosion(); endRoundUI('atk', 'bom meledak'); return; }
    } else if (G.timer <= 0) { endRoundUI('def', 'waktu habis, bom tidak ditanam'); return; }
    bots.step(dt, new THREE.Vector3(body.position.x, body.position.y, body.position.z), alive, G.bomb, botShoot, onPlantDone, onDefuseDone);
    // Player plant (hold E near a site)
    const near = Object.values(SITES).find((s) => Math.hypot(body.position.x - s.x, body.position.z - s.z) < 2.5);
    if (near && alive && input.state.keys.has('KeyE') && !G.bomb.planted) {
      plantT += dt;
      hud.setBomb('MENANAM... ' + Math.ceil(3 - plantT) + 's — tahan E');
      if (plantT >= 3) { plantT = 0; game.plant(near === SITES.A ? 'A' : 'B'); onPlantDone({ name: 'Kamu' }); }
    } else plantT = 0;
  } else if (G.phase === 'over') {
    G.timer -= dt;
    if (G.timer <= 0) {
      if (G.matchOver) return;
      game.nextRound(); spawnAll(); hud.banner('RONDE ' + G.round, 'Target: Site ' + G.siteKey + ' — B untuk beli senjata'); syncHud();
    }
  }
  if (alive) player.step(dt, input.state.keys, input.state.touchMove);
  weapon.step(dt);
  // Granat: fisika + ledakan + efek memudar.
  for (const g of grenades.step(dt)) explodeGrenade(g);
  for (const [g, m] of grenadeMeshes) m.position.set(g.pos.x, g.pos.y, g.pos.z);
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i]; e.t -= dt;
    const k = Math.max(0, e.t / 0.7);
    e.fire.scale.setScalar(1 + (1 - k) * 5); e.fire.material.opacity = 0.95 * k;
    e.smoke.scale.setScalar(1 + (1 - k) * 2.5); e.smoke.material.opacity = 0.55 * k;
    if (e.light) e.light.intensity = 30 * k;
    if (e.t <= 0) { scene.remove(e.fire, e.smoke); if (e.light) scene.remove(e.light); explosions.splice(i, 1); }
  }
  for (const t of tracers) t.t -= dt;
  tracers = tracers.filter((t) => { if (t.t <= 0) { scene.remove(t.line); return false; } t.line.material.opacity = t.t / 0.07; return true; });
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1); lastTime = now;
  if (!frozen) {
    const look = input.takeLook(); player.look(look.x, look.y);
    if (alive && G.phase === 'live' && input.state.firing && weapon.ready()) shoot(weapon.spread(player.groundSpeed()));
    // Granat: G sekali tekan (desktop) atau tombol GRANAT (HP).
    if (alive && G.phase === 'live' && (input.consumeGrenade() || (input.state.keys.has('KeyG') && !frame._gDown))) throwGrenade();
    frame._gDown = input.state.keys.has('KeyG');
    // Crosshair dinamis: membesar saat bergerak / spray, mengecil saat diam / jongkok.
    const spreadNow = weapon.spread(player.groundSpeed());
    hud.setCrosshair(5 + spreadNow * 700 + (body.crouching ? -2 : 0) + (input.state.firing ? 4 : 0), input.state.firing);
    if (input.state.keys.has('KeyR')) weapon.reload();
    if (input.state.keys.has('KeyB') && G.phase === 'buy' && !buyOpen) { buyOpen = true; hud.showBuy(true); }
    if (buyOpen) {
      for (let i = 0; i < 4; i++) {
        if (input.state.keys.has('Digit' + (i + 1))) {
          const before = G.money; G.money = weapon.buy(i, G.money);
          if (G.money !== before) { audio.buy(); hud.feed('Beli ' + WEAPONS[i].name + ' — $' + WEAPONS[i].price); }
          buyOpen = false; hud.showBuy(false); syncHud();
        }
      }
      if (input.state.keys.has('Escape')) { buyOpen = false; hud.showBuy(false); }
    }
    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) { step(FIXED_STEP); accumulator -= FIXED_STEP; steps += 1; }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }
  renderer.render(scene, camera);
}
function syncCamera() {
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
}
function aimAt(p) {
  const dx = p.x - body.position.x, dy = p.y - (body.position.y + body.eye), dz = p.z - body.position.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  body.yaw = Math.atan2(-dx, -dz); body.pitch = Math.asin(Math.max(-1, Math.min(1, dy / len))); syncCamera();
}
function settle(n) { for (let i = 0; i < n; i++) step(FIXED_STEP); }
function runShot(name) {
  hud.hideOverlay(); startMatch();
  if (name === 'play') {
    G.phase = 'live'; G.timer = 95;
    body.position.set(-2, 0, 8); body.yaw = 0.15; settle(30);
    aimAt(bots.aimPoint(2)); shoot(0); settle(10);
    aimAt(bots.aimPoint(3)); shoot(0); settle(5);
  } else if (name === 'end') {
    G.phase = 'live'; game.plant('A'); onPlantDone({ name: 'Raka' });
    body.position.set(-8, 0, -2); settle(20); aimAt(new THREE.Vector3(-16, 1.2, -11));
    hud.banner('BOM DITANAM DI SITE A', 'SENJA 2 : 1 PENJAGA');
  } else {
    body.position.set(0, 0, 12); settle(20); aimAt(new THREE.Vector3(0, 2.5, -8));
    hud.showOverlay('start', 0);
  }
  syncHud(); paintTwiceThenReady();
}
function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint); syncCamera(); renderer.render(scene, camera); painted += 1;
    if (painted === 2) { window.__shotReady = true; frozen = true; }
  }
  requestAnimationFrame(paint);
}
hud.onPlay(() => {
  if (shot) return;
  audio.unlock();
  if (G.matchOver) { location.reload(); return; }
  input.requestLock();
});
function onLockChange(locked) {
  if (shot) return;
  if (locked) { started = true; hud.hideOverlay(); }
  else if (!G.matchOver) hud.showOverlay(started ? 'paused' : 'start', G.scoreAtk + ' : ' + G.scoreDef);
}
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
syncCamera(); syncHud();
if (shot) runShot(shot); else { startMatch(); requestAnimationFrame(frame); }
