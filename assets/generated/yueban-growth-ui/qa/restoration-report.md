# Yueban Growth UI Assets Report

## Source

- Top source: `source/growth-week-top-source.png`
- Bottom source: `source/growth-week-bottom-source.png`
- Source size: `853 x 1844` for each viewport
- Scale: `750 / 853 = 0.8792497069`
- Locked viewport artboard: `750 x 1621` for each source viewport
- Stitched QA reference: `source/growth-week-stitch-source-750.png`, seam offset `1375px` in source coordinates

## Output

- Master manifest: `layers.manifest.json`
- Source-specific manifests: `layers-top.manifest.json`, `layers-bottom.manifest.json`
- Assets root: `assets/`
- QA root: `qa/`
- Static preview/contact page: `docs/yueban-growth-ui/index.html`

## Cut Assets

- Journal icon: `assets/icons/icon-growth-journal-leaf-01.png`
- Navigation icons: `assets/icons/icon-growth-nav-*.png`, `assets/icons/icon-growth-bottom-nav-*.png`
- Achievement illustrations: `assets/illustrations/illustration-growth-streak-badge-01.png`, `assets/illustrations/illustration-growth-moon-badge-01.png`
- Locked achievement icon: `assets/icons/icon-growth-locked-badge-01.png`
- Advice crops: `assets/images/image-growth-advice-card-full-01.png`, `assets/images/image-growth-advice-moon-scene-01.png`

## QA

- Top bitmap bbox preview: `qa/bbox-preview-top-bitmap.png`
- Top all-layer bbox preview: `qa/bbox-preview-top-all.png`
- Bottom bitmap bbox preview: `qa/bbox-preview-bottom-bitmap.png`
- Bottom all-layer bbox preview: `qa/bbox-preview-bottom-all.png`
- Transparent asset preview: `qa/transparent-assets-preview.png`
- PNG audit manifest: `qa/png-audit-manifest.json`
- PNG audit command:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\Administrator\.codex\skills\yueban-image-to-code\scripts\audit_png_assets.py' 'D:\AI-Ego\My_Sleep_Dream\assets\generated\yueban-growth-ui\assets\icons' 'D:\AI-Ego\My_Sleep_Dream\assets\generated\yueban-growth-ui\assets\illustrations' --manifest 'D:\AI-Ego\My_Sleep_Dream\assets\generated\yueban-growth-ui\qa\png-audit-manifest.json' --require-transparent-bg
```

- PNG audit result: all transparent icon and illustration PNGs passed size, alpha, transparent corner, and edge-touch checks.

## Known Limits

- These screenshots are flattened RGB images, so transparent icons were separated from dark card/nav backgrounds with a local luminance/color mask. The extracted PNGs pass alpha/size/edge checks, but extremely subtle original shadows may not be perfectly recoverable from the flattened source.
- Browser screenshot overlay was not run because the project instruction requires user approval before browser testing.
- Exact font rendering is not guaranteed because the source images do not include the original font file.
