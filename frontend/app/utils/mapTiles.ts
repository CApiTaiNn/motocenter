export interface ITileSource {
  url: string
  attribution: string
}

const OSM_ATTRIBUTION = '&copy; OpenStreetMap'

/**
 * Street and satellite tiles from MapTiler when a key is set. Without a key,
 * streets fall back to OpenStreetMap, which has no satellite view, so the
 * satellite layer is null.
 */
export function baseTiles(maptilerKey: string): {
  streets: ITileSource
  satellite: ITileSource | null
} {
  if (!maptilerKey) {
    return {
      streets: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: OSM_ATTRIBUTION
      },
      satellite: null
    }
  }
  const attribution = `&copy; MapTiler ${OSM_ATTRIBUTION}`
  return {
    streets: {
      url: `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptilerKey}`,
      attribution
    },
    satellite: {
      url: `https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key=${maptilerKey}`,
      attribution
    }
  }
}
