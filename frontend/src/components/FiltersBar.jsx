import React from 'react';
import { useEvents } from '../context/EventsContext';

export default function FiltersBar(){
  const { favoritesOnly, setFavoritesOnly, alertsOnly, setAlertsOnly, chainAlertsEnabled, setChainAlertsEnabled, apiKey, setApiKey, apiAccount, refreshApi, autoMarkEnabled, setAutoMarkEnabled, weeklyAutoAlertEnabled, setWeeklyAutoAlertEnabled, desktopNotifsEnabled, setDesktopNotifsEnabled, showProvisional, setShowProvisional } = useEvents();
  return (
    <div className="flex gap-2 text-xs flex-wrap items-center">
      <button onClick={()=>setFavoritesOnly(f=>!f)} className={`px-3 py-1 rounded border ${favoritesOnly? 'bg-yellow-500 text-black border-yellow-400':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>Favorites</button>
      <button onClick={()=>setAlertsOnly(f=>!f)} className={`px-3 py-1 rounded border ${alertsOnly? 'bg-emerald-600 border-emerald-500':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>Alerts</button>
      <button onClick={()=>{ const nv = !chainAlertsEnabled; setChainAlertsEnabled(nv); localStorage.setItem('chain-alerts-enabled', JSON.stringify(nv)); }} className={`px-3 py-1 rounded border ${chainAlertsEnabled? 'bg-indigo-600 border-indigo-500':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>Chains</button>
      <button onClick={()=>{ const nv=!autoMarkEnabled; setAutoMarkEnabled(nv); }} className={`px-3 py-1 rounded border ${autoMarkEnabled? 'bg-teal-600 border-teal-500':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>AutoMark</button>
      <button onClick={()=>{ const nv=!weeklyAutoAlertEnabled; setWeeklyAutoAlertEnabled(nv); }} className={`px-3 py-1 rounded border ${weeklyAutoAlertEnabled? 'bg-pink-600 border-pink-500':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>Weekly5m</button>
  <button onClick={()=>{ const nv=!desktopNotifsEnabled; setDesktopNotifsEnabled(nv); }} className={`px-3 py-1 rounded border ${desktopNotifsEnabled? 'bg-blue-600 border-blue-500':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>Desktop</button>
  <button onClick={()=>{ const nv=!showProvisional; setShowProvisional(nv); }} className={`px-3 py-1 rounded border ${showProvisional? 'bg-neutral-600 border-neutral-500':'bg-neutral-800 border-neutral-600 hover:bg-neutral-700'}`}>Prov</button>
      <div className="flex items-center gap-1 border border-neutral-600 rounded px-2 py-1 bg-neutral-800">
        <input value={apiKey} onChange={e=>setApiKey(e.target.value.trim())} placeholder="API Key" className="bg-transparent outline-none text-[10px] w-28" />
        <button onClick={()=>refreshApi(true)} className="text-[10px] px-2 py-0.5 bg-neutral-700 rounded hover:bg-neutral-600">Sync</button>
        {apiAccount && <span className="text-[10px] text-emerald-400">{apiAccount.name}</span>}
      </div>
    </div>
  );
}
