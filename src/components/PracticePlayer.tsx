import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin, { type Region } from 'wavesurfer.js/dist/plugins/regions.js';

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

    let isActive = true;
    // While the user is dragging/resizing the loop, its bounds move under the
    // playhead. Suppress enforcement until they let go, or playback stutters.
    let isAdjustingLoop = false;

    // Loop Logic
    wsRegions.on('region-out', (region: Region) => {
        if (!isActive || isAdjustingLoop) return;
        region.play();
    });

    wsRegions.on('region-update', () => { isAdjustingLoop = true; });
    wsRegions.on('region-updated', (region: Region) => {
        isAdjustingLoop = false;
        // Dragging the loop elsewhere should take playback with it
        if (ws.getCurrentTime() < region.start || ws.getCurrentTime() > region.end) {
            ws.setTime(region.start);
        }
    });

    // "Click-to-seek inside loop"
    wsRegions.on('region-clicked', (_region: Region, e: MouseEvent) => {
        if (!isActive) return;
        e.stopPropagation(); 
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            const progress = relativeX / rect.width;
            
            ws.seekTo(progress);
            if (!ws.isPlaying()) {
                ws.play();
            }
        }
    });

    ws.on('ready', () => {
        if (!isActive) return;
        const duration = ws.getDuration();
        if (wsRegions.getRegions().length === 0) {
            wsRegions.addRegion({
                start: 0,
                end: duration,
                // Kept in sync with ::part(region) in index.css, which wins via !important
                color: 'rgba(249, 115, 22, 0.4)',
                drag: true,
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
        if (!isActive || isAdjustingLoop) return;
        const regions = wsRegions.getRegions();
        if (regions.length > 0) {
            const loop = regions[0];
            const currentTime = ws.getCurrentTime();
            if (currentTime < loop.start - 0.1 || currentTime > loop.end + 0.1) {
                ws.seekTo(loop.start / ws.getDuration());
            }
        }
    });

    waveSurferRef.current = ws;

    return () => {
        isActive = false;
        try {
            ws.pause();
            ws.destroy();
        } catch (e) {
            console.debug("Cleanup error", e);
        }
    };
  }, []); // Run once on mount

  // Watch audioFile prop - Load it when it changes/populates
  useEffect(() => {
    if (audioFile && waveSurferRef.current) {
         const url = URL.createObjectURL(audioFile);
         waveSurferRef.current.load(url).catch((err) => {
             console.debug("WaveSurfer load cancelled/failed", err);
         });
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

  const togglePlay = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Drop focus so SPACE doesn't also re-trigger the button natively
    e?.currentTarget.blur();
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  // Keyboard transport: SPACE play/pause, ENTER restart section, ARROWS seek 1s
  useEffect(() => {
    if (!audioFile) return;

    const handleKey = (e: KeyboardEvent) => {
      const ws = waveSurferRef.current;
      if (!ws) return;

      // Let a deliberately tab-focused control keep its native key handling
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        return;
      }

      const loop = regionsRef.current?.getRegions()[0];
      const start = loop?.start ?? 0;
      const end = loop?.end ?? ws.getDuration();

      switch (e.key) {
        case ' ':
          e.preventDefault();
          ws.playPause();
          break;
        case 'Enter':
          e.preventDefault();
          ws.setTime(start);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          ws.setTime(Math.max(start, ws.getCurrentTime() - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          ws.setTime(Math.min(end, ws.getCurrentTime() + 1));
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [audioFile]);

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
                onPointerUp={(e) => e.currentTarget.blur()}
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
                onPointerUp={(e) => e.currentTarget.blur()}
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

      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[10px] font-mono lab-text-muted uppercase tracking-widest">
          <div>SPACE <span className="lab-text-main">PLAY/PAUSE</span></div>
          <div>ENTER <span className="lab-text-main">RESTART_SECTION</span></div>
          <div>←/→ <span className="lab-text-main">SEEK_1S</span></div>
      </div>

    </div>
  );
}
