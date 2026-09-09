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

### What it does for the customer

- Reads their artwork in the browser to get its pixel dimensions.
- Prices every placement live as they change quantities.
- Shows the **printed size**, not just the transfer size. Artwork is scaled to
  fit inside the transfer area with its proportions kept, so a tall design in a
  12×12 area prints 9×12 — the page says so before they order.
- Flags anything under **300 dpi**, the production standard in the size guide.
- Produces a plain-text order summary with a **Copy** button.

The artwork never leaves their browser — it's only measured locally, so the
customer still sends you the original file alongside the summary.

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
var SHOP = { name: "Anointed Ones Customs", email: "" };
```

- `name` — shows at the top of the page and on every order summary.
- `email` — fill this in and an **Email this order** button appears that opens
  the customer's mail app with the summary already written. Left empty, the
  Copy button is the only send path.

```js
var TARGET_DPI = 300;
var STARTING_QUANTITIES = { "cp-chest": 1, "ff-adult": 1 };
```

`TARGET_DPI` is the resolution you print at — it drives the quality flags and
the "Max @300" reading in the artwork panel. `STARTING_QUANTITIES` is what the
page opens with so a first-time visitor sees how it works; keys are `id`s from
the price list, and `{}` starts it empty.

### Ideas for later

- Bulk discounts (5+ of a placement at a lower unit price).
- Gang sheet packing — how many of a design fit on a 12×24 sheet.
- Garment colour choice, since it changes whether a white underbase is needed.
- Shipping and tax on the total.
