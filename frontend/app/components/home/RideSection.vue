<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import type { IRide, RideResponse } from '~/types/ride'
import {
  getMapPinSvg,
  buildRideColorMap,
  RIDE_FALLBACK_COLOR
} from '~/utils/ride'
import CardRide from '~/components/ride/CardRide.vue'

// Direction owned by the parent (see ComparoSection) — defaults to non-reversed.
withDefaults(defineProps<{ reverse?: boolean }>(), { reverse: false })

// The latest rides for the homepage teaser — the full map lives on /ride. The
// API sorts by createdAt desc by default. deep=true populates the participants
// shown on the cards.
const rides = ref<IRide[]>([])
const colorMap = ref<Record<string, string>>({})
const runtimeConfig = useRuntimeConfig()

// The cards rotate on their own; hovering or focusing the section pauses it.
const ROTATE_MS = 5000
const active = ref(0)
const paused = ref(false)
let rotateTimer: ReturnType<typeof setInterval> | null = null

const startRotation = () => {
  stopRotation()
  if (rides.value.length < 2) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  rotateTimer = setInterval(() => {
    if (!paused.value) active.value = (active.value + 1) % rides.value.length
  }, ROTATE_MS)
}
const stopRotation = () => {
  if (rotateTimer) clearInterval(rotateTimer)
  rotateTimer = null
}

// Position of a card in the stack: 0 is the front card, then the next ones
// peek out below it.
const stackPos = (i: number) =>
  (i - active.value + rides.value.length) % rides.value.length

const mapEl = ref<HTMLElement | null>(null)
let previewMap: any = null
let L: any = null
const markers: any[] = []
const traces: any[] = []

const pinIcon = (color: string, active: boolean) => {
  const size = active ? 36 : 26
  return L.divIcon({
    html: getMapPinSvg(color),
    iconSize: [size, size],
    iconAnchor: [size / 2, size * 0.4],
    className: `custom-dynamic-pin${active ? ' is-active' : ''}`
  })
}

// Static map (no drag/zoom). A click on a start marker brings its ride card to
// the front.
const initPreviewMap = async () => {
  if (!mapEl.value || !rides.value.length) return

  L = await import('leaflet')
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
  rides.value.forEach((ride, i) => {
    if (!ride.geom) return
    const color = colorMap.value[ride._id] || RIDE_FALLBACK_COLOR
    const trace = L.geoJSON(ride.geom as any, {
      style: { color, weight: 3, opacity: 0.35 },
      interactive: false
    }).addTo(previewMap)
    traces[i] = trace
    bounds.extend(trace.getBounds())

    // coordinates[0] = start of the trace, in [lng, lat].
    const start = (ride.geom as any)?.features?.[0]?.geometry?.coordinates?.[0]
    if (!Array.isArray(start) || start.length < 2) return
    const marker = L.marker([start[1], start[0]], {
      icon: pinIcon(color, false),
      title: ride.title
    }).addTo(previewMap)
    marker.on('click', () => {
      active.value = i
      startRotation()
    })
    markers[i] = marker
  })

  if (bounds.isValid()) previewMap.fitBounds(bounds, { padding: [32, 32] })

  // The map is created before flex layout fully settles, so recompute its size.
  setTimeout(() => {
    previewMap?.invalidateSize()
    showActive()
  }, 200)
}

// Highlights the active ride: bold trace and a bigger marker drawn on top.
const showActive = () => {
  if (!previewMap) return
  rides.value.forEach((ride, i) => {
    const isActive = i === active.value
    traces[i]?.setStyle({ opacity: isActive ? 1 : 0.35, weight: isActive ? 5 : 3 })
    markers[i]?.setIcon(pinIcon(colorMap.value[ride._id] || RIDE_FALLBACK_COLOR, isActive))
    markers[i]?.setZIndexOffset(isActive ? 1000 : 0)
  })
  traces[active.value]?.bringToFront()
}
watch(active, showActive)

onMounted(async () => {
  try {
    const res = await fetch(
      `${runtimeConfig.public.apiBase}rides?project=all&deep=true&limit=5`
    )
    const data: RideResponse = await res.json()
    rides.value = data.rides ?? []
    colorMap.value = buildRideColorMap(rides.value)
    await initPreviewMap()
    startRotation()
  } catch (e) {
    console.error('Erreur fetch rides:', e)
  }
})

onBeforeUnmount(() => {
  stopRotation()
  previewMap?.remove()
  previewMap = null
})

// Open the ride on the full map: /ride focuses the marker via the `ride` query
// param and scrolls to the map.
const goToRide = (rideId: string) =>
  navigateTo({ path: '/ride', query: { ride: rideId, scroll: 'true' } })
</script>

<template>
  <div
    class="flex items-center justify-center gap-12 max-lg:flex-col!"
    :class="reverse ? 'flex-row-reverse' : 'flex-row'"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
    @focusin="paused = true"
    @focusout="paused = false"
  >
    <div class="flex w-full max-w-sm flex-1 flex-col gap-6 max-lg:max-w-none!">
      <div class="flex flex-col gap-3">
        <h2>Roulez sur de <span class="text-(--ui-primary)">nouveaux itinéraires</span></h2>
        <p class="max-lg:text-sm!">
          Découvrez les balades partagées par la communauté et planifiez votre
          prochaine sortie.
        </p>
      </div>

      <div v-if="rides.length" class="flex flex-col gap-2">
        <!-- Stacked ride cards: all share one grid cell, the front one is the
             active ride and the next two peek out below it. Every card
             stretches to the tallest one, so a back card never sticks out. -->
        <div
          class="grid pb-6 [&>*>*]:h-full!"
          aria-roledescription="carrousel"
          aria-label="Dernières balades"
        >
          <div
            v-for="(ride, i) in rides"
            :key="ride._id"
            class="col-start-1 row-start-1 origin-bottom self-stretch transition-[transform,opacity,visibility] duration-500 ease-out [&_.z-2]:transition-opacity [&_.z-2]:duration-500"
            :class="[
              stackPos(i) === 0 && 'come-forward z-30 opacity-100',
              stackPos(i) === 1 && 'pointer-events-none z-20 translate-y-3 scale-95 opacity-60 [&_.z-2]:opacity-0',
              stackPos(i) === 2 && 'pointer-events-none z-10 translate-y-6 scale-90 opacity-30 [&_.z-2]:opacity-0',
              stackPos(i) > 2 && 'pointer-events-none invisible translate-y-6 scale-90 opacity-0 [&_.z-2]:opacity-0'
            ]"
            :aria-hidden="stackPos(i) !== 0"
            :inert="stackPos(i) !== 0"
          >
            <CardRide
              :ride="ride"
              :color="colorMap[ride._id]"
              @select="goToRide"
              @update:like="(n) => (ride.like = n)"
              @update:participants="(list) => (ride.participating_user = list)"
            />
          </div>
        </div>

        <div
          v-if="rides.length > 1"
          class="flex self-center"
        >
          <!-- 24px hit area around each 8px dot, for touch. -->
          <button
            v-for="(ride, i) in rides"
            :key="ride._id"
            type="button"
            class="grid h-6 cursor-pointer place-items-center px-1"
            :aria-label="`Afficher la balade ${ride.title}`"
            :aria-current="i === active"
            @click="active = i; startRotation()"
          >
            <span
              class="block h-2 rounded-full transition-all"
              :class="i === active ? 'w-6 bg-(--ui-primary)' : 'w-2 bg-(--border-gray)'"
            ></span>
          </button>
        </div>
      </div>

      <UButton size="xl" color="primary" to="/ride" class="self-start rounded-full text-white">
        Explorer la carte
      </UButton>
    </div>

    <div
      class="relative aspect-square w-full max-w-lg flex-2 overflow-hidden rounded-[20px] border border-(--border-gray) max-lg:max-w-none!"
    >
      <div ref="mapEl" class="size-full"></div>
    </div>
  </div>
</template>

<style scoped>
/* The new front card rises from its back slot, passes over the old one, then
   settles. z-index switches at once, so it is drawn on top during the move. */
@media (prefers-reduced-motion: no-preference) {
  .come-forward {
    animation: come-forward 600ms ease-out;
  }
}
@keyframes come-forward {
  from {
    transform: translateY(12px) scale(0.95);
  }
  55% {
    transform: translateY(-14px) scale(1.03);
  }
  to {
    transform: none;
  }
}

/* Leaflet gives divIcons a white box by default; the pin SVG carries its own
   shape, so strip the container. */
:deep(.custom-dynamic-pin) {
  background: transparent !important;
  border: none !important;
  display: block !important;
  transition:
    width 0.3s,
    height 0.3s,
    margin 0.3s;
}
:deep(.custom-dynamic-pin svg) {
  width: 100%;
  height: 100%;
}
</style>
