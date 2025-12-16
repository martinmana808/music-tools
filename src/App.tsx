import { useState } from 'react';
import './index.css';

import TapTempo from './components/TapTempo';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import Sequencer from './components/Sequencer';

// Placeholder components
const PlaceHolder = ({ title }: { title: string }) => (
  <div className="glass-panel" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <h2>{title} (Coming Soon)</h2>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<'tuner' | 'tempo' | 'metronome' | 'sequencer'>('tuner');

  const renderContent = () => {
    switch (activeTab) {
      case 'tuner': return <Tuner />;
      case 'tempo': return <TapTempo />;
      case 'metronome': return <Metronome />;
      case 'sequencer': return <Sequencer />;
      default: return <PlaceHolder title="Select a Tool" />;
    }
  };

  return (
    <div className="app-container">
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', background: 'linear-gradient(to right, #646cff, #9f5afd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          MusicTools
        </h1>
      </header>

      <nav style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {(['tuner', 'tempo', 'metronome', 'sequencer'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              backgroundColor: activeTab === tab ? 'var(--primary-color)' : '',
              borderColor: activeTab === tab ? 'var(--primary-color)' : '',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
