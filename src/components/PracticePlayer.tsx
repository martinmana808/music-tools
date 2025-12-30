import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions.js';

interface PracticePlayerProps {
  audioFile: Blob | null;
  onUpload: (file: Blob) => void;
  onClear: () => void;
}

export default function PracticePlayer({ audioFile, onUpload, onClear }: PracticePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    // "Dim/Disable outside" -> Use a muted color for the base waveform
    // In Dark Mode: Zinc-800 (#27272a). In Light Mode: Zinc-300 (#d4d4d8).
    // The theme vars handle this if we use hex? WaveSurfer needs valid CSS color strings.
    // We'll use a specific hex that works ok for "Dim" in both, or check computed style.
    // For now, let's stick to a safe neutral grey.
    
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#52525b', // Zinc-600 (Dimmed Base)
      progressColor: '#52525b', // Same as waveColor to rely on Region for focus
      // or maybe progressColor can be slightly brighter? 
      // User says "Outside loop should be greyed out". 
      // Let's assume the Region marks the "Active" area.
      cursorColor: 'var(--color-primary)', // Orange cursor
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      height: 128,
      normalize: true,
      backend: 'WebAudio', 
    });

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = wsRegions;

    // Loop Logic
    wsRegions.on('region-out', (region: Region) => {
        // Strict Looping
        region.play();
    });

    // "Click-to-seek inside loop"
    wsRegions.on('region-clicked', (region: Region, e: MouseEvent) => {
        e.stopPropagation(); // Stop it from toggling or doing default actions
        // Calculate seek position
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const progress = relativeX / rect.width;
            
            // Validate if click is actually inside the region time (visual check matches logic)
            // But ws.seekTo(progress) takes 0-1 of Total Duration.
            // The region-clicked implies we clicked properly.
            
            ws.seekTo(progress);
            if (!ws.isPlaying()) {
                ws.play();
            }
        }
    });

    ws.on('ready', () => {
        // Initial Region Setup if none exists or reset
        const duration = ws.getDuration();
        if (wsRegions.getRegions().length === 0) {
            wsRegions.addRegion({
                start: 0,
                end: duration,
                // Highlight color for "Inside Loop"
                color: 'rgba(249, 115, 22, 0.15)', // Orange with low opacity
                drag: false, 
                resize: true,
                minLength: 0.5,
            });
        }
    });

    ws.on('finish', () => setIsPlaying(false));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    
    // Strict Loop Enforcement
    ws.on('audioprocess', () => {
        const regions = wsRegions.getRegions();
        if (regions.length > 0) {
            const loop = regions[0];
            const currentTime = ws.getCurrentTime();
            // If outside loop, snap back
            if (currentTime < loop.start - 0.1 || currentTime > loop.end + 0.1) {
                ws.seekTo(loop.start / ws.getDuration());
            }
        }
    });

    waveSurferRef.current = ws;

    return () => {
        ws.destroy();
    };
  }, []); // Run once on mount

  // Watch audioFile prop - Load it when it changes/populates
  useEffect(() => {
    if (audioFile && waveSurferRef.current) {
         const url = URL.createObjectURL(audioFile);
         waveSurferRef.current.load(url);
         // Reset regions on new file?
         regionsRef.current?.clearRegions(); 
    } else if (!audioFile && waveSurferRef.current) {
        waveSurferRef.current.empty();
        regionsRef.current?.clearRegions();
        setIsPlaying(false);
    }
  }, [audioFile]);

  useEffect(() => {
    if (waveSurferRef.current) waveSurferRef.current.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (waveSurferRef.current) waveSurferRef.current.setVolume(volume);
  }, [volume]);

  // Handle local file input interaction -> Call parent handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  return (
    <div className="lab-panel w-full p-8 border-t-0 md:border-t">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold tracking-tight lab-text-main uppercase">
            PRACTICE_DECK
        </h2>
        <div className="flex gap-4">
           {audioFile ? (
             <button 
                onClick={onClear}
                className="lab-button border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
             >
                REMOVE_TRACK
             </button>
           ) : (
                <label className="lab-button cursor-pointer">
                    LOAD_TRACK
                    <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                </label>
           )}
        </div>
      </div>

      <div className="waveform-container mb-8 bg-surface border-y border-border-base relative z-0">
          <div ref={containerRef} className="w-full relative z-10" />
            
          {/* Empty State Message */}
          {!audioFile && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <span className="lab-text-muted font-mono tracking-widest text-xs">NO_MEDIA_LOADED</span>
              </div>
          )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Playback Control (Large) */}
        <div className="md:col-span-3">
             <label className="lab-label">TRANSPORT</label>
             <button 
                onClick={togglePlay}
                disabled={!audioFile}
                className={`
                    w-full py-6 text-xl font-bold font-mono tracking-widest uppercase border transition-all
                    ${isPlaying 
                        ? 'bg-primary border-primary text-white hover:bg-orange-600' 
                        : 'bg-surface border-border-base lab-text-main hover:bg-[var(--color-bg-app)]'}
                    ${!audioFile && 'opacity-50 cursor-not-allowed'}
                `}
            >
                {isPlaying ? 'PAUSE' : 'PLAY'}
             </button>
        </div>

        {/* Speed Control */}
        <div className="md:col-span-5">
             <label className="lab-label flex justify-between">
                <span>SPEED_RATE</span>
                <span className="text-primary font-bold">{playbackRate.toFixed(2)}x</span>
             </label>
             <input
                type="range"
                min="0.25"
                max="1.5"
                step="0.05"
                value={playbackRate}
                onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                disabled={!audioFile}
                className="w-full h-1 bg-border-base appearance-none cursor-pointer accent-[var(--color-text-main)] hover:accent-primary block mt-4 mb-2 disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] font-mono lab-text-muted">
                  <span>0.25</span>
                  <span>1.0</span>
                  <span>1.5</span>
              </div>
        </div>

        {/* Volume Control */}
        <div className="md:col-span-4">
             <label className="lab-label flex justify-between">
                <span>OUTPUT_GAIN</span>
                <span className="lab-text-main">{Math.round(volume * 100)}%</span>
             </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                disabled={!audioFile}
                className="w-full h-1 bg-border-base appearance-none cursor-pointer accent-[var(--color-text-main)] hover:accent-primary block mt-4 mb-2 disabled:opacity-50"
              />
               <div className="flex justify-between text-[10px] font-mono lab-text-muted">
                  <span>-∞</span>
                  <span>0dB</span>
              </div>
        </div>

      </div>

      <div className="mt-8 flex gap-8 text-[10px] font-mono lab-text-muted border-t border-border-base pt-4 uppercase tracking-widest">
          <div>STATUS: <span className={isPlaying ? "text-primary font-bold" : "lab-text-muted"}>{isPlaying ? 'ACTIVE' : 'STANDBY'}</span></div>
          <div>LOOP_CONSTRAINT: <span className="lab-text-main">HARD_LOCK</span></div>
      </div>

    </div>
  );
}
