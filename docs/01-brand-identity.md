# 01 · Brand & Editorial Identity

> **Status:** Working draft (D-001, D-015, D-016). Good enough to build and launch with, and designed to be revised later without code changes. All colours and fonts are defined once as design tokens.

---

## 1. Name system

| Use | Form | Example |
|-----|------|---------|
| Full masthead | **BEMERICK EXPRESS** | Website header, footer, legal pages, About |
| Short brand / acronym | **BX News** | Social handles, push titles, TikTok/WhatsApp branding, spoken by anchors ("This is BX News…") |
| Monogram | **BX** | Favicon, app icon, social avatars, watermark on share images |
| Browser tab | `Headline · BEMERICK EXPRESS` | Every page. Homepage: `BEMERICK EXPRESS · News. Insight. Impact.` |

**Handles to reserve now** (even before launch): `bxnews` first choice, `bemerickexpress` second, on WhatsApp Channel, TikTok, X, Facebook, Instagram, YouTube and Threads. Use the same handle everywhere.

**Positioning statement (draft):**
*BEMERICK EXPRESS is Uganda's fast, verified, mobile-first newsroom: clear reporting on what happened, what it means, and what happens next.*

**Tagline (draft, Q-002):** *News. Insight. Impact.*

---

## 2. Colour palette: "Lake & Crane"

### Why this palette
Most major outlets, Ugandan and international, are built on **red + white + black**, **navy + red**, or **black + gold**. A BX reader should be able to spot our share card in a busy WhatsApp or X feed by colour alone, so we deliberately avoid those combinations.

The palette takes its cues from **Lake Victoria** (a deep ink-teal) and the **Grey Crowned Crane** (warm gold). **Ember** is a burnt-orange red reserved only for *Breaking* and *Live*, so urgency always means something. The page sits on warm **Paper** rather than stark white. That reads as "editorial" and is easier on the eyes on bright phone screens.

### Core tokens

| Token | Hex | Role | Swatch |
|-------|-----|------|--------|
| `--bx-lake-ink` | `#0E3B43` | **Primary brand.** Header, logo, links, buttons | ![](https://placehold.co/24x24/0E3B43/0E3B43.png) |
| `--bx-deep-lake` | `#082A30` | Footer, overlays on photos, dark surfaces | ![](https://placehold.co/24x24/082A30/082A30.png) |
| `--bx-crane-gold` | `#D9A441` | **Accent.** Section labels, highlights, the "X" in the BX mark, rules | ![](https://placehold.co/24x24/D9A441/D9A441.png) |
| `--bx-ember` | `#C8401F` | **Breaking & Live only.** Never decoration | ![](https://placehold.co/24x24/C8401F/C8401F.png) |
| `--bx-paper` | `#FAF7F2` | Page background | ![](https://placehold.co/24x24/FAF7F2/FAF7F2.png) |
| `--bx-ink` | `#16191B` | Body text, headlines | ![](https://placehold.co/24x24/16191B/16191B.png) |
| `--bx-slate` | `#5B6670` | Secondary text: bylines, timestamps, captions | ![](https://placehold.co/24x24/5B6670/5B6670.png) |
| `--bx-mist` | `#E4ECEA` | Card backgrounds, dividers, input fills | ![](https://placehold.co/24x24/E4ECEA/E4ECEA.png) |
| `--bx-white` | `#FFFFFF` | Text on Lake Ink / Ember, card surfaces | ![](https://placehold.co/24x24/FFFFFF/FFFFFF.png) |

### Dark mode tokens

| Token | Hex |
|-------|-----|
| Background | `#0B1416` |
| Surface (cards) | `#13221F` |
| Text | `#ECE8E1` |
| Secondary text | `#9AA7AD` |
| Primary (links/buttons) | `#7CC4C0` |
| Accent gold | `#E2B65C` |
| Ember (breaking/live) | `#E0623F` |

### Accessibility (WCAG 2.2 AA)
These pairings have been checked against the contrast ratio formula and pass the 4.5:1 normal-text threshold:

| Foreground on Background | Approx. ratio | Use |
|--------------------------|---------------|-----|
| White on Lake Ink | ~12 : 1 | Header, buttons |
| Ink on Paper | ~16.5 : 1 | Body text |
| Slate on Paper | ~5.5 : 1 | Bylines, timestamps |
| White on Ember | ~5.0 : 1 | Breaking banner text (use bold) |
| Crane Gold on Lake Ink | ~5.4 : 1 | Labels on dark |

⚠️ **Never** put Crane Gold text on Paper or white. The contrast is too low. Gold on light backgrounds is for rules, underlines and icons only.

### CSS tokens (copy into the app)

```css
:root {
  --bx-lake-ink: #0E3B43;
  --bx-deep-lake: #082A30;
  --bx-crane-gold: #D9A441;
  --bx-ember: #C8401F;
  --bx-paper: #FAF7F2;
  --bx-ink: #16191B;
  --bx-slate: #5B6670;
  --bx-mist: #E4ECEA;
  --bx-white: #FFFFFF;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bx-paper: #0B1416;
    --bx-white: #13221F;
    --bx-ink: #ECE8E1;
    --bx-slate: #9AA7AD;
    --bx-lake-ink: #7CC4C0;
    --bx-crane-gold: #E2B65C;
    --bx-ember: #E0623F;
  }
}
```

---

## 3. Typography

Two families, both **free (SIL Open Font License)**, on Google Fonts, and **self-hosted** through `next/font` so readers never download from a third party. That's faster, uses less data and creates no tracking issue.

| Role | Font | Weights to load | Why |
|------|------|-----------------|-----|
| Headlines, article body, masthead | **Newsreader** | 400, 600, 700, 400 italic | Designed specifically for news reading on screens. It looks authoritative without copying the big mastheads |
| Interface: navigation, labels, buttons, bylines, timestamps, admin portal | **Instrument Sans** | 400, 600 | Modern, compact and very legible at small sizes. Less overused than Inter or Roboto |

**Fallback stacks** (used while fonts load, and on very slow networks):
```css
--font-serif: "Newsreader", Georgia, "Times New Roman", serif;
--font-sans:  "Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

### Type scale (mobile → desktop)

| Element | Font | Size | Line height |
|---------|------|------|-------------|
| Lead headline (homepage) | Newsreader 700 | 30px → 48px | 1.1 |
| Article headline (H1) | Newsreader 700 | 28px → 42px | 1.15 |
| Card headline | Newsreader 600 | 18px → 21px | 1.25 |
| Standfirst / excerpt | Newsreader 400 italic | 18px → 21px | 1.45 |
| Article body | Newsreader 400 | 18px → 20px | 1.65 |
| Section label (kicker) | Instrument Sans 600, UPPERCASE, +0.08em tracking | 12px → 13px | 1 |
| Byline / timestamp | Instrument Sans 400 | 13px → 14px | 1.4 |
| Navigation | Instrument Sans 600 | 15px | 1 |

Keep body lines at **60–75 characters** (max-width about 680px).

---

## 4. Logo (draft)

| File | Use |
|------|-----|
| [`brand/logo-wordmark.svg`](../brand/logo-wordmark.svg) | Header on light background, documents, letterhead |
| [`brand/logo-wordmark-reverse.svg`](../brand/logo-wordmark-reverse.svg) | Header/footer on Lake Ink or dark photos |
| [`brand/logo-mark-bx.svg`](../brand/logo-mark-bx.svg) | Social avatars, app icon, watermark |
| [`brand/favicon.svg`](../brand/favicon.svg) | Browser tab icon |

**Concept:** "BEMERICK" in heavy Newsreader over "EXPRESS" in widely spaced Instrument Sans, separated by a thin Crane Gold rule. In the **BX monogram**, the X has one paper-white stroke and one **gold "express" stroke** cutting forward. That single gold slash is the recognisable brand device and can be reused on share cards, the breaking banner and bulletin thumbnails.

**Before the final logo:** the wordmark SVGs use live text, so they render in the fallback serif if the fonts aren't installed. When the logo is finalised, a designer should **convert the text to outlines** (paths) and produce PNG exports (512, 192, 180, 32px) plus a 1-colour version.

### Logo rules
- Minimum clear space: the height of the "B" on all sides.
- Minimum size: wordmark 120px wide; BX mark 24px.
- Don't recolour outside the palette, stretch, add shadows or put it on busy photos without the Deep Lake overlay.

---

## 5. Social & share templates

| File | Size | Where it's used |
|------|------|-----------------|
| [`brand/social-share-1200x630.svg`](../brand/social-share-1200x630.svg) | 1200×630 | Link previews on WhatsApp, X, Facebook (Open Graph image). **The website generates this automatically per article** from the headline, section and lead photo |
| [`brand/social-story-1080x1920.svg`](../brand/social-story-1080x1920.svg) | 1080×1920 | WhatsApp Status, TikTok cover, Instagram/Facebook Stories |
| [`brand/breaking-card-1080x1080.svg`](../brand/breaking-card-1080x1080.svg) | 1080×1080 | Breaking posts on WhatsApp Channel and X |

**Template anatomy (all formats):**
1. Lead photo, full bleed, with a **Deep Lake gradient** from the bottom so text is always readable.
2. **Section kicker** in Crane Gold caps (e.g. `BUSINESS`).
3. **Headline** in Newsreader Bold, white, max 3 lines (auto-shrink).
4. **Brand bar** at the bottom: BX mark + `bemerickexpress.com`.
5. **Photo credit** small, bottom-right (legal requirement, see Blueprint §11).

---

## 6. Breaking news banner

| File | Use |
|------|-----|
| [`brand/breaking-banner-web.svg`](../brand/breaking-banner-web.svg) | Visual spec for the site-wide banner (built in HTML/CSS, not as an image) |
| [`brand/breaking-card-1080x1080.svg`](../brand/breaking-card-1080x1080.svg) | Social version |

**Website banner behaviour:**
- Full-width bar directly **under the header**, Ember background, white text.
- Left: pulsing dot + **BREAKING** label (Instrument Sans 600, caps). Right: the headline (Newsreader 600), linking to the story.
- Height 44px mobile / 48px desktop, reserved by the layout so the page **never jumps**.
- Dismissible (×) for that reader, remembered for that alert only.
- **Expires automatically** (default 3 hours, editor can change) so stale "breaking" never lingers.
- Only **one** breaking alert at a time. A second one replaces the first.
- Variant **LIVE** (same Ember, red dot + `LIVE` label) when a YouTube stream is on air, linking to `/live`.
- Animation respects `prefers-reduced-motion`. The pulsing dot becomes static for readers who opt out of motion.

---

## 7. Photography style

- **Real, local, people-centred.** Avoid generic stock photos for Uganda stories.
- Every photo carries a **credit**, **caption** and **alt text** (enforced by the publishing tool).
- Default crop ratios: **16:9** (lead and cards), **1:1** (social), **4:5** (portrait in-article).
- Uploads are resized to WebP at 3 widths (480, 960, 1600px) to save readers' data.

---

## 8. Editorial voice

- **Clear before clever.** Headlines state what happened. No clickbait, no ALL CAPS, no "You won't believe…".
- **Ugandan English, BBC-style clarity.** Short sentences, active voice, explain acronyms on first use (e.g. *Kampala Capital City Authority (KCCA)*).
- **Attribution always.** "Police said…", "according to documents seen by BX News…".
- **Neutral in news, labelled in opinion.** Opinion and analysis carry a visible label.
- **Correct openly.** Corrections are noted at the foot of the story with the date (see Blueprint §11).
