<script setup lang="ts">
useSeoMeta({
  title: 'Qui sommes-nous',
  description: "L'équipe derrière Vroom et le projet."
})

const team = [
  { name: 'Sloan Morgant', role: 'Chef de projet' },
  { name: 'Loris Caruhel', role: 'Expert BDD' },
  { name: 'Léo Bruneau-Gache', role: 'Développeur' },
  { name: 'Milio Lintanff-Castel', role: 'Développeur' },
  { name: 'Nominoë Barbotaud', role: 'Stagiaire' }
]
</script>

<template>
  <div>
    <HeaderInfo :scroll-to-element-id="'content'">
      <template #title>
        <h1>
          À propos de <br />
          <span class="text-(--ui-primary)">nous</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="max-lg:text-center max-lg:text-xs! max-lg:font-(--font-main)">Découvrez notre histoire et nos engagements</p>
      </template>
    </HeaderInfo>

    <div id="content" class="mx-auto mt-[10dvh] max-w-[1000px]">
      <h3 class="mb-12 text-center max-lg:text-center max-lg:font-(family-name:--font-main) max-lg:text-base! max-lg:font-semibold">En quelques mots</h3>
      <br />

      <section class="mb-16">
        <h4 class="mb-6 border-l-[3px] border-solid border-(--ui-primary) pl-2 font-['Krona_One',sans-serif] text-sm tracking-[0.08em] text-gray-500 uppercase">L'équipe</h4>
        <article class="flex items-center gap-12 max-lg:flex-col!">
          <div class="flex flex-1 flex-col gap-6">
            <p class="max-lg:m-[2em] max-lg:text-center max-lg:text-xs! max-lg:font-(--font-main)">
              <strong>Sloan Morgant</strong> a eu cette idée de projet en 2025 et
              il a créé notre équipe les <strong>Breizh Devs</strong>.
            </p>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              <div v-for="member in team" :key="member.name" class="flex items-center gap-3 rounded-xl border border-solid border-gray-300 bg-(--background) px-3 py-2">
                <UAvatar
                  :alt="member.name"
                  :ui="{ root: 'bg-primary text-white' }"
                  size="lg"
                >
                  {{ member.name.split(' ').map((p) => p[0]).join('') }}
                </UAvatar>
                <div class="flex flex-col">
                  <p class="text-sm leading-[1.2] font-semibold">{{ member.name }}</p>
                  <p class="text-xs text-gray-500">{{ member.role }}</p>
                </div>
              </div>
            </div>
          </div>

          <img
            src="../assets/images/knowUs/Teamwork.png"
            alt="Image de travail d'équipe"
            class="h-auto w-[500px] max-lg:w-full! max-lg:max-w-[500px]"
          />
        </article>
      </section>

      <section class="mb-16">
        <h4 class="mb-6 border-l-[3px] border-solid border-(--ui-primary) pl-2 font-['Krona_One',sans-serif] text-sm tracking-[0.08em] text-gray-500 uppercase">La mission</h4>
        <article class="flex items-center gap-12 max-lg:flex-col-reverse!">
          <img
            src="../assets/images/knowUs/Gsxr.png"
            alt="image du gsxr de Sloan"
            class="h-auto w-[500px] max-lg:w-full! max-lg:max-w-[500px]"
          />
          <p class="w-[70dvw] flex-1 max-lg:w-full! max-lg:text-center max-lg:text-xs! max-lg:font-(--font-main)">
            <strong>MotoCenter</strong> vise à se positionner comme une
            plateforme centrale et cohérente, combinant l'aide au choix d'une moto
            et partage communautaire.
          </p>
        </article>
      </section>
    </div>
  </div>
</template>

<style scoped>
strong {
  font-weight: bold;
}
</style>
