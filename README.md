# hello-world

My name is Rodney, and I want to learn how to code.

---

# 🛵 Cold Chain — an electric scooter delivery run

A 2D arcade game in the spirit of the 1985 arcade/NES classic **Paperboy** — except
you're not throwing newspapers. You're a courier on an electric scooter, and the
food in your box is getting colder by the second.

Ride down the street, dodge the traffic, and land your delivery bag on the porch
of the right address **before the food goes cold**.

No installs, no build step, no libraries. It's plain HTML, CSS and JavaScript.

## Play it

Open `index.html` in any modern browser — double-clicking the file works.

If you'd rather serve it (which you'll want once you start editing):

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Play it online

The game is plain static files, so GitHub Pages can host it for free:

1. Go to **Settings → Pages** in this repository.
2. Under *Build and deployment*, set **Source** to `Deploy from a branch`,
   pick the `master` branch and the `/ (root)` folder, and press **Save**.
3. Wait a minute, then visit **https://romckinney21.github.io/hello-world/**

### One file to share

Want a single file you can email or drop on a USB stick?

```bash
python3 tools/bundle.py     # writes dist/cold-chain.html
```

That inlines the CSS and all nine scripts into one self-contained HTML file.
It's generated, so it isn't committed — run the script again after you change
anything.

## Controls

| Key | What it does |
| --- | --- |
| `←` `→` (or `A` `D`) | Steer across the street |
| `↑` `↓` (or `W` `S`) | Throttle / brake |
| `Z` | Toss a bag to the **left** |
| `X` | Toss a bag to the **right** |
| `Space` | Toss a bag at whichever kerb you're nearest |
| `P` | Pause |
| `M` | Mute |
| `R` | Restart |
| `Enter` / `Space` | Start the game |

## How to play

Your ticket in the top-right names an address — say **#196, LEFT**. That house's
porch glows on the street ahead of you.

1. **Get onto the right half of the road.** A bag only flies about 190 pixels
   sideways, so you have to commit to the side the house is on. The left lanes
   are where the oncoming traffic is, which is the whole trade-off.
2. **Watch the dotted aiming line.** It shows where a bag thrown *right now*
   would land. Throw when the landing circle is sitting on the porch.
3. **Throw early.** At full speed a bag is in the air for nearly a second, and
   you cover 400 pixels in that time. The faster you go, the further ahead you
   have to lead your target.
4. **Land it hot.** The heat bar is your real clock. A piping-hot delivery is
   worth far more than a lukewarm one, and if it hits zero the customer cancels.

You get **3 bags per order**. Miss with all three, ride past the house, or let
the food go cold, and the order is refunded — your streak resets with it.

### What's out to get you

| Hazard | What happens |
| --- | --- |
| 🚗 **Cars** | Oncoming traffic, slow cars ahead, and fast ones overtaking from behind. Hitting one costs a life. |
| 🐕 **Dogs** | Wait on the sidewalk, then charge at you. They give up after a couple of seconds — outrun them. Costs a life. |
| 🥷 **Food thief** | A hooded figure who sprints at your scooter to grab a bag, and who will happily pick up a bag that lands near him. Costs you the bag, not a life. |
| 🕳️ **Potholes** | Kill your speed and shake the handlebars. Annoying, not fatal. |

### Scoring

```
points = (100 + heat × 3 + accuracy bonus) × streak
```

- **Heat** — up to +300 for a delivery that's still steaming.
- **Accuracy** — up to +60 for landing dead centre on the mat (`BULLSEYE!`).
- **Streak** — every delivery in a row multiplies the lot, up to ×9. One failure
  and you're back to ×1.
- Feeding the **wrong address** costs you 25 points.

Every 5 orders you start a new shift: the traffic gets heavier, the dogs come
out more often, and the food cools faster — but you get a life back.

Your best score is saved in the browser's `localStorage`.

## How the code is laid out

Everything is drawn onto one `<canvas>` element. The files load in order from
`index.html`, and each one hangs its work off a single global object called `SD`:

| File | What lives there |
| --- | --- |
| `js/utils.js` | Constants (road width, speeds, gravity…) and small maths helpers |
| `js/audio.js` | Beeps and blips, generated with the Web Audio API — no sound files |
| `js/input.js` | Keyboard state: what's *held down* vs what was *just tapped* |
| `js/world.js` | The street: scrolling, the houses, the porches, the scenery |
| `js/player.js` | The scooter — steering, throttle, crashing, and drawing the rider |
| `js/entities.js` | Bags, cars, dogs, thieves, potholes, splats and floating text |
| `js/hud.js` | Score, lives, the delivery ticket, and the title/pause/game-over screens |
| `js/game.js` | The rules: orders, throwing, scoring, spawning, collisions |
| `js/main.js` | Starts the animation loop and keeps time |

### The one idea worth understanding

The scooter never actually moves up the screen. The **street moves past it**.

Everything on the street has a `wy` ("world y") — how far along the route it is.
`world.scroll` is how far you've ridden. To draw something, we convert:

```js
screenY = CANVAS_HEIGHT - (wy - scroll)
```

So a house 1000 units ahead of you is drawn near the top of the canvas, and as
`scroll` grows it slides down towards you. Collisions are checked in `wy`
directly, which is why the entity `box` getters use world coordinates rather
than screen ones.

### Things to try changing

Open `js/utils.js` and edit the numbers in `SD.C` — it's the fastest way to get
a feel for how the game is put together:

- `THROW_SIDE` — how far a bag flies sideways. Raise it and deliveries get easy.
- `SPEED_MAX` — the top speed of the scooter.
- `GRAVITY` — lower it and bags float; raise it and they drop like bricks.
- `BAGS_PER_ORDER`, `START_LIVES`, `ORDERS_PER_LEVEL` — the generosity dials.

The difficulty curve is the `difficulty` getter in `js/game.js`; every hazard's
spawn rate is worked out from the level number in that one place.

You can also poke at the running game from the browser console:

```js
SD.game.score = 99999
SD.game.lives = 99
SD.C.THROW_SIDE = 400
```
