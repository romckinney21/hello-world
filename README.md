# hello-world

My name is Rodney, and I want to learn how to code.

---

## Print Order Calculator

`index.html` is a self-serve ordering page for the print business. A customer
opens it, drops in the image they want printed, picks sizes and quantities, and
the page works out the total and hands them an order summary to send back.

**Open it:** double-click `index.html`, or drag it into a browser window. It's
one file with no install step and no server.

### What it does for the customer

- Reads their image in the browser to get its pixel dimensions.
- Prices every size live as they change quantities.
- Flags resolution per size — 300 dpi is gallery quality, under 150 dpi will
  look soft at that size.
- Shows how the image crops into each shape, so a 3:2 photo going into an 8×10
  doesn't surprise anyone later.
- Produces a plain-text order summary with a **Copy** button.

The image never leaves their browser — it's only measured locally, so the
customer still sends you the original file alongside the summary.

### Changing your prices

Open `index.html` in any text editor and find `PRICE_LIST` near the top of the
`<script>` block:

```js
var PRICE_LIST = [
  { w: 4,  h: 6,  price: 8 },
  { w: 5,  h: 7,  price: 12 },
  { w: 8,  h: 10, price: 25 },
  ...
];
```

`w` and `h` are the print size in inches and `price` is what you charge per
print. Change a number, add a line, or delete one, then save and refresh the
page. **The prices in there now are placeholders — put your real ones in.**

Sizes are auto-oriented to the image, so one `{ w: 8, h: 10 }` entry covers both
8×10 and 10×8. You don't need a separate line for each orientation.

### Two other settings, just below the price list

```js
var SHOP = { name: "", email: "" };
```

- `name` — shows at the top of the page and on the order summary. Leave it `""`
  to keep the page unbranded.
- `email` — fill this in and an **Email this order** button appears that opens
  the customer's mail app with the summary already written. Left empty, the
  Copy button is the only send path.

```js
var STARTING_QUANTITIES = { "5x7": 2, "8x10": 1 };
```

Quantities the page opens with, so a first-time visitor can see how it works.
Set it to `{}` to start empty. The keys are `"<w>x<h>"` and must match a line in
your price list.

### Ideas for later

- Bulk discounts (5+ of a size at a lower unit price).
- Paper or finish options that add to the line price.
- Shipping and tax on the total.
