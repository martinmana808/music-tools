import { useState, useEffect } from 'react';
import './index.css';

import TapTempo from './components/TapTempo';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import Sequencer from './components/Sequencer';
import PracticePlayer from './components/PracticePlayer';

const PlaceHolder = ({ title }: { title: string }) => (
  <div className="lab-panel h-[300px] flex items-center justify-center lab-text-muted">
    <h2 className="text-xl font-mono uppercase tracking-widest">{title} // NO_SIGNAL</h2>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<'tuner' | 'tempo' | 'metronome' | 'practice' | 'sequencer'>('tuner');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  /* Audio Persistence State */
  const [audioFile, setAudioFile] = useState<Blob | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'tuner': return <Tuner />;
      case 'tempo': return <TapTempo />;
      case 'metronome': return <Metronome />;
      case 'practice': return (
        <PracticePlayer 
          audioFile={audioFile} 
          onUpload={(file) => setAudioFile(file)} 
          onClear={() => setAudioFile(null)} 
        />
      );
      case 'sequencer': return <Sequencer />;
      default: return <PlaceHolder title="MODULE_SELECT" />;
    }
  };

  const navItems = ['tuner', 'tempo', 'metronome', 'practice', 'sequencer'] as const;

  return (
    <div className="min-h-screen font-sans bg-background text-[var(--color-text-main)] transition-colors duration-200">
      
      <div className="relative z-10">
        <header className="mb-12 flex flex-col md:flex-row items-end justify-between border-b border-border-base pb-4">
          <div className="mb-6 md:mb-0 w-full md:w-auto">
            <div className="flex justify-between items-baseline">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter lab-text-main mb-1">
                    808.TOOLS
                    </h1>
                    <p className="text-[10px] font-mono lab-text-muted uppercase tracking-[0.2em]">
                    AUDIO_UTILITY_RACK_V2
                    </p>
                </div>
                
                {/* Mobile Theme Toggle (visible on small screens) */}
                <button 
                  onClick={toggleTheme}
                  className="md:hidden text-[10px] font-mono font-bold uppercase tracking-widest lab-text-muted hover:text-primary transition-colors border border-border-base px-2 py-1"
                >
                  {theme === 'dark' ? 'LIGHT_MODE' : 'DARK_MODE'}
                </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
              <nav className="flex flex-wrap gap-px bg-border-base border border-border-base">
                {navItems.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      px-6 py-3 text-xs font-mono uppercase tracking-widest transition-colors
                      ${activeTab === tab 
                        ? 'bg-[var(--color-text-main)] text-[var(--color-bg-panel)] font-bold' 
                        : 'bg-surface lab-text-muted hover:bg-[var(--color-bg-app)] hover:text-[var(--color-text-main)]'}
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              {/* Desktop Theme Toggle */}
              <button 
                  onClick={toggleTheme}
                  className="hidden md:block w-8 h-8 flex items-center justify-center border border-border-base bg-surface hover:bg-[var(--color-bg-app)] transition-colors text-[10px] font-bold"
                  title="Toggle Theme"
              >
                  {theme === 'dark' ? '☀' : '☾'}
              </button>
          </div>
        </header>

        <main className="w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
