/**
 * footstepAudio.js
 *
 * Ultra-lightweight Web Audio API synthesizer for the Dinosaur startup loader.
 * Generates subtle, soft pixel-like footstep taps and departure dust ticks.
 *
 * Zero external audio files. Zero network payload.
 * Sound is preferred ON by default but stays fully autoplay-safe: no AudioContext
 * exists and nothing plays until a genuine user gesture unlocks playback, and no
 * UI ever claims audio is active.
 */

class FootstepAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.preferenceEnabled = true;
    this.unlocked = false;
    this.lastTapTime = 0;
    this.foot = 0;
    this.disarm = null;
  }

  get isEnabled() {
    return (
      this.preferenceEnabled &&
      this.unlocked &&
      this.audioCtx !== null &&
      this.audioCtx.state === 'running'
    );
  }

  /**
   * Registers one-shot gesture listeners so playback can begin on the first
   * legitimate interaction, satisfying browser autoplay policies.
   */
  armOnFirstInteraction() {
    if (this.disarm) return;
    const unlock = () => {
      this.enableAudio();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    this.disarm = () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }

  /**
   * Initializes or resumes the AudioContext upon user interaction.
   */
  async enableAudio() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.unlocked = this.audioCtx !== null && this.audioCtx.state === 'running';
      return this.unlocked;
    } catch {
      this.unlocked = false;
      return false;
    }
  }

  /**
   * Disables/mutes audio playback.
   */
  disableAudio() {
    this.preferenceEnabled = false;
  }

  /**
   * Toggles audio on/off. Reserved for a future settings control.
   */
  async toggleAudio() {
    if (this.preferenceEnabled) {
      this.disableAudio();
      return false;
    }
    this.preferenceEnabled = true;
    return await this.enableAudio();
  }

  /**
   * Plays a single subtle pixel footstep tap, alternating between the two feet
   * so the audio cadence matches the running sprite's leg cycle.
   * @param {number} rateFactor - 1.0 = normal run, >1.0 = accelerating sprint
   */
  playFootstep(rateFactor = 1.0) {
    if (!this.isEnabled) return;

    try {
      const now = this.audioCtx.currentTime;
      // Prevent overlapping taps if called too frequently
      if (now - this.lastTapTime < 0.035) return;
      this.lastTapTime = now;

      this.foot ^= 1;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Soft triangle wave for a muted, crisp pixel tap; each foot gets its own
      // pitch so the gait reads as left/right rather than a metronome.
      osc.type = 'triangle';
      const baseFreq = (this.foot === 0 ? 560 : 610) * Math.min(rateFactor, 1.35);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.42, now + 0.022);

      // Short attack then decay: starting at the peak level would click.
      const volume = 0.035;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Non-blocking; continue silently
    }
  }

  /**
   * Plays a very subtle, quiet digital tick for pixel-dust scatter.
   */
  playDustTick() {
    if (!this.isEnabled) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.012);

      const volume = 0.025; // extremely quiet
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.014);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch {
      // Continue silently
    }
  }

  /**
   * Cleans up all audio resources.
   */
  destroy() {
    if (this.disarm) {
      this.disarm();
      this.disarm = null;
    }
    this.preferenceEnabled = false;
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    this.unlocked = false;
  }
}

export const footstepAudio = new FootstepAudioSynthesizer();
