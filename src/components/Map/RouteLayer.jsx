// /src/components/Map/RouteLayer.jsx
import { useEffect } from 'react'

export default function RouteLayer({ map, geojson, cbFriendly = false }) {
  useEffect(() => {
    if (!map || !geojson) return

    const srcId = 'route-src'
    const lineCasingId = 'route-line-casing'
    const lineId = 'route-line-fill'

    // Clean up any previous layers/sources
    if (map.getLayer(lineId)) map.removeLayer(lineId)
    if (map.getLayer(lineCasingId)) map.removeLayer(lineCasingId)
    if (map.getSource(srcId)) map.removeSource(srcId)

    map.addSource(srcId, { type: 'geojson', data: geojson })

    // Color scheme: adjusted if color-blind-friendly mode is on
    const casingColor = cbFriendly
      ? 'rgba(0, 0, 0, 0.85)'    // dark outline for contrast
      : 'rgba(255, 255, 255, 0.7)'

    const mainColor = cbFriendly
      ? '#ff9f1c'                // strong orange, CB-safe vs blue basemap
      : '#3a86ff'                // bright blue

    // Casing layer (behind the main route line)
    map.addLayer({
      id: lineCasingId,
      type: 'line',
      source: srcId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': casingColor,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          4, 3,
          8, 5,
          12, 8,
        ],
        'line-opacity': 0.9,
      },
      filter: ['==', ['geometry-type'], 'LineString'],
    })

    // Main route line (on top)
    map.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': mainColor,
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          4, 1.5,
          8, 3,
          12, 5,
        ],
      },
      filter: ['==', ['geometry-type'], 'LineString'],
    })

    // Cleanup
    return () => {
      if (map.getLayer(lineId)) map.removeLayer(lineId)
      if (map.getLayer(lineCasingId)) map.removeLayer(lineCasingId)
      if (map.getSource(srcId)) map.removeSource(srcId)
    }
  }, [map, geojson, cbFriendly])

  return null
}
