import { useState, useEffect } from 'react';

export default function TapTempo() {
  const [bpm, setBpm] = useState<number | null>(null);
  const [taps, setTaps] = useState<number[]>([]);
  const [message, setMessage] = useState('Tap the button to start');

  useEffect(() => {
    if (taps.length > 1) {
      // Calculate intervals
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      
      // Average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      
      // Calculate BPM
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
      setMessage('Keep tapping to refine');
    }
  }, [taps]);

  const handleTap = () => {
    const now = Date.now();
    
    // Reset if it's been a while (2 seconds)
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      setTaps([now]);
      setBpm(null);
      setMessage('Tap to start');
      return;
    }

    // Keep last 8 taps for rolling average
    const newTaps = [...taps, now].slice(-8);
    setTaps(newTaps);
  };

  const handleReset = () => {
    setTaps([]);
    setBpm(null);
    setMessage('Tap the button to start');
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Tap Tempo</h2>
      
      <div style={{ 
        fontSize: '4rem', 
        fontWeight: 'bold', 
        color: bpm ? 'var(--primary-color)' : 'var(--text-muted)',
        fontVariantNumeric: 'tabular-nums',
        minHeight: '1.2em',
        marginBottom: '0.5rem'
      }}>
        {bpm || '--'}
      </div>
      
      <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        {bpm ? 'BPM' : message}
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <button 
          onMouseDown={handleTap}
          style={{ 
            height: '120px', 
            fontSize: '1.5rem',
            background: 'linear-gradient(145deg, var(--surface-hover), var(--surface-color))',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}
        >
          TAP
        </button>
        
        <button onClick={handleReset} style={{ background: 'transparent', borderColor: 'transparent', color: 'var(--text-muted)' }}>
          Reset
        </button>
      </div>
    </div>
  );
}
