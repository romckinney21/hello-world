/*
 * input.js — keyboard handling.
 *
 * `held` answers "is this key down right now?" (used for steering).
 * `pressed` answers "was this key tapped since the last frame?" (used for
 * one-off actions like tossing a bag, so holding the key doesn't spam it).
 */
SD.input = (function () {
  const held = Object.create(null);
  const tapped = Object.create(null);

  // Friendly names -> the browser's KeyboardEvent.code values.
  const MAP = {
    left:  ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up:    ['ArrowUp', 'KeyW'],
    down:  ['ArrowDown', 'KeyS'],
    tossLeft:  ['KeyZ', 'Comma'],
    tossRight: ['KeyX', 'Period'],
    tossAuto:  ['Space'],
    start:  ['Enter', 'Space'],
    pause:  ['KeyP'],
    mute:   ['KeyM'],
    restart:['KeyR'],
  };

  function anyOf(action, table) {
    return MAP[action].some((code) => table[code]);
  }

  window.addEventListener('keydown', (e) => {
    // Stop the arrow keys and space from scrolling the page.
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if (!held[e.code]) tapped[e.code] = true; // ignore OS key-repeat
    held[e.code] = true;
    SD.audio.unlock();
  });

  window.addEventListener('keyup', (e) => {
    held[e.code] = false;
  });

  // If the player alt-tabs away, forget every key so the scooter doesn't
  // keep steering on its own when they come back.
  window.addEventListener('blur', () => {
    for (const k in held) held[k] = false;
  });

  return {
    down(action) { return anyOf(action, held); },
    hit(action) { return anyOf(action, tapped); },
    /** Called once at the end of every frame. */
    flush() { for (const k in tapped) tapped[k] = false; },
  };
})();
