/**
 * footstepAudio.js
 *
 * Ultra-lightweight Web Audio API synthesizer for the Dinosaur startup loader.
 * Generates subtle, soft pixel-like footstep taps and departure dust ticks.
 *
 * Zero external audio files. Zero network payload.
 * Strictly respects browser autoplay policies (default muted, non-blocking).
 */

class FootstepAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isEnabled = false;
    this.tapTimer = null;
    this.lastTapTime = 0;
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
      this.isEnabled = this.audioCtx && this.audioCtx.state === 'running';
      return this.isEnabled;
    } catch {
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Disables/mutes audio playback.
   */
  disableAudio() {
    this.isEnabled = false;
  }

  /**
   * Toggles audio on/off.
   */
  async toggleAudio() {
    if (this.isEnabled) {
      this.disableAudio();
      return false;
    }
    return await this.enableAudio();
  }

  /**
   * Plays a single subtle pixel footstep tap.
   * @param {number} rateFactor - 1.0 = normal run (~600Hz), >1.0 = accelerating
   */
  playFootstep(rateFactor = 1.0) {
    if (!this.isEnabled || !this.audioCtx || this.audioCtx.state !== 'running') return;

    try {
      const now = this.audioCtx.currentTime;
      // Prevent overlapping taps if called too frequently
      if (now - this.lastTapTime < 0.035) return;
      this.lastTapTime = now;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      // Soft triangle wave for a muted, crisp pixel tap
      osc.type = 'triangle';
      const baseFreq = 580 * Math.min(rateFactor, 1.35);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.42, now + 0.022);

      // Low volume (0.03 to 0.045)
      const volume = 0.035;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Non-blocking; continue silently
    }
  }

  /**
   * Plays a very subtle, quiet digital tick for pixel-dust scatter.
   */
  playDustTick() {
    if (!this.isEnabled || !this.audioCtx || this.audioCtx.state !== 'running') return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1250, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.012);

      const volume = 0.025; // extremely quiet
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.015);
    } catch {
      // Continue silently
    }
  }

  /**
   * Cleans up all audio resources.
   */
  destroy() {
    this.disableAudio();
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}

export const footstepAudio = new FootstepAudioSynthesizer();
