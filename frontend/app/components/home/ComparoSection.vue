<script setup lang="ts">
import type { IMotorcycle } from '~/types/motorcycles'

// The two bikes are passed in from the homepage's existing motorcycle fetch,
// so this stays a live preview rather than a hard-coded mock.
const props = defineProps<{ bikes: IMotorcycle[] }>()

const pair = computed(() => props.bikes.slice(0, 2))
const ready = computed(() => pair.value.length === 2)

interface Row {
  label: string
  unit: string
  values: [number, number]
  winner: 0 | 1
}

// For price the lower value wins; for the rest the higher value wins.
const rows = computed<Row[]>(() => {
  if (!ready.value) return []
  const [a, b] = pair.value as [IMotorcycle, IMotorcycle]
  return [
    { label: 'Puissance', unit: 'ch', values: [a.horsePower, b.horsePower], winner: a.horsePower >= b.horsePower ? 0 : 1 },
    { label: 'Couple', unit: 'Nm', values: [a.torque, b.torque], winner: a.torque >= b.torque ? 0 : 1 },
    { label: 'Prix', unit: '€', values: [a.price, b.price], winner: a.price <= b.price ? 0 : 1 }
  ]
})

function format(value: number, unit: string) {
  return unit === '€' ? `${value.toLocaleString('fr-FR')} €` : `${value} ${unit}`
}
</script>

<template>
  <div class="flex flex-row items-center gap-12 max-lg:flex-col!">
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

      <UButton size="xl" color="primary" to="/comparo" class="self-start rounded-full" style="color: white">
        Lancer une comparaison
      </UButton>
    </div>

    <!-- right: live comparison preview -->
    <div
      class="w-full max-w-md flex-1 overflow-hidden rounded-[20px] border border-(--border-gray) bg-(--background)"
    >
      <template v-if="ready">
        <div class="grid grid-cols-2">
          <div
            v-for="(bike, i) in pair"
            :key="bike._id"
            class="flex flex-col items-center gap-2 p-6 max-lg:p-4!"
            :class="i === 0 ? 'border-r border-(--border-gray)' : ''"
          >
            <img
              :src="bike.imageUrl || '/images/accueil/Hornet.png'"
              :alt="bike.name"
              class="h-24 w-full object-contain max-lg:h-16!"
            />
            <span class="text-center font-semibold">{{ bike.name }}</span>
          </div>
        </div>

        <div
          v-for="row in rows"
          :key="row.label"
          class="grid grid-cols-2 border-t border-(--border-gray)"
        >
          <div
            v-for="i in [0, 1]"
            :key="i"
            class="flex items-center justify-center gap-2 p-4 max-lg:p-3!"
            :class="[i === 0 ? 'border-r border-(--border-gray)' : '', row.winner === i ? 'bg-(--ui-primary)/5' : '']"
          >
            <UIcon
              v-if="row.winner === i"
              name="i-lucide-check"
              class="size-5 shrink-0 text-(--ui-primary)"
              aria-hidden="true"
            />
            <span class="flex flex-col items-center leading-tight">
              <span class="font-semibold" :class="row.winner === i ? 'text-(--ui-primary)' : ''">
                {{ format(row.values[i], row.unit) }}
              </span>
              <span class="text-xs text-gray-500">{{ row.label }}</span>
            </span>
          </div>
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
