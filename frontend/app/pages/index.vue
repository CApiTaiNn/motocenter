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
  <div>
    <div class="ambient-glow ambient-glow--left" aria-hidden="true" />
    <div class="ambient-glow ambient-glow--right" aria-hidden="true" />
  <main class="relative z-10 flex flex-col overflow-x-hidden">
    <section class="relative isolate flex h-screen flex-col items-center justify-center py-0! max-lg:h-[60vh]! max-lg:gap-8!">
      <span class="hero-glow" aria-hidden="true" />
      <h1 class="text-center">
        Trouver <span style="color: var(--ui-primary)">la moto</span>
        <br />
        qui vous convient
      </h1>

      <div class="flex flex-row items-center gap-4">
        <UButton
          size="xl"
          color="primary"
          class="button rounded-full max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
          style="color: white"
          to="/comparo"
          >Essayer</UButton
        >
        <UButton
          v-if="!isAuthenticated"
          size="xl"
          color="neutral"
          class="button cursor-pointer rounded-full max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
          trailing-icon="i-lucide-arrow-right"
          variant="outline"
          @click="connexionModal.open()"
          >Se connecter</UButton
        >
      </div>

      <div class="relative flex flex-row items-end justify-center gap-4">
        <img
          src="/images/accueil/R1_fond.png"
          alt="Moto"
          class="moto-left h-auto max-h-[80vh] w-full min-w-[38%] flex-[1.1] object-contain object-bottom"
        />
        <img
          src="/images/accueil/BMW_fond.png"
          alt="Moto"
          class="moto-right h-auto max-h-[80vh] w-full min-w-[38%] flex-1 object-contain object-bottom"
        />
      </div>
      <UIcon
        name="i-lucide-chevron-down"
        class="scroll-cue absolute bottom-8 size-8 text-(--ui-primary) opacity-70"
        aria-hidden="true"
      />
    </section>
    <!-- Alternating zig-zag: comparo left, balade right, forum left -->
    <section class="band flex flex-col">
      <ComparoSection :bikes="itemsCaroussel" />
    </section>
    <section class="flex flex-col">
      <RideSection :reverse="true" />
    </section>
    <section class="band flex flex-col">
      <ForumSection />
    </section>
    <section class="flex flex-col gap-8">
      <h2 style="text-align: center">
        <span style="color: var(--ui-primary)">Motocenter</span>
        en quelques chiffres
      </h2>
      <article class="flex flex-col gap-16">
        <div class="flex flex-col gap-4">
          <div ref="statsRow" class="mx-[5%] flex flex-row justify-center gap-16 max-lg:gap-4!">
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
        <div class="flex flex-col gap-4">
          <div class="mx-[5%] flex flex-row justify-center gap-16 max-lg:gap-4!">
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
    <section class="band flex flex-col gap-8">
      <h2 style="text-align: center">Les best-sellers</h2>
      <ClientOnly>
        <CarrouselMotorcycles :items="itemsCaroussel" />
      </ClientOnly>
    </section>
    <section class="band flex flex-col gap-8">
      <h2 style="text-align: center">
        Ils nous font confiance
      </h2>
      <CarrouselSponsors />
    </section>
    <section class="flex justify-center">
      <UButton
        size="xl"
        color="neutral"
        class="button rounded-full max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
        icon="i-lucide-badge-check"
        style="margin-bottom: 20vh"
        >Approuvé par 100 utilisateurs</UButton
      >
    </section>
  </main>
  </div>
</template>
<style scoped>
/* Full-bleed section bands: every <section> spans the viewport width with its
   content inset via padding (instead of margin), so alternating .band
   backgrounds read as edge-to-edge bands. Responsive insets live here. */
section {
  padding-block: 4rem;
  padding-inline: 10%;
}

/* "Lighter" band sitting over the page background; sections without it fall
   through to the page background, giving the alternating black/lighter rhythm. */
.band {
  background-color: var(--background-secondary);
}

@media (max-width: 1024px) {
  section {
    padding-block: 3rem;
    padding-inline: 8%;
  }
}

@media (max-width: 768px) {
  section {
    padding-inline: 5%;
  }
}

/* Soft demi-circle of brand light rising from behind/under the two hero bikes.
   Its centre sits exactly on the hero's bottom edge and the lower half is
   clipped away, so the flat "horizon" lands at the boundary with the history
   section and, on the black background, reads as a half-circle giving the
   bikes depth. Sits behind all hero content (isolate + z-index:-1). */
.hero-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: min(75%, 1000px);
  aspect-ratio: 1 / 1;
  /* centre the circle on the hero's bottom edge */
  transform: translate(-50%, 50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--ui-primary) 50%, transparent),
    color-mix(in srgb, var(--ui-primary) 15%, transparent) 45%,
    transparent 70%
  );
  filter: blur(60px);
  /* drop the lower half: the cut edge is the hero / history boundary */
  clip-path: inset(0 0 50% 0);
  pointer-events: none;
  z-index: -1;
}

/* Ambient red "light leak" glows fixed to the viewport's left & right edges,
   sitting behind all page content (main is z-10) for atmosphere. Decorative. */
.ambient-glow {
  position: fixed;
  z-index: 0;
  width: min(70vw, 760px);
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    color-mix(in srgb, var(--ui-primary) 28%, transparent),
    transparent 70%
  );
  filter: blur(130px);
  pointer-events: none;
}

.ambient-glow--left {
  top: -12%;
  left: -22%;
}

.ambient-glow--right {
  right: -22%;
  bottom: -12%;
}

/* gentle, offset breathing so the two lights feel alive rather than static */
@media (prefers-reduced-motion: no-preference) {
  .ambient-glow {
    animation: ambient-pulse 9s ease-in-out infinite;
  }
  .ambient-glow--right {
    animation-delay: -4.5s;
  }
}

@keyframes ambient-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.scroll-cue {
  animation: scroll-bounce 1.8s ease-in-out infinite;
}

@keyframes scroll-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(8px); }
}

.moto-left {
  animation: slide-left-to-right 2s ease-in-out;
}

.moto-right {
  animation: slide-right-to-left 2s ease-in-out;
}

:deep(.button) {
  font-size: small;
  padding: 0.75rem 3rem;
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
