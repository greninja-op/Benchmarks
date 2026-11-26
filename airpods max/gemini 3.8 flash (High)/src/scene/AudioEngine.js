/**
 * AudioEngine - Web Audio API Procedural Synthesizer
 * Generates tactile haptics, magnetic snaps, and Apple-grade ambient audio chimes
 * with zero external audio assets.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.lastTickTime = 0;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Tactile Digital Crown haptic click on scroll
   */
  playCrownClick(velocity = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = performance.now();
    if (now - this.lastTickTime < 45) return; // throttle clicks
    this.lastTickTime = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High frequency mechanical micro-tick
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.012);

    gain.gain.setValueAtTime(0.04 * Math.min(1.5, velocity), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.016);
  }

  /**
   * Magnetic Ear Cushion Snap "Thump"
   */
  playMagneticSnap() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(120, t);
    subOsc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

    subGain.gain.setValueAtTime(0.22, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.1);

    // Mechanical crisp metallic snap click
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(2400, t);
    snapOsc.frequency.exponentialRampToValueAtTime(600, t + 0.02);

    snapGain.gain.setValueAtTime(0.08, t);
    snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(t);
    snapOsc.stop(t + 0.03);
  }

  /**
   * Spatial Audio / Apple Mode Switch Chime
   */
  playSpatialChime() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 harmonic overtone

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);

      gain.gain.setValueAtTime(0, t + idx * 0.04);
      gain.gain.linearRampToValueAtTime(0.035, t + idx * 0.04 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.6);
    });
  }
}

export const sound = new AudioEngine();
