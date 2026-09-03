/*
 * player.js — the courier on the electric scooter.
 *
 * The scooter stays at a fixed spot on the screen (C.PLAYER_Y). Steering moves
 * it across the road; the throttle changes how fast the *world* scrolls past.
 */
(function () {
  const C = SD.C;
  const U = SD.utils;

  class Player {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = C.W / 2;
      this.speed = C.SPEED_MIN;
      this.lean = 0;          // -1 .. 1, purely visual
      this.wobble = 0;        // set by potholes: makes steering drift
      this.invuln = 0;        // brief mercy window after a crash
      this.crashTimer = 0;    // > 0 while spinning out
    }

    get box() {
      return { x: this.x, y: C.PLAYER_Y, w: 26, h: 46 };
    }

    get crashed() {
      return this.crashTimer > 0;
    }

    /** Called when a car or a dog gets you. */
    crash() {
      if (this.invuln > 0 || this.crashed) return false;
      this.crashTimer = 1.4;
      this.invuln = 2.6;
      this.speed = 0;
      SD.audio.crash();
      return true;
    }

    /** Called when you clip a pothole — annoying, not fatal. */
    bump() {
      if (this.crashed) return;
      this.speed = Math.max(C.SPEED_MIN, this.speed * 0.55);
      this.wobble = 0.9;
      SD.audio.bump();
    }

    update(dt, input) {
      this.invuln = Math.max(0, this.invuln - dt);
      this.wobble = Math.max(0, this.wobble - dt * 0.9);

      if (this.crashed) {
        this.crashTimer -= dt;
        this.speed = U.lerp(this.speed, C.SPEED_MIN, dt * 2);
        if (this.crashTimer <= 0) {
          this.crashTimer = 0;
          this.x = U.clamp(this.x, C.ROAD_LEFT + 40, C.ROAD_RIGHT - 40);
        }
        return;
      }

      // Throttle and brake.
      if (input.down('up')) this.speed += C.ACCEL * dt;
      else if (input.down('down')) this.speed -= C.BRAKE * dt;
      else this.speed -= C.DRAG * dt;
      this.speed = U.clamp(this.speed, C.SPEED_MIN, C.SPEED_MAX);

      // Steering. You lean into the turn, which is what the sprite shows.
      let dir = 0;
      if (input.down('left')) dir -= 1;
      if (input.down('right')) dir += 1;

      // A pothole shakes the handlebars for a moment.
      const shake = this.wobble > 0 ? Math.sin(performance.now() / 40) * this.wobble * 2.2 : 0;

      this.x += (dir + shake) * C.STEER * dt;
      this.lean = U.lerp(this.lean, dir, dt * 9);

      // You can ride up onto the kerb, which is how you get close enough to
      // the porches — but the sidewalk is also where the dogs live.
      this.x = U.clamp(this.x, C.LEFT_WALK + 14, C.RIGHT_WALK + C.SIDEWALK - 14);

    }

    draw(ctx, time) {
      const x = this.x;
      const y = C.PLAYER_Y;

      ctx.save();

      // Flicker while invulnerable so it's obvious you're getting a free pass,
      // but stay visible enough to keep steering by.
      if (this.invuln > 0 && !this.crashed) {
        ctx.globalAlpha = Math.floor(time * 14) % 2 === 0 ? 0.35 : 0.9;
      }

      ctx.translate(x, y);

      if (this.crashed) {
        // Spin the whole rider while wiping out.
        ctx.rotate((1.4 - this.crashTimer) * 9);
      } else {
        ctx.rotate(this.lean * 0.18);
      }

      // Shadow on the tarmac.
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.beginPath();
      ctx.ellipse(0, 22, 17, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Deck and wheels.
      ctx.fillStyle = '#20242c';
      U.roundRect(ctx, -6, -22, 12, 46, 5);
      ctx.fill();
      ctx.fillStyle = '#111318';
      U.roundRect(ctx, -5, -30, 10, 12, 4); ctx.fill();
      U.roundRect(ctx, -5, 20, 10, 12, 4); ctx.fill();

      // Insulated delivery box on the back.
      ctx.fillStyle = '#e2534b';
      U.roundRect(ctx, -13, 2, 26, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#f6d34a';
      ctx.fillRect(-13, 10, 26, 4);

      // Rider: body, arms, helmet.
      ctx.fillStyle = '#3a6ee8';
      U.roundRect(ctx, -11, -18, 22, 24, 7);
      ctx.fill();
      ctx.strokeStyle = '#3a6ee8';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-9, -14); ctx.lineTo(-13, -26);
      ctx.moveTo(9, -14); ctx.lineTo(13, -26);
      ctx.stroke();

      ctx.fillStyle = '#f2c9a0';
      ctx.beginPath(); ctx.arc(0, -24, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d2430';
      ctx.beginPath(); ctx.arc(0, -26, 9, Math.PI, Math.PI * 2); ctx.fill();

      // Handlebars.
      ctx.strokeStyle = '#8e97a8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-14, -28); ctx.lineTo(14, -28);
      ctx.stroke();

      ctx.restore();

      // Speed lines behind the scooter when you're really moving.
      if (!this.crashed && this.speed > C.SPEED_MAX * 0.6) {
        ctx.strokeStyle = 'rgba(220,235,255,.28)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const off = ((time * 900 + i * 40) % 60);
          ctx.beginPath();
          ctx.moveTo(x - 16 + i * 16, y + 30 + off);
          ctx.lineTo(x - 16 + i * 16, y + 46 + off);
          ctx.stroke();
        }
      }
    }
  }

  SD.Player = Player;
})();
