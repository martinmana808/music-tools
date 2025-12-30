import { useState } from 'react';
import './index.css';

import TapTempo from './components/TapTempo';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import Sequencer from './components/Sequencer';
import PracticePlayer from './components/PracticePlayer';

const PlaceHolder = ({ title }: { title: string }) => (
  <div className="lab-panel h-[300px] flex items-center justify-center text-zinc-600">
    <h2 className="text-xl font-mono uppercase tracking-widest">{title} // NO_SIGNAL</h2>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<'tuner' | 'tempo' | 'metronome' | 'practice' | 'sequencer'>('tuner');

  const renderContent = () => {
    switch (activeTab) {
      case 'tuner': return <Tuner />;
      case 'tempo': return <TapTempo />;
      case 'metronome': return <Metronome />;
      case 'practice': return <PracticePlayer />;
      case 'sequencer': return <Sequencer />;
      default: return <PlaceHolder title="MODULE_SELECT" />;
    }
  };

  const navItems = ['tuner', 'tempo', 'metronome', 'practice', 'sequencer'] as const;

  return (
    <div className="min-h-screen font-sans text-zinc-300">
      
      <div className="relative z-10">
        <header className="mb-12 flex flex-col md:flex-row items-baseline justify-between border-b border-zinc-800 pb-4">
          <div className="mb-6 md:mb-0">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-100 mb-1">
              808.TOOLS
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">
              AUDIO_UTILITY_RACK_V2
            </p>
          </div>

          <nav className="flex flex-wrap gap-px bg-zinc-800 border border-zinc-800">
            {navItems.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-6 py-3 text-xs font-mono uppercase tracking-widest transition-colors
                  ${activeTab === tab 
                    ? 'bg-zinc-100 text-black font-bold' 
                    : 'bg-zinc-950 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}
                `}
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        <main className="w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
