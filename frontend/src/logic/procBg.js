const cache = {};

export function generateBackground(categoryKey){
  const mode = localStorage.getItem('bg-style') || 'generated';
  if (mode === 'plain') return 'none';
  if (cache[categoryKey]) return cache[categoryKey];
  const canvas = document.createElement('canvas');
  canvas.width = 480; canvas.height = 160;
  const ctx = canvas.getContext('2d');
  const palettes = {
    general: ['#2b2f3a','#394152','#1d2229','#556070'],
    core: ['#331010','#5a1a16','#752520','#3d1614'],
    ls1: ['#361111','#551a18','#7a2520','#461a18'],
    ls2: ['#3c3622','#6d602c','#9a8c45','#2a2518'],
    hot: ['#0d2e16','#124226','#1f5c35','#08351b'],
    ls3: ['#0b3a2f','#145245','#1b6a5b','#094137'],
    pof: ['#4a2410','#7a3a18','#b65825','#5a2e14'],
    ls4: ['#26163f','#3d2363','#552f8b','#180d2b'],
    ls5: ['#0d2347','#12315f','#1b4685','#08162b'],
    eod: ['#0b2a2f','#114149','#16606b','#072125'],
    soto: ['#3e3409','#5e4c0f','#7d6313','#271f05'],
    janthir: ['#1c2d35','#2b4754','#375b6b','#122027'],
    Festivals: ['#3c1d04','#5e2c07','#8a420d','#281203']
  };
  const colors = palettes[categoryKey] || ['#1d1d1f','#2a2a2d','#333336','#232326'];
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0, colors[0]); g.addColorStop(1, colors[3]);
  ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
  for (let l=0;l<4;l++){
    ctx.globalAlpha = 0.08 + l*0.05;
    ctx.fillStyle = colors[(l+1)%colors.length];
    ctx.beginPath();
    const peaks = 5 + Math.floor(Math.random()*4);
    const yBase = canvas.height * (0.3 + 0.6*(l/4));
    ctx.moveTo(0, canvas.height);
    for(let i=0;i<=peaks;i++){
      const x = (i/peaks)*canvas.width;
      const y = yBase + Math.sin(i+Math.random()*0.8)*15*(1-l/4);
      ctx.lineTo(x,y);
    }
    ctx.lineTo(canvas.width, canvas.height); ctx.closePath(); ctx.fill();
  }
  const url = canvas.toDataURL('image/webp',0.7);
  cache[categoryKey] = url;
  return url;
}
