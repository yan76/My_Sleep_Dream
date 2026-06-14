# Yueban Advice Background Asset Report

## Source

- User clipboard source: `source/advice-background-source.png`
- Source size: `475 x 266`
- Scale: `750 / 475 = 1.5789473684`
- Normalized source: `source/advice-background-source-750.png`
- Locked source artboard: `750 x 420`

## Output

- Frontend asset: `../../ui/growth-advice-card-background.png`
- Generated clean copy: `assets/images/image-advice-card-background-clean.png`
- Current-screenshot reference crop: `assets/images/image-advice-card-reference-01.png`
- Manifest: `layers.manifest.json`

## Bbox QA

- All-layer preview: `qa/bbox-preview-all.png`
- Bitmap preview: `qa/bbox-preview-bitmap.png`
- Visible card bbox in the current screenshot: `x=20, y=22, width=438, height=221`
- Scaled card bbox on the 750px artboard: `x=32, y=35, width=692, height=349`

## Audit

- Asset dimension/mode audit: `qa/asset-audit.json`
- Frontend clean background size: `685 x 345`, `RGBA`
- Reference crop size: `692 x 349`, `RGBA`

## Known Limits

- The clipboard screenshot has title and body text baked into the background. The frontend asset therefore uses the existing verified no-text Yueban growth UI crop, copied to a stable `assets/ui` path.
- Browser screenshot overlay was not run because project instructions require user approval before browser testing.
