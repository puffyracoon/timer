import React, { useState } from 'react';
import { EventsProvider } from './context/EventsContext';
import EventBoard from './components/EventBoard';
import CategorySidebar from './components/CategorySidebar';
import SearchBar from './components/SearchBar';
import FiltersBar from './components/FiltersBar';
import FAQModal from './components/FAQModal';
import WhatsNewModal from './components/WhatsNewModal';

export default function App(){
  const [faqOpen, setFaqOpen] = useState(false);
  return (
    <EventsProvider>
      <div className="min-h-screen flex flex-col lg:flex-row bg-neutral-900 text-neutral-100">
        <aside className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-neutral-800 bg-neutral-900/70 backdrop-blur p-4 sticky top-0 max-h-screen overflow-y-auto">
          <h1 className="text-2xl font-bold mb-4">Puffy's Timers</h1>
          <CategorySidebar />
        </aside>
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="w-full border-b border-neutral-800 p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between sticky top-0 backdrop-blur bg-neutral-900/80 z-10">
            <SearchBar />
            <div className="flex items-center gap-3">
              <FiltersBar />
              <button onClick={()=>setFaqOpen(true)} className="text-xs px-3 py-1 rounded border bg-neutral-800 border-neutral-600 hover:bg-neutral-700">FAQ</button>
            </div>
          </header>
          <EventBoard />
          <div id="toast-root" />
          <FAQModal open={faqOpen} onClose={()=>setFaqOpen(false)} />
          <WhatsNewModal />
        </main>
      </div>
    </EventsProvider>
  );
}
