import { useState, useEffect } from 'react';

export default function TapTempo() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);

  useEffect(() => {
    if (taps.length > 1) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.round(60000 / avgInterval));
    }
  }, [taps]);

  const handleTap = () => {
    const now = Date.now();
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      setTaps([now]);
      setBpm(null);
      return;
    }
    const newTaps = [...taps, now].slice(-8);
    setTaps(newTaps);
  };

  const handleReset = () => {
    setTaps([]);
    setBpm(null);
  };

  return (
    <div className="lab-panel w-full max-w-sm mx-auto p-0 relative">
       
      <div className="p-12 text-center border-b border-border-base">
          <label className="lab-label block mb-4">DETECTED_TEMPO</label>
          <div className="text-8xl font-black font-mono lab-text-main tabular-nums leading-none tracking-tighter">
            {bpm || '--'}
          </div>
          <div className="text-xs font-mono lab-text-muted uppercase mt-2 tracking-widest">
            BPM / AVG_8_TAPS
          </div>
      </div>

      <button 
          onMouseDown={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(); }} 
          className="w-full h-48 bg-surface hover:bg-[var(--color-bg-app)] active:bg-primary active:text-white lab-text-muted font-bold text-xl tracking-[0.3em] uppercase transition-colors"
        >
          TAP_INPUT
      </button>
        
      <button 
            onClick={handleReset} 
             className="w-full py-3 text-[10px] font-mono lab-text-muted hover:text-[var(--color-text-main)] hover:bg-surface border-t border-border-base uppercase tracking-widest transition-colors"
        >
          RESET_COUNTER
      </button>
    </div>
  );
}
