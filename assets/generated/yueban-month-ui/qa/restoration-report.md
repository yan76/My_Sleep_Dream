# Yueban Month UI Assets Report

## Source

- Source: `source/month-source.png`
- Source size: `466 x 789`
- Scale: `750 / 466 = 1.6094420601`
- Locked 750px artboard: `750 x 1270`

## Output

- Manifest: `layers.manifest.json`
- Normalized source: `source/month-source-750.png`
- Assets root: `assets/`
- QA root: `qa/`

## Cut Assets

- Summary moon scene: `assets/images/image-month-summary-moon-scene-01.png`
- Compare moonscape: `assets/images/image-month-compare-moonscape-01.png`
- Trend reference crop: `assets/charts/chart-month-four-week-line-01.png`
- Compare trend icon art: `assets/icons/icon-month-compare-trend-01.png`
- Change list icon art: `assets/icons/icon-month-change-clock-01.png`, `assets/icons/icon-month-change-phone-01.png`, `assets/icons/icon-month-change-sunrise-01.png`

## QA

- All-layer bbox preview: `qa/bbox-preview-all.png`
- Bitmap bbox preview: `qa/bbox-preview-bitmap.png`
- Transparent icon preview: `qa/transparent-assets-preview.png`
- PNG audit manifest: `qa/png-audit-manifest.json`

## Notes

- Text and simple glass/vector surfaces are intentionally recorded in manifest, not exported as bitmap assets.
- Scene images keep their original dark/moonlit background because that background is part of the visual content.
- Small icons are exported as transparent icon art; their dark circular wells should be recreated in code for cleaner reuse.
