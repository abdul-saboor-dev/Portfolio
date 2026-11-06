/**
 * footstepAudio.js
 *
 * Ultra-lightweight Web Audio API synthesizer for the Dinosaur startup loader.
 * Generates subtle, soft pixel-like footstep taps and departure dust puffs.
 *
 * Zero external audio files. Zero network payload.
 * Sound is preferred ON by default and is attempted automatically the moment the
 * preloader appears: no click, tap, key or volume control is required. Where the
 * browser's autoplay policy denies it, the context stays suspended, every play call
 * is skipped, and a real interaction acts only as a fallback — browser restrictions
 * are respected, never bypassed, and no UI ever claims audio is active.
 */

// Small fixed variation table: alternating taps differ slightly in pitch and level
// so the gait breathes, without the chaos of a random walk.
const TAP_VARIATION = [1, 0.968, 1.024, 0.985, 1.042, 0.955];

// Left / right foot base frequencies, triangle wave for a muted crisp pixel tap.
const FOOT_FREQS = [560, 610];

class FootstepAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.preferenceEnabled = true;
    this.unlocked = false;
    this.disposed = false;
    this.lastTapTime = 0;
    this.tapIndex = 0;
    this.disarm = null;
  }

  get isEnabled() {
    return (
      !this.disposed &&
      this.preferenceEnabled &&
      this.unlocked &&
      this.audioCtx !== null &&
      this.audioCtx.state === 'running'
    );
  }

  /** Lets the loader's frame loop stop scheduling once the sequence has ended. */
  get isDisposed() {
    return this.disposed;
  }

  /**
   * Fallback only, for origins whose autoplay policy denies gesture-free playback.
   * Listeners drop out as soon as the context is actually running.
   */
  armOnFirstInteraction() {
    if (this.disarm || this.disposed) return;
    const unlock = () => {
      this.enableAudio().then((unlocked) => {
        if (unlocked) this.disarmListeners();
      });
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
    this.disarm = () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }

  disarmListeners() {
    if (this.disarm) {
      this.disarm();
      this.disarm = null;
    }
  }

  /**
   * Called by every preloader appearance, before the dinosaur has travelled
   * anywhere. Attempts audible playback immediately without waiting for a gesture.
   * Nothing here awaits, so a denied autoplay policy cannot delay the animation.
   */
  start() {
    if (!this.preferenceEnabled) return false;
    // The previous appearance released its context; this one owns a fresh session.
    this.disposed = false;
    this.tapIndex = 0;
    this.lastTapTime = 0;
    this.enableAudio();
    // Autoplay granted means there is nothing left to unlock, so no listeners at all.
    if (!this.unlocked) this.armOnFirstInteraction();
    return this.unlocked;
  }

  /**
   * Initializes or resumes the AudioContext. Safe to call with no user activation:
   * the call simply leaves the context suspended until the policy lifts it.
   */
  async enableAudio() {
    if (this.disposed) return false;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
          this.master = this.audioCtx.createGain();
          this.master.gain.value = 0.85;
          this.master.connect(this.audioCtx.destination);
          // A blocked context may never resolve resume(), so the state event is what
          // actually flips playback on — including when autoplay is granted upfront.
          this.audioCtx.onstatechange = () => {
            this.unlocked =
              !this.disposed &&
              this.audioCtx !== null &&
              this.audioCtx.state === 'running';
          };
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
   * Short deterministic noise burst, generated once per context and reused by every
   * tap: pixel edges read as broadband transients, and a cached buffer keeps the
   * frame loop allocation-free.
   */
  ensureNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const ctx = this.audioCtx;
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.03));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x1a2b3c4d;
    for (let i = 0; i < length; i += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
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
   * Plays a single subtle pixel footstep. The caller passes the foot that the
   * sprite's current pose has planted, so the audio alternates with the artwork.
   * @param {number} foot - 0 = left pose, 1 = right pose
   * @param {number} rateFactor - 1.0 = normal run, >1.0 = accelerating sprint
   */
  playFootstep(foot = 0, rateFactor = 1.0) {
    if (!this.isEnabled) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      // Prevent overlapping taps if called too frequently
      if (now - this.lastTapTime < 0.035) return;
      this.lastTapTime = now;

      const variation = TAP_VARIATION[this.tapIndex % TAP_VARIATION.length];
      this.tapIndex += 1;
      const scale = Math.min(rateFactor, 1.35) * variation;

      // Body: a short triangle blip that falls away immediately, so the tap sounds
      // like a pixel striking ground rather than a sustained tone.
      const osc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = FOOT_FREQS[foot === 0 ? 0 : 1] * scale;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.52, now + 0.024);
      // Starting at the peak level would click, so every layer opens with an attack.
      bodyGain.gain.setValueAtTime(0.0001, now);
      bodyGain.gain.linearRampToValueAtTime(0.03, now + 0.004);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.connect(bodyGain);
      bodyGain.connect(this.master);
      osc.start(now);
      osc.stop(now + 0.06);

      // Edge: filtered noise transient, quieter than the body, that gives the tap
      // its crisp digital tick without adding bass.
      const noise = ctx.createBufferSource();
      noise.buffer = this.ensureNoiseBuffer();
      noise.playbackRate.value = 1 + (variation - 1) * 2;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(2100 * scale, now);
      band.Q.value = 1.3;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.016, now + 0.002);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);
      noise.connect(band);
      band.connect(noiseGain);
      noiseGain.connect(this.master);
      noise.start(now);
      noise.stop(now + 0.03);
    } catch {
      // Non-blocking; continue silently
    }
  }

  /**
   * Plays a very subtle filtered noise puff for pixel-dust scatter, so the dust
   * reads as debris leaving rather than as another footstep or a beep.
   * @param {number} strength - 1.0 for the first kick, lower for the trailing ones
   */
  playDustTick(strength = 1) {
    if (!this.isEnabled) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const noise = ctx.createBufferSource();
      noise.buffer = this.ensureNoiseBuffer();
      noise.playbackRate.value = 0.8;

      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.setValueAtTime(1100, now);
      band.frequency.exponentialRampToValueAtTime(420, now + 0.05);
      band.Q.value = 0.9;

      const gain = ctx.createGain();
      const volume = 0.02 * Math.min(strength, 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      noise.connect(band);
      band.connect(gain);
      gain.connect(this.master);

      noise.start(now);
      noise.stop(now + 0.07);
    } catch {
      // Continue silently
    }
  }

  /**
   * Releases audio resources for good. The sound *preference* is deliberately left
   * untouched: ending the startup lifecycle is not the user asking to be muted.
   */
  destroy() {
    this.disposed = true;
    this.disarmListeners();
    this.unlocked = false;
    this.noiseBuffer = null;
    if (this.master) {
      try {
        this.master.disconnect();
      } catch {}
      this.master = null;
    }
    if (this.audioCtx) {
      this.audioCtx.onstatechange = null;
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}

export const footstepAudio = new FootstepAudioSynthesizer();
