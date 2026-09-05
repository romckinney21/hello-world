/*
 * entities.js — everything that moves on the street besides you.
 *
 * Every entity follows the same little contract so the game loop can treat
 * them all the same way:
 *
 *   update(dt, game)   advance one frame; set `this.dead = true` to be removed
 *   draw(ctx, world)   paint yourself
 *   box                {x, y, w, h} used for collisions, in WORLD units
 *                      (y is `wy`, not a canvas position)
 */
(function () {
  const C = SD.C;
  const U = SD.utils;

  // --------------------------------------------------------------- food bag

  class Bag {
    constructor(x, wy, dir, riderSpeed) {
      this.x = x;
      this.wy = wy;
      this.z = 14;                                   // height above the ground
      this.vx = C.THROW_SIDE * dir;
      this.vwy = riderSpeed * 0.45 + 130;            // it keeps your momentum
      this.vz = C.THROW_UP;
      this.spin = 0;
      this.dead = false;
    }

    /** Work out where a bag thrown right now would land. Used for the aim dot. */
    static predict(x, wy, dir, riderSpeed) {
      const vz = C.THROW_UP;
      // Solve for when the arc comes back down to the ground.
      const t = (vz + Math.sqrt(vz * vz + 2 * C.GRAVITY * 14)) / C.GRAVITY;
      return {
        x: x + C.THROW_SIDE * dir * t,
        wy: wy + (riderSpeed * 0.45 + 130) * t,
      };
    }

    update(dt, game) {
      this.x += this.vx * dt;
      this.wy += this.vwy * dt;
      this.vz -= C.GRAVITY * dt;
      this.z += this.vz * dt;
      this.spin += dt * 12;

      if (this.z <= 0) {
        this.z = 0;
        this.dead = true;
        game.onBagLanded(this);
      }
    }

    draw(ctx, world) {
      const sy = world.toScreenY(this.wy);

      // Shadow shrinks as the bag rises — cheap but readable depth cue.
      const s = U.clamp(1 - this.z / 220, 0.35, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.3 * s})`;
      ctx.beginPath();
      ctx.ellipse(this.x, sy, 9 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(this.x, sy - this.z);
      ctx.rotate(this.spin);
      ctx.fillStyle = '#d87a2e';
      U.roundRect(ctx, -9, -9, 18, 18, 3);
      ctx.fill();
      ctx.fillStyle = '#f0b968';
      ctx.fillRect(-9, -4, 18, 4);
      ctx.restore();
    }
  }

  // ------------------------------------------------------------------- cars

  const CAR_COLORS = ['#d64a4a', '#4a86d6', '#e0b13c', '#5fbf7a', '#b96fd6', '#dedede'];

  class Car {
    constructor(wy, x, dir, speed) {
      // Cars take any position within their half of the road rather than
      // sitting on fixed lane centres — otherwise you could park on the gap
      // between two lanes and let the traffic stream past you forever.
      this.x = x;
      this.wy = wy;
      this.dir = dir;             // +1 travelling away from you, -1 towards you
      this.speed = speed;
      this.color = U.pick(CAR_COLORS);
      this.dead = false;
    }

    get box() { return { x: this.x, y: this.wy, w: 46, h: 84 }; }

    update(dt, game) {
      this.wy += this.dir * this.speed * dt;
      const sy = game.world.toScreenY(this.wy);
      if (sy > C.H + 320 || sy < -320) this.dead = true;
    }

    draw(ctx, world) {
      const sy = world.toScreenY(this.wy);
      ctx.save();
      ctx.translate(this.x, sy);

      ctx.fillStyle = 'rgba(0,0,0,.3)';
      U.roundRect(ctx, -24, -40, 48, 84, 9); ctx.fill();

      ctx.fillStyle = this.color;
      U.roundRect(ctx, -23, -42, 46, 84, 9); ctx.fill();

      // Windscreen and rear window.
      ctx.fillStyle = 'rgba(20,28,44,.85)';
      U.roundRect(ctx, -17, -30, 34, 22, 5); ctx.fill();
      U.roundRect(ctx, -17, 10, 34, 20, 5); ctx.fill();

      // Roof stripe.
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      ctx.fillRect(-17, -6, 34, 14);

      // Lights: white where the car is heading, red behind it.
      const frontY = this.dir > 0 ? -42 : 42;
      const backY = -frontY;
      ctx.fillStyle = '#fff6cc';
      ctx.fillRect(-19, frontY - (this.dir > 0 ? 0 : 4), 12, 4);
      ctx.fillRect(7, frontY - (this.dir > 0 ? 0 : 4), 12, 4);
      ctx.fillStyle = '#ff5a4a';
      ctx.fillRect(-19, backY - (this.dir > 0 ? 4 : 0), 12, 4);
      ctx.fillRect(7, backY - (this.dir > 0 ? 4 : 0), 12, 4);

      ctx.restore();
    }
  }

  // ------------------------------------------------------------------- dogs

  class Dog {
    constructor(wy, side) {
      this.side = side;                                  // -1 left, +1 right
      this.x = side < 0 ? C.LEFT_WALK + 20 : C.RIGHT_WALK + C.SIDEWALK - 20;
      this.wy = wy;
      this.charging = false;
      this.chaseLeft = 2.4;   // dogs give up after a couple of seconds
      this.life = 9;
      this.legPhase = 0;
      this.dead = false;
    }

    get box() { return { x: this.x, y: this.wy, w: 26, h: 22 }; }

    /** True only while it is actively coming for you. */
    get hunting() { return this.charging && this.chaseLeft > 0; }

    update(dt, game) {
      const player = game.player;
      const playerWy = game.world.playerWy;
      this.life -= dt;
      this.legPhase += dt * 14;

      // Wake up when the scooter gets close, then run straight at it.
      if (!this.charging && Math.abs(this.wy - playerWy) < 280 && this.wy > playerWy - 40) {
        this.charging = true;
      }

      if (this.charging && this.chaseLeft > 0) {
        this.chaseLeft -= dt;
        const dx = player.x - this.x;
        const dy = playerWy - this.wy;
        const len = Math.hypot(dx, dy) || 1;
        const spd = 175;
        // The `pace` term keeps it alongside you while you ride forward. It
        // never goes negative, so backing up genuinely shakes a chaser off.
        const pace = Math.max(0, game.player.speed) * dt * 0.5;
        this.x += (dx / len) * spd * dt;
        this.wy += (dy / len) * spd * dt + pace;
      } else if (this.charging) {
        // Out of puff: trot back towards the kerb it came from.
        this.x += this.side * 150 * dt;
      } else {
        // Trot up and down the sidewalk while waiting.
        this.x += Math.sin(this.wy * 0.02 + this.legPhase * 0.1) * 12 * dt;
      }

      if (this.life <= 0 || game.world.toScreenY(this.wy) > C.H + 200) this.dead = true;
    }

    draw(ctx, world) {
      const sy = world.toScreenY(this.wy);
      ctx.save();
      ctx.translate(this.x, sy);

      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(0, 8, 13, 5, 0, 0, Math.PI * 2); ctx.fill();

      const bob = this.hunting ? Math.sin(this.legPhase) * 2 : 0;
      ctx.translate(0, bob);

      ctx.fillStyle = '#8b6136';
      U.roundRect(ctx, -13, -9, 26, 18, 8); ctx.fill();      // body
      ctx.beginPath(); ctx.arc(0, -13, 8, 0, Math.PI * 2); ctx.fill();  // head

      // Ears + tail.
      ctx.fillStyle = '#6d4a28';
      ctx.beginPath(); ctx.moveTo(-8, -18); ctx.lineTo(-3, -22); ctx.lineTo(-2, -14); ctx.fill();
      ctx.beginPath(); ctx.moveTo(8, -18); ctx.lineTo(3, -22); ctx.lineTo(2, -14); ctx.fill();
      ctx.strokeStyle = '#6d4a28'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(Math.sin(this.legPhase) * 6, 16); ctx.stroke();

      // Eyes go red when it has decided you're lunch.
      ctx.fillStyle = this.hunting ? '#ff5a4a' : '#20160c';
      ctx.beginPath(); ctx.arc(-3, -15, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, -15, 2, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }
  }

  // ----------------------------------------------------------------- thieves

  class Thief {
    constructor(wy, side) {
      this.side = side;
      this.x = side < 0 ? C.LEFT_WALK + 22 : C.RIGHT_WALK + C.SIDEWALK - 22;
      this.wy = wy;
      this.state = 'lurk';        // lurk -> hunt -> flee (or giveup)
      this.huntLeft = 3.0;        // he can only sprint at you for so long
      this.life = 12;
      this.step = 0;
      this.dead = false;
    }

    get box() { return { x: this.x, y: this.wy, w: 24, h: 30 }; }

    update(dt, game) {
      this.life -= dt;
      this.step += dt * 8;
      const playerWy = game.world.playerWy;

      if (this.state === 'lurk') {
        this.x += Math.sin(this.step * 0.4) * 14 * dt;
        if (Math.abs(this.wy - playerWy) < 300 && game.bagsLeft > 0) this.state = 'hunt';
      } else if (this.state === 'hunt') {
        // Slower than a full-tilt reverse on purpose: backing off has to be a
        // real escape, not a stalemate. He also runs out of puff.
        this.huntLeft -= dt;
        if (this.huntLeft <= 0) { this.state = 'giveup'; }
        const dx = game.player.x - this.x;
        const dy = playerWy - this.wy;
        const len = Math.hypot(dx, dy) || 1;
        const spd = 138;
        const pace = Math.max(0, game.player.speed) * dt * 0.5;
        this.x += (dx / len) * spd * dt;
        this.wy += (dy / len) * spd * dt + pace;
      } else if (this.state === 'giveup') {
        // Wanders back to the kerb empty-handed.
        this.x += this.side * 120 * dt;
      } else {
        // Leg it back to the sidewalk with the loot.
        this.x += this.side * 190 * dt;
        this.wy -= 60 * dt;
      }

      if (this.life <= 0 || game.world.toScreenY(this.wy) > C.H + 220) this.dead = true;
    }

    draw(ctx, world) {
      const sy = world.toScreenY(this.wy);
      ctx.save();
      ctx.translate(this.x, sy);

      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(0, 14, 11, 4, 0, 0, Math.PI * 2); ctx.fill();

      const lean = this.state === 'hunt' ? Math.sin(this.step) * 0.12 : 0;
      ctx.rotate(lean);

      ctx.fillStyle = '#2f3a52';                              // hoodie
      U.roundRect(ctx, -11, -10, 22, 26, 7); ctx.fill();
      ctx.fillStyle = '#3d4a68';                              // hood
      ctx.beginPath(); ctx.arc(0, -14, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0d1220';                              // shadowed face
      ctx.beginPath(); ctx.arc(0, -13, 6, 0, Math.PI * 2); ctx.fill();

      // Swag bag, only once they've actually nicked something.
      if (this.state === 'flee') {
        ctx.fillStyle = '#d87a2e';
        U.roundRect(ctx, 8, -4, 13, 13, 3); ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- potholes

  class Pothole {
    constructor(wy, x) {
      this.x = x;
      this.wy = wy;
      this.dead = false;
      this.rot = U.rand(0, Math.PI);
    }

    get box() { return { x: this.x, y: this.wy, w: 34, h: 22 }; }

    update(dt, game) {
      if (game.world.toScreenY(this.wy) > C.H + 120) this.dead = true;
    }

    draw(ctx, world) {
      const sy = world.toScreenY(this.wy);
      ctx.save();
      ctx.translate(this.x, sy);
      ctx.rotate(this.rot);
      ctx.fillStyle = '#1b1d22';
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.10)';
      ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  // ------------------------------------------------ splats and floating text

  class Splat {
    constructor(x, wy) {
      this.x = x; this.wy = wy; this.life = 1.6; this.dead = false;
      this.bits = Array.from({ length: 8 }, () => ({
        a: U.rand(0, Math.PI * 2), d: U.rand(4, 17), r: U.rand(2, 5),
      }));
    }
    update(dt) { this.life -= dt; if (this.life <= 0) this.dead = true; }
    draw(ctx, world) {
      const sy = world.toScreenY(this.wy);
      ctx.save();
      ctx.globalAlpha = U.clamp(this.life, 0, 1);
      ctx.fillStyle = '#c46a2a';
      for (const b of this.bits) {
        ctx.beginPath();
        ctx.arc(this.x + Math.cos(b.a) * b.d, sy + Math.sin(b.a) * b.d * 0.6, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class FloatText {
    constructor(x, wy, text, color) {
      this.x = x; this.wy = wy; this.text = text;
      this.color = color || '#ffffff';
      this.life = 1.3; this.dead = false;
    }
    update(dt) { this.wy += 30 * dt; this.life -= dt; if (this.life <= 0) this.dead = true; }
    draw(ctx, world) {
      ctx.save();
      ctx.globalAlpha = U.clamp(this.life / 1.3, 0, 1);
      ctx.fillStyle = this.color;
      ctx.font = 'bold 18px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(8,10,16,.8)';
      ctx.strokeText(this.text, this.x, world.toScreenY(this.wy));
      ctx.fillText(this.text, this.x, world.toScreenY(this.wy));
      ctx.restore();
    }
  }

  SD.Bag = Bag;
  SD.Car = Car;
  SD.Dog = Dog;
  SD.Thief = Thief;
  SD.Pothole = Pothole;
  SD.Splat = Splat;
  SD.FloatText = FloatText;
})();
