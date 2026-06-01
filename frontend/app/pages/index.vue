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

interface IStatCount {
  value: number
  suffix: string
  urlImg: string
}

const connexionModal = useConnexionModal()

const itemsCaroussel = ref<IMotorcycle[]>([])
const apiBase = useRuntimeConfig().public.apiBase
const dynamicStats = ref<IStatCount[]>([])

// Count-up only starts once the stats row scrolls into view
const statsRow = ref<HTMLElement | null>(null)
const statsStarted = ref(false)
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
    $fetch<number>(`${apiBase}brands/count`),
    $fetch<number>(`${apiBase}motorcycles/stats`),
    $fetch<number>(`${apiBase}motorcycles/count`)
  ])

  dynamicStats.value.push({
    value: totalBrands,
    suffix: 'Marques',
    urlImg: '/images/accueil/icon_Binocle.png'
  })
  if (totalHorsePower)
    dynamicStats.value.push({
      value: totalHorsePower,
      suffix: 'Chevaux',
      urlImg: '/images/accueil/icon_Settings.png'
    })
  if (totalMotorcycles)
    dynamicStats.value.push({
      value: totalMotorcycles,
      suffix: 'Motos',
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
  if (statsRow.value) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          statsStarted.value = true
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(statsRow.value)
  }

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
          <div ref="statsRow" class="row justify-content-center max-lg:gap-4!">
            <StatsHome
              v-for="item in dynamicStats"
              :key="item.suffix"
              :value="item.value"
              :suffix="item.suffix"
              :url-img="item.urlImg"
              :started="statsStarted"
            />
          </div>
        </div>
        <div class="stats-group">
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
      <div class="carb-anim" aria-hidden="true">
        <span class="air air-1" />
        <span class="air air-2" />
        <span class="air air-3" />
        <span class="air air-4" />
        <span class="air air-5" />
        <span class="fuel fuel-1" />
        <span class="fuel fuel-2" />
        <span class="fuel fuel-3" />
        <span class="fuel fuel-4" />
      </div>
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
  /* the slide-in animations start at translateX(±100vw); clip the resulting
     horizontal overflow so it doesn't show a page-wide x-scrollbar */
  overflow-x: hidden;
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

/* Carburetor-style background: red air streaks flow left → right while fuel
   droplets rise from the bottom, merge into the airflow (~mid height) and get
   carried off to the right. Blurred, slow, and kept behind the box content. */
.carb-anim {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  filter: blur(3px);
}

.invitation > :not(.carb-anim) {
  position: relative;
  z-index: 1;
}

/* Air: horizontal streaks sweeping across */
.air {
  position: absolute;
  left: -45%;
  height: 20px;
  background-color: var(--ui-primary);
  /* a single flowing, asymmetric gust curve (not box-wide, not tiled) */
  -webkit-mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20200%2030'%20preserveAspectRatio='none'%3E%3Cpath%20d='M0,15%20C35,3%2065,27%20100,14%20C135,4%20165,26%20200,13'%20fill='none'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'/%3E%3C/svg%3E")
    no-repeat center / 100% 100%;
  mask: url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20200%2030'%20preserveAspectRatio='none'%3E%3Cpath%20d='M0,15%20C35,3%2065,27%20100,14%20C135,4%20165,26%20200,13'%20fill='none'%20stroke='black'%20stroke-width='2'%20stroke-linecap='round'/%3E%3C/svg%3E")
    no-repeat center / 100% 100%;
  opacity: 0;
  animation: carb-gust linear infinite;
}

/* 5 gusts: each a different width (wavelength), height (amplitude), vertical
   position, speed, delay and drift, so the wind never repeats the same way */
.air-1 {
  top: 22%;
  width: 38%;
  height: 20px;
  --o: 0.45;
  --drift: 7px;
  animation-duration: 9s;
}
.air-2 {
  top: 40%;
  width: 28%;
  height: 15px;
  --o: 0.35;
  --drift: -5px;
  animation-duration: 12s;
  animation-delay: 2s;
}
.air-3 {
  top: 56%;
  width: 46%;
  height: 26px;
  --o: 0.4;
  --drift: 9px;
  animation-duration: 10s;
  animation-delay: 4s;
}
.air-4 {
  top: 70%;
  width: 32%;
  height: 14px;
  --o: 0.32;
  --drift: -6px;
  animation-duration: 13s;
  animation-delay: 1s;
}
.air-5 {
  top: 32%;
  width: 42%;
  height: 22px;
  --o: 0.4;
  --drift: 6px;
  animation-duration: 11s;
  animation-delay: 6s;
}

/* Fuel: droplets rising from the bottom into the airflow */
.fuel {
  position: absolute;
  bottom: -4%;
  left: var(--x);
  width: 10px;
  height: 13px;
  border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
  background: radial-gradient(
    circle at 50% 35%,
    color-mix(in srgb, var(--ui-primary) 90%, transparent),
    color-mix(in srgb, var(--ui-primary) 30%, transparent) 70%,
    transparent 72%
  );
  opacity: 0;
  animation: carb-fuel ease-in infinite;
}
.fuel-1 {
  --x: 14%;
  animation-duration: 6.5s;
  animation-delay: 0.5s;
}
.fuel-2 {
  --x: 32%;
  animation-duration: 8s;
  animation-delay: 2.2s;
}
.fuel-3 {
  --x: 48%;
  animation-duration: 7s;
  animation-delay: 3.6s;
}
.fuel-4 {
  --x: 24%;
  animation-duration: 9s;
  animation-delay: 5s;
}

@keyframes carb-gust {
  0% {
    left: -45%;
    opacity: 0;
    transform: translateY(0);
  }
  15% {
    opacity: var(--o, 0.4);
  }
  50% {
    transform: translateY(var(--drift, 6px));
  }
  85% {
    opacity: var(--o, 0.4);
  }
  100% {
    left: 110%;
    opacity: 0;
    transform: translateY(0);
  }
}

@keyframes carb-fuel {
  0% {
    left: var(--x);
    bottom: -4%;
    opacity: 0;
    transform: translate(0, 0) scale(1);
  }
  10% {
    opacity: 0.9;
  }
  25% {
    transform: translate(-7px, 0) scale(0.95);
  }
  40% {
    transform: translate(7px, 0) scale(0.9);
  }
  48% {
    left: var(--x);
    bottom: 46%;
    opacity: 0.9;
    transform: translate(0, 0) scale(0.85);
  }
  65% {
    transform: translateY(-9px) scale(0.8);
  }
  82% {
    transform: translateY(7px) scale(0.72);
  }
  94% {
    opacity: 0.9;
  }
  100% {
    left: 104%;
    bottom: 46%;
    opacity: 0;
    transform: translateY(-4px) scale(0.62);
  }
}

@media (prefers-reduced-motion: reduce) {
  .air,
  .fuel {
    animation: none;
    opacity: 0;
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
