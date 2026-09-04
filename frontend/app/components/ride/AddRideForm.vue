<script setup lang="ts">
import {
  RideType,
  type ICommune,
  type IGeoJSON,
  type IValueCommuneSelect,
  type IValueForm
} from '~/types/ride'
import * as v from 'valibot'
import RideEditorMap from './RideEditorMap.vue'
import * as turf from '@turf/turf'
import { useAuth } from '~/composables/useAuth.js'
import { Time, CalendarDate } from '@internationalized/date'
import InputDate from '~/components/global/InputDate.vue'
import InputTime from '~/components/global/InputTime.vue'
import { useMediaQuery } from '@vueuse/core'

const isSelectLoading = ref<boolean>(false) // État de chargement des listes déroulantes
const isMapLoading = ref<boolean>(false) // État de chargement de la carte
const isAutoUpdating = ref(false) // Verrou pour éviter les boucles lors des mises à jour automatiques
const { user } = useAuth() // User actuel

const route = useRoute() // Récupérer les paramètres get passé (notamment pour le scroll automatique)
const router = useRouter() // Changer l'URL pour enlever le paramètre GET quand le scroll est fini

// Termes de recherche séparés pour chaque select
const startTownSearch = ref<string>('')
const endTownSearch = ref<string>('')

const durationHours = ref<number>(0)
const durationMinutes = ref<number>(0)

const mapKey = ref(0) // Permet de recharger la carte quand un tracé GPS est supprimé

const isGpsRoute = ref<boolean>(false)

const addressErrors = reactive({
  start: false,
  end: false
}) // Permet de savoir si un des deux select et l'adresse qui correspond n'est pas dans la bonne ville

const now = new Date()

const rideTypeOptions = Object.values(RideType).map((type: string) => ({
  label: type,
  value: type
})) // Chercher dans l'enum les types

const listCommunes = ref<IValueCommuneSelect[]>([])
const isMobile = useMediaQuery('(max-width: 1023px)')

const steps = [
  { label: 'Infos', description: 'Titre, description, type' },
  { label: 'Trajet', description: 'Villes de départ et arrivée' },
  { label: 'Détails', description: 'Image et événement' }
] as const
const currentStep = ref(0) // 0-indexed

const stateForm = reactive<IValueForm>({
  title: '',
  duration: 0,
  distance: 0,
  description: '',
  startTown: undefined,
  endTown: undefined,
  startAddress: '',
  endAddress: '',
  rideType: '',
  picture: undefined,
  isEvent: false,
  dateEvent: new CalendarDate(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  ),
  hourEvent: new Time(now.getHours(), now.getMinutes()),
  geom: null
})

const resetCommunesList = () => {
  startTownSearch.value = ''
  endTownSearch.value = ''
  loadInitialCommunes()
}

// Propriété calculer pour le calcul de la distance automatique
const rideDistance = computed(() => {
  // On vérifie que la géométrie existe et possède des features
  if (
    !stateForm.geom ||
    !stateForm.geom.features ||
    stateForm.geom.features.length === 0
  ) {
    return 0
  }

  try {
    // Calcul de la longueur en kilomètres
    const distanceKm = turf.length(stateForm.geom as any, {
      units: 'kilometers'
    })
    return parseFloat(distanceKm.toFixed(2))
  } catch (e) {
    console.error('Erreur de calcul Turf:', e)
    return 0
  }
})

// Permet la recherche dynamique dans les select des villes
const searchCommunes = async (query: string) => {
  if (!query || query.length <= 1) return

  isSelectLoading.value = true
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?nom=${query}&limit=20&fields=nom,code,codesPostaux`
    )
    const data = await res.json()
    const sortedData = data.sort((a: any, b: any) => a.nom.localeCompare(b.nom))

    listCommunes.value = sortedData.map((c: ICommune) => ({
      label: `${c.nom} ${c.codesPostaux ? '(' + c.codesPostaux[0] + ')' : ''}`,
      value: c.nom,
      postcode: c.codesPostaux ? c.codesPostaux[0] : undefined
    }))
  } catch (e) {
    console.error(e)
  } finally {
    isSelectLoading.value = false
  }
}

// Fonction pour charger les 50 premières communes
const loadInitialCommunes = async () => {
  isSelectLoading.value = true
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes?limit=50&fields=nom,codesPostaux`
    )
    const data = await res.json()
    const sortedData = data.sort((a: any, b: any) => a.nom.localeCompare(b.nom))

    // Ajouter les communes trouvées dans le select
    listCommunes.value = sortedData.map((c: ICommune) => ({
      label: `${c.nom} ${c.codesPostaux ? '(' + c.codesPostaux[0] + ')' : ''}`,
      value: c.nom,
      postcode: c.codesPostaux ? c.codesPostaux[0] : undefined
    }))
  } catch (e) {
    console.error(e)
  } finally {
    isSelectLoading.value = false
  }
}

// Quand les select sont ouverts, vidés tout et recharger les communes de base (les 50)
const handleMenuClose = (isOpen: boolean) => {
  if (
    !isOpen &&
    startTownSearch.value === '' &&
    endTownSearch.value === '' &&
    stateForm.startTown?.label === '' &&
    stateForm.endTown?.label === ''
  ) {
    loadInitialCommunes()
    startTownSearch.value = ''
    endTownSearch.value = ''
  }
}

// Fonction qui génère la geom via OSRM à partir des deux villes
const calculateRouteFromCities = async () => {
  if (
    !stateForm.startTown?.value ||
    !stateForm.endTown?.value ||
    isAutoUpdating.value
  )
    return

  isMapLoading.value = true
  mapKey.value++ // Recharger la carte pour enlever tous les modes de modification, création ou suppression

  try {
    // On récupère les coordonnées en passant le nom de la ville ET le code postal
    const [startCoords, endCoords] = await Promise.all([
      getCoordsFromAddress(
        stateForm.startAddress,
        stateForm.startTown.value,
        stateForm.startTown.postcode
      ),
      getCoordsFromAddress(
        stateForm.endAddress,
        stateForm.endTown.value,
        stateForm.endTown.postcode
      )
    ])

    addressErrors.start = !startCoords
    addressErrors.end = !endCoords

    if (!startCoords || !endCoords) {
      return
    }

    isAutoUpdating.value = true
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startCoords.join(',')};${endCoords.join(',')}?overview=full&geometries=geojson`
    )
    const data = await res.json()

    if (data.routes && data.routes.length > 0) {
      const rawGeom = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: {}, geometry: data.routes[0].geometry }
        ]
      }
      stateForm.geom = simplifyGeometry(rawGeom, 0.00005)
      isGpsRoute.value = true
      stateForm.duration = parseFloat(
        (data.routes[0].duration / 3600).toFixed(2)
      )
      stateForm.distance = parseFloat(
        (data.routes[0].distance / 1000).toFixed(2)
      )
    }
  } finally {
    isMapLoading.value = false
    setTimeout(() => {
      isAutoUpdating.value = false
    }, 500)
  }
}

async function uploadFile(
  file: File,
  type: 'image' | 'sound',
  directory: string
): Promise<string> {
  const clearString = (s: string | undefined) => {
    return s ? s.replace(' ', '_').toLowerCase() : ''
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  formData.append('directory', directory)
  formData.append(
    'name',
    `${clearString(stateForm.startTown?.value)}_${clearString(stateForm.endTown?.value)}-${new Date().getTime()}`
  )

  const res = await $fetch<{ url: string }>('/api/uploadFile', {
    method: 'POST',
    body: formData
  })
  return res.url
}

// Fonction pour trouver une commune à partir de coordonnées [long, lat]
const getCommuneFromCoords = async (
  coords: number[] | undefined
): Promise<IValueCommuneSelect | undefined> => {
  try {
    let data
    if (coords) {
      const res = await fetch(
        `https://api-adresse.data.gouv.fr/reverse/?lon=${coords[0]}&lat=${coords[1]}`
      )
      data = await res.json()
    }

    // On vérifie qu'on a au moins un résultat
    if (data.features && data.features.length > 0) {
      // On prend le premier résultat (le plus proche)
      const properties = data.features[0].properties

      return {
        label: `${properties.city} (${properties.postcode})`,
        value: properties.city,
        postcode: properties.postcode
      }
    }
  } catch (e) {
    console.error('Erreur lors du reverse geocoding:', e)
  }
  return undefined
}

// Fonction pour transformer l'adresse en coordonnées tout en filtrant par commune
const getCoordsFromAddress = async (
  address: string,
  city: string,
  postcode?: string
): Promise<number[] | null> => {
  const hasAddress = address.trim().length > 0

  try {
    // Si pas d'adresse, on cherche directement la ville
    const searchTerm = hasAddress ? address : city
    let url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(searchTerm)}&city=${encodeURIComponent(city)}&limit=1`

    if (postcode) {
      url += `&postcode=${postcode}`
    }

    const res = await fetch(url)
    const data = await res.json()

    if (data.features && data.features.length > 0) {
      const feature = data.features[0]

      if (hasAddress && feature.properties.type === 'municipality') {
        return null
      }

      return feature.geometry.coordinates
    }
  } catch (e) {
    console.error('Erreur de géocodage:', e)
  }
  return null
}

async function onSubmit() {
  const runtimeConfig = useRuntimeConfig()
  try {
    let directoryImageRide
    if (stateForm.picture) {
      directoryImageRide = await uploadFile(stateForm.picture, 'image', 'rides')
    }

    const payload = {
      ...stateForm,
      imageLink: directoryImageRide,
      distance: parseFloat(rideDistance.value.toString()),
      userId: user.value?._id
    }

    // Conversion en chaînes de caractères
    if (stateForm.isEvent) {
      payload.dateEvent = stateForm.dateEvent.toString()
      payload.hourEvent = stateForm.hourEvent.toString()
    } else {
      // Si ce n'est pas une balade groupée, on nettoie les valeurs
      payload.dateEvent = undefined
      payload.hourEvent = undefined
    }

    await $fetch(`${runtimeConfig.public.apiBase}rides`, {
      method: 'POST',
      credentials: 'include',
      body: payload
    })

    await navigateTo({
      path: '/ride',
      query: { scroll: 'true' }
    })

    const toast = useToast()
    toast.add({
      title: 'Succès',
      description: 'Votre balade a été ajouté.',
      color: 'success'
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi:", error)
  }
}

// Règles de validation des champs requis (messages en français)
const schema = v.object({
  title: v.pipe(
    v.string(),
    v.minLength(1, 'Le titre de la balade est requis')
  ),
  startTown: v.custom<IValueCommuneSelect | undefined>(
    (val) => !!(val as IValueCommuneSelect | undefined)?.label?.length,
    'La ville de départ est requise'
  ),
  endTown: v.custom<IValueCommuneSelect | undefined>(
    (val) => !!(val as IValueCommuneSelect | undefined)?.label?.length,
    "La ville d'arrivée est requise"
  ),
  rideType: v.pipe(
    v.string(),
    v.minLength(1, 'Le type de balade est requis')
  ),
  picture: v.custom<File | undefined>(
    (val) => !!val,
    "L'image de la balade est requise"
  ),
  geom: v.custom<IGeoJSON | null>(
    (val) => !!val,
    'Le tracé de la balade est requis'
  )
})

const canAdvanceStep = computed(() => {
  if (currentStep.value === 0) {
    return Boolean(stateForm.title?.length && stateForm.rideType?.length)
  }
  if (currentStep.value === 1) {
    return Boolean(
      stateForm.startTown?.label?.length &&
        stateForm.endTown?.label?.length &&
        stateForm.geom
    )
  }
  return true
})

function nextStep() {
  if (!canAdvanceStep.value) return
  if (currentStep.value < steps.length - 1) currentStep.value += 1
}

function prevStep() {
  if (currentStep.value > 0) currentStep.value -= 1
}

onMounted(async () => {
  // Si le paramètre est présent dans l'URL on scroll
  if (route.query.scroll === 'true') {
    setTimeout(() => {
      scrollToMap('container-form')
      // Nettoyage de l'URL pour éviter de rescroller au prochain refresh
      router.replace({ query: {} })
    }, 400)
  }

  loadInitialCommunes()
})

watch(
  () => stateForm.dateEvent,
  (newDate) => {
    if (!newDate) return

    const today = new CalendarDate(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    )

    // compare retourne -1 si newDate < today
    if (newDate.compare(today) < 0) {
      const toast = useToast()
      toast.add({
        title: 'Date invalide',
        description: 'Vous ne pouvez pas choisir une date passée.',
        color: 'error'
      })

      // Réinitialise à aujourd'hui
      stateForm.dateEvent = today
    }
  }
)

watch(
  () => stateForm.geom,
  async (newGeom) => {
    // Si la geom change (se supprime) on lave tous les champs calculer en fonction
    if (!newGeom || !newGeom.features || newGeom.features.length === 0) {
      stateForm.startTown = undefined
      stateForm.endTown = undefined
      stateForm.duration = 0
      isGpsRoute.value = false
      return
    }

    if (isAutoUpdating.value) return
    if (isGpsRoute.value) return

    const feature = newGeom.features[0]
    if (feature?.geometry.type !== 'LineString') return

    const coords = feature.geometry.coordinates
    if (coords.length < 2) return

    isSelectLoading.value = true

    // On ajoute le calcul de durée aux requêtes parallèles
    const [startCity, endCity, estimatedTime] = await Promise.all([
      getCommuneFromCoords(coords[0]), // Point de départ de la geom
      getCommuneFromCoords(coords[coords.length - 1]), // Point d'arrivé de la geom
      getEstimatedDuration(newGeom)
    ])

    stateForm.startTown = startCity
    stateForm.endTown = endCity

    // On met à jour la durée automatiquement
    if (estimatedTime) {
      stateForm.duration = estimatedTime
    }

    isSelectLoading.value = false
  },
  { deep: true }
)

// Quand la ville de départ est sélectionnée permet de reset les choix
watch(
  () => stateForm.startTown,
  (newVal) => {
    if (newVal) {
      resetCommunesList()
    }
  }
)

// Quand la ville d'arrivée est sélectionnée permet de reset les choix
watch(
  () => stateForm.endTown,
  (newVal) => {
    if (newVal) {
      resetCommunesList()
    }
  }
)

// Prendre les heures et minutes de la duréer en décimal pour le back
watch([durationHours, durationMinutes], ([h, m]) => {
  const decimalValue = h + m / 60
  stateForm.duration = parseFloat(decimalValue.toFixed(2))
})

// Si la durée change via le calcul automatique, on met à jour les champs Heures / Minutes
watch(
  () => stateForm.duration,
  (newVal) => {
    const h = Math.floor(newVal)
    const m = Math.round((newVal - h) * 60)

    // On ne met à jour que si les valeurs sont différentes pour éviter les boucles infinies
    if (h !== durationHours.value) durationHours.value = h
    if (m !== durationMinutes.value) durationMinutes.value = m
  }
)

// Quand le tracé GPS est supprimé, on force le rechargement du composant pour reset leaflet draw qui bug sinon
watch(isGpsRoute, (newVal) => {
  if (!newVal) {
    mapKey.value++
  }
})

// Watch les input de recherche dans les select des villes, pas les valeurs sélectionnées
watch(startTownSearch, (val: string) => searchCommunes(val))
watch(endTownSearch, (val: string) => searchCommunes(val))

// On réinitialise les erreurs quand on change de ville ou d'adresse
watch(
  [() => stateForm.startTown, () => stateForm.startAddress],
  () => (addressErrors.start = false)
)
watch(
  [() => stateForm.endTown, () => stateForm.endAddress],
  () => (addressErrors.end = false)
)
</script>
<template>
  <div id="container-form" class="w-full p-4 md:p-8!">
    <UForm
      class="flex w-full flex-col items-stretch gap-12 lg:flex-row! lg:flex-wrap"
      :state="stateForm"
      :schema="schema"
      @submit="onSubmit"
    >
      <UContainer class="flex flex-col space-y-6 lg:order-1 lg:w-1/2 lg:flex-1">
        <header>
          <UButton
            to="/ride?scroll=true"
            icon="i-lucide-chevron-left"
            variant="ghost"
            color="neutral"
            label="Retour"
          />
          <h3 class="mt-2 text-xl font-bold">Nouvelle balade</h3>
        </header>

        <nav class="w-full" aria-label="Étapes de création">
          <ol class="m-0 flex list-none items-stretch gap-2 p-0">
            <li
              v-for="(step, idx) in steps"
              :key="step.label"
              class="flex flex-1 items-center gap-2 rounded-lg px-3 py-2"
              :class="['stepper-item', {
                active: currentStep === idx,
                done: currentStep > idx
              }]"
            >
              <span class="stepper-bullet inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-(--background)">
                <UIcon v-if="currentStep > idx" name="i-lucide-check" class="size-4" />
                <span v-else>{{ idx + 1 }}</span>
              </span>
              <span class="flex min-w-0 flex-col leading-[1.1]">
                <span class="text-sm font-semibold">{{ step.label }}</span>
                <span class="truncate text-xs text-gray-500 max-sm:hidden">{{ step.description }}</span>
              </span>
            </li>
          </ol>
        </nav>

        <div v-show="currentStep === 0" class="flex flex-col gap-6">
          <UFormField label="Titre de la balade" name="title" required>
            <UInput
              v-model="stateForm.title"
              class="w-full"
              placeholder="Entrez un titre..."
              size="xl"
            />
          </UFormField>

          <UFormField label="Description de la balade" name="description">
            <UTextarea
              v-model="stateForm.description"
              class="w-full"
              placeholder="Entrez une description..."
              size="xl"
              :rows="4"
            />
          </UFormField>

          <UFormField label="Type de la balade" name="rideType" required>
            <USelect
              v-model="stateForm.rideType"
              class="w-full"
              :items="rideTypeOptions"
              placeholder="Sélectionnez le type..."
              size="xl"
            />
          </UFormField>
        </div>

        <div v-show="currentStep === 1" class="flex flex-col gap-6">
          <p v-if="!isMobile" class="text-sm text-gray-500">
            Tracez à la main avec
            <UIcon name="i-lucide-pen" class="size-4 text-primary" /> ou
            <strong class="text-primary">choisissez deux villes</strong> puis
            calculer l'itinéraire.
          </p>
          <p v-else class="text-sm text-gray-500">
            Tracez une balade en
            <strong class="text-primary">choisissant deux villes</strong> puis
            calculer l'itinéraire.
          </p>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2!">
          <div class="flex flex-col gap-2">
            <UFormField label="Ville de départ" name="startTown" required>
              <USelectMenu
                v-model="stateForm.startTown"
                class="w-full"
                :items="listCommunes"
                placeholder="Chercher une ville..."
                :search-input="({
                  placeholder: 'Rechercher...',
                  modelValue: startTownSearch,
                  'onUpdate:modelValue': (val: string) =>
                    (startTownSearch = val)
                } as any)"
                size="xl"
                option-attribute="label"
                :loading="isSelectLoading"
                @update:open="handleMenuClose"
              />
            </UFormField>
            <div class="flex flex-col gap-1">
              <UInput
                v-model="stateForm.startAddress"
                placeholder="Adresse précise (optionnel)..."
                size="md"
                :color="addressErrors.start ? 'error' : 'neutral'"
              />
              <span v-if="addressErrors.start" class="text-sm text-red-500">
                L'adresse n'existe pas à {{ stateForm.startTown?.value }}
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <UFormField label="Ville d'arrivée" name="endTown" required>
              <USelectMenu
                v-model="stateForm.endTown"
                class="w-full"
                :items="listCommunes"
                placeholder="Chercher une ville..."
                :search-input="({
                  placeholder: 'Rechercher...',
                  modelValue: endTownSearch,
                  'onUpdate:modelValue': (val: string) => (endTownSearch = val)
                } as any)"
                size="xl"
                option-attribute="label"
                :loading="isSelectLoading"
                @update:open="handleMenuClose"
              />
            </UFormField>
            <div class="flex flex-col gap-1">
              <UInput
                v-model="stateForm.endAddress"
                placeholder="Adresse précise (optionnel)..."
                size="md"
                :color="addressErrors.end ? 'error' : 'neutral'"
              />
              <span v-if="addressErrors.end" class="text-sm text-red-500">
                L'adresse n'existe pas à {{ stateForm.endTown?.value }}
              </span>
            </div>
          </div>
        </div>

          <div class="flex justify-end">
            <UButton
              icon="i-lucide-navigation"
              color="neutral"
              variant="subtle"
              :loading="isMapLoading"
              :disabled="!stateForm.startTown?.value || !stateForm.endTown?.value"
              class="w-full cursor-pointer justify-center sm:w-fit"
              @click="calculateRouteFromCities"
            >
              Calculer le tracé GPS
            </UButton>
          </div>
        </div>

        <div v-show="currentStep === 2" class="flex flex-col gap-6">
          <UFormField label="Image de la balade" name="picture" required>
            <div class="h-[200px] w-full overflow-hidden">
              <UFileUpload v-model="stateForm.picture" class="size-full" />
            </div>
          </UFormField>

          <UFormField name="groupRide" required>
            <div class="flex flex-row items-center justify-start gap-3">
              <USwitch v-model="stateForm.isEvent" />
              <p class="text-[medium]">Créer une balade groupée</p>
            </div>
          </UFormField>

          <div v-if="stateForm.isEvent" class="grid grid-cols-1 gap-6 sm:grid-cols-2!">
            <UFormField label="Date" required>
              <InputDate
                v-model="stateForm.dateEvent"
                class="w-full"
                :min-value="
                  new CalendarDate(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    now.getDate()
                  )
                "
              />
            </UFormField>

            <UFormField label="Heure" required>
              <InputTime v-model="stateForm.hourEvent" class="w-full" />
            </UFormField>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <UButton
            v-if="currentStep > 0"
            type="button"
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-left"
            label="Précédent"
            class="cursor-pointer"
            @click="prevStep"
          />
          <span class="flex-1" />
          <UButton
            v-if="currentStep < steps.length - 1"
            type="button"
            color="primary"
            trailing-icon="i-lucide-chevron-right"
            label="Suivant"
            :disabled="!canAdvanceStep"
            class="cursor-pointer text-white!"
            @click="nextStep"
          />
        </div>
      </UContainer>

      <UContainer class="flex flex-col lg:order-2 lg:w-1/2 lg:flex-1">
        <UFormField
          label="Tracé de la balade"
          name="geom"
          required
          class="mt-25 flex grow flex-col"
          :ui="{ container: 'flex-grow' }"
        >
          <RideEditorMap
            v-model:geom="stateForm.geom"
            v-model:is-map-loading="isMapLoading"
            :is-gps-route="isGpsRoute"
            :is-mobile="isMobile"
            :map-key="mapKey"
          />

          <div
            v-if="isGpsRoute || isMobile"
            class="mt-2 flex items-center gap-2 text-sm font-medium text-orange-500"
          >
            <UIcon name="i-lucide-info" class="size-5" />
            Modification désactivée pour les tracés GPS et sur téléphone
          </div>

          <div class="mt-4 flex min-w-[200px] flex-col gap-4 lg:flex-row! lg:items-center lg:gap-10!">
            <div v-if="rideDistance > 0" class="flex flex-row items-center justify-start gap-3 whitespace-nowrap">
              <UIcon name="i-lucide-map-pinned" class="size-4 text-primary" />
              <span
                >Distance :
                <strong class="text-primary"
                  >{{ rideDistance }} km</strong
                ></span
              >
            </div>
            <div class="flex flex-row items-center justify-start gap-3 whitespace-nowrap">
              <UIcon name="i-lucide-timer" class="size-4 text-primary" />
              <div class="flex items-center gap-2">
                <UInputNumber v-model="durationHours" class="w-22" size="md" />
                <span>h</span>
                <UInputNumber
                  v-model="durationMinutes"
                  class="w-28"
                  :max="59"
                  size="md"
                />
                <span>min</span>
              </div>
            </div>
          </div>
        </UFormField>
      </UContainer>

      <div
        v-show="currentStep === steps.length - 1"
        class="ml-7 flex justify-start lg:order-3 lg:mt-4 lg:w-full"
      >
        <UButton
          type="submit"
          label="Créer la balade"
          color="primary"
          size="xl"
          class="w-full cursor-pointer justify-center text-white! lg:w-fit"
          icon="i-lucide-check"
          loading-auto
        />
      </div>
    </UForm>
  </div>
</template>

<style scoped>
:deep(.u-container) {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  width: 100%;
}

/* --- STEPPER (état actif/terminé piloté par les classes .active/.done) --- */
.stepper-item {
  border: 1px solid var(--color-gray-300);
  color: var(--color-gray-500);
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}

.stepper-item.active {
  border-color: var(--ui-primary);
  color: var(--text-color);
}

.stepper-item.done {
  border-color: var(--ui-color-success-600);
  color: var(--ui-color-success-600);
}

.stepper-item.active .stepper-bullet {
  background-color: var(--ui-primary);
  color: white;
}

.stepper-item.done .stepper-bullet {
  background-color: var(--ui-color-success-600);
  color: white;
}
</style>
