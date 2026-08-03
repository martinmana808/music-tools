import { useState, useEffect, useRef } from 'react';
import { loadDrumKit, triggerSample, type DrumKit, type DrumVoice, type KitStatus } from '../lib/drumKit';
import { PRESETS, STEPS, emptyGrid, cloneGrid } from '../lib/presets';
import { useTapTempo, MIN_BPM, MAX_BPM } from '../lib/useTapTempo';

const ROWS = ['HI_HAT', 'SNARE_DRUM', 'KICK_DRUM'];
/** Row index -> sample voice. Must stay aligned with ROWS. */
const ROW_VOICES: DrumVoice[] = ['hihat', 'snare', 'kick'];
const INITIAL_BPM = 120;
const SCHEDULE_AHEAD_TIME = 0.1;

const KIT_LABEL: Record<KitStatus, string> = {
  idle: 'STANDBY',
  loading: 'LOADING...',
  sampled: 'SAMPLED_808',
  fallback: 'SYNTH_FALLBACK',
};

export default function Sequencer() {
  const [grid, setGrid] = useState<boolean[][]>(emptyGrid);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(INITIAL_BPM);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [kitStatus, setKitStatus] = useState<KitStatus>('idle');

  const audioContext = useRef<AudioContext | null>(null);
  const kitRef = useRef<DrumKit>({});

  const { tap: tapTempo, tapCount } = useTapTempo({ onBpmDetected: setBpm });
  const nextNoteTime = useRef(0);
  const stepRef = useRef(0);
  const timerID = useRef<number | null>(null);
  const gridRef = useRef(grid);
  useEffect(() => { gridRef.current = grid; }, [grid]);
  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Audio Logic — real samples where available, synthesis as a safety net
  const playSound = (row: number, time: number) => {
    if (!audioContext.current) return;
    const ctx = audioContext.current;
    if (triggerSample(ctx, kitRef.current, ROW_VOICES[row], time)) return;
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
    while (nextNoteTime.current < audioContext.current.currentTime + SCHEDULE_AHEAD_TIME) {
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

    // First run: decode the kit. Playback starts immediately on synthesis and
    // upgrades to samples the moment they land.
    if (kitStatus === 'idle') {
      setKitStatus('loading');
      const ctx = audioContext.current;
      loadDrumKit(ctx).then((kit) => {
        kitRef.current = kit;
        setKitStatus(Object.keys(kit).length === ROW_VOICES.length ? 'sampled' : 'fallback');
      });
    }

    setIsPlaying(true);
    stepRef.current = 0;
    nextNoteTime.current = audioContext.current.currentTime + 0.05;
    scheduler();
  };

  const toggleStep = (row: number, col: number) => {
    setGrid((prev) =>
      prev.map((steps, r) => (r === row ? steps.map((on, c) => (c === col ? !on : on)) : steps))
    );
    setActivePreset(null);
  };

  const loadPreset = (name: string, patternGrid: boolean[][]) => {
    setGrid(cloneGrid(patternGrid));
    setActivePreset(name);
  };

  const clearGrid = () => {
    setGrid(emptyGrid());
    setActivePreset(null);
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

        <div className="flex items-end gap-6 mt-4 md:mt-0 w-full md:w-auto">
            <div className="flex-1 md:w-56">
                <label className="lab-label flex justify-between items-baseline">
                    <span>TEMPO</span>
                    <span className="text-primary font-bold text-base tabular-nums">{bpm}</span>
                </label>

                <input
                    type="range"
                    min={MIN_BPM}
                    max={MAX_BPM}
                    value={bpm}
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className="w-full h-1 bg-border-base appearance-none cursor-pointer accent-[var(--color-text-main)] hover:accent-primary block mt-3 mb-2"
                />

                <div className="flex justify-between items-center text-[10px] font-mono lab-text-muted">
                    <span>{MIN_BPM}</span>
                    <button
                        onClick={tapTempo}
                        className="px-3 py-1 border border-border-base bg-surface lab-text-muted hover:border-primary hover:text-primary active:bg-primary active:text-white uppercase tracking-widest transition-colors"
                    >
                        TAP{tapCount > 0 && ` · ${tapCount}`}
                    </button>
                    <span>{MAX_BPM}</span>
                </div>
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

      {/* Preset Bank */}
      <div className="mb-6">
        <label className="lab-label block mb-2">PATTERN_BANK</label>
        <div className="flex flex-wrap gap-px bg-border-base border border-border-base">
            {PRESETS.map((preset) => (
                <button
                    key={preset.name}
                    onClick={() => loadPreset(preset.name, preset.grid)}
                    className={`
                        flex-1 min-w-[80px] px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors
                        ${activePreset === preset.name
                            ? 'bg-[var(--color-text-main)] text-[var(--color-bg-panel)] font-bold'
                            : 'bg-surface lab-text-muted hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-main)]'}
                    `}
                >
                    {preset.name}
                </button>
            ))}
            <button
                onClick={clearGrid}
                className="flex-1 min-w-[80px] px-3 py-2 text-[10px] font-mono uppercase tracking-widest bg-surface lab-text-muted hover:bg-red-500 hover:text-white transition-colors"
            >
                CLEAR
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

      <div className="mt-8 flex gap-8 text-[10px] font-mono lab-text-muted border-t border-border-base pt-4 uppercase tracking-widest">
          <div>KIT: <span className={kitStatus === 'fallback' ? 'text-red-500 font-bold' : 'lab-text-main'}>{KIT_LABEL[kitStatus]}</span></div>
          <div>PATTERN: <span className="lab-text-main">{activePreset ?? 'CUSTOM'}</span></div>
      </div>

    </div>
  );
}
