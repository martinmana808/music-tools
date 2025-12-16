import { useState, useEffect, useRef } from 'react';

const ROWS = ['HiHat', 'Snare', 'Kick'];
const STEPS = 8;
const INITIAL_BPM = 120;

export default function Sequencer() {
  const [grid, setGrid] = useState<boolean[][]>(
    Array(3).fill(null).map(() => Array(STEPS).fill(false))
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(INITIAL_BPM);

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const stepRef = useRef(0);
  const timerID = useRef<number | null>(null);
  
  // Need to access grid state inside scheduler without closure staleness
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);

  // Use Ref for BPM to avoid stale closures in recursive scheduler
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Synthesis
  const playSound = (row: number, time: number) => {
    if (!audioContext.current) return;
    const ctx = audioContext.current;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    // Kick (Row 2)
    if (row === 2) {
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.5);
    }
    // Snare (Row 1) - Noise burst + Tone
    else if (row === 1) {
      // Noise
      const bufferSize = ctx.sampleRate * 0.2; // 200ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 1000;
      const noiseEnvelope = ctx.createGain();
      noiseEnvelope.gain.setValueAtTime(1, time);
      noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseEnvelope);
      noiseEnvelope.connect(ctx.destination);
      noise.start(time);

      // Tone
      const oscS = ctx.createOscillator();
      const oscEnv = ctx.createGain();
      oscS.type = 'triangle';
      oscS.frequency.setValueAtTime(250, time);
      oscEnv.gain.setValueAtTime(0.5, time);
      oscEnv.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      oscS.connect(oscEnv);
      oscEnv.connect(ctx.destination);
      oscS.start(time);
      oscS.stop(time + 0.2);
    }
    // HiHat (Row 0)
    else if (row === 0) {
       // High pass noise
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 5000;
      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0.7, time);
      envelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      
      noise.connect(filter);
      filter.connect(envelope);
      envelope.connect(ctx.destination);
      noise.start(time);
    }
  };

  const scheduleStep = (stepNumber: number, time: number) => {
     // Visual update
     // Use a timeout to sync UI with audio roughly
     const drawTime = (time - audioContext.current!.currentTime) * 1000;
     setTimeout(() => {
         setCurrentStep(stepNumber);
     }, Math.max(0, drawTime));

     // Play sounds
     gridRef.current.forEach((rowSteps, rowIndex) => {
         if (rowSteps[stepNumber]) {
             playSound(rowIndex, time);
         }
     });
  };

  const nextStep = () => {
    const secondsPerStep = 60.0 / bpmRef.current / 2; // 8th notes
    nextNoteTime.current += secondsPerStep;
    stepRef.current = (stepRef.current + 1) % STEPS;
  };

  const scheduler = () => {
    if (!audioContext.current) return;
    const lookahead = 25.0;
    const scheduleAheadTime = 0.1;

    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      scheduleStep(stepRef.current, nextNoteTime.current);
      nextStep();
    }
    timerID.current = window.setTimeout(scheduler, lookahead);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (timerID.current) window.clearTimeout(timerID.current);
      setIsPlaying(false);
      return;
    }

    if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
    }

    setIsPlaying(true);
    stepRef.current = 0;
    nextNoteTime.current = audioContext.current.currentTime + 0.05;
    scheduler();
  };

  const toggleStep = (row: number, col: number) => {
    const newGrid = [...grid];
    newGrid[row][col] = !newGrid[row][col];
    setGrid(newGrid);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>8-Step Sequencer</h2>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', gap: '2rem', alignItems: 'center' }}>
          <button 
            onClick={togglePlay}
            style={{ 
                background: isPlaying ? '#ff4757' : 'var(--primary-color)',
                borderColor: 'transparent',
                width: '100px'
            }}
          >
            {isPlaying ? 'STOP' : 'PLAY'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{bpm} BPM</span>
              <input 
                type="range" 
                min="60" 
                max="200" 
                value={bpm} 
                onChange={(e) => setBpm(Number(e.target.value))} 
                style={{ width: '100px' }}
              />
          </div>
      </div>

      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {ROWS.map((name, rowIdx) => (
            <div key={name} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ width: '60px', textAlign: 'right', marginRight: '0.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {name}
                </div>
                {Array(STEPS).fill(0).map((_, stepIdx) => (
                    <button
                        key={stepIdx}
                        onClick={() => toggleStep(rowIdx, stepIdx)}
                        style={{
                            width: '40px',
                            height: '40px',
                            padding: 0,
                            borderRadius: '4px',
                            background: grid[rowIdx][stepIdx] ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                            borderColor: currentStep === stepIdx && isPlaying ? '#fff' : (grid[rowIdx][stepIdx] ? 'var(--primary-color)' : 'transparent'),
                            outline: currentStep === stepIdx && isPlaying ? '2px solid rgba(255,255,255,0.5)' : 'none',
                        }}
                    />
                ))}
            </div>
        ))}
      </div>
    </div>
  );
}
