import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildOccurrences, buildOccurrencesFromMetaSpec, getNow } from '../logic/timeUtils';
import { generateBackground } from '../logic/procBg';
import { validateKey, fetchAchievements, fetchWizardsVaultSet, buildMapping, deriveCompletedEvents, fireNotification } from '../logic/api';

const EventsContext = createContext(null);

export function EventsProvider({ children }) {
  const [rawData, setRawData] = useState(null);
  const [occurrences, setOccurrences] = useState([]);
  const [metaSpec, setMetaSpec] = useState(null);
  const [metaWarnings, setMetaWarnings] = useState([]);
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [favorites, setFavorites] = useState(()=> new Set(JSON.parse(localStorage.getItem('favorite-events')||'[]')));
  const [categoryEnabled, setCategoryEnabled] = useState(()=>({}));
  const [reminders, setReminders] = useState(()=>JSON.parse(localStorage.getItem('reminders')||'{}')); // occurrenceId -> msBefore or 'no'
  const [done, setDone] = useState(()=>JSON.parse(localStorage.getItem('done-events')||'{}')); // parentKey -> expiry timestamp
  const [chainAlertsEnabled, setChainAlertsEnabled] = useState(()=> JSON.parse(localStorage.getItem('chain-alerts-enabled')||'true'));
  const [apiKey, setApiKey] = useState(()=> localStorage.getItem('gw2-api-key') || '');
  const [apiAccount, setApiAccount] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [mapping, setMapping] = useState({ map:{}, scopeById:{}, nameById:{} });
  const [autoMarkEnabled, setAutoMarkEnabled] = useState(()=> JSON.parse(localStorage.getItem('auto-mark-enabled')||'true'));
  const [weeklyAutoAlertEnabled, setWeeklyAutoAlertEnabled] = useState(()=> JSON.parse(localStorage.getItem('weekly-autoalert-enabled')||'true'));
  const [bgMode, setBgMode] = useState(()=> localStorage.getItem('bg-style') || 'generated');
  const [desktopNotifsEnabled, setDesktopNotifsEnabled] = useState(()=> JSON.parse(localStorage.getItem('desktop-notifs-enabled')||'false'));
  const [showProvisional, setShowProvisional] = useState(()=> JSON.parse(localStorage.getItem('show-provisional')||'true'));
  // Unified chain definitions (meta-spec preferred). Shape: { name, events:[{key, delay?}] }
  const allChains = useMemo(()=>{
    const legacy = rawData?.eventChains?.map(c=> ({ name: c.name, events: c.events })) || [];
    const spec = metaSpec?.chains?.map(c=> ({ name: c.name, events: c.steps.map(k=>({ key: k })) })) || [];
    // Prefer spec chains if present, else legacy
    return spec.length ? spec : legacy;
  }, [rawData, metaSpec]);
  // Set of parent event keys that are the next target in any chain based on completed (done) predecessors
  const [chainNextTargets, setChainNextTargets] = useState(new Set());
  // Set of chain starter event keys
  const chainStarterKeys = useMemo(()=>{
    return new Set(allChains.map(c => c.events?.[0]?.key).filter(Boolean));
  }, [allChains]);
  const reminderTimersRef = useRef({});

  // Fetch static JSON (supports static hosting / GitHub Pages)
  useEffect(()=>{
  fetch('events.json')
      .then(r=>r.json())
      .then(data=> setRawData(data))
      .catch(e=>console.error('events fetch failed', e));
  fetch('meta-spec.json')
      .then(r=>r.ok? r.json(): Promise.reject())
      .then(ms=> setMetaSpec(ms))
      .catch(()=>{}); // optional
  },[]);

  // Build category enabled state once data arrives
  useEffect(()=>{
    if (!rawData) return;
    setCategoryEnabled(prev => {
      const next = { ...prev };
      rawData.categories.forEach(c => { if (next[c.key] === undefined) next[c.key] = localStorage.getItem(`category-enabled-${c.key}`)!=='false'; });
      return next;
    });
  },[rawData]);

  // Build occurrences (like original cards) once data arrives
  useEffect(()=>{
    if (!rawData) return;
    const now = getNow();
    const baseOcc = buildOccurrences(rawData, now);
    // Merge meta spec occurrences (future) if available
    if (metaSpec){
      const parentsIndex = new Map(rawData.parentEvents.map(p=>[p.key,p]));
      let specOcc = buildOccurrencesFromMetaSpec(metaSpec, parentsIndex, now);
      if (!showProvisional){
        const provisionalSet = new Set(metaSpec.events.filter(e=>e.scheduleProvisional || e.status==='missing').map(e=>e.key));
        specOcc = specOcc.filter(o=> !provisionalSet.has(o.parent.key));
      }
      // Merge by id uniqueness
      const merged = [...baseOcc];
      specOcc.forEach(o=>{ if (!merged.some(x=>x.parent.key===o.parent.key && x.startTime===o.startTime)) merged.push(o); });
      merged.sort((a,b)=>a.startTime - b.startTime);
      setOccurrences(merged);
    } else {
      setOccurrences(baseOcc);
    }
  },[rawData, metaSpec, showProvisional]);

  // Validate meta spec against parent events
  useEffect(()=>{
    if (!rawData || !metaSpec) return;
    const warnings = [];
    const parentSet = new Set(rawData.parentEvents.map(p=>p.key));
    metaSpec.events.forEach(ev=>{
      if (ev.status !== 'missing' && !parentSet.has(ev.key)) warnings.push(`Meta spec event ${ev.key} missing in parentEvents`);
    });
    // Unused parents that are not in meta spec (informational)
    rawData.parentEvents.forEach(p=>{
      if (!metaSpec.events.find(e=>e.key===p.key)) warnings.push(`Parent ${p.key} not referenced in meta spec`);
    });
    setMetaWarnings(warnings);
    if (warnings.length){
      const evt = new CustomEvent('app:toast', { detail:{ message: `MetaSpec: ${warnings.length} warnings` }});
      window.dispatchEvent(evt);
      console.warn('MetaSpec warnings', warnings);
    }
  }, [rawData, metaSpec]);

  // Persist favorites
  useEffect(()=>{
    localStorage.setItem('favorite-events', JSON.stringify(Array.from(favorites)));
  },[favorites]);

  // Persist reminders / settings
  useEffect(()=>{ localStorage.setItem('reminders', JSON.stringify(reminders)); }, [reminders]);
  useEffect(()=>{ localStorage.setItem('auto-mark-enabled', JSON.stringify(autoMarkEnabled)); },[autoMarkEnabled]);
  useEffect(()=>{ localStorage.setItem('weekly-autoalert-enabled', JSON.stringify(weeklyAutoAlertEnabled)); },[weeklyAutoAlertEnabled]);
  useEffect(()=>{ localStorage.setItem('desktop-notifs-enabled', JSON.stringify(desktopNotifsEnabled)); },[desktopNotifsEnabled]);
  useEffect(()=>{ localStorage.setItem('show-provisional', JSON.stringify(showProvisional)); },[showProvisional]);
  useEffect(()=>{ if (apiKey) localStorage.setItem('gw2-api-key', apiKey); else localStorage.removeItem('gw2-api-key'); },[apiKey]);

  // Daily reset for done markers
  useEffect(()=>{
    const nowTs = Date.now();
    const next = { ...done };
    let changed = false;
    for (const [k, exp] of Object.entries(done)){
      if (nowTs > exp){ delete next[k]; changed = true; }
    }
    if (changed) setDone(next);
  },[]);
  useEffect(()=>{ localStorage.setItem('done-events', JSON.stringify(done)); }, [done]);

  // Reminder scheduling side-effect
  useEffect(()=>{
    // Clear existing
    Object.values(reminderTimersRef.current).forEach(id => clearTimeout(id));
    reminderTimersRef.current = {};

    const now = Date.now();
    occurrences.forEach(o => {
      const setting = reminders[o.id];
      if (!setting || setting === 'no') return;
      const msUntil = o.startTime - now - setting;
      if (msUntil <= 0) return; // too late
      const timeoutId = setTimeout(()=>{
        // Fire reminder
        try { new Audio('/assets/alert.mp3').play().catch(()=>{}); } catch {}
        // Simple toast
        const evt = new CustomEvent('app:toast', { detail: { message: `${o.parent.name} in ${Math.round(setting/60000)}m` }});
        window.dispatchEvent(evt);
        if (desktopNotifsEnabled) fireNotification('Event Reminder', `${o.parent.name} soon`);
      }, msUntil);
      reminderTimersRef.current[o.id] = timeoutId;
    });
  },[reminders, occurrences, desktopNotifsEnabled]);

  function toggleFavorite(key){
    setFavorites(f => {
      const n = new Set(f);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  // API: validate & fetch achievements
  async function refreshApi(force=false){
    if (!apiKey) return;
    if (!apiAccount || force){
      const acct = await validateKey(apiKey);
      if (!acct){ setApiAccount(null); return; }
      setApiAccount(acct);
    }
    const ach = await fetchAchievements(apiKey);
    setAchievements(ach);
    const [wvDaily, wvWeekly, wvSpecial] = await Promise.all([
      fetchWizardsVaultSet('daily', apiKey),
      fetchWizardsVaultSet('weekly', apiKey),
      fetchWizardsVaultSet('special', apiKey)
    ]);
    const map = await buildMapping({ achievements: ach, wvDaily, wvWeekly, wvSpecial });
    setMapping(map);
  }

  useEffect(()=>{ if (apiKey) { refreshApi(); const id = setInterval(refreshApi, 10*60*1000); return ()=>clearInterval(id);} }, [apiKey]);

  // Auto-mark completed events
  useEffect(()=>{
    if (!autoMarkEnabled || !achievements.length) return;
    const completed = deriveCompletedEvents({ mapping, achievements });
    if (!completed.size) return;
    setDone(d => {
      const n = { ...d };
      completed.forEach(k => { if (!n[k]){ const exp = new Date(); exp.setUTCHours(24,0,0,0); n[k]=exp.getTime(); } });
      return n;
    });
  }, [mapping, achievements, autoMarkEnabled]);

  // Weekly auto-alert: assign 5m reminder to earliest upcoming incomplete weekly meta
  useEffect(()=>{
    if (!weeklyAutoAlertEnabled || !Object.keys(mapping.scopeById).length) return;
    const weeklyEventKeys = Object.entries(mapping.map).filter(([k,id])=> mapping.scopeById[id]==='weekly').map(([k])=>k);
    if (!weeklyEventKeys.length) return;
    const now = Date.now();
    const candidates = occurrences.filter(o => weeklyEventKeys.includes(o.parent.key) && !done[o.parent.key] && o.startTime - now > 10*60000); // at least >10m away to schedule 5m reminder later
    if (!candidates.length) return;
    const earliest = candidates.reduce((a,b)=> a.startTime < b.startTime ? a : b);
    // If reminder exists already, skip
    if (reminders[earliest.id] && reminders[earliest.id] !== 'no') return;
    setReminders(r => ({ ...r, [earliest.id]: 5*60000 }));
  }, [weeklyAutoAlertEnabled, mapping, occurrences, done]);

  function cycleReminder(occ){
    setReminders(r => {
      const diff = occ.startTime - Date.now();
      // Build allowable intervals strictly less than remaining time by at least 5s buffer
      const rawOptions = [2,5,10].map(m=>m*60000);
      const options = rawOptions.filter(ms => diff - 5000 > ms); // enough room
      if (!options.length){
        // Too close for any reminder
        const evt = new CustomEvent('app:toast', { detail:{ message: 'Too close for reminder' }});
        window.dispatchEvent(evt);
        return { ...r, [occ.id]: 'no' };
      }
      const cur = r[occ.id] ?? 'no';
      const cycle = ['no', ...options, 'no']; // cycle returns to 'no'
      let idx = cycle.findIndex(v => v === cur);
      if (idx === -1) idx = 0; // treat unknown as 'no'
      let next = cycle[idx+1] ?? 'no';
      // Avoid immediately repeating 'no' if only one option
      if (next === 'no' && cur === 'no' && options.length){
        next = options[0];
      }
      if (next !== 'no'){
        const mins = Math.round(next/60000);
        const evt = new CustomEvent('app:toast', { detail:{ message: `Reminder set: ${mins}m before` }});
        window.dispatchEvent(evt);
      }
      return { ...r, [occ.id]: next };
    });
  }

  function toggleDone(parentKey){
    setDone(d => {
      const n = { ...d };
      if (n[parentKey]) delete n[parentKey]; else {
        // set expiry at next UTC midnight
        const exp = new Date();
        exp.setUTCHours(24,0,0,0);
        n[parentKey] = exp.getTime();
      }
      return n;
    });
  }

  // Chain scheduling with delays (minutes)
  const chainTimersRef = useRef({});
  useEffect(()=>{
    Object.values(chainTimersRef.current).forEach(id=>clearTimeout(id));
    chainTimersRef.current = {};
    if (!chainAlertsEnabled) return;
    allChains.forEach(chain => {
      const events = chain.events || [];
      events.forEach((step, idx) => {
        const next = events[idx+1]; if (!next) return;
        if (done[step.key] && !done[next.key]){
          const delay = step.delay || 0; // meta-spec chains have no delay -> immediate toast
          if (delay<=0){
            const evt = new CustomEvent('app:toast', { detail: { message: `Chain: Next ${next.key} (${chain.name})` }});
            window.dispatchEvent(evt);
            if (desktopNotifsEnabled) fireNotification('Chain Next', `${next.key} (${chain.name})`);
          } else {
            const id = setTimeout(()=>{
              const evt = new CustomEvent('app:toast', { detail: { message: `Chain: ${next.key} soon (${chain.name})` }});
              window.dispatchEvent(evt);
              if (desktopNotifsEnabled) fireNotification('Chain Upcoming', `${next.key} (${chain.name})`);
            }, delay*60*1000);
            chainTimersRef.current[`${chain.name}-${step.key}`]=id;
          }
        }
      });
    });
  },[done, allChains, chainAlertsEnabled, desktopNotifsEnabled]);

  // Derive which events are the immediate next step in each chain (all previous steps done, this one not done)
  useEffect(()=>{
    if (!chainAlertsEnabled){ setChainNextTargets(new Set()); return; }
    const next = new Set();
    allChains.forEach(chain => {
      const evtList = chain.events || [];
      const idx = evtList.findIndex(e => !done[e.key]);
      if (idx <= 0) return; // wait until starter done
      const target = evtList[idx];
      if (target) next.add(target.key);
    });
    setChainNextTargets(next);
  }, [done, allChains, chainAlertsEnabled]);

  // Auto-assign reminders for next chain targets (first upcoming occurrence) if user enabled chain alerts
  useEffect(()=>{
    if (!chainAlertsEnabled || !chainNextTargets.size) return;
    const now = Date.now();
    const occsByKey = new Map();
    occurrences.forEach(o => {
      if (!occsByKey.has(o.parent.key)) occsByKey.set(o.parent.key, []);
      occsByKey.get(o.parent.key).push(o);
    });
    const updates = {};
    chainNextTargets.forEach(key => {
      const list = occsByKey.get(key);
      if (!list) return;
      // earliest future occurrence
      const future = list.filter(o=>o.startTime > now).sort((a,b)=>a.startTime-b.startTime)[0];
      if (!future) return;
      // If already has a reminder skip
      if (reminders[future.id] && reminders[future.id] !== 'no') return;
      // Choose 5m or 2m if less than 5 but more than 2
      const diff = future.startTime - now;
      let val = 5*60000;
      if (diff < 5*60000 && diff >= 2*60000) val = 2*60000;
      if (diff < 2*60000) return; // too close
      updates[future.id] = val;
    });
    if (Object.keys(updates).length){
      setReminders(r => ({ ...r, ...updates }));
    }
  }, [chainNextTargets, chainAlertsEnabled, occurrences, reminders]);

  function toggleCategory(key){
    setCategoryEnabled(c => {
      const next = { ...c, [key]: !c[key] };
      localStorage.setItem(`category-enabled-${key}`, next[key]);
      return next;
    });
  }

  const filtered = useMemo(()=>{
    const term = search.toLowerCase();
    return occurrences.filter(o => {
      if (!categoryEnabled[o.parent.categoryKey]) return false;
      if (favoritesOnly && !favorites.has(o.parent.key)) return false;
      if (alertsOnly){
        const setting = reminders[o.id];
        if (!(setting && setting !== 'no')) return false;
      }
      if (!term) return true;
      const base = o.parent.name.toLowerCase();
      const map = o.event.map?.toLowerCase() || '';
      return base.includes(term) || map.includes(term);
    });
  },[occurrences, search, favoritesOnly, alertsOnly, favorites, reminders, categoryEnabled]);

  // Toast handling
  useEffect(()=>{
    function onToast(e){
      const { message } = e.detail || {};
      if (!message) return;
      const root = document.getElementById('toast-root');
      if (!root) return;
      const el = document.createElement('div');
      el.className = 'fixed bottom-4 right-4 bg-neutral-800 border border-neutral-600 text-sm px-4 py-2 rounded shadow toast-fade';
      el.textContent = message;
      root.appendChild(el);
  // Show for ~2.6s then fade over ~500ms
  setTimeout(()=>{ el.classList.add('opacity-0','translate-y-2'); }, 2600);
  setTimeout(()=>{ el.remove(); }, 3200);
    }
    window.addEventListener('app:toast', onToast);
    return ()=> window.removeEventListener('app:toast', onToast);
  },[]);

  const value = {
    rawData,
  metaSpec,
    occurrences: filtered,
  allChains,
    search, setSearch,
    favoritesOnly, setFavoritesOnly,
    alertsOnly, setAlertsOnly,
    toggleFavorite,
    favorites,
    reminders,
    cycleReminder,
    categoryEnabled,
    toggleCategory,
    bgMode, setBgMode,
    generateBackground,
    done, toggleDone,
    chainAlertsEnabled, setChainAlertsEnabled,
    apiKey, setApiKey, apiAccount, refreshApi,
    autoMarkEnabled, setAutoMarkEnabled,
    weeklyAutoAlertEnabled, setWeeklyAutoAlertEnabled,
    desktopNotifsEnabled, setDesktopNotifsEnabled,
  chainNextTargets,
  chainStarterKeys,
  metaWarnings,
  showProvisional, setShowProvisional,
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(){
  return useContext(EventsContext);
}
