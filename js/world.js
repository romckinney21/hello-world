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
      this.leftNo = 100;  // even numbers on the left, like a real street
      this.rightNo = 101; // odd numbers on the right
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
          number: onLeft ? this.leftNo : this.rightNo,
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

        if (onLeft) { this.leftY += depth + gap; this.leftNo += 2; }
        else { this.rightY += depth + gap; this.rightNo += 2; }
      }

      // Forget houses far behind us so the list can't grow forever.
      if (this.houses.length > 900) this.houses.splice(0, this.houses.length - 900);
      if (this.props.length > 900) this.props.splice(0, this.props.length - 900);
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

    draw(ctx) {
      this.drawGround(ctx);
      for (const h of this.visibleHouses()) this.drawHouse(ctx, h);
      this.drawProps(ctx);
      this.drawRoad(ctx);
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

    drawHouse(ctx, h) {
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

      // The porch: the pad on the sidewalk you are actually aiming at.
      const px = h.porchX;
      const py = this.toScreenY(h.porchWy);
      ctx.fillStyle = h.flash > 0 ? '#63d68a' : '#3d434f';
      U.roundRect(ctx, px - 21, py - 21, 42, 42, 6);
      ctx.fill();
      ctx.fillStyle = h.flash > 0 ? '#a8f0c1' : '#9aa4b5';   // the step you aim at
      U.roundRect(ctx, px - 15, py - 11, 30, 22, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.lineWidth = 2;
      U.roundRect(ctx, px - 21, py - 21, 42, 42, 6);
      ctx.stroke();

      // House number on a little plate.
      ctx.fillStyle = 'rgba(12,16,24,.82)';
      const plateX = h.side < 0 ? left + width - 46 : left + 6;
      U.roundRect(ctx, plateX, this.toScreenY(h.porchWy) - 44, 40, 18, 4);
      ctx.fill();
      ctx.fillStyle = '#e8edf7';
      ctx.font = 'bold 13px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(h.number), plateX + 20, this.toScreenY(h.porchWy) - 34);
    }

    /** Draw the pulsing ring that marks the address you're delivering to. */
    drawTargetMarker(ctx, house, time) {
      if (!house) return;
      const py = this.toScreenY(house.porchWy);
      if (py < -60 || py > C.H + 60) return;

      const pulse = 0.5 + 0.5 * Math.sin(time * 6);
      ctx.save();
      ctx.strokeStyle = `rgba(120, 232, 255, ${0.5 + 0.45 * pulse})`;
      ctx.lineWidth = 3 + pulse * 2;
      U.roundRect(ctx, house.porchX - 24, py - 24, 48, 48, 8);
      ctx.stroke();

      // Bouncing arrow above the porch.
      const bob = Math.sin(time * 6) * 4;
      ctx.fillStyle = '#78e8ff';
      ctx.beginPath();
      ctx.moveTo(house.porchX, py - 30 + bob);
      ctx.lineTo(house.porchX - 9, py - 44 + bob);
      ctx.lineTo(house.porchX + 9, py - 44 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  SD.World = World;
})();
