class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Load muted state from localStorage if available
    const saved = localStorage.getItem('sound_muted');
    this.muted = saved === 'true';
  }

  private initCtx() {
    if (!this.ctx) {
      // Lazy load the AudioContext because browsers block auto-play until interaction
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMute(muted: boolean) {
    this.muted = muted;
    localStorage.setItem('sound_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.setMute(!this.muted);
    return this.muted;
  }

  /**
   * Quick Tick Sound (Wheel clicks, Slot reel clicks)
   */
  public playTick(pitch: number = 600, duration: number = 0.05) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      // Fast sweep downwards for an organic tick
      osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio failed to play", e);
    }
  }

  /**
   * Plinko Bounce / Peg collision ping
   */
  public playPlinkoBounce() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sine';
      // High bright frequency bouncing down
      const randomFreq = 800 + Math.random() * 400;
      osc.frequency.setValueAtTime(randomFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio failed to play", e);
    }
  }

  /**
   * Claw moving mechanical hum
   */
  public playClawMove() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, this.ctx.currentTime);
      // Slight vibrato
      osc.frequency.linearRampToValueAtTime(95, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio failed to play", e);
    }
  }

  /**
   * Claw grab clamp sound
   */
  public playClawGrab() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio failed to play", e);
    }
  }

  /**
   * Slot machine handle pull
   */
  public playLeverPull() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio failed to play", e);
    }
  }

  /**
   * Spectacular win chime sweep
   */
  public playWin() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const startTime = this.ctx.currentTime;
      // Arpeggio chimes
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
      
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + idx * 0.08);

        // Retro vibraphone style sustain and decay
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + idx * 0.08 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + idx * 0.08 + 0.4);

        osc.start(startTime + idx * 0.08);
        osc.stop(startTime + idx * 0.08 + 0.45);
      });
    } catch (e) {
      console.warn("Audio failed to play", e);
    }
  }
}

export const soundManager = new SoundManager();
