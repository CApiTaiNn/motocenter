<script setup lang="ts">
import CarrouselSponsors from '~/components/CarrouselSponsors.vue'
import type { IMotorcycle } from '~/types/motorcycles'
import StatsHome from '~/components/card/StatsHome.vue'

import { useConnexionModal } from '~/composables/useConnexionModal'
import { useAuth } from '~/composables/useAuth'

const { isAuthenticated } = useAuth()

interface IItemTab {
  content: string
  urlImg: string
}

const connexionModal = useConnexionModal()

const itemsCaroussel = ref<IMotorcycle[]>([])
const apiBase = useRuntimeConfig().public.apiBase
const dynamicStats = ref<IItemTab[]>([])
const itemsTab = reactive<IItemTab[]>([
  {
    content: 'Base de données complètes',
    urlImg: '/images/accueil/icon_checked_classic.png'
  },
  {
    content: 'Communautée active',
    urlImg: '/images/accueil/icon_clock.png'
  },
  {
    content: 'Equipe passionée',
    urlImg: '/images/accueil/icon_idea.png'
  }
])

async function fetchStats() {
  // Independent count endpoints — fetch concurrently
  const [totalBrands, totalHorsePower, totalMotorcycles] = await Promise.all([
    $fetch<{ totalBrands: number }>(`${apiBase}brands/count`),
    $fetch<{ totalHorsePower: number }>(`${apiBase}motorcycles/stats`),
    $fetch<{ totalMotorcycles: number }>(`${apiBase}motorcycles/count`)
  ])

  dynamicStats.value.push({
    content: `${totalBrands} Marques`,
    urlImg: '/images/accueil/icon_Binocle.png'
  })
  if (totalHorsePower)
    dynamicStats.value.push({
      content: `${totalHorsePower} Chevaux`,
      urlImg: '/images/accueil/icon_Settings.png'
    })
  if (totalMotorcycles)
    dynamicStats.value.push({
      content: `${totalMotorcycles} Motos`,
      urlImg: '/images/accueil/icon_moto.png'
    })
}
async function fetchMotocycles() {
  const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        project: 'name,horsePower,torque,price,imageUrl'
      }
    }
  )
  itemsCaroussel.value = data.motorcycles
}

onMounted(async () => {
  await Promise.all([fetchMotocycles(), fetchStats()])
})
</script>
<template>
  <main>
    <section class="hero-header max-lg:h-[60vh]! max-lg:gap-8! max-lg:mx-[5%]!">
      <h1 class="title h1-mobile">
        Trouver <span style="color: var(--ui-primary)">la moto</span>
        <br />
        qui vous convient
      </h1>

      <div class="list">
        <UButton
          size="xl"
          color="primary"
          class="rounded-full button max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
          style="color: white"
          to="/comparo"
          >Essayer</UButton
        >
        <UButton
          v-if="!isAuthenticated"
          size="xl"
          color="neutral"
          class="rounded-full button cursor-pointer max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
          trailing-icon="i-lucide-arrow-right"
          variant="outline"
          @click="connexionModal.open()"
          >Se connecter</UButton
        >
      </div>

      <div class="hero-images">
        <img
          src="/images/accueil/R1_fond.png"
          alt="Moto"
          class="img-cover moto-left"
        />
        <img
          src="/images/accueil/BMW_fond.png"
          alt="Moto"
          class="img-cover moto-right"
        />
      </div>
      <UIcon
        name="i-lucide-chevron-down"
        class="scroll-cue size-8 text-(--ui-primary)"
        aria-hidden="true"
      />
    </section>
    <section class="max-md:mx-[5%]! max-lg:mx-[8%]!">
      <div class="list">
        <article>
          <h2 class="h2-mobile max-lg:text-start">Un peu d'histoire</h2>
          <p class="p-mobile max-lg:text-xs!">
            Depuis que l'homme a inventé le moteur thermique, il a toujours
            cherché à repousser ses limites : plus de
            <span class="bold">puissance</span>, plus de
            <span class="bold">couple</span>, plus de
            <span class="bold">vitesse</span>. Depuis
            <span class="bold">1868</span>, des milliers de modèles de motos ont
            vu le jour. Et si toi aussi tu veux savoir laquelle correspond le
            mieux à ce que tu recherches...
          </p>
        </article>
        <img src="/images/accueil/Hornet.png" alt="Moto" class="img-cover" />
      </div>
    </section>
    <section class="basic-section max-md:mx-[5%]! max-lg:mx-[8%]!">
      <h2 class="h2-mobile" style="text-align: center">
        <span style="color: var(--ui-primary)">Motocenter</span>
        en quelques chiffres
      </h2>
      <article class="column">
        <div class="stats-group">
          <h4 class="stats-group-label">En chiffres</h4>
          <div class="row justify-content-center max-lg:gap-4!">
            <StatsHome
              v-for="item in dynamicStats"
              :key="item.content"
              :content="item.content"
              :url-img="item.urlImg"
            />
          </div>
        </div>
        <div class="stats-group">
          <h4 class="stats-group-label">Notre promesse</h4>
          <div class="row justify-content-center max-lg:gap-4!">
            <StatsHome
              v-for="item in itemsTab"
              :key="item.content"
              :content="item.content"
              :url-img="item.urlImg"
            />
          </div>
        </div>
      </article>
    </section>
    <section class="basic-section max-md:mx-[5%]! max-lg:mx-[8%]!">
      <h2 class="h2-mobile" style="text-align: center">Les best-sellers</h2>
      <ClientOnly>
        <CarrouselMotorcycles :items="itemsCaroussel" />
      </ClientOnly>
    </section>
    <section class="invitation justify-content-center basic-section max-md:mx-[10%]! max-lg:mx-[15%]! max-md:p-8! max-md:gap-8!">
      <h3 class="h3-mobile" style="text-align: center">
        Tester le comparateur dès maintenant !
      </h3>
      <div>
        <UButton
          size="xl"
          color="primary"
          class="rounded-full button max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
          style="color: white"
          to="/comparo"
          >Essayer</UButton
        >
      </div>
    </section>
    <section class="basic-section max-md:mx-[5%]! max-lg:mx-[8%]!">
      <h2 class="h2-mobile" style="text-align: center">
        Ils nous font confiance
      </h2>
      <CarrouselSponsors />
    </section>
    <section class="justify-content-center max-md:mx-[5%]! max-lg:mx-[8%]!">
      <UButton
        size="xl"
        color="neutral"
        class="rounded-full button max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
        icon="i-lucide-badge-check"
        style="margin-bottom: 20vh"
        >Approuvé par 100 utilisateurs</UButton
      >
    </section>
  </main>
</template>
<style scoped>
main {
  display: flex;
  flex-direction: column;
  gap: var(--space-5xl);
}

section {
  margin: 0 10%;
}

.basic-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.hero-header {
  display: flex;
  flex-direction: column;

  justify-content: center;
  align-items: center;

  height: 100vh;
  position: relative;
}

.scroll-cue {
  position: absolute;
  bottom: 2rem;
  animation: scroll-bounce 1.8s ease-in-out infinite;
  opacity: 0.7;
}

@keyframes scroll-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

.stats-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.stats-group-label {
  text-align: center;
  font-family: 'Krona One', sans-serif;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-gray-mid);
}

.title {
  text-align: center;
}

.list {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-md);
}

.hero-images {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: flex-end;
  gap: var(--space-md);
  position: relative;
}

.img-cover {
  flex: 1; /* = flex-grow: 1; flex-shrink: 1; flex-basis: 0%; */
  width: 100%;
  min-width: 38%;
  height: auto;
  max-height: 80vh;
  object-fit: contain;
  object-position: center bottom;
}

.moto-left {
  animation: slide-left-to-right 2s ease-in-out;
  flex: 1.1; /* Agrandir légèrement le R1 parce que image plus petite */
}

.moto-right {
  animation: slide-right-to-left 2s ease-in-out;
}

.row {
  display: flex;
  flex-direction: row;
  gap: var(--space-3xl);

  margin: 0 5%;
}

.column {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

.justify-content-center {
  display: flex;
  justify-content: center;
}

.bold {
  font-weight: bold;
}

.invitation {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--ui-primary) 18%, transparent), transparent 60%),
    var(--background-secondary);
  border: solid var(--border-thick) var(--border-gray);

  margin: 0 20%;
  padding: var(--space-3xl);

  gap: var(--space-2xl);
  overflow: hidden;
}

.invitation::before {
  content: '';
  position: absolute;
  inset: auto -2rem -2rem auto;
  width: 11rem;
  height: 11rem;
  background-image: radial-gradient(circle, color-mix(in srgb, var(--ui-primary) 35%, transparent), transparent 70%);
  pointer-events: none;
  animation: invitation-float-a 7s ease-in-out infinite;
}

.invitation::after {
  content: '';
  position: absolute;
  inset: -3rem auto auto -3rem;
  width: 13rem;
  height: 13rem;
  background-image: radial-gradient(circle, color-mix(in srgb, var(--ui-primary) 24%, transparent), transparent 70%);
  pointer-events: none;
  animation: invitation-float-b 9s ease-in-out infinite;
}

@keyframes invitation-float-a {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.7;
  }
  25% {
    transform: translate(-3rem, -1.5rem) scale(1.3);
    opacity: 1;
  }
  50% {
    transform: translate(-1rem, -3.5rem) scale(1.1);
    opacity: 0.85;
  }
  75% {
    transform: translate(-3.5rem, -0.5rem) scale(1.25);
    opacity: 1;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.7;
  }
}

@keyframes invitation-float-b {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
  25% {
    transform: translate(3rem, 2rem) scale(1.25);
    opacity: 0.95;
  }
  50% {
    transform: translate(4rem, -1rem) scale(1.1);
    opacity: 0.75;
  }
  75% {
    transform: translate(1.5rem, 3rem) scale(1.3);
    opacity: 0.95;
  }
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.6;
  }
}

@media (prefers-reduced-motion: reduce) {
  .invitation::before,
  .invitation::after {
    animation: none;
  }
}

:deep(.button) {
  font-size: small;
  padding: var(--space-sm) var(--space-2xl);
}

@keyframes slide-left-to-right {
  from {
    transform: translateX(-100vw);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slide-right-to-left {
  from {
    transform: translateX(100vw);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

</style>
