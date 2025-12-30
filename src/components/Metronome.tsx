import { useState, useEffect, useRef } from 'react';

export default function Metronome() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [beat, setBeat] = useState(0); // For visual feedback

  // Practice Mode State
  const [practiceMode, setPracticeMode] = useState(false);
  const [startBpm, setStartBpm] = useState(100);
  const [targetBpm, setTargetBpm] = useState(120);
  const [duration, setDuration] = useState(30); // in seconds
  const [elapsedTime, setElapsedTime] = useState(0);

  const audioContext = useRef<AudioContext | null>(null);
  const nextNoteTime = useRef(0);
  const timerID = useRef<number | null>(null);
  const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
  const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

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
          // Optional: Stop or just stay at target? Let's stay at target.
          setPracticeMode(false); // End practice ramping
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

  // Initialize AudioContext
  useEffect(() => {
    return () => {
      if (timerID.current) window.clearTimeout(timerID.current);
      if (audioContext.current) audioContext.current.close();
    };
  }, []);

  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpmRef.current;
    nextNoteTime.current += secondsPerBeat;
    // Update visual state (approximate)
    setBeat((prev) => (prev + 1) % 4);
  };

  const scheduleNote = (beatNumber: number, time: number) => {
    if (!audioContext.current) return;
    
    // Visual sync (using a timeout to match audio time)
    // Note: React state update is separate from precise audio scheduling
    
    const osc = audioContext.current.createOscillator();
    const envelope = audioContext.current.createGain();

    osc.frequency.value = beatNumber % 4 === 0 ? 1000 : 800; // High pitch for downbeat
    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(envelope);
    envelope.connect(audioContext.current.destination);

    osc.start(time);
    osc.stop(time + 0.03);
  };

  const scheduler = () => {
    if (!audioContext.current) return;
    
    // while there are notes that will need to play before the next interval,
    // schedule them and advance the pointer.
    while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
      scheduleNote(0, nextNoteTime.current); // Passing 0 just for frequency logic, need proper beat count
      nextNote();
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
    nextNoteTime.current = audioContext.current.currentTime + 0.05;
    scheduler();
  };

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBpm(Number(e.target.value));
    if (practiceMode) {
        // If user manually changes BPM, maybe disable practice mode?
        setPracticeMode(false);
    }
  };

  const togglePracticeMode = () => {
      setPracticeMode(!practiceMode);
      setElapsedTime(0);
  }

  return (
    <div className="glass-panel" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Metronome</h2>
      
      <div style={{ 
        width: '20px', 
        height: '20px', 
        borderRadius: '50%', 
        background: isPlaying && audioContext.current 
          ? (beat === 0 ? '#ff4757' : 'var(--primary-color)') 
          : '#333',
        margin: '0 auto 1rem',
        boxShadow: isPlaying ? `0 0 15px ${beat === 0 ? '#ff4757' : 'var(--primary-color)'}` : 'none',
        transition: 'background 0.1s'
      }}></div>

      <div style={{ 
        fontSize: '4rem', 
        fontWeight: 'bold', 
        color: 'var(--primary-color)',
        marginBottom: '0.5rem'
      }}>
        {bpm}
      </div>
      <div style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>BPM</div>

      <input 
        type="range" 
        min="40" 
        max="240" 
        value={bpm} 
        onChange={handleBpmChange}
        style={{ width: '100%', marginBottom: '2rem', cursor: 'pointer' }}
      />

      <button 
        onClick={togglePlay}
        style={{ 
          height: '60px', 
          width: '180px',
          fontSize: '1.2rem',
          background: isPlaying ? '#ff4757' : 'var(--primary-color)',
          borderColor: 'transparent'
        }}
      >
        {isPlaying ? 'STOP' : 'START'}
      </button>


      {/* Practice Mode Controls */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--borderColor)', paddingTop: '2rem' }}>
        <button 
            onClick={togglePracticeMode}
            className="secondary"
            style={{ 
                marginBottom: '1.5rem',
                backgroundColor: practiceMode ? 'var(--secondary-color)' : '',
                borderColor: practiceMode ? 'transparent' : 'var(--borderColor)'
            }}
        >
            {practiceMode ? 'Practice Mode ON' : 'Enable Trainer'}
        </button>

        {practiceMode && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', textAlign: 'left' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Start BPM</label>
                    <input 
                        type="number" 
                        value={startBpm} 
                        onChange={(e) => setStartBpm(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                 <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Target BPM</label>
                    <input 
                        type="number" 
                        value={targetBpm} 
                        onChange={(e) => setTargetBpm(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Duration (Seconds)</label>
                    <input 
                        type="number" 
                        value={duration} 
                        onChange={(e) => setDuration(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.5rem' }}
                    />
                </div>
                 <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Progress</div>
                    <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${Math.min(100, (elapsedTime / duration) * 100)}%`, 
                            height: '100%', 
                            background: 'var(--primary-color)',
                            transition: 'width 0.1s linear'
                        }}></div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
