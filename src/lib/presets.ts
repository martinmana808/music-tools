/**
 * Factory patterns for the step sequencer.
 *
 * Rows are ordered to match ROWS in Sequencer: [HI_HAT, SNARE_DRUM, KICK_DRUM].
 * Steps are 1-indexed here for readability and expanded to a boolean grid below.
 */

export const STEPS = 8;

interface PresetSpec {
  name: string;
  hihat: number[];
  snare: number[];
  kick: number[];
}

const ALL = [1, 2, 3, 4, 5, 6, 7, 8];

const SPECS: PresetSpec[] = [
  { name: 'HERMES',   hihat: [1, 3, 5, 7], snare: [3, 7], kick: [1, 5, 6] },
  { name: 'ZEUS',     hihat: ALL,          snare: [3, 7], kick: [1, 5, 6] },
  { name: 'ARTEMIS',  hihat: ALL,          snare: [5],    kick: [1] },
  { name: 'ARES',     hihat: ALL,          snare: [5],    kick: [1, 2, 4] },
  { name: 'POSEIDON', hihat: ALL,          snare: [3, 7], kick: [1, 4, 5] },
];

/** Expand 1-indexed step numbers into a fixed-width boolean row. */
function toRow(steps: number[]): boolean[] {
  const row = Array(STEPS).fill(false);
  for (const step of steps) row[step - 1] = true;
  return row;
}

export interface Preset {
  name: string;
  grid: boolean[][];
}

export const PRESETS: Preset[] = SPECS.map(({ name, hihat, snare, kick }) => ({
  name,
  grid: [toRow(hihat), toRow(snare), toRow(kick)],
}));

/** A fresh all-off grid. Callers get their own copy — never a shared reference. */
export function emptyGrid(): boolean[][] {
  return Array(3)
    .fill(null)
    .map(() => Array(STEPS).fill(false));
}

/** Deep copy so loading a preset can't alias the module-level PRESETS data. */
export function cloneGrid(grid: boolean[][]): boolean[][] {
  return grid.map((row) => [...row]);
}
