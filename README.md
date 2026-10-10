# hello-world

My name is Rodney, and I want to learn how to code.

## Print Quote Desk

`index.html` is a self-contained print order calculator. A customer opens it,
drops in their image, picks what they want and in which sizes, and sees the
total — no back-and-forth needed to produce a quote.

### What it does

- **Prices the order.** Flat price per size for each product type (finished
  prints and transfers out of the box), multiplied by quantity, plus optional
  sales tax and flat shipping.
- **Handles mixed orders.** Each line picks its own product and size, so one
  order can be twelve 8×10 transfers and a single 16×20 print.
- **Checks resolution.** If a customer adds their image, each line shows the
  effective DPI at that print size, graded as gallery quality (300+ DPI),
  good at arm's length (150–300), or will look soft (under 150). The file
  never leaves their browser — it is read locally to get pixel dimensions.
- **Produces a job ticket.** A plain-text order summary they can copy, or
  send straight to your orders email. Every order carries a reference
  (`Q-XXXX-XXX`) so you and the customer can name the same order later.
- **Prints to one page.** "Print or save as PDF" produces a clean job ticket
  — reference, customer, artwork, line items, total — with the form chrome
  stripped out.
- **Checks itself before sending.** An order needs at least one item, a name,
  and a valid email, so you never receive one you can't reply to.

### Editing your price list

Click **Price list** in the header. It has two parts:

- **What you sell** — your product types. Rename them, add more (canvas,
  framed, sticker sheets), or remove one you don't offer. Removing the
  finished-print type leaves a transfers-only shop, and the product selector
  disappears from the form.
- **Price per size** — a grid of size against product type. **Leave a cell
  blank if you don't offer that size in that product** and customers won't be
  shown it, so transfers can run a different size range from prints.

Below that, set your shop name, orders email, tax rate and shipping, then
**Save**.

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
