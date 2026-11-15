// Bot 3v3 — ADVANCED AI.
// - Waypoint graph + A* (node terdekat -> target), bukan rute tetap.
// - FSM: patrol -> alert (dengar suara / lihat sekilas) -> engage -> hunt
//   (ke posisi terakhir musuh terlihat) -> patrol.
// - Line-of-sight raycasting: bot TIDAK menembak / melihat tembus tembok.
// - Reaction delay 200-500 ms, aim spread mengecil selama engage
//   (makin lama membidik, makin akurat), damage falloff by range.
// - Flank: bot ke-2 tiap tim kadang ambil jalur berlawanan dari rekan setim.
import * as THREE from 'three';
import { SITES, SPAWNS } from './world.js';
import { createHumanoid } from './humanoid.js';

// Graf waypoint Stasiun Senja: node = [x, z], edge = tetangga yang bisa dilewati.
const NODES = [
  [0, 13], [-4, 13], [4, 13],        // 0-2  lobi selatan (spawn atk)
  [0, 7], [-11, 6], [11, 6],         // 3-5  konkors selatan
  [-19, 8], [19, 8],                 // 6-7  lorong barat / peron timur
  [-19, 0], [19, 0],                 // 8-9  flank tengah
  [0, 0], [-11, 0], [11, 0],         // 10-12 mid
  [-3, -2], [3, -2],                 // 13-14 konkors utara
  [0, -5], [-11, -6], [11, -6],      // 15-17
  [-19, -8], [19, -8],               // 18-19 flank utara
  [-16, -11], [16, -11],             // 20-21 SITE A / SITE B
  [0, -13], [-10, -11], [10, -11],   // 22-24 spawn def / hold site
];
const EDGES = {
  0: [1, 2, 3], 1: [0, 4], 2: [0, 5], 3: [0, 4, 5, 10], 4: [1, 3, 8, 11], 5: [2, 3, 9, 12],
  6: [4, 8], 7: [5, 9], 8: [6, 11, 18], 9: [7, 12, 19], 10: [3, 11, 12, 15],
  11: [4, 8, 10, 13, 16], 12: [5, 9, 10, 14, 17], 13: [11, 15, 16], 14: [12, 15, 17],
  15: [10, 13, 14, 22], 16: [11, 13, 20, 23], 17: [12, 14, 21, 24],
  18: [8, 16, 20], 19: [9, 17, 21], 20: [16, 18, 23], 21: [17, 19, 24],
  22: [15, 23, 24], 23: [16, 20, 22], 24: [17, 21, 22],
};
function nearestNode(x, z) {
  let best = 0, bd = 1e9;
  NODES.forEach(([nx, nz], i) => { const d = (nx - x) ** 2 + (nz - z) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}
function astar(from, to) {
  const open = [{ n: from, g: 0, f: 0, path: [from] }];
  const seen = new Map([[from, 0]]);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.n === to) return cur.path.map((i) => NODES[i]);
    for (const nb of EDGES[cur.n] || []) {
      const g = cur.g + Math.hypot(NODES[nb][0] - NODES[cur.n][0], NODES[nb][1] - NODES[cur.n][1]);
      if (g < (seen.get(nb) ?? 1e9)) { seen.set(nb, g); open.push({ n: nb, g, f: g + Math.hypot(NODES[nb][0] - NODES[to][0], NODES[nb][1] - NODES[to][1]), path: [...cur.path, nb] }); }
    }
  }
  return [NODES[to]];
}

export function createBots(scene, world) {
  const { colliders, shootables } = world;
  const bots = [];
  const R = 0.34;
  const los = new THREE.Raycaster(); los.far = 40;
  function overlaps(x, y, z, h) {
    const p = new THREE.Box3(new THREE.Vector3(x - R, y + 0.02, z - R), new THREE.Vector3(x + R, y + h - 0.02, z + R));
    for (const c of colliders) if (p.intersectsBox(c)) return true;
    return false;
  }
  function hasLOS(from, to) {
    const dir = to.clone().sub(from); const dist = dir.length(); if (dist < 0.1) return true;
    los.set(from, dir.normalize()); los.far = dist;
    return los.intersectObjects(shootables, false).length === 0;
  }
  function makeBot(team, i) {
    // Model humanoid low-poly (lihat humanoid.js): kepala+helm, torso+rompi,
    // lengan bersarung tangan memegang senjata, kaki+sepatu bot.
    // Hitbox tetap: kepala y~1.56, torso y 0.98-1.50, kaki y 0-0.96.
    const humanoid = createHumanoid(team);
    const g = humanoid.group;
    const { head, torsoMesh, vest } = humanoid.parts;
    const torso = torsoMesh;
    scene.add(g);
    const spawn = (team === 'atk' ? SPAWNS.atk : SPAWNS.def)[i % 3];
    const bot = {
      team, idx: i, group: g, torso, head, humanoid, alive: true, health: 100,
      pos: new THREE.Vector3(spawn[0], 0, spawn[1]), yaw: team === 'atk' ? Math.PI : 0,
      route: [], wp: 0, state: 'patrol', target: null, lastSeen: null, lastSeenT: 0,
      react: 0, shootCd: 0, engageT: 0, plantT: 0, defuseT: 0, flankCd: 0, speed: 0,
      dying: false, deathT: 0, flashT: 0,
      name: (team === 'atk' ? ['Raka', 'Dimas', 'Sinta'][i] : ['Bara', 'Nadia', 'Fajar'][i]),
    };
    // Hitbox: kepala = headshot, torso/rompi/kaki = damage biasa.
    for (const m of [torsoMesh, vest]) { m.userData.bot = bot; m.userData.part = 'torso'; }
    head.userData.bot = bot; head.userData.part = 'head';
    // Kaki juga bisa ditembak (damage biasa) — ambil mesh paha/betis dari pivot.
    const legMeshes = [];
    for (const leg of [humanoid.parts.legL, humanoid.parts.legR]) {
      leg.hip.traverse((m) => { if (m.isMesh) { m.userData.bot = bot; m.userData.part = 'torso'; legMeshes.push(m); } });
    }
    bot.legMeshes = legMeshes;
    bots.push(bot);
    return bot;
  }
  makeBot('atk', 0); makeBot('atk', 1);
  makeBot('def', 0); makeBot('def', 1); makeBot('def', 2);

  function routeTo(bot, x, z) {
    bot.route = astar(nearestNode(bot.pos.x, bot.pos.z), nearestNode(x, z));
    bot.wp = 0;
  }
  function reset(round, siteKey) {
    for (const b of bots) {
      b.alive = true; b.health = 100; b.plantT = 0; b.defuseT = 0; b.state = 'patrol';
      b.react = 0; b.shootCd = 0; b.engageT = 0; b.lastSeen = null; b.flankCd = 6 + Math.random() * 6;
      const s = (b.team === 'atk' ? SPAWNS.atk : SPAWNS.def)[b.idx % 3];
      b.pos.set(s[0], 0, s[1]); b.yaw = b.team === 'atk' ? Math.PI : 0;
      b.group.visible = true; b.group.position.copy(b.pos);
      b.group.rotation.set(0, b.yaw, 0); b.dying = false; b.deathT = 0; b.flashT = 0;
      b.humanoid.resetPose();
      const site = SITES[siteKey];
      if (b.team === 'atk') {
        // Flank: bot ke-2 ambil jalur berlawanan (west kalau target A, east kalau B)
        const tx = b.idx === 1 ? (siteKey === 'A' ? 19 : -19) : site.x;
        const tz = b.idx === 1 ? 0 : site.z;
        routeTo(b, tx, tz);
      } else {
        routeTo(b, b.idx === 2 ? SITES.B.x : SITES.A.x, -11);
      }
    }
  }
  function damage(bot, amount) {
    if (!bot.alive) return false;
    bot.health -= amount;
    // Feedback kena tembak: kilatan merah di rompi, hilang dalam 0.15 dtk.
    bot.flashT = 0.15;
    bot.humanoid.parts.vest.material.emissive.setHex(0xe5484d);
    bot.humanoid.parts.vest.material.emissiveIntensity = 0.9;
    if (bot.health <= 0) {
      bot.alive = false;
      // Mati = tersungkur (animasi di step), bukan langsung hilang.
      bot.dying = true; bot.deathT = 0;
      return true;
    }
    return false;
  }
  // Pendengaran: tembakan pemain membuat bot dalam 18 m jadi alert & memburu sumber suara.
  function hear(pos) {
    for (const b of bots) {
      if (!b.alive || b.state === 'engage') continue;
      if (b.pos.distanceTo(pos) < 18) {
        b.state = 'alert'; b.lastSeen = pos.clone(); b.lastSeenT = 0;
        routeTo(b, pos.x, pos.z);
      }
    }
  }
  function step(dt, playerPos, playerAlive, bomb, onBotShoot, onPlantDone, onDefuseDone) {
    for (const b of bots) {
      // Bot mati: lanjutkan animasi tersungkur, lalu sembunyikan setelah 1.2 dtk.
      if (!b.alive) {
        if (b.dying) {
          b.deathT += dt;
          b.humanoid.update(dt, 0, false, false, true);
          if (b.deathT > 1.2) { b.dying = false; b.group.visible = false; }
        }
        continue;
      }
      // Kilatan kena tembak memudar.
      if (b.flashT > 0) {
        b.flashT -= dt;
        if (b.flashT <= 0) { b.humanoid.parts.vest.material.emissive.setHex(0x000000); b.humanoid.parts.vest.material.emissiveIntensity = 0; }
      }
      const prevX = b.pos.x, prevZ = b.pos.z;
      b.flankCd -= dt;
      // --- cari musuh dengan line-of-sight (tidak tembus tembok) ---
      let enemy = null, best = 1e9;
      const foes = [];
      if (b.team === 'def' && playerAlive) foes.push({ pos: playerPos, eye: new THREE.Vector3(playerPos.x, playerPos.y + 1.3, playerPos.z), isPlayer: true });
      for (const o of bots) if (o.team !== b.team && o.alive) foes.push({ pos: o.pos, eye: new THREE.Vector3(o.pos.x, 1.2, o.pos.z), bot: o, isPlayer: false });
      for (const f of foes) {
        const from = new THREE.Vector3(b.pos.x, 1.45, b.pos.z);
        const d = from.distanceTo(f.eye);
        if (d < best && d < 30 && hasLOS(from, f.eye)) { best = d; enemy = f; }
      }
      if (enemy) {
        if (b.state !== 'engage') { b.state = 'engage'; b.react = 0.2 + Math.random() * 0.3; b.engageT = 0; }
        b.lastSeen = enemy.pos.clone(); b.lastSeenT = 0;
      } else if (b.state === 'engage') {
        // musuh hilang dari pandangan -> hunt ke posisi terakhir terlihat
        b.state = 'hunt'; b.lastSeenT = 0;
        if (b.lastSeen) routeTo(b, b.lastSeen.x, b.lastSeen.z);
      }
      if (b.state === 'hunt') {
        b.lastSeenT += dt;
        if (b.lastSeenT > 6) { b.state = 'patrol'; const s = SITES[b.team === 'atk' ? 'A' : 'B']; routeTo(b, s.x, s.z); }
      }
      // --- bom: plant / defuse ---
      if (bomb && bomb.planted && b.team === 'def') {
        const d = Math.hypot(b.pos.x - bomb.site.x, b.pos.z - bomb.site.z);
        if (d < 2.5) { b.defuseT += dt; if (b.defuseT > 5) { onDefuseDone(b); return; } continue; }
      }
      if (bomb && !bomb.planted && b.team === 'atk' && b.idx === 0) {
        const d = Math.hypot(b.pos.x - bomb.site.x, b.pos.z - bomb.site.z);
        if (d < 2.5) { b.plantT += dt; if (b.plantT > 3) { onPlantDone(b); return; } continue; }
      }
      // --- engage: bidik, reaction 200-500ms, aim mengecil, lalu tembak ---
      if (b.state === 'engage' && enemy) {
        const dx = enemy.pos.x - b.pos.x, dz = enemy.pos.z - b.pos.z;
        b.yaw = Math.atan2(-dx, -dz);
        b.engageT += dt; b.react -= dt;
        if (b.react <= 0) {
          b.shootCd -= dt;
          if (b.shootCd <= 0) {
            b.shootCd = 0.5 + Math.random() * 0.35;
            // aim spread mengecil: hit chance naik 0.30 -> 0.62 selama 2 detik membidik
            const aim = Math.min(1, b.engageT / 2);
            onBotShoot(b, enemy, best, 0.30 + 0.32 * aim);
          }
        }
        const s = Math.sin(performance.now() / 700 + b.idx * 2) * 0.6;
        moveBot(b, dt, Math.sin(b.yaw) * s, Math.cos(b.yaw) * s);
      } else if (b.route.length) {
        // flank berkala: saat patrol lama, bot ke-2 pindah jalur
        if (b.flankCd <= 0 && b.state === 'patrol' && b.team === 'atk') {
          b.flankCd = 10 + Math.random() * 8;
          routeTo(b, b.pos.x < 0 ? 19 : -19, 0);
        }
        const [tx, tz] = b.route[b.wp];
        const dx = tx - b.pos.x, dz = tz - b.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.7) { b.wp = Math.min(b.wp + 1, b.route.length - 1); }
        else { moveBot(b, dt, (dx / d) * 3.4, (dz / d) * 3.4); b.yaw = Math.atan2(-dx, -dz); }
      }
      b.group.position.set(b.pos.x, 0, b.pos.z);
      b.group.rotation.y = b.yaw;
      // Animasi humanoid: ayunan jalan dari kecepatan nyata, pose membidik saat engage.
      b.speed = Math.hypot(b.pos.x - prevX, b.pos.z - prevZ) / Math.max(dt, 1e-4);
      b.humanoid.update(dt, b.speed, b.state === 'engage', false, false);
    }
  }
  function moveBot(b, dt, vx, vz) {
    const nx = b.pos.x + vx * dt;
    if (!overlaps(nx, 0, b.pos.z, 1.72)) b.pos.x = nx;
    const nz = b.pos.z + vz * dt;
    if (!overlaps(b.pos.x, 0, nz, 1.72)) b.pos.z = nz;
    b.pos.x = Math.max(-21.5, Math.min(21.5, b.pos.x));
    b.pos.z = Math.max(-15.5, Math.min(15.5, b.pos.z));
  }
  return {
    bots,
    hitMeshes: bots.flatMap((b) => [b.torso, b.head, ...(b.legMeshes || [])]),
    reset, damage, step, hear,
    aliveCount: (team) => bots.filter((b) => b.team === team && b.alive).length,
    aimPoint: (i) => { const b = bots[i % bots.length]; return new THREE.Vector3(b.pos.x, 1.2, b.pos.z); },
  };
}
