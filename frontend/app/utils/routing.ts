export interface IDrivingRoute {
  geometry: { type: 'LineString'; coordinates: number[][] }
  // In metres and seconds.
  distance: number
  duration: number
}

// OpenRouteService accepts at most 50 waypoints per request.
const ORS_MAX_POINTS = 50

function sampleCoords(coords: number[][], max: number): number[][] {
  if (coords.length <= max) return coords
  const step = (coords.length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => coords[Math.round(i * step)]!)
}

/**
 * Driving route through [lng, lat] points. Uses OpenRouteService when a key
 * is set. Without a key it falls back to the public OSRM demo server, which
 * is fine for local work but has no service guarantee.
 */
export async function fetchDrivingRoute(
  coords: number[][],
  orsKey: string
): Promise<IDrivingRoute | null> {
  if (orsKey) {
    const res = await fetch(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        method: 'POST',
        headers: { Authorization: orsKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coordinates: sampleCoords(coords, ORS_MAX_POINTS) })
      }
    )
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    return {
      geometry: feature.geometry,
      distance: feature.properties.summary.distance,
      duration: feature.properties.summary.duration
    }
  }

  const path = coords.map((c) => `${c[0]},${c[1]}`).join(';')
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`
  )
  const data = await res.json()
  const route = data.routes?.[0]
  if (!route) return null
  return {
    geometry: route.geometry,
    distance: route.distance,
    duration: route.duration
  }
}
