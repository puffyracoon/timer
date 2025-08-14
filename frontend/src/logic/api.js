// Simplified GW2 API integration logic.
const BASE = 'https://api.guildwars2.com/v2';

export const bossNameVariants = {
  ShadowBehemoth: ['shadow behemoth'],
  FireElemental: ['fire elemental'],
  SvanirShamanChief: ['svanir shaman'],
  GreatJungleWurm: ['great jungle wurm'],
  GolemMarkII: ['golem mark ii','golem mark 2'],
  ClawofJormag: ['claw of jormag'],
  AdmiralTaidhaCovington: ['taidha'],
  Megadestroyer: ['megadestroyer'],
  TheShatterer: ['the shatterer'],
  ModniirUlgoth: ['modniir ulgoth','ulgoth'],
  Tequatl: ['tequatl'],
  KarkaQueen: ['karka queen'],
  TripleTrouble: ['triple trouble','evolved jungle wurm'],
  KainengBlackout: ['kaineng blackout'],
  AetherbladeAssault: ['aetherblade assault'],
  "Dragon'sEnd": ["dragon's end"],
};

export async function validateKey(key){
  try { const r = await fetch(`${BASE}/account?access_token=${key}`); if (!r.ok) return null; return await r.json(); } catch { return null; }
}
export async function fetchAchievements(key){
  try { const r = await fetch(`${BASE}/account/achievements?access_token=${key}`); if (!r.ok) return []; return await r.json(); } catch { return []; }
}
export async function fetchWizardsVaultSet(scope, key){
  try { const r = await fetch(`${BASE}/account/wizardsvault/${scope}?access_token=${key}`); if (!r.ok) return { objectives: [] }; return await r.json(); } catch { return { objectives: [] }; }
}
export async function buildMapping({ achievements, wvDaily, wvWeekly, wvSpecial }){
  const map = {}; const scopeById = {}; const nameById = {};
  [ {data: wvDaily, scope:'daily'}, {data: wvWeekly, scope:'weekly'}, {data: wvSpecial, scope:'special'}].forEach(({data, scope})=>{
    data.objectives?.forEach(o => { const id = o.achievement_id || o.id; if (!id) return; scopeById[id]=scope; const title=(o.title||'').toLowerCase(); for (const [k, vars] of Object.entries(bossNameVariants)){ if (map[k]) continue; if (vars.some(v=>title.includes(v))) map[k]=id; } });
  });
  // Achievement names (best effort)
  const achIds = achievements.slice(0,150).map(a=>a.id).join(',');
  try { if (achIds){ const r = await fetch(`${BASE}/achievements?ids=${achIds}`); if (r.ok){ (await r.json()).forEach(a=>{ nameById[a.id]=a.name; }); } } } catch {}
  return { map, scopeById, nameById };
}
export function deriveCompletedEvents({ mapping, achievements }){
  const achMap = new Map(achievements.map(a=>[a.id,a]));
  const completed = new Set();
  for (const [k,id] of Object.entries(mapping.map)){ const entry = achMap.get(id); if (entry?.done) completed.add(k); }
  return completed;
}

export function fireNotification(title, body){
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') Notification.requestPermission();
  if (Notification.permission === 'granted') {
    try { new Notification(title, { body, tag: title }); } catch {}
  }
}
