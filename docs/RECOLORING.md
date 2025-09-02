# Recoloring Pipeline (Notes)

- Renderer uses OKLab/OKLCH to preserve base lightness (keepLight) and apply target hue/chroma with chromaBoost and chromaCurve for better color separation (e.g., yellow vs. orange).
- Mask label seeding is chroma-based and diffuses via a 2‑pass distance transform; falloff uses a Gaussian-like weight derived from Feather.
- Hard/soft gates suppress bleed into near‑white/near‑black areas and softly reduce influence where mask chroma is low, while still allowing subtle tinting on gray.
- Tune Keep Light, Chroma Boost, and Chroma Curve in the toolbar to match ARK Smart Breeding look or push a more vivid style.

