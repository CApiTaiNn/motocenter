<script setup lang="ts">
// Static thread mockup — a sober preview of a real bike question and answer.
// Direction owned by the parent (see ComparoSection) — defaults to non-reversed.
withDefaults(defineProps<{ reverse?: boolean }>(), { reverse: false })
</script>

<template>
  <div class="flex items-center gap-12 max-lg:flex-col!" :class="reverse ? 'flex-row-reverse' : 'flex-row'">
    <div class="flex flex-1 flex-col gap-6">
      <div class="flex flex-col gap-3">
        <h2>Une question ? <span class="text-(--ui-primary)">La communauté répond</span></h2>
        <p class="max-lg:text-sm!">
          Entretien, pannes, conseils d'achat — échangez avec des passionnés qui
          connaissent votre machine.
        </p>
      </div>

      <UButton size="xl" color="primary" to="/forum" class="self-start rounded-full text-white">
        Rejoindre le forum
      </UButton>
    </div>

    <!-- Sober thread mockup: a question on a bike issue and a reply -->
    <div class="flex w-full max-w-md flex-1 flex-col gap-4 rounded-[20px] border border-(--border-gray) bg-(--background) p-6">
      <div class="flex items-start gap-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--ui-primary)/10 text-sm font-semibold text-(--ui-primary)">
          M
        </span>
        <div class="flex flex-col gap-1 rounded-2xl rounded-tl-sm bg-(--background-secondary) px-4 py-3">
          <span class="text-sm font-semibold">Marc · Ducati Monster 821</span>
          <p class="text-sm!">Démarrage difficile à froid depuis l'hiver. Une idée d'où ça vient ?</p>
        </div>
      </div>
      <div class="flex flex-row-reverse items-start gap-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--ui-primary) text-sm font-semibold text-white">
          L
        </span>
        <div class="flex flex-col gap-1 rounded-2xl rounded-tr-sm border border-(--border-gray) px-4 py-3">
          <span class="text-sm font-semibold">Léa</span>
          <p class="text-sm!">Vérifie la batterie et le jeu aux soupapes — classique sur ce modèle.</p>
        </div>
      </div>
    </div>
  </div>
</template>
