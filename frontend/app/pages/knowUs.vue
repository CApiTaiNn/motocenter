<script setup lang="ts">
const team = [
  { name: 'Sloan Morgant', role: 'Chef de projet' },
  { name: 'Loris Caruhel', role: 'Expert BDD' },
  { name: 'Léo Bruneau-Gache', role: 'Développeur' },
  { name: 'Milio Lintanff-Castel', role: 'Développeur' },
  { name: 'Nominoë Barbotaud', role: 'Stagiaire' }
]
</script>

<template>
  <div class="page">
    <HeaderInfo :scroll-to-element-id="'content'">
      <template #title>
        <h1>
          À propos de <br />
          <span style="color: red">nous</span>
        </h1>
      </template>
      <template #subtitle>
        <p class="max-lg:text-xs! max-lg:text-center max-lg:font-[var(--font-main)]">Découvrez notre histoire et nos engagements</p>
      </template>
    </HeaderInfo>

    <div id="content" class="max-w-[1000px] mx-auto mt-[10dvh]">
      <h3 class="text-center mb-12 h3-mobile max-lg:font-[var(--font-main)] max-lg:text-base! max-lg:font-semibold max-lg:text-center">En quelques mots</h3>
      <br />

      <section class="mb-16">
        <h4 class="font-['Krona_One',sans-serif] text-sm tracking-[0.08em] uppercase text-gray-500 mb-6 pl-2 border-l-[3px] border-solid border-[var(--ui-primary)]">L'équipe</h4>
        <article class="flex items-center gap-12 max-lg:flex-col!">
          <div class="flex flex-col gap-6 flex-1">
            <p class="max-lg:font-[var(--font-main)] max-lg:text-xs! max-lg:text-center max-lg:m-[2em]">
              <strong>Sloan Morgant</strong> a eu cette idée de projet en 2025 et
              il a créé notre équipe les <strong>Breizh Devs</strong>.
            </p>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              <div v-for="member in team" :key="member.name" class="flex items-center gap-3 px-3 py-2 border border-solid border-gray-300 rounded-xl bg-[var(--background)]">
                <UAvatar
                  :alt="member.name"
                  :ui="{ root: 'bg-(--ui-primary) text-white' }"
                  size="lg"
                >
                  {{ member.name.split(' ').map((p) => p[0]).join('') }}
                </UAvatar>
                <div class="flex flex-col">
                  <p class="font-semibold text-sm leading-[1.2]">{{ member.name }}</p>
                  <p class="text-gray-500 text-xs">{{ member.role }}</p>
                </div>
              </div>
            </div>
          </div>

          <img
            src="../assets/images/knowUs/Teamwork.png"
            alt="Image de travail d'équipe"
            class="w-[500px] h-auto max-lg:w-full! max-lg:max-w-[500px]"
          />
        </article>
      </section>

      <section class="mb-16">
        <h4 class="font-['Krona_One',sans-serif] text-sm tracking-[0.08em] uppercase text-gray-500 mb-6 pl-2 border-l-[3px] border-solid border-[var(--ui-primary)]">La mission</h4>
        <article class="flex items-center gap-12 max-lg:flex-col-reverse!">
          <img
            src="../assets/images/knowUs/Gsxr.png"
            alt="image du gsxr de Sloan"
            class="w-[500px] h-auto max-lg:w-full! max-lg:max-w-[500px]"
          />
          <p class="flex-1 w-[70dvw] max-lg:font-[var(--font-main)] max-lg:text-xs! max-lg:text-center max-lg:w-full!">
            <strong>MotoCenter</strong> vise à se positionner comme une
            plateforme centrale et cohérente, combinant aide au choix d’une moto
            et partage communautaire. Afin de garantir la pertinence de ses
            choix fonctionnels et techniques, il est indispensable d’analyser
            les solutions existantes.
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
