# STASIUN SENJA — Tactical FPS (make.fun threejs-fps-02)

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/hilaldamarsadikin/threejs-fps-02/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/hilaldamarsadikin/threejs-fps-02/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)


Round-based tactical FPS ala Counter-Strike, single-player lawan bot, di
stasiun kereta tua pada malam hari. Bukan container yard.

## Cara main
```sh
node serve.ts
# buka http://localhost:8080
```
Klik untuk lock mouse. WASD gerak, mouse arah, klik tembak, R reload,
E tahan untuk plant bom di site, B toko senjata, 1-4 beli senjata,
Ctrl jongkok, Space lompat.

## Sistem
- 3v3: tim Senja (penyerang, amber) vs Penjaga (bertahan, teal). Kamu + 2 bot
  lawan 3 bot.
- Ronde first-to-5 (maks 9), buy phase 12 detik, ronde 100 detik, plant 3 detik,
  bom meledak 35 detik, defuse 5 detik. Menang: habisi tim lawan / bom meledak /
  waktu habis (bertahan menang kalau bom tidak ditanam).
- Ekonomi: mulai $800, kill +$300, menang ronde +$1400, kalah +$1000.
- 4 senjata: Kestrel P9 ($0), Rimba SMG ($900), Garuda AR ($2.100),
  Elang DMR ($3.200). Masing-masing punya pola recoil yang bisa dipelajari,
  spread, damage falloff, headshot multiplier.
- Bot AI: waypoint graph + A*, FSM patrol/alert/engage/hunt, line-of-sight
  raycasting (tidak tembus tembok), reaction 200-500 ms, aim mengecil selama
  engage, dengar suara tembakan dan memburu sumbernya, flank berkala.
- Map: 2 site (A Peron Barat, B Gudang Timur), 3 route (mid Konkors, Lorong
  Barat, Peron Timur), sightline panjang, cover adil, papan callout di dinding.
- Suara WebAudio prosedural, tekstur prosedural (CanvasTexture), HUD lengkap
  (health, ammo, uang, ronde, timer, skor, tim hidup, status bom, killfeed).

## Build / submit (nanti, oleh agen utama — JANGAN buat repo dulu)
Kompetisi baru buka 16 Nov 2026 17:00 UTC. Entry memakai kit resmi di
`../threejs-fps-02-kit/` (vendor/makefun-threejs.ts tidak diubah).
```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # tulis /output + dossier.json
```
Screenshot: `shots.json` (4 shot, ?shot=start|play|end, seed 1/7) — HARUS
diambil ulang dari game ini di browser WebGL2; screenshot di screenshots/
saat ini MASIH screenshot starter kit (grey room) dan WAJIB diganti sebelum submit.

## Status
- v1 playable, semua file lolos `node --check`, `main.ts` membangun dossier.
- Logic smoke test lolos (ronde, ekonomi, falloff, pola recoil).
- v2 (detail, 15 Nov): model humanoid low-poly 40 mesh/bot (helm, rompi, sarung tangan, sepatu, animasi jalan/membidik/tersungkur), viewmodel tangan player, kontrol HP (joystick besar, TEMBAK besar, aim assist ringan) + tutorial detail + Shift lari, crosshair dinamis, hitmarker 3 warna, angka damage, kilatan kena tembak, GRANAT (G / tombol GRANAT, 1/ronde, radius 6 m, 90->15 dmg, ledakan+asap), detail map (jam stasiun, jendela kereta, kios, bangku, gerbang tiket, peti gudang, garis peron). Smoke test humanoid+granat ALL OK (Node, /tmp/smoke-fps/test.mjs), `node --check` 12 file OK, dossier build OK.
- BELUM: screenshot asli (Chrome di VM ini diblokir policy + download
  Playwright Chromium gagal), playtest visual di browser, tuning bot.
