# Hooke Wilding Webapp (Hooke Farm Wilding Portal)

An **offline, interactive guide** to Hooke Farm’s wilding features — built from the WW24 info boards — plus a “Living Dorset Field Guide” you can extend over time.

## What’s in here

- **Explore map + feature boards**: `index.html` + `app.js`
  - Click map pins or cards to open a feature.
  - Search + tag filtering.
  - “Tour” mode steps through pinned features.
  - Opening or reloading Explore directly plays a full-window meadow entrance. Internal navigation, feature links and reduced motion open straight on the map. “Replay meadow entrance” and `?entrance=replay` also work with reduced motion, showing a still meadow that visitors can dismiss.
  - Feature readers support enlargement, the original board and transcript, seasonal notes and photos. Link directly to a feature with `?feature=the-bat-egg`. Browser Back returns to Explore.
  - The Bat Egg, Standing Stones, Our Sweet Track and Public Bridleway have “Look closer” photo studies with dated comparisons. Each feature’s captions, date sources and pairings live in its own study file under `data/`. The first three Standing Stones photos come from the original farm board.
- **Living Dorset Field Guide**: `field-guide.html` + `field-guide.js`
  - Browse a curated starter dataset of habitats/species.
  - Filter by group/habitat/season and search.
  - The selected species shares a spread with its photograph, identification notes, seasonality, credits and sources. “Look closer” opens annotated views of that photograph. Each detail in the species dataset specifies a label, note and crop as percentages of the original image.
- **Discover (videos + blogs)**: `content.html` + `content.js`
  - Curated library with search, filters, and sorting.
  - YouTube videos play in a modal; blog links open in a new tab.
- **Farm gallery**: `gallery.html` + `gallery.js`, with before-wilding photographs, artwork, search and a keyboard-operated viewer.
- **About the farm**: `about.html` and `about.css` tell the history of the wilding project using Julia Hailes’s published accounts, the original field boards and farm photographs.

The five public pages share a continuous flowering meadow footer photographed at Hooke. The planting rises once as it comes into view, with a comma butterfly and bumblebee in front. Visitors come from Hooke Farm photographs in `assets/hookewildingmisc/`, `assets/features/wildflower-meadow/` and `assets/features/toad-pond/`. The cutout details are served locally from `assets/wildlife/` and `assets/arrival/`. Tapping a visitor or activating it with the keyboard reveals its name. Reduced motion keeps the animals still.

## Run locally

This is a **static site** (no build step). You can open `index.html` directly, but a tiny local server is recommended.

### Option A: Python (recommended)

```bash
# Run in the repository root.
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://localhost:8000/index.html`.

### Option B: Any static file server

Serve the repo root directory and open `index.html`.

## Content + data model

### Wilding features (map + boards)

- **Bundled dataset used by the app**: `data/features-data.js`
  - Defines `window.__HOOKE_DATA__` (the app reads this in `app.js`).
- **Source JSON (human-readable)**: `data/features.json`
  - `features-data.js` is marked “Auto-generated from `data/features.json`”.
  - If you edit `features.json`, you’ll need to update/regenerate `features-data.js` to match.
  - If you add images into `assets/features/<feature-id>/`, you’ll also need to regenerate `features-data.js` (the browser can’t auto-scan folders at runtime in a static site).

Feature fields used by the UI include:
- **`id`** (string): stable unique id (also used for local overrides)
- **`title`** (string)
- **`tags`** (string[])
- **`thumb`** (string path)
- **`pages[0].image`** (string path)
- **`text`** (string): extracted text shown in the “original extracted text” section

### Living Dorset Field Guide

- **Dataset**: `data/dorset-field-guide.js`
  - Defines `window.__DORSET_GUIDE__`
  - Includes `habitats`, `groups`, `seasons`, and `species[]`
- **Images**: `assets/field-guide/`
  - The UI falls back to `assets/field-guide/placeholder.svg` if an image fails to load.

## Admin mode (local-only curation)

The Explore page includes an **Admin mode** for local editing and curation (titles, stories, tags, images, gallery, pin positions, hide/delete).

- **Where edits are saved**: your browser’s storage (LocalStorage + SessionStorage)
  - This keeps the site usable offline, but it also means **edits do not change files in this repo**.
- **Resetting changes**: clear the site’s browser storage (or use “Reset edits” per feature in Admin).
- **Security note**: Admin “protection” is client-side for an offline site and is not intended as a real security boundary.

## Tools

### Fetching cover images for the field guide (Wikimedia Commons)

Script: `tools/fetch_commons_covers.py`

- Searches Wikimedia Commons for each species term
- Filters to open licenses (CC BY / CC BY-SA / CC0 / Public domain)
- Downloads a resized thumbnail into `assets/field-guide/`
- Prints JSON attribution metadata you can paste into `data/dorset-field-guide.js`

Usage:

```bash
python3 tools/fetch_commons_covers.py
```

If your environment has SSL certificate issues, the script supports an insecure mode:

```bash
HOOKE_INSECURE_SSL=1 python3 tools/fetch_commons_covers.py
```

### Populate YouTube publish dates for Discover (optional)

YouTube publish dates are not available via oEmbed and can’t be reliably scraped in-browser (CORS), so they’re best added at build/curation time.

1. Create a YouTube Data API v3 key
2. Run:

```bash
export YOUTUBE_API_KEY="YOUR_KEY"
python3 tools/build_content_youtube_dates.py --write
```

## Repo layout (high-level)

- **Pages**: `index.html`, `field-guide.html`, `content.html`, `gallery.html`, `about.html`
- **Logic**: `app.js`, `field-guide.js`
- **Styles**: `styles.css` (shared), `arrival.css`, `feature-view.css`, `field-guide.css`
- **Data**: `data/`
- **Images & PDFs**: `assets/`
- **Utility scripts**: `tools/`

## License

Copyright © 2026 Monty Bryant. All rights reserved. No open-source licence has been granted yet (see [LICENSE](LICENSE)).

If you'd like to use, fork, adapt or collaborate on this project, please get in touch by [opening an issue](https://github.com/montymerlin/hooke-wilding-webapp/issues) or through [my Linktree](https://linktr.ee/montybryant), and I'll review each request.

The locally hosted Instrument Serif and DM Sans fonts carry their SIL Open Font License notices in `assets/type/`.

Third-party material in this repository, such as Wikimedia Commons images and other people's artwork, writing or photographs, stays under its own licence or with its creator.
