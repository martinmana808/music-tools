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
  const [activeTone, setActiveTone] = useState<string | null>(null);

  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const rafId = useRef<number | null>(null);
  const toneOscillator = useRef<OscillatorNode | null>(null);
  const toneGain = useRef<GainNode | null>(null);

  // --- AutoCorrelate / Pitch Detection ---
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
    // Don't close context if tone is playing? Actually fine to keep context, just stop inputs.
    // For now, let's keep consistent:
    setIsListening(false);
    setNote('--');
    setCents(0);
  };

  // --- Reference Tones (Continuous) ---
  const toggleTone = (noteName: string, freq: number) => {
      // Init Context if needed
      if (!audioContext.current) audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.current.state === 'suspended') audioContext.current.resume();

      // If clicking same button -> Stop
      if (activeTone === noteName) {
          stopTone();
          return;
      }

      // If another is playing -> Stop it first
      if (toneOscillator.current) {
          try { toneOscillator.current.stop(); } catch(e){}
          toneOscillator.current.disconnect();
      }

      // Start New Tone
      const osc = audioContext.current.createOscillator();
      const gain = audioContext.current.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
      
      // Sustain Gain
      gain.gain.setValueAtTime(0, audioContext.current.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, audioContext.current.currentTime + 0.1); 

      osc.connect(gain);
      gain.connect(audioContext.current.destination);
      osc.start();

      toneOscillator.current = osc;
      toneGain.current = gain;
      setActiveTone(noteName);
  };

  const stopTone = () => {
      if (toneGain.current && audioContext.current) {
          // Fade out
          toneGain.current.gain.setValueAtTime(toneGain.current.gain.value, audioContext.current.currentTime);
          toneGain.current.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.1);
          
          if (toneOscillator.current) {
               toneOscillator.current.stop(audioContext.current.currentTime + 0.15);
          }
      }
      setActiveTone(null);
  };

  useEffect(() => { 
      return () => {
          stopListening();
          stopTone();
      }; 
  }, []);

  return (
    <div className="lab-panel w-full max-w-lg mx-auto p-12 text-center">
      
      <div className="mb-12">
          <h2 className="text-xs font-mono font-bold lab-text-muted uppercase tracking-widest mb-4">
            INPUT_ANALYSIS
          </h2>
          
          <div className="text-9xl font-black lab-text-main leading-none tracking-tighter mb-8">
             {note}
          </div>

          {/* --- Classic Gauge Visual --- */}
          <div className="relative w-full aspect-[2/1] max-w-[300px] mx-auto mb-8">
               
               {/* Gauge Background (SVG) */}
               <svg className="w-full h-full overflow-visible" viewBox="0 0 200 100">
                    {/* Tick Marks */}
                    {Array.from({ length: 11 }).map((_, i) => {
                        // Range -50 to +50 cents
                        // Map 0 -> 100 (range)
                        // Angle: Let's use 180 degree semi-circle for simplicity.
                        // -90deg (Left) to +90deg (Right).
                        // i=0 (-50c) -> -90deg
                        // i=5 (0c)   -> 0deg
                        // i=10 (+50c)-> +90deg
                        const val = (i - 5) * 10;
                        const angle = (i * 18) - 90; // 0..10 -> 0..180 -> -90..90
                        
                        // Convert polar to cartesian
                        // Center is (100, 100) (Bottom center of 200x100 box)
                        const rad = (angle - 90) * (Math.PI / 180); // SVG coordinates: 0 is Right. -90 is Top.
                        // We want 0deg to be Up (Top). -90 Left. +90 Right.
                        // In SVG std: 0 is East. -90 is North. 180 is West.
                        // Our '0' (Up) corresponds to -90 SVG.
                        // Our '-90' (Left) corresponds to -180 SVG.
                        // Our '+90' (Right) corresponds to 0 SVG.
                        // Formula: svgAngle = userAngle - 90.
                        
                        const innerR = 70;
                        const outerR = val === 0 ? 95 : 85; 
                        
                        const x1 = 100 + innerR * Math.cos(rad);
                        const y1 = 100 + innerR * Math.sin(rad);
                        const x2 = 100 + outerR * Math.cos(rad);
                        const y2 = 100 + outerR * Math.sin(rad);

                        return (
                            <g key={val}>
                                <line x1={x1} y1={y1} x2={x2} y2={y2} 
                                      className={`stroke-current ${val === 0 ? 'text-primary stroke-[3]' : 'text-border stroke-[1]'}`} />
                                { val % 20 === 0 && (
                                    <text x={100 + (outerR + 15) * Math.cos(rad)} 
                                          y={100 + (outerR + 15) * Math.sin(rad)}
                                          className={`text-[8px] font-mono fill-[var(--color-text-muted)] text-center`}
                                          textAnchor="middle"
                                          dominantBaseline="middle"
                                          transform={`rotate(${angle}, ${100 + (outerR + 15) * Math.cos(rad)}, ${100 + (outerR + 15) * Math.sin(rad)})`}
                                    >
                                        {val > 0 ? `+${val}` : val}
                                    </text>
                                )}
                            </g>
                        );
                    })}
               </svg>

               {/* Needle */}
               <div 
                    className="absolute bottom-0 left-1/2 w-1 h-[90%] bg-primary origin-bottom -translate-x-1/2 z-10 transition-transform duration-200 ease-out will-change-transform rounded-full shadow-[0_0_10px_var(--color-primary)]"
                    style={{
                        transform: `translateX(-50%) rotate(${Math.max(-90, Math.min(90, cents * 1.8))}deg)` 
                        // cents: -50..50.
                        // deg: -90..90
                        // factor: 1.8
                    }}
               ></div>

               {/* Pivot Point */}
               <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-primary rounded-full -translate-x-1/2 translate-y-1/2 z-20 shadow-md"></div>
               
               {/* Digital Readout overlay if needed, or keep it above */}
          </div>

          <div className="flex justify-between text-[10px] font-mono lab-text-muted uppercase px-1">
              <span>FLAT</span>
              <span className={Math.abs(cents) < 5 ? 'text-primary font-bold' : ''}>
                  {isListening ? (cents > 0 ? `+${cents}` : cents) : 'OFF'}
              </span>
              <span>SHARP</span>
          </div>
      </div>

      <button 
        onClick={isListening ? stopListening : startListening}
        className={`w-full py-4 text-sm font-bold font-mono tracking-widest uppercase border transition-colors mb-12
            ${isListening 
                ? 'bg-[var(--color-text-main)] text-[var(--color-bg-panel)] border-[var(--color-text-main)] hover:bg-transparent hover:text-[var(--color-text-main)]' 
                : 'bg-transparent text-primary border-primary hover:bg-primary hover:text-white'}
        `}
      >
        {isListening ? 'DEACTIVATE MIC' : 'ACTIVATE MIC'}
      </button>

      <div className="pt-8 border-t border-border-base">
        <label className="lab-label mb-4">REFERENCE_TONES_HZ (TOGGLE)</label>
        <div className="grid grid-cols-3 gap-2">
          {GUITAR_STRINGS.map((s) => {
            const isActive = activeTone === s.note;
            return (
                <button
                key={s.note}
                onClick={() => toggleTone(s.note, s.freq)}
                className={`
                    lab-button flex flex-col items-center justify-center py-4 border transition-all
                    ${isActive 
                        ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                        : 'hover:border-primary hover:text-primary'}
                `}
                >
                <div className="font-bold text-lg leading-none">{s.note}</div>
                <div className={`text-[10px] mt-1 ${isActive ? 'opacity-100' : 'opacity-60'}`}>{s.freq}</div>
                </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
