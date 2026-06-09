# Zone d'impression — Reçu thermique 80mm

Guide complet pour configurer correctement l'impression d'un reçu dans une app Next.js App Router.  
Résout les problèmes classiques : bouton "Imprimer" qui sort sur le ticket, URL `localhost` visible, croix/X imprimées, reçu répété 3 fois.

---

## Pourquoi ça part en vrille sans configuration

Quand on appelle `window.print()` sans rien préparer, le navigateur imprime **toute la page** telle qu'elle est à l'écran :

- La sidebar, le header, les boutons → tout s'imprime
- Le modal est en `position: fixed` avec un fond noir → la zone d'impression devient toute noire
- Le body a `display: flex; min-height: 100vh` → crée des espaces blancs en tête de page
- L'URL et le titre de l'onglet sont ajoutés automatiquement par le navigateur en en-tête/pied de page
- Si la page fait 3 écrans de haut, le reçu s'imprime 3 fois (une fois par page)

---

## Architecture du composant

La clé est d'utiliser **3 marqueurs** dans le JSX :

| Marqueur | Rôle |
|---|---|
| `id="receipt-print"` | Identifie le contenu à imprimer |
| `className="no-print"` | Cache les boutons UI (Imprimer, Fermer) |
| `className="receipt-backdrop"` | Identifie le fond sombre du modal |

### ModalPortal

Le modal utilise `createPortal(children, document.body)` — il se rend **directement dans `<body>`**, pas dans l'arbre React normal. Cela permet au CSS d'impression de le cibler précisément avec `body > div:has(#receipt-print)`.

```tsx
// src/components/ModalPortal.tsx
"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
```

### Structure JSX du ReceiptModal

```tsx
return (
  <ModalPortal>
    {/* Fond sombre — receipt-backdrop permet de le cibler en print */}
    <div className="receipt-backdrop" onClick={onClose} style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
      zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: '320px',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
      }}>

        {/* ← no-print : ces boutons ne s'impriment JAMAIS */}
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={handlePrint}>Imprimer</button>
          <button onClick={onClose}>✕</button>
        </div>

        {/* ← receipt-print : SEUL ce div s'imprime */}
        <div id="receipt-print" style={{ background: 'white', padding: '14px 12px', ... }}>
          {/* contenu du reçu */}
        </div>

      </div>
    </div>
  </ModalPortal>
);
```

### handlePrint

Ne jamais appeler `window.print()` directement depuis un `<button onClick={window.print}>`.  
Utiliser une fonction intermédiaire pour pouvoir nettoyer l'état après impression :

```tsx
const handlePrint = () => {
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('receipt-printing');
  }, { once: true });
  window.print();
};
```

---

## CSS d'impression — globals.css

Coller ce bloc **tel quel** dans le fichier CSS global. L'ordre des règles compte.

```css
@media print {

  /* 1. TAILLE DE PAGE — papier thermique 78mm, hauteur automatique */
  @page {
    size: 78mm auto;
    margin: 0 !important;
  }

  /* 2. RESET html/body
     Sans ça : le flex du body centre le contenu → espace blanc en haut du ticket
     Sans ça : min-height: 100vh force une page entière avant le reçu */
  html,
  body {
    background: #fff !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 78mm !important;
    height: auto !important;
    min-height: 0 !important;
    display: block !important;          /* supprime le flex */
    align-items: initial !important;
    justify-content: initial !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* 3. CACHER TOUT SAUF LE REÇU
     CRITIQUE — sans ça, toute la page s'imprime en plus du reçu → 3 pages.
     On ne peut PAS utiliser visibility:hidden ici car ça conserve l'espace
     occupé par les éléments et génère des pages blanches. display:none est obligatoire. */
  body > *:not(:has(#receipt-print)) {
    display: none !important;
  }

  /* 4. RENDRE VISIBLE L'ARBRE DU REÇU */
  body > *:has(#receipt-print),
  body > *:has(#receipt-print) *:has(#receipt-print),
  #receipt-print,
  #receipt-print * {
    visibility: visible !important;
    opacity: 1 !important;
  }

  /* 5. APLATIR LE CONTENEUR PORTAL (le .receipt-backdrop)
     Le backdrop est position:fixed avec fond noir et display:flex centré.
     En impression, tout ça doit disparaître. On écrase propriété par propriété
     car "all: unset" n'est pas fiable en contexte print. */
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
    background: none !important;
    backdrop-filter: none !important;
    inset: unset !important;
  }

  /* 6. APLATIR LE WRAPPER INTÉRIEUR (div autour du papier + boutons) */
  body > div:has(#receipt-print) > * {
    display: block !important;
    position: static !important;
    transform: none !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
    opacity: 1 !important;
    align-items: initial !important;
    justify-content: initial !important;
    max-width: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    background: none !important;
  }
  body > div:has(#receipt-print) > div:has(#receipt-print) {
    width: 78mm !important;
    max-width: 78mm !important;
    border: none !important;
  }

  /* 7. LE REÇU LUI-MÊME — remplit les 78mm, pas de contrainte de hauteur */
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
    max-height: none !important;    /* écrase le maxHeight: 85vh de l'écran */
    overflow: visible !important;   /* écrase le overflowY: auto de l'écran */
    padding: 0 1mm !important;
    margin: 0 !important;
    background: #fff !important;
    color: #000 !important;
    font-size: 10pt !important;
    line-height: 1.15 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    transform: none !important;
    box-sizing: border-box !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Pas d'espace avant la première ligne */
  #receipt-print > :first-child {
    margin-top: 0 !important;
    padding-top: 0 !important;
  }

  /* Supprimer les bordures/ombres à l'intérieur du reçu */
  #receipt-print,
  #receipt-print * {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  /* 8. CACHER LES ÉLÉMENTS UI (boutons, icônes, etc.) */
  .no-print {
    display: none !important;
    visibility: hidden !important;
  }
}
```

---

## Notre UI — ReceiptModal complet

Voici le composant tel qu'il fonctionne dans notre app. Il peut servir de référence directe.

### Séparateur

```tsx
const SEP = '- '.repeat(80);

function Sep({ big = false }: { big?: boolean }) {
  return (
    <p style={{
      fontSize: '8px', overflow: 'hidden', whiteSpace: 'nowrap',
      margin: big ? '10px 0' : '6px 0',
      lineHeight: 1, color: '#888', padding: 0, letterSpacing: '0.02em',
    }}>
      {SEP}
    </p>
  );
}
```

- `overflow: hidden` + `whiteSpace: nowrap` → le texte dépasse mais est coupé proprement
- Pas de `font-family: monospace` → les espaces seraient trop larges
- `big` → séparateur avec plus de marge avant le pied de page

### Polices (layout.tsx)

```tsx
import { Bebas_Neue, Oswald } from 'next/font/google';

const bebas  = Bebas_Neue({ variable: '--font-bebas',  subsets: ['latin'], weight: '400' });
const oswald = Oswald({     variable: '--font-oswald', subsets: ['latin'], weight: ['400','500','600','700'] });

// Dans <html> :
<html className={`${bebas.variable} ${oswald.variable}`}>
```

```tsx
// Dans ReceiptModal.tsx :
const BEBAS  = 'var(--font-bebas), "Bebas Neue", sans-serif';
const OSWALD = 'var(--font-oswald), "Oswald", sans-serif';
const MONO   = '"Courier New", Courier, monospace';
```

### Styles écran vs impression

Le div `#receipt-print` a des styles **écran** en inline :

```tsx
const paper: React.CSSProperties = {
  fontFamily: OSWALD,
  fontSize: '11px', lineHeight: 1.4, color: '#1a1a1a',
  background: 'white', borderRadius: '12px', padding: '14px 12px',
  boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
  maxHeight: '85vh', overflowY: 'auto',   // ← scroll sur écran seulement
};
```

Le CSS `@media print` écrase `maxHeight`, `overflowY`, `borderRadius`, `boxShadow` par `!important`.  
Résultat : même div, deux rendus complètement différents selon le contexte.

---

## Checklist de débogage

| Symptôme | Cause | Fix |
|---|---|---|
| Bouton "Imprimer" sur le ticket | Bouton sans `className="no-print"` | Ajouter `className="no-print"` sur tous les éléments UI |
| `localhost:3000` en haut du ticket | En-tête navigateur activé | Désactiver dans les options d'impression du navigateur, et/ou ajouter `@page { margin: 0 }` |
| Reçu imprimé 3 fois | `visibility: hidden` utilisé à la place de `display: none` pour cacher le reste de la page | Remplacer par `body > *:not(:has(#receipt-print)) { display: none !important }` |
| Page blanche avant le reçu | `body { display: flex; min-height: 100vh }` | Ajouter `html, body { display: block !important; min-height: 0 !important }` dans `@media print` |
| Fond noir imprimé | `position: fixed; background: rgba(...)` non écrasé | Ajouter les règles section 5 (aplatir le portal backdrop) |
| Reçu centré avec espace à gauche/droite | `maxWidth` non écrasé | `body > div:has(#receipt-print) > div:has(#receipt-print) { width: 78mm; max-width: 78mm }` |
| `overflowY: auto` coupe le bas du reçu | Style écran non écrasé | `#receipt-print { max-height: none !important; overflow: visible !important }` |
| `X` ou croix imprimées | Icônes SVG (Lucide etc.) sans `no-print` | Ajouter `className="no-print"` sur le conteneur des boutons |
