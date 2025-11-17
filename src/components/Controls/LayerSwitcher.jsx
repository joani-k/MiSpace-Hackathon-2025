// Vector-or-raster ice layer for MapLibre with legend-based coloring.
// Detects .pbf (vector) vs .png (raster). For vector tiles, draws fill+outline
// and colors by value using the provided legend (breaks/colors).
import { useEffect, useMemo, useRef, useState } from 'react'
import { API } from '../../data/api.js'

export default function IceLayer({
  map,
  product,
  isoTime,
  paletteName,
  legend = null,        // {breaks: number[], colors: string[]}
  opacity = 0.6,
  id = 'ice',
  sourceLayer = 'ice',  // MVT layer name in your tiles
  valueProp = 'v',      // numeric field in each feature used for coloring
}) {
  const sourceId = `${id}-src`
  const fillId   = `${id}-fill`
  const lineId   = `${id}-line`
  const rastId   = `${id}-raster`
  const addedRef = useRef(false)
  const urlRef   = useRef(null)

  // Fallback: fetch legend only if none provided
  const [autoLegend, setAutoLegend] = useState(null)
  useEffect(() => {
    let alive = true
    if (legend) { setAutoLegend(null); return }
    ;(async () => {
      try {
        const j = await API.legend({ product, palette: paletteName })
        if (alive) setAutoLegend(j)
      } catch {
        if (alive) setAutoLegend(null)
      }
    })()
    return () => { alive = false }
  }, [product, paletteName, legend])

  const effLegend = legend || autoLegend

  // Build a MapLibre color expression from legend breaks/colors
  const fillColorExpr = useMemo(() => {
    const L = effLegend
    if (!L || !Array.isArray(L.colors) || L.colors.length === 0) {
      // fallback color
      return '#4cc9f0'
    }
    const colors = L.colors
    const breaks = Array.isArray(L.breaks) ? L.breaks : []
    // If we have N colors and N breaks, build a step on valueProp
    // ['step', ['to-number',['get',valueProp]], c0, b1, c1, b2, c2, ...]
    const base = ['step', ['to-number', ['get', valueProp]], colors[0]]
    for (let i = 1; i < Math.min(colors.length, breaks.length); i++) {
      base.push(breaks[i], colors[i])
    }
    return base
  }, [effLegend, valueProp])

  // Clean helper
  const removeAll = () => {
    if (!map) return
    try { if (map.getLayer(fillId)) map.removeLayer(fillId) } catch {}
    try { if (map.getLayer(lineId)) map.removeLayer(lineId) } catch {}
    try { if (map.getLayer(rastId)) map.removeLayer(rastId) } catch {}
    try { if (map.getSource(sourceId)) map.removeSource(sourceId) } catch {}
    addedRef.current = false
  }

  // Create (or recreate) the source + layers when tiles URL or mode changes
  useEffect(() => {
    if (!map || !isoTime) return

    const tiles = API.tilesTemplate({ product, isoTime, palette: paletteName })
    const isVector = /\.pbf(\?|$)/i.test(tiles)

    // Recreate if URL changed or mode changed between vector/raster
    const needRecreate = !addedRef.current || urlRef.current !== tiles
    if (!needRecreate) return

    removeAll()
    urlRef.current = tiles

    if (isVector) {
      // VECTOR source
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [tiles],
        minzoom: 0,
        maxzoom: 14,
        attribution: 'Ice (vector tiles)'
      })

      // Fill polygons / surfaces
      map.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        'source-layer': sourceLayer,
        paint: {
          'fill-color': fillColorExpr,
          'fill-opacity': [
            'min',
            opacity,
            ['interpolate', ['linear'], ['zoom'], 3, 0.95, 5, 0.8, 7, 0.6, 9, 0.45, 11, 0.28]
          ]
        }
      })

      // Outline
      map.addLayer({
        id: lineId,
        type: 'line',
        source: sourceId,
        'source-layer': sourceLayer,
        paint: {
          'line-color': '#0b1220',
          'line-opacity': 0.25,
          'line-width': 0.5
        }
      })
    } else {
      // RASTER source (PNG tiles)
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [tiles],
        tileSize: 256,
        attribution: 'Ice (raster tiles)'
      })
      map.addLayer({
        id: rastId,
        type: 'raster',
        source: sourceId,
        paint: {
          'raster-opacity': [
            'min',
            opacity,
            ['interpolate', ['linear'], ['zoom'], 3, 0.9, 5, 0.75, 7, 0.55, 9, 0.35, 11, 0.22]
          ],
          'raster-contrast': -0.05,
          'raster-saturation': -0.12,
          'raster-brightness-min': 0.98,
          'raster-resampling': 'linear',
          'raster-fade-duration': 150
        }
      })
    }

    addedRef.current = true
    return () => {}
  }, [map, product, isoTime, paletteName, fillColorExpr])

  // React to opacity slider live
  useEffect(() => {
    if (!map || !addedRef.current) return
    if (map.getLayer(rastId)) {
      map.setPaintProperty(rastId, 'raster-opacity',
        ['min', opacity, ['interpolate', ['linear'], ['zoom'], 3, 0.9, 5, 0.75, 7, 0.55, 9, 0.35, 11, 0.22]]
      )
    }
    if (map.getLayer(fillId)) {
      map.setPaintProperty(fillId, 'fill-opacity',
        ['min', opacity, ['interpolate', ['linear'], ['zoom'], 3, 0.95, 5, 0.8, 7, 0.6, 9, 0.45, 11, 0.28]]
      )
    }
  }, [map, opacity])

  // If legend changes (palette/product), update vector fill color
  useEffect(() => {
    if (!map) return
    if (map.getLayer(fillId)) {
      try { map.setPaintProperty(fillId, 'fill-color', fillColorExpr) } catch {}
    }
  }, [map, fillColorExpr])

  // Cleanup on unmount/product changes
  useEffect(() => removeAll, [map])

  return null
}
