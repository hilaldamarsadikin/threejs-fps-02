// Humanoid low-poly prosedural — ganti model kotak lama.
// Proporsi manusia ~1.72 m: kepala+helm, torso+rompi, bahu, lengan
// (atas/bawah + sarung tangan), kaki (paha/betis + sepatu bot), senjata
// dipegang dua tangan. Semua geometri three.js, tanpa file eksternal.
// Hitbox TIDAK berubah: kepala r~0.16 di y~1.53, torso y 0.6-1.4,
// kaki y 0-0.6 — sama seperti model lama, jadi aim/bot AI aman.
import * as THREE from 'three';

const SKIN = 0xd9a986;
const SKIN_DARK = 0xb98a68;
const GLOVE = 0x22262e;
const BOOT = 0x1c1a17;

function mat(color, rough = 0.75, metal = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; return mesh;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z); mesh.castShadow = true; return mesh;
}
// Pivot di ujung atas anggota gerak, mesh digantung ke bawah (-y) supaya
// rotasi pivot = ayunan bahu / pinggul yang natural.
function limbPivot(x, y, z) {
  const p = new THREE.Group(); p.position.set(x, y, z); return p;
}

export function createHumanoid(team) {
  const isAtk = team === 'atk';
  const uniform = isAtk ? 0xc98a1e : 0x2a8f8c;      // Senja amber / Penjaga teal
  const uniformDark = isAtk ? 0x8a5a10 : 0x1d5f5d;
  const pants = isAtk ? 0x3a332a : 0x232c33;
  const vestC = isAtk ? 0x4a3a22 : 0x1e3a3a;
  const helmetC = isAtk ? 0x6b4a12 : 0x14504e;
  const uniformM = mat(uniform, 0.8);
  const darkM = mat(uniformDark, 0.8);
  const pantsM = mat(pants, 0.85);
  const vestM = mat(vestC, 0.85);
  const skinM = mat(SKIN, 0.55);
  const gloveM = mat(GLOVE, 0.9);
  const bootM = mat(BOOT, 0.85);
  const helmetM = mat(helmetC, 0.6, 0.25);
  const metalM = mat(0x2b2f36, 0.45, 0.5);

  const g = new THREE.Group();

  // ---- Kaki: pinggul y=0.96, paha 0.42, betis 0.40, sepatu ----
  function leg(side) { // side -1 kiri, +1 kanan
    const hip = limbPivot(0.11 * side, 0.96, 0);
    const thigh = cyl(0.075, 0.065, 0.42, pantsM, 0, -0.21, 0);
    const knee = limbPivot(0, -0.42, 0);
    const shin = cyl(0.06, 0.055, 0.40, pantsM, 0, -0.20, 0);
    const boot = box(0.11, 0.09, 0.24, bootM, 0, -0.42, 0.04);
    const toeCap = box(0.11, 0.05, 0.06, bootM, 0, -0.44, 0.15);
    knee.add(shin, boot, toeCap);
    hip.add(thigh, knee);
    return { hip, knee };
  }
  const legL = leg(-1), legR = leg(1);

  // ---- Torso: pinggang 0.96 -> bahu 1.50, dada sedikit lebih lebar ----
  const torso = new THREE.Group(); torso.position.y = 0.96;
  const chest = box(0.46, 0.52, 0.28, uniformM, 0, 0.28, 0);
  const chestTaper = box(0.40, 0.14, 0.26, uniformM, 0, 0.02, 0); // pinggang
  const vest = box(0.48, 0.38, 0.32, vestM, 0, 0.30, 0);          // rompi
  const vestFront = box(0.30, 0.26, 0.03, darkM, 0, 0.32, 0.17);  // kantong rompi
  const belt = box(0.44, 0.07, 0.30, bootM, 0, 0.03, 0);
  const beltBuckle = box(0.08, 0.05, 0.02, metalM, 0, 0.03, 0.16);
  const collar = box(0.30, 0.07, 0.24, darkM, 0, 0.55, 0);
  const patch = box(0.09, 0.06, 0.01, mat(isAtk ? 0xf5a623 : 0x37c8c3, 0.6), -0.14, 0.44, 0.17);
  torso.add(chest, chestTaper, vest, vestFront, belt, beltBuckle, collar, patch);
  // Bahu / shoulder pad
  const shoulderL = box(0.14, 0.10, 0.20, vestM, -0.28, 0.52, 0);
  const shoulderR = box(0.14, 0.10, 0.20, vestM, 0.28, 0.52, 0);
  torso.add(shoulderL, shoulderR);

  // ---- Kepala: leher, wajah, helm + visor ----
  const neck = cyl(0.055, 0.06, 0.08, skinM, 0, 0.58, 0);
  torso.add(neck);
  const headG = new THREE.Group(); headG.position.y = 0.68; // y dunia ~1.64? dikoreksi di bawah
  // Posisi kepala dihitung dari torso (y=0.96): headG y 0.52 -> 1.48 dunia,
  // pusat kepala ~1.56, puncak helm ~1.72 — sama dengan tinggi collision 1.72.
  headG.position.y = 0.52;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 12), skinM);
  head.scale.set(0.92, 1.05, 0.95); head.position.y = 0.08; head.castShadow = true;
  // Wajah sederhana: mata + alis, menghadap -z (arah depan bot)
  const eyeM = mat(0x1a1a1a, 0.4);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), eyeM);
  eyeL.position.set(-0.05, 0.10, -0.135);
  const eyeR = eyeL.clone(); eyeR.position.x = 0.05;
  const brow = box(0.11, 0.015, 0.01, mat(0x3a2a1a, 0.8), 0, 0.135, -0.138);
  const nose = box(0.03, 0.05, 0.03, mat(SKIN_DARK, 0.6), 0, 0.06, -0.14);
  // Helm: kubah + pinggir, warna tim, visor gelap di depan
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), helmetM);
  helmet.position.y = 0.10; helmet.castShadow = true;
  const helmetBrim = cyl(0.175, 0.185, 0.04, helmetM, 0, 0.10, 0, 14);
  const visor = box(0.20, 0.05, 0.02, mat(0x101418, 0.25, 0.6), 0, 0.10, -0.15);
  const lampDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), mat(isAtk ? 0xf5a623 : 0x37c8c3, 0.4, 0.2));
  lampDot.position.set(0.10, 0.16, -0.12);
  headG.add(head, eyeL, eyeR, brow, nose, helmet, helmetBrim, visor, lampDot);
  torso.add(headG);

  // ---- Lengan: bahu y=1.48 dunia (0.52 di torso), lengan atas 0.30, bawah 0.28 ----
  function arm(side) {
    const shoulder = limbPivot(0.29 * side, 0.52, 0);
    const upper = cyl(0.06, 0.055, 0.30, uniformM, 0, -0.15, 0);
    const elbow = limbPivot(0, -0.30, 0);
    const fore = cyl(0.05, 0.048, 0.28, uniformM, 0, -0.14, 0);
    const glove = box(0.09, 0.11, 0.10, gloveM, 0, -0.32, 0);
    elbow.add(fore, glove);
    shoulder.add(upper, elbow);
    return { shoulder, elbow, hand: glove };
  }
  const armL = arm(-1), armR = arm(1);
  torso.add(armL.shoulder, armR.shoulder);

  // ---- Senjata di tangan kanan, dipegang dua tangan ----
  const gun = new THREE.Group();
  const receiver = box(0.07, 0.09, 0.38, metalM, 0, 0, 0);
  const barrel = cyl(0.022, 0.022, 0.30, metalM, 0, 0.02, -0.32);
  barrel.rotation.x = Math.PI / 2;
  const mag = box(0.05, 0.16, 0.08, darkM, 0, -0.11, 0.02);
  const stock = box(0.06, 0.07, 0.16, darkM, 0, -0.01, 0.26);
  const sight = box(0.03, 0.05, 0.08, metalM, 0, 0.07, -0.05);
  const grip = box(0.05, 0.10, 0.06, darkM, 0, -0.08, 0.14);
  gun.add(receiver, barrel, mag, stock, sight, grip);
  // Tangan kanan di gagang, tangan kiri menopang depan — posisi gun relatif torso
  gun.position.set(0.10, 0.18, -0.28);
  gun.rotation.x = 0.06;
  torso.add(gun);

  g.add(legL.hip, legR.hip, torso);
  g.traverse((m) => { if (m.isMesh) m.castShadow = true; });

  // Hitbox (mesh tak terlihat TIDAK dipakai — mesh visual ini yang ditembak):
  // kepala = head (sphere), torso = chest+vest, kaki = thigh/shin.
  // userData dipasang oleh pemanggil (bots.js) supaya part tetap 'head'/'torso'.
  const parts = {
    head, torsoMesh: chest, vest, legL, legR, armL, armR, headG, gun,
    mats: { uniformM, vestM, pantsM, skinM, helmetM },
  };

  let phase = Math.random() * Math.PI * 2;
  let deathT = 0;
  function update(dt, speed, aiming, crouching, dead) {
    if (dead) {
      deathT += dt;
      // Tersungkur: jatuh ke belakang, lutut menekuk, lalu diam di lantai.
      const k = Math.min(1, deathT * 2.2);
      g.rotation.x = -Math.PI / 2 * (k * k * (3 - 2 * k));
      g.position.y = -0.15 * k;
      legL.hip.rotation.x = -0.5 * k; legR.hip.rotation.x = 0.4 * k;
      armL.shoulder.rotation.x = -0.6 * k; armR.shoulder.rotation.x = -0.4 * k;
      return;
    }
    deathT = 0;
    g.rotation.x = 0; g.position.y = 0;
    const moving = Math.min(1, speed / 3.4);
    phase += dt * (4 + speed * 1.6);
    const swing = Math.sin(phase) * 0.55 * moving;
    const swing2 = Math.sin(phase + Math.PI) * 0.55 * moving;
    // Jalan/lari: kaki berlawanan, lengan berlawanan, badan membungkuk sedikit.
    legL.hip.rotation.x = swing;
    legR.hip.rotation.x = swing2;
    legL.knee.rotation.x = Math.max(0, -Math.sin(phase)) * 0.7 * moving;
    legR.knee.rotation.x = Math.max(0, Math.sin(phase)) * 0.7 * moving;
    torso.rotation.x = 0.06 * moving + (crouching ? 0.22 : 0);
    torso.position.y = 0.96 + Math.abs(Math.cos(phase)) * 0.025 * moving - (crouching ? 0.22 : 0);
    headG.rotation.x = crouching ? -0.08 : 0;
    if (aiming) {
      // Pose membidik: lengan kanan lurus ke depan, kiri menopang, kepala menunduk sedikit.
      armR.shoulder.rotation.x = -1.35; armR.elbow.rotation.x = -0.15;
      armL.shoulder.rotation.x = -1.05; armL.elbow.rotation.x = -0.75;
      armL.shoulder.rotation.z = 0.45; armR.shoulder.rotation.z = -0.08;
      headG.rotation.x = 0.12;
    } else {
      armR.shoulder.rotation.x = swing2 * 0.7;
      armL.shoulder.rotation.x = swing * 0.7;
      armR.elbow.rotation.x = -0.25 - Math.max(0, swing2) * 0.3;
      armL.elbow.rotation.x = -0.25 - Math.max(0, swing) * 0.3;
      armL.shoulder.rotation.z = 0.10; armR.shoulder.rotation.z = -0.10;
    }
    if (crouching) {
      legL.hip.rotation.x = -0.9; legR.hip.rotation.x = -0.7;
      legL.knee.rotation.x = 1.1; legR.knee.rotation.x = 1.0;
    }
  }
  function resetPose() {
    deathT = 0; g.rotation.x = 0; g.position.y = 0;
    legL.hip.rotation.set(0, 0, 0); legR.hip.rotation.set(0, 0, 0);
    legL.knee.rotation.set(0, 0, 0); legR.knee.rotation.set(0, 0, 0);
    armL.shoulder.rotation.set(0, 0, 0.10); armR.shoulder.rotation.set(0, 0, -0.10);
    armL.elbow.rotation.set(-0.25, 0, 0); armR.elbow.rotation.set(-0.25, 0, 0);
    torso.rotation.set(0, 0, 0); torso.position.y = 0.96;
  }
  return { group: g, parts, update, resetPose };
}
