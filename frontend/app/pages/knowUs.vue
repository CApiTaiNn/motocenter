<script setup lang="ts">
const { appName } = useRuntimeConfig().public

useSeoMeta({
  title: 'Qui sommes-nous',
  description: `L'histoire de ${appName} : une idée de motard, une équipe d'étudiants et un projet de fin d'études.`
})

const facts = [
  { value: '2025', label: "Naissance de l'idée" },
  { value: '5', label: "Membres dans l'équipe" },
  { value: '1', label: "Projet de fin d'études" }
]

const story = [
  {
    step: "L'idée",
    icon: 'i-lucide-lightbulb',
    title: "Un besoin de motard",
    text: `Tout part de Sloan Morgant, motard passionné. Pour choisir une moto, il faut jongler entre fiches techniques, forums et sites de balades. En 2025 naît une idée simple : tout réunir au même endroit.`
  },
  {
    step: "L'équipe",
    icon: 'i-lucide-users',
    title: 'Des amis devenus les Breizh Devs',
    text: `L'idée séduit des amis étudiants. Chacun apporte ses compétences : gestion de projet, base de données, développement. Ensemble, ils forment les Breizh Devs.`
  },
  {
    step: 'La conception',
    icon: 'i-lucide-pen-tool',
    title: 'Penser avant de coder',
    text: `L'équipe définit les besoins des motards, dessine les maquettes et choisit l'architecture technique. Trois piliers ressortent : comparer, rouler et échanger.`
  },
  {
    step: 'Le développement',
    icon: 'i-lucide-rocket',
    title: 'Un projet de fin d\'études en un temps record',
    text: `${appName} devient le projet de fin d'études de l'équipe. Le site est développé en un temps record, du comparateur à la carte des balades en passant par le forum.`
  }
]

const pillars = [
  {
    icon: 'i-lucide-arrow-left-right',
    title: 'Comparer',
    text: 'Mettre deux motos côte à côte pour choisir en connaissance de cause.',
    to: '/comparo'
  },
  {
    icon: 'i-lucide-route',
    title: 'Rouler',
    text: 'Trouver et partager des balades tracées par la communauté.',
    to: '/ride'
  },
  {
    icon: 'i-lucide-messages-square',
    title: 'Échanger',
    text: "Poser ses questions et partager son expérience sur le forum.",
    to: '/forum'
  }
]

// Story road: the path is built from the real icon positions, so it always
// passes through every step whatever the text length or screen width.
const roadEl = ref<HTMLElement | null>(null)
const pathEl = ref<SVGPathElement | null>(null)
const iconEls = ref<HTMLElement[]>([])
const road = reactive({ w: 0, h: 0, d: '', len: 0 })
const drawn = ref(0)
const moto = reactive({ x: 0, y: 0, lean: 0, flip: false })
// Index of the last step the motorbike has reached.
const reached = ref(-1)
const reducedMotion = ref(false)
let iconCentres: number[] = []

const buildRoad = async () => {
  const ol = roadEl.value
  if (!ol || !iconEls.value.length) return
  const box = ol.getBoundingClientRect()
  const centres = iconEls.value.map((el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 }
  })
  iconCentres = centres.map((c) => c.y)
  const cx = centres[0]!.x
  // Each bend swings to the other side, staying inside the gutter.
  const swing = cx * 0.7
  const points = [...centres, { x: cx, y: box.height }]
  let d = `M ${cx} ${points[0]!.y}`
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1]!
    const b = points[k]!
    const side = k % 2 ? 1 : -1
    const gap = b.y - a.y
    d += ` C ${cx + side * swing} ${a.y + gap * 0.3}, ${cx + side * swing} ${b.y - gap * 0.3}, ${b.x} ${b.y}`
  }
  road.w = box.width
  road.h = box.height
  road.d = d
  await nextTick()
  road.len = pathEl.value?.getTotalLength() ?? 0
  updateRoad()
}

// The motorbike follows a line at 60% of the viewport height. The path always
// goes down, so a binary search finds the length where it meets that line.
const updateRoad = () => {
  const ol = roadEl.value
  const path = pathEl.value
  if (!ol || !path || !road.len) return
  const target = reducedMotion.value
    ? road.h
    : Math.min(Math.max(window.innerHeight * 0.6 - ol.getBoundingClientRect().top, 0), road.h)

  let lo = 0
  let hi = road.len
  for (let n = 0; n < 20; n++) {
    const mid = (lo + hi) / 2
    if (path.getPointAtLength(mid).y < target) lo = mid
    else hi = mid
  }
  drawn.value = lo
  reached.value = iconCentres.filter((y) => y <= target + 1).length - 1

  const p = path.getPointAtLength(lo)
  const ahead = path.getPointAtLength(Math.min(lo + 6, road.len))
  const dx = ahead.x - p.x
  moto.x = p.x
  moto.y = p.y
  moto.flip = dx < 0
  // Lean into the bend, like a rider would.
  moto.lean = Math.max(-25, Math.min(25, dx * 6)) * (moto.flip ? -1 : 1)
}

let frame = 0
const onScroll = () => {
  if (frame) return
  frame = requestAnimationFrame(() => {
    frame = 0
    updateRoad()
  })
}
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  buildRoad()
  window.addEventListener('scroll', onScroll, { passive: true })
  resizeObserver = new ResizeObserver(() => buildRoad())
  if (roadEl.value) resizeObserver.observe(roadEl.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  resizeObserver?.disconnect()
  cancelAnimationFrame(frame)
})
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
        <p class="max-lg:text-center max-lg:text-xs! max-lg:font-(--font-main)">
          D'une idée de motard à un projet de fin d'études : découvrez l'histoire
          de {{ appName }}.
        </p>
      </template>
    </HeaderInfo>

    <div id="content" class="mx-auto flex max-w-[1000px] flex-col gap-24 px-4 pt-[10dvh] pb-24">
      <!-- Introduction and key facts -->
      <section class="flex flex-col items-center gap-10 text-center">
        <div class="flex max-w-2xl flex-col gap-4">
          <h2 class="max-lg:text-3xl!">
            Né d'une passion, <span class="text-(--ui-primary)">construit en équipe</span>
          </h2>
          <p class="text-lg! max-lg:text-sm!">
            {{ appName }} rassemble en un seul site tout ce dont un motard a besoin
            pour choisir sa moto et profiter de la route.
          </p>
        </div>

        <dl class="grid w-full grid-cols-3 gap-4 max-md:grid-cols-1">
          <div
            v-for="fact in facts"
            :key="fact.label"
            class="flex flex-col items-center gap-1 rounded-2xl border border-(--border-gray) bg-(--background) px-4 py-6"
          >
            <dt class="order-2 text-sm text-(--label-text)">{{ fact.label }}</dt>
            <dd class="order-1 text-4xl font-bold text-(--ui-primary)">{{ fact.value }}</dd>
          </div>
        </dl>
      </section>

      <!-- Story timeline -->
      <section class="flex flex-col gap-10">
        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold tracking-widest text-(--ui-primary) uppercase">Notre histoire</span>
          <h3 class="max-lg:text-2xl!">De l'idée au site en ligne</h3>
        </div>

        <!-- A winding road runs down the left gutter through every step icon.
             It is drawn as the page scrolls and a motorbike rides along it. The
             icon offset is half the gutter plus half the icon, so the icon sits
             in the middle of the gutter. -->
        <ol ref="roadEl" class="relative flex flex-col gap-12 pl-24 max-md:pl-18">
          <svg
            v-if="road.d"
            class="pointer-events-none absolute inset-0 overflow-visible"
            :width="road.w"
            :height="road.h"
            :viewBox="`0 0 ${road.w} ${road.h}`"
            aria-hidden="true"
          >
            <path :d="road.d" fill="none" stroke="var(--border-gray)" stroke-width="12" stroke-linecap="round" />
            <path :d="road.d" fill="none" stroke="var(--background)" stroke-width="1.5" stroke-dasharray="6 8" />
            <path
              ref="pathEl"
              :d="road.d"
              fill="none"
              stroke="var(--ui-primary)"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="road.len"
              :stroke-dashoffset="road.len - drawn"
            />
          </svg>

          <span
            v-if="road.d && !reducedMotion"
            class="pointer-events-none absolute top-0 left-0 z-10 grid size-9 place-items-center rounded-full bg-white text-(--ui-primary) shadow-lg"
            :style="{
              transform: `translate(${moto.x - 18}px, ${moto.y - 18}px) rotate(${moto.lean}deg) scaleX(${moto.flip ? -1 : 1})`
            }"
            aria-hidden="true"
          >
            <UIcon name="i-lucide-motorbike" class="size-5" />
          </span>

          <li v-for="(item, i) in story" :key="item.step" class="relative flex flex-col gap-2">
            <span
              :ref="(el) => (iconEls[i] = el as HTMLElement)"
              class="absolute top-0 left-[-68px] grid size-10 place-items-center rounded-full border-2 shadow-lg transition-all duration-500 max-md:left-[-54px] max-md:size-9"
              :class="
                reached >= i
                  ? 'scale-110 border-(--ui-primary) bg-(--ui-primary) text-white'
                  : 'border-(--border-gray) bg-(--background) text-(--label-text)'
              "
              aria-hidden="true"
            >
              <UIcon :name="item.icon" class="size-5" />
            </span>
            <span class="text-xs font-semibold tracking-widest text-(--label-text) uppercase">
              Étape {{ i + 1 }} · {{ item.step }}
            </span>
            <h4 class="text-xl! max-lg:text-lg!">{{ item.title }}</h4>
            <p class="max-w-2xl text-base! leading-relaxed max-lg:text-sm!">{{ item.text }}</p>
          </li>
        </ol>
      </section>

      <!-- Mission and pillars -->
      <section class="flex flex-col gap-10">
        <div class="flex items-center gap-12 max-lg:flex-col-reverse!">
          <img
            src="../assets/images/knowUs/Gsxr.png"
            alt="La GSX-R de Sloan, la moto à l'origine du projet"
            class="h-auto w-[420px] max-lg:w-full! max-lg:max-w-[420px]"
          />
          <div class="flex flex-1 flex-col gap-2">
            <span class="text-sm font-semibold tracking-widest text-(--ui-primary) uppercase">Notre mission</span>
            <h3 class="max-lg:text-2xl!">Une plateforme centrale pour les motards</h3>
            <p class="text-base! max-lg:text-sm!">
              {{ appName }} combine l'aide au choix d'une moto et le partage entre
              passionnés. Notre objectif : un seul site, clair et cohérent, du
              premier coup d'œil à la prochaine sortie.
            </p>
          </div>
        </div>

        <ul class="grid grid-cols-3 gap-4 max-md:grid-cols-1">
          <li v-for="pillar in pillars" :key="pillar.title">
            <NuxtLink
              :to="pillar.to"
              class="group flex h-full flex-col gap-3 rounded-2xl border border-(--border-gray) bg-(--background) p-6 transition hover:-translate-y-1 hover:border-(--ui-primary) hover:shadow-lg"
            >
              <UIcon :name="pillar.icon" class="size-7 text-(--ui-primary)" aria-hidden="true" />
              <span class="text-lg font-semibold">{{ pillar.title }}</span>
              <span class="text-sm text-(--label-text)">{{ pillar.text }}</span>
              <span class="mt-auto flex items-center gap-1 text-sm font-semibold text-(--ui-primary)">
                Découvrir
                <UIcon name="i-lucide-arrow-right" class="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
