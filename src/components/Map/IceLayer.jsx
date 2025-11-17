// /src/components/Map/IceLayer.jsx
import { useEffect, useRef } from 'react'

export default function IceLayer({
  map,
  product = 'ice_concentration',
  isoTime,                 // time string like "2025-02-10T00:00:00Z"
  paletteName = 'default',
  opacity = 0.9,
  legend,
}) {
  const created = useRef(false)

  useEffect(() => {
    if (!map) return

    const layerBase = `ice-${product}`
    const srcId     = `${layerBase}-demo-src`
    const fillId    = `${layerBase}-fill`
    const circleId  = `${layerBase}-circle`

    function removeIfExists(id, kind) {
      try {
        if (kind === 'layer' && map.getLayer(id)) map.removeLayer(id)
        if (kind === 'source' && map.getSource(id)) map.removeSource(id)
      } catch (e) {
        // ignore
      }
    }

    function numExpr(propFallbacks) {
      return ['to-number', ['coalesce', ...propFallbacks, 0], 0]
    }

    const valueExpr = numExpr([
      ['get', 'value'],
      ['get', 'ice'],
      ['get', 'ice_pct'],
      ['get', 'pct'],
      ['get', 'concentration'],
    ])

    function colorExprFromLegend(lg) {
      const breaks = lg?.breaks ?? [0,10,20,30,40,50,60,70,80,90,100]
      const colors = lg?.colors ?? [
        '#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6',
        '#4292c6','#2171b5','#08519c','#08306b','#041b4d','#02102e'
      ]
      const stops = []
      for (let i = 1; i < breaks.length && i < colors.length; i++) {
        stops.push(breaks[i], colors[i])
      }
      return ['step', valueExpr, colors[0], ...stops]
    }

    // --- Time-aware filters ------------------------------------
    function timeFilterFor(geomType) {
      const baseGeom =
        geomType === 'polygon'
          ? ['any',
              ['==', ['geometry-type'], 'Polygon'],
              ['==', ['geometry-type'], 'MultiPolygon'],
            ]
          : ['==', ['geometry-type'], 'Point']

      if (!isoTime) {
        // Show nothing by default if no time selected
        return ['all', baseGeom, ['==', ['get', 'time'], '__none__']]
      }

      return ['all', baseGeom, ['==', ['get', 'time'], isoTime]]
    }

    function applyTimeFilter() {
      const fillFilter = timeFilterFor('polygon')
      if (map.getLayer(fillId)) map.setFilter(fillId, fillFilter)

      const circleFilter = timeFilterFor('point')
      if (map.getLayer(circleId)) map.setFilter(circleId, circleFilter)
    }
    // -----------------------------------------------------------

    function ensureSource() {
      const fileName =
        product === 'ice_thickness' ? 'ice_thickness.latest.geojson'
      : product === 'ice_type'      ? 'ice_type.latest.geojson'
      :                               'ice_concentration.latest.geojson'

      const dataUrl = new URL(`../../sample_data/${fileName}`, import.meta.url).href

      if (!map.getSource(srcId)) {
        map.addSource(srcId, {
          type: 'geojson',
          data: dataUrl,
          promoteId: 'id',
        })
      } else {
        try {
          map.getSource(srcId).setData(dataUrl)
        } catch (e) {
          // ignore
        }
      }
    }

    function ensureLayers() {
      const commonColor = colorExprFromLegend(legend)

      // Polygons
      const fillPaint = {
        'fill-color': commonColor,
        'fill-opacity': opacity,
        'fill-outline-color': 'rgba(0,0,0,0.25)',
      }

      if (!map.getLayer(fillId)) {
        map.addLayer({
          id: fillId,
          type: 'fill',
          source: srcId,
          filter: timeFilterFor('polygon'),
          paint: fillPaint,
        })
      } else {
        map.setPaintProperty(fillId, 'fill-color', fillPaint['fill-color'])
        map.setPaintProperty(fillId, 'fill-opacity', fillPaint['fill-opacity'])
        map.setPaintProperty(fillId, 'fill-outline-color', fillPaint['fill-outline-color'])
      }

      // Optional points (if you later add them)
      const circlePaint = {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          3, 10,
          5, 16,
          7, 24,
          9, 32,
        ],
        'circle-color': commonColor,
        'circle-opacity': opacity,
        'circle-stroke-width': 1.0,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-opacity': 0.25,
      }

      if (!map.getLayer(circleId)) {
        map.addLayer({
          id: circleId,
          type: 'circle',
          source: srcId,
          filter: timeFilterFor('point'),
          paint: circlePaint,
        })
      } else {
        map.setPaintProperty(circleId, 'circle-radius', circlePaint['circle-radius'])
        map.setPaintProperty(circleId, 'circle-color', circlePaint['circle-color'])
        map.setPaintProperty(circleId, 'circle-opacity', circlePaint['circle-opacity'])
        map.setPaintProperty(circleId, 'circle-stroke-width', circlePaint['circle-stroke-width'])
        map.setPaintProperty(circleId, 'circle-stroke-color', circlePaint['circle-stroke-color'])
        map.setPaintProperty(circleId, 'circle-stroke-opacity', circlePaint['circle-stroke-opacity'])
      }
    }

    function applyPaintOnly() {
      if (!created.current) return
      const commonColor = colorExprFromLegend(legend)
      if (map.getLayer(fillId)) {
        map.setPaintProperty(fillId, 'fill-color', commonColor)
        map.setPaintProperty(fillId, 'fill-opacity', opacity)
        map.setPaintProperty(fillId, 'fill-outline-color', 'rgba(0,0,0,0.25)')
      }
      if (map.getLayer(circleId)) {
        map.setPaintProperty(circleId, 'circle-color', commonColor)
        map.setPaintProperty(circleId, 'circle-opacity', opacity)
        map.setPaintProperty(circleId, 'circle-stroke-width', 1.0)
        map.setPaintProperty(circleId, 'circle-stroke-color', '#ffffff')
        map.setPaintProperty(circleId, 'circle-stroke-opacity', 0.25)
      }
    }

    function build() {
      // start from clean slate
      removeIfExists(fillId, 'layer')
      removeIfExists(circleId, 'layer')
      removeIfExists(srcId, 'source')

      ensureSource()
      ensureLayers()
      applyTimeFilter()
      created.current = true
    }

    // --- KEY FIX: only mutate map once style is fully loaded ----
    const onLoad = () => {
      build()
      applyPaintOnly()
      applyTimeFilter()
    }

    if (map.isStyleLoaded?.()) {
      onLoad()
    } else {
      map.once('load', onLoad)
    }
    // ------------------------------------------------------------

    return () => {
      map.off('load', onLoad)
      removeIfExists(fillId, 'layer')
      removeIfExists(circleId, 'layer')
      removeIfExists(srcId, 'source')
      created.current = false
    }
  }, [map, product, isoTime, paletteName, opacity, legend])

  return null
}
