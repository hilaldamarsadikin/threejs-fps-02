// STASIUN SENJA — look plan. Night station: deep blue dusk, warm amber lamps,
// teal train bodies, rust orange accents. Six values only, as in the starter.
export const PALETTE = {
  canvas: '#0d1420',
  surface: '#1a2233',
  hairline: '#2b3547',
  ink: '#f2ead8',
  muted: '#8fa3b8',
  accent: '#f5a623',
};
export const TEAM = { atk: '#f5a623', def: '#37c8c3', enemy: '#e5484d' };
export function shade(name) { return PALETTE[name]; }
