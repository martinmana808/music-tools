/**
 * Sample-based drum kit.
 *
 * Samples are vendored under /samples so the app works offline. Playback goes
 * through raw AudioBufferSourceNodes scheduled on the Web Audio clock, which is
 * what the sequencer's lookahead scheduler already speaks — no Tone.js, no
 * second clock to keep in sync.
 *
 * If a sample fails to load the caller falls back to synthesis; the grid should
 * never go silent.
 */

export type DrumVoice = 'hihat' | 'snare' | 'kick';

export type KitStatus = 'idle' | 'loading' | 'sampled' | 'fallback';

const SAMPLE_URLS: Record<DrumVoice, string> = {
  hihat: '/samples/hihat.mp3',
  snare: '/samples/snare.mp3',
  kick: '/samples/kick.mp3',
};

/** Per-voice trim so the vendored one-shots sit at roughly even levels. */
const VOICE_GAIN: Record<DrumVoice, number> = {
  hihat: 0.5,
  snare: 0.8,
  kick: 1.0,
};

export type DrumKit = Partial<Record<DrumVoice, AudioBuffer>>;

/**
 * Fetch and decode every voice. Resolves with whatever decoded successfully —
 * an empty object means the caller should use its synth fallback.
 */
export async function loadDrumKit(ctx: AudioContext): Promise<DrumKit> {
  const voices = Object.keys(SAMPLE_URLS) as DrumVoice[];

  const decoded = await Promise.all(
    voices.map(async (voice) => {
      try {
        const res = await fetch(SAMPLE_URLS[voice]);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = await res.arrayBuffer();
        return [voice, await ctx.decodeAudioData(bytes)] as const;
      } catch (err) {
        console.warn(`[drumKit] failed to load ${voice}`, err);
        return [voice, null] as const;
      }
    })
  );

  const kit: DrumKit = {};
  for (const [voice, buffer] of decoded) {
    if (buffer) kit[voice] = buffer;
  }
  return kit;
}

/**
 * Fire a one-shot at an absolute AudioContext time.
 * Returns false if the voice has no buffer, so the caller can synthesize instead.
 */
export function triggerSample(
  ctx: AudioContext,
  kit: DrumKit,
  voice: DrumVoice,
  time: number
): boolean {
  const buffer = kit[voice];
  if (!buffer) return false;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.value = VOICE_GAIN[voice];

  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(time);
  return true;
}
