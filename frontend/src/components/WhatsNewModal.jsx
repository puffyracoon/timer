import React, { useEffect } from 'react';

const WHATS_VERSION = '2025-08-13a';
const CHANGES = [
  'React rewrite core parity (events, filters, reminders, favorites)',
  'API integration (auto-mark, weekly 5m reminder)',
  'Chain alerts (simplified)',
  'Procedural backgrounds + regenerate',
  'Waypoint copy & overflow menu',
];

export default function WhatsNewModal(){
  const [open, setOpen] = React.useState(false);
  useEffect(()=>{
    const dismissed = localStorage.getItem('whats-dismissed');
    if (dismissed !== WHATS_VERSION) setTimeout(()=>setOpen(true), 600);
  },[]);
  function close(persist){
    if (persist) localStorage.setItem('whats-dismissed', WHATS_VERSION);
    setOpen(false);
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/60" onClick={()=>close(false)} />
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">What's New</h2>
          <button onClick={()=>close(false)} className="text-neutral-400 hover:text-neutral-200">✕</button>
        </div>
        <p className="text-xs text-neutral-400">Version {WHATS_VERSION}</p>
        <ul className="text-sm list-disc pl-5 space-y-1">
          {CHANGES.map(c=> <li key={c}>{c}</li>)}
        </ul>
        <div className="flex gap-2 justify-end">
          <button onClick={()=>close(false)} className="px-3 py-1 text-xs rounded bg-neutral-800 border border-neutral-600 hover:bg-neutral-700">Close</button>
          <button onClick={()=>close(true)} className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500">Don't show again</button>
        </div>
      </div>
    </div>
  );
}
