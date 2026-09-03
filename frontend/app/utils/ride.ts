import type { IRide } from '~/types/ride.js'
import { scrollToMap } from '~/utils/global'
import { simplify } from '@turf/simplify'

export const getUniqueValues = (rides: IRide[], key: keyof IRide): string[] => {
  const values = rides.map((r) => r[key]?.toString()).filter(Boolean) // On enlève les valeurs nulles ou undefined au cas où

  return [...new Set(values)].sort() // Pas de doubon + ordre alphabétique
}

export const getMax = (rides: IRide[], key: keyof IRide) => {
  const values = rides
    .map((r) => parseFloat(r[key]?.toString() || '0'))
    .filter((v) => !isNaN(v))
  return values.length > 0 ? Math.max(...values) : 0
}

export const getMapPinSvg = (color: string) => {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M20 10C20 14.993 14.461 20.193 12.601 21.799C12.4277 21.9293 12.2168 21.9998 12 21.9998C11.7832 21.9998 11.5723 21.9293 11.399 21.799C9.539 20.193 4 14.993 4 10C4 7.87827 4.84285 5.84344 6.34315 4.34315C7.84344 2.84285 9.87827 2 12 2C14.1217 2 16.1566 2.84285 17.6569 4.34315C19.1571 5.84344 20 7.87827 20 10Z" fill="${color}" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12 14.1226C14.2091 14.1226 16 12.3317 16 10.1226C16 7.91342 14.2091 6.12256 12 6.12256C9.79086 6.12256 8 7.91342 8 10.1226C8 12.3317 9.79086 14.1226 12 14.1226Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

// Échelle de couleur des balades, des plus courtes aux plus longues :
// vert → bleu → jaune → rouge.
export const RIDE_LENGTH_COLOR_SCALE = [
  '#15803d', // vert profond  – plus courtes
  '#1d4ed8', // bleu profond
  '#ca8a04', // or / jaune foncé
  '#b91c1c' // rouge profond – plus longues
] as const

export const RIDE_FALLBACK_COLOR = RIDE_LENGTH_COLOR_SCALE[0]

// Assigne une couleur à chaque balade selon sa longueur RELATIVE à l'ensemble
// affiché : on trie par distance puis on répartit les balades en bandes égales
// le long de l'échelle (vert → rouge). La couleur d'une balade dépend donc de
// son rang parmi celles affichées, pas d'un seuil absolu en km.
export const buildRideColorMap = (rides: IRide[]): Record<string, string> => {
  const sorted = [...rides].sort((a, b) => a.distance - b.distance)
  const n = sorted.length
  const bands = RIDE_LENGTH_COLOR_SCALE.length
  const map: Record<string, string> = {}

  sorted.forEach((ride, i) => {
    const band = n <= 1 ? 0 : Math.min(bands - 1, Math.floor((i / n) * bands))
    map[ride._id] = RIDE_LENGTH_COLOR_SCALE[band] as string
  })

  return map
}

export const getWeightByZoom = (zoom: number) => {
  if (zoom < 8) return 3
  if (zoom < 10) return 5
  if (zoom < 13) return 7
  return 9
}

export function useFullScreenMap(mapInstance: Ref<any>) {
  const isFullScreen = ref(false)

  const toggleFullScreen = () => {
    isFullScreen.value = !isFullScreen.value

    // On attend la fin de la transition CSS (0.3s dans votre style)
    setTimeout(() => {
      if (mapInstance.value) {
        // Indispensable pour que Leaflet recalcule sa taille
        mapInstance.value.invalidateSize()
      }

      if (!isFullScreen.value) scrollToMap('map')
    }, 350)
  }

  // Gestion de la touche Echap
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isFullScreen.value) {
      toggleFullScreen()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  watch(isFullScreen, (newValue) => {
    if (newValue) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
  })

  return {
    isFullScreen,
    toggleFullScreen
  }
}

export function convertToFrench(LDraw: any) {
  LDraw.drawLocal = {
    draw: {
      toolbar: {
        actions: { title: 'Annuler le tracé', text: 'Annuler' },
        finish: { title: 'Terminer le tracé', text: 'Terminer' },
        undo: {
          title: 'Supprimer le dernier point',
          text: 'Effacer dernier point'
        },
        buttons: {
          polyline: 'Tracer une balade',
          polygon: 'Tracer un polygone',
          rectangle: 'Tracer un rectangle',
          circle: 'Tracer un cercle',
          marker: 'Placer un marqueur',
          circlemarker: 'Placer un marqueur circulaire'
        }
      },
      handlers: {
        circle: {
          tooltip: { start: 'Cliquez et glissez pour dessiner le cercle.' },
          radius: 'Rayon'
        },
        circlemarker: {
          tooltip: { start: 'Cliquez sur la carte pour placer le marqueur.' }
        },
        marker: {
          tooltip: { start: 'Cliquez sur la carte pour placer le marqueur.' }
        },
        polygon: {
          tooltip: {
            start: 'Cliquez pour commencer la forme.',
            cont: 'Cliquez pour continuer la forme.',
            end: 'Cliquez sur le premier point pour fermer la forme.'
          }
        },
        polyline: {
          error: 'Erreur : les lignes ne peuvent pas se croiser !',
          tooltip: {
            start: 'Cliquez pour commencer le tracé.',
            cont: 'Cliquez pour continuer le tracé.',
            end: 'Cliquez sur le dernier point pour terminer.'
          }
        },
        rectangle: {
          tooltip: { start: 'Cliquez et glissez pour dessiner le rectangle.' }
        },
        simpleshape: {
          tooltip: { end: 'Relâchez la souris pour finir le dessin.' }
        }
      }
    },
    edit: {
      toolbar: {
        actions: {
          save: { title: 'Sauvegarder les modifications', text: 'Enregistrer' },
          cancel: { title: "Annuler l'édition", text: 'Annuler' },
          clearAll: { title: 'Tout supprimer', text: 'Tout effacer' }
        },
        buttons: {
          edit: 'Modifier le tracé',
          editDisabled: 'Rien à modifier',
          remove: 'Supprimer le tracé',
          removeDisabled: 'Rien à supprimer'
        }
      },
      handlers: {
        edit: {
          tooltip: {
            text: '',
            subtext: ''
          }
        },
        remove: {
          tooltip: { text: '' }
        }
      }
    }
  }
}

/**
 * Réduit le nombre de points d'une GeoJSON FeatureCollection
 * @param geojson La donnée brute
 * @param tolerance Précision (plus c'est haut, plus on supprime de points).
 * 0.001 est un bon compromis pour une balade.
 */
export const simplifyGeometry = (geojson: any, tolerance = 0.001) => {
  if (!geojson || geojson.type !== 'FeatureCollection') return geojson

  try {
    const simplified = simplify(geojson, {
      tolerance: tolerance,
      highQuality: false,
      mutate: false
    })
    return simplified
  } catch (e) {
    console.error('Erreur simplification:', e)
    return geojson
  }
}

// Fonction pour transformer une ville (nom) en coordonnées [long, lat]
export const getCoordsFromCity = async (
  cityName: string
): Promise<number[] | null> => {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cityName)}&limit=1`
    )
    const data = await res.json()
    if (data.features && data.features.length > 0) {
      return data.features[0].geometry.coordinates
    }
  } catch (e) {
    console.error('Erreur de géocodage:', e)
  }
  return null
}

export const getEstimatedDuration = async (
  geom: any
): Promise<number | undefined> => {
  try {
    const feature = geom.features[0]
    const coords = feature.geometry.coordinates

    // OSRM demande les coordonnées sous forme long,lat;long,lat...
    const polyline = coords.map((c: any) => `${c[0]},${c[1]}`).join(';')

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${polyline}?overview=false`
    )
    const data = await res.json()

    if (data.routes && data.routes.length > 0) {
      // La durée est en secondes, on la convertit en heures
      const durationSeconds = data.routes[0].duration
      const durationHours = durationSeconds / 3600
      return parseFloat(durationHours.toFixed(2))
    }
  } catch (e) {
    console.error('Erreur calcul durée OSRM:', e)
  }
  return undefined
}
