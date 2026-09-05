/*
 * utils.js — shared constants and small math helpers.
 *
 * Every file hangs its exports off one global object, `SD` (Scooter Delivery),
 * so nothing pollutes the page and you can poke at it from the dev console.
 */
window.SD = window.SD || {};

SD.C = {
  // Canvas size. The CSS scales this up or down; the code always works in
  // these "design pixels", which keeps the maths simple.
  W: 900,
  H: 640,

  // The street runs vertically. These are x positions across the canvas.
  ROAD_LEFT: 170,
  ROAD_RIGHT: 730,
  SIDEWALK: 46,        // sidewalk width on each side of the road
  BUILDING_DEPTH: 124, // how far the buildings stick in from each edge

  // Where the scooter sits on screen. The world scrolls past it.
  PLAYER_Y: 500,

  // Scooter handling. The throttle is one axis running from reverse, through
  // a standstill, up to full speed — holding the brake past zero backs you up,
  // which is how you shake a thief off or return to a house you overshot.
  SPEED_REVERSE: -170, // fastest you can back up (negative = going backwards)
  SPEED_CRUISE: 110,   // where you settle when you're not touching the controls
  SPEED_MAX: 430,
  ACCEL: 265,
  BRAKE: 330,
  DRAG: 60,            // eases you back to cruising speed when you let go
  STEER: 330,

  // Tossing a food bag. The sideways reach is deliberately short (about
  // 190px) so you have to commit to one side of the street to make a
  // delivery — which is exactly where the oncoming traffic is.
  THROW_SIDE: 205,     // sideways speed
  THROW_UP: 200,       // upward speed (decides how long it stays in the air)
  GRAVITY: 460,

  BAGS_PER_ORDER: 3,
  ORDERS_PER_LEVEL: 5,
  START_LIVES: 3,
};

// Derived positions, so the rest of the code can just ask for them.
SD.C.LEFT_WALK = SD.C.ROAD_LEFT - SD.C.SIDEWALK;   // x where the left sidewalk starts
SD.C.RIGHT_WALK = SD.C.ROAD_RIGHT;                 // x where the right sidewalk starts
SD.C.PORCH_LEFT_X = SD.C.LEFT_WALK + SD.C.SIDEWALK / 2;
SD.C.PORCH_RIGHT_X = SD.C.RIGHT_WALK + SD.C.SIDEWALK / 2;

SD.utils = {
  clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  rand(min, max) {
    return min + Math.random() * (max - min);
  },

  randInt(min, max) {
    return Math.floor(SD.utils.rand(min, max + 1));
  },

  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  },

  chance(p) {
    return Math.random() < p;
  },

  // Axis-aligned box overlap. Boxes are {x, y, w, h} with x/y at the centre.
  hit(a, b) {
    return (
      Math.abs(a.x - b.x) * 2 < a.w + b.w &&
      Math.abs(a.y - b.y) * 2 < a.h + b.h
    );
  },

  // Rounded rectangle — used all over the drawing code.
  roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  },
};
