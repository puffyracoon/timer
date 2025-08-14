// GW2 Meta Spec Validation Script
// Usage: node validate-meta-spec.js
const fs = require('fs');
const path = require('path');

const eventsPath = path.join(__dirname, 'events.json');
const metaSpecPath = path.join(__dirname, 'data', 'meta-spec.json');

const events = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const metaSpec = JSON.parse(fs.readFileSync(metaSpecPath, 'utf8'));

const parentKeys = new Set(events.parentEvents.map(e => e.key));
const metaKeys = new Set(metaSpec.events.map(e => e.key));

const missingInMeta = [...parentKeys].filter(k => !metaKeys.has(k));
const unusedInMeta = [...metaKeys].filter(k => !parentKeys.has(k));

console.log('--- Meta Spec Validation ---');
if (missingInMeta.length) {
  console.log('Missing in meta-spec:', missingInMeta);
} else {
  console.log('All parent events are covered in meta-spec.');
}
if (unusedInMeta.length) {
  console.log('Unused in meta-spec:', unusedInMeta);
} else {
  console.log('No unused meta-spec events.');
}

// Check for schedule/type mismatches
for (const key of parentKeys) {
  const event = events.parentEvents.find(e => e.key === key);
  const meta = metaSpec.events.find(e => e.key === key);
  if (!meta) continue;
  if (event.name !== meta.name) {
    console.log(`Name mismatch for ${key}: events.json='${event.name}' meta-spec='${meta.name}'`);
  }
  if (event.map && meta.map && event.map !== meta.map) {
    console.log(`Map mismatch for ${key}: events.json='${event.map}' meta-spec='${meta.map}'`);
  }
}
console.log('Validation complete.');
