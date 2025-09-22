# ARK Mask Colorizer

ARK Mask Colorizer is a Vite + React tool for previewing dinosaur palettes before applying them in ARK: Survival Ascended/Evolved. It takes a base render and up to six slot masks, applies palette colors, and exports ready-to-share images.

## Highlights
- 6-slot color workflow using the official ARK palette (`src/utils/arkPalette.js`) with slot 255 reserved for "skip".
- Real-time recolor powered by a Web Worker pipeline and OKLab based blending controls (keep light, chroma boost/curve, overlay tinting, etc.).
- Mask overlays: drop extra files named `_m_xy.png` to mix slot pairs (e.g. `Raptor_m_04.png` mixes slots 0 and 4).
- Persistent state: chosen creature, colors, and slider tweaks survive page reloads via `localStorage`.
- Fast clipboard and export helpers: click the preview to copy the current image, right click to copy an image with a palette strip, or use the toolbar buttons to download.
- Asset automation scripts for keeping `public/assets/dino` and `src/data/creatures.json` in sync.

## Quick start

```sh
npm install
npm run dev
```

Open the Vite dev server (default `http://localhost:5173`) and pick a creature from the list. `npm run build` and `npm run preview` follow the standard Vite workflow.

## Working with creature assets

Place art under `public/assets/dino/<CreatureName>/`:

```
public/assets/dino/<CreatureName>/
  <CreatureName>.png        # base render
  <CreatureName>_m.png      # primary 6-channel mask (RGB + CMY)
  <CreatureName>_m_01.png   # optional overlay mask mixing slots 0 and 1
  <CreatureName>_sf.png     # optional female variant base
```

Rules of thumb:

- Base images and masks must have matching dimensions and transparent backgrounds.
- Mask colors map to slots: red=slot0, green=slot1, blue=slot2, cyan=slot3, yellow=slot4, magenta=slot5.
- Extra masks ending in `_m_xy.png` blend slot pairs (e.g. `_m_45` combines slots 4 and 5). They are applied after the primary mask for additive and pastel overlays.
- Use `_sf` in the filename for female variants; both the script and the UI treat them as separate entries.

If you have raw PNGs in `./temp`, run `npm run organize:dino-assets` to bucket them per creature folder. The script removes pre-existing folders before moving files, so ensure the source set is complete.

## Updating `creatures.json`

`src/data/creatures.json` drives the picker. Each entry references the base image, mask files, and optional `noMask` slot list. Regenerate it after adding or removing assets:

```sh
npm run generate:creatures
```

The generator preserves existing `noMask` entries by matching on folder, base name, and display name. Commit the refreshed JSON together with the asset changes.

## Using the app

- Pick a creature from the dropdown or drop a matching `base.png` + `*_m.png` pair on the "Custom mask" button.
- Slot controls let you assign colors, randomize all slots, reset, or fill every unlocked slot with a palette pick. The "Paste Color" button reads ARK admin commands from the clipboard, selects the matching creature, and applies the six color IDs automatically. "Copy Color" writes a `setTargetDinoColor` sequence for the current slots.
- The toolbar exposes the recolor pipeline: threshold, strength, feathering, gamma, speckle cleanup, edge smoothing, boundary blending, and overlay tint/strength. Advanced OKLab controls (keep light, chroma boost, chroma curve) help preserve shading.
- Adjust export background/text colors; choose "transparent" to export without a background fill.

## Exporting and clipboard helpers

- Click the canvas to copy the recolored image to the clipboard.
- Right-click the canvas to copy an image extended with a palette strip (slot colors + IDs).
- Toolbar buttons download the current image or the palette variant as PNGs. Progress spinners appear while the worker renders.

## Persistence

UI state (creature selection, slot colors, slider values, export styles) lives in `localStorage` under the `ark-mask-colorizer:v1` namespace. Use the Reset button to revert the sliders to defaults; clearing browser storage fully resets the app.

## Development notes

- Source lives in `src/`. Color math and palette data are in `src/utils`.
- Recoloring runs inside `src/workers/recolorWorker.js`; during development it is loaded as a classic worker for compatibility with Vite.
- The project targets modern Chromium-based browsers; clipboard features require clipboard-write permissions.

Feel free to open issues or PRs when new assets or workflow tweaks are needed.
