// STASIUN SENJA — an old night train station, NOT a container yard.
// Layout (x -22..22, z -16..16): attackers spawn south in the ticket lobby,
// defenders spawn north on the platforms. Site A = Peron Barat (west platform,
// beside the teal night train), Site B = Gudang Timur (east cargo hall).
// Mid = the concourse with benches, a kiosk and clock pillars. Flanks: the
// west underpass corridor and the east platform edge along the tracks.
// Roofed hall, arched windows, amber lamps — a dusk station, not a yard.
import * as THREE from 'three';
import { PALETTE, TEAM } from './palette.js';

export const SITES = {
  A: { x: -16, z: -11, label: 'SITE A — PERON BARAT' },
  B: { x: 16, z: -11, label: 'SITE B — GUDANG TIMUR' },
};
export const SPAWNS = {
  atk: [[-4, 13], [0, 14], [4, 13]],
  def: [[-16, -12], [0, -13], [16, -12]],
};

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const mats = {};
  for (const n of Object.keys(PALETTE)) mats[n] = new THREE.MeshStandardMaterial({ color: PALETTE[n], roughness: n === 'accent' ? 0.5 : 0.9, metalness: 0.05 });
  mats.teal = new THREE.MeshStandardMaterial({ color: 0x2a7f8c, roughness: 0.55, metalness: 0.35 });
  mats.rust = new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 0.85, metalness: 0.1 });
  mats.glass = new THREE.MeshStandardMaterial({ color: 0x35506e, roughness: 0.15, metalness: 0.4, emissive: 0x1a2c44, emissiveIntensity: 0.7 });
  mats.amber = new THREE.MeshStandardMaterial({ color: 0xf5a623, roughness: 0.4, emissive: 0xf5a623, emissiveIntensity: 1.4 });
  const colliders = [], shootables = [];
  function box(w, h, d, x, y, z, m, solid = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats[m] || mats.surface);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    if (solid) { colliders.push(new THREE.Box3().setFromObject(mesh)); shootables.push(mesh); }
    return mesh;
  }
  function lamp(x, y, z) {
    box(0.12, 0.5, 0.12, x, y + 0.4, z, 'hairline', false);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mats.amber);
    b.position.set(x, y, z); group.add(b);
    const l = new THREE.PointLight(0xf5a623, 14, 12, 1.6); l.position.set(x, y, z); scene.add(l);
  }
  box(45, 0.4, 33, 0, -0.2, 0, 'canvas');
  box(45, 0.4, 33, 0, 7.1, 0, 'surface', false);
  box(0.5, 7.4, 33, -22.4, 3.7, 0, 'surface');
  box(0.5, 7.4, 33, 22.4, 3.7, 0, 'surface');
  box(45, 7.4, 0.5, 0, 3.7, -16.4, 'surface');
  box(45, 7.4, 0.5, 0, 3.7, 16.4, 'surface');
  for (const z of [-12, -6, 0, 6, 12]) box(44, 0.5, 0.7, 0, 6.8, z, 'hairline', false);
  for (const x of [-15, -7.5, 0, 7.5, 15]) {
    box(3.4, 3.2, 0.2, x, 4.4, -16.1, 'glass', false);
    box(3.4, 3.2, 0.2, x, 4.4, 16.1, 'glass', false);
  }
  box(10, 2.6, 2.4, -14, 1.3, -14.2, 'teal');
  box(10, 2.6, 2.4, 14, 1.3, -14.2, 'teal');
  box(10, 0.3, 2.8, -14, 2.75, -14.2, 'rust', false);
  box(10, 0.3, 2.8, 14, 2.75, -14.2, 'rust', false);
  box(44, 0.06, 1.6, 0, 0.03, -14.2, 'canvas', false);
  box(44, 0.06, 1.6, 0, 0.03, 10.5, 'canvas', false);
  box(1.1, 5.2, 1.1, -6, 2.6, 0, 'hairline');
  box(1.1, 5.2, 1.1, 6, 2.6, 0, 'hairline');
  box(1.6, 0.5, 1.6, -6, 5.4, 0, 'amber', false);
  box(1.6, 0.5, 1.6, 6, 5.4, 0, 'amber', false);
  box(3.4, 0.9, 1.0, -3, 0.45, -2, 'rust');
  box(3.4, 0.9, 1.0, 3, 0.45, 3, 'rust');
  box(2.6, 2.6, 2.6, 0, 1.3, 6.5, 'teal');
  box(2.8, 0.3, 2.8, 0, 2.75, 6.5, 'accent', false);
  box(1.6, 1.0, 1.6, -11, 0.5, -6, 'rust');
  box(1.6, 1.0, 1.6, 11, 0.5, -6, 'rust');
  box(1.2, 1.1, 1.2, -11, 0.55, 6, 'hairline');
  box(1.2, 1.1, 1.2, 11, 0.55, 6, 'hairline');
  box(2.2, 1.2, 1.2, -2, 0.6, -8, 'hairline');
  box(2.2, 1.2, 1.2, 2, 0.6, -8, 'hairline');
  box(0.6, 3.4, 14, -18.5, 1.7, 0, 'surface');
  box(0.6, 3.4, 14, -21, 1.7, 0, 'surface');
  box(2.0, 1.4, 2.0, 18, 0.7, -9, 'rust');
  box(1.6, 1.2, 1.6, 14.5, 0.6, -13, 'hairline');
  // ---- Detail map: bangku + sandaran, kios, gerbang tiket, peti gudang ----
  // Bangku konkors (sandaran, solid=false supaya collider tetap kotak kursi lama)
  box(3.4, 0.08, 0.5, -3, 1.0, -1.7, 'rust', false);
  box(3.4, 0.08, 0.5, 3, 1.0, 3.3, 'rust', false);
  box(2.2, 0.5, 0.08, -14, 0.75, -12.8, 'hairline', false); // bangku peron A
  box(2.2, 0.5, 0.08, 14, 0.75, -12.8, 'hairline', false);  // bangku peron B
  // Kios di tengah (0, 6.5): konter + atap + rak — cover di mid
  box(2.6, 1.1, 0.5, 0, 0.55, 5.1, 'rust');
  box(2.8, 0.12, 0.7, 0, 1.15, 5.1, 'accent', false);
  box(0.5, 0.9, 0.4, -0.8, 1.6, 6.5, 'hairline', false);
  box(0.5, 0.9, 0.4, 0.8, 1.6, 6.5, 'hairline', false);
  // Gerbang tiket selatan (4 gerbang, celah di antaranya bisa dilewati)
  for (const x of [-6, -2, 2, 6]) box(0.5, 1.1, 1.6, x, 0.55, 11.5, 'hairline');
  // Peti + tong gudang timur (cover Site B)
  box(1.4, 1.4, 1.4, 18.5, 0.7, -13.5, 'rust');
  box(1.0, 1.0, 1.0, 18.5, 1.9, -13.5, 'rust', false);
  box(1.2, 1.2, 1.2, 13, 0.6, -13.5, 'hairline');
  // Garis kuning tepi peron (marka lantai, tidak solid)
  box(44, 0.02, 0.3, 0, 0.04, -12.6, 'accent', false);
  box(44, 0.02, 0.3, 0, 0.04, 9.0, 'accent', false);
  // --- Tekstur prosedural (CanvasTexture, tanpa file eksternal) ---
  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const floorTex = canvasTex(256, 256, (g) => {
    g.fillStyle = '#232c3d'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#161d29'; g.lineWidth = 4;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); }
    g.fillStyle = '#2b3547'; g.fillRect(8, 8, 48, 48); g.fillRect(136, 136, 48, 48);
  }, 11, 8);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(44, 32), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.02; floor.receiveShadow = true; group.add(floor);
  // --- Callout: papan nama lokasi (teks prosedural) ---
  function sign(text, sub, x, y, z, ry) {
    const t = canvasTex(512, 128, (g) => {
      g.fillStyle = '#1a2233'; g.fillRect(0, 0, 512, 128);
      g.fillStyle = '#f5a623'; g.fillRect(0, 0, 512, 10);
      g.fillStyle = '#f2ead8'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, 62);
      g.fillStyle = '#8fa3b8'; g.font = '28px sans-serif'; g.fillText(sub, 256, 104);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m);
  }
  sign('PERON BARAT', 'SITE A', -16, 4.6, -15.9, 0);
  sign('GUDANG TIMUR', 'SITE B', 16, 4.6, -15.9, 0);
  sign('KONKORS', 'MID', 0, 5.0, -15.9, 0);
  sign('LORONG BARAT', 'FLANK', -21.9, 3.4, 0, Math.PI / 2);
  sign('PERON TIMUR', 'FLANK', 21.9, 3.4, 0, -Math.PI / 2);
  sign('LOBI TIKET', 'SPAWN SENJA', 0, 4.6, 15.9, Math.PI);
  sign('KIOS', 'KOPI · TIKET', 0, 3.4, 5.0, Math.PI);
  sign('KERETA MALAM', 'PERON 1 · 23:40', -14, 3.6, -12.9, 0);
  // Jam stasiun di tiang konkors (lingkaran + jarum)
  for (const x of [-6, 6]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0xf2ead8 }));
    face.position.set(x, 4.6, 0.56); group.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 8, 24), mats.amber);
    rim.position.set(x, 4.6, 0.56); group.add(rim);
    const handH = box(0.05, 0.32, 0.02, x - 0.1, 4.65, 0.58, 'ink', false);
    handH.rotation.z = 0.6;
    const handM = box(0.04, 0.45, 0.02, x + 0.08, 4.75, 0.58, 'ink', false);
    handM.rotation.z = -0.9;
  }
  // Jendela kereta malam (teal) — deretan kaca di badan kereta
  for (const cx of [-17.5, -15.5, -13.5, -11.5, 11.5, 13.5, 15.5, 17.5]) {
    box(1.4, 0.9, 0.06, cx, 1.7, -12.95, 'glass', false);
  }
  // Tong sampah + pot di konkors
  for (const [x, z] of [[-8, 4], [8, -4], [-8, -4]]) {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.8, 10), mats.hairline);
    bin.position.set(x, 0.4, z); bin.castShadow = true; group.add(bin);
  }
  for (const s of [SITES.A, SITES.B]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: TEAM.atk, transparent: true, opacity: 0.22 }));
    p.rotation.x = -Math.PI / 2; p.position.set(s.x, 0.05, s.z); group.add(p);
  }
  lamp(-10, 5.2, -8); lamp(10, 5.2, -8); lamp(-10, 5.2, 8); lamp(10, 5.2, 8); lamp(0, 5.2, 0);
  scene.add(new THREE.HemisphereLight(0x2a3a55, 0x0d1420, 1.0));
  const key = new THREE.DirectionalLight(0xffc46b, 1.6); key.position.set(8, 12, -10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -24; key.shadow.camera.right = 24;
  key.shadow.camera.top = 24; key.shadow.camera.bottom = -24; key.shadow.camera.far = 60; key.shadow.bias = -0.0006;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0x8fa3b8, 0.5); fill.position.set(-8, 9, 12); scene.add(fill);
  return { colliders, shootables, group };
}
