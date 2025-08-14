import React from 'react';
import { useEvents } from '../context/EventsContext';

export default function CategorySidebar(){
  const { rawData, categoryEnabled, toggleCategory, bgMode, setBgMode } = useEvents();
  if (!rawData) return null;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-semibold mb-2">Categories</h2>
        <div className="flex flex-col gap-1">
          {rawData.categories.map(c => (
            <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!categoryEnabled[c.key]} onChange={()=>toggleCategory(c.key)} />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-2 text-xs">
          <button onClick={()=> rawData.categories.forEach(c=>toggleCategoryIf(false, c.key, true))} className="px-2 py-1 bg-neutral-800 rounded border border-neutral-600 hover:bg-neutral-700">Select All</button>
          <button onClick={()=> rawData.categories.forEach(c=>toggleCategoryIf(true, c.key, false))} className="px-2 py-1 bg-neutral-800 rounded border border-neutral-600 hover:bg-neutral-700">Select None</button>
        </div>
      </div>
      <div>
        <h2 className="font-semibold mb-2">Backgrounds</h2>
        <div className="flex flex-col gap-1 text-sm">
          <label className="flex gap-2 items-center"><input type="radio" name="bg-mode" value="generated" checked={bgMode==='generated'} onChange={()=>{localStorage.setItem('bg-style','generated'); setBgMode('generated');}} /> Generated</label>
          <label className="flex gap-2 items-center"><input type="radio" name="bg-mode" value="plain" checked={bgMode==='plain'} onChange={()=>{localStorage.setItem('bg-style','plain'); setBgMode('plain');}} /> Plain</label>
        </div>
        <button onClick={()=>{ Object.keys(localStorage).filter(k=>k.startsWith('bg-')).forEach(k=>localStorage.removeItem(k)); window.dispatchEvent(new CustomEvent('app:toast',{detail:{message:'Backgrounds cleared'}})); }} className="mt-2 text-xs px-2 py-1 rounded border bg-neutral-800 border-neutral-600 hover:bg-neutral-700">Regenerate</button>
      </div>
    </div>
  );

  function toggleCategoryIf(expectCurrent, key, setTo){
    const cur = categoryEnabled[key];
    if (cur === expectCurrent) toggleCategory(key); // reuse toggle function
    if (setTo !== undefined && setTo === cur) return; // already desired
  }
}
