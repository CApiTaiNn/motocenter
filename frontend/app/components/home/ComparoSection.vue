<script setup lang="ts">
import type { IMotorcycle } from '~/types/motorcycles'

// The two bikes are passed in from the homepage's existing motorcycle fetch,
// so this stays a live preview rather than a hard-coded mock.
// `reverse` is owned by the parent so the home page decides the zig-zag from
// each section's position, instead of each section hardcoding its side.
const props = withDefaults(
  defineProps<{ bikes: IMotorcycle[]; reverse?: boolean }>(),
  { reverse: false }
)

const pair = computed(() => props.bikes.slice(0, 2))
const ready = computed(() => pair.value.length === 2)

// Specs shown as comparison slide-bars — same component & visual as the
// /comparo results page (two mirrored bars scaled to the higher value).
const SPECS = ['horsePower', 'torque', 'price'] as const
</script>

<template>
  <div class="flex items-center gap-12 max-lg:flex-col!" :class="reverse ? 'flex-row-reverse' : 'flex-row'">
    <!-- left: pitch + CTA -->
    <div class="flex flex-1 flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h2>Comparez deux motos <span class="text-(--ui-primary)">en un clin d'œil</span></h2>
        <p class="max-lg:text-sm!">
          Depuis 1868, des milliers de modèles ont vu le jour. Confrontez leurs
          performances, leur prix et leurs caractéristiques pour trouver celle qui
          vous correspond.
        </p>
      </div>

      <UButton size="xl" color="primary" to="/comparo" class="self-start rounded-full text-white">
        Lancer une comparaison
      </UButton>
    </div>

    <!-- right: live comparison preview -->
    <div
      class="w-full flex-1 overflow-hidden rounded-[20px] border border-(--border-gray) bg-(--background)"
    >
      <template v-if="ready">
        <div class="grid grid-cols-2">
          <div
            v-for="bike in pair"
            :key="bike._id"
            class="flex flex-col items-center gap-2 p-6 max-lg:p-4!"
          >
            <img
              :src="bike.imageUrl || '/images/accueil/Hornet.png'"
              :alt="bike.name"
              class="h-24 w-full object-contain max-lg:h-16!"
            />
            <span class="text-center font-semibold">{{ bike.name }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-5 border-t border-(--border-gray) p-6 max-lg:p-4!">
          <ResultatFieldNumber
            v-for="spec in SPECS"
            :key="spec"
            :field-name="spec"
            :first-value="Number(pair[0]?.[spec] ?? 0)"
            :second-value="Number(pair[1]?.[spec] ?? 0)"
          />
        </div>
      </template>

      <!-- fallback so the section never reads as empty before the bikes load -->
      <div v-else class="flex items-center justify-center gap-5 p-12">
        <UIcon name="i-lucide-bike" class="size-12 text-(--ui-primary)/40" aria-hidden="true" />
        <span class="font-semibold text-(--ui-primary)">VS</span>
        <UIcon name="i-lucide-bike" class="size-12 text-(--ui-primary)/40" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>
