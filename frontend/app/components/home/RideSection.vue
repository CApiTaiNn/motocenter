<script setup lang="ts">
// Direction owned by the parent (see ComparoSection) — defaults to non-reversed.
withDefaults(defineProps<{ reverse?: boolean }>(), { reverse: false })

// Illustrative example rides for the homepage teaser — the live, interactive
// map lives on /ride.
const rides = [
  { name: 'Route des Crêtes', region: 'Vosges', distance: '52 km' },
  { name: 'Col du Galibier', region: 'Alpes', distance: '38 km' },
  { name: 'Gorges du Verdon', region: 'Provence', distance: '64 km' }
]
</script>

<template>
  <div class="flex items-center gap-12 max-lg:flex-col!" :class="reverse ? 'flex-row-reverse' : 'flex-row'">
    <div class="flex flex-1 flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h2>Roulez sur de <span class="text-(--ui-primary)">nouveaux itinéraires</span></h2>
        <p class="max-lg:text-sm!">
          Découvrez les balades partagées par la communauté et planifiez votre
          prochaine sortie.
        </p>
      </div>

      <ul class="flex flex-col gap-2">
        <li
          v-for="ride in rides"
          :key="ride.name"
          class="flex items-center gap-3 rounded-lg border border-(--border-gray) bg-(--background) p-3"
        >
          <UIcon name="i-lucide-route" class="size-5 shrink-0 text-(--ui-primary)" aria-hidden="true" />
          <span class="font-semibold">{{ ride.name }}</span>
          <span class="text-sm text-gray-500">· {{ ride.region }}</span>
          <span class="ml-auto text-sm text-gray-500">{{ ride.distance }}</span>
        </li>
      </ul>

      <UButton size="xl" color="primary" to="/ride" class="self-start rounded-full" style="color: white">
        Explorer la carte
      </UButton>
    </div>

    <!-- Sober route visual: two checkpoints joined by a dashed line -->
    <div class="route-card relative flex aspect-square w-full max-w-sm flex-1 items-center justify-center rounded-[20px] border border-(--border-gray) bg-(--background) p-8">
      <svg class="size-full" viewBox="0 0 200 200" fill="none" aria-hidden="true">
        <path
          d="M40 40 C 120 60, 80 140, 160 160"
          stroke="var(--ui-primary)"
          stroke-width="3"
          stroke-dasharray="6 8"
          stroke-linecap="round"
        />
      </svg>
      <span class="marker absolute top-[20%] left-[20%] -translate-1/2">
        <UIcon name="i-lucide-map-pin" class="size-7 text-(--ui-primary)" />
        <span class="label">Départ</span>
      </span>
      <span class="marker absolute top-[80%] left-[80%] -translate-1/2">
        <UIcon name="i-lucide-flag" class="size-7 text-(--ui-primary)" />
        <span class="label">Arrivée</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Faint radial wash so the route reads as sitting on a map, without the weight
   of an actual Leaflet tile layer. */
.route-card {
  background-image: radial-gradient(
    circle at center,
    color-mix(in srgb, var(--ui-primary) 6%, transparent),
    transparent 70%
  );
}
.marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.label {
  font-size: 11px;
  color: var(--label-text);
}
</style>
