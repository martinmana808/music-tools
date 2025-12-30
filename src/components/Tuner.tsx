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

  // AutoCorrelate (Reuse existing logic)
  const autoCorrelate = (buf: Float32Array, sampleRate: number) => {
    let size = buf.length;
    let rms = 0;
    for (let i = 0; i < size; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / size);
    if (rms < 0.01) return -1;
    let r1 = 0, r2 = size - 1, thres = 0.2;
    for (let i = 0; i < size / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < size / 2; i++) if (Math.abs(buf[size - i]) < thres) { r2 = size - i; break; }
    buf = buf.slice(r1, r2);
    size = buf.length;
    const c = new Array(size).fill(0);
    for (let i = 0; i < size; i++) for (let j = 0; j < size - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    let T0 = maxpos;
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
      if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.current = stream;
      const source = audioContext.current.createMediaStreamSource(stream);
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 2048;
      source.connect(analyser.current);
      setIsListening(true);
      updatePitch();
    } catch (err) { alert('Mic Error'); }
  };

  const stopListening = () => {
    if (micStream.current) micStream.current.getTracks().forEach(track => track.stop());
    if (rafId.current) cancelAnimationFrame(rafId.current);
    if (audioContext.current) audioContext.current.close();
    audioContext.current = null;
    setIsListening(false);
    setNote('--');
    setCents(0);
  };

  const playTone = (freq: number) => {
    if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.current.state === 'suspended') audioContext.current.resume();
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

  useEffect(() => { return () => stopListening(); }, []);

  // Visuals for flat meter
  const getMeterPosition = () => {
      // Map -50 to +50 cents to 0% to 100% width
      const clamped = Math.max(-50, Math.min(50, cents));
      return 50 + clamped; // 0 to 100
  };

  return (
    <div className="lab-panel w-full max-w-lg mx-auto p-12 text-center">
      
      <div className="mb-8">
          <h2 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-4">
            INPUT_ANALYSIS
          </h2>
          
          <div className="text-9xl font-black text-white leading-none tracking-tighter mb-4">
             {note}
          </div>

          <div className="h-8 bg-zinc-900 border border-zinc-800 relative w-full mb-2">
               {/* Center Marker */}
               <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600"></div>
               
               {/* Needle Block */}
               {isListening && (
                   <div 
                        className={`absolute top-0 bottom-0 w-1 transition-all duration-100
                            ${Math.abs(cents) < 5 ? 'bg-primary' : 'bg-zinc-400'}
                        `}
                        style={{ left: `${getMeterPosition()}%` }}
                   ></div>
               )}
          </div>
          <div className="flex justify-between text-[10px] font-mono text-zinc-600 uppercase">
              <span>FLAT (-50)</span>
              <span>{isListening ? (cents > 0 ? `+${cents}` : cents) : 'OFF'}</span>
              <span>SHARP (+50)</span>
          </div>
      </div>

      <button 
        onClick={isListening ? stopListening : startListening}
        className={`w-full py-4 text-sm font-bold font-mono tracking-widest uppercase border transition-colors mb-12
            ${isListening 
                ? 'bg-zinc-100 text-black border-zinc-100 hover:bg-white' 
                : 'bg-transparent text-primary border-primary hover:bg-primary hover:text-black'}
        `}
      >
        {isListening ? 'DEACTIVATE MIC' : 'ACTIVATE MIC'}
      </button>

      <div className="pt-8 border-t border-zinc-800">
        <label className="lab-label mb-4">REFERENCE_TONES_HZ</label>
        <div className="grid grid-cols-3 gap-2">
          {GUITAR_STRINGS.map((s) => (
            <button
              key={s.note}
              onClick={() => playTone(s.freq)}
              className="lab-button border-zinc-800 hover:border-zinc-500 hover:text-white text-zinc-400"
            >
              {s.note} <span className="text-[10px] text-zinc-600 block">{s.freq}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
