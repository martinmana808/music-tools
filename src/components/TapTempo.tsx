import { useTapTempo } from '../lib/useTapTempo';

interface TapTempoProps {
  /** Fired whenever a new tempo is detected, so a host can sync to it. */
  onBpmDetected?: (bpm: number) => void;
  /** Drop the standalone panel chrome when rendered inside another panel. */
  embedded?: boolean;
}

export default function TapTempo({ onBpmDetected, embedded = false }: TapTempoProps = {}) {
  const { bpm, tap: handleTap, reset: handleReset } = useTapTempo({ onBpmDetected });

  return (
    <div className={embedded ? 'w-full border border-border-base' : 'lab-panel w-full max-w-sm mx-auto p-0 relative'}>

      <div className={`text-center border-b border-border-base ${embedded ? 'p-6' : 'p-12'}`}>
          <label className="lab-label block mb-4">DETECTED_TEMPO</label>
          <div className={`font-black font-mono lab-text-main tabular-nums leading-none tracking-tighter ${embedded ? 'text-5xl' : 'text-8xl'}`}>
            {bpm || '--'}
          </div>
          <div className="text-xs font-mono lab-text-muted uppercase mt-2 tracking-widest">
            BPM / AVG_8_TAPS
          </div>
      </div>

      <button
          onMouseDown={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
          className={`w-full bg-surface hover:bg-[var(--color-bg-app)] active:bg-primary active:text-white lab-text-muted font-bold text-xl tracking-[0.3em] uppercase transition-colors ${embedded ? 'h-28' : 'h-48'}`}
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
