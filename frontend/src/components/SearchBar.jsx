import React from 'react';
import { useEvents } from '../context/EventsContext';

export default function SearchBar(){
  const { search, setSearch } = useEvents();
  return (
    <div className="flex items-center gap-2 w-full md:w-80">
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events..." className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm" />
      {search && <button onClick={()=>setSearch('')} className="text-neutral-400 hover:text-neutral-200 text-sm">✕</button>}
    </div>
  );
}
