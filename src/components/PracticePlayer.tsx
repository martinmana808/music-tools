import { useRef, useState, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

export default function PracticePlayer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume] = useState(0.8);
  const [fileLoaded, setFileLoaded] = useState(false);

  // Loop is always enabled now, so no state needed for toggle

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(100, 108, 255, 0.4)',
      progressColor: '#646cff',
      cursorColor: '#fff',
      barWidth: 2,
      barGap: 3,
      height: 120,
      width: 'auto',
      dragToSeek: true,
    });

    // Initialize Regions Plugin
    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    regionsPluginRef.current = wsRegions;

    wsRegions.on('region-updated', (region: any) => {
        // Enforce constraints during playback
        const currentTime = ws.getCurrentTime();
        if (currentTime < region.start) {
            ws.seekTo(region.start / ws.getDuration());
        }
        if (currentTime > region.end) {
             ws.seekTo(region.start / ws.getDuration());
        }
        
        // Enforce Minimum Loop Length (4 seconds)
        if (region.end - region.start < 4) {
             // If dragging start, move start back? Or if dragging end?
             // It's hard to know which handle is dragged.
             // Simple fix: adjust the side that changed or just force end.
             // A common trick is to check previous state, but we don't have it easily.
             // Let's just extend the end if possible, or push start back.
             // Actually, resizing usually affects one side.
             
             // Simplest approach: Lock to 4s
             if (region.start + 4 > ws.getDuration()) {
                 region.setOptions({ start: ws.getDuration() - 4, end: ws.getDuration() });
             } else {
                 region.setOptions({ end: region.start + 4 });
             }
        }
    });

    wsRegions.on('region-out', (region: any) => {
        // Always loop back to start of region
        region.play();
    });
    
    // Strict Loop Enforcement & Click Handling
    ws.on('interaction', (newTime: number) => {
        // Check if interaction was outside the loop region
        if (!regionsPluginRef.current) return;
        const regions = regionsPluginRef.current.getRegions();
        if (regions.length > 0) {
            const region = regions[0];
            if (newTime < region.start || newTime > region.end) {
                // Determine which side is closer or just jump to start
                region.play();
            }
        }
    });
    
    // On Play, ensure we are inside region
    ws.on('play', () => {
         if (!regionsPluginRef.current) return;
         const regions = regionsPluginRef.current.getRegions();
         if (regions.length > 0) {
            const region = regions[0];
            const currentTime = ws.getCurrentTime();
            if (currentTime < region.start || currentTime > region.end) {
                ws.seekTo(region.start / ws.getDuration());
            }
         }
         setIsPlaying(true);
    });

    // Store ref
    wavesurferRef.current = ws;
    
    // When ready, add the initial full-track loop
    ws.on('ready', () => {
        const duration = ws.getDuration();
        wsRegions.clearRegions();
        wsRegions.addRegion({
            start: 0,
            end: duration,
            color: 'rgba(2, 117, 255, 0.26)', // Brighter "beat" color
            drag: true, 
            resize: true,
        });
    });

    // Events
    // ws.on('play', () => setIsPlaying(true)); // Moved to custom handler above
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    return () => {
      ws.destroy();
    };
  }, []);

  // Handle Playback Rate
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setPlaybackRate(playbackRate);
    }
  }, [playbackRate]);

  // Handle Volume
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setVolume(volume);
    }
  }, [volume]);
  



  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && wavesurferRef.current) {
      const url = URL.createObjectURL(file);
      wavesurferRef.current.load(url);
      setFileLoaded(true);
      // Clear regions on new file
      if (regionsPluginRef.current) {
          regionsPluginRef.current.clearRegions();
      }
    }
  };

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };



  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Practice Player</h2>
      
      {!fileLoaded && (
        <div style={{ padding: '3rem', border: '2px dashed var(--borderColor)', borderRadius: '1rem', marginBottom: '1rem' }}>
          <input 
            type="file" 
            accept="audio/*" 
            onChange={handleFileUpload} 
            style={{ display: 'none' }}
            id="audio-upload"
          />
          <label htmlFor="audio-upload" className="button" style={{ cursor: 'pointer', display: 'inline-block' }}>
            Upload MP3 / Audio
          </label>
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Select an audio file to start practicing</p>
        </div>
      )}

      {/* Waveform Container */}
      <div 
        ref={containerRef} 
        className="waveform-container"
        style={{ 
          width: '100%', 
          marginBottom: '2rem', 
          display: fileLoaded ? 'block' : 'none' 
        }}
      />
      
      {fileLoaded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Main Transport */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                 <button 
                    onClick={togglePlay}
                    style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '50%',
                        fontSize: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isPlaying ? 'var(--secondary-color)' : 'var(--primary-color)'
                    }}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>
            </div>

            {/* Speed Control */}
            <div className="control-group">
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                    Speed: {playbackRate}x
                </label>
                <input 
                    type="range" 
                    min="0.25" 
                    max="1.5" 
                    step="0.05"
                    value={playbackRate} 
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    style={{ width: '100%', maxWidth: '300px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {[0.5, 0.75, 1.0].map(rate => (
                        <button 
                            key={rate} 
                            onClick={() => setPlaybackRate(rate)}
                            className="secondary"
                            style={{ 
                                padding: '0.2rem 0.5rem', 
                                fontSize: '0.8rem',
                                background: playbackRate === rate ? 'var(--primary-color)' : 'transparent'
                            }}
                        >
                            {rate}x
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Loop Controls - Now Simplified / Informational */}
            <div className="control-group" style={{ 
                borderTop: '1px solid var(--borderColor)', 
                paddingTop: '1.5rem',
                color: 'var(--text-muted)',
                fontSize: '0.9rem'
            }}>
                <p>Loop is active. Drag the handles on the waveform to trim the playback area.</p>
            </div>

        </div>
      )}
    </div>
  );
}
