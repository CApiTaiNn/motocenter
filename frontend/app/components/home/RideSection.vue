<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import type { IRide, RideResponse } from '~/types/ride'

// Direction owned by the parent (see ComparoSection) — defaults to non-reversed.
withDefaults(defineProps<{ reverse?: boolean }>(), { reverse: false })

// The 3 most recent rides for the homepage teaser — the live, interactive map
// lives on /ride. The API sorts by createdAt desc by default, so limit=3 gives
// the latest three. geom/color are needed to draw the preview traces.
const rides = ref<IRide[]>([])
const runtimeConfig = useRuntimeConfig()

const mapEl = ref<HTMLElement | null>(null)
let previewMap: any = null

// Builds a small, non-interactive map that plots the fetched ride traces. Kept
// deliberately static (no drag/zoom) — it's a teaser; the real map is on /ride.
const initPreviewMap = async () => {
  if (!mapEl.value || !rides.value.length) return

  const L = await import('leaflet')
  previewMap = L.map(mapEl.value, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false
  }).setView([48.26, -3], 8)

  L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=fr', {
    maxZoom: 20
  }).addTo(previewMap)

  const bounds = L.latLngBounds([])
  for (const ride of rides.value) {
    if (!ride.geom) continue
    const layer = L.geoJSON(ride.geom as any, {
      style: { color: ride.color || '#3B82F6', weight: 3, opacity: 1 }
    }).addTo(previewMap)
    bounds.extend(layer.getBounds())
  }
  if (bounds.isValid()) previewMap.fitBounds(bounds, { padding: [24, 24] })

  // The map is created before flex layout fully settles, so recompute its size.
  setTimeout(() => previewMap?.invalidateSize(), 200)
}

onMounted(async () => {
  try {
    const res = await fetch(
      `${runtimeConfig.public.apiBase}rides?project=title,distance,start_town,geom,color&limit=3`
    )
    const data: RideResponse = await res.json()
    rides.value = data.rides ?? []
    await initPreviewMap()
  } catch (e) {
    console.error('Erreur fetch rides:', e)
  }
})

onBeforeUnmount(() => {
  previewMap?.remove()
  previewMap = null
})

// Open the ride on the interactive map: /ride focuses the marker via the `ride`
// query param and scrolls to the map.
const goToRide = (ride: IRide) =>
  navigateTo({ path: '/ride', query: { ride: ride._id, scroll: 'true' } })
</script>

<template>
  <div class="flex items-center gap-12 max-lg:flex-col!" :class="reverse ? 'flex-row-reverse' : 'flex-row'">
    <div class="flex flex-1 flex-col gap-6 max-lg:w-full!">
      <div class="flex flex-col gap-3">
        <h2>Roulez sur de <span class="text-(--ui-primary)">nouveaux itinéraires</span></h2>
        <p class="max-lg:text-sm!">
          Découvrez les balades partagées par la communauté et planifiez votre
          prochaine sortie.
        </p>
      </div>

      <ul class="flex flex-col gap-2">
        <li v-for="ride in rides" :key="ride._id">
          <button
            type="button"
            class="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-(--border-gray) bg-(--background) p-3 text-left transition-colors hover:border-(--ui-primary)"
            @click="goToRide(ride)"
          >
            <UIcon name="i-lucide-route" class="size-5 shrink-0 text-(--ui-primary)" aria-hidden="true" />
            <span class="truncate font-semibold">{{ ride.title }}</span>
            <span v-if="ride.start_town" class="shrink-0 text-sm text-gray-500">· {{ ride.start_town }}</span>
            <span class="ml-auto shrink-0 text-sm text-gray-500">{{ ride.distance }} km</span>
          </button>
        </li>
      </ul>

      <UButton size="xl" color="primary" to="/ride" class="self-start rounded-full" style="color: white">
        Explorer la carte
      </UButton>
    </div>

    <!-- Live preview of the latest ride traces; links through to the full map. -->
    <NuxtLink
      to="/ride"
      class="relative block aspect-square w-full max-w-lg flex-2 overflow-hidden rounded-[20px] border border-(--border-gray) max-lg:w-full!"
    >
      <div ref="mapEl" class="size-full"></div>
      <!-- Transparent overlay so the whole card is clickable (the map itself is
           non-interactive). -->
      <span class="absolute inset-0 z-500" aria-hidden="true"></span>
    </NuxtLink>
  </div>
</template>
