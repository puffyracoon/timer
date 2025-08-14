import React, { useEffect, useState } from 'react';
import { formatCountdown, formatLocal } from '../logic/timeUtils';
import { useEvents } from '../context/EventsContext';

export default function EventCard({ occ }){
  const { toggleFavorite, favorites, cycleReminder, reminders, generateBackground, done, toggleDone, chainNextTargets, chainStarterKeys } = useEvents();
  const [showTip, setShowTip] = useState(false);
  const fav = favorites.has(occ.parent.key);
  const reminderSetting = reminders[occ.id] ?? 'no';
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{ const id = setInterval(()=> setNow(Date.now()), 1000); return ()=> clearInterval(id); },[]);
  const remaining = occ.startTime - now;
  const showCountdown = remaining < 15*60*1000; // 15m
  let urgency = '';
  if (remaining < 60*1000) urgency = 'text-red-400 animate-pulse'; else if (remaining < 5*60*1000) urgency = 'text-amber-300';
  let reminderLabel = '';
  if (reminderSetting === 'no') reminderLabel = '';
  else reminderLabel = `${Math.round(reminderSetting/60000)}m`;
  const bg = generateBackground(occ.parent.categoryKey);
  const isDone = !!done[occ.parent.key];
  const worldBossKeys = new Set(['ShadowBehemoth','FireElemental','SvanirShamanChief','GreatJungleWurm','GolemMarkII','ClawofJormag','AdmiralTaidhaCovington','Megadestroyer','TheShatterer','ModniirUlgoth','Tequatl','KarkaQueen','TripleTrouble']);
  const isWorldBoss = worldBossKeys.has(occ.parent.key);
  const isChainNext = chainNextTargets?.has(occ.parent.key);
  const isChainStart = chainStarterKeys?.has(occ.parent.key);
  return (
  <div className={`group relative border rounded-lg overflow-visible shadow-sm bg-neutral-800/60 backdrop-blur flex flex-col ${isDone? 'opacity-60 border-emerald-600':'border-neutral-700'}`} style={{ backgroundImage: bg==='none'?undefined:`url(${bg})`, backgroundSize:'cover'}}>
      <div className="flex-1 p-3 flex flex-col gap-1">
        <div className="relative" onMouseEnter={()=>setShowTip(true)} onMouseLeave={()=>setShowTip(false)}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-900/70 border border-neutral-600">{occ.parent.categoryKey}</span>
            {isWorldBoss && <span className="relative">
              <span className="text-[10px] tracking-wide uppercase bg-purple-700/70 px-1.5 py-0.5 rounded">Boss</span>
            </span>}
            {isChainStart && <span className="relative">
              <span className="text-[10px] tracking-wide uppercase bg-cyan-700/70 px-1.5 py-0.5 rounded">Start</span>
            </span>}
            {isChainNext && <span className="relative">
              <span className="text-[10px] tracking-wide uppercase bg-indigo-600/70 px-1.5 py-0.5 rounded">Next</span>
            </span>}
            {occ.event?.scheduleRef && <span className="text-[10px] tracking-wide uppercase bg-neutral-700/70 px-1.5 py-0.5 rounded">Sched</span>}
            {reminderLabel && <span className="ml-1 text-[10px] text-emerald-400">{reminderLabel}</span>}
          </div>
          {showTip && <RoadmapTooltip eventKey={occ.parent.key} />}
        </div>
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {occ.parent.name}
          {occ.parent.note && <span className="text-xs font-normal text-neutral-300">{occ.parent.note}</span>}
        </h3>
        <div className="text-sm text-neutral-300 flex gap-2 items-center">
          <span className="font-mono tabular-nums text-neutral-100">{formatLocal(occ.startTime)}</span>
          {showCountdown && <span className={`text-xs bg-neutral-900/60 px-2 py-0.5 rounded border border-neutral-600 font-mono tabular-nums ${urgency}`}>{formatCountdown(remaining)}</span>}
        </div>
        <div className="flex items-center gap-2 mt-2 text-neutral-300 flex-wrap">
          <IconBtn onClick={()=>toggleFavorite(occ.parent.key)} title={fav? 'Unfavorite':'Favorite'} active={fav}>★</IconBtn>
          <IconBtn onClick={()=>cycleReminder(occ)} title="Cycle reminder 2/5/10m">🔔</IconBtn>
          <IconBtn onClick={()=>toggleDone(occ.parent.key)} title={isDone? 'Unmark done':'Mark done'} active={isDone}>✓</IconBtn>
          {occ.parent.wiki && <IconBtn onClick={()=>window.open(occ.parent.wiki,'_blank')} title="Open wiki">📖</IconBtn>}
          {occ.parent.fastF ? <IconBtn onClick={()=>window.open(occ.parent.fastF,'_blank')} title="Open fast.farm">⚡</IconBtn> : <IconBtn disabled title="No fast.farm">⚡</IconBtn>}
          <IconBtn
            onClick={()=>{
              const namePart = occ.parent.name;
              const timePart = formatLocal(occ.startTime);
              const waypoint = occ.event.waypoint || '';
              const wp = waypoint ? `${namePart} ${timePart} | ${waypoint}` : `${namePart} ${timePart}`;
              navigator.clipboard.writeText(wp);
            }}
            title="Copy name + start time + waypoint"
          >🧭</IconBtn>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, title, active, disabled }){
  return (
    <button disabled={disabled} onClick={onClick} title={title} aria-label={title} className={`w-7 h-7 flex items-center justify-center rounded text-sm border transition select-none ${disabled? 'opacity-40 cursor-not-allowed border-neutral-700':'hover:bg-neutral-700 cursor-pointer'} ${active? 'text-emerald-400 border-emerald-500':'text-neutral-300 border-neutral-600'}`}>{children}</button>
  );
}

function RoadmapTooltip({ eventKey }){
  const { allChains, occurrences, done } = useEvents();
  const chains = allChains.filter(c => c.events.some(e=>e.key===eventKey));
  const now = Date.now();
  // Helper to get display name from occurrences or fallback to key
  const getDisplayName = key => {
    const occ = occurrences.find(o=>o.parent.key===key);
    return occ ? occ.parent.name : key;
  };
  // Keyboard navigation state
  const [focusedStep, setFocusedStep] = useState(-1);
  const handleKeyDown = e => {
    if (!chains.length) return;
    if (e.key === 'ArrowDown') setFocusedStep(f=>Math.min(f+1, chains[0].events.length-1));
    if (e.key === 'ArrowUp') setFocusedStep(f=>Math.max(f-1, 0));
  };
  return (
    <div
      className="absolute z-[60] mt-1 left-0 top-full bg-neutral-900/95 border border-neutral-600 rounded p-2 text-[10px] shadow-xl max-w-sm w-72 space-y-2 max-h-72 overflow-auto"
      role="dialog"
      aria-label="Chain roadmap tooltip"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {chains.length===0 && <p>No chain info.</p>}
      {chains.map(chain => {
        const steps = chain.events.map((s, idx) => {
          const occs = occurrences.filter(o=>o.parent.key===s.key && o.startTime>now).sort((a,b)=>a.startTime-b.startTime);
          const nextOcc = occs[0];
          const eta = nextOcc? formatCountdown(nextOcc.startTime - now): '—';
          return { key: s.key, name: getDisplayName(s.key), done: !!done[s.key], eta, idx };
        });
        return (
          <div key={chain.name} className="border border-neutral-700 rounded p-1" role="group" aria-label={chain.name}>
            <p className="font-semibold mb-1 text-[10px]">{chain.name}</p>
            <ul className="space-y-0.5" role="list">
              {steps.map(st => (
                <li
                  key={st.key}
                  className={`flex justify-between gap-2 ${focusedStep===st.idx?'bg-neutral-700/40':''}`}
                  tabIndex={0}
                  aria-label={st.name + (st.done? ' done':'')}
                  onFocus={()=>setFocusedStep(st.idx)}
                >
                  <span className={`truncate ${st.done? 'text-emerald-400 line-through':'text-neutral-200'}`}>{st.name}</span>
                  <span className="text-neutral-400">{st.eta}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="text-[9px] opacity-50">ETAs use provisional schedules if marked Sched.</p>
    </div>
  );
}
