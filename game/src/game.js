// Ronde, ekonomi, plant/defuse — sistem yang sama seperti pemenang fps-02,
// di map Stasiun Senja. First to 5 ronde, maks 9. Ronde 100 detik, buy 12 detik,
// plant 3 detik, bom meledak 35 detik setelah plant, defuse 5 detik.
import { SITES } from './world.js';
export function createGame() {
  const g = {
    round: 1, maxRounds: 9, winAt: 5,
    scoreAtk: 0, scoreDef: 0,
    money: 800, kills: 0, deaths: 0,
    phase: 'buy', // buy | live | over
    timer: 12, siteKey: 'A',
    bomb: { planted: false, site: SITES.A, timer: 0, planter: null },
    matchOver: false, winner: null,
  };
  function startRound() {
    g.siteKey = Math.random() < 0.5 ? 'A' : 'B';
    g.bomb = { planted: false, site: SITES[g.siteKey], timer: 0, planter: null };
    g.phase = 'buy'; g.timer = 12;
  }
  function endRound(winner, reason) {
    if (winner === 'atk') g.scoreAtk += 1; else g.scoreDef += 1;
    g.money += winner === 'atk' ? 1400 : 1000;
    g.phase = 'over'; g.timer = 4;
    if (g.scoreAtk >= g.winAt || g.scoreDef >= g.winAt || g.round >= g.maxRounds) {
      g.matchOver = true; g.winner = g.scoreAtk > g.scoreDef ? 'atk' : g.scoreDef > g.scoreAtk ? 'def' : 'draw';
    }
    return { winner, reason };
  }
  function nextRound() { g.round += 1; startRound(); }
  return {
    state: g, startRound, endRound, nextRound,
    plant(siteKey) { g.bomb.planted = true; g.bomb.timer = 35; g.bomb.site = SITES[siteKey]; },
    addKill() { g.kills += 1; g.money += 300; },
    onDeath() { g.deaths += 1; },
  };
}
