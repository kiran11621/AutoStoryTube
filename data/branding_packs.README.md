# Branding Packs

Reusable branding packs are defined in `data/branding_packs.json`.

## Purpose

Use one pack for consistent branding across single uploads and batch uploads:
- animated logo defaults
- intro/outro text overlays
- subscribe CTA overlay
- end-screen placeholder blocks
- end credits defaults

## Example selector usage

- YouTube Upload UI: `branding_pack = default_branding`
- Batch Excel column: `branding_pack`

## Notes

- `default_pack` applies automatically when a row/form does not specify `branding_pack`.
- Row/form fields override pack values.
