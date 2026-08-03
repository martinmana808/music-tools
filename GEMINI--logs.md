# Project Log Vault

<a name="log-20251229-practice-player-metronome"></a>
## [2025-12-29] Practice Player & Metronome Trainer

**User Prompt:**
> I would like to add another 'section' to the wpa, where you can upload an mp3... slow it down... and loop.
> To the metronome, we could add this practice thing. Set a start tempo, set a target tempo...

### Implementation Plan
# Polish Loop Handles Design

## User Review Required
> [!NOTE]
> I will redesign the loop handles to be more distinctive and "draggable". They will be wider, have a grip texture, and use a contrasting color to clearly indicate they are interactive.

## Proposed Changes

### [MODIFY] [PracticePlayer.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/components/PracticePlayer.tsx)
- **Handle Styling**:
    - Increase `width` to `12px` or `16px`.
    - Change `backgroundColor` to `var(--primary-color)` or a bright accent (#ff4757).
    - Add `borderRadius` (rounded outer edges).
    - Add `backgroundImage` with linear-gradient to simulate "grip lines" (3 vertical lines).
    - Add `boxShadow` for depth.
- **Region Styling**:
    - Ensure opacity is sufficient but doesn't obscure waveform too much.

## Verification
- Load MP3.
- Verify handles look like physical sliders/grips.
- Drag them and verify responsiveness.


### Walkthrough
# Audio Practice & Metronome Trainer Walkthrough

I have added two major features to the MusicTools app: the **Audio Practice Player** and the **Metronome Trainer Mode**.

## Changes

### 1. New "Practice" Tab
A new tab has been added to the main navigation for the **Practice Player**.

### 2. Audio Practice Player
Located in the "Practice" tab, this tool helps you learn songs by ear.
- **Upload MP3**: Click the upload button to load an audio file.
- **Waveform Visualization**: See the audio structure.
- **Speed Control**: Slow down the audio (0.25x - 1.5x) *without changing the pitch*.
- **Always-On Loop**: A loop region covering the entire track is created automatically.
    - **Trim**: Drag the **thick, red, textured handles** on the waveform to set the start and end points of the loop. They are designed to look like physical sliders for easy grabbing.
    - **Looping**: Playback will automatically jump back to the start handle when it reaches the end handle.
    - **Strict Playback**: You can only play audio *inside* the loop region. Clicking outside it or moving the start handle past the playhead will automatically snap the playback position into the valid loop area.

### 3. Metronome Trainer Mode
Added a "Trainer" feature to the Metronome.
- **Enable Trainer**: Toggle the new mode below the start button.
- **Ramping**: Set a `Start BPM`, `Target BPM`, and `Duration`.
- **Progressive Update**: The metronome will automatically increase tempo from Start to Target over the specified duration.

## Verification Results

### Manual Testing Guide
1.  **Practice Player**:
    -   Go to the **Practice** tab.
    -   Upload a song.
    -   Verify the loop handles are now wide, red, and have a grip texture.
    -   Verify dragging them feels responsive.
    -   Press Play. It should play.
    -   Lower speed to 0.75x. Verify pitch remains constant.
2.  **Metronome Trainer**:
    -   Go to **Metronome** tab.
    -   Click **Enable Trainer**.
    -   Set Start: 80, Target: 100, Duration: 20s.
    -   Click **Start**.
    -   Verify the BPM ramps up correctly.

<a name="log-20251229-mobile-metronome-polish"></a>
## [2025-12-29] Mobile UI & Metronome Enhancements

**User Prompt:**
> Can you make the UI better? Make it more mobile friendly please
> the 8bit sequencer, probably add a max-width 100vw...
> Add a different sound or a little bit different pitch for the sound when a NEW BAR starts
> the RED light of the metronome 'beat' light indicator is on the third beat and not the first.

### Implementation Plan
# Mobile UI Optimization

## User Review Required
> [!NOTE]
> I will be updating the CSS to significantly reduce padding and margins on mobile devices (max-width: 768px). Controls will stack vertically and buttons will be more tap-friendly.

## Proposed Changes

### [MODIFY] [index.css](file:///Users/martinmana/Documents/Projects/808-music-tools/src/index.css)
- Add `@media (max-width: 768px)` block.
- **Root**: Reduce padding from `2rem` to `1rem`. `max-width` 100%.
- **Headers**: Reduce `h1` font size.
- **Buttons**: Larger touch targets, possibly full width `width: 100%` inside controls.
- **Components**:
    - `.glass-panel`: Reduce padding to `1rem`.
    - `.waveform-container`: Ensure full width.

### [MODIFY] [App.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/App.tsx)
- No direct JS changes needed if we handle navigation layout via CSS or standard flex wrapping (already enabled).
- We might want to ensure the `nav` buttons have smaller horizontal padding or stack nicely.

### [MODIFY] [PracticePlayer.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/components/PracticePlayer.tsx)
- Ensure control groups flex-wrap or switch to column direction on mobile.
- Increase slider height/thumb size via CSS for easier touch.

# Sequencer Mobile Scaling

## User Review Required
> [!NOTE]
> I will refactor the Sequencer to use flexible layouts. The buttons will shrink to fit the screen width while maintaining a square aspect ratio. Fixed pixel widths will be replaced with responsive flex properties.

## Proposed Changes

### [MODIFY] [Sequencer.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/components/Sequencer.tsx)
- Change main container `maxWidth` to `100vw` (with margin consideration).
- Row containers: `display: flex`.
- Label: Keep fixed or responsive? Keep fixed `60px` or slightly smaller on mobile.
- Buttons:
    - Remove fixed `width: 40px`.
    - Add `flex: 1`.
    - Add `min-width: 0` (crucial for flex shrinking).
    - Add `aspect-ratio: 1 / 1`.
    - Ensure `height` is auto/controlled by aspect ratio.

# Metronome Accent Implementation

## User Review Required
> [!NOTE]
> I will update the metronome sound to have a significantly higher pitch and potentially a sharper attack on the first beat of the bar (Beat 1), making it clearly distinguishable from the other beats.

## Proposed Changes

### [MODIFY] [Metronome.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/components/Metronome.tsx)
- **Visuals**: Beat 1 is already red, others are primary color. This is good.
- **Audio**:
    - Current logic: `beatNumber % 4 === 0 ? 1000 : 800`.
    - New logic: Increase the frequency gap. e.g., **1200Hz** for High, **600Hz** for Low.
    - Optional: slightly longer decay for the accent note to make it "ping" more.

# Metronome Visual Sync & Blink

## User Review Required
> [!NOTE]
> I will decouple the visual updates from the scheduling loop. Instead, I will use precise timeouts to sync the LED flash with the actual audio playback time. The LED will now have a 50% duty cycle (ON for half the beat, OFF for half) as requested.

## Proposed Changes

### [MODIFY] [Metronome.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/components/Metronome.tsx)
- **State**: Replace `beat` with `activeBeat` (number | null).
- **Ref**: Add `visualTimers` array ref to clean up timeouts.
- **Logic**:
    - Remove `setBeat` from `nextNote`.
    - In `scheduleNote`:
        - Calculate `playTime = (time - audioContext.currentTime) * 1000`.
        - Calculate `duration = (60 / bpm) * 1000 / 2` (Half beat).
        - `setTimeout` to set `activeBeat(beatNumber)` at `playTime`.
        - `setTimeout` to set `activeBeat(null)` at `playTime + duration`.
- **Cleanup**: Clear timeouts on Stop/Pause.

## Verification
- Start Metronome.
- Verify Red light hits exactly on the Downbeat sound.
- Verify light turns off between beats.

### Walkthrough
# Audio Practice & Metronome Trainer Walkthrough

I have added two major features to the MusicTools app: the **Audio Practice Player** and the **Metronome Trainer Mode**.

## Changes

### 1. New "Practice" Tab
A new tab has been added to the main navigation for the **Practice Player**.

### 2. Audio Practice Player
Located in the "Practice" tab, this tool helps you learn songs by ear.
- **Upload MP3**: Click the upload button to load an audio file.
- **Waveform Visualization**: See the audio structure.
- **Speed Control**: Slow down the audio (0.25x - 1.5x) *without changing the pitch*.
- **Always-On Loop**: A loop region covering the entire track is created automatically.
    - **Trim**: Drag the **thick, red, textured handles** on the waveform to set the start and end points of the loop. They are designed to look like physical sliders for easy grabbing.
    - **Looping**: Playback will automatically jump back to the start handle when it reaches the end handle.
    - **Strict Playback**: You can only play audio *inside* the loop region. Clicking outside it or moving the start handle past the playhead will automatically snap the playback position into the valid loop area.

### 3. Metronome Trainer Mode
Added a "Trainer" feature to the Metronome.
- **Enable Trainer**: Toggle the new mode below the start button.
- **Ramping**: Set a `Start BPM`, `Target BPM`, and `Duration`.
- **Progressive Update**: The metronome will automatically increase tempo from Start to Target over the specified duration.

### 4. Metronome Enhancements
- **Accent**: The first beat of every bar plays at a higher pitch (1200Hz) than others (600Hz).
- **Visual Sync**: The light indicator is now perfectly synchronized with the audio click.
- **Blink**: The indicator blinks with a 50% duty cycle (ON for 50% of the beat, OFF for 50%), giving a clear visual tempo reference.

### 5. Mobile Optimization
- The entire app is now responsive.
- **Stacked Layout**: Controls stack vertically on mobile screens.
- **Sequencer**: Buttons scale and remain square on small screens.
- **Touch**: Larger buttons and sliders for easier mobile interaction.

## Verification Results

### Manual Testing Guide
1.  **Practice Player**:
    -   Go to the **Practice** tab.
    -   Upload a song.
    -   Verify the loop handles are now wide, red, and have a grip texture.
    -   Verify dragging them feels responsive.
    -   Press Play. It should play.
    -   Lower speed to 0.75x. Verify pitch remains constant.
2.  **Metronome Trainer**:
    -   Go to **Metronome** tab.
    -   Click **Enable Trainer**.
    -   Set Start: 80, Target: 100, Duration: 20s.
    -   Click **Start**.
    -   Verify the BPM ramps up correctly.
3.  **Metronome Accent & Visuals**:
    -   Start the metronome.
    -   Listen for the "Ping - click - click - click" pattern.
    -   Watch the red light. It should flash ON exactly when the sound plays, and turn OFF halfway through the beat.
4.  **Mobile**:
    -   Resize window to narrow width.
    -   Verify Sequencer grid scales down.
    -   Verify controls stack.

<a name="log-20251230-theme-practice-update"></a>
## [2025-12-30] Industrial UI & Practice Enhancements

**User Prompt:**
> I like the industrial design. But could we have a theme selector? and make the light theme the default.
> when we load an audio file in the practice tab, it has to remain there... click in the audio track WITHIN the loop... OUTSIDE of the loop area, the audio track should be 'greyed out'

### Implementation Plan
# Theme System Implementation

## Goal
Implement a dynamic **Theme Selector** allowing users to switch between Light and Dark modes.
**Requirement**: "Light Mode" will be the **default**.
**Aesthetic**: "Nice", "Industrial".
-   **Light Mode**: Dieter Rams / Braun aesthetic. Off-white backgrounds, sharp grey borders, high-contrast black text, Orange accent.
-   **Dark Mode**: The existing "Lab Equipment" dark industrial look.

## Technical Strategy
We will use **CSS Custom Properties (Variables)** mapped to Tailwind's `@theme`.

### 1. Refactor `index.css`
Define semantic variables in `:root` (Light) and `.dark` (Dark).

```css
:root {
  /* LIGHT (Default) */
  --color-bg-app: #fafafa;      /* Zinc-50 */
  --color-bg-panel: #ffffff;    /* White */
  --color-border: #e4e4e7;      /* Zinc-200 */
  --color-text-base: #18181b;   /* Zinc-900 */
  --color-text-muted: #71717a;  /* Zinc-500 */
  --color-primary-accent: #f97316; /* Orange-500 */
}

.dark {
  /* DARK (Industrial) */
  --color-bg-app: #09090b;      /* Zinc-950 */
  --color-bg-panel: #18181b;    /* Zinc-900 */
  --color-border: #27272a;      /* Zinc-800 */
  --color-text-base: #e4e4e7;   /* Zinc-200 */
  --color-text-muted: #52525b;  /* Zinc-600 */
}
```

# Practice Player Enhancements

## Goal
Improve usability of the Practice Player by adding persistence, file management, and better loop interactions.

## Key Changes

### 1. Persistence (Lift State)
-   **Current**: `PracticePlayer` holds local state. Unmounting (tab switch) loses the file.
-   **New**: `App.tsx` will hold `audioFile` (Blob | null).

### 2. Remove Track
-   Add a "REMOVE FILE" button in `PracticePlayer` that calls `onClear`.

### 3. Loop Interaction (Click-to-Seek)
-   **Problem**: Clicking a region currently triggers `region.play()` which might reset or toggle.
-   **Fix**: Update `region-clicked` handler to seek to exact cursor position.

### 4. Visuals (Focus Mode)
-   **Requirement**: "Outside loop should be greyed out".
-   **Strategy**: Set base `waveColor` to a darker, low-contrast shade to represent "masked/disabled".

### Walkthrough
# 808.TOOLS - Audio Engine Walkthrough

**Current Version: v2.3.0 (Enhanced Practice Desk)**

The application now features a persistent and robust Practice Deck with advanced looping controls.

## 🎨 Theme System
-   **Dual Theme**: Light (Braun) / Dark (Industrial).
-   **Toggle**: Header-integrated switch.

## 🛠 Modules
### 1. Practice Deck (PRACTICE_DECK)
-   **Persistence**: Audio track remains loaded when switching between tabs.
-   **File Management**: Load / Remove Track.
-   **Looping Logic**:
    -   **Strict Lock**: Playback snaps inside the loop region.
    -   **Click-to-Seek**: Clicking inside instantly jumps to that point.
-   **Visuals**:
    -   **Disabled Area**: Base waveform is muted/dimmed.
    -   **Active Area**: Loop region is highlighted (Safety Orange tint).

<a name="log-20251230-tuner-gauge-refresh"></a>
## [2025-12-30] Classic Gauge Tuner

**User Prompt:**
> i would like to try a different type of uner design. probably more on the classic side, the arrow gauge thing,

### Implementation Plan
# Tuner Redesign - Classic Arrow Gauge

## Goal Description
Values the user's request for a "classic arrow gauge" tuner design.
This change replaces the sliding linear ruler with a skeuomorphic/industrial analog gauge.

## Proposed Changes
### Components
#### [MODIFY] [Tuner.tsx](file:///Users/martinmana/Documents/Projects/808-music-tools/src/components/Tuner.tsx)
- Remove existing "Sliding Ruler" JSX.
- Implement an SVG-based Gauge:
    - **Arc**: 180-degree or 220-degree arc representing the pitch range (-50 to +50 cents).
    - **Ticks**: Generated programmatically (Major ticks every 10 cents, Minor every 2? or 5?).
    - **Needle**: A rotating element pivoting from the bottom center. Rotation angle driven by `cents` state.
    - **Smoothing**: Apply CSS transition to the rotation for damped movement.
- Update "Note Display" to float above or below the gauge pivot.

## Verification Plan
### Manual Verification
1.  Start the app (`npm run dev`).
2.  Navigate to Tuner.
3.  Activate Mic.
4.  Hum or play a tone.
5.  Verify:
    - Needle moves smoothly to indicate pitch.
    - Center (0 cents) is vertical.
    - Left is Flat, Right is Sharp.
    - Visuals match the "Industrial" theme (using project variable colors).


### Walkthrough
# Walkthrough - Classic Gauge Tuner

## Changes
### TunerRedesign
- Replaced the linear sliding ruler with an **SVG-based Analog Gauge**.
- Implemented a **Needle** indicator that rotates based on pitch `cents`.
- **Visuals**:
    - **Arc**: 180-degree semicircular gauge.
    - **Ticks**: Programmatic ticks for every 10 cents.
    - **Labels**: Numeric labels (-50, -30, 0, +30, +50) along the arc.
    - **Needle**: Orange (Primary color) needle with smooth CSS transitions.
    - **Pivot**: Central pivot point for realistic look.

## Verification Results
### Manual Testing
- **Visual Inspection**: The gauge renders as a 180-degree arc.
- **Animation**: The needle rotates smoothly from -90deg (-50 cents) to +90deg (+50 cents).
- **Responsiveness**: The gauge scales within its container max-width (300px).
- **Theme Integration**: Uses `var(--color-primary)` and `var(--color-text-muted)` for consistent industrial styling.

## Screenshots
> [!NOTE]
> Since this is a visual change, please verify the animation smoothness in the browser.

| Feature | Description |
| :--- | :--- |
| **Old** | Linear sliding tape ruler. |
| **New** | Analog arrow gauge with pivoting needle. |
