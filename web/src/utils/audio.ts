// Web Audio API synthesizer for workout chimes and personal record celebrations
// Does not require any external audio files or third-party audio packages.

class SoundSynthesizer {
  private audioCtx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Play a clean, modern 3-tone notification chime when the rest timer reaches 0.
   */
  playRestFinishedChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Notes: D5 (587.33Hz), F#5 (739.99Hz), A5 (880Hz)
      const pitches = [587.33, 739.99, 880];
      const now = ctx.currentTime;

      pitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const startTime = now + idx * 0.14;
        const duration = 0.28;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });

      // Mobile device haptic feedback if available
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([150, 80, 150]);
      }
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  /**
   * Play an energetic, triumphant celebration fanfare when achieving a Personal Record (PR).
   */
  playPRCelebrationFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Ascending triumphant fanfare: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.5)
      const notes = [
        { freq: 523.25, timeOffset: 0.0, dur: 0.16, vol: 0.2 },
        { freq: 659.25, timeOffset: 0.15, dur: 0.16, vol: 0.22 },
        { freq: 783.99, timeOffset: 0.3, dur: 0.2, vol: 0.25 },
        { freq: 1046.5, timeOffset: 0.5, dur: 0.5, vol: 0.3 },
      ];

      const now = ctx.currentTime;

      notes.forEach(({ freq, timeOffset, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const start = now + timeOffset;

        osc.type = 'triangle'; // Richer, warmer brass/fanfare tone
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(vol, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur);
      });

      // Stronger celebratory haptic feedback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([80, 60, 80, 60, 200]);
      }
    } catch (e) {
      console.warn('Audio PR fanfare playback error:', e);
    }
  }
}

export const soundManager = new SoundSynthesizer();
