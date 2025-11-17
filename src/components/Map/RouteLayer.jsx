// /src/components/Map/RouteLayer.jsx
import { useEffect } from 'react'

const SRC_ID = 'route-src'
const LINE_CASING_ID = 'route-line-casing'
const LINE_ID = 'route-line-fill'

export default function RouteLayer({ map, geojson, cbFriendly = false }) {
  // Create source + layers once
  useEffect(() => {
    if (!map) return

    // If source already exists, do nothing here
    if (!map.getSource(SRC_ID)) {
      map.addSource(SRC_ID, {
        type: 'geojson',
        data: geojson || { type: 'FeatureCollection', features: [] },
      })
    }

    if (!map.getLayer(LINE_CASING_ID)) {
      map.addLayer({
        id: LINE_CASING_ID,
        type: 'line',
        source: SRC_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.7)', // will be updated by second effect
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 3,
            8, 5,
            12, 8,
          ],
          'line-opacity': 0.9,
        },
        filter: ['==', ['geometry-type'], 'LineString'],
      })
    }

    if (!map.getLayer(LINE_ID)) {
      map.addLayer({
        id: LINE_ID,
        type: 'line',
        source: SRC_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#3a86ff', // will be updated by second effect
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 1.5,
            8, 3,
            12, 5,
          ],
        },
        filter: ['==', ['geometry-type'], 'LineString'],
      })
    }

    // Cleanup only when component unmounts or map changes
    return () => {
      if (!map) return
      if (map.getLayer(LINE_ID)) map.removeLayer(LINE_ID)
      if (map.getLayer(LINE_CASING_ID)) map.removeLayer(LINE_CASING_ID)
      if (map.getSource(SRC_ID)) map.removeSource(SRC_ID)
    }
  }, [map])

  // Update geometry when geojson changes
  useEffect(() => {
    if (!map || !geojson) return
    const src = map.getSource(SRC_ID)
    if (src && src.setData) {
      src.setData(geojson)
    }
  }, [map, geojson])

  // Update colors when cbFriendly changes
  useEffect(() => {
    if (!map) return

    const casingColor = cbFriendly
      ? 'rgba(0, 0, 0, 0.85)' // dark outline for contrast
      : 'rgba(255, 255, 255, 0.7)'

    const mainColor = cbFriendly
      ? '#ff9f1c' // strong orange, CB-safe vs blue basemap
      : '#3a86ff'

    if (map.getLayer(LINE_CASING_ID)) {
      map.setPaintProperty(LINE_CASING_ID, 'line-color', casingColor)
    }
    if (map.getLayer(LINE_ID)) {
      map.setPaintProperty(LINE_ID, 'line-color', mainColor)
    }
  }, [map, cbFriendly])

  return null
}
