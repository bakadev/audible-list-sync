# Extension Icons

This directory should contain three icon files:

- `icon16.png` - 16x16px icon for toolbar
- `icon48.png` - 48x48px icon for extension management page
- `icon128.png` - 128x128px icon for Chrome Web Store

## Temporary Placeholder

For development purposes, you can use simple colored squares.
For production, replace with properly designed Audible-branded icons.

## Creating Icons

```bash
# Using ImageMagick (if installed):
convert -size 16x16 xc:#ff6600 icon16.png
convert -size 48x48 xc:#ff6600 icon48.png
convert -size 128x128 xc:#ff6600 icon128.png
```

Or use any image editor to create 16px, 48px, and 128px PNG files
with the Audible orange color (#ff6600).
