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
const toast = useToast()

const itemsCaroussel = ref<IMotorcycle[]>([])
// Featured bike for the pinned product showcase (first best-seller).
const featured = computed(() => itemsCaroussel.value[0])
const featuredSpecs = computed(() => {
  const m = featured.value
  if (!m) return []
  return [
    { value: m.horsePower, unit: 'ch', label: 'Puissance', icon: 'i-lucide-zap' },
    { value: m.torque, unit: 'Nm', label: 'Couple', icon: 'i-lucide-gauge' },
    { value: m.weight, unit: 'kg', label: 'Poids', icon: 'i-lucide-weight' },
    { value: m.price, unit: '€', label: 'Prix', icon: 'i-lucide-tag' }
  ].filter((s) => s.value != null)
})

// Pinned showcase: the section is taller than the viewport, and scroll progress
// through it snaps the active spec one at a time. The spec list is translated so
// the active card sits at the centre; the others stay visible but dimmed. Snap
// (not a continuous slide) keeps every state clean — no half-way "lag" look.
const SPEC_STEP = 132 // px per card row (height + gap) in the translated list
const showcaseEl = ref<HTMLElement | null>(null)
const showcaseProgress = ref(0)
const activeSpec = computed(() => {
  const n = featuredSpecs.value.length
  return n > 1 ? Math.round(showcaseProgress.value * (n - 1)) : 0
})
const onShowcaseScroll = () => {
  const el = showcaseEl.value
  if (!el) return
  const travel = el.offsetHeight - window.innerHeight
  const scrolled = Math.min(Math.max(-el.getBoundingClientRect().top, 0), travel)
  showcaseProgress.value = travel > 0 ? scrolled / travel : 0
}
onMounted(() => {
  window.addEventListener('scroll', onShowcaseScroll, { passive: true })
  window.addEventListener('resize', onShowcaseScroll, { passive: true })
  onShowcaseScroll()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onShowcaseScroll)
  window.removeEventListener('resize', onShowcaseScroll)
})

const { apiBase, appName } = useRuntimeConfig().public
const dynamicStats = ref<IStatCount[]>([])
const totalUsers = ref(0)
// Holds a skeleton in the stat row until the counts arrive, so it never flashes
// empty before the numbers load.
const statsLoading = ref(true)

// Count-up only starts once the stats row scrolls into view
const statsRow = ref<HTMLElement | null>(null)
const statsStarted = ref(false)
const itemsTab = reactive<IItemTab[]>([
  {
    content: 'Base de données complète',
    urlImg: '/images/accueil/icon_checked_classic.png'
  },
  {
    content: 'Communauté active',
    urlImg: '/images/accueil/icon_clock.png'
  },
  {
    content: 'Équipe passionnée',
    urlImg: '/images/accueil/icon_idea.png'
  }
])

async function fetchStats() {
  try {
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
  } finally {
    statsLoading.value = false
  }
}
async function fetchUserCount() {
  totalUsers.value = await $fetch<number>(`${apiBase}users/count`)
}
async function fetchMotocycles() {
  const data = await $fetch<{ motorcycles: IMotorcycle[] }>(
    `${apiBase}motorcycles`,
    {
      params: {
        // The card shows brand, category/A2, year, weight and comparison count —
        // all must be projected or they render blank.
        project:
          'name,year,horsePower,torque,weight,price,imageUrl,brand,category,isAvailableA2,numberOfComparison'
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

  try {
    await Promise.all([fetchMotocycles(), fetchStats(), fetchUserCount()])
  } catch {
    toast.add({
      title: 'Chargement impossible',
      description: 'Impossible de charger les données. Réessayez plus tard.',
      color: 'error'
    })
  }
})
</script>
<template>
  <div>
    <div class="ambient-glow ambient-glow--left" aria-hidden="true" />
    <div class="ambient-glow ambient-glow--right" aria-hidden="true" />
  <main class="relative z-10 flex flex-col overflow-x-clip">
    <section class="relative isolate flex h-screen flex-col items-center justify-center py-0! max-lg:h-[60vh]! max-lg:gap-8!">
      <span class="hero-glow" aria-hidden="true" />
      <h1 v-reveal class="text-center">
        Trouver <span class="text-(--ui-primary)">la moto</span>
        <br />
        qui vous convient
      </h1>

      <div v-reveal="120" class="flex flex-row items-center gap-4">
        <UButton
          size="xl"
          color="primary"
          class="button rounded-full text-white max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
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

      <div v-reveal="240" class="relative flex flex-row items-end justify-center gap-4">
        <img
          src="/images/accueil/R1_fond.png"
          alt=""
          fetchpriority="high"
          decoding="async"
          class="moto-left h-auto max-h-[80vh] w-full min-w-[38%] flex-[1.1] object-contain object-bottom"
        />
        <img
          src="/images/accueil/BMW_fond.png"
          alt=""
          decoding="async"
          class="moto-right h-auto max-h-[80vh] w-full min-w-[38%] flex-1 object-contain object-bottom"
        />
      </div>
      <UIcon
        name="i-lucide-chevron-down"
        class="scroll-cue absolute bottom-8 size-8 text-(--ui-primary) opacity-70"
        aria-hidden="true"
      />
    </section>
    <!-- Alternating zig-zag: comparo left, balade right, forum left.
         Each feature section fills the viewport height on desktop. -->
    <section class="band flex flex-col lg:min-h-screen lg:justify-center">
      <ComparoSection v-reveal :bikes="itemsCaroussel" />
    </section>
    <section class="flex flex-col lg:min-h-screen lg:justify-center">
      <RideSection v-reveal :reverse="true" />
    </section>
    <section class="band flex flex-col lg:min-h-screen lg:justify-center">
      <ForumSection v-reveal />
    </section>

    <!-- Product showcase: the whole section pins while scroll snaps through the
         spec list one card at a time. The active card is centred and elevated;
         the others stay visible but dimmed and slide with a smooth transition
         (a snap per item, so no half-way "lag"). -->
    <section
      v-if="featured"
      ref="showcaseEl"
      class="overflow-x-clip py-0!"
      :style="{
        height: `calc(100vh + ${Math.max(featuredSpecs.length - 1, 1) * 30}vh)`
      }"
    >
      <div class="sticky top-0 flex h-screen items-center">
        <div class="grid w-full items-center gap-8 lg:grid-cols-2">
          <div class="flex flex-col items-center gap-4">
            <span class="text-sm font-semibold tracking-[0.15em] text-(--label-text) uppercase">
              Le modèle du moment
            </span>
            <img
              :src="featured.imageUrl"
              :alt="`${featured.brand?.name ?? ''} ${featured.name}`"
              class="w-full max-w-lg object-contain drop-shadow-2xl max-lg:max-w-xs!"
            />
            <p class="text-2xl font-bold max-lg:text-xl!">
              {{ featured.brand?.name }} {{ featured.name }}
            </p>
          </div>

          <!-- Translated spec list: active card centred, others dimmed. -->
          <div
            class="relative h-[460px] overflow-hidden mask-[linear-gradient(to_bottom,transparent,#000_18%,#000_82%,transparent)] max-lg:h-[360px]"
          >
            <div
              class="absolute inset-x-0 top-1/2 flex flex-col items-center gap-5 will-change-transform"
              :style="{
                transform: `translateY(-${activeSpec * SPEC_STEP + 56}px)`,
                transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)'
              }"
            >
              <article
                v-for="(spec, i) in featuredSpecs"
                :key="spec.label"
                class="flex h-[112px] w-full max-w-md shrink-0 items-center gap-5 rounded-3xl border p-6 transition-all duration-500"
                :class="
                  activeSpec === i
                    ? 'border-(--border-gray) bg-(--background) opacity-100 shadow-2xl'
                    : 'border-transparent opacity-40'
                "
              >
                <span
                  class="grid size-14 shrink-0 place-items-center rounded-2xl transition-colors duration-500"
                  :class="
                    activeSpec === i
                      ? 'bg-(--ui-primary) text-white'
                      : 'bg-(--background-secondary) text-(--label-text)'
                  "
                >
                  <UIcon :name="spec.icon" class="size-7" />
                </span>
                <div class="min-w-0">
                  <p
                    class="text-sm font-semibold tracking-[0.12em] uppercase transition-colors duration-500"
                    :class="activeSpec === i ? 'text-(--ui-primary)' : 'text-(--label-text)'"
                  >
                    {{ spec.label }}
                  </p>
                  <p
                    class="leading-none font-bold tabular-nums transition-all duration-500"
                    :class="activeSpec === i ? 'text-5xl max-lg:text-4xl!' : 'text-3xl text-(--label-text) max-lg:text-2xl!'"
                  >
                    {{ spec.value
                    }}<span class="ml-1.5 text-2xl font-medium text-(--label-text)">{{ spec.unit }}</span>
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-8 lg:min-h-screen lg:justify-center">
      <h2 v-reveal class="text-center">
        <span class="text-(--ui-primary)">{{ appName }}</span>
        en quelques chiffres
      </h2>
      <article v-reveal="120" class="flex flex-col gap-16">
        <div class="flex flex-col gap-4">
          <div ref="statsRow" class="mx-[5%] flex flex-row justify-center gap-16 max-lg:gap-4!">
            <template v-if="statsLoading">
              <USkeleton
                v-for="n in 3"
                :key="n"
                class="aspect-square w-[20%] rounded-xl max-lg:aspect-3/4! max-lg:min-w-0! max-lg:flex-1"
              />
            </template>
            <StatsHome
              v-for="item in dynamicStats"
              v-else
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
    <section class="band flex flex-col gap-8 lg:min-h-screen lg:justify-center">
      <h2 v-reveal class="text-center">Les best-sellers</h2>
      <ClientOnly>
        <!-- Full-bleed: break out of the section's horizontal padding so the
             rail spans the viewport, matching the comparo carousels. -->
        <CarrouselMotorcycles
          v-reveal="120"
          :items="itemsCaroussel"
          class="mx-[calc(50%-50vw)] w-screen max-w-[100vw]"
        />
      </ClientOnly>
    </section>
    <section class="band flex flex-col gap-8 lg:min-h-screen lg:justify-center">
      <h2 v-reveal class="text-center">
        Ils nous font confiance
      </h2>
      <CarrouselSponsors v-reveal="120" />
    </section>
    <section class="flex justify-center">
      <UButton
        size="xl"
        color="neutral"
        class="button mb-[20vh] rounded-full max-lg:px-[30px]! max-lg:py-[10px]! max-lg:text-sm!"
        icon="i-lucide-badge-check"
        >Approuvé par {{ totalUsers }} utilisateurs</UButton
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
  padding-block: 5.5rem;
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
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(8px);
  }
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
