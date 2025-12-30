import { useState, useEffect, useRef } from 'react';

const ROWS = ['HI_HAT', 'SNARE_DRUM', 'KICK_DRUM'];
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
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Audio Logic
  const playSound = (row: number, time: number) => {
    if (!audioContext.current) return;
    const ctx = audioContext.current;
    if (row === 2) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
      gain.gain.setValueAtTime(1, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time);
      osc.stop(time + 0.5);
    } else if (row === 1) {
      const bufferSize = ctx.sampleRate * 0.2; 
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
    } else if (row === 0) {
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
     const drawTime = (time - audioContext.current!.currentTime) * 1000;
     setTimeout(() => { setCurrentStep(stepNumber); }, Math.max(0, drawTime));
     gridRef.current.forEach((rowSteps, rowIndex) => {
         if (rowSteps[stepNumber]) playSound(rowIndex, time);
     });
  };

  const nextStep = () => {
    const secondsPerStep = 60.0 / bpmRef.current / 2;
    nextNoteTime.current += secondsPerStep;
    stepRef.current = (stepRef.current + 1) % STEPS;
  };

  const scheduler = () => {
    if (!audioContext.current) return;
    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      scheduleStep(stepRef.current, nextNoteTime.current);
      nextStep();
    }
    timerID.current = window.setTimeout(scheduler, 25.0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (timerID.current) window.clearTimeout(timerID.current);
      setIsPlaying(false);
      return;
    }
    if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.current.state === 'suspended') audioContext.current.resume();
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
    <div className="lab-panel w-full max-w-3xl mx-auto p-8 border border-border-base bg-surface">
      
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-border-base pb-4">
        <div>
            <h2 className="text-sm font-mono font-bold lab-text-main uppercase tracking-widest mb-1">
                SEQUENCER_MODEL_808
            </h2>
            <div className="text-[10px] lab-text-muted font-mono">
                POLYPHONIC_STEP_GENERATOR
            </div>
        </div>

        <div className="flex items-center gap-6 mt-4 md:mt-0">
            <div className="text-right">
                <label className="lab-label block">TEMPO</label>
                <input 
                    type="number" 
                    value={bpm} 
                    onChange={(e) => setBpm(Number(e.target.value))} 
                    className="bg-transparent text-xl font-mono lab-text-main text-right w-16 focus:outline-none border-b border-border-base focus:border-primary"
                />
            </div>

            <button 
                onClick={togglePlay}
                className={`
                    w-24 h-24 flex items-center justify-center font-bold tracking-widest border transition-all text-sm
                    ${isPlaying 
                        ? 'bg-primary text-white border-primary' 
                        : 'bg-surface text-muted border-border-base hover:border-muted hover:text-main'}
                `}
            >
                {isPlaying ? 'STOP' : 'RUN'}
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-px bg-border-base border border-border-base">
        {ROWS.map((name, rowIdx) => (
            <div key={name} className="flex bg-[var(--color-bg-app)]">
                {/* Instrument Label */}
                <div className="w-24 flex items-center px-4 border-r border-border-base bg-surface">
                    <span className="text-[10px] font-mono font-bold lab-text-muted uppercase tracking-tighter">
                        {name}
                    </span>
                </div>
                
                {/* Steps */}
                <div className="flex-1 grid grid-cols-8 gap-px bg-border-base">
                    {Array(STEPS).fill(0).map((_, stepIdx) => {
                        const isActive = grid[rowIdx][stepIdx];
                        const isCurrent = currentStep === stepIdx && isPlaying;
                        
                        return (
                            <button
                                key={stepIdx}
                                onClick={() => toggleStep(rowIdx, stepIdx)}
                                className={`
                                    h-16 w-full transition-colors duration-0 focus:outline-none relative
                                    ${isActive 
                                        ? 'bg-primary' 
                                        : 'bg-surface hover:bg-[var(--color-bg-app)]'}
                                `}
                            >
                                {isCurrent && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-text-main)]`}></div>
                                )}
                                {isActive && (
                                     <div className="w-2 h-2 bg-white opacity-40 mx-auto rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>
      
      {/* Step Markers */}
      <div className="flex pl-24 mt-1">
         <div className="flex-1 grid grid-cols-8 gap-px">
            {Array(STEPS).fill(0).map((_, i) => (
                <div key={i} className="text-center">
                    <span className="text-[10px] font-mono lab-text-muted">{i + 1}</span>
                </div>
            ))}
         </div>
      </div>

    </div>
  );
}
