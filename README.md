# hello-world

My name is Rodney, and I want to learn how to code.

---

## DTF Transfer Order Calculator

`index.html` is a self-serve ordering page for Anointed Ones Customs. A customer
opens it, drops in their artwork, picks the placements they want it printed for,
and the page works out the total and hands them an order summary to send back.

**Open it:** double-click `index.html`, or drag it into a browser window. It's
one file with no install step and no server.

Sizes come from the DTF Transfer Size Guide — full front and back by garment
size, chest and pocket, sleeves, collar and neck labels, hats and tumblers, and
gang sheets.

### Several designs in one order

A customer rarely has just one design. Each design they add gets its own tile
in the strip at the top of the artwork panel, with its own colour, its own name,
and **its own quantities** — setting 2 sleeve strips on one design never touches
another. They can drop several files in at once.

Three things keep it clear which design they're pricing:

- A line above the placement list reads "Setting quantities for *Sample emblem*"
  with that design's colour dot.
- Each tile shows a running count, so nothing looks lost after switching.
- A placement already used by another design shows "+1 on other designs" under
  the row.

Designs are renameable — the filename is just the starting point. The order
summary is broken out design by design with a subtotal each, then one order
total, so you can see at a glance what goes where.

### What it does for the customer

- Reads their artwork in the browser to get its pixel dimensions.
- Prices every placement live as they change quantities.
- Shows the **printed size**, not just the transfer size. Artwork is scaled to
  fit inside the transfer area with its proportions kept, so a tall design in a
  12×12 area prints 9×12 — the page says so before they order.
- Flags anything under **300 dpi**, the production standard in the size guide.
- Produces a plain-text order summary with a **Copy** button.

The artwork never leaves their browser — it's only measured locally, so the
customer still sends you the original files alongside the summary. The summary
names each file, so you can match them up.

### Changing your prices

Open `index.html` in any text editor and find `PRICE_LIST` near the top of the
`<script>` block:

```js
{ id: "ff-adult", group: "Full front", name: "Adult S–XL", w: 10.5, h: 10.5, price: 10 },
```

- `id` — a short unique name. **No two rows may share one.**
- `group` — the heading it sits under on the page.
- `name` — what the customer reads.
- `w`, `h` — the transfer size in inches, as it sits on the garment.
- `price` — what you charge per transfer.

Change a number, add a line, or delete one, then save and refresh the page.
**The prices in there now are placeholders — put your real ones in.** The sizes
are from your guide, but where the guide gives a range (say "10–11 inches wide")
I picked one number; adjust to taste.

Unlike the earlier version, sizes are **not** auto-turned to match the artwork.
A sleeve strip is 2×11.25 because it runs down the arm, so the orientation you
type is the orientation the customer gets.

### Your printer's film width

```js
var MAX_PRINT_WIDTH_IN = 12;
```

The widest film you can run. Anything needing more width than this is hidden
from customers, so nobody can order a transfer you can't make. It checks the
**short side**, because a long narrow transfer can be turned sideways on the
film — a 2×11.25 sleeve strip only needs 2 inches of width.

At `12` this currently hides four sizes from your guide:

| Hidden | Needs |
|---|---|
| Adult 2XL–5XL full front (wide) 14×14 | 14" film |
| Oversized square 15×15 | 15" film |
| Gang sheet 22×24 | 22" film |
| Gang sheet 24×36 | 24" film |

**Worth a look:** your guide's file-prep section calls 15×18 "our current
standard export size", which needs 15 inches of film. If you can in fact print
wider than 12, raise this number — the 14×14 and 15×15 rows are already in the
price list waiting. If 12 is right, those guide entries are aspirational and the
page is correct as it stands.

The page tells customers the limit too ("We print up to 12 in wide, any
length"), so a missing size doesn't look like an oversight.

### Two other settings

```js
var SHOP = { name: "Anointed Ones Customs", email: "romckinney21@gmail.com" };
```

- `name` — shows at the top of the page and on every order summary.
- `email` — where **Email this order** sends. Change this to a business address
  if you have one; it will be visible to anyone who views the page source once
  the page is public. Set it back to `""` and the button disappears, leaving
  Copy as the only send path.

### How an order actually reaches you

There is no server behind this page, so nothing is delivered automatically —
the customer sends it. Two paths, and both need them to press something:

1. **Email this order** opens their mail app with the whole summary already
   written and a subject line like *"DTF transfer order — Jane Doe · 5
   transfers · $23.00"*. Their artwork files attach to that same email, which
   is the tidiest way to get the order and the files together in one place.
2. **Copy order summary** puts the text on their clipboard for whatever they
   already message you on.

Two things to know about the email button:

- It relies on `mailto:`, which does nothing if the device has no mail app set
  up. That's why Copy is always there as the fallback, and why the page tells
  customers to use it if the button doesn't open anything.
- Very large orders make a `mailto:` link long enough that some mail apps
  truncate it silently. Past `MAILTO_MAX` (8000 characters, roughly a 30-line
  order) the button hides itself and the page asks the customer to copy and
  paste instead — better than you receiving half an order without knowing.

If you get tired of waiting on customers to press send, the next step is a form
service or a Google Sheet that collects orders on its own. That needs the page
publicly hosted, which GitHub Pages does free from this repo.

```js
var TARGET_DPI = 300;
var DESIGN_COLORS = ["#C2632C", "#6C5AA8", "#2E7D57", "#B33A63", "#3B6FB0", "#8A6A1C"];
```

`TARGET_DPI` is the resolution you print at — it drives the quality flags and
the "Max @300" reading in the artwork panel. `DESIGN_COLORS` are the colours
that tell one design from another; the list starts over if a customer adds more
designs than there are colours, so add more if that happens often.

The page opens with two sample designs so a first-time visitor can see how a
multi-design order reads. They're created by the two `loadImage(sample…)` calls
at the very bottom of the script — delete those two calls to have it open empty.

### Ideas for later

- Bulk discounts (5+ of a placement at a lower unit price), counted per design
  or across the whole order.
- Gang sheet packing — how many of a design fit on a 12×24 sheet.
- Garment colour choice, since it changes whether a white underbase is needed.
- Shipping and tax on the total.
- Orders delivered on their own, to a Google Sheet or your inbox, instead of
  relying on the customer to press send.
