export function getNow(){ return new Date(); }

export function buildOccurrences(data, now){
  const out = [];
  if (!data?.events) return out;
  const today = now;
  const baseDay = today.getDate();
  const maxWindow = 5 * 60 * 60 * 1000; // 5h ahead
  for (const ev of data.events){
    const parent = data.parentEvents.find(p => p.key === ev.parentKey);
    if (!parent) continue;
    for (const start of ev.start){
      const [h,m] = start.split(':').map(Number);
      const dt = new Date();
      dt.setHours(h,m,0,0);
      if (dt < now) dt.setDate(baseDay+1); // next day
      if (dt.getTime() - now.getTime() > maxWindow) continue; // skip beyond window
      out.push({
        id: `${start}-${parent.key}`,
        parent,
        startUtc: start,
        startTime: dt.getTime(),
        event: ev,
      });
    }
  }
  out.sort((a,b)=> a.startTime - b.startTime);
  return out;
}

// Build occurrences from meta spec (schedule list of minutes past midnight or explicit HH:MM list later)
export function buildOccurrencesFromMetaSpec(metaSpec, parentsIndex, now){
  if (!metaSpec?.events) return [];
  const windowMs = 5*60*60*1000;
  const nowMs = now.getTime();
  const today = new Date(nowMs);
  const midnight = new Date(today); midnight.setHours(0,0,0,0);
  const results = [];
  for (const ev of metaSpec.events){
    if (ev.status === 'missing') continue; // skip placeholders
    const parent = parentsIndex.get(ev.key);
    if (!parent) continue;
    // If schedule array is populated with minute offsets
    if (Array.isArray(ev.schedule) && ev.schedule.length){
      for (const minuteOfDay of ev.schedule){
        const baseTs = midnight.getTime() + minuteOfDay*60000;
        let t = new Date(baseTs);
        if (t.getTime() < nowMs) t = new Date(baseTs + 24*60*60000);
        const diff = t.getTime() - nowMs;
        if (diff >=0 && diff <= windowMs){
          results.push({ id: `${ev.key}-${t.getTime()}`, parent, startUtc: '', startTime: t.getTime(), event: { parentKey: ev.key, waypoint: parent.waypoint||'', map: ev.map || '', scheduleRef: true }});
        }
      }
    } else if (ev.intervalMinutes){
      // Derive upcoming occurrences based on interval from midnight (approximation)
      const sinceMid = Math.floor((nowMs - midnight.getTime())/60000);
      const nextIndex = Math.floor(sinceMid/ev.intervalMinutes)+1;
      for (let k=0;k<3;k++){
        const minuteOfDay = (nextIndex + k)*ev.intervalMinutes;
        let t = new Date(midnight.getTime() + minuteOfDay*60000);
        if (t.getTime() - nowMs > windowMs) break;
        results.push({ id: `${ev.key}-${t.getTime()}`, parent, startUtc: '', startTime: t.getTime(), event: { parentKey: ev.key, waypoint: parent.waypoint||'', map: ev.map || '', scheduleRef: true }});
      }
    }
  }
  results.sort((a,b)=>a.startTime-b.startTime);
  return results;
}

export function formatCountdown(ms){
  if (ms < 0) return '0:00';
  const m = Math.floor(ms/60000);
  const s = Math.floor((ms%60000)/1000);
  return `${m}:${String(s).padStart(2,'0')}`;
}

export function formatLocal(timeMs){
  const d = new Date(timeMs);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
