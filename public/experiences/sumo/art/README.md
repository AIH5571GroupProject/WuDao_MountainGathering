# 05 Sumo · Woodblock Art Drop-In Slot (`public/experiences/sumo/art/`)

`SumoWoodblockArt.tsx` automatically loads custom AI-generated PNG illustrations from this folder if present, and gracefully falls back to bespoke Edo woodblock SVG prints when PNGs are absent.

## Supported Filenames

- `kimarite-oshidashi.png` — Double-palm thrust (*Oshidashi* 押出)
- `kimarite-yorikiri.png` — Belt-grip force-out (*Yorikiri* 寄切)
- `kimarite-uwatenage.png` — Overarm belt throw (*Uwatenage* 上手投)
- `kimarite-hatakikomi.png` — Sidestep slap-down (*Hatakikomi* 叩込)
- `banzuke-crest.png` — Yokozuna *tsuna* braided rope & *gunbai* fan emblem

## Curated Shared Style Prompt (for AIH5571 Prompt Log)

> Traditional Japanese Edo ukiyo-e woodblock print in Katsushika Hokusai style on flat warm rice paper (`#e9ecdf`). Palette restricted to deep sumi ink green-black (`#253422`), muted Arakida clay (`#b5aa8c`, `#9c8772`), matcha green (`#829274`), and vermilion (`#b8432e`) accents. No purple, no neon, no text or kanji inside the illustration. Bold hand-carved ink contours, generous rice-paper negative space.
