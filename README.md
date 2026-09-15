# hello-world

My name is Rodney, and I want to learn how to code.

## Print Quote Desk

`index.html` is a self-contained print order calculator. A customer opens it,
drops in their image, picks sizes and quantities, and sees the total — no
back-and-forth needed to produce a quote.

### What it does

- **Prices the order.** Flat price per size, multiplied by quantity, plus
  optional sales tax and flat shipping.
- **Checks resolution.** If a customer adds their image, each line shows the
  effective DPI at that print size, graded as gallery quality (300+ DPI),
  good at arm's length (150–300), or will look soft (under 150). The file
  never leaves their browser — it is read locally to get pixel dimensions.
- **Produces a job ticket.** A plain-text order summary they can copy, or
  send straight to your orders email.

### Editing your price list

Click **Price list** in the header. Add, rename, resize, and reprice sizes,
set your shop name, orders email, tax rate and shipping, then **Save**.

The starting sizes and prices are placeholders — replace them with your own.

### Where it saves

The page is published as a Claude Artifact, and saving the price list
republishes the page itself, so every customer who opens the link sees the
current prices. Customers get a read-only quote form; only you can save.

Opened as a plain local file instead (double-clicking `index.html`, or hosted
on your own domain), the price list saves to that browser's local storage. To
bake prices into the file permanently, edit the `shop-config` JSON block near
the top of `index.html`.

### Hosting it yourself

`index.html` has no build step and no dependencies beyond Google Fonts. Drop
it on any static host — Netlify, GitHub Pages, your existing site — and it
works.
