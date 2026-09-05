/*
 * game.js — the rules of the shift.
 *
 * The game is a small state machine: 'title' -> 'playing' -> 'gameover',
 * with 'paused' hanging off 'playing'. update() runs the current state,
 * draw() paints it.
 */
(function () {
  const C = SD.C;
  const U = SD.utils;

  class Game {
    constructor() {
      this.best = Number(localStorage.getItem('coldchain.best') || 0);
      this.state = 'title';
      this.time = 0;
      this.reset();
    }

    // ------------------------------------------------------------ lifecycle

    reset() {
      this.world = new SD.World();
      this.player = new SD.Player();
      this.entities = [];
      this.bags = [];
      this.effects = [];

      this.score = 0;
      this.lives = C.START_LIVES;
      this.level = 1;
      this.combo = 1;
      this.bestCombo = 1;
      this.delivered = 0;
      this.failed = 0;
      this.levelDelivered = 0;  // deliveries made during the current shift
      this.strikes = 0;         // refunds in a row — three and you're fired

      this.target = null;
      this.heat = 100;
      this.bagsLeft = C.BAGS_PER_ORDER;
      this.ordersThisLevel = 0;
      this.nextOrderIn = 0;

      this.toast = '';
      this.toastColor = '#ffffff';
      this.toastTime = 0;
      this.bannerTime = 0;
      this.shake = 0;
      this.coldWarned = false;

      this.carTimer = 1.2;
      this.dogTimer = 3.0;
      this.thiefTimer = 7.0;
      this.holeTimer = 2.5;
    }

    start() {
      this.reset();
      this.state = 'playing';
      this.bannerTime = 2;
      this.newOrder();
    }

    /** Difficulty knobs, all derived from the level number. */
    get difficulty() {
      const n = this.level - 1;
      return {
        carEvery: Math.max(0.6, 2.3 - n * 0.17),
        dogEvery: Math.max(1.8, 6.0 - n * 0.45),
        thiefEvery: Math.max(4.0, 11.0 - n * 0.9),
        holeEvery: Math.max(1.2, 3.4 - n * 0.22),
        heatDrain: 5.4 + n * 0.75,
      };
    }

    // --------------------------------------------------------------- orders

    newOrder() {
      this.target = this.world.pickTarget();
      this.heat = 100;
      this.bagsLeft = C.BAGS_PER_ORDER;
      this.coldWarned = false;
    }

    finishOrder(success, reason, color) {
      if (this.target) this.target.delivered = true;
      this.target = null;

      if (success) {
        this.delivered++;
        this.levelDelivered++;
        this.strikes = 0;
        this.combo = Math.min(this.combo + 1, 9);
        this.bestCombo = Math.max(this.bestCombo, this.combo);
      } else {
        this.failed++;
        this.strikes++;
        this.combo = 1;
        SD.audio.miss();
      }

      this.showToast(reason, color);

      // Riding around without delivering anything is not a strategy: three
      // refunds in a row and the shift is over, however many lives are left.
      if (this.strikes >= 3) {
        this.showToast('FIRED — THREE REFUNDS IN A ROW', '#ff7a6a');
        this.gameOver();
        return;
      }
      if (this.strikes === 2) {
        this.effects.push(new SD.FloatText(C.W / 2, this.world.playerWy + 210,
          'ONE MORE REFUND AND YOU\u2019RE FIRED', '#ff9f5a'));
      }
      this.ordersThisLevel++;

      if (this.ordersThisLevel >= C.ORDERS_PER_LEVEL) {
        // A spare life, but only if you actually fed most of the street. You
        // can't farm lives by ignoring the job and riding in a straight line.
        if (this.levelDelivered >= 3) {
          this.lives = Math.min(C.START_LIVES + 2, this.lives + 1);
        }
        this.ordersThisLevel = 0;
        this.levelDelivered = 0;
        this.level++;
        this.bannerTime = 2.2;
        SD.audio.levelUp();
      }

      // Short pause before the next ticket drops in.
      this.nextOrderIn = 1.1;
    }

    showToast(msg, color) {
      this.toast = msg;
      this.toastColor = color || '#ffffff';
      this.toastTime = 1.8;
    }

    // --------------------------------------------------------------- throwing

    throwBag(dir) {
      if (this.player.crashed || this.bagsLeft <= 0 || !this.target) return;
      this.bagsLeft--;
      this.bags.push(new SD.Bag(this.player.x, this.world.playerWy, dir, this.player.speed));
      SD.audio.throw_();
    }

    /** Called by a Bag the moment it touches the ground. */
    onBagLanded(bag) {
      // A thief standing near the landing spot simply helps himself.
      const thief = this.entities.find(
        (e) => e instanceof SD.Thief && e.state !== 'flee' &&
          Math.hypot(e.x - bag.x, e.wy - bag.wy) < 48
      );
      if (thief) {
        thief.state = 'flee';
        this.effects.push(new SD.FloatText(bag.x, bag.wy, 'STOLEN!', '#ff7a6a'));
        this.effects.push(new SD.Splat(bag.x, bag.wy));
        SD.audio.steal();
        return;
      }

      // Did it land on a porch?
      const house = this.world.houses.find(
        (h) => Math.abs(h.porchX - bag.x) < 26 && Math.abs(h.porchWy - bag.wy) < 30
      );

      if (house && this.target && house === this.target) {
        this.scoreDelivery(house, bag);
        return;
      }

      this.effects.push(new SD.Splat(bag.x, bag.wy));
      if (house && this.target) {
        // Feeding the wrong address costs you.
        this.score = Math.max(0, this.score - 25);
        this.effects.push(new SD.FloatText(bag.x, bag.wy, 'WRONG DRIVEWAY', '#ff9f5a'));
      } else {
        this.effects.push(new SD.FloatText(bag.x, bag.wy, 'MISS', '#c6d2e8'));
      }
      SD.audio.miss();
    }

    scoreDelivery(house, bag) {
      const heatBonus = Math.round(this.heat * 3);
      const offset = Math.hypot(house.porchX - bag.x, house.porchWy - bag.wy);
      const accuracy = Math.round(U.clamp(1 - offset / 30, 0, 1) * 60);
      const points = Math.round((100 + heatBonus + accuracy) * this.combo);

      this.score += points;
      house.flash = 0.9;
      this.effects.push(new SD.FloatText(house.porchX, house.porchWy, `+${points}`, '#7fe3a1'));
      if (accuracy > 45) {
        this.effects.push(new SD.FloatText(house.porchX, house.porchWy - 34, 'BULLSEYE!', '#ffd76e'));
      }
      SD.audio.score();
      this.finishOrder(true, this.heat > 60 ? 'PIPING HOT!' : 'DELIVERED!', '#7fe3a1');
    }

    // -------------------------------------------------------------- spawning

    spawn(dt) {
      const d = this.difficulty;
      const w = this.world;
      const aheadWy = w.scroll + C.H + 140;

      // Traffic keeps right: oncoming cars use the left half of the road,
      // cars going your way use the right half.
      const mid = (C.ROAD_LEFT + C.ROAD_RIGHT) / 2;
      const oncomingX = () => U.rand(C.ROAD_LEFT + 28, mid - 28);
      const withYouX = () => U.rand(mid + 28, C.ROAD_RIGHT - 28);

      this.carTimer -= dt;
      if (this.carTimer <= 0) {
        this.carTimer = U.rand(d.carEvery * 0.6, d.carEvery * 1.5);
        if (U.chance(0.55)) {
          // Oncoming traffic — the fastest thing on the street, relative to you.
          this.entities.push(new SD.Car(aheadWy, oncomingX(), -1, U.rand(170, 260)));
        } else if (U.chance(0.5)) {
          // Slow car ahead of you, same direction — you catch it up.
          this.entities.push(new SD.Car(aheadWy, withYouX(), 1, U.rand(80, 160)));
        } else {
          // Fast car overtaking from behind.
          this.entities.push(new SD.Car(w.scroll - 140, withYouX(), 1, U.rand(360, 460)));
        }
      }

      this.dogTimer -= dt;
      if (this.dogTimer <= 0) {
        this.dogTimer = U.rand(d.dogEvery * 0.7, d.dogEvery * 1.6);
        this.entities.push(new SD.Dog(aheadWy, U.chance(0.5) ? -1 : 1));
      }

      this.thiefTimer -= dt;
      if (this.thiefTimer <= 0) {
        this.thiefTimer = U.rand(d.thiefEvery * 0.8, d.thiefEvery * 1.6);
        this.entities.push(new SD.Thief(aheadWy, U.chance(0.5) ? -1 : 1));
      }

      this.holeTimer -= dt;
      if (this.holeTimer <= 0) {
        this.holeTimer = U.rand(d.holeEvery * 0.7, d.holeEvery * 1.7);
        this.entities.push(new SD.Pothole(aheadWy, U.rand(C.ROAD_LEFT + 30, C.ROAD_RIGHT - 30)));
      }
    }

    // ------------------------------------------------------------ collisions

    collisions() {
      const p = this.player;
      const pbox = { x: p.x, y: this.world.playerWy, w: p.box.w, h: p.box.h };

      for (const e of this.entities) {
        if (e.dead) continue;

        if (e instanceof SD.Pothole) {
          if (!e.used && U.hit(pbox, e.box)) {
            e.used = true;
            p.bump();
            this.heat = Math.max(0, this.heat - 4);
            this.effects.push(new SD.FloatText(p.x, this.world.playerWy - 30, 'BUMP', '#ffd76e'));
          }
          continue;
        }

        if (e instanceof SD.Thief) {
          if (e.state === 'hunt' && U.hit(pbox, e.box)) {
            e.state = 'flee';
            if (this.bagsLeft > 0) {
              this.bagsLeft--;
              this.effects.push(new SD.FloatText(p.x, this.world.playerWy - 30, 'BAG STOLEN!', '#ff7a6a'));
              SD.audio.steal();
            }
          }
          continue;
        }

        // Cars and dogs both put you on the tarmac.
        if ((e instanceof SD.Car || e instanceof SD.Dog) && U.hit(pbox, e.box)) {
          if (p.crash()) {
            this.lives--;
            this.heat = Math.max(0, this.heat - 18);
            this.shake = 0.5;
            this.effects.push(new SD.FloatText(p.x, this.world.playerWy - 40,
              e instanceof SD.Dog ? 'DOG!' : 'CRASH!', '#ff7a6a'));
            if (this.lives <= 0) this.gameOver();
          }
        }
      }
    }

    gameOver() {
      this.state = 'gameover';
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem('coldchain.best', String(this.best));
      }
      SD.audio.gameOver();
    }

    // ----------------------------------------------------------------- update

    update(dt, input) {
      this.time += dt;

      if (this.state === 'title') {
        if (input.hit('start')) this.start();
        return;
      }

      if (this.state === 'gameover') {
        if (input.hit('restart') || input.hit('start')) this.start();
        return;
      }

      if (input.hit('pause')) {
        this.state = this.state === 'paused' ? 'playing' : 'paused';
      }
      if (input.hit('restart')) { this.start(); return; }
      if (this.state === 'paused') return;

      // --- player and street ------------------------------------------------
      this.player.update(dt, input);
      this.world.update(dt, this.player.speed);

      // --- throwing ---------------------------------------------------------
      if (input.hit('tossLeft')) this.throwBag(-1);
      else if (input.hit('tossRight')) this.throwBag(1);
      else if (input.hit('tossAuto')) {
        // Aim at whichever kerb you're closest to.
        const middle = (C.ROAD_LEFT + C.ROAD_RIGHT) / 2;
        this.throwBag(this.player.x < middle ? -1 : 1);
      }

      // --- food temperature -------------------------------------------------
      if (this.target) {
        this.heat = Math.max(0, this.heat - this.difficulty.heatDrain * dt);
        if (this.heat < 30 && !this.coldWarned) {
          this.coldWarned = true;
          SD.audio.warn();
        }
        // Never fail an order while a bag is still in the air — it might yet
        // land on the right porch. A throw leads the target by a long way at
        // full speed, so you are often past the house before it touches down.
        // Overshooting the drive is no longer an instant fail: you can back up
        // and try again. The heat bar is the only clock on an order now.
        const settled = this.bags.length === 0;
        if (settled && this.heat <= 0) {
          this.finishOrder(false, 'FOOD WENT COLD', '#7fc9ff');
        } else if (settled && this.bagsLeft <= 0) {
          this.finishOrder(false, 'OUT OF BAGS', '#ff9f5a');
        }
      } else {
        // Short breather between tickets.
        this.nextOrderIn -= dt;
        if (this.nextOrderIn <= 0) this.newOrder();
      }

      // --- everything else --------------------------------------------------
      this.spawn(dt);
      for (const e of this.entities) e.update(dt, this);
      for (const b of this.bags) b.update(dt, this);
      for (const f of this.effects) f.update(dt, this);
      this.collisions();

      this.entities = this.entities.filter((e) => !e.dead);
      this.bags = this.bags.filter((b) => !b.dead);
      this.effects = this.effects.filter((f) => !f.dead);

      this.toastTime = Math.max(0, this.toastTime - dt);
      this.bannerTime = Math.max(0, this.bannerTime - dt);
      this.shake = Math.max(0, this.shake - dt);
    }

    // ------------------------------------------------------------------- draw

    /** A dotted line to where a bag thrown right now would land. */
    drawAim(ctx, dir, strong) {
      const p = SD.Bag.predict(this.player.x, this.world.playerWy, dir, this.player.speed);
      const sy = this.world.toScreenY(p.wy);
      ctx.save();
      ctx.globalAlpha = strong ? 0.9 : 0.32;
      ctx.strokeStyle = strong ? '#78e8ff' : '#c6d2e8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(this.player.x, C.PLAYER_Y);
      ctx.quadraticCurveTo((this.player.x + p.x) / 2, (C.PLAYER_Y + sy) / 2 - 60, p.x, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(p.x, sy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
      ctx.restore();
    }

    draw(ctx) {
      ctx.save();
      if (this.shake > 0) {
        ctx.translate(U.rand(-6, 6) * this.shake, U.rand(-6, 6) * this.shake);
      }

      this.world.draw(ctx, this.target, this.time);

      // Ground-level things first, so flying bags end up on top.
      for (const e of this.entities) if (e instanceof SD.Pothole) e.draw(ctx, this.world);
      for (const f of this.effects) if (f instanceof SD.Splat) f.draw(ctx, this.world);

      if (this.state === 'playing' && this.target && this.bagsLeft > 0) {
        this.drawAim(ctx, -1, this.target.side < 0);
        this.drawAim(ctx, 1, this.target.side > 0);
      }

      for (const e of this.entities) if (!(e instanceof SD.Pothole)) e.draw(ctx, this.world);
      this.player.draw(ctx, this.time);
      for (const b of this.bags) b.draw(ctx, this.world);
      for (const f of this.effects) if (!(f instanceof SD.Splat)) f.draw(ctx, this.world);

      ctx.restore();

      if (this.state === 'title') { SD.hud.drawTitle(ctx, this); return; }
      SD.hud.draw(ctx, this);
      // Drawn last so an off-screen pointer is never hidden behind a panel.
      if (this.state !== 'gameover') this.world.drawTargetMarker(ctx, this.target, this.time);
      if (this.state === 'paused') SD.hud.drawPaused(ctx);
      if (this.state === 'gameover') SD.hud.drawGameOver(ctx, this);
    }
  }

  SD.Game = Game;
})();
