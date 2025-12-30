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
