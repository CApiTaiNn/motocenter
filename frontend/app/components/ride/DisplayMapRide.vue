<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import type {
  IFilterObject,
  IGeoJSON,
  IRide,
  MapItem,
  RideResponse
} from '~/types/ride'
import PanelRides from './PanelRides.vue'
import FormFilters from './FormFilters.vue'
import { getWeightByZoom, getMapPinSvg } from '~/utils/ride'
import { CalendarDate, Time } from '@internationalized/date'
import { useAuth } from '~/composables/useAuth.js'
import { useConnexionModal } from '~/composables/useConnexionModal.js'

interface IProps {
  displayFilters?: boolean
  displayEnlargeButton?: boolean
  displayAddRideButton?: boolean
  displayRideList?: boolean
  displayMapLoader?: boolean
  displayRide?: boolean
  displayEditorContainer?: boolean
  disableEditing?: boolean
  disableCreating?: boolean
  disableDeleting?: boolean
}

const props = withDefaults(defineProps<IProps>(), {
  displayFilters: false,
  displayEnlargeButton: false,
  displayAddRideButton: false,
  displayRideList: false,
  displayMapLoader: true,
  displayRide: false,
  displayEditorContainer: false,
  disableEditing: false,
  disableCreating: false,
  disableDeleting: false
})

// INSTANCES LEAFLET
const map = ref<any>(null) // Instance principale de la carte Leaflet
const currentTileLayer = ref<any>(null) // Couche de tuiles active (fond de plan OSM, google, etc.)
const ridesLayerGroup = ref<any>(null) // Groupe de couches contenant les tracés et marqueurs des balades
const L_instance = ref<any>(null) // Bibliothèque Leaflet importée dynamiquement côté client uniquement
const LDraw_instance = ref<any>(null) // Leaflet avec les outils de dessin (Leaflet-Draw)
const drawnItems = ref<any>(null) // Couche stockant les tracés dessinés manuellement par l'utilisateur lors de l'ajout
let drawControl: any = null // Contrôle Leaflet-Draw gérant les boutons de création/édition/suppression

const route = useRoute() // Récupérer les paramètres get passé (notamment pour le scroll automatique)
const router = useRouter() // Changer l'URL pour enlever le paramètre GET quand le scroll est fini

const { user } = useAuth()
const { open: openConnexionModal } = useConnexionModal()

// Redirige vers le formulaire d'ajout de balade (ouvre la connexion si non connecté)
const goToAddRide = async () => {
  if (!user.value?._id) {
    openConnexionModal()
    return
  }

  await navigateTo({
    path: '/ride/addRide',
    query: { scroll: 'true' }
  })
}

// GeoJSON du tracé dessiné, partagé avec le composant parent
const geom = defineModel('geom', {
  type: Object as () => IGeoJSON | null,
  default: null
})

// État de la carte en chargement, partagé avec le parent pour qu'il puisse mettre la carte en chargement
const isMapLoading = defineModel('isMapLoading', {
  type: Boolean,
  default: false
})

// État courant de la carte
const { isFullScreen, toggleFullScreen } = useFullScreenMap(map)
const drawInstruction = ref<string | null>(null) // Message affiché en bas de la carte pendant des actions de dessin/modification/suppression
const selectedId = ref<string>('default') // Identifiant du fond de plan sélectionné

let activeTraceLayer: any = null

// Marker + cluster refs kept so an external caller (e.g. the homepage teaser
// linking to /ride?ride=<id>) can focus a specific ride after load.
let markersById: Record<string, any> = {}
let markersClusterRef: any = null

// Liste des fonds de carte disponibles avec leur URL
const mapItems = ref<MapItem[]>([
  {
    label: 'Par défaut',
    id: 'default',
    icon: 'i-lucide-map',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr',
    attribution: '&copy; Google'
  },
  {
    label: 'OSM',
    id: 'osm',
    icon: 'i-lucide-earth',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OSM'
  },
  {
    label: 'Satellite',
    id: 'satellite',
    icon: 'i-lucide-satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=fr',
    attribution: '&copy; Google'
  },
  {
    label: 'Sombre',
    id: 'dark',
    icon: 'i-lucide-moon',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  },
  {
    label: 'Clair',
    id: 'clair',
    icon: 'i-lucide-sun',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB'
  }
])

// GESTION DES FILTRES ET LEUR ÉTAT
const STORAGE_KEY_FILTER = 'rides-filters'
provide('STORAGE_KEY_FILTER', STORAGE_KEY_FILTER)

const defaultFilters: IFilterObject = {
  distance: [0, 9999],
  duration: [0, 99],
  title: '',
  type: [],
  startTown: [],
  endTown: [],
  date: null,
  time: null
}

const activeFilters = ref<IFilterObject>(defaultFilters) // État de tous les fitres courants
const showFilters = ref<boolean>(false) // État d'affichage du panel de filtre
const searchValue = ref<string>('') // Input de recherche global en haut de la carte
const filterTime = ref<boolean>(false)
const filterDistance = ref<boolean>(false)
const filterLike = ref<boolean>(false) // Bouton les coups de coeur
const filterRecent = ref<boolean>(false) // Bouton les plus récnetes
const filterEvent = ref<boolean>(false) // Bouton pour filtrer sur les événements

const distanceMax = ref<number>(1) // Borner le slider de distance à la balade la plus longue+1
const durationMax = ref<number>(1) // Borner le slider de duration à la balade la plus longue+1
const listRideTypes = ref<string[]>([]) // Liste de tous les types de balades qui existe (des balades en BDD)
const listStartTown = ref<string[]>([]) // Liste de toutes les villes de départ de balades qui existe (des balades en BDD)
const listEndTown = ref<string[]>([]) // Liste de toutes les villes d'arrivée de balades qui existe (des balades en BDD)

// ÉTAT DES BALADES AFFICHÉS
const dataRides = ref<IRide[]>([]) // Toutes les balades récupérées depuis le back
const visibleRides = ref<IRide[]>([]) // Balades dont le point de départ est visible dans la vue courante de la carte

// Calcule les balades correspondant à tous les filtres actifs (recherche, sliders, boutons rapides)
const filteredRides = computed<IRide[]>(() => {
  let rides = dataRides.value.filter((ride: IRide) => {
    // Titre dans le panel ou en dehors
    const searchString = (
      searchValue.value ||
      activeFilters.value.title ||
      ''
    ).toLowerCase()
    const matchesSearch = ride.title.toLowerCase().includes(searchString)

    const matchesStartTown =
      !activeFilters.value.startTown?.length ||
      activeFilters.value.startTown.includes(ride.start_town)

    const matchesEndTown =
      !activeFilters.value.endTown?.length ||
      activeFilters.value.endTown.includes(ride.end_town)

    const matchesType =
      !activeFilters.value.type?.length ||
      activeFilters.value.type.includes(ride.ride_type)

    const matchesSliderDistance =
      ride.distance >= (activeFilters.value.distance?.[0] ?? 0) &&
      ride.distance <= (activeFilters.value.distance?.[1] ?? 9999)

    const matchesSliderDuration =
      ride.duration >= (activeFilters.value.duration?.[0] ?? 0) &&
      ride.duration <= (activeFilters.value.duration?.[1] ?? 99)

    // Les boutons rapides en haut de la carte
    const matchesQuickTime = !filterTime.value || ride.duration <= 1.5
    const matchesQuickDistance = !filterDistance.value || ride.distance <= 50
    const matchesIsEvent = !filterEvent.value || ride.is_event

    let matchesRecent = true
    if (filterRecent.value) {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7) // Dans les 7 jours avant
      matchesRecent = new Date(ride.createdAt) >= sevenDaysAgo
    }

    // --- FILTRE DATE ---
    let matchesDate = true
    if (activeFilters.value.date) {
      if (ride.date_event) {
        const rideDate = new Date(ride.date_event)
        matchesDate =
          rideDate.getFullYear() === activeFilters.value.date.year &&
          rideDate.getMonth() + 1 === activeFilters.value.date.month &&
          rideDate.getDate() === activeFilters.value.date.day
      } else {
        matchesDate = false
      }
    }

    // --- FILTRE HEURE ---
    let matchesTime = true
    if (activeFilters.value.time) {
      if (ride.hour_event) {
        const [h, m] = ride.hour_event.split(':')
        const rideHour = h ? parseInt(h, 10) : 0
        const rideMinute = m ? parseInt(m, 10) : 0

        if (isNaN(rideHour) || isNaN(rideMinute)) {
          matchesTime = false
        } else {
          const rideTotalMinutes = rideHour * 60 + rideMinute
          const filterTotalMinutes =
            activeFilters.value.time.hour * 60 + activeFilters.value.time.minute
          matchesTime = rideTotalMinutes === filterTotalMinutes
        }
      } else {
        matchesTime = false
      }
    }

    return (
      matchesSearch &&
      matchesSliderDistance &&
      matchesSliderDuration &&
      matchesQuickTime &&
      matchesQuickDistance &&
      matchesStartTown &&
      matchesEndTown &&
      matchesType &&
      matchesRecent &&
      matchesIsEvent &&
      matchesDate &&
      matchesTime
    )
  })

  // Le filtre "coups de cœur" trie par likes et ne garde que les 5 premiers résultats
  if (filterLike.value) {
    rides = [...rides].sort((a, b) => (b.like || 0) - (a.like || 0)).slice(0, 5)
  }

  return rides
})

// FONCTIONS SUR LA CARTE
/**
 * Met à jour le fond de carte (tiles) de l'instance Leaflet
 * @param id - L'identifiant du style de carte sélectionné (ex: 'osm', 'satellite')
 * @param L  - L'instance de la bibliothèque Leaflet
 */
const updateMapBackground = (id: string, L: any) => {
  // Rechercher la config du fond ce carte demandé
  const style = mapItems.value.find((m: MapItem) => m.id === id)

  // Au cas où, si la carte et le fond de carte n'est pas trouvé, on arrête
  if (!map.value || !style) return

  // Si il y a déjà un fond de carte on le retire d'abord
  if (currentTileLayer.value) {
    map.value.removeLayer(currentTileLayer.value)
  }

  // Créer et ajouter le fond de plan
  currentTileLayer.value = L.tileLayer(style.url, {
    attribution: style.attribution, // Crédits obligatoires (ex: © OpenStreetMap)
    maxZoom: 20
  }).addTo(map.value)
}

/**
 * Filtre les balades pour ne garder que celles dont le départ est visible à l'écran.
 */
const updateVisibleRides = () => {
  // Si pas de carte ou qu'il n'y a pas de ride trouvé pendant les filtres, alors on vide
  if (!map.value || !filteredRides.value.length) {
    visibleRides.value = []
    return
  }

  // On récupère les limites de la carte
  const bounds = map.value.getBounds()

  // On filtre la liste déjà filtrée pour y ajouter la contrainte des bounds
  visibleRides.value = filteredRides.value.filter((ride) => {
    const startPoint = ride.geom.features[0].geometry.coordinates[0]

    return bounds.contains(
      L_instance.value.latLng(startPoint[1], startPoint[0])
    )
  })
}

/**
 * Gère l'affichage complet des balades sur la carte.
 * Cette fonction nettoie les anciens tracés et reconstruit les clusters et les markers
 * en fonction des filtres appliqués (Type, Distance, etc.).
 */
const renderRides = (isZooming = false) => {
  const L = L_instance.value
  const LDraw = LDraw_instance.value
  if (!map.value || !L || !LDraw) return

  // Nettoyage du tracé actif avant de reconstruire les couches
  if (activeTraceLayer && !isZooming) {
    map.value.removeLayer(activeTraceLayer)
    activeTraceLayer = null
  }
  // On retire le groupe de couches précédent de la carte pour repartir de zéro
  if (ridesLayerGroup.value) map.value.removeLayer(ridesLayerGroup.value)

  // Initialisation d'un nouveau groupe de couches
  ridesLayerGroup.value = L.layerGroup()

  // Si aucune balade ne correspond aux filtres, on s'arrête
  if (filteredRides.value.length === 0) return

  const bounds = L.latLngBounds([]) // Calcul la vue qu'il faut pour affiché toutes les balades
  const currentZoom = map.value.getZoom()

  // Création des couches de cluster
  const markersCluster = LDraw.markerClusterGroup({
    animateAddingMarkers: false,
    zoomToBoundsOnClick: true
  })
  markersClusterRef = markersCluster
  markersById = {}

  filteredRides.value.forEach((ride: IRide) => {
    const dynamicIcon = L.divIcon({
      html: getMapPinSvg(ride.color || '#3b82f6'),
      iconSize: [26, 26],
      iconAnchor: [13, 10],
      className: 'custom-dynamic-pin'
    })

    const start = ride.geom.features[0].geometry.coordinates[0]

    const hour = Math.floor(ride.duration)
    const minutes = Math.round((ride.duration - hour) * 60)

    // Build the popup via DOM nodes (textContent), never an HTML string, so a
    // crafted ride title can't inject markup/script — Leaflet renders popup
    // strings as raw HTML.
    const popupEl = document.createElement('div')
    popupEl.className = 'ride-detail-container'
    // Titre non gras : plus léger au-dessus du tracé qu'il recouvre.
    const titleEl = document.createElement('span')
    titleEl.textContent = ride.title
    popupEl.appendChild(titleEl)
    popupEl.appendChild(document.createElement('br'))
    popupEl.append(`${ride.distance}km - ${hour}h ${minutes}min`)

    // Création du marker du point de départ
    const marker = L.marker([start[1], start[0]], { icon: dynamicIcon })
      .bindPopup(popupEl)
      .on('popupopen', () => {
        if (activeTraceLayer) {
          map.value.removeLayer(activeTraceLayer)
        }

        activeTraceLayer = L.geoJSON(ride.geom as any, {
          style: {
            color: ride.color || '#3B82F6',
            weight: getWeightByZoom(currentZoom),
            opacity: 1
          }
        }).addTo(map.value)
      })

    markersCluster.addLayer(marker)
    markersById[ride._id] = marker
    bounds.extend([start[1], start[0]])
  })

  // On ajoute la couche de cluster et on l'ajoute à la carte
  ridesLayerGroup.value.addLayer(markersCluster)
  ridesLayerGroup.value.addTo(map.value)
}

/**
 * Centre la carte sur une balade et ouvre sa popup (déclenchant l'affichage du
 * tracé). Utilisé quand on arrive sur /ride?ride=<id> depuis une autre page.
 */
const focusRide = (rideId: string) => {
  const marker = markersById[rideId]
  if (!marker || !markersClusterRef) return

  // zoomToShowLayer dézoome/recentre pour sortir le marker de son cluster, puis
  // on ouvre la popup une fois qu'il est visible.
  markersClusterRef.zoomToShowLayer(marker, () => marker.openPopup())
}

const onApplyFilters = (payload: IFilterObject) => {
  activeFilters.value = payload
}

// Affichage ou non du panel de filtre
const handleFilters = () => {
  showFilters.value = !showFilters.value
  searchValue.value = ''
}

// PENDANT CREATION DU COMPOSANT
onMounted(async () => {
  // On scrolle à la map si le paramètre GET est là
  if (route.query.scroll === 'true') {
    setTimeout(() => {
      scrollToMap('map')
      router.replace({ query: {} })
    }, 400)
  }

  isMapLoading.value = true

  // Leaflet et ses plugins sont importés dynamiquement pour éviter les erreurs SSR (pas de window côté serveur)
  const L = await import('leaflet')
  await import('leaflet.markercluster')
  await import('leaflet-draw')
  L_instance.value = L

  // Paramétrage de la map
  map.value = L.map('map', {
    zoomControl: false,
    preferCanvas: false,
    doubleClickZoom: false,
    zoomAnimation: true,
    markerZoomAnimation: true
  }).setView([48.26, -3], 9)
  L.control.zoom({ position: 'bottomleft' }).addTo(map.value)
  L.control.scale({ imperial: false }).addTo(map.value)

  map.value.on('click', () => {
    if (activeTraceLayer) {
      map.value.removeLayer(activeTraceLayer)
      activeTraceLayer = null
    }
  })

  // Leaflet-Draw s'attache à window.L après son import, on récupère cette instance
  const LDraw = (window as any).L
  LDraw_instance.value = LDraw
  convertToFrench(LDraw) // Mettre en français leaflet draw

  // Création de la couche pour dessiner le tracé
  drawnItems.value = new LDraw.FeatureGroup()
  map.value.addLayer(drawnItems.value)

  // Les contrôles pour dessiner, modifier et supprimer une ligne
  if (props.displayEditorContainer && LDraw.Control?.Draw) {
    drawControl = new LDraw.Control.Draw({
      edit: {
        featureGroup: drawnItems.value,
        poly: { allowIntersection: false }
      },
      draw: {
        polyline: {
          shapeOptions: { color: '#3B82F6', weight: 4 },
          finishOn: 'dblclick',
          repeatMode: true
        },
        polygon: false,
        circle: false,
        marker: false,
        circlemarker: false,
        rectangle: false
      }
    })
    map.value.addControl(drawControl)

    // Désactive visuellement le bouton d'édition en fonction de la prop disableEditing
    watch(
      () => props.disableEditing,
      (disabled) => {
        setTimeout(() => {
          const editBtn =
            drawControl._toolbars.edit._toolbarContainer.querySelector(
              '.leaflet-draw-edit-edit'
            )
          if (!editBtn) return
          if (disabled) {
            editBtn.classList.add('leaflet-disabled')
            editBtn.style.pointerEvents = 'none'
            editBtn.style.opacity = '0.4'
            editBtn.style.cursor = 'not-allowed'
          } else {
            editBtn.classList.remove('leaflet-disabled')
            editBtn.style.pointerEvents = ''
            editBtn.style.opacity = ''
            editBtn.style.cursor = ''
          }
        }, 100)
      }
    )

    // Désactive visuellement le bouton de création en fonction de la prop disableCreating
    watch(
      () => props.disableCreating,
      (disabled) => {
        setTimeout(() => {
          const polylineBtn =
            drawControl._toolbars.draw._toolbarContainer.querySelector(
              '.leaflet-draw-draw-polyline'
            )
          if (!polylineBtn) return
          if (disabled) {
            polylineBtn.classList.add('leaflet-disabled')
            polylineBtn.style.pointerEvents = 'none'
            polylineBtn.style.opacity = '0.4'
            polylineBtn.style.cursor = 'not-allowed'
          } else {
            if (drawnItems.value.getLayers().length === 0) {
              polylineBtn.classList.remove('leaflet-disabled')
              polylineBtn.style.pointerEvents = ''
              polylineBtn.style.opacity = ''
              polylineBtn.style.cursor = ''
            }
          }
        }, 100)
      }
    )

    // Désactive visuellement le bouton de suppression
    watch(
      () => props.disableDeleting,
      (disabled) => {
        setTimeout(() => {
          const removeBtn =
            drawControl._toolbars.edit._toolbarContainer.querySelector(
              '.leaflet-draw-edit-remove'
            )
          if (!removeBtn) return

          if (disabled) {
            removeBtn.classList.add('leaflet-disabled')
            removeBtn.style.pointerEvents = 'none'
            removeBtn.style.opacity = '0.4'
            removeBtn.style.cursor = 'not-allowed'
          } else {
            removeBtn.classList.remove('leaflet-disabled')
            removeBtn.style.pointerEvents = ''
            removeBtn.style.opacity = ''
            removeBtn.style.cursor = ''
          }
        }, 100)
      }
    )

    // On supprime les tooltip de leaflet draw car on créer les notres en bas de la carte
    const drawContainer = document.querySelector('.leaflet-draw')
    if (drawContainer) {
      drawContainer
        .querySelectorAll('a')
        .forEach((el) => el.removeAttribute('title'))
      const observer = new MutationObserver(() => {
        drawContainer
          .querySelectorAll('a[title]')
          .forEach((el) => el.removeAttribute('title'))
      })
      observer.observe(drawContainer, {
        attributes: true,
        subtree: true,
        attributeFilter: ['title']
      })
    }

    // Empêche d'avoir deux modes actifs simultanément (dessin + édition) + Affiche le bon tooltip en fonction du mode sélectionné
    map.value.on(LDraw.Draw.Event.DRAWSTART, () => {
      if (drawControl._toolbars.edit._activeMode)
        drawControl._toolbars.edit._activeMode.handler.disable()
      drawInstruction.value = 'Cliquez sur la carte pour commencer votre tracé'
      document
        .querySelectorAll('.leaflet-draw-toolbar a')
        .forEach((el) => el.removeAttribute('title'))
    })
    map.value.on(LDraw.Draw.Event.DRAWSTOP, () => {
      drawInstruction.value = null
    })

    map.value.on(LDraw.Draw.Event.EDITSTART, () => {
      if (drawControl._toolbars.draw._activeMode)
        drawControl._toolbars.draw._activeMode.handler.disable()
      drawInstruction.value = 'Déplacez les points pour modifier le tracé'
      document
        .querySelectorAll('.leaflet-draw-toolbar a')
        .forEach((el) => el.removeAttribute('title'))
    })
    map.value.on(LDraw.Draw.Event.EDITSTOP, () => {
      drawInstruction.value = null
    })

    map.value.on(LDraw.Draw.Event.DELETESTART, () => {
      drawInstruction.value = 'Cliquez sur un tracé pour le supprimer'
      document
        .querySelectorAll('.leaflet-draw-toolbar a')
        .forEach((el) => el.removeAttribute('title'))
    })
    map.value.on(LDraw.Draw.Event.DELETESTOP, () => {
      drawInstruction.value = null
    })

    // Quand la ligne dessiner par l'utilisateur est terminé
    map.value.on(LDraw.Draw.Event.CREATED, (e: any) => {
      drawnItems.value.addLayer(e.layer)
      updateGeomModel(drawnItems.value)

      // On désactive le bouton de création après le premier tracé pour éviter d'en avoir plusieurs simultanément
      const polylineBtn =
        drawControl._toolbars.draw._toolbarContainer.querySelector(
          '.leaflet-draw-draw-polyline'
        )

      if (polylineBtn) {
        polylineBtn.classList.add('leaflet-disabled')
        polylineBtn.style.pointerEvents = 'none'
        polylineBtn.style.opacity = '0.4'
        polylineBtn.style.cursor = 'not-allowed'
      }
    })

    // Quand la modification est validé
    map.value.on(LDraw.Draw.Event.EDITED, () => {
      updateGeomModel(drawnItems.value)

      if (drawControl._toolbars.edit._activeMode) {
        drawControl._toolbars.edit._activeMode.handler.disable()
      }
    })

    // Quand la suppression est validé
    map.value.on(LDraw.Draw.Event.DELETED, () => {
      updateGeomModel(drawnItems.value)

      // On réactive le bouton de création seulement si tous les tracés ont été supprimés
      if (drawnItems.value.getLayers().length === 0) {
        const polylineBtn =
          drawControl._toolbars.draw._toolbarContainer.querySelector(
            '.leaflet-draw-draw-polyline'
          )
        if (polylineBtn) {
          polylineBtn.classList.remove('leaflet-disabled')
          polylineBtn.style.pointerEvents = ''
          polylineBtn.style.opacity = ''
          polylineBtn.style.cursor = ''
        }
      }
    })
  }

  // Met les couches dessinées en GeoJSON et met à jour le v-model geom (null si vide)
  const updateGeomModel = (group: any) => {
    const data = group.toGeoJSON()
    geom.value = !data.features || data.features.length === 0 ? null : data
  }

  // Appliqué le fond de carte voulu
  updateMapBackground(selectedId.value, L)

  // Affichage des balades
  if (props.displayRide) {
    const runtimeConfig = useRuntimeConfig()
    try {
      const res = await fetch(
        `${runtimeConfig.public.apiBase}rides?project=all&deep=true`
      )
      const data: RideResponse = await res.json()

      if (data.rides && data.rides.length > 0) {
        dataRides.value = data.rides
        distanceMax.value = getMax(data.rides, 'distance')
        durationMax.value = getMax(data.rides, 'duration')
        listRideTypes.value = getUniqueValues(data.rides, 'ride_type')
        listStartTown.value = getUniqueValues(data.rides, 'start_town')
        listEndTown.value = getUniqueValues(data.rides, 'end_town')
        renderRides()

        // Focus a specific ride when linked from elsewhere (e.g. homepage
        // teaser → /ride?ride=<id>).
        const rideIdParam = route.query.ride
        if (typeof rideIdParam === 'string') {
          setTimeout(() => focusRide(rideIdParam), 300)
        }
      }
    } catch (e) {
      console.error('Erreur fetch:', e)
    } finally {
      isMapLoading.value = false
    }

    // Adapte l'épaisseur des tracés au niveau de zoom et met à jour la liste des balades visibles
    map.value.on('zoomend', () => {
      const currentZoom = map.value.getZoom()
      const newWeight = getWeightByZoom(currentZoom)

      if (ridesLayerGroup.value) {
        ridesLayerGroup.value.eachLayer((layer: any) => {
          if (layer.setStyle) layer.setStyle({ weight: newWeight })
        })
      }

      if (activeTraceLayer) {
        activeTraceLayer.setStyle({ weight: newWeight })
        activeTraceLayer.bringToFront()
      }

      updateVisibleRides()
    })
    map.value.on('moveend', updateVisibleRides)
  }

  // Gestion de l'affichage et l'état des filtres
  if (props.displayFilters) {
    const saved = localStorage.getItem(STORAGE_KEY_FILTER)
    if (saved) {
      const parsed = JSON.parse(saved)

      if (parsed.date) {
        parsed.date = new CalendarDate(
          parsed.date.year,
          parsed.date.month,
          parsed.date.day
        )
      }
      if (parsed.time) {
        parsed.time = new Time(parsed.time.hour, parsed.time.minute)
      }

      activeFilters.value = parsed
    }

    // Persiste les filtres dans le localStorage
    watch(
      () => activeFilters.value as IFilterObject,
      (newVal: IFilterObject) => {
        const filtersToSave = {
          ...newVal,
          date: newVal.date
            ? {
                year: newVal.date.year,
                month: newVal.date.month,
                day: newVal.date.day
              }
            : null,
          time: newVal.time
            ? {
                hour: newVal.time.hour,
                minute: newVal.time.minute
              }
            : null
        }
        localStorage.setItem(STORAGE_KEY_FILTER, JSON.stringify(filtersToSave))
      },
      { deep: true }
    )
  }

  isMapLoading.value = false
})

// Dès que le fond de plan est changé
watch(selectedId, (newId: string) =>
  updateMapBackground(newId, L_instance.value)
)

// Quand les filtres changent
watch(filteredRides, () => {
  renderRides(true)
  updateVisibleRides()

  if (activeTraceLayer && map.value) {
    activeTraceLayer.bringToFront()
  }
})

// Quand le v-model geom change depuis l'extérieur (ex: calcul GPS), on redessine le tracé sur la carte
watch(
  () => geom.value,
  (newGeom) => {
    if (!map.value || !L_instance.value || !newGeom) return

    isMapLoading.value = true
    drawnItems.value.clearLayers()

    // Créer la ligne
    const geojsonLayer = L_instance.value.geoJSON(newGeom)
    geojsonLayer.eachLayer((layer: any) => {
      if (layer instanceof L_instance.value.Polyline)
        drawnItems.value.addLayer(layer)
    })

    // Zoomer sur le tracé
    const bounds = geojsonLayer.getBounds()
    if (bounds.isValid()) map.value.fitBounds(bounds, { padding: [30, 30] })

    isMapLoading.value = false
  },
  { immediate: true } // Permet le lancement dès le début sans changement
)
</script>

<template>
  <div
    class="map-container relative! mb-6 h-[80dvh] w-full overflow-hidden bg-[#f8f9fa]"
    :class="{ 'is-fullscreen': isFullScreen }"
    tabindex="0"
    @keydown.esc="toggleFullScreen"
  >
    <Transition name="slide-fade">
      <div
        v-if="drawInstruction"
        class="absolute bottom-[15px] left-1/2 z-2000 flex w-auto -translate-x-1/2 items-center rounded-full border border-solid border-(--ui-primary) bg-(--background) px-6 py-3 text-sm font-medium text-(--text-color) shadow-(--shadow-xl) backdrop-blur-sm"
      >
        <UIcon name="i-lucide-info" class="mr-2 size-5" />
        {{ drawInstruction }}
      </div>
    </Transition>

    <div id="map"></div>
    <div
      v-if="isMapLoading && props.displayMapLoader"
      class="absolute top-0 left-0 z-2000 flex size-full items-center justify-center bg-(--overlay-loading-background) backdrop-blur-xs"
    >
      <div class="flex flex-col items-center gap-3">
        <UIcon name="i-lucide-loader-2" class="loader-icon size-10 text-(--ui-primary)" />
        <span class="text-sm font-medium text-(--text-color)">Chargement de la carte...</span>
      </div>
    </div>
    <div
      v-if="props.displayFilters"
      class="filters pointer-events-auto absolute top-[15px] left-[15px] z-1001 flex max-w-[calc(100%-30px)] flex-col gap-2 rounded-xl border border-(--border-gray) bg-(--background)/90 p-2 shadow-(--shadow-lg) backdrop-blur-md"
    >
      <!-- Ligne principale : fond de carte, recherche, ouverture des filtres -->
      <div class="flex flex-wrap items-center gap-2">
        <USelect
          v-model="selectedId"
          :items="mapItems"
          value-key="id"
          class="w-40"
          icon="i-lucide-layers"
          color="neutral"
          variant="subtle"
        />

        <UInput
          v-model="searchValue"
          color="neutral"
          placeholder="Rechercher une balade..."
          icon="i-lucide-search"
        />

        <UButton
          icon="i-lucide-sliders-horizontal"
          color="primary"
          variant="solid"
          class="cursor-pointer text-white!"
          @click="handleFilters"
        >
          Filtres
        </UButton>
      </div>

      <!-- Filtres rapides -->
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          icon="i-lucide-clock"
          size="sm"
          :color="filterTime ? 'primary' : 'neutral'"
          :variant="filterTime ? 'solid' : 'subtle'"
          class="cursor-pointer"
          :class="filterTime ? 'text-white!' : ''"
          @click="filterTime = !filterTime"
        >
          -1h30
        </UButton>

        <UButton
          icon="i-lucide-route"
          size="sm"
          :color="filterDistance ? 'primary' : 'neutral'"
          :variant="filterDistance ? 'solid' : 'subtle'"
          class="cursor-pointer"
          :class="filterDistance ? 'text-white!' : ''"
          @click="filterDistance = !filterDistance"
        >
          -50km
        </UButton>

        <UButton
          icon="i-lucide-heart"
          size="sm"
          :color="filterLike ? 'primary' : 'neutral'"
          :variant="filterLike ? 'solid' : 'subtle'"
          class="cursor-pointer"
          :class="filterLike ? 'text-white!' : ''"
          @click="filterLike = !filterLike"
        >
          Coups de coeur
        </UButton>

        <UButton
          icon="i-lucide-history"
          size="sm"
          :color="filterRecent ? 'primary' : 'neutral'"
          :variant="filterRecent ? 'solid' : 'subtle'"
          class="cursor-pointer"
          :class="filterRecent ? 'text-white!' : ''"
          @click="filterRecent = !filterRecent"
        >
          Les plus récentes
        </UButton>

        <UButton
          icon="i-lucide-calendar-days"
          size="sm"
          :color="filterEvent ? 'primary' : 'neutral'"
          :variant="filterEvent ? 'solid' : 'subtle'"
          class="cursor-pointer"
          :class="filterEvent ? 'text-white!' : ''"
          @click="filterEvent = !filterEvent"
        >
          Événement
        </UButton>
      </div>
    </div>
    <div
      class="pointer-events-none absolute right-4 bottom-6 z-1010 flex flex-col items-end gap-2"
    >
      <UButton
        v-if="props.displayEnlargeButton"
        :icon="isFullScreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
        class="pointer-events-auto cursor-pointer"
        color="neutral"
        variant="subtle"
        @click="toggleFullScreen"
      />
      <UButton
        v-if="props.displayAddRideButton"
        icon="i-lucide-plus"
        size="lg"
        color="primary"
        variant="solid"
        class="pointer-events-auto cursor-pointer text-white!"
        @click="goToAddRide"
      >
        Ajouter une balade
      </UButton>
    </div>

    <FormFilters
      v-if="showFilters && distanceMax > 1 && props.displayFilters"
      :max-distance-slider="distanceMax"
      :max-duration-slider="durationMax"
      :list-ride-types="listRideTypes"
      :list-start-town="listStartTown"
      :list-end-town="listEndTown"
      @apply="onApplyFilters"
    />

    <PanelRides v-if="props.displayRideList" :filtered-rides="visibleRides" />
  </div>
</template>

<style scoped>
/* Classe utilisée dans le HTML de la popup Leaflet (string JS, pas dans le template) */
.ride-detail-container {
  margin-bottom: 20em;
}

/* Animation du loader (keyframes non exprimable en utilitaire) */
.loader-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* --- CONTENEUR CARTE --- */
.map-container {
  transition:
    width 0.3s ease-in-out,
    height 0.3s ease-in-out;
}

.map-container.is-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  height: 100dvh !important;
  z-index: 99999 !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

#map {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  touch-action: none;
}

/* --- FILTRES --- */
/* La barre est un panneau unique : les contrôles n'ont plus d'ombre propre. */

/* --- LEAFLET UI CUSTOM --- */
:deep(.custom-dynamic-pin) {
  background: transparent !important;
  border: none !important;
  display: block !important;
}

:deep(.u-select-menu-trigger),
:deep(.u-button-subtle),
:deep(.u-input) {
  background-color: var(--background) !important;
  backdrop-filter: blur(4px);
}

:deep(.leaflet-draw-toolbar),
:deep(.leaflet-draw-actions),
:deep(.leaflet-draw-tooltip),
:deep(.leaflet-popup-content) {
  font-family: 'Poppins', sans-serif !important;
}

/* Popup thématisée (clair/sombre) au lieu du chrome Leaflet par défaut */
:deep(.leaflet-popup-content-wrapper) {
  background: var(--background) !important;
  color: var(--text-color) !important;
  border: 1px solid var(--border-gray) !important;
  border-radius: 12px !important;
  box-shadow: var(--shadow-lg) !important;
}
:deep(.leaflet-popup-tip) {
  background: var(--background) !important;
  border: 1px solid var(--border-gray) !important;
}
:deep(.leaflet-popup-close-button) {
  color: var(--text-color) !important;
}

:deep(.leaflet-control) {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-left: 1rem !important;
  margin-bottom: 1rem !important;
  border: none !important;
  overflow: visible !important;
}

/* Animation d'apparition du bandeau */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translate(-50%, 20px);
  opacity: 0;
}

/* --- TOOLBAR DRAW --- */
:deep(.leaflet-draw-section) {
  margin: 0 !important;
}

:deep(.leaflet-draw-toolbar) {
  margin-top: 0 !important;
  box-shadow: var(--shadow-lg);
  border-radius: 8px !important;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 0.5px solid rgba(0, 0, 0, 0.25) !important;
}

:deep(.leaflet-draw-toolbar a) {
  background-image: none !important;
  background-color: var(--background) !important;
  width: 32px !important;
  height: 32px !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  color: var(--text-color) !important;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1) !important;
  transition: all 0.2s ease;
}

:deep(.leaflet-draw-toolbar a:hover) {
  background-color: var(--ui-primary) !important;
  color: white !important;
}

/* Icons */
:deep(.leaflet-draw-draw-polyline)::before {
  content: '';
  width: 16px;
  height: 16px;
  background-color: currentColor;
  display: block;
  mask: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXBlbi1pY29uIGx1Y2lkZS1wZW4iPjxwYXRoIGQ9Ik0yMS4xNzQgNi44MTJhMSAxIDAgMCAwLTMuOTg2LTMuOTg3TDMuODQyIDE2LjE3NGEyIDIgMCAwIDAtLjUuODNsLTEuMzIxIDQuMzUyYS41LjUgMCAwIDAgLjYyMy42MjJsNC4zNTMtMS4zMmEyIDIgMCAwIDAgLjgzLS40OTd6Ii8+PC9zdmc+')
    no-repeat center / contain;
}

:deep(.leaflet-draw-edit-edit)::before {
  content: '';
  width: 16px;
  height: 16px;
  background-color: currentColor;
  display: block;
  mask: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXNwbGluZS1wb2ludGVyLWljb24gbHVjaWRlLXNwbGluZS1wb2ludGVyIj48cGF0aCBkPSJNMTIuMDM0IDEyLjY4MWEuNDk4LjQ5OCAwIDAgMSAuNjQ3LS42NDdsOSAzLjVhLjUuNSAwIDAgMS0uMDMzLjk0M2wtMy40NDQgMS4wNjhhMSAxIDAgMCAwLS42Ni42NmwtMS4wNjcgMy40NDNhLjUuNSAwIDAgMS0uOTQzLjAzM3oiLz48cGF0aCBkPSJNNSAxN0ExMiAxMiAwIDAgMSAxNyA1Ii8+PGNpcmNsZSBjeD0iMTkiIGN5PSI1IiByPSIyIi8+PGNpcmNsZSBjeD0iNSIgY3k9IjE5IiByPSIyIi8+PC9zdmc+')
    no-repeat center / contain;
}

:deep(.leaflet-draw-edit-remove)::before {
  content: '';
  width: 16px;
  height: 16px;
  background-color: currentColor;
  display: block;
  mask: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLXRyYXNoLWljb24gbHVjaWRlLXRyYXNoIj48cGF0aCBkPSJNMTkgNnYxNGEyIDIgMCAwIDEtMiAySDdhMiAyIDAgMCAxLTItMlY2Ii8+PHBhdGggZD0iTTMgNmgxOCIvPjxwYXRoIGQ9Ik04IDZWNGEyIDIgMCAwIDEgMi0yaDRhMiAyIDAgMCAxIDIgMnYyIi8+PC9zdmc+')
    no-repeat center / contain;
}

/* Actions (Cancel, Save, etc) */
:deep(.leaflet-draw-actions) {
  left: 36px !important;
  top: 0 !important;
  height: 32px !important;
  margin: 0 !important;
  padding: 0 !important;
  list-style: none !important;
}

:deep(.leaflet-draw-actions li) {
  height: 32px !important;
}

:deep(.leaflet-draw-actions a) {
  background: var(--background) !important;
  color: var(--text-color) !important;
  padding: 0 0.75rem !important;
  display: flex !important;
  align-items: center;
  justify-content: center;
  height: 32px !important;
  font-size: 11px !important;
  font-weight: 500 !important;
  border-left: 1px solid var(--border-gray) !important;
}

:deep(.leaflet-draw-actions a:hover) {
  background: var(--ui-primary) !important;
  color: white !important;
}

/* --- TOOLTIPS (BULLES D'AIDE) --- */

/* Bulle qui suit la souris pendant le dessin */
:deep(.leaflet-draw-tooltip) {
  background: var(--background) !important;
  border: 1px solid var(--border-gray) !important;
  color: var(--text-color) !important;
  border-radius: 8px !important;
  padding: 0.25rem 0.75rem !important;
  font-size: 11px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  margin-left: 1.5rem !important;
  margin-top: 1.5rem !important;
  white-space: nowrap !important;
}

/* On masque le triangle */
:deep(.leaflet-draw-tooltip::before) {
  display: none !important;
}

/* On masque le sous-texte superflu */
:deep(.leaflet-draw-tooltip-subtext) {
  color: var(--text-color) !important;
  opacity: 0.7;
  font-size: 10px !important;
  display: block !important;
}

/* --- ÉLÉMENTS DE DESSIN --- */
:deep(.leaflet-editing-icon) {
  background: var(--circle-draw-line) !important;
  border: 2px solid var(--circle-draw-line-outline) !important;
  border-radius: 50% !important;
  width: 12px !important;
  height: 12px !important;
  /* Centrage de la poignée sur le sommet : Leaflet réserve `transform` pour
     positionner le marqueur, donc on centre via marge négative (= -taille/2). */
  margin-left: -6px !important;
  margin-top: -6px !important;
}

:deep(.leaflet-draw-guide-dash) {
  background-color: transparent !important;
  background-image: radial-gradient(
    circle,
    var(--line-creation) 1.5px,
    transparent 2px
  ) !important;
  background-size: 8px 8px !important;
}

:deep(.leaflet-mouse-marker) {
  cursor: crosshair;
}

/* --- AUTRES CONTRÔLES --- */
:deep(.leaflet-control-attribution) {
  display: block !important;
  margin: 0 !important;
  padding: 0 0.25rem;
  background: rgba(255, 255, 255, 0.7) !important;
}

:deep(.leaflet-control-zoom) {
  display: block !important;
  margin: 0 !important;
  padding: 0 0.25rem;
  margin-bottom: 0.75rem !important;
  margin-left: 0.75rem !important;
}
</style>
