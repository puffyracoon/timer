import React from 'react';
import { useEvents } from '../context/EventsContext';
import EventCard from './EventCard';

export default function EventBoard(){
  const { occurrences, rawData } = useEvents();
  if (!rawData) return <div className="p-6">Loading events...</div>;
  return (
    <div className="p-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr">
      {occurrences.map(o => <EventCard key={o.id} occ={o} />)}
      {occurrences.length===0 && <div className="col-span-full text-sm text-neutral-400">No events match filters.</div>}
    </div>
  );
}
