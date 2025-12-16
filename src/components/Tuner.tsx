import { useState, useEffect, useRef } from 'react';

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const GUITAR_STRINGS = [
  { note: 'E2', freq: 82.41 },
  { note: 'A2', freq: 110.00 },
  { note: 'D3', freq: 146.83 },
  { note: 'G3', freq: 196.00 },
  { note: 'B3', freq: 246.94 },
  { note: 'E4', freq: 329.63 },
];

export default function Tuner() {
  const [note, setNote] = useState<string>('--');
  const [cents, setCents] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);
  
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const rafId = useRef<number | null>(null);

  // Autocorrelation algorithm
  const autoCorrelate = (buf: Float32Array, sampleRate: number) => {
    let size = buf.length;
    let rms = 0;

    for (let i = 0; i < size; i++) {
        const val = buf[i];
        rms += val * val;
    }
    rms = Math.sqrt(rms / size);

    // Not enough signal
    if (rms < 0.01) return -1;

    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) {
        if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < size / 2; i++) {
        if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
    }

    buf = buf.slice(r1, r2);
    size = buf.length;

    const c = new Array(size).fill(0);
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size - i; j++) {
            c[i] = c[i] + buf[j] * buf[j + i];
        }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
        if (c[i] > maxval) {
            maxval = c[i];
            maxpos = i;
        }
    }
    let T0 = maxpos;

    // Interpolation
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  const updatePitch = () => {
    if (!analyser.current || !audioContext.current) return;
    
    const buffer = new Float32Array(analyser.current.fftSize);
    analyser.current.getFloatTimeDomainData(buffer);
    const ac = autoCorrelate(buffer, audioContext.current.sampleRate);

    if (ac !== -1) {
      const noteNum = 12 * (Math.log(ac / 440) / Math.log(2)) + 69;
      const roundedNote = Math.round(noteNum);
      const noteName = NOTE_STRINGS[roundedNote % 12];
      const centDiff = Math.floor((noteNum - roundedNote) * 100);
      
      setNote(noteName);
      setCents(centDiff);
    }

    rafId.current = requestAnimationFrame(updatePitch);
  };

  const startListening = async () => {
    try {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 2048;
      
      source.connect(analyser.current);
      setIsListening(true);
      updatePitch();
    } catch (err) {
      console.error('Error accessing microphone', err);
      alert('Could not access microphone. Please allow permissions.');
    }
  };

  const stopListening = () => {
    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
    }
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (audioContext.current) audioContext.current.close();
    
    audioContext.current = null;
    setIsListening(false);
    setNote('--');
    setCents(0);
  };

  const playTone = (freq: number) => {
    if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
    }

    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    
    gain.gain.setValueAtTime(0.5, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + 2);

    osc.connect(gain);
    gain.connect(audioContext.current.destination);

    osc.start();
    osc.stop(audioContext.current.currentTime + 2);
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Guitar Tuner</h2>

      <div style={{ position: 'relative', height: '150px', marginBottom: '2rem' }}>
        {/* Needle Gauge */}
        <div style={{
          width: '300px',
          height: '150px',
          margin: '0 auto',
          position: 'relative',
          borderTopLeftRadius: '150px',
          borderTopRightRadius: '150px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          overflow: 'hidden'
        }}>
           <div style={{
             position: 'absolute',
             bottom: '0',
             left: '50%',
             width: '4px',
             height: '140px',
             background: cents === 0 ? '#4cd137' : (Math.abs(cents) < 10 ? '#fbc531' : '#e84118'),
             transformOrigin: 'bottom center',
             transform: `translateX(-50%) rotate(${cents * 0.9}deg)`, // 90deg range for 100 cents approx? 50 cents = 45deg
             transition: 'transform 0.1s, background 0.2s'
           }}></div>
           
           <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', color: '#666' }}>
             0
           </div>
        </div>
      </div>

      <div style={{ 
        fontSize: '5rem', 
        fontWeight: 'bold', 
        color: Math.abs(cents) < 5 ? '#4cd137' : 'var(--text-main)',
        marginBottom: '0.5rem'
      }}>
        {note}
      </div>
      
      <div style={{ 
        fontSize: '1.5rem', 
        color: Math.abs(cents) < 5 ? '#4cd137' : (cents > 0 ? '#e84118' : '#e84118'),
        marginBottom: '2rem' 
      }}>
        {isListening ? (cents === 0 ? 'In Tune' : `${cents > 0 ? '+' : ''}${cents} cents`) : 'Off'}
      </div>

      <button 
        onClick={isListening ? stopListening : startListening}
        style={{ 
          fontSize: '1.2rem',
          background: isListening ? '#ff4757' : 'var(--primary-color)',
          borderColor: 'transparent',
          minWidth: '150px'
        }}
      >
        {isListening ? 'STOP' : 'START MIC'}
      </button>

      <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Reference Tones</h3>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {GUITAR_STRINGS.map((s) => (
            <button
              key={s.note}
              onClick={() => playTone(s.freq)}
              style={{
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                padding: 0,
                fontSize: '1rem',
                fontWeight: 600,
                background: 'var(--surface-color)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              {s.note}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
