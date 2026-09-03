/*
 * main.js — wiring: grab the canvas, run the loop, keep time.
 */
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const game = new SD.Game();

  // Handy for poking around in the browser console: SD.game.score = 9999
  SD.game = game;

  // Clicking or tapping the canvas starts the game. This matters when the
  // page is embedded in another site: the click is also what hands keyboard
  // focus to the game, so the arrow keys start working.
  canvas.addEventListener('pointerdown', () => {
    SD.audio.unlock();
    window.focus();
    if (game.state === 'title' || game.state === 'gameover') game.start();
  });

  let last = performance.now();

  function frame(now) {
    // dt = seconds since the last frame. Capped so that alt-tabbing away
    // doesn't teleport the scooter through half the street on the way back.
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    if (SD.input.hit('mute')) SD.audio.toggleMute();

    game.update(dt, SD.input);
    game.draw(ctx);
    SD.input.flush();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
