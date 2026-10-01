# Onel-Dynamics — Corporate Website

Standalone presentation website for Onel-Dynamics and its main product,
**DroneOS**. This is a *separate* project from the DroneOS operational
dashboard and does **not** connect to any DroneOS control API.

## Preview

The site is a static bundle with no build step and no package manager.

```bash
git clone https://github.com/balauru96/onel-dynamics-website.git
cd onel-dynamics-website
python3 -m http.server 8080
```

Open: **http://localhost:8080**

Equivalent one-liner from anywhere:

```bash
python3 -m http.server 8080 --directory onel-dynamics-website
```

Opening `index.html` directly from disk (`file://`) also works, but the
HTTP server is recommended so relative paths and caching behave normally.

## Live site

<https://balauru96.github.io/onel-dynamics-website/>

Published automatically from `main` via GitHub Pages. See
**Design workflow** below for how changes reach the live site.

## Structure

```
Onel-Dynamics-Website/
├── index.html                  # single page, 7 sections
├── README.md
└── assets/
    ├── css/styles.css          # design system + all components
    ├── js/main.js              # nav, scrollspy, reveal (progressive only)
    └── img/logo.svg            # logo / favicon
```

## Sections

| # | Section | Anchor |
|---|---------|--------|
| 01 | Introduction — Onel-Dynamics and DroneOS | `#about` |
| 02 | The problem, and what DroneOS provides | `#problem` |
| 03 | Workflow: the seven-step, two-flight inspection sequence | `#workflow` |
| 04 | Architecture: Operator / DroneOS / Jetson Field Box / Onboard / PX4 | `#architecture` |
| 05 | Initial use case: solar panel inspections | `#usecase` |
| 06 | Status & Vision: what works today vs. what is still to come | `#status` |
| 07 | Contact | `#contact` |

## Design system

Tokens live in the `:root` block at the top of `assets/css/styles.css`.

- **Surfaces** — deep navy `#050a12` / `#070e18` with layered elevations
  `#0a1421` → `#112133`
- **Accent** — a single industrial cyan `#3ed0e4`, used only for emphasis,
  interactive states and diagrams
- **Semantic** — amber `#e3a85c` means *not yet validated*, green `#4ecb95`
  means *validated*. These colours are never used decoratively.
- **Type** — Archivo (display), Inter (body/UI), JetBrains Mono (labels,
  numerals, data). Fluid scale from `--t-0` to `--t-6`.
- **Rhythm** — `--section-y` is fluid (`clamp(4.5rem, 8.5vw, 8.5rem)`),
  giving generous spacing at every width.

## Accessibility and behaviour

- Skip link, semantic landmarks, one `h1`, ordered heading levels
- Sticky header with a bottom hairline on scroll
- Mobile menu: `aria-expanded` / `aria-controls`, closes on link click,
  `Escape`, outside click, and on return to desktop width
- Scrollspy marks exactly one nav link with `aria-current="true"`
- Reveal-on-scroll is opt-out: `prefers-reduced-motion: reduce` disables all
  transitions, and the page is fully readable with JavaScript disabled
- All interactive targets are at least 40 × 40 px (links inline in a
  sentence are exempt, per WCAG 2.5.8)
- Body and secondary text pass WCAG AA (4.5:1) on every surface, including
  inside expanded `<details>`; no text below 11 px
- Print styles collapse the chrome and force reveals visible

## Content accuracy

The copy deliberately separates **validated today** from **planned work**.
The project is presented as under development and validation. There are no
invented customers, certifications, performance metrics, partnerships, or
available features. The contact block uses the owner-provided email address.

The body copy is written for partners and solar-inspection customers, so
implementation detail is kept out of the main reading path:

- **Compact status in the hero** — one line: *Under development · Validated in
  simulation*
- **Workflow** — the seven steps a customer actually cares about, in plain
  English, with a separate *Why it matters* note
- **One complete explanation** of exactly what has and has not been validated
  lives in **Status & Vision** (`.status__scope`); other sections link to it
  instead of repeating it
- **Technical detail is opt-in** — implementation mechanisms, state names,
  checksums and the validation environment live in two collapsed
  `<details>` blocks: *Technical detail* (platform) and *Validation
  environment and technical detail* (status)

## Not included

- No build tooling, bundler, or `package.json`
- No frameworks — the DroneOS project is vanilla HTML/CSS/JS, and this site
  matches that stack
- No analytics, accounts, cookies, or third-party embeds

## Drone concept animation

The hero uses a generated, illustrative drone asset; it does not depict
validated hardware. On opening the website, a 2.2-second drone entrance
settles into the hero while the text appears in a short sequence. It starts
when the image is ready and the drone viewport enters the screen, including
after scrolling on mobile or activating a background tab. The text joins
the sequence only while visible. Navigation is never blocked. Visitors can
replay or pause the transition. Reduced-motion
preferences disable animation; the image and navigation remain usable
without JavaScript. There are no accounts or authentication services.
- Fonts load from Google Fonts; the page falls back to system stacks offline
