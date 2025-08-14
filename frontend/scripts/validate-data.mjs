#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd(), 'public');
const eventsPath = path.join(root, 'events.json');
const specPath = path.join(root, 'meta-spec.json');

function load(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }

try {
  const events = load(eventsPath);
  const spec = load(specPath);
  const parentSet = new Set(events.parentEvents.map(p=>p.key));
  const missingParents = spec.events.filter(e => e.status !== 'missing' && !parentSet.has(e.key)).map(e=>e.key);
  const unusedParents = events.parentEvents.filter(p => !spec.events.find(e=>e.key===p.key)).map(p=>p.key);
  const dupParents = events.parentEvents.map(p=>p.key).filter((k,i,a)=> a.indexOf(k)!==i);
  const report = { missingParents, unusedParents, dupParents, counts: { parentEvents: events.parentEvents.length, specEvents: spec.events.length, chains: (spec.chains||[]).length } };
  if (missingParents.length){ console.error('Missing parent events referenced by meta-spec:', missingParents); }
  if (dupParents.length){ console.error('Duplicate parent event keys:', dupParents); }
  console.log(JSON.stringify(report,null,2));
  if (missingParents.length || dupParents.length){ process.exitCode = 1; }
} catch (e){
  console.error('Validation failed', e);
  process.exitCode = 1;
}
