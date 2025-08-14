import React from 'react';

export default function FAQModal({ open, onClose }){
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-6 max-h-[70vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">How to Use</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">✕</button>
        </div>
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h3 className="font-semibold mb-1">Cards & Timing</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>Local Time:</strong> Each card shows the start time in your local timezone.</li>
              <li><strong>Countdown:</strong> Appears when under 15m. Color shifts (amber &lt;5m, pulsing red &lt;1m).</li>
              <li><strong>Sched Badge:</strong> Means the time comes from the new schedule spec (may be provisional).</li>
              <li><strong>Boss / Start / Next Badges:</strong> Boss = world boss. Start = first step of a chain. Next = next incomplete step (all previous marked done).</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Interaction Buttons</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong>★ Favorite:</strong> Toggle and use Favorites filter to show only starred metas.</li>
              <li><strong>🔔 Reminder:</strong> Cycles through allowed lead times (2/5/10m) that still fit before start; auto skips ones that are too late.</li>
              <li><strong>✓ Done:</strong> Marks the meta complete until the next UTC reset (used for chain progression logic).</li>
              <li><strong>📖 Wiki / ⚡ FastFarm:</strong> Opens external resources when links exist.</li>
              <li><strong>🧭 Copy:</strong> Copies Name + Start Time + Waypoint (if present) to clipboard.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Chains & Roadmap Tooltip</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Hover badges area to see a scrollable chain roadmap listing every step, its done state, and ETA to next occurrence.</li>
              <li>When you mark a step done, the system highlights (Next) the next unmet step.</li>
              <li>If Chain Alerts are enabled, you get a toast / optional desktop notification when the next step becomes relevant.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Reminders & Alerts</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Reminders fire a toast + sound; desktop notifications can be enabled in settings (browser permission required).</li>
              <li>Weekly Auto Alert tries to pre-set a reminder for the next uncompleted weekly meta.</li>
              <li>Chain Auto-Reminder: next chain step gets an automatic reminder (5m or 2m if closer) if you haven’t set one.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Meta Spec & Provisional Times</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>A new data file merges authoritative schedules with placeholders (provisional) while we verify exact spawn windows.</li>
              <li>Use the Prov toggle to hide provisional / missing schedule events.</li>
              <li>Sched badge + tooltip note remind you that ETAs may shift once confirmed.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Persistence</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Favorites, reminders, done markers, and toggles persist in your browser’s localStorage.</li>
              <li>Done markers reset automatically at next UTC midnight.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">API Integration</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Enter a GW2 API key (account, progression) to auto-mark metas tied to your daily/weekly achievements and Wizard’s Vault tasks.</li>
              <li>Auto-marking runs periodically; disable via the Auto Mark toggle if undesired.</li>
            </ul>
          </section>
          <section>
            <h3 className="font-semibold mb-1">Tips</h3>
            <ul className="list-disc ml-5 space-y-1">
              <li>Combine Favorites + Search (e.g. map name) to narrow quickly.</li>
              <li>If a reminder option seems to skip, the event is too close for that lead time.</li>
              <li>Hover different chain steps’ cards to compare ETAs and route planning.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
