// /src/utils/palettes.js
/* Color ramps for legends and UI hints. Backend should color raster tiles.
   We pass palette name to backend; use these names in query strings. */

export const PALETTES = {
  normal: {
    name: 'viridis',
    label: 'Default (Viridis, CB-friendly)'
  },
  cb: {
    name: 'cividis',
    label: 'Color-blind friendly (Cividis)'
  }
}
