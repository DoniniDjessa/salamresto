# Receipt UI — Complete Implementation Guide

Thermal receipt (78 mm) built with **Next.js + Tailwind CSS + shadcn/ui (Radix Dialog)**.  
This guide explains every piece so you can reproduce it in another app without the common
pitfalls (receipt printing 3 times, bad right margin, blank top space, overlay printing, etc.).

---

## Table of contents

1. [Font setup](#1-font-setup)
2. [Tailwind config](#2-tailwind-config)
3. [Print CSS — full working version with explanations](#3-print-css)
4. [dialog.tsx — one required change](#4-dialogtsx-change)
5. [Dialog shell (JSX)](#5-dialog-shell)
6. [Receipt body (JSX)](#6-receipt-body)
7. [State & data shape](#7-state--data-shape)
8. [Visual layout reference](#8-visual-layout-reference)
9. [Common pitfalls and why they happen](#9-common-pitfalls)

---

## 1. Font Setup

### `lib/fonts.ts`
```ts
import { Bebas_Neue, Oswald } from "next/font/google"

export const bebasNeue = Bebas_Neue({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
})

export const oswald = Oswald({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
})
```

### `app/layout.tsx`
Attach the CSS variables to `<html>` so every component can use `var(--font-bebas)` and `var(--font-oswald)`.
```tsx
import { bebasNeue, oswald } from "@/lib/fonts"

<html className={`${bebasNeue.variable} ${oswald.variable}`}>
  <body>...</body>
</html>
```

---

## 2. Tailwind Config

Register font family utilities in `tailwind.config.ts`:
```ts
theme: {
  extend: {
    fontFamily: {
      bebas:  ["var(--font-bebas)",  "cursive"],
      oswald: ["var(--font-oswald)", "sans-serif"],
    },
  },
},
```

You can now write `font-bebas` and `font-oswald` as Tailwind classes.

| Class | Font | Used for |
|---|---|---|
| `font-bebas` | Bebas Neue | Store name, column headers, TOTAL, TVA labels |
| `font-oswald` | Oswald | All body text (items, amounts, metadata) |
| `font-mono` | System monospace | Address, phone, email, ticket code |

---

## 3. Print CSS

> **This is the most important section.**  
> The receipt lives inside a **Radix Dialog**, which renders in a portal at the bottom of `<body>`.  
> Without these rules the browser prints the whole page (3× times if there are 3 portals), adds  
> the dialog backdrop, uses A4 paper size, and leaves a large right margin.

Paste this **entire block** verbatim into your `globals.css` inside `@media print { }`.  
Each group has a comment explaining what it does and what breaks without it.

```css
@media print {

  /* ─────────────────────────────────────────────────────────────────
     1. PAGE SIZE
     Force 78 mm thermal paper. Without this the browser uses A4 and
     the receipt is narrow on the left with a huge blank right margin.
     "auto" height means the paper grows to fit the content exactly.
  ───────────────────────────────────────────────────────────────────*/
  @page {
    size: 78mm auto;
    margin: 0 !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     2. RESET html/body
     Remove all default browser margins and force 78 mm width.
     Remove flexbox so the body does not vertically center the dialog.
     Without this there is blank whitespace at the top of every print.
  ───────────────────────────────────────────────────────────────────*/
  html,
  body {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 78mm !important;
    height: auto !important;
    min-height: 0 !important;
    display: block !important;
    align-items: initial !important;
    justify-content: initial !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─────────────────────────────────────────────────────────────────
     3. HIDE EVERYTHING EXCEPT THE RECEIPT
     Radix renders the Dialog in a portal div directly under <body>.
     The app's main layout is also a direct child of <body>.
     This rule hides every body child that does NOT contain the receipt.
     Without this the whole app page prints BEFORE the receipt,
     causing it to appear on a second (or third) page.
  ───────────────────────────────────────────────────────────────────*/
  body > *:not(:has(#receipt-print)) {
    display: none !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     4. HIDE THE DIALOG OVERLAY/BACKDROP
     Radix adds a semi-transparent overlay div in a separate portal.
     Without this rule it prints as a dark/grey full page before the receipt.
  ───────────────────────────────────────────────────────────────────*/
  [data-radix-dialog-overlay] {
    display: none !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     5. MAKE THE RECEIPT TREE VISIBLE
     After hiding everything above, we must explicitly un-hide the
     receipt and all its ancestors up to <body>.
  ───────────────────────────────────────────────────────────────────*/
  body > *:has(#receipt-print),
  body > *:has(#receipt-print) *:has(#receipt-print),
  #receipt-print,
  #receipt-print * {
    visibility: visible !important;
    opacity: 1 !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     6. FLATTEN THE RADIX PORTAL CONTAINER
     The Radix portal is a <div> directly under <body> with fixed
     positioning and full-screen centering. We must turn it into a
     normal block element at 78 mm wide so the receipt is not offset.
     Without this the receipt is shifted to the center of the page.
  ───────────────────────────────────────────────────────────────────*/
  body > div:has(#receipt-print) {
    display: block !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    left: auto !important;
    top: auto !important;
    height: auto !important;
    min-height: 0 !important;
    width: 78mm !important;
    opacity: 1 !important;
    align-items: initial !important;
    justify-content: initial !important;
  }
  body > div:has(#receipt-print) > * {
    display: block !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    left: auto !important;
    top: auto !important;
    height: auto !important;
    min-height: 0 !important;
    opacity: 1 !important;
    align-items: initial !important;
    justify-content: initial !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     7. FLATTEN THE RADIX DIALOG CONTENT BOX
     Radix applies `translate(-50%, -50%)` and `position: fixed` to
     the dialog content to center it on screen. For printing we must
     remove this transform, set position to static, constrain to 78 mm,
     and remove border/shadow so only receipt content appears.
     Without this the receipt is cut off on the right.
  ───────────────────────────────────────────────────────────────────*/
  [data-radix-dialog-content]:has(#receipt-print) {
    display: block !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    left: auto !important;
    top: auto !important;
    height: auto !important;
    min-height: 0 !important;
    width: 78mm !important;
    max-width: 78mm !important;
    border: none !important;
    box-shadow: none !important;
    opacity: 1 !important;
    align-items: initial !important;
    justify-content: initial !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     8. THE RECEIPT ELEMENT ITSELF
     Force it to fill the 78 mm column from the very top.
     `padding: 0 1mm` keeps a tiny 1 mm horizontal margin — remove if
     your printer clips the edges.
     `break-inside: avoid` prevents the receipt from being split
     across two pages.
  ───────────────────────────────────────────────────────────────────*/
  #receipt-print {
    position: absolute !important;
    left: 0 !important;
    right: 0 !important;
    top: 0 !important;
    display: block !important;
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    padding: 0 1mm !important;
    margin: 0 !important;
    background: #fff !important;
    box-shadow: none !important;
    border: none !important;
    line-height: 1.15 !important;
    transform: none !important;
    box-sizing: border-box !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* No extra space before the first line of the receipt */
  #receipt-print > :first-child {
    margin-top: 0 !important;
    padding-top: 0 !important;
  }

  /* Remove all visible borders inside the receipt */
  #receipt-print,
  #receipt-print * {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  /* Tighten Tailwind space-y-* utilities so the receipt stays compact */
  #receipt-print .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 6px !important; }
  #receipt-print .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 4px !important; }
  #receipt-print .space-y-2 > :not([hidden]) ~ :not([hidden]) { margin-top: 3px !important; }
  #receipt-print .space-y-1 > :not([hidden]) ~ :not([hidden]) { margin-top: 2px !important; }

  /* Never print buttons even if they are inside #receipt-print */
  #receipt-print button {
    display: none !important;
  }

  /* ─────────────────────────────────────────────────────────────────
     9. HIDE UI CHROME
     The close × button and the print icon must not appear on paper.
     `.no-print` is a utility class we manually add to any element
     (print button, dialog header, etc.).
     `[data-radix-dialog-close]` targets the Radix × button directly —
     add `no-print` to DialogPrimitive.Close as well (belt-and-suspenders).
  ───────────────────────────────────────────────────────────────────*/
  .no-print,
  [data-radix-dialog-close],
  [data-radix-dialog-close] * {
    display: none !important;
    visibility: hidden !important;
  }
}
```

---

## 4. `dialog.tsx` Change

Shadcn's `Dialog` component renders a close `×` button automatically.  
Add the `no-print` class to it so it never appears on the printed receipt.

Find the `DialogPrimitive.Close` in `components/ui/dialog.tsx` and add `no-print`:

```tsx
<DialogPrimitive.Close
  className="no-print absolute right-4 top-4 rounded-sm opacity-70 ..."
>
  ...
</DialogPrimitive.Close>
```

---

## 5. Dialog Shell

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"

<Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
  <DialogContent className="max-w-sm">

    {/*
      The entire header (print icon) gets class "no-print" so it is
      hidden when printing. DialogTitle is sr-only so screen readers
      still have a label.
    */}
    <DialogHeader className="no-print flex items-center justify-between">
      <DialogTitle className="sr-only">Reçu de vente</DialogTitle>
      <Button variant="ghost" size="icon" onClick={() => window.print()}>
        <Printer className="w-5 h-5" />
      </Button>
    </DialogHeader>

    {/* Receipt body goes here — see section 6 */}

  </DialogContent>
</Dialog>
```

---

## 6. Receipt Body (JSX)

The body is wrapped in an **IIFE** (`(() => { ... })()`) so we can declare local
`const` variables for computed values (tva, dates, labels) without cluttering the
component state.

Replace the `YOUR_*` placeholders with your own data.

```tsx
{sale && (() => {

  /* ── Computed variables ─────────────────────────────────────── */
  const saleDate  = new Date(sale.date)
  const dateStr   = saleDate.toLocaleDateString("fr-FR")   // "09/06/2026"
  const timeStr   = saleDate.toLocaleTimeString("fr-FR")   // "14:32:11"

  /*
    TVA (tax-inclusive formula):
    The stored total is already TTC (tax included).
    tvaRate = 18 means 18 %.
    tvaVal  = the tax portion extracted from TTC.
    montantHT = total before tax.
  */
  const tvaVal    = Math.round(sale.total * tvaRate / (100 + tvaRate))
  const montantHT = Math.round(sale.total - tvaVal)

  const paymentLabels: Record<string, string> = {
    cash:           "ESPECE",
    mobile_money:   "MOBILE MONEY",
    credit:         "CREDIT",
    a_la_livraison: "A LA LIVRAISON",
  }
  const paymentLabel =
    paymentLabels[sale.typePaiement] ??
    sale.typePaiement?.toUpperCase() ??
    "ESPECE"

  /*
    Separator line.
    IMPORTANT: do NOT add `font-mono` here.
    Monospace fonts make the space character the same width as the dash,
    so "- - - -" looks like "- - - -" with huge gaps.
    Without font-mono the space is narrower and lines look tight: "--------".
  */
  const SEP = "- ".repeat(80)

  return (
    /*
      The outer div carries id="receipt-print".
      The print CSS targets this id to isolate and render only this element.
      font-oswald = default body font for the whole receipt.
      px-3 = horizontal padding inside the receipt content area.
    */
    <div
      id="receipt-print"
      className="font-oswald font-normal text-black text-[11px] leading-snug px-3"
    >

      {/* ══ HEADER ════════════════════════════════════════════════ */}
      <div className="text-center pb-2">
        {/* Store name: largest text, Bebas Neue, tight leading */}
        <p className="font-bebas text-3xl tracking-widest leading-none">
          YOUR STORE NAME
        </p>
        {/* Address / contact: monospace keeps characters evenly spaced */}
        <p className="font-mono text-[9px]">Your address line</p>
        <p className="font-mono text-[9px]">+XX XX XX XX XX · XX XX XX XX XX</p>
        <p className="font-mono text-[9px]">contact@yourstore.com</p>
      </div>

      {/* Separator — text-[6px] makes dashes very small and close together */}
      <p className="text-[6px] overflow-hidden leading-none whitespace-nowrap my-0.5 tracking-tight">
        {SEP}
      </p>

      {/* ══ COLUMN HEADERS ════════════════════════════════════════ */}
      {/*
        Column widths:
          CODE    → w-12 (48 px) fixed, shrink-0
          NOM     → flex-1 (takes remaining space)
          MONTANT → w-20 (80 px) fixed, text-right, shrink-0
        These exact widths must match the item row widths below.
      */}
      <div className="flex font-bebas font-semibold text-[10px] tracking-wide py-1">
        <span className="w-12 shrink-0">CODE</span>
        <span className="flex-1">NOM DU PRODUIT</span>
        <span className="w-20 text-right shrink-0">MONTANT</span>
      </div>

      <p className="text-[6px] overflow-hidden leading-none whitespace-nowrap my-0.5 tracking-tight">
        {SEP}
      </p>

      {/* ══ LINE ITEMS ════════════════════════════════════════════ */}
      <div className="py-2">
        {sale.items.map((item, index) => (
          <div key={index} className="flex text-[10px] font-light">
            {/* Same column widths as headers above */}
            <span className="w-12 shrink-0 text-gray-600">{item.code}</span>
            <span className="flex-1 min-w-0 truncate">
              {item.name.toUpperCase()}
              {item.weight && item.weight > 0 ? ` - ${item.weight}KG` : ""}
            </span>
            <span className="w-20 text-right shrink-0 tabular-nums">
              {Math.round(item.subtotal).toLocaleString("fr-FR")}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[6px] overflow-hidden leading-none whitespace-nowrap my-0.5 tracking-tight">
        {SEP}
      </p>

      {/* ══ TOTAL ═════════════════════════════════════════════════ */}
      <div className="py-1 space-y-0.5">
        {/* TOTAL row: Bebas, larger text */}
        <div className="flex font-bebas text-base">
          <span className="flex-1">TOTAL</span>
          <span className="tabular-nums">{formatCurrency(sale.total)}</span>
        </div>
        {/* Payment method row: lighter weight, smaller text */}
        <div className="flex text-[10px] font-light">
          <span className="flex-1">
            {paymentLabel}
            {/* Show phone number after · when payment is mobile money */}
            {sale.mobilePhone ? ` · ${sale.mobilePhone}` : ""}
          </span>
          <span className="tabular-nums">{formatCurrency(sale.total)}</span>
        </div>
      </div>

      <p className="text-[6px] overflow-hidden leading-none whitespace-nowrap my-0.5 tracking-tight">
        {SEP}
      </p>

      {/* ══ TVA BLOCK ═════════════════════════════════════════════ */}
      {/*
        px-4 indents the TVA table to visually separate it.
        When tvaEnabled is false → show "TVA : NÉANT" (no table).
        When tvaEnabled is true  → show the 4-column breakdown table.

        Column widths inside the TVA table:
          TVA col  → w-8  (32 px)
          TAUX col → w-12 (48 px)
          VAL TVA  → flex-1
          MONTANT HT → flex-1
        The MONTANT TOTAL row uses w-20 = w-8 + w-12 to span both left columns.
      */}
      <div className="py-1 px-4">
        {tvaEnabled ? (
          <>
            {/* Header row */}
            <div className="flex font-bebas font-semibold text-[9px] tracking-wide">
              <span className="w-8 text-center shrink-0">TVA</span>
              <span className="w-12 text-center shrink-0">TAUX</span>
              <span className="flex-1 text-right">VAL TVA</span>
              <span className="flex-1 text-right">MONTANT HT</span>
            </div>
            <p className="text-[6px] overflow-hidden leading-none whitespace-nowrap my-0.5 tracking-tight">
              {"- ".repeat(80)}
            </p>
            {/* Data row */}
            <div className="flex text-[9px] font-light">
              <span className="w-8 text-center shrink-0">1</span>
              {/* Rate formatted as "18,00" (French decimal separator) */}
              <span className="w-12 text-center shrink-0">
                {tvaRate.toFixed(2).replace(".", ",")}
              </span>
              <span className="flex-1 text-right tabular-nums">
                {tvaVal.toLocaleString("fr-FR")}
              </span>
              <span className="flex-1 text-right tabular-nums">
                {montantHT.toLocaleString("fr-FR")}
              </span>
            </div>
            {/* Summary row — w-20 = w-8 + w-12 so it spans those two columns */}
            <div className="flex font-bebas font-semibold text-[9px] pt-0.5">
              <span className="w-20 shrink-0">MONTANT TOTAL</span>
              <span className="flex-1 text-right tabular-nums">
                {tvaVal.toLocaleString("fr-FR")}
              </span>
              <span className="flex-1 text-right tabular-nums">
                {montantHT.toLocaleString("fr-FR")}
              </span>
            </div>
          </>
        ) : (
          <p className="text-[9px] font-light text-center tracking-widest">
            TVA : NÉANT
          </p>
        )}
      </div>

      {/* my-2 gives a slightly larger gap before the ticket code */}
      <p className="text-[6px] overflow-hidden leading-none whitespace-nowrap my-2 tracking-tight">
        {SEP}
      </p>

      {/* ══ TICKET CODE ══════════════════════════════════════════ */}
      {/*
        Short human-readable code e.g. "BS260609001".
        mt-2 adds a little extra top space so it stands out.
        font-mono + tracking-widest makes it look like a barcode label.
      */}
      <p className="text-center font-mono text-[10px] py-1 mt-2 tracking-widest font-semibold">
        {sale.ticketCode}
      </p>

      {/* ══ METADATA ════════════════════════════════════════════ */}
      <div className="text-center text-[9px] font-light">
        <p>
          CAISSE 01 &nbsp; CAISSIER {cashierName.toUpperCase()} &nbsp; TICKET {sale.ticketCode}
        </p>
        <p>YOUR STORE NAME LE {dateStr} A {timeStr}</p>
      </div>

      {/* ══ THANK YOU ════════════════════════════════════════════ */}
      <p className="text-center text-[11px] pt-2 pb-1">Merci de votre fidélité !</p>

    </div>
  )
})()}
```

---

## 7. State & Data Shape

```tsx
/* ── Settings — fetch from your backend / localStorage on mount ── */
const [tvaRate,    setTvaRate]    = useState(18)    // tax rate in %, e.g. 18
const [tvaEnabled, setTvaEnabled] = useState(true)  // false → shows "TVA : NÉANT"

useEffect(() => {
  fetchTvaRate().then(setTvaRate)
  fetchTvaEnabled().then(setTvaEnabled)
}, [])

/* ── Sale object shape the receipt expects ───────────────────── */
interface Sale {
  date:         string    // ISO date, e.g. "2026-06-09T14:32:11.000Z"
  total:        number    // TTC total (tax already included)
  typePaiement: string    // "cash" | "mobile_money" | "credit" | "a_la_livraison"
  mobilePhone?: string    // only for mobile_money — shown next to payment label
  ticketCode:   string    // short code, e.g. "BS260609001"
  items: Array<{
    code:      string     // product code shown in CODE column
    name:      string     // product name (will be .toUpperCase()'d)
    weight?:   number     // if > 0 adds " - 1.2KG" to the name
    subtotal:  number     // line total (price × quantity) — no qty shown on receipt
  }>
}

/* ── Currency formatter ──────────────────────────────────────── */
function formatCurrency(amount: number): string {
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " FCFA"
  )
}
```

---

## 8. Visual Layout Reference

```
┌──────────────────────────────────────┐  78 mm wide
│         YOUR STORE NAME              │  font-bebas  text-3xl tracking-widest
│     Riviera rte d'Abatta...          │  font-mono   text-[9px]
│   +XX XX XX XX · XX XX XX XX         │
│       contact@yourstore.com          │
├──────────────────────────────────────┤  "- ".repeat(80)  text-[6px]  my-0.5
│ CODE  NOM DU PRODUIT        MONTANT  │  font-bebas font-semibold text-[10px]
├──────────────────────────────────────┤  "- ".repeat(80)  text-[6px]  my-0.5
│ AB01  VIANDE DE BOEUF         5 000  │  font-oswald font-light text-[10px]
│ CD03  POULET - 1.2KG          3 600  │
├──────────────────────────────────────┤  "- ".repeat(80)  text-[6px]  my-0.5
│ TOTAL               8 600 FCFA       │  font-bebas text-base
│ MOBILE MONEY · 0707142233  8 600 FCFA│  font-light text-[10px]
├──────────────────────────────────────┤  "- ".repeat(80)  text-[6px]  my-0.5
│   TVA   TAUX    VAL TVA  MONTANT HT  │  px-4  font-bebas font-semibold text-[9px]
│   1    18,00      1 317       7 283  │  font-light text-[9px]
│   MONTANT TOTAL   1 317       7 283  │  font-bebas font-semibold text-[9px]
├──────────────────────────────────────┤  "- ".repeat(80)  text-[6px]  my-2
│           BS260609001                │  font-mono text-[10px] mt-2 tracking-widest
│  CAISSE 01  CAISSIER NOM  TICKET xx  │  font-light text-[9px]
│    YOUR STORE NAME LE 09/06 A 14:32  │
│        Merci de votre fidélité !     │  text-[11px]
└──────────────────────────────────────┘
```

### Spacing rules summary

| Zone | Tailwind class |
|---|---|
| Between blocks | `my-0.5` on the separator `<p>` |
| Before ticket code | `my-2` on the separator `<p>` + `mt-2` on the ticket `<p>` |
| Items area wrapper | `py-2` |
| Total section | `py-1 space-y-0.5` |
| TVA block | `py-1 px-4` |

### Font weight rules

| Content | Class |
|---|---|
| Store name | `font-bebas` (400 = regular, looks bold by design) |
| Column headers (CODE, NOM…) | `font-bebas font-semibold` |
| TOTAL label | `font-bebas text-base` |
| TVA column headers, MONTANT TOTAL | `font-bebas font-semibold text-[9px]` |
| Item rows, payment row, TVA data row | `font-light` |
| Address, phone, email, ticket code | `font-mono` |

---

## 9. Common Pitfalls

| Symptom | Root cause | Fix |
|---|---|---|
| Receipt prints 3 times | The whole page prints, then the dialog portal prints — each region triggers a new page | Add rule 3: `body > *:not(:has(#receipt-print)) { display: none }` |
| Dark/grey page before the receipt | Radix dialog overlay (backdrop) is printing | Add rule 4: `[data-radix-dialog-overlay] { display: none }` |
| Large blank right margin | `@page` not set to `78mm`, or dialog container still has `max-width` | Add `@page { size: 78mm auto; margin: 0 }` AND rules 6–7 to flatten the portal |
| Blank whitespace at the top | `html/body` still have default margin, or dialog has `transform: translateY(-50%)` | Add rule 2 (reset html/body) and rule 7 (remove Radix transform) |
| × close button visible on print | Radix renders it outside normal flow | Add `no-print` class to `DialogPrimitive.Close` AND rule 9 |
| Separator looks "- - - -" (wide gaps) | `font-mono` makes space = dash width | Remove `font-mono` from the separator `<p>`; use `tracking-tight` instead |
| Amounts show decimals (1 800,00) | `Intl.NumberFormat` default | Set `maximumFractionDigits: 0` in `formatCurrency` |
