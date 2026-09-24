// app/components/onboard/cinema/CinematicAudio.ts
// Native Web Audio API Synthesizer for high-tech cinema sound design.
// Zero external asset dependencies, zero network requests, 100% resilient.

class CinematicAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private userHasInteracted: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("afyvia-cinema-audio");
      // Default to muted to respect user ambient environment, unless explicitly enabled
      this.isMuted = saved === "active" ? false : true;

      const onInteraction = () => {
        this.userHasInteracted = true;
        if (this.ctx && this.ctx.state === "suspended") {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener("pointerdown", onInteraction);
        window.removeEventListener("keydown", onInteraction);
      };
      window.addEventListener("pointerdown", onInteraction, { once: true, passive: true });
      window.addEventListener("keydown", onInteraction, { once: true, passive: true });
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    // Guard against instantiating AudioContext before any user gesture
    if (!this.ctx) {
      if (!this.userHasInteracted && this.isMuted) return null;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          return null;
        }
      }
    }
    if (this.ctx && this.ctx.state === "suspended" && this.userHasInteracted) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getActive(): boolean {
    return !this.isMuted;
  }

  public toggle(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("afyvia-cinema-audio", this.isMuted ? "muted" : "active");
    }
    if (!this.isMuted) {
      this.getContext();
      this.playClick();
    }
    return !this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("afyvia-cinema-audio", muted ? "muted" : "active");
    }
  }

  // Soft tactile UI click snap
  public playClick(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Audio context policy safe guard
    }
  }

  // Deep cinema sub-bass transition swoosh
  public playActTransition(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Sub-bass rumble
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.45);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + 0.45);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);

      // Sci-fi harmonic shimmer
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(660, now);
      shimmer.frequency.exponentialRampToValueAtTime(1320, now + 0.25);

      shimmerGain.gain.setValueAtTime(0.04, now);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);

      shimmer.start(now);
      shimmer.stop(now + 0.26);
    } catch {
      // Safe fallback
    }
  }

  // High-tech regulatory scanner beam chirp
  public playScanner(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.18);
      osc.frequency.linearRampToValueAtTime(600, now + 0.35);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Safe fallback
    }
  }

  // Harmonic success chord chime (C5 - E5 - G5 - C6)
  public playSuccess(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.06;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.09, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.42);
      });
    } catch {
      // Safe fallback
    }
  }

  // Grand Premiere Fanfare for go-live celebration
  public playPremiere(): void {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const chords = [
        [440, 554.37, 659.25], // A major
        [493.88, 622.25, 739.99], // B major
        [587.33, 739.99, 880.0], // D major
        [659.25, 830.61, 987.77, 1318.51], // E major 9
      ];

      chords.forEach((chord, step) => {
        const stepTime = now + step * 0.18;
        chord.forEach((freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, stepTime);

          const dur = step === chords.length - 1 ? 1.2 : 0.25;
          gain.gain.setValueAtTime(0.08, stepTime);
          gain.gain.exponentialRampToValueAtTime(0.001, stepTime + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(stepTime);
          osc.stop(stepTime + dur + 0.05);
        });
      });
    } catch {
      // Safe fallback
    }
  }
}

export const cinematicAudio = new CinematicAudioEngine();
