/*
 * hud.js — the read-outs drawn on top of the street, plus the full-screen
 * title / pause / game-over panels.
 */
SD.hud = (function () {
  const C = SD.C;
  const U = SD.utils;

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(10, 14, 24, .88)';
    U.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 170, 220, .28)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function text(ctx, str, x, y, size, color, align, weight) {
    ctx.fillStyle = color || '#e8eefc';
    ctx.font = `${weight || 'bold'} ${size}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  /** The strip along the top: score, level, lives. */
  function drawTopBar(ctx, game) {
    panel(ctx, 12, 12, 300, 62);
    text(ctx, 'SCORE', 26, 30, 12, '#8fa0c0');
    text(ctx, String(game.score).padStart(6, '0'), 26, 52, 24);
    text(ctx, 'LEVEL', 150, 30, 12, '#8fa0c0');
    text(ctx, String(game.level), 150, 52, 24);
    text(ctx, 'STREAK', 210, 30, 12, '#8fa0c0');
    text(ctx, `x${game.combo}`, 210, 52, 24, game.combo > 1 ? '#78e8ff' : '#e8eefc');

    // Lives, as little red delivery boxes.
    panel(ctx, 322, 12, 122, 62);
    text(ctx, 'LIVES', 336, 30, 12, '#8fa0c0');
    const pips = Math.min(game.lives, 5);
    for (let i = 0; i < pips; i++) {
      ctx.fillStyle = '#e2534b';
      U.roundRect(ctx, 336 + i * 19, 44, 15, 15, 4);
      ctx.fill();
    }
    if (game.lives > 5) text(ctx, `+${game.lives - 5}`, 336 + 5 * 19, 52, 13, '#e2534b');

    // Refund strikes — three in a row ends the shift.
    panel(ctx, 454, 12, 108, 62);
    text(ctx, 'REFUNDS', 466, 30, 12, '#8fa0c0');
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < game.strikes ? '#ff7a6a' : 'rgba(255,255,255,.14)';
      U.roundRect(ctx, 466 + i * 22, 44, 15, 15, 4);
      ctx.fill();
    }
  }

  /** The delivery ticket: who you're feeding, how far, and how hot it still is. */
  function drawOrder(ctx, game) {
    const x = C.W - 282;
    const w = 270;
    panel(ctx, x, 12, w, 124);

    if (!game.target) {
      text(ctx, 'WAITING FOR ORDER…', x + 16, 74, 16, '#8fa0c0');
      return;
    }

    const gap = Math.round(game.target.porchWy - game.world.playerWy);
    const onLeft = game.target.side < 0;

    text(ctx, 'NEXT DROP', x + 16, 30, 12, '#8fa0c0');
    text(ctx, gap > 0 ? `${gap} m ahead` : `${-gap} m behind`, x + w - 16, 30, 13,
      gap > 0 ? '#c6d2e8' : '#ff7a6a', 'right', 'normal');

    // No house numbers to memorise — you're looking for the lit driveway,
    // so the ticket only has to tell you which side of the street it's on.
    text(ctx, onLeft ? '\u25c0 LEFT' : 'RIGHT \u25b6', x + 16, 58, 26,
      onLeft ? '#9ad7ff' : '#ffb3d1');

    const litW = 116;
    ctx.fillStyle = 'rgba(255, 198, 84, .2)';
    U.roundRect(ctx, x + w - 16 - litW, 46, litW, 24, 12);
    ctx.fill();
    text(ctx, 'LIT DRIVEWAY', x + w - 16 - litW / 2, 58, 13, '#ffc654', 'center');

    // Heat bar — this is your real timer.
    const barX = x + 16, barY = 80, barW = 238, barH = 16;
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    U.roundRect(ctx, barX, barY, barW, barH, 8); ctx.fill();

    const pct = U.clamp(game.heat / 100, 0, 1);
    const color = pct > 0.6 ? '#ff8a3d' : pct > 0.3 ? '#ffd76e' : '#7fc9ff';
    ctx.fillStyle = color;
    U.roundRect(ctx, barX, barY, Math.max(4, barW * pct), barH, 8); ctx.fill();

    ctx.save();
    ctx.globalAlpha = pct < 0.3 ? 0.6 + 0.4 * Math.sin(game.time * 10) : 1;
    text(ctx, pct > 0.3 ? 'HOT' : 'GOING COLD!', barX + barW / 2, barY + barH / 2, 11,
      '#0d1220', 'center');
    ctx.restore();

    // Bags left in the box.
    text(ctx, 'BAGS', x + 16, 113, 11, '#8fa0c0');
    for (let i = 0; i < C.BAGS_PER_ORDER; i++) {
      ctx.fillStyle = i < game.bagsLeft ? '#d87a2e' : 'rgba(255,255,255,.14)';
      U.roundRect(ctx, x + 58 + i * 20, 106, 15, 15, 3);
      ctx.fill();
    }
  }

  /** Speedometer in the bottom-left corner. */
  function drawSpeed(ctx, game) {
    const x = 20, y = C.H - 74;
    panel(ctx, x, y, 150, 54);
    const spd = game.player.speed;
    text(ctx, spd < -4 ? 'REVERSE' : 'SPEED', x + 12, y + 16, 11,
      spd < -4 ? '#ffc654' : '#8fa0c0');

    // The bar runs both ways from a zero mark, so reverse is readable.
    const barX = x + 12, barY = y + 28, barW = 126, barH = 12;
    const zero = barX + barW * (-C.SPEED_REVERSE / (C.SPEED_MAX - C.SPEED_REVERSE));
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    U.roundRect(ctx, barX, barY, barW, barH, 6); ctx.fill();

    const scale = barW / (C.SPEED_MAX - C.SPEED_REVERSE);
    if (spd >= 0) {
      ctx.fillStyle = spd > C.SPEED_MAX * 0.8 ? '#ff8a3d' : '#7fe3a1';
      U.roundRect(ctx, zero, barY, Math.max(3, spd * scale), barH, 3); ctx.fill();
    } else {
      const len = Math.max(3, -spd * scale);
      ctx.fillStyle = '#ffc654';
      U.roundRect(ctx, zero - len, barY, len, barH, 3); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.fillRect(zero - 1, barY - 2, 2, barH + 4);
  }

  /** Big centred message, e.g. "DELIVERED!" or "TOO COLD". */
  function drawToast(ctx, game) {
    // Don't let the last message fight with the game-over panel.
    if (game.toastTime <= 0 || game.state === 'gameover') return;
    ctx.save();
    ctx.globalAlpha = U.clamp(game.toastTime, 0, 1);
    text(ctx, game.toast, C.W / 2, 170, 40, game.toastColor, 'center');
    ctx.restore();
  }

  function dim(ctx, alpha) {
    ctx.fillStyle = `rgba(6, 9, 16, ${alpha})`;
    ctx.fillRect(0, 0, C.W, C.H);
  }

  function drawTitle(ctx, game) {
    dim(ctx, 0.62);
    panel(ctx, 92, 66, C.W - 184, 396);

    text(ctx, 'COLD CHAIN', C.W / 2, 132, 58, '#ffd76e', 'center');
    text(ctx, 'Electric scooter food delivery', C.W / 2, 178, 20, '#c6d2e8', 'center', 'normal');

    const lines = [
      '\u2190 \u2192  steer across the street        \u2191  faster        \u2193  brake, then reverse',
      'Z  toss a bag left        X  toss a bag right        SPACE  toss at the nearest kerb',
      '',
      'One driveway on the street is lit up. That is your drop \u2014 land the bag on it.',
      'Overshot it? Hold \u2193 to back up. Reversing also shakes a thief off you.',
      'Dodge cars, dogs, potholes and the hooded food thief.',
      'Deliver before it goes cold \u2014 the hotter it lands, the bigger the score.',
    ];
    lines.forEach((l, i) => text(ctx, l, C.W / 2, 232 + i * 29, 16, '#aebbd4', 'center', 'normal'));

    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(game.time * 4);
    text(ctx, 'PRESS SPACE OR ENTER TO RIDE', C.W / 2, 424, 24, '#7fe3a1', 'center');
    ctx.restore();

    text(ctx, 'P pause   \u00b7   M mute   \u00b7   R restart', C.W / 2, 600, 14, '#7d8aa6', 'center', 'normal');
    if (game.best > 0) {
      text(ctx, `Best score: ${game.best}`, C.W / 2, 574, 16, '#ffd76e', 'center', 'normal');
    }
  }

  function drawPaused(ctx) {
    dim(ctx, 0.66);
    text(ctx, 'PAUSED', C.W / 2, C.H / 2 - 16, 46, '#ffd76e', 'center');
    text(ctx, 'press P to carry on', C.W / 2, C.H / 2 + 28, 18, '#c6d2e8', 'center', 'normal');
  }

  function drawLevelBanner(ctx, game) {
    if (game.bannerTime <= 0) return;
    ctx.save();
    ctx.globalAlpha = U.clamp(game.bannerTime, 0, 1);
    dim(ctx, 0.45);
    text(ctx, `SHIFT ${game.level}`, C.W / 2, C.H / 2 - 24, 50, '#7fe3a1', 'center');
    text(ctx, `${C.ORDERS_PER_LEVEL} deliveries · traffic is getting worse`,
      C.W / 2, C.H / 2 + 24, 18, '#c6d2e8', 'center', 'normal');
    ctx.restore();
  }

  function drawGameOver(ctx, game) {
    dim(ctx, 0.78);
    text(ctx, 'SHIFT OVER', C.W / 2, 190, 56, '#ff7a6a', 'center');
    text(ctx, `Final score  ${game.score}`, C.W / 2, 262, 28, '#ffd76e', 'center');
    text(ctx, `${game.delivered} delivered · ${game.failed} refunded · best streak x${game.bestCombo}`,
      C.W / 2, 306, 18, '#c6d2e8', 'center', 'normal');
    if (game.score >= game.best && game.score > 0) {
      text(ctx, 'NEW PERSONAL BEST!', C.W / 2, 346, 20, '#7fe3a1', 'center');
    } else {
      text(ctx, `Best: ${game.best}`, C.W / 2, 346, 18, '#8fa0c0', 'center', 'normal');
    }
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(game.time * 4);
    text(ctx, 'PRESS R TO CLOCK BACK ON', C.W / 2, 440, 24, '#7fe3a1', 'center');
    ctx.restore();
  }

  return {
    draw(ctx, game) {
      drawTopBar(ctx, game);
      drawOrder(ctx, game);
      drawSpeed(ctx, game);
      drawToast(ctx, game);
      drawLevelBanner(ctx, game);
      if (SD.audio.isMuted()) text(ctx, 'MUTED', C.W - 20, C.H - 24, 13, '#7d8aa6', 'right', 'normal');
    },
    drawTitle,
    drawPaused,
    drawGameOver,
  };
})();
