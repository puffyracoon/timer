import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Timer(){
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running){
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (intervalRef.current){
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => intervalRef.current && clearInterval(intervalRef.current);
  }, [running]);

  function reset(){
    setSeconds(0);
  }

  return (
    <motion.div
      initial={{opacity:0, y:10}}
      animate={{opacity:1, y:0}}
      className="rounded-lg border border-neutral-700 p-6 bg-neutral-800/60 backdrop-blur-sm shadow-md flex flex-col items-center gap-4"
    >
      <div className="text-6xl font-mono tabular-nums">{seconds}</div>
      <div className="flex gap-3">
        <button onClick={() => setRunning(r => !r)} className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-sm font-medium transition">
          {running ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="px-5 py-2 rounded bg-red-600 hover:bg-red-500 text-sm font-medium transition">Reset</button>
      </div>
      <AnimatePresence mode="wait">
        {running && (
          <motion.div key="running" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-xs uppercase tracking-wide text-emerald-400">Running...</motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
