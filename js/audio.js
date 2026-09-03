/*
 * audio.js — tiny sound effects made with the Web Audio API.
 *
 * No sound files: every effect is a short beep built from an oscillator.
 * Browsers block audio until the player interacts with the page, so we
 * create the AudioContext lazily on the first key press.
 */
SD.audio = (function () {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** Play one note. type: 'sine' | 'square' | 'sawtooth' | 'triangle' */
  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ac = ensure();
    if (!ac) return;

    const osc = ac.createOscillator();
    const amp = ac.createGain();
    const t0 = ac.currentTime;

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);

    // A quick fade in/out stops the click you'd otherwise hear.
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(amp).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function melody(notes) {
    notes.forEach((n, i) => setTimeout(() => tone(n[0], n[1], 'square', 0.07), i * 90));
  }

  return {
    unlock: ensure,
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },

    throw_() { tone(520, 0.08, 'triangle', 0.05, 260); },
    score()  { melody([[660, 0.09], [880, 0.12]]); },
    miss()   { tone(180, 0.16, 'sawtooth', 0.05, 90); },
    crash()  { tone(140, 0.35, 'sawtooth', 0.10, 55); },
    steal()  { tone(300, 0.2, 'square', 0.07, 120); },
    bump()   { tone(90, 0.12, 'square', 0.06); },
    warn()   { tone(420, 0.07, 'sine', 0.05); },
    levelUp(){ melody([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.18]]); },
    gameOver(){ melody([[440, 0.16], [349, 0.16], [262, 0.34]]); },
  };
})();
