/*
 * world.js — the street: how it scrolls, and everything painted on it.
 *
 * COORDINATES
 * -----------
 * `x` is straight across the canvas, 0 (left) to 900 (right).
 * `wy` ("world y") is how far along the route something is. It grows as you
 * ride forward. `world.scroll` is how far the scooter has travelled, so:
 *
 *     screenY = CANVAS_HEIGHT - (wy - scroll)
 *
 * ...which means things far ahead of you are drawn near the top of the screen
 * and slide downwards as you approach. The scooter never actually moves up the
 * canvas; the street moves past it.
 */
(function () {
  const C = SD.C;
  const U = SD.utils;

  const HOUSE_COLORS = [
    ['#7d5a4f', '#5e433b'], ['#4f6b7d', '#3a4f5e'], ['#6b7d4f', '#4f5e3a'],
    ['#7d4f6b', '#5e3a52'], ['#7d764f', '#5e5839'], ['#4f7d6a', '#3a5e50'],
  ];

  class World {
    constructor() {
      this.scroll = 0;
      this.houses = [];
      this.leftY = 300;   // where the next house on each side will go
      this.rightY = 380;
      this.props = [];    // trees and bins in the gaps between houses
      this.build(400);
    }

    /**
     * Lay down more of the street. We build a chunk at a time, well ahead of
     * the player, so a delivery target can be chosen while it is still
     * off-screen and we know exactly where it will turn up.
     */
    build(count) {
      for (let i = 0; i < count; i++) {
        const onLeft = i % 2 === 0;
        const y = onLeft ? this.leftY : this.rightY;
        const depth = U.randInt(120, 170);
        const palette = U.pick(HOUSE_COLORS);

        this.houses.push({
          side: onLeft ? -1 : 1,
          wy: y,                 // bottom edge of the building, in world units
          depth: depth,          // how long the building is along the street
          wall: palette[0],
          roof: palette[1],
          porchWy: y + depth / 2,
          porchX: onLeft ? C.PORCH_LEFT_X : C.PORCH_RIGHT_X,
          delivered: false,
          flash: 0,              // green pulse after a successful delivery
        });

        // A tree or a bin sits in the gap after each house. Purely scenery —
        // nothing out here can be hit, it just sells the sense of movement.
        const gap = U.randInt(45, 110);
        this.props.push({
          x: onLeft ? U.rand(24, 96) : U.rand(C.W - 96, C.W - 24),
          wy: y + depth + gap / 2,
          kind: U.chance(0.72) ? 'tree' : 'bin',
          size: U.rand(0.85, 1.25),
        });

        if (onLeft) this.leftY += depth + gap;
        else this.rightY += depth + gap;
      }

      // Forget only what's a long way behind us, so the list can't grow
      // forever but reversing never rides off the end of the street.
      const cutoff = this.scroll - 4000;
      while (this.houses.length && this.houses[0].porchWy < cutoff) this.houses.shift();
      while (this.props.length && this.props[0].wy < cutoff) this.props.shift();
    }

    /** Convert a world position into a canvas y position. */
    toScreenY(wy) {
      return C.H - (wy - this.scroll);
    }

    /** Where the scooter is along the route. */
    get playerWy() {
      return this.scroll + (C.H - C.PLAYER_Y);
    }

    update(dt, speed) {
      this.scroll += speed * dt;
      for (const h of this.houses) {
        if (h.flash > 0) h.flash = Math.max(0, h.flash - dt);
      }
    }

    /** Houses currently on (or just off) the screen — all we need to draw. */
    visibleHouses() {
      const lo = this.scroll - 200;
      const hi = this.scroll + C.H + 200;
      return this.houses.filter((h) => h.wy + h.depth > lo && h.wy < hi);
    }

    /**
     * Choose the next delivery address: far enough ahead that the player has
     * time to react, close enough that they aren't riding forever.
     */
    pickTarget() {
      const from = this.playerWy + 850;
      const to = from + 1300;
      if (this.leftY < to + 600) this.build(200); // keep building ahead of us

      const options = this.houses.filter(
        (h) => !h.delivered && h.porchWy > from && h.porchWy < to
      );
      if (options.length) return U.pick(options);

      // Very unlikely, but never leave the player without an address.
      const any = this.houses.filter((h) => !h.delivered && h.porchWy > this.playerWy + 400);
      return any.length ? any[0] : null;
    }

    // ---------------------------------------------------------------- drawing

    draw(ctx, target, time) {
      this.drawGround(ctx);
      for (const h of this.visibleHouses()) this.drawHouse(ctx, h, h === target);
      this.drawProps(ctx);
      this.drawRoad(ctx);
      // The lit driveway goes on last so nothing clips its glow.
      if (target) this.drawDriveway(ctx, target, true, time);
    }

    drawProps(ctx) {
      for (const p of this.props) {
        const sy = this.toScreenY(p.wy);
        if (sy < -60 || sy > C.H + 60) continue;

        ctx.save();
        ctx.translate(p.x, sy);
        ctx.scale(p.size, p.size);
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(0, 6, 15, 6, 0, 0, Math.PI * 2); ctx.fill();

        if (p.kind === 'tree') {
          ctx.fillStyle = '#3f6b3d';
          ctx.beginPath(); ctx.arc(0, -4, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#4e8149';
          ctx.beginPath(); ctx.arc(-5, -9, 10, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#4a5361';
          U.roundRect(ctx, -10, -12, 20, 22, 3); ctx.fill();
          ctx.fillStyle = '#5e6a7c';
          U.roundRect(ctx, -12, -15, 24, 6, 3); ctx.fill();
        }
        ctx.restore();
      }
    }

    drawGround(ctx) {
      // Grass / dirt strip behind the buildings.
      ctx.fillStyle = '#1d2b21';
      ctx.fillRect(0, 0, C.LEFT_WALK, C.H);
      ctx.fillRect(C.RIGHT_WALK + C.SIDEWALK, 0, C.W - C.RIGHT_WALK - C.SIDEWALK, C.H);

      // Sidewalks.
      ctx.fillStyle = '#6d6f78';
      ctx.fillRect(C.LEFT_WALK, 0, C.SIDEWALK, C.H);
      ctx.fillRect(C.RIGHT_WALK, 0, C.SIDEWALK, C.H);

      // Paving slabs, drawn in world space so they scroll with the street.
      ctx.strokeStyle = 'rgba(0,0,0,.18)';
      ctx.lineWidth = 2;
      const slab = 48;
      const first = (C.H + this.scroll) % slab; // keeps the joins moving with us
      for (let sy = first; sy < C.H + slab; sy += slab) {
        const y = Math.round(sy);
        ctx.beginPath();
        ctx.moveTo(C.LEFT_WALK, y);
        ctx.lineTo(C.LEFT_WALK + C.SIDEWALK, y);
        ctx.moveTo(C.RIGHT_WALK, y);
        ctx.lineTo(C.RIGHT_WALK + C.SIDEWALK, y);
        ctx.stroke();
      }
    }

    drawRoad(ctx) {
      const w = C.ROAD_RIGHT - C.ROAD_LEFT;
      ctx.fillStyle = '#33373f';
      ctx.fillRect(C.ROAD_LEFT, 0, w, C.H);

      // Kerbs.
      ctx.fillStyle = '#9aa0ab';
      ctx.fillRect(C.ROAD_LEFT - 5, 0, 5, C.H);
      ctx.fillRect(C.ROAD_RIGHT, 0, 5, C.H);

      // Dashed lane lines. `dashOffset` scrolls them so the road looks like
      // it is moving underneath you.
      const dash = 46;
      const gap = 40;
      const period = dash + gap;
      const offset = this.scroll % period;
      ctx.strokeStyle = '#d8d2a8';
      ctx.lineWidth = 5;
      ctx.setLineDash([dash, gap]);
      ctx.lineDashOffset = -offset; // negative so the dashes flow towards you
      for (let i = 1; i < 4; i++) {
        const x = C.ROAD_LEFT + (w / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, -period);
        ctx.lineTo(x, C.H + period);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }

    drawHouse(ctx, h, isTarget) {
      const bottom = this.toScreenY(h.wy);
      const top = this.toScreenY(h.wy + h.depth);
      const height = bottom - top;
      const left = h.side < 0 ? 0 : C.RIGHT_WALK + C.SIDEWALK;
      const width = C.BUILDING_DEPTH;

      // Body of the building.
      ctx.fillStyle = h.wall;
      ctx.fillRect(left, top, width, height);

      // Roof strip along the street-facing edge, for a bit of depth.
      ctx.fillStyle = h.roof;
      if (h.side < 0) ctx.fillRect(left + width - 18, top, 18, height);
      else ctx.fillRect(left, top, 18, height);

      // Windows.
      ctx.fillStyle = 'rgba(255, 236, 170, .8)';
      const winX = h.side < 0 ? left + width - 42 : left + 26;
      for (let y = top + 22; y < bottom - 26; y += 44) {
        ctx.fillRect(winX, y, 16, 20);
      }

      // Front door, facing the road.
      ctx.fillStyle = '#2c2019';
      const doorY = this.toScreenY(h.porchWy) - 13;
      const doorX = h.side < 0 ? left + width - 8 : left;
      ctx.fillRect(doorX, doorY, 8, 26);

      if (!isTarget) this.drawDriveway(ctx, h, false, 0);
    }

    /**
     * The driveway: a strip of tarmac running from the kerb up to the front
     * door. This is the whole targeting system — no house numbers to memorise,
     * you just look for the one that's lit up.
     */
    drawDriveway(ctx, h, lit, time) {
      const py = this.toScreenY(h.porchWy);
      if (py < -80 || py > C.H + 80) return;

      // Spans the sidewalk, overlapping the kerb and the house a little so it
      // reads as joining the two.
      const x0 = h.side < 0 ? C.BUILDING_DEPTH - 8 : C.ROAD_RIGHT - 4;
      const w = C.SIDEWALK + 12;
      const depth = 46;

      ctx.save();

      if (lit) {
        // Warm pool of light, brightening and fading.
        const pulse = 0.55 + 0.45 * Math.sin(time * 4.5);
        ctx.shadowColor = `rgba(255, 198, 84, ${0.55 + 0.35 * pulse})`;
        ctx.shadowBlur = 26 + pulse * 16;
        ctx.fillStyle = `rgba(255, 205, 104, ${0.82 + 0.16 * pulse})`;
        U.roundRect(ctx, x0, py - depth / 2, w, depth, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Chevrons pointing up the drive towards the door.
        ctx.strokeStyle = `rgba(90, 58, 8, ${0.5 + 0.3 * pulse})`;
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          const cx = h.side < 0 ? x0 + w - 12 - i * 15 : x0 + 12 + i * 15;
          ctx.beginPath();
          ctx.moveTo(cx - h.side * 6, py - 10);
          ctx.lineTo(cx + h.side * 6, py);   // apex points at the front door
          ctx.lineTo(cx - h.side * 6, py + 10);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = h.flash > 0 ? '#63d68a' : '#4a4e57';
        U.roundRect(ctx, x0, py - depth / 2, w, depth, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.32)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }

    /**
     * Points you at the lit driveway. On screen it's a bobbing chevron; off
     * the top it's a marker pinned to the edge; off the bottom it means you
     * have overshot, and says so — that's what reverse is for.
     */
    drawTargetMarker(ctx, house, time) {
      if (!house) return;
      const py = this.toScreenY(house.porchWy);
      const bob = Math.sin(time * 6) * 4;
      ctx.save();

      if (py < 150) {
        // Still ahead of you, off the top of the screen. Sits below the HUD
        // panels, at the x of the drive, so you know which side to move to.
        this.edgeMarker(ctx, house.porchX, 154 + bob, -1, '#ffc654');
      } else if (py > C.H - 26) {
        // Behind you. One banner in the clear space at the bottom centre.
        const pulse = 0.5 + 0.5 * Math.sin(time * 6);
        const bw = 320, bh = 36, bx = C.W / 2 - bw / 2, by = C.H - 62;
        ctx.fillStyle = `rgba(58, 14, 12, ${0.72 + 0.16 * pulse})`;
        U.roundRect(ctx, bx, by, bw, bh, 18); ctx.fill();
        ctx.strokeStyle = `rgba(255, 122, 106, ${0.6 + 0.4 * pulse})`;
        ctx.lineWidth = 2; ctx.stroke();

        this.edgeMarker(ctx, bx + 30, by + bh / 2 - 2 + bob * 0.5, 1, '#ff7a6a');

        ctx.fillStyle = '#ffb3aa';
        ctx.font = 'bold 17px "Trebuchet MS", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TURN BACK \u2014 HOLD \u2193', C.W / 2 + 16, by + bh / 2);
      } else {
        // On screen: bob a chevron just above the glowing drive.
        ctx.fillStyle = '#ffc654';
        ctx.beginPath();
        ctx.moveTo(house.porchX, py - 34 + bob);
        ctx.lineTo(house.porchX - 10, py - 50 + bob);
        ctx.lineTo(house.porchX + 10, py - 50 + bob);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    /** A triangle pinned to the top or bottom edge. `dir` is -1 up, 1 down. */
    edgeMarker(ctx, x, y, dir, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + dir * 14);
      ctx.lineTo(x - 12, y - dir * 10);
      ctx.lineTo(x + 12, y - dir * 10);
      ctx.closePath();
      ctx.fill();
    }
  }

  SD.World = World;
})();
