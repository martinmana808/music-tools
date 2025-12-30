import { useState, useEffect, useRef } from 'react';

export default function Metronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState<number | null>(null);
  const visualTimersRef = useRef<number[]>([]);

  // Practice Mode State
  const [practiceMode, setPracticeMode] = useState(false);
  const [startBpm, setStartBpm] = useState(100);
  const [targetBpm, setTargetBpm] = useState(120);
  const [duration, setDuration] = useState(30); 
  const [elapsedTime, setElapsedTime] = useState(0);

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const currentBeatRef = useRef(0);
  const timerID = useRef<number | null>(null);
  const lookahead = 25.0; 
  const scheduleAheadTime = 0.1;

  const bpmRef = useRef(bpm);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  // Practice Mode Logic
  useEffect(() => {
    let interval: number;
    if (isPlaying && practiceMode) {
      const startTime = Date.now() - (elapsedTime * 1000);
      interval = window.setInterval(() => {
        const now = Date.now();
        const currentElapsed = (now - startTime) / 1000;
        setElapsedTime(currentElapsed);
        if (currentElapsed >= duration) {
          setBpm(targetBpm);
          setPracticeMode(false); 
          setElapsedTime(0);
        } else {
          const progress = currentElapsed / duration;
          const newBpm = Math.round(startBpm + (targetBpm - startBpm) * progress);
          setBpm(newBpm);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, practiceMode, startBpm, targetBpm, duration]);

  // Audio Logic
  useEffect(() => {
    return () => {
      if (timerID.current) window.clearTimeout(timerID.current);
      visualTimersRef.current.forEach(id => window.clearTimeout(id));
      visualTimersRef.current = [];
      if (audioContext.current) audioContext.current.close();
    };
  }, []);

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    nextNoteTime.current += secondsPerBeat;
    currentBeatRef.current = (currentBeatRef.current + 1) % 4;
  };

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioContext.current) return;
    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();
    osc.frequency.value = beatNumber % 4 === 0 ? 1200 : 600; 
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
    osc.connect(envelope);
    envelope.connect(audioContext.current.destination);
    osc.start(time);
    osc.stop(time + 0.03);

    const timeUntilPlay = (time - audioContext.current.currentTime) * 1000;
    const beatDuration = (60 / bpmRef.current) * 1000;
    const lightDuration = beatDuration / 2; 

    const timerOn = window.setTimeout(() => setBeat(beatNumber % 4), Math.max(0, timeUntilPlay));
    const timerOff = window.setTimeout(() => setBeat(null), Math.max(0, timeUntilPlay + lightDuration));
    visualTimersRef.current.push(timerOn, timerOff);
  };

  const scheduler = () => {
    if (!audioContext.current) return;
    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      scheduleNote(currentBeatRef.current, nextNoteTime.current); 
      nextNote();
    }
    timerID.current = window.setTimeout(scheduler, lookahead);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (timerID.current) window.clearTimeout(timerID.current);
      visualTimersRef.current.forEach(id => window.clearTimeout(id));
      visualTimersRef.current = [];
      setBeat(null);
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
    currentBeatRef.current = 0;
    nextNoteTime.current = audioContext.current.currentTime + 0.05;
    scheduler();
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(Number(e.target.value));
    if (practiceMode) setPracticeMode(false);
  };

  const togglePracticeMode = () => {
      setPracticeMode(!practiceMode);
      setElapsedTime(0);
  }

  return (
    <div className="lab-panel w-full max-w-lg mx-auto p-12 relative text-left">
      <div className="mb-2">
        <label className="lab-label">CLK_SOURCE</label>
        <span className="text-sm font-bold lab-text-muted">INTERNAL_OSC</span>
      </div>
      
      <div className="flex items-end justify-between mb-8 border-b border-border-base pb-8">
        <div>
            <div className="text-8xl font-mono font-bold lab-text-main tabular-nums leading-none tracking-tighter">
                {bpm}
            </div>
            <div className="text-xs font-mono lab-text-muted uppercase mt-1 tracking-widest">
                Beats Per Minute
            </div>
        </div>

        {/* Visual Indicator - Plain Square */}
        <div className="mb-2">
             <div 
                className={`w-4 h-4 transition-colors duration-0 border border-border-base
                    ${isPlaying && beat !== null 
                        ? (beat === 0 ? 'bg-primary border-primary' : 'bg-primary/50 border-primary') 
                        : 'bg-surface'}
                `}
            ></div>
            <div className="text-[10px] lab-text-muted mt-2 font-mono uppercase tracking-wider text-center">
                SIGNAL
            </div>
        </div>
      </div>

      <div className="mb-8">
        <input 
            type="range" 
            min="40" 
            max="240" 
            value={bpm} 
            onChange={handleBpmChange}
            className="w-full h-1 bg-border-base appearance-none cursor-pointer accent-[var(--color-text-main)] hover:accent-primary"
        />
        <div className="flex justify-between text-[10px] font-mono lab-text-muted mt-2">
            <span>40</span>
            <span>240</span>
        </div>
      </div>

      <button 
        onClick={togglePlay}
        className={`w-full py-4 text-sm font-bold font-mono tracking-widest uppercase border transition-colors
            ${isPlaying 
                ? 'bg-[var(--color-text-main)] text-[var(--color-bg-panel)] border-[var(--color-text-main)] hover:bg-transparent hover:text-[var(--color-text-main)]' 
                : 'bg-transparent text-primary border-primary hover:bg-primary hover:text-white'}
        `}
      >
        {isPlaying ? 'Stop Playback' : 'Start Playback'}
      </button>

      {/* Practice Mode Controls */}
      <div className="mt-12 pt-8 border-t border-border-base">
        <div className="flex items-center justify-between mb-6">
            <h3 className="lab-label mb-0">TEMPO_TRAINER</h3>
            <button 
                onClick={togglePracticeMode}
                className={practiceMode ? "lab-button lab-button-active" : "lab-button"}
            >
                {practiceMode ? 'ON' : 'OFF'}
            </button>
        </div>

        {practiceMode && (
            <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                    <label className="lab-label">START_BPM</label>
                    <input 
                        type="number" 
                        value={startBpm} 
                        onChange={(e) => setStartBpm(Number(e.target.value))}
                        className="lab-input w-full"
                    />
                </div>
                 <div>
                    <label className="lab-label">TARGET_BPM</label>
                    <input 
                        type="number" 
                        value={targetBpm} 
                        onChange={(e) => setTargetBpm(Number(e.target.value))}
                        className="lab-input w-full"
                    />
                </div>
                <div className="col-span-2">
                    <label className="lab-label">DURATION (SEC)</label>
                    <input 
                        type="number" 
                        value={duration} 
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="lab-input w-full"
                    />
                </div>
                 <div className="col-span-2 mt-2">
                    <div className="flex justify-between text-[10px] font-mono lab-text-muted uppercase mb-1">
                        <span>Progress</span>
                        <span>{Math.round((elapsedTime / duration) * 100)}%</span>
                    </div>
                    <div className="w-full h-1 bg-border-base">
                        <div 
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(100, (elapsedTime / duration) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
