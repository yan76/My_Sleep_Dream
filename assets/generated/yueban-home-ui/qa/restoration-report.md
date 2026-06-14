# Yueban Home UI Restoration Report

## Source

- Source image: `source/home-source.png`
- Source size: `852 x 1846`
- Normalized source: `source/home-source-750.png`
- Scale: `750 / 852 = 0.8802816901`
- Locked artboard: `750 x 1625`

## Output

- Code: `docs/yueban-home-ui/index.html`
- Manifest: `layers.manifest.json`
- Assets root: `assets/`
- QA root: `qa/`

## Layer Strategy

- Text layers are rebuilt as editable HTML text.
- Simple shapes are rebuilt as CSS vectors: background rings, cards, pills, buttons, dividers, progress bar, nav shell, and home indicator.
- Complex image/icon layers are cut from the current source image:
  - `assets/illustrations/illustration-main-moon-cloud-01.png`
  - `assets/images/image-feedback-nightscape-01.png`
  - `assets/icons/icon-tool-spa-01.png`
  - `assets/icons/icon-tool-challenge-01.png`
  - `assets/icons/icon-nav-home-01.png`
  - `assets/icons/icon-nav-rescue-01.png`
  - `assets/icons/icon-nav-growth-01.png`
  - `assets/icons/icon-nav-settings-01.png`

## QA

- Bbox preview, bitmap layers: `qa/bbox-preview-bitmap.png`
- Bbox preview, all layers: `qa/bbox-preview-all.png`
- Transparent asset preview: `qa/transparent-assets-preview.png`
- PNG audit command:

```powershell
& 'C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' 'C:\Users\Administrator\.codex\skills\yueban-image-to-code\scripts\audit_png_assets.py' 'D:\AI-Ego\My_Sleep_Dream\assets\generated\yueban-home-ui\assets\icons' 'D:\AI-Ego\My_Sleep_Dream\assets\generated\yueban-home-ui\assets\illustrations' --manifest 'D:\AI-Ego\My_Sleep_Dream\assets\generated\yueban-home-ui\qa\png-audit-manifest.json' --require-transparent-bg
```

- PNG audit result: all transparent PNG assets passed size, alpha, transparent corner, and edge-touch checks.

## Known Limits

- Browser screenshot and overlay comparison were not run because the project instruction requires user approval before browser testing.
- Exact font rendering may differ from the generated source image because the image source does not provide the original font file.
- The feedback landscape background is cut from the right side of the source card so its visible text can remain editable in the HTML layer.
