import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';

export default function PracticePlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#52525b', // Zinc-600
      progressColor: '#f97316', // Orange-500
      cursorColor: '#ffffff',   
      barWidth: 2,
      barGap: 1,
      barRadius: 0,
      height: 128,
      normalize: true,
      backend: 'WebAudio', 
    });

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());

    wsRegions.on('region-out', (region: any) => region.play());
    wsRegions.on('region-clicked', (region: any, e: MouseEvent) => {
        e.stopPropagation(); 
        region.play();
    });

    ws.on('ready', () => {
        const duration = ws.getDuration();
        wsRegions.clearRegions();
        wsRegions.addRegion({
            start: 0,
            end: duration,
            color: 'rgba(249, 115, 22, 0.1)', 
            drag: false, 
            resize: true,
            minLength: 4,
        });
    });

    ws.on('finish', () => setIsPlaying(false));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('interaction', () => ws.play());

    ws.on('audioprocess', () => {
        const regions = wsRegions.getRegions();
        if (regions.length > 0) {
            const loop = regions[0];
            const currentTime = ws.getCurrentTime();
            if (currentTime < loop.start) ws.seekTo(loop.start / ws.getDuration());
            if (currentTime > loop.end) ws.seekTo(loop.start / ws.getDuration());
        }
    });

    waveSurferRef.current = ws;
    return () => ws.destroy();
  }, []);

  useEffect(() => {
    if (waveSurferRef.current) waveSurferRef.current.setPlaybackRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    if (waveSurferRef.current) waveSurferRef.current.setVolume(volume);
  }, [volume]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && waveSurferRef.current) {
      isPlaying && waveSurferRef.current.pause();
      const url = URL.createObjectURL(file);
      waveSurferRef.current.load(url);
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
        <h2 className="text-xl font-bold tracking-tight text-white uppercase">
            PRACTICE_DECK
        </h2>
        <div className="flex gap-2">
           <label className="lab-button cursor-pointer">
              LOAD TRACK
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
           </label>
        </div>
      </div>

      <div className="waveform-container mb-8 bg-zinc-950 border-y border-zinc-800 relative z-0">
          <div ref={containerRef} className="w-full relative z-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Playback Control (Large) */}
        <div className="md:col-span-3">
             <label className="lab-label">TRANSPORT</label>
             <button 
                onClick={togglePlay}
                className={`
                    w-full py-6 text-xl font-bold font-mono tracking-widest uppercase border transition-all text-white
                    ${isPlaying 
                        ? 'bg-primary border-primary hover:bg-orange-600' 
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500'}
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
                className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-primary block mt-4 mb-2"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                  <span>0.25</span>
                  <span>1.0</span>
                  <span>1.5</span>
              </div>
        </div>

        {/* Volume Control */}
        <div className="md:col-span-4">
             <label className="lab-label flex justify-between">
                <span>OUTPUT_GAIN</span>
                <span className="text-zinc-300">{Math.round(volume * 100)}%</span>
             </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-white hover:accent-primary block mt-4 mb-2"
              />
               <div className="flex justify-between text-[10px] font-mono text-zinc-600">
                  <span>-∞</span>
                  <span>0dB</span>
              </div>
        </div>

      </div>

      <div className="mt-8 flex gap-8 text-[10px] font-mono text-zinc-500 border-t border-zinc-900 pt-4 uppercase tracking-widest">
          <div>STATUS: <span className={isPlaying ? "text-primary font-bold" : "text-zinc-500"}>{isPlaying ? 'ACTIVE' : 'STANDBY'}</span></div>
          <div>LOOP_CONSTRAINT: <span className="text-zinc-300">HARD_LOCK</span></div>
      </div>

    </div>
  );
}
